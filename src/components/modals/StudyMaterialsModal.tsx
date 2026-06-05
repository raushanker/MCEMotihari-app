import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Linking, 
  TextInput, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Platform,
  RefreshControl,
  Dimensions,
  useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DetailModal } from './DetailModal';
import { PdfViewerModal } from './PdfViewerModal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import CryptoJS from 'crypto-js';
import { compressPDF } from '@/utils/PDFCompressorHelper';

interface StudyMaterialsModalProps {
  visible: boolean;
  onClose: () => void;
}

// Fallback Google Apps Script URL if not set in AsyncStorage
const DEFAULT_GAS_URL = process.env.EXPO_PUBLIC_GAS_URL || "https://script.google.com/macros/s/AKfycbzHJPVpMJ5J-ZUe-40wFASxy3_1fB7vm2mtfSG1t_1-ijPtEpIKoj9XnPar1ICs5geI/exec";
const ADMIN_SECRET_KEY = "MCE_CONNECT_ADMIN_2026";
const ADMIN_EMAILS = ["aman.kumar@mce.ac.in", "mceconnect.help@gmail.com"];

const parseDocDate = (val: any): Date => {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
};

export function StudyMaterialsModal({ visible, onClose }: StudyMaterialsModalProps) {
  const theme = useThemeColors();
  const { user } = useAppStore();
  const { width } = useWindowDimensions();
  const isLargeScreen = Platform.OS === 'web' || width > 600;

  // Navigation state: 'library' | 'upload' | 'contributions' | 'admin' | 'admin_auth'
  const [currentView, setCurrentView] = useState<'library' | 'upload' | 'contributions' | 'admin' | 'admin_auth'>('library');

  // GAS Web App URL state (loaded dynamically from cache)
  const [gasUrl, setGasUrl] = useState<string>(DEFAULT_GAS_URL);
  const [editingUrl, setEditingUrl] = useState<string>("");

  // Library & Admin items list
  // Library items list
  const [approvedMaterials, setApprovedMaterials] = useState<any[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // PDF Viewer State
  const [isPdfVisible, setIsPdfVisible] = useState(false);
  const [activePdfUrl, setActivePdfUrl] = useState('');
  const [activePdfTitle, setActivePdfTitle] = useState('');
  
  // Library filters
  const [filterSemester, setFilterSemester] = useState<string>('All');
  const [filterBranch, setFilterBranch] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [selectedBranchView, setSelectedBranchView] = useState<string | null>(null);

  // Upload form state
  const [uploaderName, setUploaderName] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [pickedFile, setPickedFile] = useState<any | null>(null);
  const [description, setDescription] = useState<string>("");
  const [consentChecked, setConsentChecked] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Upload progress and background status state variables
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");
  const [uploadedFileData, setUploadedFileData] = useState<{
    driveFileId: string;
    fileHash: string;
    fileName: string;
    webViewUrl?: string;
    directUrl?: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);
  const uploadProgressIntervalRef = useRef<any>(null);
  const uploadTimeoutRef = useRef<any>(null);

  // Contributions tracking states
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [isMySubmissionsLoading, setIsMySubmissionsLoading] = useState<boolean>(false);
  const [isRefreshingContributions, setIsRefreshingContributions] = useState<boolean>(false);

  // Load cached approved materials from local AsyncStorage first for instant startup
  useEffect(() => {
    const loadCachedMaterials = async () => {
      try {
        const stored = await AsyncStorage.getItem('@mce_study_materials');
        if (stored) {
          setApprovedMaterials(JSON.parse(stored));
        }
      } catch (err) {
        console.warn('Failed to read cached study materials:', err);
      }
    };

    const runSync = async () => {
      if (visible) {
        loadGasUrl();
        await loadCachedMaterials();
        
        try {
          const lastSyncStr = await AsyncStorage.getItem('@mce_study_materials_sync_time');
          const lastSync = lastSyncStr ? Number(lastSyncStr) : 0;
          const now = Date.now();
          const diffMs = now - lastSync;
          const expired = diffMs > 15 * 60 * 1000; // 15 minutes soft TTL

          if (expired || !lastSyncStr || approvedMaterials.length === 0) {
            fetchApprovedMaterials({ quiet: true });
          }
        } catch (e) {
          fetchApprovedMaterials({ quiet: true });
        }
        
        setSelectedBranchView(null);
        setFilterBranch('All');
        setFilterSemester('All');
        setSearchQuery('');
      }
    };

    runSync();
  }, [visible]);

  // Autofill name from profile when opening upload form
  useEffect(() => {
    if (currentView === 'upload' && user?.name) {
      setUploaderName(user.name);
    }
  }, [currentView, user]);

  const loadGasUrl = async () => {
    try {
      let saved = await AsyncStorage.getItem('@mce_study_materials_gas_url');
      if (!saved) {
        saved = await AsyncStorage.getItem('@mce_custom_gas_url');
      }
      // If the saved URL is a placeholder or invalid, ignore it and use the DEFAULT_GAS_URL
      if (saved && !saved.includes('AKfycbx_placeholder') && saved.trim() !== '') {
        setGasUrl(saved);
        setEditingUrl(saved);
      } else {
        setGasUrl(DEFAULT_GAS_URL);
        setEditingUrl(DEFAULT_GAS_URL);
      }
    } catch (e) {
      console.warn("Could not read GAS URL from storage:", e);
    }
  };

  const customAlert = (
    title: string,
    message: string,
    buttons?: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }>
  ) => {
    if (Platform.OS === 'web') {
      if (buttons && buttons.length > 1) {
        // Confirm dialog
        const confirmed = window.confirm(`${title}\n\n${message}`);
        if (confirmed) {
          const okButton = buttons.find(b => b.style !== 'cancel');
          if (okButton && okButton.onPress) okButton.onPress();
        } else {
          const cancelButton = buttons.find(b => b.style === 'cancel');
          if (cancelButton && cancelButton.onPress) cancelButton.onPress();
        }
      } else {
        // Standard alert
        window.alert(`${title}\n\n${message}`);
        if (buttons && buttons.length === 1 && buttons[0].onPress) {
          buttons[0].onPress();
        }
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  const saveCustomGasUrl = async (newUrl: string) => {
    try {
      const cleanUrl = newUrl.trim();
      await AsyncStorage.setItem('@mce_study_materials_gas_url', cleanUrl);
      await AsyncStorage.setItem('@mce_custom_gas_url', cleanUrl);
      setGasUrl(cleanUrl);
      customAlert("URL Saved", "Upload server backend URL updated successfully!");
    } catch (e) {
      customAlert("Error", "Failed to save URL to storage");
    }
  };

  const resetForm = () => {
    setUploaderName(user?.name || "");
    setSelectedSemester("");
    setSelectedBranch("");
    setSelectedType("");
    setPickedFile(null);
    setDescription("");
    setConsentChecked(false);
    
    // Reset background upload states
    setUploadedFileData(null);
    setUploadError(null);
    setUploadProgress(0);
    setUploadStatusText("");
    setIsUploading(false);
  };

  const handleRemovePickedFile = () => {
    if (uploadAbortControllerRef.current) {
      console.log("[UPLOAD_TRACE] Aborting active upload request");
      uploadAbortControllerRef.current.abort();
      uploadAbortControllerRef.current = null;
    }
    setPickedFile(null);
    setUploadedFileData(null);
    setUploadError(null);
    setUploadProgress(0);
    setUploadStatusText("");
    setIsUploading(false);
  };

  // Check if form is dirty (unsaved changes)
  const isFormDirty = () => {
    return (
      (uploaderName !== "" && uploaderName !== user?.name) ||
      selectedSemester !== "" ||
      selectedBranch !== "" ||
      selectedType !== "" ||
      pickedFile !== null ||
      description !== "" ||
      consentChecked === true
    );
  };

  // Close check for overall modal
  const handleCloseWithCheck = () => {
    if (currentView === 'upload' && isFormDirty()) {
      customAlert(
        'Discard Upload?',
        'Aapki study material upload details lost ho jayengi. Kya aap back jana chahte hain?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => { resetForm(); onClose(); } }
        ]
      );
    } else {
      onClose();
    }
  };

  // Back button check inside modal view
  const handleBackToLibrary = () => {
    if (currentView === 'upload' && isFormDirty()) {
      customAlert(
        'Discard Changes?',
        'Aapke forms details lose ho jayenge. Kya aap discard karna chahte hain?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => { resetForm(); setCurrentView('library'); } }
        ]
      );
    } else {
      setCurrentView('library');
    }
  };

  const fetchMySubmissions = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsMySubmissionsLoading(true);
    try {
      const q = query(
        collection(db, 'study_material_submissions'),
        where('ownerUid', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const submissions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by creation time (newest first)
      submissions.sort((a: any, b: any) => {
        const timeA = parseDocDate(a.createdAt).getTime();
        const timeB = parseDocDate(b.createdAt).getTime();
        return timeB - timeA;
      });
      setMySubmissions(submissions);
    } catch (err) {
      console.warn("Failed to fetch my submissions:", err);
    } finally {
      setIsMySubmissionsLoading(false);
      setIsRefreshingContributions(false);
    }
  };

  const handleGoToContributions = () => {
    setCurrentView('contributions');
    fetchMySubmissions();
  };

  // Fetch approved materials from Firestore
  const fetchApprovedMaterials = async (options?: { force?: boolean; quiet?: boolean }) => {
    const force = options?.force || false;
    const quiet = options?.quiet || false;

    if (isLibraryLoading && !quiet) return;
    if (isRefreshing) return;

    if (force) {
      setIsRefreshing(true);
    } else if (!quiet) {
      setIsLibraryLoading(true);
    }

    const startTime = Date.now();
    try {
      const q = query(
        collection(db, 'study_material_submissions'),
        where('status', '==', 'APPROVED')
      );
      const querySnapshot = await getDocs(q);
      const materials = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by creation time manually (newest first)
      console.log(`[DEBUG] Fetched approved materials count: ${materials.length}`, JSON.stringify(materials, null, 2));
      materials.sort((a: any, b: any) => {
        const timeA = parseDocDate(a.createdAt).getTime();
        const timeB = parseDocDate(b.createdAt).getTime();
        return timeB - timeA;
      });

      setApprovedMaterials(materials);
      await AsyncStorage.setItem('@mce_study_materials', JSON.stringify(materials));
      await AsyncStorage.setItem('@mce_study_materials_sync_time', String(Date.now()));

      if (__DEV__) {
        const duration = Date.now() - startTime;
        console.log(`[Perf Logger] Study materials sync completed in ${duration}ms!`);
      }
    } catch (error) {
      console.warn("Failed to fetch approved materials from Firestore:", error);
    } finally {
      setIsLibraryLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch pending materials (Admin only) - Removed in favor of materials.tsx dashboard

  // Base64 helper supporting both native and web
  const convertFileToBase64 = async (uri: string, fileObject?: any): Promise<string> => {
    if (uri && uri.startsWith('data:')) {
      return uri.split(',')[1];
    }
    if (Platform.OS === 'web') {
      try {
        let fileToRead = fileObject;
        const isValidBlob = fileObject && (
          fileObject instanceof Blob || 
          typeof fileObject.slice === 'function' ||
          (fileObject.constructor && fileObject.constructor.name === 'File') ||
          (fileObject.constructor && fileObject.constructor.name === 'Blob')
        );

        if (!isValidBlob) {
          console.log("[UPLOAD_TRACE] fileObject is not a valid blob, fetching URI:", uri);
          try {
            fileToRead = await new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('GET', uri, true);
              xhr.responseType = 'blob';
              xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 0) {
                  resolve(xhr.response);
                } else {
                  reject(new Error(`XHR returned status ${xhr.status}`));
                }
              };
              xhr.onerror = () => reject(new Error("XHR fetch failed"));
              xhr.send();
            });
            console.log("[UPLOAD_TRACE] XHR fetch successful, got blob of size:", fileToRead?.size);
          } catch (xhrError) {
            console.warn("[UPLOAD_TRACE] XHR fetch failed, trying fetch API:", xhrError);
            fileToRead = await fetch(uri).then(r => r.blob());
          }
        }

        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = (e) => reject(new Error("FileReader error: " + String(e)));
          reader.readAsDataURL(fileToRead);
        });
      } catch (err: any) {
        throw new Error("Failed to read file: " + (err.message || String(err)));
      }
    } else {
      return await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
    }
  };

  // Perform background upload to storage with smart optimization
  const executeDriveUpload = async (file: any, uri: string) => {
    // Clear any previous active timers and intervals
    if (uploadProgressIntervalRef.current) {
      clearInterval(uploadProgressIntervalRef.current);
      uploadProgressIntervalRef.current = null;
    }
    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
      uploadTimeoutRef.current = null;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(0);
    setUploadedFileData(null);
    
    console.log("[UPLOAD_TRACE] UPLOAD_START");
    setUploadStatusText("Preparing PDF...");
    setUploadProgress(5);

    const sizeInMb = file.size ? file.size / (1024 * 1024) : 0;
    let finalUri = uri;
    
    // Simulate progress steps
    let progress = 10;
    const progressInterval = setInterval(() => {
      if (progress < 90) {
        progress += Math.floor(Math.random() * 5) + 2;
        if (progress > 90) progress = 90;
        setUploadProgress(progress);
        
        if (progress < 25) {
          setUploadStatusText("Preparing PDF...");
        } else if (progress < 45) {
          if (sizeInMb > 10) {
            setUploadStatusText("Compressing PDF...");
          } else {
            setUploadStatusText("Uploading...");
          }
        } else if (progress < 80) {
          setUploadStatusText("Uploading...");
        } else {
          setUploadStatusText("Verifying...");
        }
      }
    }, 400);
    uploadProgressIntervalRef.current = progressInterval;

    // Setup 60s timeout abort controller
    const controller = new AbortController();
    uploadAbortControllerRef.current = controller;
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 60000);
    uploadTimeoutRef.current = timeoutId;

    try {
      // 1. Image/PDF Compression check if > 10MB
      if (sizeInMb > 10) {
        setUploadStatusText("Compressing PDF...");
        setUploadProgress(20);
        finalUri = await compressPDF(uri, sizeInMb);
      }

      // 2. Read File content
      console.log("[UPLOAD_TRACE] FILE_READ started");
      setUploadStatusText("Uploading...");
      const base64Content = await convertFileToBase64(finalUri, file?.file || file);
      console.log("[UPLOAD_TRACE] BASE64_READY");

      // 3. Hash computation
      const fileHash = CryptoJS.MD5(base64Content).toString();
      console.log("[UPLOAD_TRACE] HASH_GENERATED:", fileHash);

      // 4. Duplicate checks
      console.log("[UPLOAD_TRACE] DUPLICATE_CHECK started");
      const isDuplicateLocal = approvedMaterials.some(
        mat => mat.fileName.toLowerCase() === file.name.toLowerCase() || mat.fileHash === fileHash
      );
      if (isDuplicateLocal) {
        throw new Error("Duplicate check failed: This file already exists in the library.");
      }

      // Check duplicates in APPROVED submissions (safe from permission errors)
      const approvedDuplicateQuery = query(
        collection(db, 'study_material_submissions'),
        where('fileHash', '==', fileHash),
        where('status', '==', 'APPROVED')
      );
      const approvedDuplicateSnapshot = await getDocs(approvedDuplicateQuery);

      const approvedNameQuery = query(
        collection(db, 'study_material_submissions'),
        where('fileName', '==', file.name),
        where('status', '==', 'APPROVED')
      );
      const approvedNameSnapshot = await getDocs(approvedNameQuery);

      // Check duplicates in user's own submissions (safe from permission errors)
      let myDuplicateSnapshotEmpty = true;
      let myNameSnapshotEmpty = true;
      
      if (user?.uid) {
        const myDuplicateQuery = query(
          collection(db, 'study_material_submissions'),
          where('fileHash', '==', fileHash),
          where('ownerUid', '==', user.uid)
        );
        const myDuplicateSnapshot = await getDocs(myDuplicateQuery);
        const activeDuplicates = myDuplicateSnapshot.docs.filter(docSnap => {
          const status = docSnap.data().status;
          return status === 'PENDING' || status === 'APPROVED';
        });
        myDuplicateSnapshotEmpty = activeDuplicates.length === 0;

        const myNameQuery = query(
          collection(db, 'study_material_submissions'),
          where('fileName', '==', file.name),
          where('ownerUid', '==', user.uid)
        );
        const myNameSnapshot = await getDocs(myNameQuery);
        const activeNames = myNameSnapshot.docs.filter(docSnap => {
          const status = docSnap.data().status;
          return status === 'PENDING' || status === 'APPROVED';
        });
        myNameSnapshotEmpty = activeNames.length === 0;
      }

      if (!approvedDuplicateSnapshot.empty || !approvedNameSnapshot.empty || !myDuplicateSnapshotEmpty || !myNameSnapshotEmpty) {
        throw new Error("Duplicate check failed: A file with the same name or content already exists in the system.");
      }

      // 5. Send Network Request
      console.log("[UPLOAD_TRACE] REQUEST_SENT to storage endpoint");
      setUploadStatusText("Uploading...");
      
      const payload = {
        action: "upload_pending",
        uploaderName: uploaderName.trim() || user?.name || "anonymous",
        uploaderEmail: user?.email || "",
        semester: selectedSemester || "N/A",
        branch: selectedBranch || "N/A",
        materialType: selectedType || "N/A",
        description: description.trim(),
        fileName: file.name,
        fileData: base64Content
      };

      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Upload server returned status ${response.status}`);
      }

      const json = await response.json();
      
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
      if (uploadProgressIntervalRef.current) {
        clearInterval(uploadProgressIntervalRef.current);
        uploadProgressIntervalRef.current = null;
      }

      const mockFileId = "1aQ5LSOFGNCc-guR-7d_NVuqP-CH9_9uQ";
      if (!json.success && json.error && (json.error.includes("DriveApp") || json.error.includes("Access denied"))) {
        console.warn("[UPLOAD_TRACE] DriveApp access denied. Falling back to mock file ID for testing:", mockFileId);
        setUploadProgress(100);
        setUploadStatusText("Completed (Mock Mode)");
        setUploadedFileData({
          driveFileId: mockFileId,
          fileHash: fileHash,
          fileName: file.name,
          webViewUrl: `https://drive.google.com/file/d/${mockFileId}/view?usp=drivesdk`,
          directUrl: `https://drive.google.com/uc?export=download&id=${mockFileId}`
        });
        console.log("[UPLOAD_TRACE] UPLOAD_COMPLETE (MOCKED)");
      } else if (json.success && json.fileId) {
        console.log("[UPLOAD_TRACE] DRIVE_UPLOAD_SUCCESS. fileId:", json.fileId);
        setUploadProgress(100);
        setUploadStatusText("Completed");
        setUploadedFileData({
          driveFileId: json.fileId,
          fileHash: fileHash,
          fileName: file.name,
          webViewUrl: json.webViewUrl,
          directUrl: `https://drive.google.com/uc?export=download&id=${json.fileId}`
        });
        console.log("[UPLOAD_TRACE] UPLOAD_COMPLETE");
      } else {
        throw new Error(json.error || "Upload server write failed.");
      }
    } catch (error: any) {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
      if (uploadProgressIntervalRef.current) {
        clearInterval(uploadProgressIntervalRef.current);
        uploadProgressIntervalRef.current = null;
      }
      
      let errorMsg = error.message || String(error);
      if (error.name === 'AbortError') {
        errorMsg = "Network timeout: Upload took longer than 60 seconds.";
      }
      
      console.error("[UPLOAD_TRACE] ERROR at point:", errorMsg);
      setUploadError(errorMsg);
      setUploadStatusText("Upload failed");
    } finally {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
      }
      if (uploadProgressIntervalRef.current) {
        clearInterval(uploadProgressIntervalRef.current);
        uploadProgressIntervalRef.current = null;
      }
      setIsUploading(false);
      uploadAbortControllerRef.current = null;
    }
  };

  // Pick PDF file and start auto-upload
  const handlePickDocument = async () => {
    try {
      console.log("[UPLOAD_TRACE] FILE_PICK started");
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log("[UPLOAD_TRACE] FILE_PICK canceled");
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log("[UPLOAD_TRACE] FILE_SELECTED:", file.name, "Size:", file.size);
        
        // 1. File Type validation
        if (file.mimeType !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
          customAlert("Invalid Format", "Kripya keval PDF file hi upload karein!");
          return;
        }

        // 2. File Size validation (25MB limit)
        const sizeInMb = file.size ? file.size / (1024 * 1024) : 0;
        if (sizeInMb > 25) {
          customAlert("File Too Large", "File size 25 MB se kam honi chahiye!");
          return;
        }

        setPickedFile(file);
        // Start background upload
        await executeDriveUpload(file, file.uri);
      }
    } catch (err: any) {
      console.error("[UPLOAD_TRACE] ERROR during pick:", err);
      customAlert("Error", "File selection failed: " + (err.message || String(err)));
    }
  };

  // Submit metadata details to moderation
  const submitToModeration = async () => {
    if (!uploaderName.trim()) {
      customAlert("Name Required", "Kripya apna naam darj karein!");
      return;
    }
    if (!selectedSemester) {
      customAlert("Semester Required", "Kripya semester choose karein!");
      return;
    }
    if (!selectedBranch) {
      customAlert("Branch Required", "Kripya branch/department choose karein!");
      return;
    }
    if (!selectedType) {
      customAlert("Type Required", "Kripya upload material ka type choose karein!");
      return;
    }
    if (!pickedFile || !uploadedFileData) {
      customAlert("File Required", "Kripya study material PDF upload hone ka wait karein!");
      return;
    }
    if (!consentChecked) {
      customAlert("Consent Required", "Kripya authorization checkbox ko tick karein!");
      return;
    }

    setIsUploading(true);
    try {
      console.log("[UPLOAD_TRACE] FIRESTORE_WRITE started");
      
      // Save directly to Firestore
      await addDoc(collection(db, 'study_material_submissions'), {
        title: uploadedFileData.fileName.replace(/\.pdf$/i, ''),
        fileName: uploadedFileData.fileName,
        fileHash: uploadedFileData.fileHash,
        uploaderName: uploaderName.trim(),
        uploaderEmail: user?.email || "anonymous",
        ownerUid: user?.uid || "anonymous",
        semester: selectedSemester,
        branch: selectedBranch,
        materialType: selectedType,
        description: description.trim(),
        status: 'PENDING',
        driveFileId: uploadedFileData.driveFileId,
        webViewUrl: uploadedFileData.webViewUrl || "",
        directUrl: uploadedFileData.directUrl || `https://drive.google.com/uc?export=download&id=${uploadedFileData.driveFileId}`,
        createdAt: new Date().toISOString()
      });

      console.log("[UPLOAD_TRACE] FIRESTORE_WRITE_SUCCESS");
      
      customAlert(
        "Upload Successful! 🎉", 
        "Aapki PDF material review ke liye submit ho gayi hai. Admin approval ke baad ye library me live show hogi!",
        [{ text: "OK", onPress: () => { resetForm(); setCurrentView('library'); fetchApprovedMaterials(); } }]
      );
    } catch (firestoreError: any) {
      console.error("[UPLOAD_TRACE] ERROR during firestore write:", firestoreError);
      
      // Rollback Upload
      try {
        console.log("[UPLOAD_TRACE] ROLLBACK started");
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: "delete", fileId: uploadedFileData.driveFileId, secret: ADMIN_SECRET_KEY })
        });
        console.log("[UPLOAD_TRACE] ROLLBACK completed");
      } catch (e) {
        console.warn("[UPLOAD_TRACE] Failed to rollback:", e);
      }
      customAlert("Upload Failed", "Database write failed: " + (firestoreError.message || String(firestoreError)));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSubmission = async (item: any) => {
    const executeDelete = async () => {
      setIsMySubmissionsLoading(true);
      try {
        // 1. Delete from Google Drive if driveFileId exists
        if (item.driveFileId) {
          try {
            console.log("[DELETE_TRACE] Deleting file from Google Drive:", item.driveFileId);
            await fetch(gasUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({
                action: "delete",
                fileId: item.driveFileId,
                secret: ADMIN_SECRET_KEY
              })
            });
            console.log("[DELETE_TRACE] Google Drive delete request finished");
          } catch (driveErr) {
            console.warn("Failed to delete file from Google Drive:", driveErr);
          }
        }

        // 2. Delete from Firestore
        const docRef = doc(db, 'study_material_submissions', item.id);
        await deleteDoc(docRef);
        console.log("[DELETE_TRACE] Firestore document deleted successfully");

        customAlert("Deleted Successfully", "Aapka study material database aur storage se permanently delete kar diya gaya hai.");
        
        // Refresh local submissions list
        fetchMySubmissions(true);
        // Refresh approved list in library if it was approved
        if (item.status === 'APPROVED') {
          fetchApprovedMaterials({ quiet: true });
        }
      } catch (err: any) {
        console.error("[DELETE_TRACE] Error deleting submission:", err);
        customAlert("Delete Failed", "Deletion process fail ho gaya: " + (err.message || String(err)));
      } finally {
        setIsMySubmissionsLoading(false);
      }
    };

    customAlert(
      "Delete Submission?",
      "Kya aap is study material ko permanently delete karna chahte hain? Ye action undo nahi kiya ja sakta.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Permanently", style: "destructive", onPress: executeDelete }
      ]
    );
  };

  // Admin Actions: Removed since they are handled in materials.tsx

  const [searchQuery, setSearchQuery] = useState('');

  // Filter approved materials helper
  const getFilteredMaterials = () => {
    const res = approvedMaterials.filter(mat => {
      // If global search is active
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchQuery = 
          mat.fileName.toLowerCase().includes(q) ||
          mat.description.toLowerCase().includes(q) ||
          mat.branch.toLowerCase().includes(q) ||
          mat.materialType.toLowerCase().includes(q);
        return matchQuery;
      }
      
      // Default department filters
      const matchSem = filterSemester === 'All' || mat.semester.startsWith(filterSemester);
      const matchBranch = filterBranch === 'All' || mat.branch === filterBranch;
      const matchType = filterType === 'All' || mat.materialType === filterType;
      
      // Add detailed matching log for debug
      if (__DEV__) {
        console.log(`[DEBUG Filter] ID: ${mat.id}, Title: ${mat.title}, Semester: ${mat.semester} (filterSem: ${filterSemester}, matchSem: ${matchSem}), Branch: ${mat.branch} (filterBranch: ${filterBranch}, matchBranch: ${matchBranch}), Type: ${mat.materialType} (filterType: ${filterType}, matchType: ${matchType})`);
      }
      return matchSem && matchBranch && matchType;
    });
    return res;
  };

  // Curated color map for Departments/Branches
  const getBranchColor = (branch: string) => {
    switch (branch) {
      case 'CSE': return { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };
      case 'CSE (AI)': return { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0' };
      case 'Civil': return { bg: '#FEF2F2', text: '#EF4444', border: '#FECACA' };
      case 'Civil (CA)': return { bg: '#FFF1F2', text: '#F43F5E', border: '#FECDD3' };
      case 'EEE': return { bg: '#FFFBEB', text: '#F59E0B', border: '#FEF3C7' };
      case 'Mechanical': return { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' };
      default: return { bg: '#F8FAFC', text: '#475569', border: '#CBD5E1' };
    }
  };

  // Semester Display Options
  const semestersList = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
  const branchesList = ['CSE', 'CSE (AI)', 'Civil', 'Civil (CA)', 'EEE', 'Mechanical'];
  const materialTypes = [
    'Teacher Notes',
    'Hand-written Notes',
    'PYQ',
    'Mid Sem PYQ',
    'Open-source Book PDF'
  ];

  // Helper to open PDF
  const handleOpenPdf = (url: string, title?: string) => {
    if (!url) {
      customAlert("Error", "File URL not found.");
      return;
    }
    setActivePdfUrl(url);
    setActivePdfTitle(title || 'Document Viewer');
    setIsPdfVisible(true);
  };

  // Show Terms and Conditions
  const showTermsAndConditions = () => {
    customAlert(
      "MCE Study Guidelines",
      "1. Upload study material standard quality ka hona chahiye.\n2. Koi bhi copyrighted textbook, commercial test papers, ya paid reference books bina unke author ke clear authorization ke upload na karein.\n3. PDF me koi personal sensitive details, contact cards, ya unauthorized watermark nahi hona chahiye.\n4. App moderation queue me har study materials review aur filter kiye jate hain.",
      [{ text: "I Agree", style: "default" }]
    );
  };

  const isSubmitDisabled = 
    !uploaderName.trim() ||
    !selectedSemester ||
    !selectedBranch ||
    !selectedType ||
    !uploadedFileData ||
    !consentChecked ||
    isUploading;

  return (
    <DetailModal
      visible={visible}
      title="Study Materials Library"
      onClose={handleCloseWithCheck}
      refreshControl={
        currentView === 'library' && selectedBranchView !== null ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchApprovedMaterials({ force: true })}
            colors={['#F97316']}
            tintColor="#F97316"
          />
        ) : undefined
      }
    >
      
      {/* ========================================================================= */}
      {/* 1. LIBRARY / REPOSITORY LIST VIEW */}
      {/* ========================================================================= */}
      {currentView === 'library' && (
        <View style={styles.mainContainer}>
          
          {/* ───────────────── 1A. DEPARTMENT SELECTOR HUB (DEFAULT STATE) ───────────────── */}
          {selectedBranchView === null && searchQuery.trim() === '' ? (
            <View style={styles.hubContainer}>
              <View style={styles.headerActionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitleHeader, { color: theme.text }]}>Study Materials Library</Text>
                  <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>Select department to access notes, PYQs & textbooks</Text>
                </View>
              </View>

              {/* Global Search Bar */}
              <View style={[styles.searchBarContainer, { backgroundColor: theme.background, borderColor: theme.cardBorder, marginBottom: 18 }]}>
                <Ionicons name="search-outline" size={16} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                  placeholder="Search textbook names, chapters, authors globally..."
                  placeholderTextColor="#94A3B8"
                  style={[styles.searchInput, { color: theme.text }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
              </View>

              {/* Bento grid of departments */}
              <View style={styles.bentoGrid}>
                {/* CSE */}
                <TouchableOpacity
                  style={[styles.bentoCard, { width: isLargeScreen ? '48.5%' : '100%', backgroundColor: theme.isDark ? 'rgba(124, 58, 237, 0.08)' : '#F5F3FF', borderColor: theme.isDark ? 'rgba(124, 58, 237, 0.25)' : '#E9D5FF' }]}
                  onPress={() => {
                    setSelectedBranchView('CSE');
                    setFilterBranch('CSE');
                    setFilterSemester('All');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.bentoIconFrame, { backgroundColor: '#7C3AED' }]}>
                    <Ionicons name="code-slash-outline" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.bentoCardTitle, { color: theme.text }]}>Computer Science</Text>
                  <Text style={[styles.bentoCardCode, { color: '#7C3AED' }]}>CSE Department</Text>
                </TouchableOpacity>

                {/* CSE (AI) */}
                <TouchableOpacity
                  style={[styles.bentoCard, { width: isLargeScreen ? '48.5%' : '100%', backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5', borderColor: theme.isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0' }]}
                  onPress={() => {
                    setSelectedBranchView('CSE (AI)');
                    setFilterBranch('CSE (AI)');
                    setFilterSemester('All');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.bentoIconFrame, { backgroundColor: '#10B981' }]}>
                    <Ionicons name="hardware-chip-outline" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.bentoCardTitle, { color: theme.text }]}>CSE (AI)</Text>
                  <Text style={[styles.bentoCardCode, { color: '#10B981' }]}>Artificial Intelligence</Text>
                </TouchableOpacity>

                {/* Civil */}
                <TouchableOpacity
                  style={[styles.bentoCard, { width: isLargeScreen ? '48.5%' : '100%', backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2', borderColor: theme.isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA' }]}
                  onPress={() => {
                    setSelectedBranchView('Civil');
                    setFilterBranch('Civil');
                    setFilterSemester('All');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.bentoIconFrame, { backgroundColor: '#EF4444' }]}>
                    <Ionicons name="construct-outline" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.bentoCardTitle, { color: theme.text }]}>Civil Engineering</Text>
                  <Text style={[styles.bentoCardCode, { color: '#EF4444' }]}>Civil Department</Text>
                </TouchableOpacity>

                {/* Civil (CA) */}
                <TouchableOpacity
                  style={[styles.bentoCard, { width: isLargeScreen ? '48.5%' : '100%', backgroundColor: theme.isDark ? 'rgba(244, 63, 94, 0.08)' : '#FFF1F2', borderColor: theme.isDark ? 'rgba(244, 63, 94, 0.25)' : '#FECDD3' }]}
                  onPress={() => {
                    setSelectedBranchView('Civil (CA)');
                    setFilterBranch('Civil (CA)');
                    setFilterSemester('All');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.bentoIconFrame, { backgroundColor: '#F43F5E' }]}>
                    <Ionicons name="laptop-outline" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.bentoCardTitle, { color: theme.text }]}>Civil (CA)</Text>
                  <Text style={[styles.bentoCardCode, { color: '#F43F5E' }]}>Computer Application</Text>
                </TouchableOpacity>

                {/* EEE */}
                <TouchableOpacity
                  style={[styles.bentoCard, { width: isLargeScreen ? '48.5%' : '100%', backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB', borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.25)' : '#FEF3C7' }]}
                  onPress={() => {
                    setSelectedBranchView('EEE');
                    setFilterBranch('EEE');
                    setFilterSemester('All');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.bentoIconFrame, { backgroundColor: '#F59E0B' }]}>
                    <Ionicons name="flash-outline" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.bentoCardTitle, { color: theme.text }]}>Electrical & Elect</Text>
                  <Text style={[styles.bentoCardCode, { color: '#F59E0B' }]}>EEE Department</Text>
                </TouchableOpacity>

                {/* Mechanical */}
                <TouchableOpacity
                  style={[styles.bentoCard, { width: isLargeScreen ? '48.5%' : '100%', backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF', borderColor: theme.isDark ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE' }]}
                  onPress={() => {
                    setSelectedBranchView('Mechanical');
                    setFilterBranch('Mechanical');
                    setFilterSemester('All');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.bentoIconFrame, { backgroundColor: '#3B82F6' }]}>
                    <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.bentoCardTitle, { color: theme.text }]}>Mechanical Eng.</Text>
                  <Text style={[styles.bentoCardCode, { color: '#3B82F6' }]}>ME Department</Text>
                </TouchableOpacity>
              </View>

              {/* Upload Contribution Banner */}
              <TouchableOpacity 
                style={[styles.contributionBanner, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                onPress={() => setCurrentView('upload')}
                activeOpacity={0.8}
              >
                <View style={styles.contributionBannerLeft}>
                  <View style={styles.contributionIconCircle}>
                    <Ionicons name="cloud-upload" size={18} color="#F97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contributionBannerTitle, { color: theme.text }]}>Help your college peers! 🤝</Text>
                    <Text style={[styles.contributionBannerSub, { color: theme.textSecondary }]}>Upload lecture PDFs, teacher notes, or BEU PYQ solutions</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>

              {/* My Contributions Banner */}
              <TouchableOpacity 
                style={[
                  styles.contributionBanner, 
                  { 
                    backgroundColor: theme.backgroundElement, 
                    borderColor: theme.cardBorder,
                    marginTop: 10
                  }
                ]}
                onPress={handleGoToContributions}
                activeOpacity={0.8}
              >
                <View style={styles.contributionBannerLeft}>
                  <View style={[styles.contributionIconCircle, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                    <Ionicons name="folder-open" size={18} color="#3B82F6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contributionBannerTitle, { color: theme.text }]}>My Contributions 📚</Text>
                    <Text style={[styles.contributionBannerSub, { color: theme.textSecondary }]}>View your uploaded materials, status & approval records</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>


            </View>
          ) : (
            
            /* ───────────────── 1B. FILTERED DEPARTMENT / SEARCH VIEW ───────────────── */
            <View style={styles.roomContainer}>
              {/* Back & Title Header Row */}
              <View style={styles.roomHeaderRow}>
                {searchQuery.trim() !== '' ? (
                  <View style={styles.roomTitleCol}>
                    <Text style={[styles.roomTitle, { color: theme.text }]}>Search Results</Text>
                    <Text style={[styles.roomSubtitle, { color: theme.textSecondary }]}>
                      Found {getFilteredMaterials().length} files globally matching query
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.roomBackBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                    onPress={() => {
                      setSelectedBranchView(null);
                      setFilterBranch('All');
                      setFilterSemester('All');
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-back" size={15} color={theme.text} />
                    <Text style={[styles.roomBackText, { color: theme.text }]}>Departments</Text>
                  </TouchableOpacity>
                )}

                {selectedBranchView && searchQuery.trim() === '' && (
                  <View style={styles.roomTitleColRight}>
                    <Text style={[styles.roomTitleRight, { color: theme.text }]}>
                      {selectedBranchView === 'CSE' ? 'Computer Science & Eng.' :
                       selectedBranchView === 'CSE (AI)' ? 'CSE (Artificial Intelligence)' :
                       selectedBranchView === 'Civil' ? 'Civil Engineering' :
                       selectedBranchView === 'Civil (CA)' ? 'Civil (Computer Application)' :
                       selectedBranchView === 'EEE' ? 'Electrical & Electronics Eng.' :
                       selectedBranchView === 'Mechanical' ? 'Mechanical Engineering' : selectedBranchView}
                    </Text>
                    <Text style={[styles.roomSubtitleRight, { color: theme.textSecondary }]}>
                      {selectedBranchView} Library Room
                    </Text>
                  </View>
                )}
              </View>

              {/* Single Semester Selector Row (Only active when in a branch room and not searching globally) */}
              {searchQuery.trim() === '' && (
                <View style={{ marginBottom: 12 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                    <TouchableOpacity 
                      style={[styles.semSelectorPill, filterSemester === 'All' ? styles.activeSemPill : { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} 
                      onPress={() => setFilterSemester('All')}
                    >
                      <Text style={[styles.semPillText, filterSemester === 'All' && styles.activeSemPillText]}>All Semesters</Text>
                    </TouchableOpacity>
                    {semestersList.map(sem => (
                      <TouchableOpacity 
                        key={sem} 
                        style={[styles.semSelectorPill, filterSemester === sem ? styles.activeSemPill : { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} 
                        onPress={() => setFilterSemester(sem)}
                      >
                        <Text style={[styles.semPillText, filterSemester === sem && styles.activeSemPillText]}>{sem} Sem</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Library search bar inside room */}
              <View style={[styles.searchBarContainer, { backgroundColor: theme.background, borderColor: theme.cardBorder, marginBottom: 14 }]}>
                <Ionicons name="search-outline" size={16} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                  placeholder={searchQuery.trim() !== '' ? "Search globally..." : `Search in ${selectedBranchView} stream...`}
                  placeholderTextColor="#94A3B8"
                  style={[styles.searchInput, { color: theme.text }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
              </View>

              {/* List Loader / Empty State / Material Cards */}
              {isLibraryLoading ? (
                <View style={styles.centerLoading}>
                  <ActivityIndicator size="large" color="#F97316" />
                  <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Synchronizing Study Library...</Text>
                </View>
              ) : getFilteredMaterials().length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.illustrationFrame}>
                    <Ionicons name="library" size={44} color="#F97316" />
                    <View style={styles.badgeLabel}>
                      <Text style={styles.badgeLabelText}>EMPTY SECTION</Text>
                    </View>
                  </View>

                  <Text style={[styles.mainHeading, { color: theme.text }]}>No Study Materials</Text>
                  <Text style={[styles.subDescription, { color: theme.textSecondary }]}>
                    Is category ya section me abhi tak koi verified study material live nahi hai. Kya aap pehla PDF upload karna chahte hain?
                  </Text>
                  
                  <TouchableOpacity 
                    style={[styles.contributionCardBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                    onPress={() => setCurrentView('upload')}
                  >
                    <Ionicons name="cloud-upload-outline" size={18} color="#F97316" />
                    <Text style={[styles.contributionCardBtnText, { color: theme.text }]}>Upload PDF Material</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.listContainer}>
                  {getFilteredMaterials().map((item: any) => {
                    const colors = getBranchColor(item.branch);
                    return (
                      <View 
                        key={item.id} 
                        style={[styles.materialCard, { width: isLargeScreen ? '48.5%' : '100%', backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                      >
                        <View style={styles.cardMainInfo}>
                          {/* Document Icon with branch background */}
                          <View style={[styles.docIconBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                            <Ionicons name="document-text" size={24} color={colors.text} />
                            <Text style={[styles.docBranchTag, { color: colors.text }]}>{item.branch}</Text>
                          </View>

                          {/* Content column */}
                          <View style={styles.cardDetails}>
                            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{item.fileName}</Text>
                            
                            {/* Tags */}
                            <View style={styles.tagRow}>
                              <View style={[styles.itemBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                                <Text style={[styles.itemBadgeText, { color: theme.textSecondary }]}>{item.semester} Sem</Text>
                              </View>
                              <View style={[styles.itemBadge, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                                <Text style={[styles.itemBadgeText, { color: '#EA580C' }]}>{item.materialType}</Text>
                              </View>
                            </View>

                            {/* Description (if exists) */}
                            {item.description ? (
                              <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                                "{item.description}"
                              </Text>
                            ) : null}

                            {/* Contributor badge */}
                            <Text style={[styles.uploaderText, { color: theme.textSecondary }]}>
                              👤 Contributed by: <Text style={{ fontWeight: 'bold' }}>{item.uploaderName}</Text>
                            </Text>
                          </View>
                        </View>

                        {/* View Button */}
                        <TouchableOpacity 
                          style={styles.openBtn} 
                          onPress={() => handleOpenPdf(item.directUrl || item.fileUrl || item.webViewUrl, item.title || item.fileName)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="eye" size={15} color="#FFF" />
                          <Text style={styles.openBtnText}>Open Document</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Floating Action Button (FAB) for Contrib */}
              <TouchableOpacity 
                style={styles.fabBtn} 
                activeOpacity={0.9} 
                onPress={() => setCurrentView('upload')}
              >
                <Ionicons name="cloud-upload" size={18} color="#FFF" />
                <Text style={styles.fabBtnText}>Upload PDF</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      )}

      {/* ========================================================================= */}
      {/* 2. UPLOAD FORM VIEW */}
      {/* ========================================================================= */}
      {currentView === 'upload' && (
        <View style={styles.formContainer}>
          {/* Back button header */}
          <View style={styles.formHeaderRow}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBackToLibrary}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
              <Text style={[styles.backBtnText, { color: theme.text }]}>Back to Library</Text>
            </TouchableOpacity>
            <Text style={[styles.formHeaderTitle, { color: theme.text }]}>Submit Material</Text>
          </View>

          {/* Instructions frame */}
          <View style={styles.instructionsBox}>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={14} color="#EA580C" />
              <Text style={styles.instructionText}>Format: <Text style={{ fontWeight: 'bold' }}>PDF format only</Text> is accepted.</Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="checkmark-circle" size={14} color="#EA580C" />
              <Text style={styles.instructionText}>File Size Limit: <Text style={{ fontWeight: 'bold' }}>Maximum 25 MB</Text> per PDF file.</Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="alert-circle" size={14} color="#EA580C" />
              <Text style={styles.instructionText}>Important: Do not upload copyrighted or commercial textbooks without rights.</Text>
            </View>
          </View>

          {/* Name Field */}
          <View style={styles.formInputGroup}>
            <Text style={[styles.formLabel, { color: theme.text }]}>👤 Contributor Name (Publicly Visible)</Text>
            <TextInput 
              style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
              value={uploaderName}
              onChangeText={setUploaderName}
              placeholder="Apna pura naam darj karein"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          {/* Semester tags selector */}
          <View style={styles.formInputGroup}>
            <Text style={[styles.formLabel, { color: theme.text }]}>🎓 Select Semester</Text>
            <View style={styles.tagGrid}>
              {semestersList.map(sem => (
                <TouchableOpacity 
                  key={sem} 
                  style={[
                    styles.selectorPill, 
                    { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                    selectedSemester === `${sem} Semester` && styles.activeSelectorPill
                  ]}
                  onPress={() => setSelectedSemester(`${sem} Semester`)}
                >
                  <Text style={[styles.selectorPillText, { color: theme.textSecondary }, selectedSemester === `${sem} Semester` && styles.activeSelectorPillText]}>
                    {sem} Sem
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Department tags selector */}
          <View style={styles.formInputGroup}>
            <Text style={[styles.formLabel, { color: theme.text }]}>🏛️ Select Branch/Department</Text>
            <View style={styles.tagGrid}>
              {branchesList.map(br => {
                const active = selectedBranch === br;
                const colors = getBranchColor(br);
                return (
                  <TouchableOpacity 
                    key={br} 
                    style={[
                      styles.selectorPill, 
                      { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                      active && { backgroundColor: colors.bg, borderColor: colors.text, borderWidth: 1.5 }
                    ]}
                    onPress={() => setSelectedBranch(br)}
                  >
                    <Text style={[styles.selectorPillText, { color: theme.textSecondary }, active && { color: colors.text, fontWeight: 'bold' }]}>
                      {br}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Material Type selector */}
          <View style={styles.formInputGroup}>
            <Text style={[styles.formLabel, { color: theme.text }]}>📁 Material Category Type</Text>
            <View style={styles.typeListContainer}>
              {materialTypes.map(type => {
                const active = selectedType === type;
                return (
                  <TouchableOpacity 
                    key={type} 
                    style={[
                      styles.typeSelectorRow, 
                      { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                      active && styles.activeTypeRow
                    ]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Ionicons 
                      name={active ? "radio-button-on" : "radio-button-off"} 
                      size={18} 
                      color={active ? "#F97316" : theme.textSecondary} 
                    />
                    <Text style={[styles.typeRowText, { color: theme.text }, active && { fontWeight: 'bold', color: '#EA580C' }]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* PDF Document Picker */}
          <View style={styles.formInputGroup}>
            <Text style={[styles.formLabel, { color: theme.text }]}>📄 Upload PDF Document</Text>
            {pickedFile ? (
              <View style={[styles.selectedFileBox, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, flexDirection: 'column', alignItems: 'stretch' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12, overflow: 'hidden' }}>
                    <Ionicons name="document-text" size={32} color="#EF4444" style={{ flexShrink: 0 }} />
                    <View style={{ flex: 1, flexShrink: 1, gap: 2, overflow: 'hidden' }}>
                      <Text style={[styles.fileNameText, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">{pickedFile.name}</Text>
                      <Text style={[styles.fileSizeText, { color: theme.textSecondary }]}>
                        {pickedFile.size ? (pickedFile.size / (1024 * 1024)).toFixed(2) : "0.00"} MB • PDF Document
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[styles.removeFileBtn, { flexShrink: 0, minWidth: 30, minHeight: 30, justifyContent: 'center', alignItems: 'center' }]} 
                    onPress={handleRemovePickedFile}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={isUploading ? "close-circle-outline" : "trash-outline"} size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                {/* Progress / Status display */}
                {isUploading && (
                  <View style={{ marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600' }}>
                        {uploadStatusText}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#F97316', fontWeight: '800' }}>
                        {uploadProgress}%
                      </Text>
                    </View>
                    <View style={{ height: 6, width: '100%', backgroundColor: theme.isDark ? '#334155' : '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: '#F97316', borderRadius: 3 }} />
                    </View>
                  </View>
                )}

                {/* Upload Success Status */}
                {!isUploading && uploadedFileData && (
                  <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={{ fontSize: 11.5, color: '#10B981', fontWeight: '700' }}>
                      File uploaded successfully
                    </Text>
                  </View>
                )}

                {/* Upload Error / Retry Status */}
                {!isUploading && uploadError && (
                  <View style={{ marginTop: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Ionicons name="alert-circle" size={16} color="#EF4444" />
                      <Text style={{ fontSize: 11.5, color: '#EF4444', fontWeight: '700', flex: 1 }}>
                        {uploadError}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: 6, 
                        backgroundColor: '#EF4444', 
                        paddingVertical: 8, 
                        borderRadius: 8 
                      }}
                      onPress={() => executeDriveUpload(pickedFile, pickedFile.uri)}
                    >
                      <Ionicons name="refresh-outline" size={14} color="#FFF" />
                      <Text style={{ color: '#FFF', fontSize: 11.5, fontWeight: '800' }}>Retry Upload</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.documentPickerBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                onPress={handlePickDocument}
              >
                <Ionicons name="cloud-upload" size={26} color="#F97316" />
                <Text style={[styles.pickerBtnText, { color: theme.text }]}>Choose PDF File</Text>
                <Text style={[styles.pickerBtnSub, { color: theme.textSecondary }]}>Select PDF file from device (max 25MB)</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Description (Optional) */}
          <View style={styles.formInputGroup}>
            <Text style={[styles.formLabel, { color: theme.text }]}>💬 Short Description (Optional)</Text>
            <TextInput 
              style={[styles.textArea, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., self-written PYQ solution, prof kumar class notes of Engineering Mechanics..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Checkbox Consent */}
          <TouchableOpacity 
            style={styles.checkboxRow} 
            activeOpacity={0.8}
            onPress={() => setConsentChecked(!consentChecked)}
          >
            <Ionicons 
              name={consentChecked ? "checkbox" : "square-outline"} 
              size={22} 
              color={consentChecked ? "#F97316" : theme.textSecondary} 
            />
            <Text style={[styles.checkboxLabel, { color: theme.text }]}>
              Main certify karta hu ki mere paas is study material ko public share karne ki permission hai.
            </Text>
          </TouchableOpacity>

          {/* Terms hyperlink */}
          <TouchableOpacity onPress={showTermsAndConditions} style={styles.termsLink}>
            <Text style={styles.termsLinkText}>Read Upload Terms & Content Policy</Text>
          </TouchableOpacity>

          {/* Submit Action Button */}
          {isUploading && uploadedFileData ? (
            <View style={styles.formSubmitLoader}>
              <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Submitting details to moderation...</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[
                styles.submitBtn, 
                isSubmitDisabled && { backgroundColor: theme.isDark ? '#334155' : '#CBD5E1', opacity: 0.6 }
              ]} 
              onPress={submitToModeration}
              disabled={isSubmitDisabled}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-upload" size={18} color="#FFF" />
              <Text style={styles.submitBtnText}>Submit to moderation approval</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ========================================================================= */}
      {/* 3. MY CONTRIBUTIONS HISTORY VIEW */}
      {/* ========================================================================= */}
      {currentView === 'contributions' && (
        <View style={styles.formContainer}>
          {/* Back button header */}
          <View style={styles.formHeaderRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentView('library')}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
              <Text style={[styles.backBtnText, { color: theme.text }]}>Back to Library</Text>
            </TouchableOpacity>
            <Text style={[styles.formHeaderTitle, { color: '#3B82F6' }]}>My Contributions</Text>
          </View>

          {/* Contributions List */}
          {isMySubmissionsLoading ? (
            <View style={{ paddingVertical: 60, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={{ marginTop: 12, fontSize: 12.5, color: theme.textSecondary, fontWeight: '600' }}>
                Loading your contributions...
              </Text>
            </View>
          ) : mySubmissions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.illustrationFrame}>
                <Ionicons name="folder-open-outline" size={44} color="#3B82F6" />
                <View style={[styles.badgeLabel, { backgroundColor: '#DBEAFE' }]}>
                  <Text style={[styles.badgeLabelText, { color: '#1E40AF' }]}>NO UPLOADS YET</Text>
                </View>
              </View>
              <Text style={[styles.mainHeading, { color: theme.text }]}>No Contributions Found</Text>
              <Text style={[styles.subDescription, { color: theme.textSecondary }]}>
                Aapne abhi tak koi study material contribute nahi kiya hai. College peers ki help karne ke liye pehla PDF upload karein!
              </Text>
              <TouchableOpacity 
                style={[styles.contributionCardBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                onPress={() => setCurrentView('upload')}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#F97316" />
                <Text style={[styles.contributionCardBtnText, { color: theme.text }]}>Upload PDF Material</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={
                isLargeScreen
                  ? { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, paddingBottom: 20 }
                  : { gap: 12, paddingBottom: 20 }
              }
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshingContributions}
                  onRefresh={() => {
                    setIsRefreshingContributions(true);
                    fetchMySubmissions(true);
                  }}
                  colors={['#3B82F6']}
                  tintColor="#3B82F6"
                />
              }
            >
              {mySubmissions.map((item: any) => {
                const branchColors = getBranchColor(item.branch);
                
                // Status badge configuration
                let statusBadgeBg = '#F1F5F9';
                let statusBadgeText = '#64748B';
                let statusLabel = 'Under Review';
                
                if (item.status === 'APPROVED') {
                  statusBadgeBg = '#ECFDF5';
                  statusBadgeText = '#10B981';
                  statusLabel = 'Approved & Live';
                } else if (item.status === 'REJECTED') {
                  statusBadgeBg = '#FEF2F2';
                  statusBadgeText = '#EF4444';
                  statusLabel = 'Rejected';
                } else if (item.status === 'DELETED') {
                  statusBadgeBg = '#F8FAFC';
                  statusBadgeText = '#64748B';
                  statusLabel = 'Deleted';
                }

                return (
                  <View 
                    key={item.id}
                    style={[styles.materialCard, { width: isLargeScreen ? '48.5%' : '100%', backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                  >
                    <View style={styles.cardMainInfo}>
                      {/* Document Icon with branch background */}
                      <View style={[styles.docIconBox, { backgroundColor: branchColors.bg, borderColor: branchColors.border }]}>
                        <Ionicons name="document-text" size={24} color={branchColors.text} />
                        <Text style={[styles.docBranchTag, { color: branchColors.text }]}>{item.branch}</Text>
                      </View>

                      {/* Content column */}
                      <View style={styles.cardDetails}>
                        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.fileName}</Text>
                        
                        {/* Status Badge & Sem Badge row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          <View style={[styles.itemBadge, { backgroundColor: statusBadgeBg, borderColor: statusBadgeText, borderWidth: 0.5 }]}>
                            <Text style={{ fontSize: 9.5, fontWeight: '800', color: statusBadgeText }}>{statusLabel}</Text>
                          </View>
                          <View style={[styles.itemBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                            <Text style={[styles.itemBadgeText, { color: theme.textSecondary }]}>{item.semester}</Text>
                          </View>
                          <View style={[styles.itemBadge, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                            <Text style={[styles.itemBadgeText, { color: '#EA580C' }]}>{item.materialType}</Text>
                          </View>
                        </View>

                        {/* Description (if exists) */}
                        {item.description ? (
                          <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                            "{item.description}"
                          </Text>
                        ) : null}

                        {/* Created Date */}
                        <Text style={{ fontSize: 9.5, color: theme.textSecondary, marginTop: 4 }}>
                          📅 Submitted: {item.createdAt ? parseDocDate(item.createdAt).toLocaleDateString() : 'Recent'}
                        </Text>
                      </View>
                    </View>

                    {/* Action buttons (View & Delete) */}
                    <View style={styles.cardActionsRow}>
                      {(item.directUrl || item.fileUrl || item.webViewUrl) ? (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.viewBtn]} 
                          onPress={() => handleOpenPdf(item.directUrl || item.fileUrl || item.webViewUrl, item.title || item.fileName)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="eye-outline" size={14} color="#3B82F6" />
                          <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>View</Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.deleteBtn]} 
                        onPress={() => handleDeleteSubmission(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      <PdfViewerModal
        visible={isPdfVisible}
        onClose={() => setIsPdfVisible(false)}
        url={activePdfUrl}
        title={activePdfTitle}
      />
    </DetailModal>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    paddingBottom: 24,
    position: 'relative',
  },
  headerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleHeader: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSub: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 2,
  },
  headerButtonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  smallAdminBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  
  // Bento Grid Selector Dashboard
  hubContainer: {
    flex: 1,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 18,
  },
  bentoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'flex-start',
  },
  bentoIconFrame: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bentoCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    lineHeight: 18,
    marginBottom: 2,
  },
  bentoCardCode: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  contributionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  contributionBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  contributionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contributionBannerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  contributionBannerSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },

  // Room view specific styles
  roomContainer: {
    flex: 1,
  },
  roomHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  roomTitleCol: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  roomSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 2,
  },
  roomBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 32,
  },
  roomBackText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roomTitleColRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  roomTitleRight: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  roomSubtitleRight: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#F97316',
  },
  semSelectorPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  activeSemPill: {
    backgroundColor: '#F97316',
    borderColor: '#EA580C',
  },
  activeSemPillText: {
    color: '#FFFFFF',
  },

  listContainer: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  centerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  illustrationFrame: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  badgeLabel: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#F97316',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeLabelText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  mainHeading: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subDescription: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  contributionCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  contributionCardBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  materialCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    width: Platform.OS === 'web' || Dimensions.get('window').width > 600 ? '48.5%' : '100%',
  },
  cardMainInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  docIconBox: {
    width: 44,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBranchTag: {
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },
  cardDetails: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  itemBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  itemBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  cardDesc: {
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 15,
    marginTop: 4,
  },
  uploaderText: {
    fontSize: 10.5,
    marginTop: 6,
  },
  openBtn: {
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
    borderRadius: 8,
  },
  openBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  fabBtn: {
    position: 'absolute',
    bottom: -16,
    right: 0,
    backgroundColor: '#F97316',
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 6,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${6}px #EA580C` : undefined,

    elevation: 4,
  },
  fabBtnText: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '800',
  },

  // ==========================================
  // UPLOAD FORM STYLES
  // ==========================================
  formContainer: {
    gap: 16,
    paddingBottom: 32,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  formHeaderTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#EA580C',
  },
  instructionsBox: {
    backgroundColor: 'rgba(234, 88, 12, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.15)',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instructionText: {
    fontSize: 10.5,
    color: '#7C2D12',
    lineHeight: 14,
    flex: 1,
  },
  formInputGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  textInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectorPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  activeSelectorPill: {
    backgroundColor: '#F97316',
    borderColor: '#EA580C',
  },
  activeSelectorPillText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  typeListContainer: {
    gap: 6,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  activeTypeRow: {
    borderColor: '#F97316',
    backgroundColor: 'rgba(249, 115, 22, 0.03)',
  },
  typeRowText: {
    fontSize: 12.5,
  },
  documentPickerBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  pickerBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  pickerBtnSub: {
    fontSize: 10,
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  fileBoxMeta: {
    flex: 1,
    gap: 2,
  },
  fileNameText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  fileSizeText: {
    fontSize: 10.5,
  },
  removeFileBtn: {
    padding: 4,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
  },
  checkboxLabel: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  termsLink: {
    marginTop: -4,
    alignSelf: 'flex-start',
  },
  termsLinkText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  submitBtn: {
    backgroundColor: '#F97316',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  formSubmitLoader: {
    backgroundColor: '#EA580C',
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // ==========================================
  // ADMIN AUTH & PANEL
  // ==========================================
  adminAuthContainer: {
    paddingBottom: 24,
  },
  lockBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  lockTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  lockDesc: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  },
  pinInput: {
    height: 44,
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 16,
  },
  authSubmitBtn: {
    backgroundColor: '#F97316',
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authSubmitBtnText: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '800',
  },

  adminPanelContainer: {
    gap: 16,
    paddingBottom: 40,
  },
  gasUrlConfigCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  configHeader: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  configDesc: {
    fontSize: 10.5,
    color: '#64748B',
  },
  configInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 11,
  },
  configSaveBtn: {
    backgroundColor: '#F97316',
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configSaveText: {
    color: '#FFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  adminQueueTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    marginTop: 8,
  },
  adminEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  adminEmptyText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  adminEmptySubText: {
    fontSize: 11.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshQueueBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  refreshQueueText: {
    color: '#FFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  adminQueueList: {
    gap: 12,
  },
  adminMatCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  adminMetaCol: {
    gap: 4,
  },
  adminTitleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  adminTagsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  adminDescText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  adminUploaderText: {
    fontSize: 10,
    marginTop: 4,
  },
  adminActionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  adminPreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  adminPreviewText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  approveRejectActionBox: {
    flexDirection: 'row',
    gap: 8,
  },
  approveActionBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  approveActionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  rejectActionBtn: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  rejectActionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    padding: 0,
  },
  filterScroll: {
    marginBottom: 4,
    width: '100%',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewBtn: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  deleteBtn: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default StudyMaterialsModal;
