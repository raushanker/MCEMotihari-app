import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DetailModal } from './DetailModal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StudyMaterialsModalProps {
  visible: boolean;
  onClose: () => void;
}

// Fallback Google Apps Script URL if not set in AsyncStorage
const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbx_placeholder/exec";
const ADMIN_SECRET_KEY = "MCE_CONNECT_ADMIN_2026";
const ADMIN_EMAILS = ["aman.kumar@mce.ac.in", "mceconnect.help@gmail.com"];

export function StudyMaterialsModal({ visible, onClose }: StudyMaterialsModalProps) {
  const theme = useThemeColors();
  const { user } = useAppStore();

  // Navigation state: 'library' | 'upload' | 'admin' | 'admin_auth'
  const [currentView, setCurrentView] = useState<'library' | 'upload' | 'admin' | 'admin_auth'>('library');

  // GAS Web App URL state (loaded dynamically from cache)
  const [gasUrl, setGasUrl] = useState<string>(DEFAULT_GAS_URL);
  const [editingUrl, setEditingUrl] = useState<string>("");

  // Library & Admin items list
  const [approvedMaterials, setApprovedMaterials] = useState<any[]>([]);
  const [pendingMaterials, setPendingMaterials] = useState<any[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState<boolean>(false);
  const [isAdminLoading, setIsAdminLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
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

  // Admin Pin code authorization
  const [adminPin, setAdminPin] = useState<string>("");

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
      const saved = await AsyncStorage.getItem('@mce_custom_gas_url');
      if (saved) {
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

  const saveCustomGasUrl = async (newUrl: string) => {
    try {
      const cleanUrl = newUrl.trim();
      await AsyncStorage.setItem('@mce_custom_gas_url', cleanUrl);
      setGasUrl(cleanUrl);
      Alert.alert("URL Saved", "Google Apps Script backend URL updated successfully!");
    } catch (e) {
      Alert.alert("Error", "Failed to save URL to storage");
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
      Alert.alert(
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
      Alert.alert(
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

  // Fetch approved materials from GAS (Cache-First + Soft TTL + Backoff Retry)
  const fetchApprovedMaterials = async (options?: { force?: boolean; quiet?: boolean; retryCount?: number }) => {
    const force = options?.force || false;
    const quiet = options?.quiet || false;
    const retryCount = options?.retryCount || 0;

    if (isLibraryLoading && !quiet) return;
    if (isRefreshing) return;

    if (force) {
      setIsRefreshing(true);
    } else if (!quiet) {
      setIsLibraryLoading(true);
    }

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

      const response = await fetch(`${gasUrl}?action=get_approved`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        setApprovedMaterials(json.data);
        await AsyncStorage.setItem('@mce_study_materials', JSON.stringify(json.data));
        await AsyncStorage.setItem('@mce_study_materials_sync_time', String(Date.now()));
      } else {
        throw new Error(json.error || "Empty data returned");
      }

      if (__DEV__) {
        const duration = Date.now() - startTime;
        console.log(`[Perf Logger] Study materials sync completed in ${duration}ms!`);
      }
    } catch (error) {
      console.warn("Failed to fetch approved materials:", error);
      
      // Client-Side Exponential Backoff Retry Strategy (max 2 retries) to safeguard GAS concurrent quotas
      if (retryCount < 2 && !quiet) {
        const nextDelay = Math.pow(2, retryCount + 1) * 1000; // 2s, 4s delay
        if (__DEV__) {
          console.log(`[Perf Logger] Retrying approved study materials fetch in ${nextDelay}ms (Attempt ${retryCount + 1})...`);
        }
        setTimeout(() => {
          fetchApprovedMaterials({ force, quiet, retryCount: retryCount + 1 });
        }, nextDelay);
      }
    } finally {
      setIsLibraryLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch pending materials (Admin only)
  const fetchPendingMaterials = async () => {
    setIsAdminLoading(true);
    try {
      const response = await fetch(`${gasUrl}?action=get_pending&secret=${ADMIN_SECRET_KEY}`);
      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        setPendingMaterials(json.data);
      } else {
        setPendingMaterials([]);
      }
    } catch (error) {
      Alert.alert("Admin API Error", "Google Apps Script connection error or invalid secret.");
      setPendingMaterials([]);
    } finally {
      setIsAdminLoading(false);
    }
  };

  // Pick PDF file
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // 1. File Type validation
        if (file.mimeType !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
          Alert.alert("Invalid Format", "Kripya keval PDF file hi upload karein!");
          return;
        }

        // 2. File Size validation (25MB limit)
        const sizeInMb = file.size ? file.size / (1024 * 1024) : 0;
        if (sizeInMb > 25) {
          Alert.alert("File Too Large", "File size 25 MB se kam honi chahiye!");
          return;
        }

        // 3. Duplicate check in already approved files
        const isDuplicate = approvedMaterials.some(
          mat => mat.fileName.toLowerCase() === file.name.toLowerCase()
        );
        if (isDuplicate) {
          Alert.alert("Duplicate File", `Ek study material "${file.name}" ke naam se college library me pehle se hi approved hai! Kripya iska naam badal kar upload karein.`);
          return;
        }

        setPickedFile(file);
      }
    } catch (err) {
      console.warn("Document picking failed:", err);
      Alert.alert("Error", "File choose karne me error aaya.");
    }
  };

  // Base64 helper supporting both native and web
  const convertFileToBase64 = async (uri: string): Promise<string> => {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
  };

  // Upload Material Submit
  const handleUploadSubmit = async () => {
    if (!uploaderName.trim()) {
      Alert.alert("Name Required", "Kripya apna naam darj karein!");
      return;
    }
    if (!selectedSemester) {
      Alert.alert("Semester Required", "Kripya semester choose karein!");
      return;
    }
    if (!selectedBranch) {
      Alert.alert("Branch Required", "Kripya branch/department choose karein!");
      return;
    }
    if (!selectedType) {
      Alert.alert("Type Required", "Kripya upload material ka type choose karein!");
      return;
    }
    if (!pickedFile) {
      Alert.alert("File Required", "Kripya study material PDF select karein!");
      return;
    }
    if (!consentChecked) {
      Alert.alert("Consent Required", "Kripya authorization checkbox ko tick karein!");
      return;
    }

    setIsUploading(true);
    try {
      const base64Content = await convertFileToBase64(pickedFile.uri);
      
      const payload = {
        action: "upload",
        uploaderName: uploaderName.trim(),
        uploaderEmail: user?.email || "",
        semester: selectedSemester,
        branch: selectedBranch,
        materialType: selectedType,
        description: description.trim(),
        fileName: pickedFile.name,
        fileData: base64Content
      };

      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await response.json();
      
      if (json.success) {
        Alert.alert(
          "Upload Successful! 🎉", 
          "Aapki PDF material review ke liye submit ho gayi hai. Admin approval ke baad ye library me live show hogi!",
          [{ text: "OK", onPress: () => { resetForm(); setCurrentView('library'); fetchApprovedMaterials(); } }]
        );
      } else {
        Alert.alert("Upload Failed", json.error || "Server responded with error.");
      }
    } catch (error: any) {
      Alert.alert("Network Error", "Google Apps Script backend se connect nahi kiya ja saka. Kripya apna internet connection check karein.");
      console.warn("Upload payload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Admin Actions: Approve
  const handleAdminApprove = async (id: string) => {
    setIsAdminLoading(true);
    try {
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "approve",
          secret: ADMIN_SECRET_KEY,
          id: id
        })
      });
      const json = await response.json();
      if (json.success) {
        Alert.alert("Approved ✅", "Study material ko library me live kar diya gaya hai!");
        fetchPendingMaterials();
        fetchApprovedMaterials();
      } else {
        Alert.alert("Error", json.error || "Approval failed.");
      }
    } catch (e) {
      Alert.alert("Error", "Backend connectivity failed during approval.");
    } finally {
      setIsAdminLoading(false);
    }
  };

  // Admin Actions: Reject
  const handleAdminReject = async (id: string) => {
    Alert.alert(
      "Reject Material?",
      "Kya aap sach me is material ko reject aur permanently delete karna chahte hain?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reject & Delete", 
          style: "destructive", 
          onPress: async () => {
            setIsAdminLoading(true);
            try {
              const response = await fetch(gasUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: "reject",
                  secret: ADMIN_SECRET_KEY,
                  id: id
                })
              });
              const json = await response.json();
              if (json.success) {
                Alert.alert("Rejected ❌", "Material delete kar diya gaya hai.");
                fetchPendingMaterials();
              } else {
                Alert.alert("Error", json.error || "Rejection failed.");
              }
            } catch (e) {
              Alert.alert("Error", "Backend connectivity failed during rejection.");
            } finally {
              setIsAdminLoading(false);
            }
          }
        }
      ]
    );
  };

  // Open Admin View with Auth checks
  const handleOpenAdminView = () => {
    if (user?.email && ADMIN_EMAILS.includes(user.email)) {
      setCurrentView('admin');
      fetchPendingMaterials();
    } else {
      setCurrentView('admin_auth');
    }
  };

  // Verify manual secret code
  const handleAdminAuthSubmit = () => {
    if (adminPin === ADMIN_SECRET_KEY) {
      setAdminPin("");
      setCurrentView('admin');
      fetchPendingMaterials();
    } else {
      Alert.alert("Access Denied", "Incorrect Admin Security Key pin code.");
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  // Filter approved materials helper
  const getFilteredMaterials = () => {
    return approvedMaterials.filter(mat => {
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
      return matchSem && matchBranch && matchType;
    });
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
  const handleOpenPdf = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Browser me open nahi kiya ja saka. Kripya PDF links check karein.");
    });
  };

  // Show Terms and Conditions
  const showTermsAndConditions = () => {
    Alert.alert(
      "MCE Study Drive Guidelines",
      "1. Upload study material standard quality ka hona chahiye.\n2. Koi bhi copyrighted textbook, commercial test papers, ya paid reference books bina unke author ke clear authorization ke upload na karein.\n3. PDF me koi personal sensitive details, contact cards, ya unauthorized watermark nahi hona chahiye.\n4. App moderation queue me har study materials review aur filter kiye jate hain.",
      [{ text: "I Agree", style: "default" }]
    );
  };

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
                  <Text style={[styles.sectionTitleHeader, { color: theme.text }]}>Study Materials Drive</Text>
                  <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>Select department to access notes, pyqs & textbooks</Text>
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
                  style={[styles.bentoCard, { width: '48.5%', backgroundColor: theme.isDark ? 'rgba(124, 58, 237, 0.08)' : '#F5F3FF', borderColor: theme.isDark ? 'rgba(124, 58, 237, 0.25)' : '#E9D5FF' }]}
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
                  style={[styles.bentoCard, { width: '48.5%', backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.08)' : '#ECFDF5', borderColor: theme.isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0' }]}
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
                  style={[styles.bentoCard, { width: '48.5%', backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2', borderColor: theme.isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA' }]}
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
                  style={[styles.bentoCard, { width: '48.5%', backgroundColor: theme.isDark ? 'rgba(244, 63, 94, 0.08)' : '#FFF1F2', borderColor: theme.isDark ? 'rgba(244, 63, 94, 0.25)' : '#FECDD3' }]}
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
                  style={[styles.bentoCard, { width: '48.5%', backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB', borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.25)' : '#FEF3C7' }]}
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
                  style={[styles.bentoCard, { width: '48.5%', backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF', borderColor: theme.isDark ? 'rgba(59, 130, 246, 0.25)' : '#BFDBFE' }]}
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
                  <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Synchronizing Study Drive...</Text>
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
                        style={[styles.materialCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
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
                          onPress={() => handleOpenPdf(item.webViewUrl)}
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
              <View style={[styles.selectedFileBox, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                <Ionicons name="document-text" size={32} color="#EF4444" />
                <View style={styles.fileBoxMeta}>
                  <Text style={[styles.fileNameText, { color: theme.text }]} numberOfLines={1}>{pickedFile.name}</Text>
                  <Text style={[styles.fileSizeText, { color: theme.textSecondary }]}>
                    {(pickedFile.size / (1024 * 1024)).toFixed(2)} MB • PDF Document
                  </Text>
                </View>
                <TouchableOpacity style={styles.removeFileBtn} onPress={() => setPickedFile(null)}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
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
            <Text style={styles.termsLinkText}>Read Drive Terms & Upload Policies</Text>
          </TouchableOpacity>

          {/* Submit Action Button */}
          {isUploading ? (
            <View style={styles.formSubmitLoader}>
              <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Uploading & Transmitting File base64...</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleUploadSubmit}
              activeOpacity={0.8}
            >
              <Ionicons name="cloud-upload" size={18} color="#FFF" />
              <Text style={styles.submitBtnText}>Submit to moderation approval</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ========================================================================= */}
      {/* 3. ADMIN SECURITY / AUTH VIEW */}
      {/* ========================================================================= */}
      {currentView === 'admin_auth' && (
        <View style={styles.adminAuthContainer}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentView('library')}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
            <Text style={[styles.backBtnText, { color: theme.text }]}>Library</Text>
          </TouchableOpacity>

          <View style={styles.lockBox}>
            <Ionicons name="lock-closed" size={48} color="#F97316" style={{ marginBottom: 12 }} />
            <Text style={[styles.lockTitle, { color: theme.text }]}>Admin Security Verification</Text>
            <Text style={[styles.lockDesc, { color: theme.textSecondary }]}>
              Aapka email whitelisted nahi hai. Kripya access unlock karne ke liye custom pin key code enter karein.
            </Text>
            
            <TextInput 
              style={[styles.pinInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
              value={adminPin}
              onChangeText={setAdminPin}
              secureTextEntry
              placeholder="Enter Admin Pin Key"
              placeholderTextColor={theme.textSecondary}
            />

            <TouchableOpacity style={styles.authSubmitBtn} onPress={handleAdminAuthSubmit}>
              <Text style={styles.authSubmitBtnText}>Unlock Admin Mode</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 4. ADMIN MODERATION CONTROL BOARD */}
      {/* ========================================================================= */}
      {currentView === 'admin' && (
        <View style={styles.adminPanelContainer}>
          {/* Header Row */}
          <View style={styles.formHeaderRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentView('library')}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
              <Text style={[styles.backBtnText, { color: theme.text }]}>Library</Text>
            </TouchableOpacity>
            <Text style={[styles.formHeaderTitle, { color: theme.text }]}>Admin Control Board</Text>
          </View>

          {/* Endpoint Customization Option */}
          <View style={[styles.gasUrlConfigCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <Text style={[styles.configHeader, { color: theme.text }]}>🌐 Config WebApp GAS Backend URL</Text>
            <Text style={styles.configDesc}>Google Drive script web-app URL customize karein:</Text>
            <TextInput 
              style={[styles.configInput, { color: theme.text, borderColor: theme.cardBorder }]}
              value={editingUrl}
              onChangeText={setEditingUrl}
              placeholder="Paste Google Apps Script Web App URL here"
              placeholderTextColor={theme.textSecondary}
            />
            <TouchableOpacity 
              style={styles.configSaveBtn} 
              onPress={() => saveCustomGasUrl(editingUrl)}
            >
              <Text style={styles.configSaveText}>Update API Endpoint URL</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.adminQueueTitle, { color: theme.text }]}>
            ⏳ Pending Moderation Queue ({pendingMaterials.length} Items)
          </Text>

          {/* Pending Queue List */}
          {isAdminLoading ? (
            <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 24 }} />
          ) : pendingMaterials.length === 0 ? (
            <View style={styles.adminEmptyState}>
              <Ionicons name="checkmark-done-circle" size={48} color="#10B981" style={{ marginBottom: 8 }} />
              <Text style={[styles.adminEmptyText, { color: theme.text }]}>Moderation Queue is Clean!</Text>
              <Text style={[styles.adminEmptySubText, { color: theme.textSecondary }]}>
                Filhaal koi bhi study material approval ke liye pending nahi hai.
              </Text>
              
              <TouchableOpacity 
                style={styles.refreshQueueBtn}
                onPress={fetchPendingMaterials}
              >
                <Ionicons name="reload" size={14} color="#FFF" />
                <Text style={styles.refreshQueueText}>Refresh Queue</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.adminQueueList}>
              {pendingMaterials.map(item => {
                const colors = getBranchColor(item.branch);
                return (
                  <View 
                    key={item.id} 
                    style={[styles.adminMatCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                  >
                    <View style={styles.adminMetaCol}>
                      <Text style={[styles.adminTitleText, { color: theme.text }]}>{item.fileName}</Text>
                      
                      <View style={styles.adminTagsRow}>
                        <View style={[styles.itemBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                          <Text style={[styles.itemBadgeText, { color: colors.text }]}>{item.branch}</Text>
                        </View>
                        <View style={[styles.itemBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                          <Text style={[styles.itemBadgeText, { color: theme.textSecondary }]}>{item.semester}</Text>
                        </View>
                        <View style={[styles.itemBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                          <Text style={[styles.itemBadgeText, { color: '#2563EB' }]}>{item.materialType}</Text>
                        </View>
                      </View>

                      {item.description ? (
                        <Text style={[styles.adminDescText, { color: theme.textSecondary }]}>
                          Comment: "{item.description}"
                        </Text>
                      ) : null}

                      <Text style={[styles.adminUploaderText, { color: theme.textSecondary }]}>
                        👤 Submitted by: <Text style={{ fontWeight: 'bold' }}>{item.uploaderName}</Text> ({item.uploaderEmail || "anonymous"})
                      </Text>
                    </View>

                    {/* Admin Action Rows */}
                    <View style={styles.adminActionContainer}>
                      {/* Preview Button */}
                      <TouchableOpacity 
                        style={styles.adminPreviewBtn}
                        onPress={() => handleOpenPdf(item.webViewUrl)}
                      >
                        <Ionicons name="eye" size={14} color="#475569" />
                        <Text style={styles.adminPreviewText}>Preview</Text>
                      </TouchableOpacity>

                      <View style={styles.approveRejectActionBox}>
                        {/* Approve */}
                        <TouchableOpacity 
                          style={styles.approveActionBtn}
                          onPress={() => handleAdminApprove(item.id)}
                        >
                          <Ionicons name="checkmark" size={14} color="#FFF" />
                          <Text style={styles.approveActionText}>Approve</Text>
                        </TouchableOpacity>

                        {/* Reject */}
                        <TouchableOpacity 
                          style={styles.rejectActionBtn}
                          onPress={() => handleAdminReject(item.id)}
                        >
                          <Ionicons name="trash" size={14} color="#FFF" />
                          <Text style={styles.rejectActionText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

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
    gap: 12,
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
});

export default StudyMaterialsModal;
