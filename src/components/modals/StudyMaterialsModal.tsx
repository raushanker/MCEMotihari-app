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
  useWindowDimensions,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DetailModal } from './DetailModal';
import { PdfViewerModal } from './PdfViewerModal';
import { FastLoginModal } from '@/components/modals/FastLoginModal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { compressPDF } from '@/utils/PDFCompressorHelper';


interface PickedFile {
  id: string;
  name: string;
  size: number;
  uri: string;
  status: 'preparing' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error: string | null;
  uploadedData: {
    driveFileId: string;
    fileHash: string;
    fileName: string;
    webViewUrl?: string;
    directUrl?: string;
    storagePath?: string;
  } | null;
  file?: any;
}

interface StudyMaterialsModalProps {
  visible: boolean;
  onClose: () => void;
  initialFilterBranch?: string;
  initialView?: 'library' | 'upload' | 'contributions';
}

// Fallback Google Apps Script URL if not set in AsyncStorage
const DEFAULT_GAS_URL = process.env.EXPO_PUBLIC_GAS_URL || "https://script.google.com/macros/s/AKfycbzHJPVpMJ5J-ZUe-40wFASxy3_1fB7vm2mtfSG1t_1-ijPtEpIKoj9XnPar1ICs5geI/exec";
const ADMIN_SECRET_KEY = "MCE_CONNECT_ADMIN_2026";

const parseDocDate = (val: any): Date => {
  if (!val) return new Date();
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
};

const formatDateToDisplay = (createdAt: any): string => {
  if (!createdAt) return 'Recent';
  const dateObj = parseDocDate(createdAt);
  const now = new Date();
  
  const isToday = 
    dateObj.getDate() === now.getDate() &&
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getFullYear() === now.getFullYear();
    
  if (isToday) {
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `Today, ${formattedHours}:${formattedMinutes} ${ampm}`;
  }
  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = 
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear();
    
  if (isYesterday) {
    return 'Yesterday';
  }
  
  return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export function StudyMaterialsModal({ visible, onClose, initialFilterBranch = 'All', initialView = 'library' }: StudyMaterialsModalProps) {
  const theme = useThemeColors();
  const { user } = useAppStore();
  const { width } = useWindowDimensions();
  const isLargeScreen = Platform.OS === 'web' || width > 600;

  // Navigation state: 'library' | 'upload' | 'contributions' | 'admin' | 'admin_auth'
  const [currentView, setCurrentView] = useState<'library' | 'upload' | 'contributions' | 'admin' | 'admin_auth'>(initialView);

  useEffect(() => {
    if (visible) {
      if (!user || !user.role || user.role === 'Guest') {
        setCurrentView('library');
      } else if (currentView === 'library') {
        // Only reset to initialView when modal first opens, not on every re-render
        setCurrentView(initialView);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const [isFastLoginVisible, setIsFastLoginVisible] = useState(false);

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
  const [pendingPdf, setPendingPdf] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (user && user.role && user.role !== 'Guest' && pendingPdf) {
      setActivePdfUrl(pendingPdf.url);
      setActivePdfTitle(pendingPdf.title);
      setIsPdfVisible(true);
      setPendingPdf(null);
      setIsFastLoginVisible(false);
    }
  }, [user, pendingPdf]);
  
  // Library filters
  const [filterSemester, setFilterSemester] = useState<string>('All');
  const [filterBranch, setFilterBranch] = useState<string>(initialFilterBranch);
  const [filterType, setFilterType] = useState<string>('All');
  const [selectedBranchView, setSelectedBranchView] = useState<string | null>(initialFilterBranch !== 'All' ? initialFilterBranch : null);
  const [gateFilterBranch, setGateFilterBranch] = useState<string>('All');
  const [isGateDropdownOpen, setIsGateDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      AsyncStorage.getItem('@mce_gate_filter_branch').then(savedBranch => {
        if (savedBranch) {
          setGateFilterBranch(savedBranch);
        } else if (user?.branch) {
          setGateFilterBranch(user.branch);
        } else {
          setGateFilterBranch('All');
        }
      });
    }
  }, [visible, user]);

  const handleGateBranchChange = async (br: string) => {
    setGateFilterBranch(br);
    await AsyncStorage.setItem('@mce_gate_filter_branch', br);
  };

  // Upload form state
  const [uploaderName, setUploaderName] = useState<string>("");
  const [selectedSemesters, setSelectedSemesters] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [pickedFiles, setPickedFiles] = useState<PickedFile[]>([]);
  const [topicTitle, setTopicTitle] = useState<string>("");
  const [selectedMultiFileItem, setSelectedMultiFileItem] = useState<any | null>(null);
  const [description, setDescription] = useState<string>("");
  const [consentChecked, setConsentChecked] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Super Admin validation
  const isSuperAdmin = useMemo(() => {
    return !!user && (
      user.uid === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || 
      user.uid === 'DdP2c855PSRUJwhmN9rvbkYBraP2' || 
      user.adminRole === 'SUPER_ADMIN' ||
      user.role === 'SUPER_ADMIN'
    );
  }, [user]);

  // Admin editing states
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editSemesters, setEditSemesters] = useState<string[]>([]);
  const [editBranches, setEditBranches] = useState<string[]>([]);
  const [editType, setEditType] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // User edit states (for My Contributions edit flow)
  const [isUserEditVisible, setIsUserEditVisible] = useState<boolean>(false);
  const [userEditItem, setUserEditItem] = useState<any>(null);
  const [userEditTitle, setUserEditTitle] = useState<string>("");
  const [userEditDescription, setUserEditDescription] = useState<string>("");
  const [userEditSemesters, setUserEditSemesters] = useState<string[]>([]);
  const [userEditBranches, setUserEditBranches] = useState<string[]>([]);
  const [userEditType, setUserEditType] = useState<string>("");
  const [isSavingUserEdit, setIsSavingUserEdit] = useState<boolean>(false);

  const handleOpenUserEdit = (item: any) => {
    setUserEditItem(item);
    setUserEditTitle(item.title || item.fileName || "");
    setUserEditDescription(item.description || "");
    setUserEditType(item.materialType || "");
    
    let initialSems: string[] = [];
    if (Array.isArray(item.semesters)) initialSems = [...item.semesters];
    else if (item.semester) initialSems = [item.semester];
    setUserEditSemesters(initialSems);

    let initialBranches: string[] = [];
    if (Array.isArray(item.branches)) initialBranches = [...item.branches];
    else if (item.branch) initialBranches = [item.branch];
    setUserEditBranches(initialBranches);

    setIsUserEditVisible(true);
  };

  const handleSaveUserEdit = async () => {
    if (!userEditItem) return;
    if (!userEditTitle.trim()) {
      customAlert("Title Required", "Kripya material ka title enter karein!");
      return;
    }
    const isWorkshop = userEditBranches.includes('Workshop');
    if (!isWorkshop && userEditSemesters.length === 0) {
      customAlert("Semester Required", "Kripya kam se kam ek semester select karein!");
      return;
    }
    if (userEditBranches.length === 0) {
      customAlert("Branch Required", "Kripya kam se kam ek branch select karein!");
      return;
    }
    if (!userEditType) {
      customAlert("Category Required", "Kripya material ka type select karein!");
      return;
    }

    setIsSavingUserEdit(true);
    try {
      const docRef = doc(db, 'study_material_submissions', userEditItem.id);
      await updateDoc(docRef, {
        title: userEditTitle.trim(),
        description: userEditDescription.trim(),
        materialType: userEditType,
        semester: isWorkshop ? "1st & 2nd Semester" : (userEditSemesters[0] || "N/A"),
        branch: userEditBranches[0] || "N/A",
        semesters: isWorkshop ? ["1st Semester", "2nd Semester"] : userEditSemesters,
        branches: userEditBranches,
        status: 'PENDING',  // Re-approval required after edit
        updatedAt: new Date().toISOString()
      });

      customAlert(
        "Saved & Sent for Review ✅",
        "Aapke changes save ho gaye hain! Material ab admin approval ke liye queue mein hai. Approve hone ke baad live dikhega.",
        [{ text: "OK", onPress: () => { setIsUserEditVisible(false); fetchMySubmissions(true); fetchApprovedMaterials({ force: true }); } }]
      );
    } catch (err: any) {
      console.error("[USER_EDIT_ERROR]", err);
      customAlert("Error", "Changes save karne mein problem aayi: " + (err.message || String(err)));
    } finally {
      setIsSavingUserEdit(false);
    }
  };

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setEditTitle(item.title || item.fileName || "");
    setEditDescription(item.description || "");
    setEditType(item.materialType || "");
    
    let initialSems: string[] = [];
    if (Array.isArray(item.semesters)) {
      initialSems = [...item.semesters];
    } else if (item.semester) {
      initialSems = [item.semester];
    }
    setEditSemesters(initialSems);

    let initialBranches: string[] = [];
    if (Array.isArray(item.branches)) {
      initialBranches = [...item.branches];
    } else if (item.branch) {
      initialBranches = [item.branch];
    }
    setEditBranches(initialBranches);

    setIsEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!editTitle.trim()) {
      Alert.alert("Title Required", "Kripya study material ka title enter karein!");
      return;
    }
    if (editSemesters.length === 0) {
      Alert.alert("Semester Required", "Kripya kam se kam ek semester select karein!");
      return;
    }
    if (editBranches.length === 0) {
      Alert.alert("Branch Required", "Kripya kam se kam ek branch/department select karein!");
      return;
    }
    if (!editType) {
      Alert.alert("Category Required", "Kripya material type/category select karein!");
      return;
    }

    setIsSavingEdit(true);
    try {
      const docRef = doc(db, 'study_material_submissions', editingItem.id);
      await updateDoc(docRef, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        materialType: editType,
        semester: editSemesters[0] || "N/A",
        branch: editBranches[0] || "N/A",
        semesters: editSemesters,
        branches: editBranches,
        updatedAt: new Date().toISOString()
      });

      Alert.alert("Success 🎉", "Study material details ko safalta-purvak update kar diya gaya hai.");
      setIsEditModalVisible(false);
      fetchApprovedMaterials({ force: true });
    } catch (err: any) {
      console.error("[ADMIN_EDIT_ERROR]", err);
      Alert.alert("Error", "Details save karne me problem aayi: " + (err.message || String(err)));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Upload progress and background status state variables
  const uploadAbortControllersRef = useRef<{ [fileId: string]: AbortController }>({});
  const uploadProgressIntervalsRef = useRef<{ [fileId: string]: any }>({});
  const uploadTimeoutIdsRef = useRef<{ [fileId: string]: any }>({});



  // Contributions tracking states
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [isMySubmissionsLoading, setIsMySubmissionsLoading] = useState<boolean>(false);
  const [isRefreshingContributions, setIsRefreshingContributions] = useState<boolean>(false);

  // Load cached approved materials from local AsyncStorage first for instant startup
  // Load cached approved materials from local AsyncStorage first for instant startup
  useEffect(() => {
    const loadCachedMaterials = async () => {
      try {
        const stored = await AsyncStorage.getItem('@mce_study_materials');
        if (stored) {
          const parsed = JSON.parse(stored);
          setApprovedMaterials(parsed);
          return parsed;
        }
      } catch (err) {
        console.warn('Failed to read cached study materials:', err);
      }
      return [];
    };

    const runSync = async () => {
      if (visible) {
        loadGasUrl();
        const cached = await loadCachedMaterials();
        
        try {
          const lastSyncStr = await AsyncStorage.getItem('@mce_study_materials_sync_time');
          const lastSync = lastSyncStr ? Number(lastSyncStr) : 0;
          const now = Date.now();
          const diffMs = now - lastSync;
          const expired = diffMs > 15 * 60 * 1000; // 15 minutes soft TTL

          if (expired || !lastSyncStr || cached.length === 0) {
            const quiet = cached.length > 0;
            fetchApprovedMaterials({ quiet });
          }
        } catch (e) {
          fetchApprovedMaterials({ quiet: cached.length > 0 });
        }
        
        setSelectedBranchView(initialFilterBranch !== 'All' ? initialFilterBranch : null);
        setFilterBranch(initialFilterBranch);
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

  useEffect(() => {
    return () => {
      Object.values(uploadAbortControllersRef.current).forEach(c => c.abort());
      Object.values(uploadProgressIntervalsRef.current).forEach(interval => clearInterval(interval));
      Object.values(uploadTimeoutIdsRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);


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
    buttons?: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[]
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

  const cleanupUploadedFiles = async (filesToClean: PickedFile[]) => {
    for (const f of filesToClean) {
      if (f.uploadedData && f.uploadedData.driveFileId && f.uploadedData.driveFileId !== 'firebase_storage') {
        try {
          if (__DEV__) { console.log("[CLEANUP_TRACE] Deleting orphaned file from Google Drive:", f.uploadedData.driveFileId); }
          await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: "delete",
              fileId: f.uploadedData.driveFileId,
              secret: ADMIN_SECRET_KEY
            })
          });
          if (__DEV__) { console.log("[CLEANUP_TRACE] Google Drive file deleted successfully"); }
        } catch (err) {
          if (__DEV__) { console.warn("[CLEANUP_TRACE] Failed to delete file from Google Drive:", err); }
        }
      }
    }
  };

  const resetForm = () => {
    setUploaderName(user?.name || "");
    setSelectedSemesters([]);
    setSelectedBranches([]);
    setSelectedType("");
    setPickedFiles([]);
    setTopicTitle("");
    setDescription("");
    setConsentChecked(false);
    setIsUploading(false);
  };

  const handleRemoveSingleFile = async (fileId: string) => {
    if (uploadAbortControllersRef.current[fileId]) {
      if (__DEV__) { console.log(`[UPLOAD_TRACE] Aborting upload for file: ${fileId}`); }
      uploadAbortControllersRef.current[fileId].abort();
      delete uploadAbortControllersRef.current[fileId];
    }
    if (uploadProgressIntervalsRef.current[fileId]) {
      clearInterval(uploadProgressIntervalsRef.current[fileId]);
      delete uploadProgressIntervalsRef.current[fileId];
    }
    if (uploadTimeoutIdsRef.current[fileId]) {
      clearTimeout(uploadTimeoutIdsRef.current[fileId]);
      delete uploadTimeoutIdsRef.current[fileId];
    }

    const fileToRemove = pickedFiles.find(f => f.id === fileId);
    if (!fileToRemove) return;

    if (fileToRemove.uploadedData?.driveFileId && fileToRemove.uploadedData.driveFileId !== 'firebase_storage') {
      try {
        if (__DEV__) { console.log("[UPLOAD_TRACE] Deleting removed file from Google Drive:", fileToRemove.uploadedData.driveFileId); }
        await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: "delete",
            fileId: fileToRemove.uploadedData.driveFileId,
            secret: ADMIN_SECRET_KEY
          })
        });
        if (__DEV__) { console.log("[UPLOAD_TRACE] Delete from Google Drive finished"); }
      } catch (err) {
        console.warn("Failed to delete removed file from Google Drive:", err);
      }
    }

    setPickedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleRetryUpload = (fileId: string) => {
    if (uploadProgressIntervalsRef.current[fileId]) {
      clearInterval(uploadProgressIntervalsRef.current[fileId]);
      delete uploadProgressIntervalsRef.current[fileId];
    }
    if (uploadTimeoutIdsRef.current[fileId]) {
      clearTimeout(uploadTimeoutIdsRef.current[fileId]);
      delete uploadTimeoutIdsRef.current[fileId];
    }

    const fileToRetry = pickedFiles.find(f => f.id === fileId);
    if (!fileToRetry) return;

    setPickedFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        return { ...f, status: 'preparing', progress: 0, error: null };
      }
      return f;
    }));

    executeSingleFileUpload(fileId, fileToRetry);
  };


  // Check if form is dirty (unsaved changes)
  const isFormDirty = () => {
    return (
      (uploaderName !== "" && uploaderName !== user?.name) ||
      selectedSemesters.length > 0 ||
      selectedBranches.length > 0 ||
      selectedType !== "" ||
      pickedFiles.length > 0 ||
      topicTitle !== "" ||
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
          { text: 'Discard', style: 'destructive', onPress: () => { cleanupUploadedFiles(pickedFiles); resetForm(); onClose(); } }
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
          { text: 'Discard', style: 'destructive', onPress: () => { cleanupUploadedFiles(pickedFiles); resetForm(); setCurrentView('library'); } }
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
      if (__DEV__) { console.log(`[DEBUG] Fetched approved materials count: ${materials.length}`, JSON.stringify(materials, null, 2)); }
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
        if (__DEV__) { console.log(`[Perf Logger] Study materials sync completed in ${duration}ms!`); }
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
          if (__DEV__) { console.log("[UPLOAD_TRACE] fileObject is not a valid blob, fetching URI:", uri); }
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
            if (__DEV__) { console.log("[UPLOAD_TRACE] XHR fetch successful, got blob of size:", fileToRead?.size); }
          } catch (xhrError) {
            if (__DEV__) { console.warn("[UPLOAD_TRACE] XHR fetch failed, trying fetch API:", xhrError); }
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

  const executeSingleFileUpload = async (fileId: string, fileData: any) => {
    // Clear any previous active timers and intervals
    if (uploadProgressIntervalsRef.current[fileId]) {
      clearInterval(uploadProgressIntervalsRef.current[fileId]);
      delete uploadProgressIntervalsRef.current[fileId];
    }
    if (uploadTimeoutIdsRef.current[fileId]) {
      clearTimeout(uploadTimeoutIdsRef.current[fileId]);
      delete uploadTimeoutIdsRef.current[fileId];
    }

    const controller = new AbortController();
    uploadAbortControllersRef.current[fileId] = controller;

    const updateFileState = (updates: Partial<PickedFile>) => {
      setPickedFiles(prev => prev.map(f => {
        if (f.id === fileId) {
          return { ...f, ...updates };
        }
        return f;
      }));
    };

    updateFileState({ status: 'uploading', progress: 5, error: null });

    const sizeInMb = fileData.size ? fileData.size / (1024 * 1024) : 0;
    let finalUri = fileData.uri;

    // Setup 120s timeout abort controller
    const timeoutId = setTimeout(() => {
      if (__DEV__) { console.log(`[UPLOAD_TRACE] Upload timeout (120s) reached for file: ${fileData.name}`); }
      controller.abort();
    }, 120000);
    uploadTimeoutIdsRef.current[fileId] = timeoutId;

    // Simulate progress steps from 10% to 90%
    let progress = 10;
    const progressInterval = setInterval(() => {
      if (progress < 90) {
        progress += Math.floor(Math.random() * 5) + 2;
        if (progress > 90) progress = 90;
        updateFileState({ progress });
      }
    }, 400);
    uploadProgressIntervalsRef.current[fileId] = progressInterval;

    try {
      if (__DEV__) { console.log("[UPLOAD_TRACE] PDF selected - name:", fileData.name, "uri:", fileData.uri, "size:", fileData.size, "hasFileObject:", !!fileData.file); }

      if (sizeInMb > 10) {
        updateFileState({ progress: 15 });
        if (__DEV__) { console.log("[UPLOAD_TRACE] File size > 10MB, compressing:", fileData.name, "size (MB):", sizeInMb); }
        finalUri = await compressPDF(fileData.uri, sizeInMb);
        if (__DEV__) { console.log("[UPLOAD_TRACE] PDF compression finished, finalUri:", finalUri); }
      }

      if (__DEV__) { console.log("[UPLOAD_TRACE] Base64 conversion start for:", fileData.name); }
      const base64Content = await convertFileToBase64(finalUri, fileData?.file || fileData);
      if (__DEV__) { console.log("[UPLOAD_TRACE] Base64 conversion complete. Length:", base64Content.length); }

      const CryptoJS = require('crypto-js');
      const fileHash = CryptoJS.MD5(base64Content).toString();
      if (__DEV__) { console.log("[UPLOAD_TRACE] HASH_GENERATED for file:", fileData.name, fileHash); }

      const isDuplicateLocal = approvedMaterials.some(
        mat => mat.fileName.toLowerCase() === fileData.name.toLowerCase() || mat.fileHash === fileHash
      );
      if (isDuplicateLocal) {
        throw new Error("Duplicate check failed: This file already exists in the library.");
      }

      const isDuplicateInCurrent = pickedFiles.some(
        f => f.id !== fileId && (f.name.toLowerCase() === fileData.name.toLowerCase() || (f.uploadedData && f.uploadedData.fileHash === fileHash))
      );
      if (isDuplicateInCurrent) {
        throw new Error("Duplicate check failed: This file is already selected in your upload list.");
      }

      if (__DEV__) { console.log("[UPLOAD_TRACE] Request start to Apps Script endpoint:", gasUrl); }
      const payload = {
        action: "upload_pending",
        uploaderName: uploaderName.trim() || user?.name || "anonymous",
        uploaderEmail: user?.email || "",
        semester: selectedSemesters.join(', ') || "N/A",
        branch: selectedBranches.join(', ') || "N/A",
        materialType: selectedType || "N/A",
        description: description.trim(),
        fileName: fileData.name,
        fileData: base64Content
      };

      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (__DEV__) { console.log("[UPLOAD_TRACE] Response received with status:", response.status); }

      if (!response.ok) {
        throw new Error(`Upload server returned status ${response.status}`);
      }

      const responseText = await response.text();
      if (__DEV__) { console.log("[UPLOAD_TRACE] Response body:", responseText); }

      let json;
      try {
        json = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Failed to parse server response as JSON");
      }

      // Clear timers and references
      if (uploadTimeoutIdsRef.current[fileId]) {
        clearTimeout(uploadTimeoutIdsRef.current[fileId]);
        delete uploadTimeoutIdsRef.current[fileId];
      }
      if (uploadProgressIntervalsRef.current[fileId]) {
        clearInterval(uploadProgressIntervalsRef.current[fileId]);
        delete uploadProgressIntervalsRef.current[fileId];
      }
      delete uploadAbortControllersRef.current[fileId];

      if (json.success && json.fileId) {
        if (__DEV__) { console.log("[UPLOAD_TRACE] Upload success. Google Drive fileId:", json.fileId); }
        updateFileState({
          status: 'completed',
          progress: 100,
          uploadedData: {
            driveFileId: json.fileId,
            fileHash: fileHash,
            fileName: fileData.name,
            webViewUrl: json.webViewUrl,
            directUrl: `https://drive.google.com/uc?export=download&id=${json.fileId}`,
            storagePath: ""
          }
        });
      } else {
        throw new Error(json.error || "Upload server write failed.");
      }
    } catch (error: any) {
      // Clear timers and references
      if (uploadTimeoutIdsRef.current[fileId]) {
        clearTimeout(uploadTimeoutIdsRef.current[fileId]);
        delete uploadTimeoutIdsRef.current[fileId];
      }
      if (uploadProgressIntervalsRef.current[fileId]) {
        clearInterval(uploadProgressIntervalsRef.current[fileId]);
        delete uploadProgressIntervalsRef.current[fileId];
      }
      delete uploadAbortControllersRef.current[fileId];

      let errorMsg = error.message || String(error);
      if (error.name === 'AbortError') {
        errorMsg = "Network timeout: Upload took longer than 120 seconds.";
        if (__DEV__) { console.log(`[UPLOAD_TRACE] Upload for file ${fileData.name} was aborted/timed out.`); }
      }

      if (__DEV__) { console.error("[UPLOAD_TRACE] Upload failure for file:", fileData.name, "Error:", errorMsg); }
      updateFileState({
        status: 'failed',
        error: errorMsg
      });
    }
  };


  const handlePickDocument = async () => {
    try {
      if (__DEV__) { console.log("[UPLOAD_TRACE] FILE_PICK started"); }
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled) {
        if (__DEV__) { console.log("[UPLOAD_TRACE] FILE_PICK canceled"); }
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const assets = result.assets;
        const validAssets: any[] = [];
        let skippedMime = false;
        let skippedSize = false;
        
        for (const asset of assets) {
          if (asset.mimeType !== 'application/pdf' && !asset.name.toLowerCase().endsWith('.pdf')) {
            skippedMime = true;
            continue;
          }
          const sizeInMb = asset.size ? asset.size / (1024 * 1024) : 0;
          if (sizeInMb > 25) {
            skippedSize = true;
            continue;
          }
          validAssets.push(asset);
        }

        if (skippedMime) {
          customAlert("Invalid Format", "Kewal PDF files hi upload ho sakti hain.");
        }
        if (skippedSize) {
          customAlert("File Too Large", "25 MB se badi files ko skip kar diya gaya.");
        }

        if (validAssets.length === 0) return;

        const currentCount = pickedFiles.length;
        if (currentCount + validAssets.length > 10) {
          customAlert("Limit Exceeded", "Aap maximum 10 documents hi upload kar sakte hain.");
          return;
        }

        const duplicates: any[] = [];
        const uniqueAssets: any[] = [];

        for (const asset of validAssets) {
          const alreadyExists = approvedMaterials.some((mat: any) => {
            if (mat.fileName === asset.name || (mat.title && mat.title.toLowerCase() === asset.name.replace(/\.pdf$/i, '').toLowerCase())) {
              return true;
            }
            if (mat.files && mat.files.some((f: any) => f.fileName === asset.name)) {
              return true;
            }
            return false;
          });

          if (alreadyExists) {
            duplicates.push(asset);
          } else {
            uniqueAssets.push(asset);
          }
        }

        const proceedWithAssets = (assetsToUpload: any[]) => {
          if (assetsToUpload.length === 0) return;
          
          const currentCount = pickedFiles.length;
          if (currentCount + assetsToUpload.length > 10) {
            customAlert("Limit Exceeded", "Aap maximum 10 documents hi upload kar sakte hain.");
            return;
          }

          const currentTotalSize = pickedFiles.reduce((sum, f) => sum + (f.size || 0), 0);
          const newTotalSize = assetsToUpload.reduce((sum, a) => sum + (a.size || 0), 0);
          if ((currentTotalSize + newTotalSize) / (1024 * 1024) > 100) {
            customAlert("Limit Exceeded", "Sabhi files ka combined size 100 MB se kam hona chahiye.");
            return;
          }

          const newPickedFiles: PickedFile[] = assetsToUpload.map(asset => {
            const fileId = `${asset.name}_${asset.size}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            return {
              id: fileId,
              name: asset.name,
              size: asset.size || 0,
              uri: asset.uri,
              status: 'preparing',
              progress: 0,
              error: null,
              uploadedData: null,
              file: asset.file || asset
            };
          });

          setPickedFiles(prev => [...prev, ...newPickedFiles]);

          newPickedFiles.forEach(pf => {
            executeSingleFileUpload(pf.id, pf);
          });
        };

        if (duplicates.length > 0) {
          const duplicateNames = duplicates.map(d => d.name).join(', ');
          const Alert = require('react-native').Alert;
          Alert.alert(
            "⚠️ Reupload Warning",
            `Ye file(s) pehle se hi library me upload ho chuki hain:\n\n${duplicateNames}\n\nKya aap phir bhi inhein reupload karna chahte hain?`,
            [
              {
                text: "No, Cancel",
                style: "cancel",
                onPress: () => {
                  proceedWithAssets(uniqueAssets);
                }
              },
              {
                text: "Yes, Reupload",
                style: "destructive",
                onPress: () => {
                  proceedWithAssets(validAssets);
                }
              }
            ]
          );
        } else {
          proceedWithAssets(validAssets);
        }
      }
    } catch (err: any) {
      if (__DEV__) { console.error("[UPLOAD_TRACE] ERROR during pick:", err); }
      customAlert("Error", "File selection failed: " + (err.message || String(err)));
    }
  };

  const submitToModeration = async () => {
    if (!uploaderName.trim()) {
      customAlert("Name Required", "Kripya apna naam darj karein!");
      return;
    }
    if (selectedSemesters.length === 0 && !selectedBranches.includes('Workshop')) {
      customAlert("Semester Required", "Kripya semester choose karein!");
      return;
    }
    if (selectedBranches.length === 0) {
      customAlert("Branch Required", "Kripya branch/department choose karein!");
      return;
    }
    if (!selectedType) {
      customAlert("Type Required", "Kripya upload material ka type choose karein!");
      return;
    }
    if (pickedFiles.length === 0) {
      customAlert("File Required", "Kripya study material PDF upload karein!");
      return;
    }
    const anyPending = pickedFiles.some(f => f.status !== 'completed');
    if (anyPending) {
      customAlert("Upload Pending", "Sabhi files ke successfully upload hone ka wait karein!");
      return;
    }
    if (pickedFiles.length > 1 && !topicTitle.trim()) {
      customAlert("Topic Title Required", "Kripya multiple files ke liye Topic/Subject name enter karein!");
      return;
    }
    if (!consentChecked) {
      customAlert("Consent Required", "Kripya authorization checkbox ko tick karein!");
      return;
    }

    setIsUploading(true);
    try {
      if (__DEV__) { console.log("[UPLOAD_TRACE] FIRESTORE_WRITE started"); }
      
      const firstFile = pickedFiles[0];
      const filesArray = pickedFiles.map(f => f.uploadedData);
      const docTitle = pickedFiles.length > 1 ? topicTitle.trim() : firstFile.name.replace(/\.pdf$/i, '');
      
      await addDoc(collection(db, 'study_material_submissions'), {
        title: docTitle,
        fileName: firstFile.uploadedData!.fileName,
        fileHash: firstFile.uploadedData!.fileHash,
        uploaderName: uploaderName.trim(),
        uploaderEmail: user?.email || "anonymous",
        ownerUid: user?.uid || "anonymous",
        semester: selectedBranches.includes('Workshop') ? "1st & 2nd Semester" : (selectedSemesters[0] || "N/A"),
        branch: selectedBranches[0] || "N/A",
        semesters: selectedBranches.includes('Workshop') ? ["1st Semester", "2nd Semester"] : selectedSemesters,
        branches: selectedBranches,
        materialType: selectedType,
        description: description.trim(),
        status: 'PENDING',
        driveFileId: firstFile.uploadedData!.driveFileId,
        webViewUrl: firstFile.uploadedData!.webViewUrl || "",
        directUrl: firstFile.uploadedData!.directUrl || "",
        storagePath: "",
        files: filesArray,
        createdAt: new Date().toISOString()
      });

      if (__DEV__) { console.log("[UPLOAD_TRACE] FIRESTORE_WRITE_SUCCESS"); }
      
      customAlert(
        "Upload Successful! 🎉", 
        "Aapki PDF material review ke liye submit ho gayi hai. Admin approval ke baad ye library me live show hogi!",
        [{ text: "OK", onPress: () => { resetForm(); setCurrentView('library'); fetchApprovedMaterials(); } }]
      );
    } catch (firestoreError: any) {
      if (__DEV__) { console.error("[UPLOAD_TRACE] ERROR during firestore write:", firestoreError); }
      
      if (__DEV__) { console.log("[UPLOAD_TRACE] ROLLBACK started"); }
      for (const f of pickedFiles) {
        if (f.uploadedData?.driveFileId && f.uploadedData.driveFileId !== 'firebase_storage') {
          try {
            await fetch(gasUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({
                action: "delete",
                fileId: f.uploadedData.driveFileId,
                secret: ADMIN_SECRET_KEY
              })
            });
          } catch (e) {
            console.warn("Failed to delete during rollback:", e);
          }
        }
      }
      if (__DEV__) { console.log("[UPLOAD_TRACE] ROLLBACK completed"); }
      
      customAlert("Upload Failed", "Database write failed: " + (firestoreError.message || String(firestoreError)));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteSubmission = async (item: any) => {
    const executeDelete = async () => {
      setIsMySubmissionsLoading(true);
      try {
        if (item.driveFileId && item.driveFileId !== 'firebase_storage') {
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
          } catch (driveErr) {
            console.warn("Failed to delete file from Google Drive:", driveErr);
          }
        }

        if (item.files && item.files.length > 0) {
          for (const f of item.files) {
            if (f.driveFileId && f.driveFileId !== 'firebase_storage') {
              try {
                console.log("[DELETE_TRACE] Deleting file from Google Drive:", f.driveFileId);
                await fetch(gasUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain' },
                  body: JSON.stringify({
                    action: "delete",
                    fileId: f.driveFileId,
                    secret: ADMIN_SECRET_KEY
                  })
                });
              } catch (driveErr) {
                console.warn("Failed to delete file from Google Drive:", driveErr);
              }
            }
          }
        }

        const docRef = doc(db, 'study_material_submissions', item.id);
        await deleteDoc(docRef);
        console.log("[DELETE_TRACE] Firestore document deleted successfully");

        customAlert("Deleted Successfully", "Aapka study material database aur storage se permanently delete kar diya gaya hai.");
        
        fetchMySubmissions(true);
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


  const [searchQuery, setSearchQuery] = useState('');

  const getFilteredMaterials = () => {
    const res = approvedMaterials.filter(mat => {
      // 1. Scope check: if user is in a specific branch room, only return materials of that branch
      if (selectedBranchView && selectedBranchView !== 'All') {
        const matchesSelectedBranch = mat.branch === selectedBranchView || 
                                      (Array.isArray(mat.branches) && mat.branches.includes(selectedBranchView)) ||
                                      (Array.isArray(mat.branch) && mat.branch.includes(selectedBranchView));
        if (!matchesSelectedBranch) {
          return false;
        }
      }

      // GATE specific branch filtering
      if (selectedBranchView === 'GATE' && gateFilterBranch !== 'All') {
        const matchesGateBranch = mat.branch === gateFilterBranch ||
                                  (Array.isArray(mat.branches) && mat.branches.includes(gateFilterBranch)) ||
                                  (Array.isArray(mat.branch) && mat.branch.includes(gateFilterBranch));
        if (!matchesGateBranch) {
          return false;
        }
      }

      // 2. Search query matches
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = mat.title && mat.title.toLowerCase().includes(q);
        const matchFile = mat.fileName && mat.fileName.toLowerCase().includes(q);
        const matchNestedFiles = mat.files && mat.files.some((f: any) => f.fileName && f.fileName.toLowerCase().includes(q));
        const matchDesc = mat.description && mat.description.toLowerCase().includes(q);
        const matchBranch = (mat.branch && typeof mat.branch === 'string' && mat.branch.toLowerCase().includes(q)) ||
                            (Array.isArray(mat.branches) && mat.branches.some((b: string) => b.toLowerCase().includes(q))) ||
                            (Array.isArray(mat.branch) && mat.branch.some((b: string) => b.toLowerCase().includes(q)));
        const matchSem = (mat.semester && typeof mat.semester === 'string' && mat.semester.toLowerCase().includes(q)) ||
                          (Array.isArray(mat.semesters) && mat.semesters.some((s: string) => s.toLowerCase().includes(q))) ||
                          (Array.isArray(mat.semester) && mat.semester.some((s: string) => s.toLowerCase().includes(q)));
        const matchType = mat.materialType && mat.materialType.toLowerCase().includes(q);
        const matchAuthor = (mat.uploaderName && mat.uploaderName.toLowerCase().includes(q)) ||
                            (mat.uploaderEmail && mat.uploaderEmail.toLowerCase().includes(q));
        
        return matchTitle || matchFile || matchNestedFiles || matchDesc || matchBranch || matchSem || matchType || matchAuthor;
      }
      
      // 3. Category/pill filters (when not searching)
      const matchSem = filterSemester === 'All' || 
                       (mat.semester && typeof mat.semester === 'string' && mat.semester.startsWith(filterSemester)) ||
                       (Array.isArray(mat.semesters) && mat.semesters.some((s: string) => s.startsWith(filterSemester))) ||
                       (Array.isArray(mat.semester) && mat.semester.some((s: string) => s.startsWith(filterSemester)));

      const matchBranch = filterBranch === 'All' || 
                          mat.branch === filterBranch ||
                          (Array.isArray(mat.branches) && mat.branches.includes(filterBranch)) ||
                          (Array.isArray(mat.branch) && mat.branch.includes(filterBranch));

      const matchType = filterType === 'All' || mat.materialType === filterType;
      
      return matchSem && matchBranch && matchType;
    });
    return res;
  };

  const getBranchColor = (branch: string) => {
    switch (branch) {
      case 'CSE': return { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' };
      case 'CSE (AI)': return { bg: '#ECFDF5', text: '#10B981', border: '#A7F3D0' };
      case 'Civil': return { bg: '#FEF2F2', text: '#EF4444', border: '#FECACA' };
      case 'Civil (CA)': return { bg: '#FFF1F2', text: '#F43F5E', border: '#FECDD3' };
      case 'EEE': return { bg: '#FFFBEB', text: '#F59E0B', border: '#FEF3C7' };
      case 'Mechanical': return { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' };
      case 'GATE': return { bg: '#FDF2F8', text: '#DB2777', border: '#FBCFE8' };
      case 'Workshop': return { bg: '#FFF7ED', text: '#EA580C', border: '#FFEDD5' };
      default: return { bg: '#F8FAFC', text: '#475569', border: '#CBD5E1' };
    }
  };

  const semestersList = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
  const branchesList = ['CSE', 'CSE (AI)', 'Civil', 'Civil (CA)', 'EEE', 'Mechanical', 'GATE', 'Workshop'];
  const materialTypes = [
    'Teacher Notes',
    'Hand-written Notes',
    'PYQ',
    'Mid Sem PYQ',
    'Open-source Book PDF'
  ];

  const handleOpenPdf = (url: string, title?: string) => {
    if (!url) {
      customAlert("Error", "File URL not found.");
      return;
    }
    if (!user || !user.role || user.role === 'Guest') {
      setPendingPdf({ url, title: title || 'Document Viewer' });
      setIsFastLoginVisible(true);
      return;
    }
    setActivePdfUrl(url);
    setActivePdfTitle(title || 'Document Viewer');
    setIsPdfVisible(true);
  };

  const handleOpenMaterial = (item: any) => {
    if (item.files && item.files.length > 1) {
      setSelectedMultiFileItem(item);
    } else {
      handleOpenPdf(item.directUrl || item.fileUrl || item.webViewUrl, item.title || item.fileName);
    }
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
    (selectedSemesters.length === 0 && !selectedBranches.includes('Workshop')) ||
    selectedBranches.length === 0 ||
    !selectedType ||
    pickedFiles.length === 0 ||
    pickedFiles.some(f => f.status === 'uploading' || f.status === 'preparing' || f.status === 'failed') ||
    (pickedFiles.length > 1 && !topicTitle.trim()) ||
    !consentChecked;

  const handleDepartmentPress = (branch: string) => {
    setSelectedBranchView(branch);
    setFilterBranch(branch);
    setFilterSemester('All');
  };

  // Navigate to upload view with optional branch pre-selection
  const handleGoToUpload = () => {
    if (!user || user.role === 'Guest') {
      setIsFastLoginVisible(true);
      return;
    }
    // Pre-select branch if user is in a branch view
    if (selectedBranchView) {
      setSelectedBranches([selectedBranchView]);
      if (selectedBranchView !== 'Workshop') {
        setSelectedSemesters([]);
      }
    }
    // Use setTimeout to ensure branch state is set before view changes
    setTimeout(() => setCurrentView('upload'), 0);
  };

  return (
    <DetailModal
      visible={visible}
      title={
        selectedBranchView !== null
          ? (selectedBranchView === 'CSE' ? 'Computer Science & Eng.' :
             selectedBranchView === 'CSE (AI)' ? 'CSE (Artificial Intelligence)' :
             selectedBranchView === 'Civil' ? 'Civil Engineering' :
             selectedBranchView === 'Civil (CA)' ? 'Civil (Computer Application)' :
             selectedBranchView === 'EEE' ? 'Electrical & Electronics Eng.' :
             selectedBranchView === 'Mechanical' ? 'Mechanical Engineering' :
             selectedBranchView === 'GATE' ? 'GATE Study Material' : 
             selectedBranchView === 'Workshop' ? 'Workshop Practice' : selectedBranchView)
          : "Study Materials Library"
      }
      onClose={handleCloseWithCheck}
      fullHeight={true}
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
          {selectedBranchView === null ? (
            <View style={styles.hubContainer}>
              <View style={styles.headerActionRow}>
                <View style={{ flex: 1 }}>
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

              {searchQuery.trim() === '' ? (
                <>
                  {/* Bento grid of departments */}
                  <View style={styles.bentoGrid}>
                    {/* CSE */}
                    <TouchableOpacity
                      style={[styles.bentoCard, { width: '48%', backgroundColor: theme.isDark ? 'rgba(124, 58, 237, 0.08)' : '#F5F3FF', borderColor: theme.isDark ? 'rgba(124, 58, 237, 0.25)' : '#E9D5FF' }]}
                      onPress={() => handleDepartmentPress('CSE')}
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
                      style={[styles.bentoCard, { width: '48%', backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5', borderColor: theme.isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0' }]}
                      onPress={() => handleDepartmentPress('CSE (AI)')}
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
                      style={[styles.bentoCard, { width: '48%', backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2', borderColor: theme.isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA' }]}
                      onPress={() => handleDepartmentPress('Civil')}
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
                      style={[styles.bentoCard, { width: '48%', backgroundColor: theme.isDark ? 'rgba(244, 63, 94, 0.08)' : '#FFF1F2', borderColor: theme.isDark ? 'rgba(244, 63, 94, 0.25)' : '#FECDD3' }]}
                      onPress={() => handleDepartmentPress('Civil (CA)')}
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
                      style={[styles.bentoCard, { width: '48%', backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB', borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.25)' : '#FEF3C7' }]}
                      onPress={() => handleDepartmentPress('EEE')}
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
                      style={[styles.bentoCard, { width: '48%', backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF', borderColor: theme.isDark ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE' }]}
                      onPress={() => handleDepartmentPress('Mechanical')}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.bentoIconFrame, { backgroundColor: '#3B82F6' }]}>
                        <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
                      </View>
                      <Text style={[styles.bentoCardTitle, { color: theme.text }]}>Mechanical Eng.</Text>
                      <Text style={[styles.bentoCardCode, { color: '#3B82F6' }]}>ME Department</Text>
                    </TouchableOpacity>

                    {/* GATE */}
                    <TouchableOpacity
                      style={[styles.bentoCard, { width: '48%', backgroundColor: theme.isDark ? 'rgba(219, 39, 119, 0.08)' : '#FDF2F8', borderColor: theme.isDark ? 'rgba(219, 39, 119, 0.25)' : '#FBCFE8' }]}
                      onPress={() => handleDepartmentPress('GATE')}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.bentoIconFrame, { backgroundColor: '#DB2777' }]}>
                        <Ionicons name="school-outline" size={18} color="#FFFFFF" />
                      </View>
                      <Text style={[styles.bentoCardTitle, { color: theme.text }]}>GATE</Text>
                      <Text style={[styles.bentoCardCode, { color: '#DB2777' }]}>Exam Prep</Text>
                    </TouchableOpacity>

                    {/* Workshop */}
                    <TouchableOpacity
                      style={[styles.bentoCard, { width: '48%', backgroundColor: theme.isDark ? 'rgba(234, 88, 12, 0.08)' : '#FFF7ED', borderColor: theme.isDark ? 'rgba(234, 88, 12, 0.25)' : '#FFEDD5' }]}
                      onPress={() => handleDepartmentPress('Workshop')}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.bentoIconFrame, { backgroundColor: '#EA580C' }]}>
                        <Ionicons name="hammer-outline" size={18} color="#FFFFFF" />
                      </View>
                      <Text style={[styles.bentoCardTitle, { color: theme.text }]}>Workshop</Text>
                      <Text style={[styles.bentoCardCode, { color: '#EA580C' }]}>First Year</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Upload Contribution Banner */}
                  {user !== null && user.role !== undefined && user.role !== 'Guest' && (
                    <TouchableOpacity 
                      style={[styles.contributionBanner, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                      onPress={handleGoToUpload}
                      activeOpacity={0.8}
                    >
                      <View style={styles.contributionBannerLeft}>
                        <View style={styles.contributionIconCircle}>
                          <Ionicons name="cloud-upload" size={18} color="#F97316" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.contributionBannerTitle, { color: theme.text }]}>Post Study materials</Text>
                          <Text style={[styles.contributionBannerSub, { color: theme.textSecondary }]}>Upload lecture PDFs, teacher notes, or BEU PYQ solutions</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}

                  {/* My Contributions Banner */}
                  {user !== null && user.role !== undefined && user.role !== 'Guest' && (
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
                  )}
                </>
              ) : (
                <View style={[styles.roomContainer, { paddingHorizontal: 0 }]}>
                  <View style={styles.roomTitleCol}>
                    <Text style={[styles.roomTitle, { color: theme.text }]}>Search Results</Text>
                    <Text style={[styles.roomSubtitle, { color: theme.textSecondary }]}>
                      Found {getFilteredMaterials().length} files globally matching query
                    </Text>
                  </View>
                  <View style={{ height: 14 }} />

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
                        Aapke search query ke matching koi study material live nahi mila. Different keywords check karein.
                      </Text>
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
                              <View style={[styles.docIconBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                                <Ionicons name="document-text" size={24} color={colors.text} />
                                <Text style={[styles.docBranchTag, { color: colors.text }]}>{item.branch}</Text>
                              </View>
                              <View style={styles.cardDetails}>
                                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{item.title || item.fileName}</Text>
                                <View style={styles.tagRow}>
                                  <View style={[styles.itemBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                                    <Text style={[styles.itemBadgeText, { color: theme.textSecondary }]}>{item.semester} Sem</Text>
                                  </View>
                                  <View style={[styles.itemBadge, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                                    <Text style={[styles.itemBadgeText, { color: '#EA580C' }]}>{item.materialType}</Text>
                                  </View>
                                  {item.files && item.files.length > 1 && (
                                    <View style={[styles.itemBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                                      <Text style={[styles.itemBadgeText, { color: theme.textSecondary }]}>{item.files.length} PDFs</Text>
                                    </View>
                                  )}
                                </View>
                                {item.description ? (
                                  <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                                    "{item.description}"
                                  </Text>
                                ) : null}
                                <Text style={[styles.uploaderText, { color: theme.textSecondary }]}>
                                  👤 Contributed by: <Text style={{ fontWeight: 'bold' }}>{item.uploaderName}</Text>
                                </Text>
                                <Text style={{ fontSize: 10.5, color: theme.textSecondary, marginTop: 4 }}>
                                  📅 Submitted: {formatDateToDisplay(item.createdAt)}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.actionBtnRow}>
                              <TouchableOpacity 
                                style={[styles.openBtn, isSuperAdmin && { flex: 1, marginRight: 8, marginTop: 0 }]} 
                                onPress={() => handleOpenMaterial(item)}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="eye" size={15} color="#FFF" />
                                <Text style={styles.openBtnText}>Open Document</Text>
                              </TouchableOpacity>

                              {isSuperAdmin && (
                                <TouchableOpacity 
                                  style={styles.adminEditBtn} 
                                  onPress={() => handleOpenEditModal(item)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="create-outline" size={15} color="#FFF" />
                                  <Text style={styles.adminEditBtnText}>Edit/Map</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            
            /* ───────────────── 1B. FILTERED DEPARTMENT / SEARCH VIEW ───────────────── */
            <View style={styles.roomContainer}>
              {/* Back & Title Header Row */}
              <View style={styles.roomHeaderRow}>
                <TouchableOpacity 
                  style={[styles.roomBackBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                  onPress={() => {
                    if (initialFilterBranch !== 'All') {
                      onClose();
                    } else {
                      setSelectedBranchView(null);
                      setFilterBranch('All');
                      setFilterSemester('All');
                      setSearchQuery('');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={15} color={theme.text} />
                  <Text style={[styles.roomBackText, { color: theme.text }]}>
                    {initialFilterBranch !== 'All' ? 'Back' : 'Departments'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Single Semester Selector Row (Only active when in a branch room and not searching globally) */}
              {searchQuery.trim() === '' && selectedBranchView !== 'Workshop' && (
                <View style={{ marginBottom: 12 }}>
                  {/* GATE Branch Selector — inline accordion, no absolute positioning */}
                  {selectedBranchView === 'GATE' && (() => {
                    const gateBranches = [
                      { key: 'All',        label: 'All Branches', emoji: '🌐' },
                      { key: 'CSE',        label: 'CSE',          emoji: '💻' },
                      { key: 'CSE (AI)',   label: 'CSE (AI)',     emoji: '🤖' },
                      { key: 'Civil',      label: 'Civil',        emoji: '🏗️' },
                      { key: 'Civil (CA)', label: 'Civil (CA)',   emoji: '🖥️' },
                      { key: 'EEE',        label: 'EEE',          emoji: '⚡' },
                      { key: 'Mechanical', label: 'Mechanical',   emoji: '⚙️' },
                    ];
                    const selected = gateBranches.find(b => b.key === gateFilterBranch) || gateBranches[0];
                    return (
                      <View style={[styles.gateSelectorCard, { backgroundColor: theme.backgroundElement, borderColor: theme.isDark ? 'rgba(219,39,119,0.35)' : '#FBCFE8' }]}>
                        {/* Header label */}
                        <View style={styles.gateSelectorHeader}>
                          <View style={styles.gateSelectorHeaderLeft}>
                            <View style={styles.gateIconDot}>
                              <Ionicons name="school" size={13} color="#DB2777" />
                            </View>
                            <Text style={[styles.gateSelectorLabel, { color: theme.textSecondary }]}>GATE Stream</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.gateTriggerBtn, { borderColor: theme.isDark ? 'rgba(219,39,119,0.4)' : '#F9A8D4', backgroundColor: theme.isDark ? 'rgba(219,39,119,0.08)' : '#FFF0F6' }]}
                            onPress={() => setIsGateDropdownOpen(!isGateDropdownOpen)}
                            activeOpacity={0.75}
                          >
                            <Text style={styles.gateTriggerEmoji}>{selected.emoji}</Text>
                            <Text style={[styles.gateTriggerText, { color: '#DB2777' }]}>{selected.label}</Text>
                            <Ionicons name={isGateDropdownOpen ? 'chevron-up' : 'chevron-down'} size={13} color="#DB2777" />
                          </TouchableOpacity>
                        </View>

                        {/* Expandable option list — inline, no absolute */}
                        {isGateDropdownOpen && (
                          <View style={[styles.gateOptionList, { borderTopColor: theme.isDark ? 'rgba(219,39,119,0.2)' : '#FCE7F3' }]}>
                            {gateBranches.map((br, idx) => {
                              const active = gateFilterBranch === br.key;
                              return (
                                <TouchableOpacity
                                  key={br.key}
                                  style={[
                                    styles.gateOptionRow,
                                    idx !== gateBranches.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#FCE7F3' },
                                    active && { backgroundColor: theme.isDark ? 'rgba(219,39,119,0.12)' : '#FDF2F8' }
                                  ]}
                                  onPress={() => { handleGateBranchChange(br.key); setIsGateDropdownOpen(false); }}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.gateOptionLeft}>
                                    <Text style={styles.gateOptionEmoji}>{br.emoji}</Text>
                                    <Text style={[styles.gateOptionText, { color: active ? '#DB2777' : theme.text }, active && { fontWeight: '700' }]}>
                                      {br.label}
                                    </Text>
                                    {gateFilterBranch === 'All' && br.key === 'All' ? (
                                      <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>default</Text></View>
                                    ) : null}
                                  </View>
                                  {active
                                    ? <Ionicons name="checkmark-circle" size={18} color="#DB2777" />
                                    : <View style={[styles.radioCircle, { borderColor: theme.isDark ? 'rgba(255,255,255,0.2)' : '#E9D5FF' }]} />
                                  }
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })()}

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
              <View style={[styles.searchBarContainer, { backgroundColor: theme.background, borderColor: theme.cardBorder, marginBottom: searchQuery.trim() !== '' ? 8 : 14 }]}>
                <Ionicons name="search-outline" size={16} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                  placeholder={`Search in ${selectedBranchView} stream...`}
                  placeholderTextColor="#94A3B8"
                  style={[styles.searchInput, { color: theme.text }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
              </View>

              {searchQuery.trim() !== '' && (
                <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, marginBottom: 14, paddingHorizontal: 4 }}>
                  Found {getFilteredMaterials().length} files matching "{searchQuery}"
                </Text>
              )}

              {/* Special Workshop Playlist Card */}
              {selectedBranchView === 'Workshop' && searchQuery.trim() === '' && (
                <TouchableOpacity
                  style={[styles.bentoCard, { width: '100%', backgroundColor: theme.isDark ? 'rgba(234, 88, 12, 0.08)' : '#FFF7ED', borderColor: theme.isDark ? 'rgba(234, 88, 12, 0.25)' : '#FFEDD5', marginBottom: 16, flexDirection: 'row', alignItems: 'center', padding: 16 }]}
                  onPress={() => Linking.openURL('https://www.youtube.com/playlist?list=PLrQMcBuWyAa7bfRJztianN16waVpYN2tt')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.bentoIconFrame, { backgroundColor: '#FF0000', marginRight: 16 }]}>
                    <Ionicons name="logo-youtube" size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bentoCardTitle, { color: theme.text }]}>MCE Workshop</Text>
                    <Text style={[styles.bentoCardCode, { color: '#EA580C', marginTop: 4 }]}>Real videos of all shops and Job</Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color="#EA580C" />
                </TouchableOpacity>
              )}

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
                  
                  {user !== null && user.role !== undefined && user.role !== 'Guest' && (
                    <TouchableOpacity 
                      style={[styles.contributionCardBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                      onPress={handleGoToUpload}
                    >
                      <Ionicons name="cloud-upload-outline" size={18} color="#F97316" />
                      <Text style={[styles.contributionCardBtnText, { color: theme.text }]}>Upload PDF Material</Text>
                    </TouchableOpacity>
                  )}
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
                            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{item.title || item.fileName}</Text>
                            
                            {/* Tags */}
                            <View style={styles.tagRow}>
                              <View style={[styles.itemBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                                <Text style={[styles.itemBadgeText, { color: theme.textSecondary }]}>{item.semester} Sem</Text>
                              </View>
                              <View style={[styles.itemBadge, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                                <Text style={[styles.itemBadgeText, { color: '#EA580C' }]}>{item.materialType}</Text>
                              </View>
                              {item.files && item.files.length > 1 && (
                                <View style={[styles.itemBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                                  <Text style={[styles.itemBadgeText, { color: theme.textSecondary }]}>{item.files.length} PDFs</Text>
                                </View>
                              )}
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
                            <Text style={{ fontSize: 10.5, color: theme.textSecondary, marginTop: 4 }}>
                              📅 Submitted: {formatDateToDisplay(item.createdAt)}
                            </Text>
                          </View>
                        </View>

                        {/* View Button */}
                        <View style={styles.actionBtnRow}>
                          <TouchableOpacity 
                            style={[styles.openBtn, isSuperAdmin && { flex: 1, marginRight: 8, marginTop: 0 }]} 
                            onPress={() => handleOpenMaterial(item)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="eye" size={15} color="#FFF" />
                            <Text style={styles.openBtnText}>Open Document</Text>
                          </TouchableOpacity>

                          {isSuperAdmin && (
                            <TouchableOpacity 
                              style={styles.adminEditBtn} 
                              onPress={() => handleOpenEditModal(item)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="create-outline" size={15} color="#FFF" />
                              <Text style={styles.adminEditBtnText}>Edit/Map</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}


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
          {!selectedBranches.includes('Workshop') && (
          <View style={styles.formInputGroup}>
            <Text style={[styles.formLabel, { color: theme.text }]}>🎓 Select Semester (Max 2)</Text>
            <View style={styles.tagGrid}>
              {semestersList.map(sem => {
                const tagValue = `${sem} Semester`;
                const active = selectedSemesters.includes(tagValue);
                return (
                  <TouchableOpacity 
                    key={sem} 
                    style={[
                      styles.selectorPill, 
                      { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                      active && styles.activeSelectorPill
                    ]}
                    onPress={() => {
                      if (active) {
                        setSelectedSemesters(prev => prev.filter(v => v !== tagValue));
                      } else {
                        setSelectedSemesters(prev => {
                          if (prev.length >= 2) {
                            return [prev[1], tagValue];
                          }
                          return [...prev, tagValue];
                        });
                      }
                    }}
                  >
                    <Text style={[styles.selectorPillText, { color: theme.textSecondary }, active && styles.activeSelectorPillText]}>
                      {sem} Sem
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          )}

          {/* Department tags selector */}
          <View style={styles.formInputGroup}>
            <Text style={[styles.formLabel, { color: theme.text }]}>🏛️ Select Branch/Department (Max 2)</Text>
            <View style={styles.tagGrid}>
              {branchesList.map(br => {
                const active = selectedBranches.includes(br);
                const colors = getBranchColor(br);
                return (
                  <TouchableOpacity 
                    key={br} 
                    style={[
                      styles.selectorPill, 
                      { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                      active && { backgroundColor: colors.bg, borderColor: colors.text, borderWidth: 1.5 }
                    ]}
                    onPress={() => {
                      if (active) {
                        setSelectedBranches(prev => prev.filter(v => v !== br));
                      } else {
                        setSelectedBranches(prev => {
                          if (prev.length >= 2) {
                            return [prev[1], br];
                          }
                          return [...prev, br];
                        });
                      }
                    }}
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

          {/* Topic/Subject input (visible if pickedFiles.length > 1) */}
          {pickedFiles.length > 1 && (
            <View style={styles.formInputGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>🏷️ Topic / Subject Name (Required)</Text>
              <TextInput 
                style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                value={topicTitle}
                onChangeText={setTopicTitle}
                placeholder="e.g., Surveying, Fluid Mechanics Notes"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          )}

          {/* PDF Document Picker */}
          <View style={styles.formInputGroup}>
            <Text style={[styles.formLabel, { color: theme.text }]}>📄 Upload PDF Documents ({pickedFiles.length}/10)</Text>
            
            {pickedFiles.length > 0 && (
              <View style={{ gap: 10, marginBottom: 12 }}>
                {pickedFiles.map(file => (
                  <View 
                    key={file.id} 
                    style={[styles.selectedFileBox, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, flexDirection: 'column', alignItems: 'stretch' }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12, overflow: 'hidden' }}>
                        <Ionicons name="document-text" size={32} color="#EF4444" style={{ flexShrink: 0 }} />
                        <View style={{ flex: 1, flexShrink: 1, gap: 2, overflow: 'hidden' }}>
                          <Text style={[styles.fileNameText, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">{file.name}</Text>
                          <Text style={[styles.fileSizeText, { color: theme.textSecondary }]}>
                            {file.size ? (file.size / (1024 * 1024)).toFixed(2) : "0.00"} MB • PDF Document
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={[styles.removeFileBtn, { flexShrink: 0, minWidth: 30, minHeight: 30, justifyContent: 'center', alignItems: 'center' }]} 
                        onPress={() => handleRemoveSingleFile(file.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={file.status === 'uploading' ? "close-circle-outline" : "trash-outline"} size={22} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Progress / Status display */}
                    {file.status === 'uploading' && (
                      <View style={{ marginTop: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 11, color: theme.textSecondary, fontWeight: '600' }}>
                            Uploading...
                          </Text>
                          <Text style={{ fontSize: 11, color: '#F97316', fontWeight: '800' }}>
                            {file.progress}%
                          </Text>
                        </View>
                        <View style={{ height: 6, width: '100%', backgroundColor: theme.isDark ? '#334155' : '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: `${file.progress}%`, backgroundColor: '#F97316', borderRadius: 3 }} />
                        </View>
                      </View>
                    )}

                    {/* Upload Success Status */}
                    {file.status === 'completed' && file.uploadedData && (
                      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={{ fontSize: 11.5, color: '#10B981', fontWeight: '700' }}>
                          File uploaded successfully
                        </Text>
                      </View>
                    )}

                    {/* Upload Error / Retry Status */}
                    {file.status === 'failed' && file.error && (
                      <View style={{ marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <Ionicons name="alert-circle" size={16} color="#EF4444" />
                          <Text style={{ fontSize: 11.5, color: '#EF4444', fontWeight: '700', flex: 1 }}>
                            {file.error}
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
                          onPress={() => handleRetryUpload(file.id)}
                        >
                          <Ionicons name="refresh-outline" size={14} color="#FFF" />
                          <Text style={{ color: '#FFF', fontSize: 11.5, fontWeight: '800' }}>Retry Upload</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Choose button / Add more button */}
            {pickedFiles.length < 10 ? (
              <TouchableOpacity 
                style={[
                  styles.documentPickerBtn, 
                  { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                  pickedFiles.length > 0 && { paddingVertical: 12, borderStyle: 'dashed' }
                ]}
                onPress={handlePickDocument}
              >
                <Ionicons name="cloud-upload" size={pickedFiles.length > 0 ? 20 : 26} color="#F97316" />
                <Text style={[styles.pickerBtnText, { color: theme.text }]}>
                  {pickedFiles.length > 0 ? "Add More PDF Files" : "Choose PDF Files"}
                </Text>
                {pickedFiles.length === 0 && (
                  <Text style={[styles.pickerBtnSub, { color: theme.textSecondary }]}>
                    Select up to 10 PDFs (max 25MB each, 100MB combined)
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
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
          {isUploading ? (
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
                onPress={handleGoToUpload}
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
                        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.title || item.fileName}</Text>
                        
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
                          {item.files && item.files.length > 1 && (
                            <View style={[styles.itemBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                              <Text style={[styles.itemBadgeText, { color: theme.textSecondary }]}>{item.files.length} PDFs</Text>
                            </View>
                          )}
                        </View>

                        {/* Description (if exists) */}
                        {item.description ? (
                          <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                            "{item.description}"
                          </Text>
                        ) : null}

                        {/* Created Date */}
                        <Text style={{ fontSize: 9.5, color: theme.textSecondary, marginTop: 4 }}>
                          📅 Submitted: {formatDateToDisplay(item.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {/* Action buttons (View, Edit & Delete) */}
                    <View style={styles.cardActionsRow}>
                      {(item.directUrl || item.fileUrl || item.webViewUrl) ? (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.viewBtn]} 
                          onPress={() => handleOpenMaterial(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="eye-outline" size={14} color="#3B82F6" />
                          <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>View</Text>
                        </TouchableOpacity>
                      ) : null}

                      {/* Edit Button */}
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1 }]} 
                        onPress={() => handleOpenUserEdit(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="create-outline" size={14} color="#D97706" />
                        <Text style={[styles.actionBtnText, { color: '#D97706' }]}>Edit</Text>
                      </TouchableOpacity>

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

      {isPdfVisible && (
        <PdfViewerModal
          visible={isPdfVisible}
          onClose={() => setIsPdfVisible(false)}
          url={activePdfUrl}
          title={activePdfTitle}
        />
      )}

      {/* ─── User Edit Modal ──────────────────────────────────────────────────── */}
      {isUserEditVisible && userEditItem && (
        <DetailModal
          visible={isUserEditVisible}
          title="Edit Study Material"
          onClose={() => setIsUserEditVisible(false)}
          fullHeight={true}
        >
          <View style={{ paddingBottom: 24 }}>

            {/* Re-approval notice */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 18 }}>
              <Ionicons name="information-circle" size={18} color="#D97706" />
              <Text style={{ flex: 1, fontSize: 11.5, color: '#92400E', fontWeight: '600' }}>
                Edit karne ke baad material admin review ke liye jayega. Approve hone ke baad live dikhega.
              </Text>
            </View>

            {/* Title */}
            <View style={styles.formInputGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>📝 Title / Subject Name</Text>
              <TextInput
                style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                value={userEditTitle}
                onChangeText={setUserEditTitle}
                placeholder="Material ka title darj karein"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            {/* Description */}
            <View style={styles.formInputGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>💬 Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, minHeight: 80, textAlignVertical: 'top' }]}
                value={userEditDescription}
                onChangeText={setUserEditDescription}
                placeholder="Short description about this material..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Semester (hidden for Workshop) */}
            {!userEditBranches.includes('Workshop') && (
              <View style={styles.formInputGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>🎓 Semester (Max 2)</Text>
                <View style={styles.tagGrid}>
                  {semestersList.map(sem => {
                    const tagValue = `${sem} Semester`;
                    const active = userEditSemesters.includes(tagValue);
                    return (
                      <TouchableOpacity
                        key={sem}
                        style={[styles.selectorPill, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }, active && styles.activeSelectorPill]}
                        onPress={() => {
                          if (active) {
                            setUserEditSemesters(prev => prev.filter(v => v !== tagValue));
                          } else {
                            setUserEditSemesters(prev => {
                              if (prev.length >= 2) return [prev[1], tagValue];
                              return [...prev, tagValue];
                            });
                          }
                        }}
                      >
                        <Text style={[styles.selectorPillText, { color: theme.textSecondary }, active && styles.activeSelectorPillText]}>
                          {sem} Sem
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Branch */}
            <View style={styles.formInputGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>🏛️ Branch / Department (Max 2)</Text>
              <View style={styles.tagGrid}>
                {branchesList.map(br => {
                  const active = userEditBranches.includes(br);
                  const colors = getBranchColor(br);
                  return (
                    <TouchableOpacity
                      key={br}
                      style={[styles.selectorPill, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }, active && { backgroundColor: colors.bg, borderColor: colors.text }]}
                      onPress={() => {
                        if (active) {
                          setUserEditBranches(prev => prev.filter(v => v !== br));
                        } else {
                          setUserEditBranches(prev => {
                            if (prev.length >= 2) return [prev[1], br];
                            return [...prev, br];
                          });
                        }
                      }}
                    >
                      <Text style={[styles.selectorPillText, { color: active ? colors.text : theme.textSecondary }, active && { fontWeight: '700' }]}>
                        {br}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Material Type */}
            <View style={styles.formInputGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>📁 Material Category Type</Text>
              <View style={styles.tagGrid}>
                {materialTypes.map(type => {
                  const active = userEditType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.selectorPill, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }, active && styles.activeSelectorPill]}
                      onPress={() => setUserEditType(type)}
                    >
                      <Text style={[styles.selectorPillText, { color: theme.textSecondary }, active && styles.activeSelectorPillText]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.submitBtn, { opacity: isSavingUserEdit ? 0.6 : 1, backgroundColor: '#D97706' }]}
              onPress={handleSaveUserEdit}
              disabled={isSavingUserEdit}
              activeOpacity={0.8}
            >
              {isSavingUserEdit ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
              )}
              <Text style={styles.submitBtnText}>
                {isSavingUserEdit ? 'Saving...' : 'Save & Send for Review'}
              </Text>
            </TouchableOpacity>

          </View>
        </DetailModal>
      )}


      {selectedMultiFileItem && (
        <DetailModal
          visible={!!selectedMultiFileItem}
          title={selectedMultiFileItem.title || "Topic Documents"}
          onClose={() => setSelectedMultiFileItem(null)}
        >
          <View style={{ gap: 12 }}>
            {selectedMultiFileItem.description ? (
              <Text style={{ fontSize: 13, fontStyle: 'italic', color: theme.textSecondary, marginBottom: 8 }}>
                "{selectedMultiFileItem.description}"
              </Text>
            ) : null}
            
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
              📚 Associated Documents ({selectedMultiFileItem.files?.length || 0}):
            </Text>

            {selectedMultiFileItem.files?.map((file: any, index: number) => (
              <View 
                key={index} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: 12, 
                  backgroundColor: theme.backgroundElement, 
                  borderColor: theme.cardBorder, 
                  borderWidth: 1, 
                  borderRadius: 10,
                  gap: 12
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10, overflow: 'hidden' }}>
                  <Ionicons name="document-text" size={24} color="#EF4444" style={{ flexShrink: 0 }} />
                  <Text 
                    style={{ fontSize: 13, fontWeight: '600', color: theme.text, flex: 1 }} 
                    numberOfLines={1} 
                    ellipsizeMode="tail"
                  >
                    {file.fileName}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{ 
                    backgroundColor: '#F97316', 
                    paddingHorizontal: 12, 
                    paddingVertical: 6, 
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4
                  }}
                  onPress={() => handleOpenPdf(file.directUrl || file.webViewUrl, file.fileName)}
                >
                  <Ionicons name="eye-outline" size={13} color="#FFF" />
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>Open</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </DetailModal>
      )}
      <FastLoginModal 
        visible={isFastLoginVisible} 
        onClose={() => setIsFastLoginVisible(false)} 
        title="Login Required 🔐" 
        subtitle="Document open karne ke liye pehle Google se login karein." 
      />

      {/* Super Admin Edit/Map Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.editModalContainer, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
            <View style={styles.editModalHeader}>
              <Text style={[styles.editModalTitle, { color: theme.text }]}>🛠️ Edit/Map Material (Super Admin)</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editModalScrollContent}>
              {/* Title Field */}
              <View style={styles.formInputGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>Title *</Text>
                <TextInput
                  style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Material title"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              {/* Description Field */}
              <View style={styles.formInputGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>Description</Text>
                <TextInput
                  style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, height: 60 }]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Material description"
                  placeholderTextColor={theme.textSecondary}
                  multiline={true}
                />
              </View>

              {/* Semester tags selector */}
              <View style={styles.formInputGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>🎓 Semesters (Max 2)</Text>
                <View style={styles.tagGrid}>
                  {semestersList.map(sem => {
                    const tagValue = `${sem} Semester`;
                    const active = editSemesters.includes(tagValue);
                    return (
                      <TouchableOpacity 
                        key={sem} 
                        style={[
                          styles.selectorPill, 
                          { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                          active && styles.activeSelectorPill
                        ]}
                        onPress={() => {
                          if (active) {
                            setEditSemesters(prev => prev.filter(v => v !== tagValue));
                          } else {
                            setEditSemesters(prev => {
                              if (prev.length >= 2) {
                                return [prev[1], tagValue];
                              }
                              return [...prev, tagValue];
                            });
                          }
                        }}
                      >
                        <Text style={[styles.selectorPillText, { color: theme.textSecondary }, active && styles.activeSelectorPillText]}>
                          {sem} Sem
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Department tags selector */}
              <View style={styles.formInputGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>🏛️ Branches/Departments (Max 2)</Text>
                <View style={styles.tagGrid}>
                  {branchesList.map(br => {
                    const active = editBranches.includes(br);
                    const colors = getBranchColor(br);
                    return (
                      <TouchableOpacity 
                        key={br} 
                        style={[
                          styles.selectorPill, 
                          { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                          active && { backgroundColor: colors.bg, borderColor: colors.text, borderWidth: 1.5 }
                        ]}
                        onPress={() => {
                          if (active) {
                            setEditBranches(prev => prev.filter(v => v !== br));
                          } else {
                            setEditBranches(prev => {
                              if (prev.length >= 2) {
                                return [prev[1], br];
                              }
                              return [...prev, br];
                            });
                          }
                        }}
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
                    const active = editType === type;
                    return (
                      <TouchableOpacity 
                        key={type} 
                        style={[
                          styles.typeSelectorRow, 
                          { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                          active && { borderColor: '#F97316', borderWidth: 1.5 }
                        ]}
                        onPress={() => setEditType(type)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons 
                            name={type === 'Syllabus' ? 'book' : type === 'Notes' ? 'document-text' : type === 'PYQ' ? 'time' : 'layers'} 
                            size={16} 
                            color={active ? '#F97316' : theme.textSecondary} 
                            style={{ marginRight: 8 }} 
                          />
                          <Text style={[styles.typeRowText, { color: theme.text }, active && { fontWeight: 'bold' }]}>{type}</Text>
                        </View>
                        {active && <Ionicons name="checkmark-circle" size={18} color="#F97316" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.editModalFooter}>
              <TouchableOpacity 
                style={[styles.cancelEditBtn, { borderColor: theme.cardBorder }]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={[styles.cancelEditBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveEditBtn, { opacity: isSavingEdit ? 0.7 : 1 }]}
                onPress={handleSaveEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveEditBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  adminEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  adminEditBtnText: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  editModalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  editModalTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  editModalScrollContent: {
    padding: 16,
    gap: 16,
  },
  editModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    gap: 12,
  },
  cancelEditBtn: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelEditBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  saveEditBtn: {
    backgroundColor: '#F97316',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  saveEditBtnText: {
    color: '#FFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  // ── GATE inline accordion selector ──────────────────────────────────────────
  gateSelectorCard: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  gateSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  gateSelectorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gateIconDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(219,39,119,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateSelectorLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  gateTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  gateTriggerEmoji: {
    fontSize: 13,
    lineHeight: 17,
  },
  gateTriggerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  gateOptionList: {
    borderTopWidth: 1,
  },
  gateOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  gateOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gateOptionEmoji: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  gateOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  defaultBadge: {
    backgroundColor: 'rgba(219,39,119,0.12)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DB2777',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
});

export default StudyMaterialsModal;
