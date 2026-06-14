import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Dimensions, ActivityIndicator, KeyboardAvoidingView, Platform, Share, Alert, Linking, FlatList, RefreshControl, Animated } from 'react-native';
import { feedScrollY } from '@/utils/scrollState';
import { useFocusEffect } from 'expo-router';
import { useSafeTimeouts } from '@/hooks/useSafeTimeouts';
import { Image } from 'expo-image';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useAuth, Experience } from '@/hooks/useAuth';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useThemeColors } from '@/hooks/useThemeColors';
import { validatePassword } from '@/utils/passwordValidator';
import { PasswordHelperText } from '@/components/ui/PasswordHelperText';
import { validateDisplayName, cleanDisplayName } from '@/utils/nameValidator';
import { getFormattedPostTime } from '@/utils/timeFormat';

// Modals for Explore Hub Modular Actions
import { AboutModal } from '@/components/modals/AboutModal';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { CampusMapModal } from '@/components/modals/CampusMapModal';
import { EventsModal } from '@/components/modals/EventsModal';
import { HolidaysModal } from '@/components/modals/HolidaysModal';
import { NotepadModal } from '@/components/modals/NotepadModal';
import { PrivacyModal } from '@/components/modals/PrivacyModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { StudyMaterialsModal } from '@/components/modals/StudyMaterialsModal';
import { CreatePostModal } from '@/components/modals/CreatePostModal';

import * as ImagePicker from 'expo-image-picker';
import { launchMediaPicker } from '@/utils/mediaPicker';
import { uploadToCloudinary, getOptimizedImageUrl } from '@/utils/cloudinary';
import { getReadableErrorMessage } from '@/utils/errors/errorManager';
import { invalidateProfileCache } from '@/utils/profileCache';
import { sanitizeFirestoreData } from '@/utils/firestoreUtils';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

const { width, height } = Dimensions.get('window');

const DEPARTMENTS = [
  'CIVIL',
  'CIVIL CA',
  'CSE',
  'CSE AI',
  'MECH',
  'EE',
  'Humanities and Science'
];

const AVATAR_PRESETS = [
  {
    label: 'Campus Classic',
    hint: 'Academic look',
    icon: 'school-outline',
    url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Oliver&backgroundColor=b6e3f4',
  },
  {
    label: 'Campus Tech',
    hint: 'Modern look',
    icon: 'school-outline',
    url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Jude&backgroundColor=ffd5dc',
  },
  {
    label: 'Alumni Leader',
    hint: 'Professional',
    icon: 'briefcase-outline',
    url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Harry&backgroundColor=d1d4f9',
  },
  {
    label: 'Alumni Elite',
    hint: 'Professional',
    icon: 'briefcase-outline',
    url: 'https://api.dicebear.com/7.x/avataaars/png?seed=Sophia&backgroundColor=ffdfbf',
  },
  {
    label: 'CSE Builder',
    hint: 'CSE / builder',
    icon: 'code-slash-outline',
    url: 'https://api.dicebear.com/7.x/bottts/png?seed=MCE-Coder&backgroundColor=dbeafe',
  },
  {
    label: 'MCE Orange',
    hint: 'Core branch',
    icon: 'construct-outline',
    url: 'https://api.dicebear.com/7.x/notionists/png?seed=Bacon&backgroundColor=ffe8cc',
  },
];

const EXPLORE_CARDS = [
  {
    id: 'syllabus',
    title: 'Syllabus',
    sub: 'BEU coursework',
    icon: 'book',
    iconColor: '#8B5CF6',
    bg: '#F5F3FF',
    action: 'route',
    path: '/explore?view=syllabus'
  },
  {
    id: 'hostels',
    title: 'Hostels',
    sub: 'Campus living',
    icon: 'bed',
    iconColor: '#10B981',
    bg: '#ECFDF5',
    action: 'route',
    path: '/explore?view=hostels'
  },
  {
    id: 'departments',
    title: 'Departments',
    sub: 'Academic wings',
    icon: 'school',
    iconColor: '#2563EB',
    bg: '#EFF6FF',
    action: 'route',
    path: '/explore?view=departments'
  },
  {
    id: 'faculty',
    title: 'Faculty',
    sub: 'Teacher directories',
    icon: 'people',
    iconColor: '#F97316',
    bg: '#FFF7ED',
    action: 'route',
    path: '/explore?view=faculty'
  },
  {
    id: 'holidays',
    title: 'Holidays',
    sub: 'Academic calendar',
    icon: 'calendar',
    iconColor: '#F43F5E',
    bg: '#FFF1F2',
    action: 'modal',
    modalId: 'holidays'
  },
  {
    id: 'notepad',
    title: 'Notepad',
    sub: 'Local saved notes',
    icon: 'document-text',
    iconColor: '#D97706',
    bg: '#FEF3C7',
    action: 'modal',
    modalId: 'notepad'
  }
];

const UTILITY_CARDS = [
  {
    id: 'map',
    title: 'Interactive Campus Map',
    sub: 'Map rooms, laboratories, and green spots',
    icon: 'map',
    iconColor: '#475569',
    bg: '#F1F5F9',
    action: 'modal',
    modalId: 'map'
  },
  {
    id: 'events',
    title: 'Events & College Fests',
    sub: 'Technical quests and athletic schedules',
    icon: 'trophy',
    iconColor: '#EA580C',
    bg: '#FFF7ED',
    action: 'modal',
    modalId: 'events'
  },
  {
    id: 'gallery',
    title: 'Study Materials & Gallery',
    sub: 'Verified textbooks and fests image grid',
    icon: 'images',
    iconColor: '#06B6D4',
    bg: '#ECFEFF',
    action: 'modal',
    modalId: 'gallery'
  },
  {
    id: 'about',
    title: 'About MCE Motihari',
    sub: 'Accreditations, history, and official vision',
    icon: 'information-circle',
    iconColor: '#4F46E5',
    bg: '#EEF2FF',
    action: 'modal',
    modalId: 'about'
  },
  {
    id: 'privacy',
    title: 'Privacy & Platform Policies',
    sub: 'Terms of usage, anonymous posting guidelines',
    icon: 'shield',
    iconColor: '#64748B',
    bg: '#F8FAFC',
    action: 'modal',
    modalId: 'privacy'
  }
];



const ExploreProfileScreen = React.memo(function ExploreProfileScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { setSafeTimeout } = useSafeTimeouts();
  const { user, isLoading: isAuthLoading, updateAcademicProfile, updateUsername, updatePrivacySettings, configurePassword, logout, loginWithGoogle, loginWithEmail } = useAuth();
  const posts = useAppStore(state => state.posts);
  const isStoreHydrated = useAppStore(state => state.isStoreHydrated);
  const { connections, setUser, isCreatePostVisible, setCreatePostVisible, createPostPreset } = useAppStore(useShallow(state => ({
    connections: state.connections,
    setUser: state.setUser,
    isCreatePostVisible: state.isCreatePostVisible,
    setCreatePostVisible: state.setCreatePostVisible,
    createPostPreset: state.createPostPreset
  })));

  const myPosts = useMemo(() => {
    if (!user) return [];
    return posts.filter(p => {
      const matchesUid = p.authorUid && p.authorUid === user.uid;
      const matchesRealName = p.authorRealName && user.name && p.authorRealName === user.name;
      const matchesAuthorName = !p.isAnonymous && p.authorName && user.name && p.authorName === user.name;
      return !!(matchesUid || matchesRealName || matchesAuthorName);
    });
  }, [posts, user?.name, user?.uid]);

  const [profileRefreshing, setProfileRefreshing] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      lastScrollY.current = value;
      feedScrollY.setValue(value);
    });
    return () => {
      scrollY.removeListener(listenerId);
    };
  }, [scrollY]);

  useFocusEffect(
    useCallback(() => {
      feedScrollY.setValue(lastScrollY.current);
      return () => {};
    }, [])
  );

  const handleProfileRefresh = async () => {
    if (!user || profileRefreshing) return;
    setProfileRefreshing(true);
    try {
      const { doc, getDoc } = require('firebase/firestore');
      const { db } = require('../config/firebase');
      
      const [publicDoc, privateDoc] = await Promise.all([
        getDoc(doc(db, 'publicProfiles', user.uid)),
        getDoc(doc(db, 'privateUsers', user.uid))
      ]);

      if (publicDoc.exists() || privateDoc.exists()) {
        const mergedData = { ...(publicDoc.data() || {}), ...(privateDoc.data() || {}) };
        setUser(mergedData);
      }

      await useAppStore.getState().fetchPosts({ refresh: true });

      if (__DEV__) {
        console.log('[Perf Logger] Profile & Feed refresh complete!');
      }
    } catch (err) {
      console.warn('Failed to refresh profile or feed:', err);
    } finally {
      setProfileRefreshing(false);
    }
  };

  // Inline Login States & Handlers (Replaces old auto-redirect useEffect hooks to prevent Web blank spinner loop)
  const [isProfileLoggingIn, setIsProfileLoggingIn] = React.useState(false);
  const [isProfileTraditionalLoggingIn, setIsProfileTraditionalLoggingIn] = React.useState(false);
  const [isProfilePasswordVisible, setIsProfilePasswordVisible] = React.useState(false);
  const [profileEmail, setProfileEmail] = React.useState('');
  const [profilePassword, setProfilePassword] = React.useState('');

  const handleProfileGoogleSignIn = async () => {
    setIsProfileLoggingIn(true);
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        if (result.isNewUser) {
          router.replace('/login');
        } else {
          showPremiumAlert('Welcome Back! 🎉', 'Apka session successfully restore ho chuka hai.', 'success');
        }
      }
    } catch (err: any) {
      showPremiumAlert('Google Login Error', err?.message || 'Authentication error.', 'error');
    } finally {
      setIsProfileLoggingIn(false);
    }
  };

  const handleProfileTraditionalLoginSubmit = async () => {
    const cleanId = profileEmail.trim();
    const cleanPass = profilePassword;

    if (!cleanId) {
      showPremiumAlert('Required Field', 'Kripya apna email ya mobile number darj karein.', 'warning');
      return;
    }
    if (!cleanPass) {
      showPremiumAlert('Required Field', 'Kripya apna password darj karein.', 'warning');
      return;
    }

    setIsProfileTraditionalLoggingIn(true);
    try {
      const result = await loginWithEmail(cleanId, cleanPass);
      if (result.success) {
        showPremiumAlert('Welcome Back! 🎉', 'MCE Connect dashboard me aapka swagat hai.', 'success');
      } else {
        showPremiumAlert('Sign In Failed', result.error || 'Invalid credentials.', 'error');
      }
    } catch (err: any) {
      showPremiumAlert('Sign In Failed', err?.message || 'Login request error.', 'error');
    } finally {
      setIsProfileTraditionalLoggingIn(false);
    }
  };

  const profileStats = useMemo(() => {
    let totalHearts = 0;
    let contributions = myPosts.length;
    for (const p of myPosts) {
      totalHearts += (p.claps || 0);
      if (p.category !== 'General') contributions += 1;
      if (p.linkUrl || p.imageUrl) contributions += 1;
    }
    return { totalHearts, totalPosts: myPosts.length, contributions };
  }, [myPosts]);

  const [searchQuery, setSearchQuery] = useState('');

  // Performant Search filtering for Explore Hub Cards
  const filteredExploreCards = useMemo(() => {
    if (!searchQuery.trim()) return EXPLORE_CARDS;
    const q = searchQuery.toLowerCase().trim();
    return EXPLORE_CARDS.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.sub.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredUtilityCards = useMemo(() => {
    if (!searchQuery.trim()) return UTILITY_CARDS;
    const q = searchQuery.toLowerCase().trim();
    return UTILITY_CARDS.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.sub.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Profile modal visibility states
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const isUsernameLocked = React.useMemo(() => {
    if (!user?.usernameLastChangedAt) return false;
    const lastChanged = new Date(user.usernameLastChangedAt).getTime();
    const sixMonthsInMs = 180 * 24 * 60 * 60 * 1000;
    return (Date.now() - lastChanged) < sixMonthsInMs;
  }, [user?.usernameLastChangedAt]);

  const usernameLockRemainingText = React.useMemo(() => {
    if (!user?.usernameLastChangedAt) return '';
    const lastChanged = new Date(user.usernameLastChangedAt).getTime();
    const sixMonthsInMs = 180 * 24 * 60 * 60 * 1000;
    const timeDiff = Date.now() - lastChanged;
    if (timeDiff >= sixMonthsInMs) return '';
    
    const remainingDays = Math.ceil((sixMonthsInMs - timeDiff) / (24 * 60 * 60 * 1000));
    const nextAvailableDate = new Date(lastChanged + sixMonthsInMs);
    return `Locked: Next change in ${remainingDays} days (${nextAvailableDate.toLocaleDateString()})`;
  }, [user?.usernameLastChangedAt]);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [customAlert, setCustomAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showPremiumAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setCustomAlert({ visible: true, title, message, type });
  };

  // Explore Hub modal visibility states
  const [isAboutVisible, setIsAboutVisible] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [isHolidaysVisible, setIsHolidaysVisible] = useState(false);
  const [isEventsListVisible, setIsEventsListVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isPrivacyVisible, setIsPrivacyVisible] = useState(false);
  const [isNotepadVisible, setIsNotepadVisible] = useState(false);
  const [isAllPostsModalVisible, setIsAllPostsModalVisible] = useState(false);
  const [isMoreAddModalVisible, setIsMoreAddModalVisible] = useState(false);

  // Edit Profile Form State
  const [editRole, setEditRole] = useState<'Student' | 'Alumni' | 'Faculty' | 'Other'>('Student');
  const [editName, setEditName] = useState('');
  const [editNameError, setEditNameError] = useState<string | null>(null);
  const [editRollNo, setEditRollNo] = useState('');
  const [editRegNo, setEditRegNo] = useState('');
  const [editDept, setEditDept] = useState(DEPARTMENTS[0]);
  const [editBatch, setEditBatch] = useState('');
  const [editUsername, setEditUsername] = useState('');
  
  // Privacy Controls State
  const [editIsBatchPrivate, setEditIsBatchPrivate] = useState(false);
  const [editIsDeptPrivate, setEditIsDeptPrivate] = useState(false);
  
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [isAllExperiencesVisible, setIsAllExperiencesVisible] = useState(false);

  // Profile Picture State
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [isCustomPhotoUrlVisible, setIsCustomPhotoUrlVisible] = useState(false);

   // Password Form State
  const [phone, setPhone] = useState('');
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const configScrollViewRef = useRef<ScrollView>(null);
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const maskPhoneNumber = (num: string): string => {
    if (!num) return '';
    const clean = num.replace(/\D/g, '');
    if (clean.length < 10) return num;
    return `${clean.slice(0, 3)}****${clean.slice(7)}`;
  };

  // Bento-style visual states
  const [isVibeModalVisible, setIsVibeModalVisible] = useState(false);
  const [isSkillsModalVisible, setIsSkillsModalVisible] = useState(false);
  const [isLinksModalVisible, setIsLinksModalVisible] = useState(false);
  const [expandedLinkSection, setExpandedLinkSection] = useState<'social'|'custom'>('social');

  // Roll and Registration number visibility states
  const [isRollVisible, setIsRollVisible] = useState(false);
  const [isRegVisible, setIsRegVisible] = useState(false);



  const [editVibe, setEditVibe] = useState('');
  const [isInlineEditingBio, setIsInlineEditingBio] = useState(false);
  const [inlineBioText, setInlineBioText] = useState(user?.vibeStatus || '');
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editGithub, setEditGithub] = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editGooglescholar, setEditGooglescholar] = useState('');
  const [editYoutube, setEditYoutube] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editPortfolio, setEditPortfolio] = useState('');
  const [editFacebook, setEditFacebook] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  
  // Custom links state (CRUD in UI)
  const [editCustomLinks, setEditCustomLinks] = useState<Array<{ title: string, url: string }>>([]);
  const [newCustomLinkTitle, setNewCustomLinkTitle] = useState('');
  const [newCustomLinkUrl, setNewCustomLinkUrl] = useState('');
  
  // Custom Tag Input inside Skills Modal
  const [newCustomSkill, setNewCustomSkill] = useState('');

  // Professional Experience States
  const [isAddExpVisible, setIsAddExpVisible] = useState(false);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [editingEduId, setEditingEduId] = useState<string | null>(null);
  const [editingPubId, setEditingPubId] = useState<string | null>(null);
  const [expRole, setExpRole] = useState('');
  const [expCompany, setExpCompany] = useState('');
  const [expEmpType, setExpEmpType] = useState<'Full-time' | 'Part-time' | 'Internship'>('Full-time');
  const [expStartMonth, setExpStartMonth] = useState('Jan');
  const [expStartYear, setExpStartYear] = useState('');
  const [expEndMonth, setExpEndMonth] = useState('Jan');
  const [expEndYear, setExpEndYear] = useState('');
  const [expIsCurrent, setExpIsCurrent] = useState(false);
  const [expDesc, setExpDesc] = useState('');

  // Education States
  const [isAddEduVisible, setIsAddEduVisible] = useState(false);
  const [eduSchool, setEduSchool] = useState('');
  const [eduDegree, setEduDegree] = useState('');
  const [eduFieldOfStudy, setEduFieldOfStudy] = useState('');
  const [eduStartYear, setEduStartYear] = useState('');
  const [eduEndYear, setEduEndYear] = useState('');
  const [eduIsCurrent, setEduIsCurrent] = useState(false);
  const [eduDesc, setEduDesc] = useState('');

  // Publication States
  const [isAddPubVisible, setIsAddPubVisible] = useState(false);
  const [pubTitle, setPubTitle] = useState('');
  const [pubPublisher, setPubPublisher] = useState('');
  const [pubDate, setPubDate] = useState('');
  const [pubUrl, setPubUrl] = useState('');
  const [pubAuthors, setPubAuthors] = useState('');
  const [pubDesc, setPubDesc] = useState('');

  // Sync state values on mount or user updates
  React.useEffect(() => {
    if (user) {
      setEditVibe(user.vibeStatus || '');
      setInlineBioText(user.vibeStatus || '');
      setEditSkills(user.skills || []);
      setEditGithub(user.links?.github || '');
      setEditLinkedin(user.links?.linkedin || '');
      setEditInstagram(user.links?.instagram || '');
      setEditGooglescholar(user.links?.googlescholar || '');
      setEditYoutube(user.links?.youtube || '');
      setEditWebsite(user.links?.website || '');
      setEditPortfolio(user.links?.portfolio || '');
      setEditFacebook(user.links?.facebook || '');
      setEditTwitter(user.links?.twitter || '');
      setEditCustomLinks(user.customLinks || []);
    }
  }, [user]);

  // Masquerade the URL on Web so it displays /@username instead of /profile
  React.useEffect(() => {
    if (Platform.OS === 'web' && user?.username) {
      window.history.replaceState(null, '', `/@${user.username}`);
    }
  }, [user?.username]);

  // Real-time username availability checker with 450ms debounce
  React.useEffect(() => {
    if (!isPasswordModalVisible) {
      return;
    }

    const cleanUser = editUsername.trim().toLowerCase();

    // If it is empty
    if (!cleanUser) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    // If it is the current user's username
    if (cleanUser === (user?.username || '').toLowerCase()) {
      setUsernameStatus('available');
      setUsernameMessage('Aapka current username hai.');
      return;
    }

    // Validate format first
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUser)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Username me sirf chote letters, numbers aur underscores ho sakte hain (3-20 characters)!');
      return;
    }
    if (!/[a-z]/.test(cleanUser)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Username me kam se kam ek letter (a-z) hona zaroori hai!');
      return;
    }
    const digitCount = (cleanUser.match(/[0-9]/g) || []).length;
    if (digitCount < 2) {
      setUsernameStatus('invalid');
      setUsernameMessage('Username me kam se kam 2 numbers (digits) hona zaroori hai!');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    const delayDebounceFn = setTimeout(async () => {
      try {
        const { doc, getDoc } = require('firebase/firestore');
        const { db } = require('../config/firebase');
        
        const usernameDocRef = doc(db, 'usernames', cleanUser);
        const usernameDocSnap = await getDoc(usernameDocRef);

        if (usernameDocSnap.exists()) {
          const claimedUid = usernameDocSnap.data().uid;
          if (claimedUid !== user?.uid) {
            setUsernameStatus('taken');
            setUsernameMessage('❌ Ye username pehle se kisi aur ne le rakha hai!');
          } else {
            setUsernameStatus('available');
            setUsernameMessage('🎉 Username is available!');
          }
        } else {
          setUsernameStatus('available');
          setUsernameMessage('🎉 Username is available!');
        }
      } catch (error) {
        console.error('Error checking username availability:', error);
        setUsernameStatus('idle');
        setUsernameMessage('Error checking availability. Kripya connection check karein.');
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [editUsername, isPasswordModalVisible, user?.username]);

  // Unsaved changes checkers
  const isCredentialsDirty = () => {
    if (!user) return false;
    return (
      editRole !== user.role ||
      editRollNo !== (user.rollNo || '') ||
      editRegNo !== (user.regNo || '') ||
      editDept !== (user.department || DEPARTMENTS[0]) ||
      editBatch !== (user.batch || '')
    );
  };

  const isPasswordDirty = () => {
    if (!user) return false;
    return phone !== (user.phone || '') || password !== '' || editUsername !== (user.username || '') || editName !== (user.name || '');
  };

  const isPhotoDirty = () => {
    if (!user) return false;
    const originalPhoto = user.photoUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix';
    return selectedPhoto !== originalPhoto || customPhotoUrl !== '';
  };

  const isVibeDirty = () => {
    if (!user) return false;
    return editVibe !== (user.vibeStatus || 'Coding my way through engineering 💻');
  };

  const isSkillsDirty = () => {
    if (!user) return false;
    const originalSkills = user.skills || [];
    if (editSkills.length !== originalSkills.length) return true;
    for (let i = 0; i < editSkills.length; i++) {
      if (editSkills[i] !== originalSkills[i]) return true;
    }
    return newCustomSkill !== '';
  };

  const isLinksDirty = () => {
    if (!user) return false;
    return (
      editGithub !== (user.links?.github || '') ||
      editLinkedin !== (user.links?.linkedin || '') ||
      editInstagram !== (user.links?.instagram || '') ||
      editGooglescholar !== (user.links?.googlescholar || '') ||
      editYoutube !== (user.links?.youtube || '') ||
      editWebsite !== (user.links?.website || '') ||
      editPortfolio !== (user.links?.portfolio || '') ||
      editFacebook !== (user.links?.facebook || '') ||
      editTwitter !== (user.links?.twitter || '') ||
      JSON.stringify(editCustomLinks) !== JSON.stringify(user.customLinks || [])
    );
  };

  // Common warning dialog helper
  const confirmClose = (onDiscard: () => void, onSave: () => void, typeLabel: string) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(
        `Unsaved Changes 🚨\n\nAapke paas unsaved ${typeLabel} changes hain. Kya aap changes ko discard karke close karna chahte hain?`
      );
      if (confirm) {
        onDiscard();
      }
      return;
    }

    Alert.alert(
      'Unsaved Changes',
      `You have unsaved changes in your ${typeLabel}. Would you like to save before closing?`,
      [
        {
          text: 'Save & Close',
          onPress: onSave,
        },
        {
          text: 'Discard',
          onPress: onDiscard,
          style: 'destructive',
        },
        {
          text: 'Keep Editing',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  // Close handlers with confirmation checks
  const closeEditProfileWithCheck = () => {
    if (isCredentialsDirty()) {
      confirmClose(
        () => {
          setIsEditProfileVisible(false);
        },
        handleSaveProfile,
        'profile credentials'
      );
    } else {
      setIsEditProfileVisible(false);
    }
  };

  const closePasswordWithCheck = () => {
    if (isPasswordDirty()) {
      confirmClose(
        () => {
          setIsPasswordModalVisible(false);
        },
        handleSavePassword,
        'password credentials'
      );
    } else {
      setIsPasswordModalVisible(false);
    }
  };

  const closePhotoWithCheck = () => {
    if (isPhotoDirty()) {
      confirmClose(
        () => {
          setIsPhotoModalVisible(false);
        },
        handleSaveAvatar,
        'profile picture'
      );
    } else {
      setIsPhotoModalVisible(false);
    }
  };

  const closeVibeWithCheck = () => {
    if (isVibeDirty()) {
      confirmClose(
        () => {
          if (user) {
            setEditVibe(user.vibeStatus || 'Coding my way through engineering 💻');
          }
          setIsVibeModalVisible(false);
        },
        handleSaveVibe,
        'status vibe'
      );
    } else {
      setIsVibeModalVisible(false);
    }
  };

  const closeSkillsWithCheck = () => {
    if (isSkillsDirty()) {
      confirmClose(
        () => {
          if (user) {
            setEditSkills(user.skills || []);
          }
          setNewCustomSkill('');
          setIsSkillsModalVisible(false);
        },
        handleSaveSkills,
        'skills cloud'
      );
    } else {
      setIsSkillsModalVisible(false);
    }
  };

  const closeLinksWithCheck = () => {
    if (isLinksDirty()) {
      confirmClose(
        () => {
          if (user) {
            setEditGithub(user.links?.github || '');
            setEditLinkedin(user.links?.linkedin || '');
            setEditInstagram(user.links?.instagram || '');
            setEditGooglescholar(user.links?.googlescholar || '');
            setEditYoutube(user.links?.youtube || '');
            setEditWebsite(user.links?.website || '');
            setEditPortfolio(user.links?.portfolio || '');
            setEditFacebook(user.links?.facebook || '');
            setEditTwitter(user.links?.twitter || '');
            setEditCustomLinks(user.customLinks || []);
          }
          setIsLinksModalVisible(false);
        },
        handleSaveLinks,
        'social links'
      );
    } else {
      setIsLinksModalVisible(false);
    }
  };

  // Pre-populate Edit Form when modal opens
  const openEditProfile = () => {
    if (user) {
      setEditRole(user.role || 'Student');
      setEditName(user.name || '');
      setEditRollNo(user.rollNo || '');
      setEditRegNo(user.regNo || '');
      setEditBatch(user.batch || '');
      setEditDept(user.department || DEPARTMENTS[0]);
      setEditIsBatchPrivate(user.isBatchPrivate || false);
      setEditIsDeptPrivate(user.isDeptPrivate || false);
      setIsEditProfileVisible(true);
    }
  };

  // Pre-populate Password Modal
  const openPasswordConfig = () => {
    if (!user) return;
    setPhone(user.phone || '');
    setPassword('');
    setEditUsername(user.username || '');
    setEditName(user.name || '');
    setUsernameStatus('idle');
    setUsernameMessage('');
    setIsPasswordModalVisible(true);
  };

  const shouldOpenLoginSettings = useAppStore(state => state.shouldOpenLoginSettings);
  const setShouldOpenLoginSettings = useAppStore(state => state.setShouldOpenLoginSettings);

  React.useEffect(() => {
    if (shouldOpenLoginSettings) {
      setShouldOpenLoginSettings(false);
      const timer = setTimeout(() => {
        openPasswordConfig();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [shouldOpenLoginSettings]);

  const openPhotoModal = () => {
    if (!user) return;
    setSelectedPhoto(user.photoUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix');
    setCustomPhotoUrl('');
    setIsCustomPhotoUrlVisible(false);
    setIsPhotoModalVisible(true);
  };

  const handleChooseFromGallery = async () => {
    const result = await launchMediaPicker({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
    });

    if (result.uri) {
      setIsUploading(true);
      try {
        const cloudinaryUrl = await uploadToCloudinary(result.uri);
        if (cloudinaryUrl) {
          setSelectedPhoto(cloudinaryUrl);
          setCustomPhotoUrl('');
          setIsCustomPhotoUrlVisible(false);
          showPremiumAlert("Success 🎉", "Image Cloudinary par successfully upload ho chuki hai!", "success");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSaveAvatar = async () => {
    if (!user) return;
    setIsSaving(true);
    const finalPhoto = customPhotoUrl.trim() || selectedPhoto;
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const { db } = require('../config/firebase');

      // 1. Sync in Firestore database directly (avoids academic validation blocker)
      const userDocRef = doc(db, 'publicProfiles', user.uid);
      await setDoc(userDocRef, sanitizeFirestoreData({ photoUrl: finalPhoto }), { merge: true });

      // 2. Sync in Zustand global store
      const { setUser } = useAppStore.getState();
      await setUser({ ...user, photoUrl: finalPhoto });

      // 3. Sync across all posts and comments
      const finalRole = user.adminRole ? 'Admin' : user.role;
      useAppStore.getState().syncUserProfileToContent(user.uid, finalRole, user.name, finalPhoto, user.name).catch(console.error);

      // Invalidate cache locally
      await invalidateProfileCache(user.uid);

      setIsPhotoModalVisible(false);
      useAppStore.getState().showToast('Profile picture updated successfully! 🎉', 'success');
    } catch (e: any) {
      console.error('Failed to save profile picture:', e);
      showPremiumAlert('Error', e?.message || 'Failed to update profile picture.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePrivacy = async () => {
    if (!user || user.role === 'Guest') return;
    const newIsPrivate = !user.isPrivate;
    
    if (Platform.OS === 'web') {
      const confirm = window.confirm(
        newIsPrivate 
          ? 'Private Profile 🔒\n\nYour profile will be Private. It will NOT appear in the Network Grid search results, but anyone with your exact profile URL can still view your public information. Continue?'
          : 'Public Profile 🌍\n\nYour profile will be Public. It will appear in the Network Grid search results. Continue?'
      );
      if (confirm) {
        try {
          const { doc, setDoc } = require('firebase/firestore');
          const { db } = require('../config/firebase');
          const userDocRef = doc(db, 'publicProfiles', user.uid);
          await setDoc(userDocRef, sanitizeFirestoreData({ isPrivate: newIsPrivate }), { merge: true });
          const { setUser } = useAppStore.getState();
          await setUser({ ...user, isPrivate: newIsPrivate });
          useAppStore.getState().showToast(newIsPrivate ? 'Profile is now Private 🔒' : 'Profile is now Public 🌍', 'success');
        } catch(e: any) {
          console.error(e);
          alert('Failed to update privacy setting.');
        }
      }
      return;
    }

    Alert.alert(
      newIsPrivate ? 'Private Profile 🔒' : 'Public Profile 🌍',
      newIsPrivate
        ? 'Your profile will be Private. It will NOT appear in the Network Grid search results, but anyone with your exact profile URL can still view your public information.'
        : 'Your profile will be Public. It will appear in the Network Grid search results.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const { doc, setDoc } = require('firebase/firestore');
              const { db } = require('../config/firebase');
              const userDocRef = doc(db, 'publicProfiles', user.uid);
              await setDoc(userDocRef, sanitizeFirestoreData({ isPrivate: newIsPrivate }), { merge: true });
              const { setUser } = useAppStore.getState();
              await setUser({ ...user, isPrivate: newIsPrivate });
              useAppStore.getState().showToast(newIsPrivate ? 'Profile is now Private 🔒' : 'Profile is now Public 🌍', 'success');
            } catch(e: any) {
              console.error(e);
              showPremiumAlert('Error', 'Failed to update privacy setting.', 'error');
            }
          }
        }
      ]
    );
  };

  
  const validateBatch = (batch: string) => {
    if (!batch) return null;
    const batchRegex = /^(\d{4})(?:-(\d{2}|\d{4}))?$/;
    const match = batch.trim().match(batchRegex);
    if (!match) return 'Allowed formats: YYYY, YYYY-YY, or YYYY-YYYY';
    
    const startYear = parseInt(match[1], 10);
    const currentYear = new Date().getFullYear();
    
    if (startYear < 1980 || startYear > currentYear) {
      return 'Start year must be between 1980 and ' + currentYear;
    }
    
    if (match[2]) {
      const endYearStr = match[2];
      const endYear = endYearStr.length === 2 ? parseInt(match[1].substring(0, 2) + endYearStr, 10) : parseInt(endYearStr, 10);
      if (endYear <= startYear) {
        return 'End year must be greater than start year';
      }
    }
    return null;
  };

  const validateRollNo = (rollNo: string) => {
    if (!rollNo) return null;
    const trimmed = rollNo.trim();
    if (!/^\d{5}$/.test(trimmed)) return 'Please enter a valid 5-digit MCE roll number.';
    if (/^(\d)\1{4}$/.test(trimmed)) return 'Please enter a valid 5-digit MCE roll number.';
    return null;
  };

  const validateRegNo = (regNo: string) => {
    if (!regNo) return null;
    const trimmed = regNo.trim();
    if (!/^\d{11}$/.test(trimmed)) return 'Please enter a valid 11-digit registration number.';
    if (/^(\d)\1{10}$/.test(trimmed)) return 'Please enter a valid 11-digit registration number.';
    return null;
  };


  const handleSaveProfile = async () => {
    if (!user) return;
    
    // Clean and validate Display Name
    const cleanedName = cleanDisplayName(editName);
    setEditName(cleanedName);
    const nameErr = validateDisplayName(cleanedName);
    if (nameErr) {
      setEditNameError(nameErr);
      showPremiumAlert('Invalid Name', nameErr, 'warning');
      return;
    }
    setEditNameError(null);

    setIsSaving(true);
    
    try {
      const isStudentOrAlumni = editRole === 'Student' || editRole === 'Alumni';
      const isFaculty = editRole === 'Faculty';
      
      const rollNoToSave = isStudentOrAlumni ? editRollNo : undefined;
      const regNoToSave = isStudentOrAlumni ? editRegNo : undefined;
      const deptToSave = (isStudentOrAlumni || isFaculty) ? editDept : undefined;
      const rollErr = validateRollNo(editRollNo);
      if (rollErr) { showPremiumAlert('Invalid Roll Number', rollErr, 'warning'); return; }

      const regErr = validateRegNo(editRegNo);
      if (regErr) { showPremiumAlert('Invalid Registration', regErr, 'warning'); return; }

      const batchToSave = isStudentOrAlumni ? editBatch : undefined;

      // 1. Strict required fields validation check in UI prior to submitting
      if (editRole === 'Student') {
        if (!editRollNo.trim() || editRollNo.trim().length !== 5 || isNaN(Number(editRollNo.trim()))) {
          showPremiumAlert('Required Field', 'Student ke liye MCE Roll Number (strictly 5 digits) required hai!', 'warning');
          return;
        }
        if (!editRegNo.trim() || editRegNo.trim().length !== 11 || isNaN(Number(editRegNo.trim()))) {
          showPremiumAlert('Required Field', 'Student ke liye Registration Number (strictly 11 digits) required hai!', 'warning');
          return;
        }
        if (!editBatch.trim()) {
          showPremiumAlert('Required Field', 'Student ke liye Academic Batch Years required hai!', 'warning');
          return;
        }
        const batchErr = validateBatch(editBatch);
        if (batchErr) { showPremiumAlert('Invalid Batch', batchErr, 'warning'); return; }
        if (!editDept || !editDept.trim()) {
          showPremiumAlert('Required Field', 'Student ke liye Department / Branch select karna required hai!', 'warning');
          return;
        }
      } else if (editRole === 'Alumni') {
        if (!editDept || !editDept.trim()) {
          showPremiumAlert('Required Field', 'Alumni ke liye Department / Branch select karna required hai!', 'warning');
          return;
        }
        if (!editBatch.trim()) {
          showPremiumAlert('Required Field', 'Alumni ke liye Academic Session / Batch required hai!', 'warning');
          return;
        }
        const alumniBatchErr = validateBatch(editBatch);
        if (alumniBatchErr) { showPremiumAlert('Invalid Batch', alumniBatchErr, 'warning'); return; }
      } else if (editRole === 'Faculty') {
        if (!editDept || !editDept.trim()) {
          showPremiumAlert('Required Field', 'Faculty ke liye Department / Branch select karna required hai!', 'warning');
          return;
        }
      }

      const result = await updateAcademicProfile(
        editRole,
        editRole === 'Student' || editRole === 'Alumni' ? editRollNo : undefined,
        editRole === 'Student' || editRole === 'Alumni' ? editRegNo : undefined,
        editRole === 'Student' || editRole === 'Alumni' || editRole === 'Faculty' ? editDept : undefined,
        editRole === 'Student' || editRole === 'Alumni' ? editBatch : undefined,
        undefined, // bio
        undefined, // photoUrl
        editName, // name
        undefined  // username
      );

      if (result.success) {
        await updatePrivacySettings(editIsBatchPrivate, editIsDeptPrivate);
        const { setUser } = useAppStore.getState();
        
        // Sync the changes to all posts and comments dynamically
        const finalRole = user.adminRole ? 'Admin' : editRole;
        useAppStore.getState().syncUserProfileToContent(user.uid, finalRole, editName, user.photoUrl, user.name).catch(console.error);

        await setUser({
          ...user,
          role: editRole,
          name: editName,
          rollNo: rollNoToSave,
          regNo: regNoToSave,
          department: deptToSave,
          batch: batchToSave,
          isBatchPrivate: editIsBatchPrivate,
          isDeptPrivate: editIsDeptPrivate,
          isVerified: true
        });
        
        // Invalidate cache locally
        await invalidateProfileCache(user.uid);

        setIsEditProfileVisible(false);
        useAppStore.getState().showToast('Academic profile saved successfully! 🎉', 'success');
      } else {
        showPremiumAlert('Failed to Save', result.error || 'Failed to save academic profile.', 'error');
      }
    } catch (e: any) {
      console.error('Failed to save academic profile:', e);
      showPremiumAlert('Failed to Save', e?.message || 'Academic profile save karne me error aaya.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async () => {
    // Clean and validate Display Name
    const cleanedName = cleanDisplayName(editName);
    setEditName(cleanedName);
    const nameErr = validateDisplayName(cleanedName);
    if (nameErr) {
      setEditNameError(nameErr);
      showPremiumAlert('Invalid Name', nameErr, 'warning');
      return;
    }
    setEditNameError(null);

    const cleanPhone = phone.trim();
    const cleanPass = password.trim();
    const cleanUser = editUsername.trim().toLowerCase();

    const nameChanged = cleanedName !== (user?.name || '');
    const phoneChanged = cleanPhone !== (user?.phone || '');
    const passwordChanged = cleanPass !== '';
    const usernameChanged = cleanUser !== (user?.username || '');

    // If nothing changed, just close
    if (!nameChanged && !phoneChanged && !passwordChanged && !usernameChanged) {
      setIsPasswordModalVisible(false);
      return;
    }

    // Only validate phone and password if they are being changed or if they are required and user is attempting to set them
    if (phoneChanged || passwordChanged) {
      // 1. Phone number is strictly required and must be a valid 10-digit number
      if (!cleanPhone) {
        showPremiumAlert('Missing Fields', 'Kripya apna mobile number darj karein.', 'warning');
        return;
      }
      if (cleanPhone.length !== 10 || isNaN(Number(cleanPhone))) {
        showPremiumAlert('Invalid Phone Number', 'Kripya ek sahi 10-digit mobile number type karein.', 'warning');
        return;
      }

      // 2. Password is required ONLY if they do not have one configured yet, or if they explicitly want to change it
      const needsPassword = !user?.hasPassword;
      if (needsPassword && !cleanPass) {
        showPremiumAlert('Missing Password', 'Kripya account secure karne ke liye ek password banayein.', 'warning');
        return;
      }
      if (cleanPass) {
        const passValidation = validatePassword(cleanPass);
        if (!passValidation.isValid) {
          showPremiumAlert(
            'Weak Password',
            'Password must contain:\n• Minimum 6 characters\n• At least 1 letter\n• At least 1 number\n• At least 1 special character (@ # ! $)\n• No repeated characters more than twice\n\nExample: pass@324',
            'warning'
          );
          return;
        }
      }
    }

    const proceedToSave = async () => {
      setIsSaving(true);
      try {
        let nameChanged = false;
        let finalNewName = user?.name || '';
        const originalName = user?.name || '';

        if (cleanUser && cleanUser !== user?.username) {
          if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
            showPremiumAlert('Username Unavailable', usernameMessage || 'Ye username available nahi hai.', 'warning');
            return;
          }
          if (usernameStatus === 'checking') {
            showPremiumAlert('Checking Availability', 'Username check kiya ja raha hai, kripya thoda ruken.', 'info');
            return;
          }

          if (!/^[a-z0-9_]{3,20}$/.test(cleanUser)) {
            showPremiumAlert('Invalid Username', 'Username me sirf chote letters, numbers aur underscores ho sakte hain (3-20 characters)!', 'warning');
            return;
          }
          if (!/[a-z]/.test(cleanUser)) {
            showPremiumAlert('Invalid Username', 'Username me kam se kam ek letter (a-z) hona zaroori hai!', 'warning');
            return;
          }
          const digitCount = (cleanUser.match(/[0-9]/g) || []).length;
          if (digitCount < 2) {
            showPremiumAlert('Invalid Username', 'Username me kam se kam 2 numbers (digits) hona zaroori hai!', 'warning');
            return;
          }
          
          const result = await updateUsername(cleanUser, editName);

          if (!result.success) {
            showPremiumAlert('Failed to Update Profile', result.error || 'Failed to save changes.', 'error');
            return;
          }
          
          const { setUser } = useAppStore.getState();
          await setUser({ ...user!, username: cleanUser, name: editName || user!.name });
          nameChanged = !!(editName && editName !== user?.name);
          finalNewName = editName || user!.name;
        } else if (editName.trim() && editName.trim() !== user?.name) {
          // If only name changed, but not username
          const result = await updateUsername(user?.username || '', editName);
          if (!result.success) {
            showPremiumAlert('Failed to Update Name', result.error || 'Failed to save name.', 'error');
            return;
          }
          const { setUser } = useAppStore.getState();
          await setUser({ ...user!, name: editName });
          nameChanged = true;
          finalNewName = editName;
        }

        if (nameChanged && user) {
          const finalRole = user.adminRole ? 'Admin' : user.role;
          useAppStore.getState().syncUserProfileToContent(user.uid, finalRole, finalNewName, user.photoUrl, originalName).catch(console.error);
        }

        if (phoneChanged || passwordChanged) {
          const success = await configurePassword(cleanPhone, cleanPass);
          if (success) {
            setIsPasswordModalVisible(false);
            useAppStore.getState().showToast('Credentials updated successfully! 🎉', 'success');
          } else {
            showPremiumAlert('Error', 'Failed to configure password.', 'error');
          }
        } else {
          setIsPasswordModalVisible(false);
          useAppStore.getState().showToast('Profile updated successfully! 🎉', 'success');
        }
      } catch (error: any) {
        console.error('Failed to save credentials/password:', error);
        showPremiumAlert('Error', error?.message || 'Credentials save karne me error aaya.', 'error');
      } finally {
        setIsSaving(false);
      }
    };

    if (cleanUser && cleanUser !== user?.username) {
      Alert.alert(
        'Confirm Username Change',
        `Aap apna username badalkar "${cleanUser}" kar rahe hain.\n\n⚠️ IMPORTANT: Ek baar badalne ke baad, aap agle 6 mahine (180 days) tak ise dobara change nahi kar payenge!\n\nKya aap sure hain?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Change & Save', onPress: () => proceedToSave() }
        ]
      );
    } else {
      await proceedToSave();
    }
  };

  const handleSaveInlineBio = async (newBio: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const { db } = require('../config/firebase');
      
      const updatedBio = newBio.trim();
      const updatedUser = {
        ...user,
        vibeStatus: updatedBio
      };

      // 1. Sync in Firestore database
      const userDocRef = doc(db, 'publicProfiles', user.uid);
      await setDoc(userDocRef, sanitizeFirestoreData({ vibeStatus: updatedBio }), { merge: true });

      // 2. Sync in Zustand global store
      const { setUser } = useAppStore.getState();
      await setUser(updatedUser);

      // Reset editing flags
      setIsInlineEditingBio(false);
    } catch (e: any) {
      console.error('Failed to save inline bio on database:', e);
      showPremiumAlert('Database Error', getReadableErrorMessage(e), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVibe = async () => {
    if (!user) return;
    setIsSaving(true);
    const trimmedVibe = editVibe.trim();
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const { db } = require('../config/firebase');
      await setDoc(doc(db, 'publicProfiles', user.uid), sanitizeFirestoreData({ vibeStatus: trimmedVibe }), { merge: true });

      const { setUser } = useAppStore.getState();
      await setUser({
        ...user,
        vibeStatus: trimmedVibe
      });
      setIsVibeModalVisible(false);
      useAppStore.getState().showToast('Status vibe updated successfully! 🎉', 'success');
    } catch (e: any) {
      console.error('Failed to save vibe status:', e);
      showPremiumAlert('Database Error', getReadableErrorMessage(e), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSkills = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const { db } = require('../config/firebase');
      await setDoc(doc(db, 'publicProfiles', user.uid), sanitizeFirestoreData({ skills: editSkills }), { merge: true });

      const { setUser } = useAppStore.getState();
      await setUser({
        ...user,
        skills: editSkills
      });
      setIsSkillsModalVisible(false);
      useAppStore.getState().showToast('Tech skills updated successfully! 🎉', 'success');
    } catch (e: any) {
      console.error('Failed to save skills:', e);
      showPremiumAlert('Database Error', getReadableErrorMessage(e), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLinks = async () => {
    if (!user) return;

    const urlPattern = /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/;
    const linksToValidate = [
      { name: 'GitHub', value: editGithub.trim() },
      { name: 'LinkedIn', value: editLinkedin.trim() },
      { name: 'Instagram', value: editInstagram.trim() },
      { name: 'Google Scholar', value: editGooglescholar.trim() },
      { name: 'YouTube', value: editYoutube.trim() },
      { name: 'Personal Website', value: editWebsite.trim() },
      { name: 'Portfolio', value: editPortfolio.trim() },
      { name: 'Facebook', value: editFacebook.trim() },
      { name: 'Twitter', value: editTwitter.trim() }
    ];

    for (const link of linksToValidate) {
      if (link.value && !urlPattern.test(link.value.replace(/^https?:\/\//i, ''))) {
        showPremiumAlert(
          'Invalid URL Format 🌐',
          `Kripya ${link.name} ke liye ek valid link (URL) enter karein (e.g. domain.com ya fully qualified link). Sirf naam likhna sahi nahi hai.`,
          'warning'
        );
        return;
      }
    }

    for (const link of editCustomLinks) {
      if (link.url && !urlPattern.test(link.url.replace(/^https?:\/\//i, ''))) {
        showPremiumAlert(
          'Invalid URL Format 🌐',
          `Kripya custom link "${link.title}" ke liye ek valid URL enter karein (e.g. domain.com).`,
          'warning'
        );
        return;
      }
    }

    setIsSaving(true);
    const updatedLinks = {
      github: editGithub.trim(),
      linkedin: editLinkedin.trim(),
      instagram: editInstagram.trim(),
      googlescholar: editGooglescholar.trim(),
      youtube: editYoutube.trim(),
      website: editWebsite.trim(),
      portfolio: editPortfolio.trim(),
      facebook: editFacebook.trim(),
      twitter: editTwitter.trim()
    };
    try {
      const { doc, setDoc } = require('firebase/firestore');
      const { db } = require('../config/firebase');
      await setDoc(doc(db, 'publicProfiles', user.uid), sanitizeFirestoreData({ links: updatedLinks, customLinks: editCustomLinks }), { merge: true });

      // Invalidate cache locally
      await invalidateProfileCache(user.uid);

      const { setUser } = useAppStore.getState();
      await setUser({
        ...user,
        links: updatedLinks,
        customLinks: editCustomLinks
      });
      setIsLinksModalVisible(false);
      useAppStore.getState().showToast('Social profiles & links updated successfully! 🎉', 'success');
    } catch (e: any) {
      console.error('Failed to save links:', e);
      showPremiumAlert('Database Error', getReadableErrorMessage(e), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExperience = (expId: string) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(
        'Delete Experience 🚨\n\nAre you sure you want to delete this experience entry?'
      );
      if (confirm) {
        (async () => {
          if (!user) return;
          setIsSaving(true);
          const updatedExps = (user.experiences || []).filter((e: any) => e.id !== expId);
          try {
            const { doc, setDoc } = require('firebase/firestore');
            const { db } = require('../config/firebase');
            await setDoc(doc(db, 'publicProfiles', user.uid), sanitizeFirestoreData({ experiences: updatedExps }), { merge: true });

            const { setUser } = useAppStore.getState();
            await setUser({ ...user, experiences: updatedExps });
            useAppStore.getState().showToast('Experience deleted successfully! 🎉', 'success');
          } catch (e: any) {
            console.error('Failed to delete experience:', e);
            showPremiumAlert('Database Error', getReadableErrorMessage(e), 'error');
          } finally {
            setIsSaving(false);
          }
        })();
      }
      return;
    }

    Alert.alert(
      'Delete Experience',
      'Are you sure you want to delete this experience entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setIsSaving(true);
            const updatedExps = (user.experiences || []).filter((e: any) => e.id !== expId);
            try {
              const { doc, setDoc } = require('firebase/firestore');
              const { db } = require('../config/firebase');
              await setDoc(doc(db, 'publicProfiles', user.uid), sanitizeFirestoreData({ experiences: updatedExps }), { merge: true });

              const { setUser } = useAppStore.getState();
              await setUser({ ...user, experiences: updatedExps });
              useAppStore.getState().showToast('Experience deleted successfully! 🎉', 'success');
            } catch (e: any) {
              console.error('Failed to delete experience:', e);
              showPremiumAlert('Database Error', getReadableErrorMessage(e), 'error');
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  
  const validateExperience = (role: string, company: string, desc: string, startY: string, endY: string, isCurr: boolean) => {
    // Role / Position Title
    const roleRegex = /^[a-zA-Z0-9\s.,&()\-]+$/;
    if (!roleRegex.test(role) || !/[a-zA-Z]/.test(role)) {
      return 'Position Title must contain at least one alphabet and can only use letters, numbers, spaces, and . , & - ( )';
    }
    
    // Organization Name
    if (company.length < 3 || !/[a-zA-Z]/.test(company)) {
      return 'Organization Name must be at least 3 characters and contain at least one alphabet';
    }

    // Description
    if (desc && (desc.length < 10 || desc.length > 500)) {
      return 'Description must be between 10 and 500 characters';
    }

    // Dates
    const startYearNum = parseInt(startY, 10);
    const currentYear = new Date().getFullYear();
    if (isNaN(startYearNum) || startYearNum < 1980 || startYearNum > currentYear) {
      return 'Start Year must be between 1980 and ' + currentYear;
    }

    if (!isCurr) {
      const endYearNum = parseInt(endY, 10);
      if (isNaN(endYearNum) || endYearNum < startYearNum || endYearNum > currentYear) {
        return 'End Year must be between ' + startYearNum + ' and ' + currentYear;
      }
    }
    return null;
  };


  const closeExpModal = () => {
    setIsAddExpVisible(false);
    setEditingExpId(null);
    setExpRole('');
    setExpCompany('');
    setExpEmpType('Full-time');
    setExpStartMonth('Jan');
    setExpStartYear('');
    setExpEndMonth('Jan');
    setExpEndYear('');
    setExpIsCurrent(false);
    setExpDesc('');
  };

  const handleEditExperience = (exp: Experience) => {
    setEditingExpId(exp.id);
    setExpRole(exp.role);
    setExpCompany(exp.company);
    setExpEmpType(exp.employmentType);
    setExpStartMonth(exp.startMonth || 'Jan');
    setExpStartYear(exp.startYear || '');
    setExpEndMonth(exp.endMonth || 'Jan');
    setExpEndYear(exp.endYear || '');
    setExpIsCurrent(exp.isCurrent);
    setExpDesc(exp.description || '');
    setIsAllExperiencesVisible(false);
    setIsAddExpVisible(true);
  };

  const handleSaveExperience = async () => {
    if (!expRole.trim() || !expCompany.trim() || !expStartMonth || !expStartYear.trim()) {
      showPremiumAlert('Missing Fields', 'Please fill out all required fields marked with *', 'warning');
      return;
    }
    if (!expIsCurrent && (!expEndMonth || !expEndYear.trim())) {
      showPremiumAlert('Missing Fields', 'Please select an end date or mark as current job.', 'warning');
      return;
    }

    const expValError = validateExperience(expRole.trim(), expCompany.trim(), expDesc.trim(), expStartYear.trim(), expEndYear.trim(), expIsCurrent);
    if (expValError) {
      showPremiumAlert('Invalid Input', expValError, 'warning');
      return;
    }

    const newExp: Experience = {
      id: editingExpId || `exp-${Date.now()}`,
      role: expRole.trim(),
      company: expCompany.trim(),
      employmentType: expEmpType,
      startMonth: expStartMonth,
      startYear: expStartYear.trim(),
      endMonth: expIsCurrent ? undefined : expEndMonth,
      endYear: expIsCurrent ? undefined : expEndYear.trim(),
      isCurrent: expIsCurrent,
      description: expDesc.trim() || undefined,
    };

    if (!user) return;
    setIsSaving(true);
    
    let updatedExps: Experience[];
    if (editingExpId) {
      updatedExps = (user.experiences || []).map((exp: Experience) => exp.id === editingExpId ? { ...newExp, id: editingExpId } : exp);
    } else {
      updatedExps = [...(user.experiences || []), newExp];
    }

    try {
      const { doc, setDoc } = require('firebase/firestore');
      const { db } = require('../config/firebase');
      await setDoc(doc(db, 'publicProfiles', user.uid), sanitizeFirestoreData({ experiences: updatedExps }), { merge: true });

      const { setUser } = useAppStore.getState();
      await setUser({ ...user, experiences: updatedExps });
      
      setIsAddExpVisible(false);
      useAppStore.getState().showToast(editingExpId ? 'Experience updated successfully! 🎉' : 'Experience added successfully! 🎉', 'success');

      // Reset Form State
      closeExpModal();
    } catch (e: any) {
      console.error('Failed to save experience:', e);
      showPremiumAlert('Database Error', getReadableErrorMessage(e), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const validateEducation = (school: string, degree: string, fieldOfStudy: string, startY: string, endY: string, isCurr: boolean, desc?: string) => {
    if (!school.trim() || school.length < 3 || !/[a-zA-Z]/.test(school)) {
      return 'School / College Name must be at least 3 characters and contain at least one alphabet';
    }
    if (!degree.trim() || degree.length < 2 || !/[a-zA-Z]/.test(degree)) {
      return 'Degree must be at least 2 characters';
    }
    if (!fieldOfStudy.trim() || fieldOfStudy.length < 2 || !/[a-zA-Z]/.test(fieldOfStudy)) {
      return 'Field of Study must be at least 2 characters';
    }
    if (desc && (desc.length < 10 || desc.length > 500)) {
      return 'Description must be between 10 and 500 characters';
    }
    const startYearNum = parseInt(startY, 10);
    const currentYear = new Date().getFullYear() + 6;
    if (isNaN(startYearNum) || startYearNum < 1980 || startYearNum > currentYear) {
      return 'Start Year must be between 1980 and ' + currentYear;
    }
    if (!isCurr) {
      const endYearNum = parseInt(endY, 10);
      if (isNaN(endYearNum) || endYearNum < startYearNum || endYearNum > currentYear) {
        return 'End Year must be between ' + startYearNum + ' and ' + currentYear;
      }
    }
    return null;
  };

  const validatePublication = (title: string, publisher: string, pubD: string, url?: string, desc?: string) => {
    if (!title.trim() || title.length < 3) {
      return 'Publication Title must be at least 3 characters';
    }
    if (!publisher.trim() || publisher.length < 3) {
      return 'Publisher / Journal / Conference must be at least 3 characters';
    }
    
    const pubDTrim = pubD.trim();
    if (!pubDTrim) {
      return 'Publication Date / Year is required';
    }

    const mmYyyyRegex = /^(0[1-9]|1[0-2])\/\d{4}$/;
    const yyyyRegex = /^\d{4}$/;
    const currentYear = new Date().getFullYear() + 6;

    if (!mmYyyyRegex.test(pubDTrim) && !yyyyRegex.test(pubDTrim)) {
      return 'Publication Date must be in MM/YYYY or YYYY format (e.g. 06/2026 or 2026)';
    }

    const yearStr = pubDTrim.includes('/') ? pubDTrim.split('/')[1] : pubDTrim;
    const yearNum = parseInt(yearStr, 10);
    if (yearNum < 1980 || yearNum > currentYear) {
      return 'Publication Year must be between 1980 and ' + currentYear;
    }

    if (url && url.trim()) {
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
      if (!urlRegex.test(url.trim())) {
        return 'Please enter a valid URL (e.g. https://ieeexplore.ieee.org/...)';
      }
    }
    if (desc && (desc.length < 10 || desc.length > 500)) {
      return 'Description must be between 10 and 500 characters';
    }
    return null;
  };

  const closeEduModal = () => {
    setIsAddEduVisible(false);
    setEditingEduId(null);
    setEduSchool('');
    setEduDegree('');
    setEduFieldOfStudy('');
    setEduStartYear('');
    setEduEndYear('');
    setEduIsCurrent(false);
    setEduDesc('');
  };

  const handleEditEducation = (edu: any) => {
    setEditingEduId(edu.id);
    setEduSchool(edu.school);
    setEduDegree(edu.degree);
    setEduFieldOfStudy(edu.fieldOfStudy);
    setEduStartYear(edu.startYear);
    setEduEndYear(edu.isCurrent ? '' : edu.endYear);
    setEduIsCurrent(edu.isCurrent);
    setEduDesc(edu.description || '');
    setIsAddEduVisible(true);
  };

  const handleSaveEducation = async () => {
    if (!eduSchool.trim() || !eduDegree.trim() || !eduFieldOfStudy.trim() || !eduStartYear.trim()) {
      showPremiumAlert('Missing Fields', 'Please fill in all required fields.', 'warning');
      return;
    }
    if (!eduIsCurrent && !eduEndYear.trim()) {
      showPremiumAlert('Missing Fields', 'Please select an end year or mark as current.', 'warning');
      return;
    }

    const valError = validateEducation(eduSchool, eduDegree, eduFieldOfStudy, eduStartYear, eduEndYear, eduIsCurrent, eduDesc);
    if (valError) {
      showPremiumAlert('Invalid Input', valError, 'warning');
      return;
    }

    const newEdu = {
      id: editingEduId || `edu-${Date.now()}`,
      school: eduSchool.trim(),
      degree: eduDegree.trim(),
      fieldOfStudy: eduFieldOfStudy.trim(),
      startYear: eduStartYear.trim(),
      endYear: eduIsCurrent ? 'Present' : eduEndYear.trim(),
      isCurrent: eduIsCurrent,
      description: eduDesc.trim() || undefined,
    };

    if (!user) return;
    setIsSaving(true);
    
    let updatedEdu: any[];
    if (editingEduId) {
      updatedEdu = (user.education || []).map((edu: any) => edu.id === editingEduId ? { ...newEdu, id: editingEduId } : edu);
    } else {
      updatedEdu = [...(user.education || []), newEdu];
    }

    try {
      const { doc, setDoc } = require('firebase/firestore');
      const { db } = require('../config/firebase');
      await setDoc(doc(db, 'publicProfiles', user.uid), sanitizeFirestoreData({ education: updatedEdu }), { merge: true });

      const { setUser } = useAppStore.getState();
      await setUser({ ...user, education: updatedEdu });
      
      setIsAddEduVisible(false);
      useAppStore.getState().showToast(editingEduId ? 'Education details updated successfully! 🎉' : 'Education details added successfully! 🎉', 'success');

      // Reset Form State
      closeEduModal();
    } catch (e: any) {
      console.error('Failed to save education:', e);
      showPremiumAlert('Database Error', getReadableErrorMessage(e), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const closePubModal = () => {
    setIsAddPubVisible(false);
    setEditingPubId(null);
    setPubTitle('');
    setPubPublisher('');
    setPubDate('');
    setPubUrl('');
    setPubAuthors('');
    setPubDesc('');
  };

  const handleEditPublication = (pub: any) => {
    setEditingPubId(pub.id);
    setPubTitle(pub.title);
    setPubPublisher(pub.publisher);
    setPubDate(pub.publicationDate);
    setPubUrl(pub.url || '');
    setPubAuthors(pub.authors || '');
    setPubDesc(pub.description || '');
    setIsAddPubVisible(true);
  };

  const handleSavePublication = async () => {
    if (!pubTitle.trim() || !pubPublisher.trim() || !pubDate.trim()) {
      showPremiumAlert('Missing Fields', 'Please fill in all required fields.', 'warning');
      return;
    }

    const valError = validatePublication(pubTitle, pubPublisher, pubDate, pubUrl, pubDesc);
    if (valError) {
      showPremiumAlert('Invalid Input', valError, 'warning');
      return;
    }

    const newPub = {
      id: editingPubId || `pub-${Date.now()}`,
      title: pubTitle.trim(),
      publisher: pubPublisher.trim(),
      publicationDate: pubDate.trim(),
      url: pubUrl.trim() || undefined,
      authors: pubAuthors.trim() || undefined,
      description: pubDesc.trim() || undefined,
    };

    if (!user) return;
    setIsSaving(true);
    
    let updatedPubs: any[];
    if (editingPubId) {
      updatedPubs = (user.publications || []).map((pub: any) => pub.id === editingPubId ? { ...newPub, id: editingPubId } : pub);
    } else {
      updatedPubs = [...(user.publications || []), newPub];
    }

    try {
      const { doc, setDoc } = require('firebase/firestore');
      const { db } = require('../config/firebase');
      await setDoc(doc(db, 'publicProfiles', user.uid), sanitizeFirestoreData({ publications: updatedPubs }), { merge: true });

      const { setUser } = useAppStore.getState();
      await setUser({ ...user, publications: updatedPubs });
      
      setIsAddPubVisible(false);
      useAppStore.getState().showToast(editingPubId ? 'Conference/Publication updated successfully! 🎉' : 'Conference/Publication added successfully! 🎉', 'success');

      // Reset Form State
      closePubModal();
    } catch (e: any) {
      console.error('Failed to save publication:', e);
      showPremiumAlert('Database Error', getReadableErrorMessage(e), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEducation = (eduId: string) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(
        'Delete Education 🚨\n\nAre you sure you want to delete this education entry?'
      );
      if (confirm) {
        (async () => {
          if (!user) return;
          setIsSaving(true);
          const updatedEdu = (user.education || []).filter((e: any) => e.id !== eduId);
          try {
            const { doc, setDoc } = require('firebase/firestore');
            const { db } = require('../config/firebase');
            await setDoc(doc(db, 'publicProfiles', user.uid), sanitizeFirestoreData({ education: updatedEdu }), { merge: true });

            const { setUser } = useAppStore.getState();
            await setUser({ ...user, education: updatedEdu });
            useAppStore.getState().showToast('Education details deleted successfully! 🎉', 'success');
          } catch (e: any) {
            console.error('Failed to delete education:', e);
            showPremiumAlert('Database Error', getReadableErrorMessage(e), 'error');
          } finally {
            setIsSaving(false);
          }
        })();
      }
      return;
    }

    Alert.alert(
      'Delete Education',
      'Are you sure you want to delete this education entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setIsSaving(true);
            const updatedEdu = (user.education || []).filter((e: any) => e.id !== eduId);
            try {
              const { doc, setDoc } = require('firebase/firestore');
              const { db } = require('../config/firebase');
              await setDoc(doc(db, 'publicProfiles', user.uid), sanitizeFirestoreData({ education: updatedEdu }), { merge: true });

              const { setUser } = useAppStore.getState();
              await setUser({ ...user, education: updatedEdu });
              useAppStore.getState().showToast('Education details deleted successfully! 🎉', 'success');
            } catch (e: any) {
              console.error('Failed to delete education:', e);
              showPremiumAlert('Database Error', getReadableErrorMessage(e), 'error');
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleDeletePublication = (pubId: string) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(
        'Delete Publication 🚨\n\nAre you sure you want to delete this publication entry?'
      );
      if (confirm) {
        (async () => {
          if (!user) return;
          setIsSaving(true);
          const updatedPubs = (user.publications || []).filter((e: any) => e.id !== pubId);
          try {
            const { doc, setDoc } = require('firebase/firestore');
            const { db } = require('../config/firebase');
            await setDoc(doc(db, 'publicProfiles', user.uid), sanitizeFirestoreData({ publications: updatedPubs }), { merge: true });

            const { setUser } = useAppStore.getState();
            await setUser({ ...user, publications: updatedPubs });
            useAppStore.getState().showToast('Publication deleted successfully! 🎉', 'success');
          } catch (e: any) {
            console.error('Failed to delete publication:', e);
            showPremiumAlert('Database Error', getReadableErrorMessage(e), 'error');
          } finally {
            setIsSaving(false);
          }
        })();
      }
      return;
    }

    Alert.alert(
      'Delete Publication',
      'Are you sure you want to delete this publication entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setIsSaving(true);
            const updatedPubs = (user.publications || []).filter((e: any) => e.id !== pubId);
            try {
              const { doc, setDoc } = require('firebase/firestore');
              const { db } = require('../config/firebase');
              await setDoc(doc(db, 'publicProfiles', user.uid), sanitizeFirestoreData({ publications: updatedPubs }), { merge: true });

              const { setUser } = useAppStore.getState();
              await setUser({ ...user, publications: updatedPubs });
              useAppStore.getState().showToast('Publication deleted successfully! 🎉', 'success');
            } catch (e: any) {
              console.error('Failed to delete publication:', e);
              showPremiumAlert('Database Error', getReadableErrorMessage(e), 'error');
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };



  const handleSignOut = async () => {
    await logout();
    router.replace('/');
  };

  const handleDeleteProfile = async () => {
    if (!user) return;

    if (Platform.OS === 'web') {
      const confirm = window.confirm(
        'Account Deletion Request 🚨\n\n' +
        'Kya aap MCE Connect account permanently delete karna chahte hain? Tapping "OK" will generate an official email draft to the MCE tech support team with your profile details for permanent database removal.'
      );
      if (confirm) {
        try {
          // Log deletion request to admin panel
          const { doc, setDoc, serverTimestamp } = require('firebase/firestore');
          const { db } = require('../config/firebase');
          await setDoc(doc(db, 'deletion_requests', user.uid), {
            uid: user.uid,
            email: user.email || '',
            name: user.name || '',
            username: user.username || '',
            role: user.role || 'Student',
            reason: 'Requested from App Settings',
            status: 'pending',
            timestamp: serverTimestamp()
          });

          const email = 'mcemotihari.tech@gmail.com';
          const subject = encodeURIComponent('Account delete request');
          const body = encodeURIComponent(
            `Hi MCE Connect Support Team,\n\nI would like to request the permanent deletion of my MCE Connect profile card and associated account data. Please find my account details below:\n\n` +
            `Name: ${user.name || ''}\n` +
            `Email: ${user.email || ''}\n` +
            `Phone: ${user.phone || ''}\n` +
            `Username: @${user.username || ''}\n\n` +
            `Reason for deletion (optional):\n`
          );

          const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
          window.location.href = mailtoUrl;
        } catch (e: any) {
          console.error('Mail redirect failed:', e);
          alert('Default email app open karne me error aaya. Kripya mcemotihari.tech@gmail.com par direct mail karein!');
        }
      }
      return;
    }

    Alert.alert(
      'Account Deletion Request 🚨',
      'Kya aap MCE Connect account permanently delete karna chahte hain? Tapping "Continue" will generate an official email draft to the MCE tech support team with your profile details for permanent database removal.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            try {
              // Log deletion request to admin panel
              const { doc, setDoc, serverTimestamp } = require('firebase/firestore');
              const { db } = require('../config/firebase');
              await setDoc(doc(db, 'deletion_requests', user.uid), {
                uid: user.uid,
                email: user.email || '',
                name: user.name || '',
                username: user.username || '',
                role: user.role || 'Student',
                reason: 'Requested from App Settings',
                status: 'pending',
                timestamp: serverTimestamp()
              });

              const email = 'mcemotihari.tech@gmail.com';
              const subject = encodeURIComponent('Account delete request');
              const body = encodeURIComponent(
                `Hi MCE Connect Support Team,\n\nI would like to request the permanent deletion of my MCE Connect profile card and associated account data. Please find my account details below:\n\n` +
                `Name: ${user.name || ''}\n` +
                `Email: ${user.email || ''}\n` +
                `Phone: ${user.phone || ''}\n` +
                `Username: @${user.username || ''}\n\n` +
                `Reason for deletion (optional):\n`
              );

              const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
              await Linking.openURL(mailtoUrl);
            } catch (e: any) {
              console.error('Mail redirect failed:', e);
              showPremiumAlert('Mail Error', 'Default email app open karne me error aaya. Kripya mcemotihari.tech@gmail.com par direct mail karein!', 'error');
            }
          }
        }
      ]
    );
  };

  const handleShareOwnProfile = async () => {
    try {
      const profileUrl = `https://mcemotihari-app.web.app/@${user.username || 'username'}`;
      
      const rolePrefix = user.role === 'Student' ? 'B.Tech Student' : user.role === 'Alumni' ? 'MCE Alumni' : user.role === 'Faculty' ? 'MCE Faculty' : 'MCE Member';
      const departmentLabel = user.department ? ` | ${user.department}` : '';

      let shareMessage = `Hey MCEians! 👋\n`;
      shareMessage += `Let's sync up on MCE Connect—our community space developed by Alumni & Students for college notices, alumni connections, and study resources.\n\n`;
      shareMessage += `${user.name.toUpperCase()}\n`;
      shareMessage += `${rolePrefix}${departmentLabel}\n\n`;
      shareMessage += `Check out my profile card:\n`;
      shareMessage += `🔗 ${profileUrl}\n\n`;
      shareMessage += `📲 Build your verified profile card today!`;

      await Share.share({
        title: `${user.name}'s Profile`,
        message: shareMessage,
      });
    } catch (error) {
      console.warn('Share error:', error);
    }
  };

  const handleOpenLink = async (url?: string) => {
    if (!url) return;
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    
    if (Platform.OS === 'web') {
      const newWindow = window.open(formattedUrl, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        window.location.href = formattedUrl;
      }
      return;
    }
    
    try {
      const supported = await Linking.canOpenURL(formattedUrl);
      if (supported) {
        await Linking.openURL(formattedUrl);
      } else {
        showPremiumAlert('Unable to open URL', `The URL pattern "${formattedUrl}" is not supported.`, 'warning');
      }
    } catch (error) {
      showPremiumAlert('Error', 'Failed to open the link.', 'error');
    }
  };

  const handleOpenExternalLinkWithConfirmation = (url?: string) => {
    if (!url) return;
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    
    if (Platform.OS === 'web') {
      const confirm = window.confirm(`Open external website?\n\nDo you want to visit:\n${formattedUrl}?`);
      if (confirm) {
        const newWindow = window.open(formattedUrl, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          window.location.href = formattedUrl;
        }
      }
      return;
    }
    
    Alert.alert(
      'Open External Link',
      `Do you want to open this external link in your browser?\n\n${formattedUrl}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => Linking.openURL(formattedUrl) }
      ]
    );
  };

  if (!isStoreHydrated || (isAuthLoading && !user)) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="small" color="#F97316" />
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: theme.background }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.container, { flex: 1, backgroundColor: theme.background, paddingTop: insets.top }]}>
          <ScrollView 
            contentContainerStyle={[styles.loginScrollContainer, { paddingBottom: Platform.OS === 'android' ? 240 : 130 }]} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
          >
          {/* Background Neon Orbs */}
          <View style={styles.loginGlowOrb1} />
          <View style={styles.loginGlowOrb2} />

          {/* Header section */}
          <View style={styles.loginHeaderContainer}>
            <Image
              source={require('../../assets/images/mce-logo.png')} // College Seal
              style={styles.loginLogo}
            />
            <Text style={[styles.loginCollegeName, { color: theme.text }]}>MCE Motihari</Text>
            <Text style={styles.loginAppSubtitle}>Motihari College of Engineering</Text>
          </View>

          {/* Glassmorphic Box */}
          <View style={[styles.loginGlassCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <Text style={[styles.loginCardTitle, { color: theme.text }]}>Profile Account Access 🔒</Text>
            <Text style={styles.loginCardSubTitle}>— WELCOME GUEST —</Text>

            <Text style={styles.loginStepNotice}>
              MCE Connect portal me notices, forums, networks aur batchmates se judne ke liye apna account sign in karein. Aap explore bina login ke bhi kar sakte hain.
            </Text>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={[styles.loginGoogleBrandBtn, { width: '100%' }]}
              onPress={handleProfileGoogleSignIn}
              disabled={isProfileLoggingIn}
              activeOpacity={0.85}
            >
              {isProfileLoggingIn ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Image
                    source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/1024px-Google_%22G%22_logo.svg.png' }}
                    style={styles.loginGoogleIcon}
                  />
                  <Text style={styles.loginGoogleBrandBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.loginDividerContainer}>
              <View style={[styles.loginDividerLine, { backgroundColor: theme.cardBorder }]} />
              <Text style={styles.loginDividerText}>OR SIGN IN WITH PASSWORD</Text>
              <View style={[styles.loginDividerLine, { backgroundColor: theme.cardBorder }]} />
            </View>

            {/* Identifier Input */}
            <View style={styles.loginInputContainer}>
              <Text style={[styles.loginInputLabel, { color: theme.text }]}>Email, Username or Phone</Text>
              <View style={[styles.loginInputFieldContainer, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                <Ionicons name="mail-outline" size={16} color={theme.textSecondary} style={styles.loginInputIcon} />
                <TextInput
                  style={[styles.loginInputField, { color: theme.text }]}
                  placeholder="Enter email, username or 10-digit phone"
                  placeholderTextColor={theme.textSecondary}
                  value={profileEmail}
                  onChangeText={setProfileEmail}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.loginInputContainer}>
              <Text style={[styles.loginInputLabel, { color: theme.text }]}>Password</Text>
              <View style={[styles.loginInputFieldContainer, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                <Ionicons name="lock-closed-outline" size={16} color={theme.textSecondary} style={styles.loginInputIcon} />
                <TextInput
                  style={[styles.loginInputField, { flex: 1, color: theme.text }]}
                  placeholder="Enter password"
                  placeholderTextColor={theme.textSecondary}
                  value={profilePassword}
                  onChangeText={setProfilePassword}
                  secureTextEntry={!isProfilePasswordVisible}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setIsProfilePasswordVisible(!isProfilePasswordVisible)} style={{ paddingHorizontal: 10 }}>
                  <Ionicons name={isProfilePasswordVisible ? "eye-outline" : "eye-off-outline"} size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.loginSubmitBtn}
              onPress={handleProfileTraditionalLoginSubmit}
              disabled={isProfileTraditionalLoggingIn}
              activeOpacity={0.85}
            >
              {isProfileTraditionalLoggingIn ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.loginSubmitBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.loginInfoText}>
            *Sign in allows students & alumni to write posts, send connection requests, and access materials.
          </Text>

          <TouchableOpacity 
            onPress={() => router.push('/privacy-policy')} 
            style={styles.loginPrivacyLinkContainer}
            activeOpacity={0.7}
          >
            <Text style={styles.loginPrivacyLinkText}>
              Privacy & Platform Policies
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    );
  }

  // Profile strength percentage calculation
  const getCompletionPercentage = () => {
    let score = 0;
    if (user.name) score += 20;
    if (user.email) score += 20;
    if (user.role && user.role !== 'Guest') score += 20;
    if (user.department) score += 20;
    if (user.batch || user.rollNo) score += 20;
    return score;
  };
  const completionPercentage = getCompletionPercentage();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.glowOrb1} />
      <View style={styles.glowOrb2} />

      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={profileRefreshing}
            onRefresh={handleProfileRefresh}
            colors={['#8B5CF6']}
            tintColor="#8B5CF6"
          />
        }
      >
        {/* 1. Cover Section banner */}
        <View style={[styles.coverSection, { backgroundColor: '#001b59' }]}>
          <View style={styles.coverImageMask}>
            <Image 
              source={require('../../assets/images/NAB.png')} 
              style={styles.coverImage} 
              resizeMode="contain" 
            />
          </View>
          <View style={styles.coverOverlay} />

          {/* Floating Back Button */}
          <TouchableOpacity
            style={[styles.floatingBackBtn, { top: 14 + insets.top }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Floating Settings Button */}
          <TouchableOpacity
            style={[styles.floatingShareBtn, { right: 60 }]}
            onPress={() => setIsSettingsVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Floating Share Button */}
          <TouchableOpacity
            style={styles.floatingShareBtn}
            onPress={handleShareOwnProfile}
            activeOpacity={0.8}
          >
            <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* 2. Profile Card Header */}
        <View style={[styles.profileHeaderCard, styles.profileHeaderCardShift, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, alignItems: 'center' }]}>

          <TouchableOpacity style={styles.avatarContainer} onPress={user.role !== 'Guest' ? openPhotoModal : undefined} activeOpacity={0.85}>
            {user.role === 'Guest' && !user.email ? (
              <Image
                source={require('../../assets/images/mce-logo.png')}
                style={[
                  styles.avatar,
                  (user.role === 'Guest' || !user.role) && { borderColor: '#F97316', borderWidth: 2 },
                ]}
              />
            ) : (user.photoUrl && user.photoUrl.trim() !== '' && user.photoUrl.startsWith('http')) ? (
              <Image
                source={{ uri: user.photoUrl }}
                style={[
                  styles.avatar,
                  user.role === 'Student' && styles.mceanBorder,
                  user.role === 'Alumni' && styles.alumniBorder,
                  (user.role === 'Guest' || !user.role) && { borderColor: '#F97316', borderWidth: 2 },
                ]}
              />
            ) : (
              <InitialsAvatar
                name={user.name || user.username || 'User'}
                size={84}
                style={[
                  styles.avatar,
                  user.role === 'Student' && styles.mceanBorder,
                  user.role === 'Alumni' && styles.alumniBorder,
                  (user.role === 'Guest' || !user.role) && { borderColor: '#F97316', borderWidth: 2 },
                ]}
              />
            )}
            {user.role !== 'Guest' && (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Privacy Toggle Badge */}
          {user.role !== 'Guest' && (
            <TouchableOpacity 
              style={{
                position: 'absolute',
                top: -30,
                right: 20,
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.cardBorder,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
              onPress={handleTogglePrivacy}
              activeOpacity={0.8}
            >
              <Ionicons name={user.isPrivate ? "lock-closed" : "globe"} size={14} color={user.isPrivate ? "#EF4444" : "#22C55E"} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.text }}>
                {user.isPrivate ? 'Private' : 'Public'}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.userName, { color: theme.text, textAlign: 'center', marginTop: 20 }]}>{user.role === 'Guest' && !user.email ? 'Guest Explorer' : user.name}</Text>
          {user.role === 'Guest' && !user.email && (
            <Text style={[styles.userEmail, { color: theme.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              Sign in to unlock professional campus lobbies
            </Text>
          )}

          {/* Badge Display */}
          <View style={styles.badgeRow}>
            <VerifiedBadge role={user.adminRole ? 'Admin' : user.role} size="medium" />
          </View>

          {/* In-Place Inline Bio Editor (At a Time Add / Edit) */}
          {isInlineEditingBio ? (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 10,
              paddingHorizontal: 16,
              alignSelf: 'stretch',
              gap: 8
            }}>
              <TextInput
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  backgroundColor: theme.background,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  fontSize: 13.5,
                  color: theme.text,
                  fontStyle: 'italic'
                }}
                value={inlineBioText}
                onChangeText={setInlineBioText}
                placeholder="Write your bio status..."
                placeholderTextColor={theme.textSecondary}
                autoFocus
                maxLength={100}
              />
              <TouchableOpacity
                onPress={() => handleSaveInlineBio(inlineBioText)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(22, 163, 74, 0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(22, 163, 74, 0.25)'
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={16} color="#16A34A" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsInlineEditingBio(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.25)'
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={{
                marginTop: 10,
                paddingHorizontal: 20,
                paddingVertical: 10,
                alignSelf: 'stretch',
              }}
              onPress={() => {
                setInlineBioText(user.vibeStatus || '');
                setIsInlineEditingBio(true);
              }}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {user.vibeStatus ? (
                  <>
                    <Text style={{
                      fontSize: 13.5,
                      fontWeight: '600',
                      lineHeight: 18,
                      fontStyle: 'italic',
                      color: theme.textSecondary,
                      textAlign: 'center',
                    }}>
                      "{user.vibeStatus}"
                    </Text>
                    <Ionicons name="pencil" size={12} color="#F97316" />
                  </>
                ) : (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    borderColor: theme.cardBorder,
                    borderWidth: 1,
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    backgroundColor: theme.background
                  }}>
                    <Ionicons name="add" size={12} color={theme.textSecondary} />
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: theme.textSecondary,
                    }}>
                      bio
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          
          {/* Compact Social & Web Links Row */}
          {(() => {
            const links = user.links || {};
            const customLinks = user.customLinks || [];
            const activeLinksList = [];

            if (links.portfolio && links.portfolio.trim()) activeLinksList.push({ key: 'portfolio', value: links.portfolio });
            if (links.website && links.website.trim()) activeLinksList.push({ key: 'website', value: links.website });
            if (links.linkedin && links.linkedin.trim()) activeLinksList.push({ key: 'linkedin', value: links.linkedin });
            if (links.github && links.github.trim()) activeLinksList.push({ key: 'github', value: links.github });
            if (links.instagram && links.instagram.trim()) activeLinksList.push({ key: 'instagram', value: links.instagram });
            if (links.googlescholar && links.googlescholar.trim()) activeLinksList.push({ key: 'googlescholar', value: links.googlescholar });
            if (links.youtube && links.youtube.trim()) activeLinksList.push({ key: 'youtube', value: links.youtube });
            if (links.facebook && links.facebook.trim()) activeLinksList.push({ key: 'facebook', value: links.facebook });
            if (links.twitter && links.twitter.trim()) activeLinksList.push({ key: 'twitter', value: links.twitter });

            customLinks.forEach((link: { title: string, url: string }) => {
              if (link.title && link.title.trim() && link.url && link.url.trim()) {
                activeLinksList.push({ key: `custom_${link.title}_${link.url}`, value: link.url });
              }
            });

            if (activeLinksList.length === 0) return null;

            return (
              <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12, paddingHorizontal: 16 }}>
                {activeLinksList.map((item) => {
                  let iconName: any = 'globe-outline';
                  let brandColor = '#06B6D4';
                  
                  if (item.key === 'linkedin' || item.key.includes('linkedin')) { iconName = 'logo-linkedin'; brandColor = '#0A66C2'; }
                  else if (item.key === 'instagram' || item.key.includes('instagram')) { iconName = 'logo-instagram'; brandColor = '#E1306C'; }
                  else if (item.key === 'facebook' || item.key.includes('facebook')) { iconName = 'logo-facebook'; brandColor = '#1877F2'; }
                  else if (item.key === 'twitter' || item.key.includes('twitter')) { iconName = 'logo-twitter'; brandColor = theme.isDark ? '#FFFFFF' : '#000000'; }
                  else if (item.key === 'github' || item.key.includes('github')) { iconName = 'logo-github'; brandColor = theme.isDark ? '#FFFFFF' : '#24292E'; }
                  else if (item.key === 'youtube' || item.key.includes('youtube')) { iconName = 'logo-youtube'; brandColor = '#FF0000'; }
                  else if (item.key === 'googlescholar' || item.key.includes('scholar')) { iconName = 'school-outline'; brandColor = '#4285F4'; }
                  else if (item.key === 'portfolio') { iconName = 'briefcase-outline'; brandColor = '#0D9488'; }
                  else if (item.key === 'website') { iconName = 'globe-outline'; brandColor = '#0F766E'; }

                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                        borderWidth: 1,
                        borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => handleOpenExternalLinkWithConfirmation(item.value)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={iconName} size={18} color={brandColor} />
                    </TouchableOpacity>
                  );
                })}

                {/* Persistent Sleek Pencil Edit Links Button for owner */}
                <TouchableOpacity
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => setIsLinksModalVisible(true)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pencil" size={15} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          })()}

        </View>

        {/* 3. Bento Grid of Profile Sections */}
        <View style={styles.bentoGrid}>
          {/* Card 4: Stats & Impact Summary (Now at the very top of the Bento list) */}
          <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, marginBottom: 12 }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="analytics" size={16} color="#EC4899" />
              <Text style={[styles.cardTitle, { color: theme.text, fontSize: 13, fontWeight: '700' }]}>Impact Highlights</Text>
            </View>
            
            <View style={[styles.statsRow, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }]}>
              <View style={[styles.statCell, { flex: 1, minWidth: 80, alignItems: 'center' }]}>
                <Text style={[styles.statNum, { color: theme.text, fontSize: 18, fontWeight: 'bold' }]}>
                  {profileStats.totalHearts}
                </Text>
                <Text style={[styles.statLabel, { fontSize: 10, color: theme.textSecondary, marginTop: 4, textAlign: 'center' }]}>Hearts Received</Text>
              </View>
              <View style={[styles.statDivider, { width: 1, height: 28, backgroundColor: theme.cardBorder }]} />
              <View style={[styles.statCell, { flex: 1, minWidth: 80, alignItems: 'center' }]}>
                <Text style={[styles.statNum, { color: theme.text, fontSize: 18, fontWeight: 'bold' }]}>{profileStats.totalPosts}</Text>
                <Text style={[styles.statLabel, { fontSize: 10, color: theme.textSecondary, marginTop: 4, textAlign: 'center' }]}>Posts Shared</Text>
              </View>
              <View style={[styles.statDivider, { width: 1, height: 28, backgroundColor: theme.cardBorder }]} />
              <View style={[styles.statCell, { flex: 1, minWidth: 80, alignItems: 'center' }]}>
                <Text style={[styles.statNum, { color: theme.text, fontSize: 18, fontWeight: 'bold' }]}>
                  {profileStats.contributions}
                </Text>
                <Text style={[styles.statLabel, { fontSize: 10, color: theme.textSecondary, marginTop: 4, textAlign: 'center' }]}>Contributions</Text>
              </View>
            </View>
          </View>

          {/* Card 1: Academic Credentials */}
          <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="school" size={16} color="#F97316" />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {user.role === 'Faculty' ? 'Faculty Credentials' : user.role === 'Other' ? 'Other Credentials' : 'Verified Credentials'}
                </Text>
                <TouchableOpacity style={styles.cardEditBtn} onPress={openEditProfile}>
                  <Ionicons name="pencil" size={13} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.credentialsGrid}>
                {user.role === 'Other' ? (
                  <View style={styles.credentialItem}>
                    <Text style={styles.credentialLabel}>Official Designation</Text>
                    <Text style={[styles.credentialVal, { color: theme.text }]}>Verified MCE Staff Member</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.credentialItem}>
                      <Text style={styles.credentialLabel}>Branch / Department</Text>
                      <Text style={[styles.credentialVal, { color: theme.text }]}>{user.department || 'N/A'}</Text>
                    </View>

                    {user.role !== 'Faculty' && (
                      <>
                        <View style={styles.credentialRow}>
                          <View style={styles.credentialHalf}>
                            <Text style={styles.credentialLabel}>Academic Batch</Text>
                            <Text style={[styles.credentialVal, { color: theme.text }]}>{user.batch || 'N/A'}</Text>
                          </View>
                          {user.rollNo ? (
                            <View style={styles.credentialHalf}>
                              <Text style={styles.credentialLabel}>Roll Number</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <Text style={[
                                  styles.credentialVal, 
                                  { color: theme.text },
                                  !isRollVisible && { textShadowColor: theme.textSecondary, textShadowRadius: 6, color: 'transparent' }
                                ]}>
                                  {user.rollNo}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <View style={[styles.privateBadge, { backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.12)' : '#E6F4EA' }]}>
                                    <Ionicons name="lock-closed" size={10} color="#10B981" />
                                    <Text style={styles.privateBadgeText}>Private</Text>
                                  </View>
                                  <TouchableOpacity onPress={() => setIsRollVisible(!isRollVisible)} style={{ padding: 4 }} activeOpacity={0.7}>
                                    <Ionicons name={isRollVisible ? "eye-outline" : "eye-off-outline"} size={16} color={theme.textSecondary} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          ) : null}
                        </View>
                        
                        {user.regNo ? (
                          <View style={styles.credentialItem}>
                            <Text style={styles.credentialLabel}>Registration Number</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <Text style={[
                                styles.credentialVal, 
                                { color: theme.text },
                                !isRegVisible && { textShadowColor: theme.textSecondary, textShadowRadius: 6, color: 'transparent' }
                              ]}>
                                {user.regNo}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={[styles.privateBadge, { backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.12)' : '#E6F4EA' }]}>
                                  <Ionicons name="lock-closed" size={10} color="#10B981" />
                                  <Text style={styles.privateBadgeText}>Private</Text>
                                </View>
                                <TouchableOpacity onPress={() => setIsRegVisible(!isRegVisible)} style={{ padding: 4 }} activeOpacity={0.7}>
                                  <Ionicons name={isRegVisible ? "eye-outline" : "eye-off-outline"} size={16} color={theme.textSecondary} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        ) : null}
                      </>
                    )}
                  </>
                )}
              </View>
            </View>

          {/* LinkedIn-style Activity / Timeline Card (Always right below Credentials) */}
          <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, marginBottom: 12 }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="newspaper-outline" size={16} color="#10B981" />
              <Text style={[styles.cardTitle, { color: theme.text, fontSize: 13, fontWeight: '700' }]}>Activity</Text>
              <TouchableOpacity
                style={styles.cardEditBtn}
                onPress={() => useAppStore.getState().setCreatePostVisible(true)}
              >
                <Ionicons name="add" size={16} color={theme.text} />
              </TouchableOpacity>
            </View>

            {myPosts.length === 0 ? (
              <View style={styles.emptyTimelineContainer}>
                <Text style={[styles.emptyTimelineText, { color: theme.textSecondary }]}>
                  No campus thoughts shared yet. Tap the '+' icon above to write your first post!
                </Text>
              </View>
            ) : (
              <View>
                {/* Horizontal Paging Carousel of up to 10 latest posts */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  contentContainerStyle={{ gap: 12, paddingBottom: 8, paddingHorizontal: 2 }}
                >
                  {myPosts.slice(0, 10).map((post) => {
                    const getPostTypeBadge = (p: any) => {
                      if (p.isAnonymous) {
                        return { label: 'Anonymous', emoji: '🔒', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.08)' };
                      }
                      if (p.pollOptions && p.pollOptions.length > 0) {
                        return { label: 'Poll', emoji: '📊', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.08)' };
                      }
                      if (p.category === 'Placement' || p.category === 'Sports' || p.category === 'Alumni') {
                        return { label: 'Event', emoji: '📅', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.08)' };
                      }
                      return { label: 'Public', emoji: '💬', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.08)' };
                    };

                    const badge = getPostTypeBadge(post);
                    const titleText = post.title || post.content || '';
                    const previewText = titleText.length > 80 ? titleText.slice(0, 77) + '...' : titleText;
                    
                    return (
                      <TouchableOpacity
                        key={post.id}
                        activeOpacity={0.85}
                        onPress={() => router.push(`/post/${post.id}?from=profile`)}
                        style={{
                          width: width - 80,
                          backgroundColor: theme.background,
                          borderWidth: 1,
                          borderColor: theme.cardBorder,
                          borderRadius: 14,
                          padding: 14,
                          shadowColor: '#000',
                          shadowOpacity: 0.01,
                          shadowRadius: 2,
                          elevation: 1,
                          gap: 10,
                        }}
                      >
                        {/* Meta Row: Date & Badge */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: badge.bgColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ fontSize: 9.5, color: badge.color, fontWeight: '700' }}>
                              {badge.emoji} {badge.label}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                            {getFormattedPostTime(post.createdAt, post.timestamp)}
                          </Text>
                        </View>

                        {/* Title/Caption Preview */}
                        <Text style={{ fontSize: 12.5, fontWeight: 'bold', color: theme.text, lineHeight: 18 }} numberOfLines={2}>
                          {previewText}
                        </Text>

                        {/* Stats Row: Hearts & Comments */}
                        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', borderTopWidth: 0.5, borderTopColor: theme.cardBorder, paddingTop: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="heart" size={13} color="#EF4444" />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>
                              {post.claps || 0}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="chatbubble-outline" size={12} color={theme.textSecondary} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>
                              {post.commentsCount || 0}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Show All Posts Trigger Button (LinkedIn-Style) */}
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderTopWidth: 1,
                    borderTopColor: theme.cardBorder,
                    paddingTop: 12,
                    marginTop: 10,
                  }}
                  onPress={() => router.push('/activity-feed')}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>
                    Show all
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={theme.text} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Owner Quick Add Shortcuts Pill Bar (Visible only when some bento card is hidden) */}
          {(!user.skills?.length || !user.experiences?.length || (!user.links?.github && !user.links?.linkedin && !user.links?.instagram)) && (
            <View style={{ marginBottom: 14, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.textSecondary, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                ⚡ Quick Add Profile Sections
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                {!user.skills?.length && (
                  <TouchableOpacity
                    style={[styles.quickAddPill, { borderColor: '#A855F7', backgroundColor: theme.isDark ? 'rgba(168, 85, 247, 0.08)' : '#F3E8FF' }]}
                    onPress={() => setIsSkillsModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={14} color="#9333EA" />
                    <Text style={[styles.quickAddPillText, { color: '#9333EA' }]}>Skills</Text>
                  </TouchableOpacity>
                )}
                
                {!user.experiences?.length && (
                  <TouchableOpacity
                    style={[styles.quickAddPill, { borderColor: '#3B82F6', backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF' }]}
                    onPress={() => setIsAddExpVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={14} color="#2563EB" />
                    <Text style={[styles.quickAddPillText, { color: '#2563EB' }]}>Experience</Text>
                  </TouchableOpacity>
                )}

                {(!user.links?.github && !user.links?.linkedin && !user.links?.instagram) && (
                  <TouchableOpacity
                    style={[styles.quickAddPill, { borderColor: '#06B6D4', backgroundColor: theme.isDark ? 'rgba(6, 182, 212, 0.08)' : '#ECFEFF' }]}
                    onPress={() => setIsLinksModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={14} color="#0891B2" />
                    <Text style={[styles.quickAddPillText, { color: '#0891B2' }]}>@social</Text>
                  </TouchableOpacity>
                )}

                {/* Highly requested three-dots menu pill for Education & Publications */}
                <TouchableOpacity
                  style={[styles.quickAddPill, { borderColor: theme.textSecondary, backgroundColor: theme.isDark ? 'rgba(148, 163, 184, 0.08)' : '#F1F5F9' }]}
                  onPress={() => setIsMoreAddModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="ellipsis-horizontal" size={14} color={theme.text} />
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* Card 2: Interactive Skills Tag Cloud */}
          {user.skills && user.skills.length > 0 && (
            <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="sparkles" size={16} color="#A855F7" />
                <Text style={[styles.cardTitle, { color: theme.text }]}>My Tech Skills</Text>
                <TouchableOpacity style={styles.cardEditBtn} onPress={() => setIsSkillsModalVisible(true)}>
                  <Ionicons name="pencil" size={13} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.tagGrid}>
                {user.skills.map((skill: string, index: number) => (
                  <View key={index} style={[styles.skillTag, { backgroundColor: theme.isDark ? 'rgba(168, 85, 247, 0.08)' : '#F3E8FF', borderColor: theme.isDark ? 'rgba(168, 85, 247, 0.2)' : '#E9D5FF' }]}>
                    <Text style={[styles.skillTagText, { color: '#9333EA' }]}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Relocated Experiences Card */}
          {user.experiences && user.experiences.length > 0 && (
            <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="briefcase" size={16} color="#3B82F6" />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Experiences</Text>
                <TouchableOpacity
                  style={styles.cardEditBtn}
                  onPress={() => setIsAddExpVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color={theme.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.experienceList}>
                {user.experiences.slice(0, 3).map((exp: Experience) => (
                  <View key={exp.id} style={[styles.experienceItem, { borderBottomColor: theme.cardBorder }]}>
                    <View style={styles.experienceIconFrame}>
                      <Ionicons name="briefcase-outline" size={18} color="#3B82F6" />
                    </View>
                    <View style={styles.experienceDetails}>
                      <Text style={[styles.experienceRole, { color: theme.text }]}>{exp.role.replace(/,\\s*$/, '')}</Text>
                      <Text style={[styles.experienceCompany, { color: theme.textSecondary }]}>
                        {exp.company} • <Text style={styles.experienceTypeTag}>{exp.employmentType}</Text>
                      </Text>
                      <Text style={styles.experienceDates}>
                        {exp.startMonth?.substring(0, 3)} {exp.startYear} - {exp.isCurrent ? 'Present' : `${exp.endMonth?.substring(0, 3)} ${exp.endYear}`}
                      </Text>
                      {exp.description ? (
                        <Text style={[styles.experienceDesc, { color: theme.textSecondary }]}>{exp.description}</Text>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4, alignSelf: 'flex-start' }}>
                      <TouchableOpacity
                        style={styles.deleteExperienceBtn}
                        onPress={() => handleEditExperience(exp)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="pencil-outline" size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteExperienceBtn}
                        onPress={() => handleDeleteExperience(exp.id)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {user.experiences.length > 3 && (
                <TouchableOpacity
                  style={[styles.viewAllPostsBtn, { borderColor: theme.cardBorder, marginTop: 12 }]}
                  onPress={() => setIsAllExperiencesVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.viewAllPostsBtnText, { color: theme.text }]}>
                    View All Experiences ({user.experiences.length})
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.text} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Education Card */}
          {user.education && user.education.length > 0 && (
            <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, marginTop: 12 }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="school" size={16} color="#10B981" />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Education</Text>
                <TouchableOpacity
                  style={styles.cardEditBtn}
                  onPress={() => setIsAddEduVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color={theme.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.experienceList}>
                {user.education.map((edu: any) => (
                  <View key={edu.id} style={[styles.experienceItem, { borderBottomColor: theme.cardBorder }]}>
                    <View style={[styles.experienceIconFrame, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
                      <Ionicons name="school-outline" size={18} color="#10B981" />
                    </View>
                    <View style={styles.experienceDetails}>
                      <Text style={[styles.experienceRole, { color: theme.text }]}>{edu.degree} in {edu.fieldOfStudy}</Text>
                      <Text style={[styles.experienceCompany, { color: theme.textSecondary }]}>{edu.school}</Text>
                      <Text style={styles.experienceDates}>
                        {edu.startYear} - {edu.isCurrent ? 'Present' : edu.endYear}
                      </Text>
                      {edu.description ? (
                        <Text style={[styles.experienceDesc, { color: theme.textSecondary }]}>{edu.description}</Text>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4, alignSelf: 'flex-start' }}>
                      <TouchableOpacity
                        style={styles.deleteExperienceBtn}
                        onPress={() => handleEditEducation(edu)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="pencil-outline" size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteExperienceBtn}
                        onPress={() => handleDeleteEducation(edu.id)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Conference / Publication Card */}
          {user.publications && user.publications.length > 0 && (
            <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, marginTop: 12 }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="document-text" size={16} color="#F43F5E" />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Conferences & Publications</Text>
                <TouchableOpacity
                  style={styles.cardEditBtn}
                  onPress={() => setIsAddPubVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color={theme.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.experienceList}>
                {user.publications.map((pub: any) => (
                  <View key={pub.id} style={[styles.experienceItem, { borderBottomColor: theme.cardBorder }]}>
                    <View style={[styles.experienceIconFrame, { backgroundColor: 'rgba(244, 63, 94, 0.08)' }]}>
                      <Ionicons name="document-text-outline" size={18} color="#F43F5E" />
                    </View>
                    <View style={styles.experienceDetails}>
                      <Text style={[styles.experienceRole, { color: theme.text }]}>{pub.title}</Text>
                      <Text style={[styles.experienceCompany, { color: theme.textSecondary }]}>
                        {pub.publisher} • {pub.publicationDate}
                      </Text>
                      {pub.authors ? (
                        <Text style={[styles.experienceCompany, { color: theme.textSecondary, fontSize: 11 }]}>
                          Authors: {pub.authors}
                        </Text>
                      ) : null}
                      {pub.description ? (
                        <Text style={[styles.experienceDesc, { color: theme.textSecondary, marginTop: 4 }]}>{pub.description}</Text>
                      ) : null}
                      {pub.url ? (
                        <TouchableOpacity onPress={() => Linking.openURL(pub.url)} style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="link-outline" size={12} color="#3B82F6" style={{ marginRight: 2 }} />
                          <Text style={{ fontSize: 11, color: '#3B82F6', fontWeight: '600' }}>View Publication</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4, alignSelf: 'flex-start' }}>
                      <TouchableOpacity
                        style={styles.deleteExperienceBtn}
                        onPress={() => handleEditPublication(pub)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="pencil-outline" size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteExperienceBtn}
                        onPress={() => handleDeletePublication(pub.id)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Removed large social links card */}





        </View>


      </ScrollView>

      {/* ─── EDIT PROFILE SETTINGS MODAL ─── */}
      {isEditProfileVisible && (
      <Modal visible={isEditProfileVisible} animationType="slide" transparent onRequestClose={closeEditProfileWithCheck}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalBg, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.45)' }]}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={closeEditProfileWithCheck} 
            />
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Profile Settings</Text>
                <TouchableOpacity onPress={closeEditProfileWithCheck} activeOpacity={0.8}>
                  <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                 <Text style={styles.modalLabel}>Profile Designation Status</Text>
                <View style={styles.tabContainer}>
                  {(['Student', 'Alumni', 'Faculty', 'Other'] as const).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.tab, editRole === r && styles.activeTab]}
                      onPress={() => setEditRole(r)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.tabText, editRole === r && styles.activeTabText, { fontSize: 10.5 }]}>
                        {r === 'Other' ? 'Other' : r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Username input relocated to credentials modal */}

                {(editRole === 'Student' || editRole === 'Alumni') && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.modalLabel}>
                        MCE Roll Number {editRole === 'Student' ? '*' : '(Optional)'} {editRole === 'Alumni' ? '(Optional - 5 Digits)' : '(Strictly 5 Digits)'}
                      </Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. 20105 or 23142"
                        placeholderTextColor="#6D679E"
                        value={editRollNo}
                        onChangeText={setEditRollNo}
                        maxLength={5}
                        keyboardType="numeric"
                      />
                      <Text style={styles.privateNotice}>🔒 Private: Kept secure. Only you can see this.</Text>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.modalLabel}>
                        Registration Number {editRole === 'Student' ? '*' : '(Optional)'} {editRole === 'Alumni' ? '(Optional - 11 Digits)' : '(Strictly 11 Digits)'}
                      </Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. 20108116001"
                        placeholderTextColor="#6D679E"
                        value={editRegNo}
                        onChangeText={setEditRegNo}
                        maxLength={11}
                        keyboardType="numeric"
                      />
                      <Text style={styles.privateNotice}>🔒 Private: Kept secure. Only you can see this.</Text>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.modalLabel}>Academic Batch Years * (e.g. 2020-2024)</Text>
                      <TextInput
                        style={styles.modalInput}
                        placeholder="e.g. 2020-2024"
                        placeholderTextColor="#6D679E"
                        value={editBatch}
                        onChangeText={setEditBatch}
                      />
                    </View>
                  </>
                )}

                {(editRole === 'Student' || editRole === 'Alumni' || editRole === 'Faculty') && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.modalLabel}>Department / Branch *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalDeptScroller}>
                      {DEPARTMENTS.map((dept) => (
                        <TouchableOpacity
                          key={dept}
                          style={[
                            styles.modalDeptCard,
                            editDept === dept && styles.activeModalDeptCard
                          ]}
                          onPress={() => setEditDept(dept)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.modalDeptText, editDept === dept && styles.activeModalDeptText]}>
                            {dept}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {(editRole === 'Student' || editRole === 'Alumni' || editRole === 'Faculty') && (
                  <View style={{ marginTop: 12, padding: 12, backgroundColor: theme.background, borderRadius: 12, borderColor: theme.cardBorder, borderWidth: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>Privacy Controls</Text>
                    
                    {(editRole === 'Student' || editRole === 'Alumni') && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }}>Hide Academic Batch</Text>
                          <Text style={{ fontSize: 10.5, color: '#94A3B8' }}>Hide graduation year from public profile</Text>
                        </View>
                        <TouchableOpacity onPress={() => setEditIsBatchPrivate(!editIsBatchPrivate)}>
                          <Ionicons name={editIsBatchPrivate ? "toggle" : "toggle-outline"} size={32} color={editIsBatchPrivate ? "#F97316" : "#CBD5E1"} />
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary }}>Hide Department</Text>
                        <Text style={{ fontSize: 10.5, color: '#94A3B8' }}>Hide engineering branch from public profile</Text>
                      </View>
                      <TouchableOpacity onPress={() => setEditIsDeptPrivate(!editIsDeptPrivate)}>
                        <Ionicons name={editIsDeptPrivate ? "toggle" : "toggle-outline"} size={32} color={editIsDeptPrivate ? "#F97316" : "#CBD5E1"} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {editRole === 'Other' && (
                  <View style={{ marginVertical: 12, padding: 12, backgroundColor: '#ECFDF5', borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0' }}>
                    <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '600', lineHeight: 16 }}>
                      🛡️ Other Role: No academic batch, roll number or department registration is required.
                    </Text>
                  </View>
                )}

                <TouchableOpacity style={styles.saveSubmitBtn} onPress={handleSaveProfile} disabled={isSaving} activeOpacity={0.8}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveSubmitBtnText}>Save Profile Credentials</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      )}

      {/* ─── CREATE / CHANGE PASSWORD MODAL (LOGIN SETTING) ─── */}
      {isPasswordModalVisible && (
      <Modal visible={isPasswordModalVisible} animationType="slide" transparent onRequestClose={closePasswordWithCheck}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalBg, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.45)' }]}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={closePasswordWithCheck} 
            />
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {user.hasPassword ? 'Login Setting' : 'Configure Login Setting'}
                </Text>
                <TouchableOpacity onPress={closePasswordWithCheck} activeOpacity={0.8}>
                  <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <ScrollView ref={configScrollViewRef} contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* 1. Email Address (Permanent Google Auth ID - Locked) */}
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="lock-closed" size={12} color="#EF4444" style={{ marginRight: 4 }} />
                    <Text style={[styles.modalLabel, { color: theme.textSecondary, marginBottom: 0 }]}>Email Address (Linked ID)</Text>
                  </View>
                  <View style={{
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: theme.isDark ? 'rgba(30, 41, 59, 0.4)' : '#F1F5F9', 
                    borderColor: theme.cardBorder, 
                    borderWidth: 1.5, 
                    borderRadius: 12, 
                    overflow: 'hidden', 
                    opacity: 0.8
                  }}>
                    <View style={{ paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="mail" size={16} color={theme.textSecondary} />
                    </View>
                    <TextInput
                      style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 4, color: theme.textSecondary, fontSize: 13.5, fontWeight: '600' }}
                      value={user.email}
                      editable={false}
                    />
                  </View>
                  <Text style={{ fontSize: 10.5, color: theme.textSecondary, marginTop: 5, paddingLeft: 2 }}>
                    Email ID change nahi ho sakti, ye aapka primary sign-in ID hai.
                  </Text>
                </View>

                {/* 1.5 Display Name */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Full Display Name *</Text>
                  <View style={{
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: theme.background, 
                    borderColor: theme.cardBorder, 
                    borderWidth: 1.5, 
                    borderRadius: 12, 
                    overflow: 'hidden'
                  }}>
                    <View style={{ paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="person-outline" size={16} color={theme.textSecondary} />
                    </View>
                    <TextInput
                      style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 4, color: theme.text, fontSize: 13.5 }}
                      placeholder="e.g. Rahul Kumar"
                      placeholderTextColor="#6D679E"
                      value={editName}
                      onChangeText={(text) => {
                        setEditName(text);
                        if (editNameError) setEditNameError(null);
                      }}
                      maxLength={50}
                    />
                  </View>
                  {editNameError && (
                    <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: 'bold', marginTop: 4, marginLeft: 2 }}>
                      {editNameError}
                    </Text>
                  )}
                </View>

                {/* 2. Custom Unique Username (Locked for 6 Months if set recently) */}
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    {isUsernameLocked && <Ionicons name="lock-closed" size={12} color="#F59E0B" style={{ marginRight: 4 }} />}
                    <Text style={[styles.modalLabel, { color: theme.textSecondary, marginBottom: 0 }]}>Custom Unique Username (@) *</Text>
                  </View>
                  {isUsernameLocked ? (
                    <View style={{
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      backgroundColor: theme.isDark ? 'rgba(30, 41, 59, 0.4)' : '#F1F5F9', 
                      borderColor: theme.cardBorder, 
                      borderWidth: 1.5, 
                      borderRadius: 12, 
                      overflow: 'hidden', 
                      opacity: 0.8
                    }}>
                      <View style={{ paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '800', color: theme.textSecondary, fontSize: 14 }}>@</Text>
                      </View>
                      <TextInput
                        style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 4, color: theme.textSecondary, fontSize: 13.5, fontWeight: '600' }}
                        value={editUsername}
                        editable={false}
                      />
                    </View>
                  ) : (
                    <View style={{
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      backgroundColor: theme.background, 
                      borderColor: theme.cardBorder, 
                      borderWidth: 1.5, 
                      borderRadius: 12, 
                      overflow: 'hidden'
                    }}>
                      <View style={{ paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '800', color: theme.textSecondary, fontSize: 14 }}>@</Text>
                      </View>
                      <TextInput
                        style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 4, color: theme.text, fontSize: 13.5 }}
                        placeholder="e.g. raushan4851"
                        placeholderTextColor="#6D679E"
                        value={editUsername}
                        onChangeText={setEditUsername}
                        autoCapitalize="none"
                        maxLength={20}
                      />
                    </View>
                  )}
                  {isUsernameLocked ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, backgroundColor: theme.isDark ? 'rgba(245,158,11,0.08)' : '#FFFBEB', padding: 8, borderRadius: 8, borderColor: '#FDE68A', borderWidth: 0.5 }}>
                      <Ionicons name="alert-circle" size={13} color="#D97706" style={{ marginRight: 5 }} />
                      <Text style={{ fontSize: 10.5, color: '#B45309', fontWeight: '600', flex: 1 }}>
                        {usernameLockRemainingText}
                      </Text>
                    </View>
                  ) : (
                    <>
                      {usernameMessage ? (
                        <Text style={{
                          fontSize: 11,
                          color: usernameStatus === 'available' ? '#22C55E' : (usernameStatus === 'checking' ? theme.textSecondary : '#EF4444'),
                          marginTop: 6,
                          fontWeight: '600'
                        }}>
                          {usernameMessage}
                        </Text>
                      ) : (
                        <Text style={{ fontSize: 10.5, color: theme.textSecondary, marginTop: 5, paddingLeft: 2 }}>
                          ⚠️ Once set, it cannot be changed for 6 months.
                        </Text>
                      )}
                    </>
                  )}
                </View>

                {/* 3. Phone Number (Country Prefix +91, Masked display) */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Phone Number (10 Digits) *</Text>
                  <View style={{
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: theme.background, 
                    borderColor: theme.cardBorder, 
                    borderWidth: 1.5, 
                    borderRadius: 12, 
                    overflow: 'hidden'
                  }}>
                    <View style={{ 
                      paddingHorizontal: 12, 
                      paddingVertical: 10, 
                      backgroundColor: theme.isDark ? '#1E293B' : '#E2E8F0', 
                      borderRightWidth: 1.5, 
                      borderRightColor: theme.cardBorder, 
                      justifyContent: 'center', 
                      alignItems: 'center' 
                    }}>
                      <Text style={{ fontWeight: '700', color: theme.text, fontSize: 13.5 }}>+91</Text>
                    </View>
                    <TextInput
                      style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, color: theme.text, fontSize: 13.5 }}
                      placeholder="e.g. 98******67"
                      placeholderTextColor="#6D679E"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={isPhoneFocused ? phone : maskPhoneNumber(phone)}
                      onChangeText={setPhone}
                      onFocus={() => setIsPhoneFocused(true)}
                      onBlur={() => setIsPhoneFocused(false)}
                    />
                  </View>
                  {user.phone ? (
                    <Text style={{ fontSize: 10.5, color: theme.textSecondary, marginTop: 5, paddingLeft: 2, fontWeight: '500' }}>
                      Current: +91 {user.phone.slice(0, 3)}******{user.phone.slice(9)}
                    </Text>
                  ) : (
                    <Text style={{ fontSize: 10.5, color: theme.textSecondary, marginTop: 5, paddingLeft: 2 }}>
                      Format: +91 987... (10 digits enter karein).
                    </Text>
                  )}
                </View>

                {/* 4. Secure Password */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>
                    {user.hasPassword ? 'Change Secure Password' : 'Create Secure Password'}
                  </Text>
                  <View style={{
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: theme.background, 
                    borderColor: theme.cardBorder, 
                    borderWidth: 1.5, 
                    borderRadius: 12, 
                    overflow: 'hidden',
                    marginBottom: 0
                  }}>
                    <TextInput
                      style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, color: theme.text, fontSize: 13.5, height: 44 }}
                      placeholder={user.hasPassword ? "Enter new password to change or leave empty" : "Min 6 characters password"}
                      placeholderTextColor="#6D679E"
                      secureTextEntry={!isPasswordVisible}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => {
                        setSafeTimeout(() => {
                          configScrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 150);
                      }}
                    />
                    <TouchableOpacity 
                      style={{ paddingHorizontal: 12, height: '100%', flexDirection: 'row', alignItems: 'center', gap: 4 }} 
                      onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={18} color={theme.textSecondary} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>
                        {isPasswordVisible ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <PasswordHelperText
                    password={password}
                    result={validatePassword(password)}
                  />
                </View>

                <TouchableOpacity style={styles.saveSubmitBtn} onPress={handleSavePassword} activeOpacity={0.8}>
                  <Text style={styles.saveSubmitBtnText}>Confirm Settings</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      )}

      {/* ─── PROFILE PICTURE PRESETS GRID SELECTION MODAL ─── */}
      {isPhotoModalVisible && (
      <Modal visible={isPhotoModalVisible} animationType="slide" transparent onRequestClose={closePhotoWithCheck}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalBg, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.45)' }]}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={closePhotoWithCheck} 
            />
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Choose Avatar Profile Preset</Text>
                <TouchableOpacity onPress={closePhotoWithCheck} activeOpacity={0.8}>
                  <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: '#F97316',
                    marginBottom: 16,
                    gap: 8,
                  }}
                  onPress={handleChooseFromGallery}
                  disabled={isUploading}
                  activeOpacity={0.8}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#F97316" />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={20} color="#F97316" />
                      <Text style={{ color: '#F97316', fontWeight: 'bold', fontSize: 13.5 }}>Choose Photo from Gallery</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.customUrlToggle, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                  onPress={() => setIsCustomPhotoUrlVisible(visible => !visible)}
                  activeOpacity={0.8}
                >
                  <View style={styles.customUrlToggleLeft}>
                    <Ionicons name="link-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.customUrlToggleText, { color: theme.text }]}>Use Image URL</Text>
                  </View>
                  <Ionicons name={isCustomPhotoUrlVisible ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
                </TouchableOpacity>

                {isCustomPhotoUrlVisible && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Paste Custom Avatar Image URL</Text>
                    <TextInput
                      style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                      placeholder="https://example.com/avatar.jpg"
                      placeholderTextColor="#94A3B8"
                      value={customPhotoUrl}
                      onChangeText={value => {
                        setCustomPhotoUrl(value);
                        if (value.trim()) {
                          setSelectedPhoto(value.trim());
                        }
                      }}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>
                )}

                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
                  <Text style={[styles.dividerText, { color: theme.textSecondary }]}>OR SELECT PRESET AVATAR</Text>
                  <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
                </View>

                <View style={styles.presetsGrid}>
                  {AVATAR_PRESETS.map((preset, idx) => {
                    const isSelected = selectedPhoto === preset.url && !customPhotoUrl;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.presetCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }, isSelected && styles.presetCardSelected]}
                        onPress={() => {
                          setSelectedPhoto(preset.url);
                          setCustomPhotoUrl('');
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.presetImageWrap}>
                          <Image source={{ uri: preset.url }} style={styles.presetImage} />
                          <View style={styles.presetIconBadge}>
                            <Ionicons name={preset.icon as any} size={11} color="#FFFFFF" />
                          </View>
                        </View>
                        <Text style={[styles.presetLabel, { color: theme.text }, isSelected && styles.presetLabelActive]}>{preset.label}</Text>
                        <Text style={[styles.presetHint, { color: theme.textSecondary }]}>{preset.hint}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={styles.saveSubmitBtn}
                  onPress={handleSaveAvatar}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveSubmitBtnText}>Save Selected Avatar</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      )}

      {/* ─── MODULAR EXPLORE ACTIONS MODAL WRAPPERS ─── */}
      {isAboutVisible && <AboutModal visible={isAboutVisible} onClose={() => setIsAboutVisible(false)} />}
      {isMapVisible && <CampusMapModal visible={isMapVisible} onClose={() => setIsMapVisible(false)} />}
      {isEventsListVisible && <EventsModal visible={isEventsListVisible} onClose={() => setIsEventsListVisible(false)} />}
      {isHolidaysVisible && <HolidaysModal visible={isHolidaysVisible} onClose={() => setIsHolidaysVisible(false)} />}
      {isPrivacyVisible && <PrivacyModal visible={isPrivacyVisible} onClose={() => setIsPrivacyVisible(false)} />}
      {isSettingsVisible && (
        <SettingsModal 
          visible={isSettingsVisible} 
          onClose={() => setIsSettingsVisible(false)} 
          onTriggerPassword={openPasswordConfig} 
          onTriggerLogout={handleSignOut}
          onTriggerDeleteProfile={handleDeleteProfile}
          onOpenAbout={() => {
            setIsSettingsVisible(false);
            setSafeTimeout(() => setIsAboutVisible(true), 280);
          }}
          onOpenPrivacy={() => {
            setIsSettingsVisible(false);
            setSafeTimeout(() => setIsPrivacyVisible(true), 280);
          }}
        />
      )}
      {isGalleryVisible && <StudyMaterialsModal visible={isGalleryVisible} onClose={() => setIsGalleryVisible(false)} />}
      {isNotepadVisible && <NotepadModal visible={isNotepadVisible} onClose={() => setIsNotepadVisible(false)} />}

      <CreatePostModal
        visible={isCreatePostVisible}
        onClose={() => setCreatePostVisible(false)}
        presetType={createPostPreset}
      />

      {/* ─── SHOW ALL USER POSTS MODAL (LINKEDIN-STYLE) ─── */}
      {isAllPostsModalVisible && (
        <Modal visible={isAllPostsModalVisible} animationType="slide" transparent={false} onRequestClose={() => setIsAllPostsModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: theme.background }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: insets.top + 16,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.cardBorder,
              backgroundColor: theme.backgroundElement
            }}>
              <TouchableOpacity onPress={() => setIsAllPostsModalVisible(false)} style={{ padding: 4 }} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{user?.name}'s Posts</Text>
              <View style={{ width: 28 }} />
            </View>

            {/* List */}
            {/* List */}
            <FlatList
              data={myPosts}
              keyExtractor={post => post.id}
              contentContainerStyle={{ paddingVertical: 16 }}
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              windowSize={5}
              maxToRenderPerBatch={10}
              removeClippedSubviews={true}
              renderItem={({ item: post }) => (
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => {
                    setIsAllPostsModalVisible(false);
                    router.push({ pathname: '/', params: { openComments: post.id } });
                  }}
                  style={{
                    backgroundColor: theme.backgroundElement,
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                    borderRadius: 16,
                    padding: 16,
                    marginHorizontal: 16,
                    marginBottom: 12
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#F97316' }}>
                        {post.category} Feed
                      </Text>
                      {post.isAnonymous && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.isDark ? 'rgba(100, 116, 139, 0.15)' : '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 3 }}>
                          <Ionicons name="eye-off" size={9} color={theme.textSecondary} />
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: theme.textSecondary }}>Anonymous</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      {post.title ? (
                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: theme.text, marginBottom: 6 }} numberOfLines={1}>
                          {post.title}
                        </Text>
                      ) : null}
                      <Text style={{ fontSize: 13.5, color: theme.text, lineHeight: 19 }} numberOfLines={3}>
                        {post.content}
                      </Text>
                    </View>
                    {post.imageUrl ? (
                      <Image 
                        source={{ uri: getOptimizedImageUrl(post.imageUrl, 200) }} 
                        style={{ width: 60, height: 60, borderRadius: 10, backgroundColor: theme.cardBorder }} 
                        resizeMode="cover"
                      />
                    ) : null}
                  </View>

                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    {getFormattedPostTime(post.createdAt, post.timestamp)} • ❤️ {post.claps} Hearts • {post.commentsCount} Comments
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>
      )}

      {/* ─── QUICK ADD MORE SECTIONS MODAL ─── */}
      {isMoreAddModalVisible && (
        <Modal
          visible={isMoreAddModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setIsMoreAddModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.actionSheetBackdrop}
            activeOpacity={1}
            onPress={() => setIsMoreAddModalVisible(false)}
          >
            <View style={[styles.actionSheetCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={styles.actionSheetHeader}>
                <Text style={[styles.actionSheetTitle, { color: theme.text }]}>Add Profile Sections</Text>
                <Text style={[styles.actionSheetSub, { color: theme.textSecondary }]}>Choose an extra academic section to build your profile card</Text>
              </View>

              <View style={styles.actionSheetOptions}>
                {/* 1. Education Option */}
                <TouchableOpacity
                  style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                  onPress={() => {
                    setIsMoreAddModalVisible(false);
                    setSafeTimeout(() => {
                      setIsAddEduVisible(true);
                    }, 100);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="school" size={18} color="#10B981" style={{ marginRight: 10 }} />
                  <Text style={[styles.actionSheetBtnText, { color: theme.text }]}>+ Education</Text>
                </TouchableOpacity>

                {/* 2. Conference/Publication Option */}
                <TouchableOpacity
                  style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                  onPress={() => {
                    setIsMoreAddModalVisible(false);
                    setSafeTimeout(() => {
                      setIsAddPubVisible(true);
                    }, 100);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text" size={18} color="#F43F5E" style={{ marginRight: 10 }} />
                  <Text style={[styles.actionSheetBtnText, { color: theme.text }]}>+ Conference / Publication</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.actionSheetCancelBtn, { backgroundColor: theme.background }]}
                onPress={() => setIsMoreAddModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionSheetCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* ─── VIEW ALL EXPERIENCES MODAL ─── */}
      {isAllExperiencesVisible && (
      <Modal visible={isAllExperiencesVisible} animationType="slide" transparent onRequestClose={() => setIsAllExperiencesVisible(false)}>
        <View style={[styles.modalBg, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.45)' }]}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setIsAllExperiencesVisible(false)} 
          />
          <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, maxHeight: height * 0.8 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>All Experiences ({user?.experiences?.length || 0})</Text>
              <TouchableOpacity onPress={() => setIsAllExperiencesVisible(false)} activeOpacity={0.8}>
                <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              <View style={styles.experienceList}>
                {(user?.experiences || []).map((exp: Experience) => (
                  <View key={exp.id} style={[styles.experienceItem, { borderBottomColor: theme.cardBorder }]}>
                    <View style={styles.experienceIconFrame}>
                      <Ionicons name="briefcase-outline" size={18} color="#3B82F6" />
                    </View>
                    <View style={styles.experienceDetails}>
                      <Text style={[styles.experienceRole, { color: theme.text }]}>{exp.role.replace(/,\\s*$/, '')}</Text>
                      <Text style={[styles.experienceCompany, { color: theme.textSecondary }]}>
                        {exp.company} • <Text style={styles.experienceTypeTag}>{exp.employmentType}</Text>
                      </Text>
                      <Text style={styles.experienceDates}>
                        {exp.startMonth?.substring(0, 3)} {exp.startYear} - {exp.isCurrent ? 'Present' : `${exp.endMonth?.substring(0, 3)} ${exp.endYear}`}
                      </Text>
                      {exp.description ? (
                        <Text style={[styles.experienceDesc, { color: theme.textSecondary }]}>{exp.description}</Text>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4, alignSelf: 'flex-start' }}>
                      <TouchableOpacity
                        style={styles.deleteExperienceBtn}
                        onPress={() => handleEditExperience(exp)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="pencil-outline" size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteExperienceBtn}
                        onPress={() => handleDeleteExperience(exp.id)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      )}

      {/* ─── CUSTOM BENTO VIBE STATUS EDITOR MODAL ─── */}
      {isVibeModalVisible && (
      <Modal visible={isVibeModalVisible} animationType="slide" transparent onRequestClose={closeVibeWithCheck}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalBg, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.45)' }]}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={closeVibeWithCheck} 
            />
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Update Status Vibe</Text>
                <TouchableOpacity onPress={closeVibeWithCheck} activeOpacity={0.8}>
                  <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Current Vibe Status</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                    placeholder="e.g. Grinding DSA 💻 or BEU exam mode 📚"
                    placeholderTextColor="#94A3B8"
                    value={editVibe}
                    onChangeText={setEditVibe}
                    maxLength={100}
                  />
                </View>

                <TouchableOpacity style={styles.saveSubmitBtn} onPress={handleSaveVibe} activeOpacity={0.8}>
                  <Text style={styles.saveSubmitBtnText}>Update Vibe Capsule</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      )}

      {/* ─── CUSTOM BENTO SKILL CUSTOMIZER MODAL ─── */}
      {isSkillsModalVisible && (
      <Modal visible={isSkillsModalVisible} animationType="slide" transparent onRequestClose={closeSkillsWithCheck}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalBg, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.45)' }]}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={closeSkillsWithCheck} 
            />
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, maxHeight: height * 0.75 }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Customize Tech Skills</Text>
                <TouchableOpacity onPress={closeSkillsWithCheck} activeOpacity={0.8}>
                  <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Custom Skill Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Add Custom Skill Tag</Text>
                  <View style={styles.customSkillInputRow}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1, backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text, marginBottom: 0 }]}
                      placeholder="e.g. Kotlin, Docker, Figma"
                      placeholderTextColor="#94A3B8"
                      value={newCustomSkill}
                      onChangeText={setNewCustomSkill}
                    />
                    <TouchableOpacity
                      style={styles.addCustomSkillBtn}
                      onPress={() => {
                        const trimmed = newCustomSkill.trim();
                        if (trimmed && !editSkills.includes(trimmed)) {
                          setEditSkills([...editSkills, trimmed]);
                          setNewCustomSkill('');
                        }
                      }}
                    >
                      <Text style={styles.addCustomSkillText}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Preset List */}
                <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: 12, marginBottom: 8 }]}>Interactive Preset Tags</Text>
                <View style={styles.tagSelectorGrid}>
                  {[
                    'AutoCAD', 'STAAD Pro', 'ETABS', 'Revit', 'SolidWorks', 'MATLAB',
                    'React Native', 'NodeJS', 'TypeScript', 'Firebase', 'Java', 'Python',
                    'Docker', 'Git', 'Linux', 'DSA', 'Algorithms', 'Database', 'Web Development'
                  ].map((presetSkill) => {
                    const isSelected = editSkills.includes(presetSkill);
                    return (
                      <TouchableOpacity
                        key={presetSkill}
                        style={[
                          styles.presetTagBtn,
                          { backgroundColor: theme.background, borderColor: theme.cardBorder },
                          isSelected && styles.presetTagBtnSelected
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setEditSkills(editSkills.filter(s => s !== presetSkill));
                          } else {
                            setEditSkills([...editSkills, presetSkill]);
                          }
                        }}
                      >
                        <Text style={[styles.presetTagText, { color: theme.textSecondary }, isSelected && styles.presetTagTextSelected]}>
                          {presetSkill}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity style={styles.saveSubmitBtn} onPress={handleSaveSkills} activeOpacity={0.8}>
                  <Text style={styles.saveSubmitBtnText}>Save Skills</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      )}

      {/* ─── CUSTOM BENTO SOCIAL LINKS MODAL (PREMIUM REDESIGN) ─── */}
      {isLinksModalVisible && (
        <Modal 
          visible={isLinksModalVisible} 
          animationType="slide" 
          transparent={false} 
          onRequestClose={closeLinksWithCheck}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: theme.background }}
          >
            <View style={{ flex: 1, backgroundColor: theme.background }}>
              
              {/* 1. PREMIUM HEADER BAR */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingTop: Platform.OS === 'ios' ? 56 : 20,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.cardBorder,
                backgroundColor: theme.backgroundElement,
                shadowColor: '#000000',
                shadowOpacity: 0.03,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 8,
                elevation: 2,
              }}>
                <TouchableOpacity 
                  onPress={closeLinksWithCheck} 
                  activeOpacity={0.7}
                  style={{ paddingVertical: 8, paddingHorizontal: 4 }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textSecondary }}>Cancel</Text>
                </TouchableOpacity>

                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text, letterSpacing: -0.3 }}>
                  Portfolio & Socials
                </Text>

                <TouchableOpacity 
                  onPress={handleSaveLinks} 
                  disabled={isSaving} 
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: '#06B6D4',
                    paddingHorizontal: 16,
                    paddingVertical: 7,
                    borderRadius: 18,
                    shadowColor: '#06B6D4',
                    shadowOpacity: 0.15,
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 4,
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* 2. Unified Scroll View Workspace */}
              <ScrollView 
                contentContainerStyle={{ padding: 16, paddingBottom: 120 }} 
                keyboardShouldPersistTaps="handled" 
                showsVerticalScrollIndicator={false}
              >
                
                {/* Immersive Welcome Bento Card */}
                <View style={{
                  backgroundColor: theme.isDark ? 'rgba(6, 182, 212, 0.06)' : '#ECFEFF',
                  borderWidth: 1,
                  borderColor: theme.isDark ? 'rgba(6, 182, 212, 0.25)' : '#CFFAFE',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 20,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <View style={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: 'rgba(6, 182, 212, 0.08)',
                  }} />
                  <Text style={{ fontSize: 15, fontWeight: '800', color: theme.isDark ? '#22D3EE' : '#0891B2', marginBottom: 4 }}>
                    Showcase Your Digital Footprint 🌐
                  </Text>
                  <Text style={{ fontSize: 12, lineHeight: 17, color: theme.textSecondary }}>
                    Connect your professional channels to build credibility, showcase research citations, and share B.Tech achievements across the MCE Connect network.
                  </Text>
                </View>

                {/* HELPER FOR RENDERING PREMIUM INPUTS WITH BRAND ICONS INLINE */}
                {(() => {
                  const renderPremiumInput = (iconName: string, label: string, placeholder: string, value: string, onChangeText: (text: string) => void, brandColor: string) => (
                    <View style={{ marginBottom: 14 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6, marginLeft: 2 }}>
                        {label}
                      </Text>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: theme.cardBorder,
                        borderRadius: 12,
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                        paddingHorizontal: 12,
                        height: 48,
                      }}>
                        <Ionicons name={iconName as any} size={18} color={brandColor} style={{ marginRight: 10 }} />
                        <TextInput
                          style={{
                            flex: 1,
                            color: theme.text,
                            fontSize: 13.5,
                            paddingVertical: 0,
                          }}
                          placeholder={placeholder}
                          placeholderTextColor="#64748B"
                          value={value}
                          onChangeText={onChangeText}
                          autoCapitalize="none"
                        />
                      </View>
                    </View>
                  );

                  return (
                    <View>
                      {/* CARD 1: PROFESSIONAL NETWORK PROFILE CARDS */}
                      <View style={{
                        backgroundColor: theme.backgroundElement,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: theme.cardBorder,
                        padding: 16,
                        marginBottom: 16,
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 0.5, borderBottomColor: theme.cardBorder, paddingBottom: 10 }}>
                          <Ionicons name="briefcase" size={16} color="#0D9488" style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.text }}>
                            Professional Networks & Portfolio
                          </Text>
                        </View>
                        
                        {renderPremiumInput('logo-linkedin', 'LinkedIn Profile URL', 'https://linkedin.com/in/username', editLinkedin, setEditLinkedin, '#0A66C2')}
                        {renderPremiumInput('logo-github', 'GitHub Profile URL', 'https://github.com/username', editGithub, setEditGithub, theme.isDark ? '#FFFFFF' : '#24292E')}
                        {renderPremiumInput('briefcase-outline', 'Personal Portfolio URL', 'https://behance.net/portfolio', editPortfolio, setEditPortfolio, '#0D9488')}
                        {renderPremiumInput('globe-outline', 'Personal Website URL', 'https://yourwebsite.com', editWebsite, setEditWebsite, '#0F766E')}
                      </View>

                      {/* CARD 2: ACADEMIC & RESEARCH */}
                      <View style={{
                        backgroundColor: theme.backgroundElement,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: theme.cardBorder,
                        padding: 16,
                        marginBottom: 16,
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 0.5, borderBottomColor: theme.cardBorder, paddingBottom: 10 }}>
                          <Ionicons name="school" size={16} color="#4285F4" style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.text }}>
                            Academic Publications & Citations
                          </Text>
                        </View>
                        
                        {renderPremiumInput('school-outline', 'Google Scholar URL', 'https://scholar.google.com/citations?user=...', editGooglescholar, setEditGooglescholar, '#4285F4')}
                      </View>

                      {/* CARD 3: SOCIAL & CREATIVE MEDIA */}
                      <View style={{
                        backgroundColor: theme.backgroundElement,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: theme.cardBorder,
                        padding: 16,
                        marginBottom: 16,
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 0.5, borderBottomColor: theme.cardBorder, paddingBottom: 10 }}>
                          <Ionicons name="sparkles" size={16} color="#E1306C" style={{ marginRight: 8 }} />
                          <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.text }}>
                            Creative Channels & Social Media
                          </Text>
                        </View>
                        
                        {renderPremiumInput('logo-instagram', 'Instagram Profile URL', 'https://instagram.com/username', editInstagram, setEditInstagram, '#E1306C')}
                        {renderPremiumInput('logo-youtube', 'YouTube Channel URL', 'https://youtube.com/@channelname', editYoutube, setEditYoutube, '#FF0000')}
                        {renderPremiumInput('logo-facebook', 'Facebook Profile URL', 'https://facebook.com/username', editFacebook, setEditFacebook, '#1877F2')}
                        {renderPremiumInput('logo-twitter', 'Twitter / X URL', 'https://twitter.com/handle', editTwitter, setEditTwitter, theme.isDark ? '#FFFFFF' : '#000000')}
                      </View>
                    </View>
                  );
                })()}

                {/* CARD 4: CUSTOM WEB LINKS (COMPLETELY REDESIGNED) */}
                <View style={{
                  backgroundColor: theme.backgroundElement,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  padding: 16,
                  marginBottom: 16,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 0.5, borderBottomColor: theme.cardBorder, paddingBottom: 10 }}>
                    <Ionicons name="link" size={16} color="#0891B2" style={{ marginRight: 8 }} />
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.text }}>
                      Custom Web Links
                    </Text>
                  </View>

                  {/* List of current custom links styled cleanly */}
                  {editCustomLinks.length > 0 ? (
                    <View style={{ gap: 8, marginBottom: 16 }}>
                      {editCustomLinks.map((link, index) => (
                        <View 
                          key={index}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: theme.background,
                            borderWidth: 1,
                            borderColor: theme.cardBorder,
                            borderRadius: 12,
                            padding: 12,
                          }}
                        >
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }} numberOfLines={1}>
                              {link.title}
                            </Text>
                            <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }} numberOfLines={1}>
                              {link.url}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => {
                              setEditCustomLinks(prev => prev.filter((_, idx) => idx !== index));
                            }}
                            style={{ padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: 8 }}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 12, fontStyle: 'italic', color: theme.textSecondary, marginBottom: 16, textAlign: 'center', paddingVertical: 10 }}>
                      No custom links added yet. Build your profile by adding unique links!
                    </Text>
                  )}

                  {/* Sub-form to add a new custom link styled as high-end card */}
                  <View style={{
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                    borderRadius: 14,
                    padding: 14,
                    gap: 12,
                  }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.text }}>
                      Add New Custom Link
                    </Text>
                    
                    <TextInput
                      style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text, height: 44, paddingVertical: 0, borderRadius: 10 }]}
                      placeholder="Link Title (e.g., My Startup Project)"
                      placeholderTextColor="#94A3B8"
                      value={newCustomLinkTitle}
                      onChangeText={setNewCustomLinkTitle}
                    />

                    <TextInput
                      style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text, height: 44, paddingVertical: 0, borderRadius: 10 }]}
                      placeholder="Link URL (e.g., myproject.com)"
                      placeholderTextColor="#94A3B8"
                      value={newCustomLinkUrl}
                      onChangeText={setNewCustomLinkUrl}
                      autoCapitalize="none"
                    />

                    <TouchableOpacity
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(6, 182, 212, 0.12)' : '#ECFEFF',
                        borderWidth: 1,
                        borderColor: '#06B6D4',
                        borderRadius: 10,
                        paddingVertical: 11,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 4
                      }}
                      onPress={() => {
                        if (!newCustomLinkTitle.trim() || !newCustomLinkUrl.trim()) {
                          showPremiumAlert('Required Fields', 'Kripya dono Title aur URL fill karein!', 'warning');
                          return;
                        }
                        setEditCustomLinks(prev => [...prev, { title: newCustomLinkTitle.trim(), url: newCustomLinkUrl.trim() }]);
                        setNewCustomLinkTitle('');
                        setNewCustomLinkUrl('');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0891B2' }}>
                        + Add Custom Link to List
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* ─── ADD PROFESSIONAL EXPERIENCE MODAL ─── */}
      {isAddExpVisible && (
      <Modal visible={isAddExpVisible} animationType="slide" transparent onRequestClose={closeExpModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalBg, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.45)' }]}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={closeExpModal} 
            />
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, maxHeight: height * 0.85 }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{editingExpId ? 'Edit Experience' : 'Add Experience'}</Text>
                <TouchableOpacity onPress={closeExpModal} activeOpacity={0.8}>
                  <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                
                {/* 1. Job Role */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Role / Job Title *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                    placeholder="e.g. Software Dev Intern, Frontend Lead"
                    placeholderTextColor="#94A3B8"
                    value={expRole}
                    onChangeText={setExpRole}
                  />
                </View>

                {/* 2. Company */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Company / Organization *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                    placeholder="e.g. Google, Tech Cell, TCS"
                    placeholderTextColor="#94A3B8"
                    value={expCompany}
                    onChangeText={setExpCompany}
                  />
                </View>

                {/* 3. Employment Type */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Employment Type *</Text>
                  <View style={styles.tabContainer}>
                    {(['Full-time', 'Part-time', 'Internship'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.tab, expEmpType === type && styles.activeTab]}
                        onPress={() => setExpEmpType(type)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.tabText, expEmpType === type && styles.activeTabText]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 4. Start Date */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1, marginBottom: 12 }}>
                    <Text style={styles.modalLabel}>Start Month *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 4 }}>
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[
                            styles.modalDeptCard,
                            { backgroundColor: theme.background, borderColor: theme.cardBorder },
                            expStartMonth === m && { backgroundColor: '#FFF7ED', borderColor: '#F97316' }
                          ]}
                          onPress={() => setExpStartMonth(m)}
                        >
                          <Text style={[styles.modalDeptText, expStartMonth === m && { color: '#F97316', fontWeight: 'bold' }]}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={{ width: 120 }}>
                    <Text style={styles.modalLabel}>Start Year *</Text>
                    <TextInput
                      style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                      placeholder="YYYY"
                      placeholderTextColor="#94A3B8"
                      value={expStartYear}
                      onChangeText={(text) => setExpStartYear(text.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>
                </View>

                {/* 5. Current Role Checkbox */}
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 }}
                  onPress={() => setExpIsCurrent(!expIsCurrent)}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={expIsCurrent ? 'checkbox' : 'square-outline'} 
                    size={20} 
                    color={expIsCurrent ? '#F97316' : theme.textSecondary} 
                  />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>I am currently working in this role</Text>
                </TouchableOpacity>

                {/* 6. End Date (if not current) */}
                {!expIsCurrent && (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                    <View style={{ flex: 1, marginBottom: 12 }}>
                      <Text style={styles.modalLabel}>End Month *</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 4 }}>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                          <TouchableOpacity
                            key={m}
                            style={[
                              styles.modalDeptCard,
                              { backgroundColor: theme.background, borderColor: theme.cardBorder },
                              expEndMonth === m && { backgroundColor: '#FFF7ED', borderColor: '#F97316' }
                            ]}
                            onPress={() => setExpEndMonth(m)}
                          >
                            <Text style={[styles.modalDeptText, expEndMonth === m && { color: '#F97316', fontWeight: 'bold' }]}>{m}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={{ width: 120 }}>
                      <Text style={styles.modalLabel}>End Year *</Text>
                      <TextInput
                        style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                        placeholder="YYYY"
                        placeholderTextColor="#94A3B8"
                        value={expEndYear}
                        onChangeText={(text) => setExpEndYear(text.replace(/[^0-9]/g, ''))}
                        keyboardType="numeric"
                        maxLength={4}
                      />
                    </View>
                  </View>
                )}

                {/* 7. Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Description (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text, height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                    placeholder="Describe your role, responsibilities, or achievements..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={expDesc}
                    onChangeText={setExpDesc}
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity style={styles.saveSubmitBtn} onPress={handleSaveExperience} disabled={isSaving} activeOpacity={0.8}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveSubmitBtnText}>{editingExpId ? 'Save Experience' : 'Add Experience Entry'}</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      )}

      {/* ─── ADD EDUCATION MODAL ─── */}
      {isAddEduVisible && (
      <Modal visible={isAddEduVisible} animationType="slide" transparent onRequestClose={closeEduModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalBg, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.45)' }]}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={closeEduModal} 
            />
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, maxHeight: height * 0.85 }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{editingEduId ? 'Edit Education' : 'Add Education'}</Text>
                <TouchableOpacity onPress={closeEduModal} activeOpacity={0.8}>
                  <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                
                {/* 1. School */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>School / College Name *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                    placeholder="e.g. Motihari College of Engineering"
                    placeholderTextColor="#94A3B8"
                    value={eduSchool}
                    onChangeText={setEduSchool}
                  />
                </View>

                {/* 2. Degree */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Degree *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                    placeholder="e.g. B.Tech, M.Tech, Class XII"
                    placeholderTextColor="#94A3B8"
                    value={eduDegree}
                    onChangeText={setEduDegree}
                  />
                </View>

                {/* 3. Field of Study */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Field of Study / Branch *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                    placeholder="e.g. Computer Science & Engineering, Civil"
                    placeholderTextColor="#94A3B8"
                    value={eduFieldOfStudy}
                    onChangeText={setEduFieldOfStudy}
                  />
                </View>

                {/* 4. Start Year */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Start Year *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                    placeholder="YYYY"
                    placeholderTextColor="#94A3B8"
                    value={eduStartYear}
                    onChangeText={(text) => setEduStartYear(text.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>

                {/* 5. Current Checkbox */}
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 }}
                  onPress={() => setEduIsCurrent(!eduIsCurrent)}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={eduIsCurrent ? 'checkbox' : 'square-outline'} 
                    size={20} 
                    color={eduIsCurrent ? '#10B981' : theme.textSecondary} 
                  />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text }}>I am currently studying here</Text>
                </TouchableOpacity>

                {/* 6. End Year (if not current) */}
                {!eduIsCurrent && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.modalLabel}>End Year (or Expected Graduation Year) *</Text>
                    <TextInput
                      style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                      placeholder="YYYY"
                      placeholderTextColor="#94A3B8"
                      value={eduEndYear}
                      onChangeText={(text) => setEduEndYear(text.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>
                )}

                {/* 7. Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Description / Specializations (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text, height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                    placeholder="Add achievements, projects, or honors..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={eduDesc}
                    onChangeText={setEduDesc}
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity style={[styles.saveSubmitBtn, { backgroundColor: '#10B981' }]} onPress={handleSaveEducation} disabled={isSaving} activeOpacity={0.8}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveSubmitBtnText}>{editingEduId ? 'Save Education' : 'Add Education Entry'}</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      )}

      {/* ─── ADD PUBLICATION MODAL ─── */}
      {isAddPubVisible && (
      <Modal visible={isAddPubVisible} animationType="slide" transparent onRequestClose={closePubModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={[styles.modalBg, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.45)' }]}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={closePubModal} 
            />
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, maxHeight: height * 0.85 }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{editingPubId ? 'Edit Conference / Publication' : 'Add Conference / Publication'}</Text>
                <TouchableOpacity onPress={closePubModal} activeOpacity={0.8}>
                  <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                
                {/* 1. Paper Title */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Paper / Article Title *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                    placeholder="e.g. Solar Resonant Inverters under CSI Mode"
                    placeholderTextColor="#94A3B8"
                    value={pubTitle}
                    onChangeText={setPubTitle}
                  />
                </View>
                {/* 2. Publisher */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Journal / Conference / Publisher *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                    placeholder="e.g. IEEE, Springer, MDPI"
                    placeholderTextColor="#94A3B8"
                    value={pubPublisher}
                    onChangeText={setPubPublisher}
                  />
                </View>

                {/* 3. Publication Date */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Publication Date / Year *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                    placeholder="MM/YYYY or YYYY"
                    placeholderTextColor="#94A3B8"
                    value={pubDate}
                    keyboardType="phone-pad"
                    maxLength={7}
                    onChangeText={(text) => {
                      let cleaned = text.replace(/[^0-9/]/g, '');
                      const isDeleting = text.length < pubDate.length;
                      
                      if (!isDeleting) {
                        if (cleaned.length === 2 && !cleaned.includes('/')) {
                          cleaned = cleaned + '/';
                        } else if (cleaned.length === 3 && cleaned.charAt(2) !== '/') {
                          cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
                        }
                      }
                      
                      if (cleaned.length > 7) {
                        cleaned = cleaned.slice(0, 7);
                      }
                      
                      setPubDate(cleaned);
                    }}
                  />
                </View>

                {/* 4. Paper URL */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Publication URL (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                    placeholder="e.g. https://doi.org/10.1007/..."
                    placeholderTextColor="#94A3B8"
                    value={pubUrl}
                    onChangeText={setPubUrl}
                  />
                </View>

                {/* 5. Co-Authors */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Co-Authors / Contributors (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                    placeholder="e.g. Pradip Kumar, Ashok Kumar"
                    placeholderTextColor="#94A3B8"
                    value={pubAuthors}
                    onChangeText={setPubAuthors}
                  />
                </View>

                {/* 6. Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Description / Abstract (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text, height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                    placeholder="Add abstract or summary of key findings..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={pubDesc}
                    onChangeText={setPubDesc}
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity style={[styles.saveSubmitBtn, { backgroundColor: '#F43F5E' }]} onPress={handleSavePublication} disabled={isSaving} activeOpacity={0.8}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveSubmitBtnText}>{editingPubId ? 'Save Publication' : 'Add Publication Entry'}</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      )}

      {/* ─── PREMIUM CUSTOM ALERT DIALOG ─── */}
      {customAlert.visible && (
        <Modal
          visible={customAlert.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setCustomAlert(prev => ({ ...prev, visible: false }))}
        >
          <View style={[styles.modalBg, { backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', alignItems: 'center' }]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setCustomAlert(prev => ({ ...prev, visible: false }))}
            />
            <View style={{
              width: width - 48,
              maxWidth: 340,
              backgroundColor: theme.backgroundElement,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: theme.cardBorder,
              padding: 24,
              alignItems: 'center',
              boxShadow: Platform.OS === 'web' ? `${0}px ${10}px ${20}px #000` : undefined,

              elevation: 8,
            }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: customAlert.type === 'success' ? '#ECFDF5' : customAlert.type === 'error' ? '#FEF2F2' : '#FFFBEB',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <Ionicons
                  name={customAlert.type === 'success' ? 'checkmark-circle' : customAlert.type === 'error' ? 'alert-circle' : 'warning'}
                  size={28}
                  color={customAlert.type === 'success' ? '#10B981' : customAlert.type === 'error' ? '#EF4444' : '#F59E0B'}
                />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text, marginBottom: 8, textAlign: 'center' }}>
                {customAlert.title}
              </Text>
              <Text style={{ fontSize: 12.5, color: theme.textSecondary, lineHeight: 18, textAlign: 'center', marginBottom: 20 }}>
                {customAlert.message}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: customAlert.type === 'success' ? '#10B981' : customAlert.type === 'error' ? '#EF4444' : '#F97316',
                  paddingVertical: 10,
                  paddingHorizontal: 24,
                  borderRadius: 12,
                  width: '100%',
                  alignItems: 'center',
                }}
                onPress={() => setCustomAlert(prev => ({ ...prev, visible: false }))}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
});
export default ExploreProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  glowOrb1: {
    position: 'absolute',
    top: 0,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(249, 115, 22, 0.04)',
  },
  glowOrb2: {
    position: 'absolute',
    bottom: 50,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(59, 130, 246, 0.03)',
  },
  scrollContainer: {
    paddingBottom: 150,
  },
  coverSection: {
    height: 200,
    backgroundColor: '#001b59',
    position: 'relative',
    overflow: 'hidden',
  },
  coverImageMask: {
    width: '100%',
    height: 90,
    overflow: 'hidden',
    marginTop: 25,
  },
  coverImage: {
    width: '100%',
    height: 140,
    alignSelf: 'center',
  },
  coverBlob1: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
  },
  coverBlob2: {
    position: 'absolute',
    bottom: -60,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    padding: 20,
    alignItems: 'flex-start',
    boxShadow: Platform.OS === 'web' ? `${0}px ${6}px ${10}px #0F172A` : undefined,

    elevation: 2,
    marginBottom: 20,
    marginHorizontal: 16,
  },
  profileHeaderCardShift: {
    marginTop: -40,
  },
  completionContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    marginBottom: 10,
  },
  completionTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  completionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  completionValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F97316',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F97316',
    borderRadius: 2.5,
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 12,
    marginTop: -45,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    marginBottom: 12,
  },
  mceanBorder: {
    borderColor: '#A855F7',
  },
  alumniBorder: {
    borderColor: '#3B82F6',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 8,
    right: -2,
    backgroundColor: '#F97316',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  badgeRow: {
    marginTop: 10,
    marginBottom: 14,
  },
  guestBadgeText: {
    color: '#6B7280',
    fontSize: 11.5,
    fontWeight: '700',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: '#E2E8F0',
  },
  bioText: {
    color: '#334155',
    fontSize: 13,
    textAlign: 'left',
    lineHeight: 18.5,
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  headerActionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  editBtn: {
    flex: 1,
    backgroundColor: '#F97316',
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: Platform.OS === 'web' ? `${0}px ${2}px ${4}px #F97316` : undefined,

    elevation: 2,
  },
  editBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  passwordBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Explore Hub specific styles
  hubBlock: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 16,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${8}px #0F172A` : undefined,

    elevation: 1,
  },
  hubDescription: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
    paddingLeft: 4,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptySearchText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 10,
  },
  emptySearchSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    alignItems: 'flex-start',
  },
  gridIconFrame: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  gridCardSub: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '500',
  },

  // Directory Utilities list
  utilityList: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 10,
    gap: 12,
  },
  utilityIconFrame: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityTextCol: {
    flex: 1,
  },
  utilityTitle: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  utilitySub: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },

  // MCE Credentials and contributions
  detailsBlock: {
    marginBottom: 20,
    marginHorizontal: 16,
  },
  detailsBlockHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 10,
    letterSpacing: 0.5,
    paddingLeft: 4,
  },
  detailCardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
  },
  detailCardLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailCardVal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  longDetailCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
  },
  longDetailCardVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  contributionsBlock: {
    marginBottom: 24,
    marginHorizontal: 16,
  },
  emptyContributions: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${8}px #0F172A` : undefined,

    elevation: 1,
  },
  emptyIconFrame: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginBottom: 12,
  },
  emptyContributionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyContributionsDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  onboardBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  onboardBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  myPostCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  myPostCat: {
    fontSize: 10,
    color: '#F97316',
    fontWeight: '700',
    marginBottom: 4,
  },
  myPostTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 6,
  },
  myPostTime: {
    fontSize: 10,
    color: '#6B7280',
  },
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: '#FFF5F5',
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginHorizontal: 16,
  },
  signOutBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: 'bold',
  },
  quickAddPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickAddPillText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionSheetCard: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  actionSheetHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionSheetSub: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  actionSheetOptions: {
    gap: 2,
    marginBottom: 16,
  },
  actionSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  actionSheetBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  actionSheetCancelBtn: {
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  actionSheetCancelText: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },

  // Preset Pictures modal styles
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  closeBtnText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalScrollBody: {
    paddingBottom: 40,
  },
  modalLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#F97316',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 12,
    width: '100%',
  },
  customUrlToggle: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  customUrlToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customUrlToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 16,
    color: '#111827',
    fontSize: 13.5,
    marginBottom: 16,
  },
  modalDeptScroller: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  modalDeptCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
  },
  activeModalDeptCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  modalDeptText: {
    fontSize: 12,
    color: '#6B7280',
  },
  activeModalDeptText: {
    color: '#F97316',
    fontWeight: 'bold',
  },
  saveSubmitBtn: {
    backgroundColor: '#F97316',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${8}px #F97316` : undefined,

    elevation: 3,
    marginTop: 16,
  },
  saveSubmitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  guestAvatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },
  signInGoogleBtn: {
    backgroundColor: '#F97316',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 18,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${10}px #F97316` : undefined,

    elevation: 3,
  },
  signInGoogleText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#64748B',
    marginHorizontal: 12,
    letterSpacing: 0.6,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  presetCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  presetCardSelected: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  presetImageWrap: {
    width: 58,
    height: 58,
    marginBottom: 8,
  },
  presetImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#E2E8F0',
  },
  presetIconBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  presetLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  presetHint: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  presetLabelActive: {
    color: '#F97316',
    fontWeight: 'bold',
  },
  floatingBackBtn: {
    position: 'absolute',
    top: 14,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  floatingShareBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  vibeCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  vibeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    flex: 1,
  },
  vibeEditIcon: {
    marginLeft: 6,
  },
  bentoGrid: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  bentoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  cardEditBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
  credentialsGrid: {
    gap: 10,
  },
  credentialItem: {
    gap: 2,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  credentialHalf: {
    flex: 1,
    gap: 2,
  },
  credentialLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  credentialVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  skillTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  linksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  linkCapsuleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  myBentoPostCard: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  emptyTimelineContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyTimelineText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  customSkillInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  addCustomSkillBtn: {
    backgroundColor: '#F97316',
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addCustomSkillText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  tagSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  presetTagBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetTagBtnSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  presetTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetTagTextSelected: {
    color: '#F97316',
    fontWeight: '700',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  privateBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
  },
  privateNotice: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#10B981',
    marginTop: -8,
    marginBottom: 12,
    paddingLeft: 4,
  },
  viewAllPostsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
  },
  viewAllPostsBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  experienceList: {
    gap: 12,
  },
  experienceItem: {
    flexDirection: 'row',
    gap: 12,
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  experienceIconFrame: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  experienceDetails: {
    flex: 1,
    gap: 2,
  },
  experienceRole: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  experienceCompany: {
    fontSize: 11,
    fontWeight: '600',
  },
  experienceTypeTag: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  experienceDates: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  experienceDesc: {
    fontSize: 11.5,
    marginTop: 4,
    lineHeight: 16,
  },
  deleteExperienceBtn: {
    padding: 6,
    alignSelf: 'flex-start',
  },
  headerEditCircleBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: Platform.OS === 'web' ? `${0}px ${2}px ${3}px #F97316` : undefined,

    elevation: 2.5,
    zIndex: 10,
  },
  guestCTASection: {
    marginTop: 16,
    alignItems: 'stretch',
    width: '100%',
    paddingHorizontal: 0,
  },
  guestCTADesc: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'left',
    marginBottom: 20,
    fontWeight: '500',
  },
  guestCTASignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    boxShadow: Platform.OS === 'web' ? `${0}px ${3}px ${5}px #F97316` : undefined,

    elevation: 3,
    width: '100%',
    marginBottom: 10,
  },
  guestCTASignInText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  loginScrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 130, // Increased to avoid overlap with bottom tab & explore button
    width: '100%',
  },
  loginGlowOrb1: {
    position: 'absolute',
    top: 30,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(249, 115, 22, 0.04)',
  },
  loginGlowOrb2: {
    position: 'absolute',
    bottom: 30,
    right: -60,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(59, 130, 246, 0.03)',
  },
  loginHeaderContainer: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  loginLogo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F97316',
  },
  loginCollegeName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  loginAppSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  loginGlassCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'stretch',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  loginCardTitle: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
  },
  loginCardSubTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  loginStepNotice: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  loginInputContainer: {
    marginBottom: 14,
    width: '100%',
  },
  loginInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    paddingLeft: 2,
  },
  loginInputFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
    paddingHorizontal: 12,
    width: '100%',
  },
  loginInputIcon: {
    marginRight: 8,
  },
  loginInputField: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 0,
  },
  loginSubmitBtn: {
    backgroundColor: '#F97316',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  loginSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  loginGoogleBrandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4285F4',
    paddingHorizontal: 16,
    width: '100%',
  },
  loginGoogleIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
    backgroundColor: '#FFF',
    borderRadius: 9,
  },
  loginGoogleBrandBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  loginInfoText: {
    fontSize: 10.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 16,
    paddingHorizontal: 4,
    width: '100%',
  },
  loginPrivacyLinkContainer: {
    alignSelf: 'center',
    marginTop: 12,
  },
  loginPrivacyLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#3B82F6',
  },
  loginDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    width: '100%',
  },
  loginDividerLine: {
    flex: 1,
    height: 1,
  },
  loginDividerText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginHorizontal: 10,
    letterSpacing: 0.5,
  },
});
