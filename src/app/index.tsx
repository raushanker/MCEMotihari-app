import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, FlatList,
  Modal, KeyboardAvoidingView, Platform, TextInput, Dimensions,
  ScrollView, Share, Alert, ActivityIndicator, RefreshControl,
  Animated
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, Post, Comment, sortPostsPriority } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { hasDuplicateEmojis } from '@/utils/emojiValidator';
import { useAuth } from '@/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAppError } from '@/utils/errors/errorManager';
import { verifyPostExists } from '@/utils/firestoreUtils';
import { validatePassword } from '@/utils/passwordValidator';
import { PasswordHelperText } from '@/components/ui/PasswordHelperText';

// Components & Modals
import { CustomDrawer, CustomDrawerRef } from '@/components/drawer/CustomDrawer';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { PostCard } from '@/components/PostCard';

// Modals for side drawer actions
import { AboutModal } from '@/components/modals/AboutModal';
import { AboutAppModal } from '@/components/modals/AboutAppModal';
import { CampusMapModal } from '@/components/modals/CampusMapModal';
import { EventsModal } from '@/components/modals/EventsModal';
import { HolidaysModal } from '@/components/modals/HolidaysModal';
import { PrivacyModal } from '@/components/modals/PrivacyModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { StudyMaterialsModal } from '@/components/modals/StudyMaterialsModal';
import { UserProfileModal } from '@/components/modals/UserProfileModal';
import { CreatePostModal } from '@/components/modals/CreatePostModal';
import { NotificationBell } from '@/components/NotificationBell';

const { width, height } = Dimensions.get('window');

const LOBBIES = [
  { id: 'All', label: 'All Feeds', emoji: '🏠' },
  { id: 'General', label: 'General Feed', emoji: '💬' },
  { id: 'Placement', label: 'Career & Placement', emoji: '💼' },
  { id: 'Clubs', label: 'Campus Clubs', emoji: '🎯' },
  { id: 'Hostels', label: 'Hostel Feeds', emoji: '🏠' },
  { id: 'Departments', label: 'Departments', emoji: '🎓' },
  { id: 'Sports', label: 'Sports & Fests', emoji: '⚽' },
  { id: 'Alumni', label: 'Alumni Network', emoji: '🎖️' },
];

// Premium pulsating skeleton card component for zero-white-flash loading state
function PostSkeleton() {
  const theme = useThemeColors();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    let isMounted = true;
    const runPulse = () => {
      if (!isMounted) return;
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web', // Safe fallback for web runtime support
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        if (isMounted) runPulse();
      });
    };
    runPulse();
    return () => {
      isMounted = false;
      pulseAnim.stopAnimation();
    };
  }, []);

  const shimmerBg = theme.isDark ? '#334155' : '#E2E8F0';

  return (
    <View style={[
      styles.skeletonCard,
      {
        backgroundColor: theme.backgroundElement,
        borderColor: theme.cardBorder,
        shadowColor: theme.isDark ? '#000000' : '#0F172A',
        shadowOpacity: theme.isDark ? 0.35 : 0.05,
        shadowRadius: 16,
      }
    ]}>
      {/* Header Row */}
      <View style={styles.skeletonHeader}>
        <Animated.View style={[styles.skeletonAvatar, { opacity: pulseAnim, backgroundColor: shimmerBg }]} />
        <View style={styles.skeletonMeta}>
          <Animated.View style={[styles.skeletonLine, { opacity: pulseAnim, backgroundColor: shimmerBg, width: 120, height: 14, marginBottom: 6 }]} />
          <Animated.View style={[styles.skeletonLine, { opacity: pulseAnim, backgroundColor: shimmerBg, width: 160, height: 10 }]} />
        </View>
      </View>

      {/* Content Skeleton */}
      <View style={styles.skeletonContent}>
        <Animated.View style={[styles.skeletonLine, { opacity: pulseAnim, backgroundColor: shimmerBg, width: '85%', height: 16, marginBottom: 12, borderRadius: 6 }]} />
        <Animated.View style={[styles.skeletonLine, { opacity: pulseAnim, backgroundColor: shimmerBg, width: '95%', height: 10, marginBottom: 8 }]} />
        <Animated.View style={[styles.skeletonLine, { opacity: pulseAnim, backgroundColor: shimmerBg, width: '90%', height: 10, marginBottom: 8 }]} />
        <Animated.View style={[styles.skeletonLine, { opacity: pulseAnim, backgroundColor: shimmerBg, width: '60%', height: 10 }]} />
      </View>

      {/* Action Buttons Row */}
      <View style={styles.skeletonActions}>
        <Animated.View style={[styles.skeletonActionBtn, { opacity: pulseAnim, backgroundColor: shimmerBg }]} />
        <Animated.View style={[styles.skeletonActionBtn, { opacity: pulseAnim, backgroundColor: shimmerBg }]} />
        <Animated.View style={[styles.skeletonActionBtn, { opacity: pulseAnim, backgroundColor: shimmerBg }]} />
      </View>
    </View>
  );
}

export default function HomeFeedScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  
  // Zustand Store integrations with useShallow for premium rendering performance
  const {
    user, posts, handleClap, addComment, submitVote,
    connections, toggleConnection, setCreatePostVisible, setCreatePostPreset,
    activeScreen, setActiveScreen, initStore,
    deletePost, editPost, togglePostBookmark, bookmarkedPostIds,
    deleteComment, editComment, isCreatePostVisible, createPostPreset, loadCommentsForPost,
    fetchPosts, isPostsRefreshing, hasMorePosts, isPostsLoading,
    isStoreHydrated, lastPostsSyncTime, blockedUserUids, blockUser
  } = useAppStore(useShallow(state => ({
    user: state.user,
    posts: state.posts,
    handleClap: state.handleClap,
    addComment: state.addComment,
    submitVote: state.submitVote,
    connections: state.connections,
    toggleConnection: state.toggleConnection,
    setCreatePostVisible: state.setCreatePostVisible,
    setCreatePostPreset: state.setCreatePostPreset,
    activeScreen: state.activeScreen,
    setActiveScreen: state.setActiveScreen,
    initStore: state.initStore,
    deletePost: state.deletePost,
    editPost: state.editPost,
    togglePostBookmark: state.togglePostBookmark,
    bookmarkedPostIds: state.bookmarkedPostIds,
    deleteComment: state.deleteComment,
    editComment: state.editComment,
    isCreatePostVisible: state.isCreatePostVisible,
    createPostPreset: state.createPostPreset,
    loadCommentsForPost: state.loadCommentsForPost,
    fetchPosts: state.fetchPosts,
    isPostsRefreshing: state.isPostsRefreshing,
    hasMorePosts: state.hasMorePosts,
    isPostsLoading: state.isPostsLoading,
    isStoreHydrated: state.isStoreHydrated,
    lastPostsSyncTime: state.lastPostsSyncTime,
    blockedUserUids: state.blockedUserUids,
    blockUser: state.blockUser
  })));

  const [showWelcome, setShowWelcome] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const handlePullToRefresh = async () => {
    try {
      await fetchPosts({ refresh: true });
    } catch (err) {
      console.warn('Pull to refresh failed:', err);
    }
  };

  const handleLoadMorePosts = async () => {
    if (loadingMore || !hasMorePosts || isPostsLoading || isPostsRefreshing) return;
    setLoadingMore(true);
    try {
      await fetchPosts({ loadMore: true });
    } catch (err) {
      console.warn('Load more posts failed:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const renderFeedFooter = () => {
    if (!hasMorePosts) {
      return (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: theme.textSecondary || '#64748B' }}>
            🎉 You have caught up with all updates!
          </Text>
        </View>
      );
    }
    if (loadingMore || isPostsLoading) {
      return (
        <View style={{ paddingVertical: 15, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={theme.primary || '#3B82F6'} />
        </View>
      );
    }
    return null;
  };

  // Load store resources and refresh actively on mount
  useEffect(() => {
    const startupFetch = async () => {
      await initStore();
      // Guarantees that every time the app is opened, it attempts to actively fetch fresh feed updates
      try {
        await fetchPosts({ refresh: true });
      } catch (err) {
        console.warn('Auto-refresh on startup failed:', err);
      }
    };
    startupFetch();
  }, []);

  // Monitor welcome state on mount / user change
  useEffect(() => {
    const triggerWelcome = async () => {
      if (user) {
        const hasWelcomed = await AsyncStorage.getItem(`welcomed_session_${user.uid}`);
        if (!hasWelcomed) {
          setShowWelcome(true);
          await AsyncStorage.setItem(`welcomed_session_${user.uid}`, 'true');
          setTimeout(() => {
            setShowWelcome(false);
          }, 3000); // 3 seconds
        }
      }
    };
    triggerWelcome();
  }, [user]);

  // Global dynamic hook registration to trigger comments modal from Notification bell
  useEffect(() => {
    (global as any).__mce_open_comments = (post: Post) => {
      if (!useAppStore.getState().user) {
        setPendingPostPreset(null);
        setIsFastLoginVisible(true);
        return;
      }
      loadCommentsForPost(post.id);
      setActivePost(post);
      setIsCommentsVisible(true);
    };
    return () => {
      delete (global as any).__mce_open_comments;
    };
  }, []);

  const { loginWithGoogle, logout, updateAcademicProfile, updateUsername, configurePassword } = useAuth();

  // ─── LOGIN SETTING STATES (PROFILE COPY) ───
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [phone, setPhone] = useState('');
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const configScrollViewRef = useRef<ScrollView>(null);
  const [password, setPassword] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [customAlert, setCustomAlert] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const maskPhoneNumber = (num: string): string => {
    if (!num) return '';
    const clean = num.replace(/\D/g, '');
    if (clean.length < 10) return num;
    return `${clean.slice(0, 3)}****${clean.slice(7)}`;
  };

  const showPremiumAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setCustomAlert({ visible: true, title, message, type });
  };

  const isUsernameLocked = useMemo(() => {
    if (!user?.usernameLastChangedAt) return false;
    const lastChanged = new Date(user.usernameLastChangedAt).getTime();
    const sixMonthsInMs = 180 * 24 * 60 * 60 * 1000;
    return (Date.now() - lastChanged) < sixMonthsInMs;
  }, [user?.usernameLastChangedAt]);

  const usernameLockRemainingText = useMemo(() => {
    if (!user?.usernameLastChangedAt) return '';
    const lastChanged = new Date(user.usernameLastChangedAt).getTime();
    const sixMonthsInMs = 180 * 24 * 60 * 60 * 1000;
    const timeDiff = Date.now() - lastChanged;
    if (timeDiff >= sixMonthsInMs) return '';
    
    const remainingDays = Math.ceil((sixMonthsInMs - timeDiff) / (24 * 60 * 60 * 1000));
    const nextAvailableDate = new Date(lastChanged + sixMonthsInMs);
    return `Locked: Next change in ${remainingDays} days (${nextAvailableDate.toLocaleDateString()})`;
  }, [user?.usernameLastChangedAt]);

  // Real-time username availability checker with 450ms debounce
  useEffect(() => {
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

  const isPasswordDirty = () => {
    if (!user) return false;
    return phone !== (user.phone || '') || password !== '' || editUsername !== (user.username || '');
  };

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

  const openPasswordConfig = () => {
    if (!user) return;
    setPhone(user.phone || '');
    setPassword('');
    setEditUsername(user.username || '');
    setUsernameStatus('idle');
    setUsernameMessage('');
    setIsPasswordModalVisible(true);
  };

  const handleSavePassword = async () => {
    const cleanPhone = phone.trim();
    const cleanPass = password.trim();
    const cleanUser = editUsername.trim().toLowerCase();

    const phoneChanged = cleanPhone !== (user?.phone || '');
    const passwordChanged = cleanPass !== '';
    const usernameChanged = cleanUser !== (user?.username || '');

    if (!phoneChanged && !passwordChanged && !usernameChanged) {
      setIsPasswordModalVisible(false);
      return;
    }

    if (phoneChanged || passwordChanged) {
      if (!cleanPhone) {
        showPremiumAlert('Missing Fields', 'Kripya apna mobile number darj karein.', 'warning');
        return;
      }
      if (cleanPhone.length !== 10 || isNaN(Number(cleanPhone))) {
        showPremiumAlert('Invalid Phone Number', 'Kripya ek sahi 10-digit mobile number type karein.', 'warning');
        return;
      }

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

    
    setIsSaving(true);
    try {
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
        
        const result = await updateUsername(cleanUser);

        if (!result.success) {
          showPremiumAlert('Failed to Claim Username', result.error || 'Failed to save username.', 'error');
          return;
        }
        
        const { setUser } = useAppStore.getState();
        await setUser({ ...user!, username: cleanUser });
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
        useAppStore.getState().showToast('Settings updated successfully! 🎉', 'success');
      }
    } catch (error: any) {
      console.error('Failed to save credentials/password:', error);
      showPremiumAlert('Error', error?.message || 'Credentials save karne me error aaya.', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  const [isFastLoginVisible, setIsFastLoginVisible] = useState(false);
  const [isFastLoginLoading, setIsFastLoginLoading] = useState(false);
  const [pendingPostPreset, setPendingPostPreset] = useState<'text' | 'photo' | 'poll' | 'anonymous' | null>(null);

  const [selectedLobby, setSelectedLobby] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [selectedCommentForOptions, setSelectedCommentForOptions] = useState<Comment | null>(null);

  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const isNavigatingRef = useRef(false);

  const safePush = (path: string) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    router.push(path as any);
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 600); // 600ms guard to prevent double-push
  };

  const safePushPost = async (path: string, postId: string) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    try {
      const exists = await verifyPostExists(postId);
      if (exists) {
        router.push(path as any);
      }
    } finally {
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 600);
    }
  };

  const closeComments = () => {
    setIsCommentsVisible(false);
    setActivePost(null);
    setEditingCommentId(null);
    setEditingCommentText('');
    setCommentText('');
  };

  // Auto-route to dedicated PostDetailScreen when routed with openComments param
  const { openComments } = useLocalSearchParams<{ openComments?: string }>();
  const hasOpenedCommentsRef = useRef(false);

  useEffect(() => {
    if (openComments && !hasOpenedCommentsRef.current) {
      hasOpenedCommentsRef.current = true;
      router.push(`/post/${openComments}`);
    }
  }, [openComments]);

  // Auto-open campus events calendar when routed with openEvent param
  const { openEvent } = useLocalSearchParams<{ openEvent?: string }>();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const hasOpenedEventRef = useRef(false);

  useEffect(() => {
    if (openEvent && !hasOpenedEventRef.current) {
      setSelectedEventId(openEvent);
      setIsEventsListVisible(true);
      hasOpenedEventRef.current = true;
    }
  }, [openEvent]);

  // Auto-open study materials library catalog when routed with openStudy param
  const { openStudy } = useLocalSearchParams<{ openStudy?: string }>();
  const hasOpenedStudyRef = useRef(false);

  useEffect(() => {
    if (openStudy && !hasOpenedStudyRef.current) {
      setIsGalleryVisible(true);
      hasOpenedStudyRef.current = true;
    }
  }, [openStudy]);

  // Side-drawer modals state
  const customDrawerRef = useRef<CustomDrawerRef>(null);
  const [activeModalRequest, setActiveModalRequest] = useState<string | null>(null);
  const [isAboutVisible, setIsAboutVisible] = useState(false);
  const [isAboutAppVisible, setIsAboutAppVisible] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [isHolidaysVisible, setIsHolidaysVisible] = useState(false);
  const [isEventsListVisible, setIsEventsListVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isPrivacyVisible, setIsPrivacyVisible] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<{
    id?: string;
    name: string;
    role: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest';
    photoUrl?: string;
    department?: string;
    batch?: string;
  } | null>(null);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

  // Monitor side-drawer triggers
  const handleDrawerNavigate = (screen: string) => {
    setActiveScreen(screen);
    // Real runtime stability: Close the explore menu modal when drawer navigation occurs
    useAppStore.getState().setExploreMenuVisible(false);
    useAppStore.getState().setExploreActiveView('hub');
    
    if (screen === 'Sign In') {
      safePush('/login');
    } else if (screen === 'Profile tab') {
      safePush('/profile');
    } else if (screen === 'Home Feed') {
      // Stay on home screen feed
    } else if (screen === 'Syllabus') {
      safePush('/syllabus');
    } else if (screen === 'Study Materials') {
      setIsGalleryVisible(true);
    } else if (screen === 'College Notices') {
      safePush('/notice');
    } else if (screen === 'Academic Departments') {
      safePush('/departments');
    } else if (screen === 'Faculty Directory') {
      safePush('/faculty');
    } else if (screen === 'Hostels & Campus Living') {
      if (user?.role === 'Guest') {
        Alert.alert(
          'Login Required 🔐',
          'Hostel details dekhne ke liye pehle Google se login karein.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Login with Google', onPress: () => router.replace('/login') }
          ]
        );
      } else {
        safePush('/hostels');
      }
    } else if (screen === 'Contact Support') {
      safePush('/support');
    } else {
      // detailed campus modals
      setActiveModalRequest(screen);
    }
  };

  useEffect(() => {
    if (!activeModalRequest) return;
    if (activeModalRequest === 'About MCE Motihari') setIsAboutVisible(true);
    else if (activeModalRequest === 'About App') setIsAboutAppVisible(true);
    else if (activeModalRequest === 'Interactive Campus Map') setIsMapVisible(true);
    else if (activeModalRequest === 'Study Materials') setIsGalleryVisible(true);
    else if (activeModalRequest === 'Academic Holidays') setIsHolidaysVisible(true);
    else if (activeModalRequest === 'Events & Fests') setIsEventsListVisible(true);
    else if (activeModalRequest === 'Settings') setIsSettingsVisible(true);
    else if (activeModalRequest === 'Privacy Policy') setIsPrivacyVisible(true);
    
    setActiveModalRequest(null);
  }, [activeModalRequest]);

  // connection lookups
  const getConnectionStatus = (authorName: string) => {
    const contact = connections.find(c => c.name === authorName);
    return contact ? contact.status : 'Connect';
  };

  const handleConnectToggle = async (authorName: string, authorUid?: string, authorRole?: string, authorPhoto?: string) => {
    if (!user) return;
    if (!authorUid) {
      Alert.alert('Connection Failed', 'Profile ID not found. Unable to connect.');
      return;
    }

    // Check if connection already exists or is sent
    const contact = connections.find(c => c.id === authorUid);
    if (contact && (contact.status === 'Connected' || contact.status === 'Sent')) {
      return;
    }

    try {
      const { doc, setDoc } = require('firebase/firestore');
      const { db } = require('@/config/firebase');

      const requestId = `connection_request_${user.uid}_${authorUid}`;

      // 1. Write the connection request notification to the recipient user's subcollection
      const notifDocRef = doc(db, 'users', authorUid, 'notifications', requestId);
      await setDoc(notifDocRef, {
        type: 'connection_request',
        title: '🤝 New Connection Request',
        body: `${user.name} wants to connect with you.`,
        timestamp: new Date().toLocaleString(),
        read: false,
        senderUid: user.uid,
        senderName: user.name,
        senderPhoto: user.photoUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(user.name || 'Felix')}`,
        senderBranch: user.department || '',
        senderBatch: user.batch || '',
        senderUsername: user.username || '',
        senderRole: user.role || 'Student',
        status: 'pending',
      });

      // 1.5 Write connection 'Sent' locally to A's connections in Firestore
      const selfConnRef = doc(db, 'users', user.uid, 'connections', authorUid);
      await setDoc(selfConnRef, {
        id: authorUid,
        name: authorName,
        role: authorRole || 'Student',
        branch: 'MCE',
        batch: 'N/A',
        image: authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}`,
        status: 'Sent',
        connectedAt: new Date().toISOString()
      });

      // 2. Add connection locally in store as "Sent"
      const newConn = {
        id: authorUid,
        name: authorName,
        role: (authorRole === 'Guest' ? 'Student' : (authorRole === 'Other' ? 'Faculty' : authorRole)) as any,
        branch: 'MCE',
        batch: 'N/A',
        image: authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}`,
        status: 'Sent' as const,
      };

      const updated = [...(connections || []).filter(c => c.id !== authorUid), newConn];
      useAppStore.setState({ connections: updated });
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('@mce_connections', JSON.stringify(updated));

      const sortedPosts = sortPostsPriority(useAppStore.getState().posts, updated);
      useAppStore.setState({ posts: sortedPosts });
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(sortedPosts));

      if (Platform.OS === 'web') {
        alert('Request Sent! Connection request sent successfully to ' + authorName);
      } else {
        Alert.alert('Request Sent 🤝', 'Connection request sent successfully to ' + authorName);
      }
    } catch (err: any) {
      console.error('Failed to send request:', err);
      Alert.alert('Connection Failed', 'Failed to send connection request.');
    }
  };

  const handleSendComment = async () => {
    if (!user) {
      Alert.alert(
        'Login Required 🔐',
        'Community me comments post karne ke liye pehle Google se login karein.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login with Google', onPress: () => safePush('/login') }
        ]
      );
      return;
    }
    if (!activePost || !commentText.trim() || isCommentSubmitting) return;
    
    const textToCheck = commentText.trim();
    if (textToCheck.length > 100) {
      Alert.alert('Limit Reached ⚠️', 'Comment limit 100 characters hai.');
      return;
    }
    if (hasDuplicateEmojis(textToCheck)) {
      Alert.alert("Moderation Notice 🔒", "Oops! You cannot repeat the same emoji more than 5 times consecutively in a single comment.");
      return;
    }

    setIsCommentSubmitting(true);
    try {
      if (editingCommentId) {
        await editComment(activePost.id, editingCommentId, textToCheck);
        setEditingCommentId(null);
        setEditingCommentText('');
      } else {
        await addComment(activePost.id, user.name, user.role, textToCheck);
      }
      
      const updatedPost = useAppStore.getState().posts.find(p => p.id === activePost.id);
      if (updatedPost) setActivePost(updatedPost);
      
      setCommentText('');
    } catch (err: any) {
      showAppError('Comment Submission Failed', err);
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleQuickEmojiComment = (emoji: string) => {
    if (!user) {
      Alert.alert(
        'Login Required 🔐',
        'React ya comment karne ke liye pehle Google se login karein.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login with Google', onPress: () => safePush('/login') }
        ]
      );
      return;
    }
    setCommentText(prev => prev + emoji);
  };

  const handleSignOut = async () => {
    await logout();
    router.replace('/login');
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
              const { Linking } = require('react-native');
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
              Alert.alert('Mail Error', 'Default email app open karne me error aaya. Kripya mcemotihari.tech@gmail.com par direct mail karein!');
            }
          }
        }
      ]
    );
  };

  const handleCanManageComment = (comment: Comment) => {
    if (!user) return { canEdit: false, canDelete: false };
    
    // Check ownership by UID for robustness, falling back to name for legacy assets
    const isMyComment = comment.userId ? comment.userId === user.uid : comment.userName === user.name;
    const isMyPost = activePost && (activePost.authorUid ? activePost.authorUid === user.uid : (activePost.authorName === user.name || activePost.authorRealName === user.name));
    
    return {
      canEdit: isMyComment,
      canDelete: isMyComment || isMyPost
    };
  };

  const handleCommentOptions = (comment: Comment) => {
    setSelectedCommentForOptions(comment);
  };

  const handleCreatePostPress = (preset: 'text' | 'photo' | 'poll' | 'anonymous') => {
    if (!user || user.role === 'Guest') {
      setPendingPostPreset(preset);
      setIsFastLoginVisible(true);
      return;
    }
    setCreatePostPreset(preset);
    setCreatePostVisible(true);
  };

  const handleFastGoogleLogin = async () => {
    setIsFastLoginLoading(true);
    try {
      const success = await loginWithGoogle();
      if (success) {
        setIsFastLoginVisible(false);
        if (pendingPostPreset) {
          setCreatePostPreset(pendingPostPreset);
          setCreatePostVisible(true);
          setPendingPostPreset(null);
        }
      } else {
        showAppError('Google Sign-In Failed', 'Unable to complete fast login. Please try again.');
      }
    } catch (err) {
      showAppError('Google Sign-In Error', err);
    } finally {
      setIsFastLoginLoading(false);
    }
  };

  const handleLocalClap = (id: string) => {
    if (!user) {
      setPendingPostPreset(null);
      setIsFastLoginVisible(true);
      return;
    }
    handleClap(id);
  };

  const handleLocalVote = (postId: string, optionId: string) => {
    if (!user) {
      setPendingPostPreset(null);
      setIsFastLoginVisible(true);
      return;
    }
    submitVote(postId, optionId);
  };

  const handleLocalConnectToggle = (name: string, authorUid?: string, authorRole?: string, authorPhoto?: string) => {
    if (!user) {
      setPendingPostPreset(null);
      setIsFastLoginVisible(true);
      return;
    }
    handleConnectToggle(name, authorUid, authorRole, authorPhoto);
  };

  const handleLocalToggleBookmark = (id: string) => {
    if (!user) {
      Alert.alert(
        'Login Required 🔐',
        'Posts save (bookmark) karne ke liye pehle Google se login karein.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login with Google', onPress: () => safePush('/login') }
        ]
      );
      return;
    }
    togglePostBookmark(id);
  };

  const handleSharePost = async (post: Post) => {
    try {
      const postUrl = `https://mcemotihari-app.web.app/post/${post.id}`;
      const titlePrefix = post.title ? `"${post.title}"\n` : '';
      
      // Concise short description (max 120 chars)
      let shortContent = post.content || '';
      if (shortContent.length > 120) {
        shortContent = shortContent.substring(0, 117) + '...';
      }
      
      let shareMessage = `Hey MCEians! 👋\n\n`;
      shareMessage += `Check out this post on MCE Connect (developed by Alumni & Students):\n\n`;
      shareMessage += `${titlePrefix}${shortContent}\n\n`;
      shareMessage += `📲 Download MCE Connect App!\n\n`;
      shareMessage += `Read full post here:\n`;
      // Put URL at the VERY END of the message for WhatsApp/Telegram to fetch Open Graph previews properly.
      shareMessage += `${postUrl}`;

      await Share.share({
        title: post.title || 'MCE Connect Post',
        message: shareMessage,
        url: postUrl, // This triggers rich previews on iOS automatically
      });
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  // Filter posts instantly by active lobby channel and search query
  // Filter posts instantly by active lobby channel, blocked users, and search query
  const filteredPosts = useMemo(() => {
    let result = selectedLobby === 'All'
      ? posts
      : posts.filter(post => post.category === selectedLobby);

    // Hide posts from blocked users
    if (blockedUserUids && blockedUserUids.length > 0) {
      result = result.filter(post => !post.authorUid || !blockedUserUids.includes(post.authorUid));
    }

    // Filter out deleted, missing, orphaned, or inaccessible posts
    result = result.filter(post => post && post.id && (post.content || post.title || post.pollOptions) && post.authorName);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(post => 
        (post.title && post.title.toLowerCase().includes(q)) ||
        (post.content && post.content.toLowerCase().includes(q)) ||
        (post.authorName && post.authorName.toLowerCase().includes(q))
      );
    }
    return result;
  }, [posts, selectedLobby, searchQuery, blockedUserUids]);

  const renderFeedItem = useCallback(({ item }: { item: Post }) => (
    <PostCard
      item={item}
      user={user}
      connectionStatus={getConnectionStatus(item.authorName)}
      isBookmarked={bookmarkedPostIds?.includes(item.id)}
      onClap={(id) => handleLocalClap(id)}
      onCommentPress={(post) => safePushPost(`/post/${post.id}?focus=true&from=feed`, post.id)}
      onPressCard={(postId) => safePushPost(`/post/${postId}?from=feed`, postId)}
      onVote={(postId, optionId) => handleLocalVote(postId, optionId)}
      onConnectToggle={(name, uid, role, photo) => handleLocalConnectToggle(name, uid, role, photo)}
      onLinkPress={(url) => safePush(url as any)}
      onSharePress={() => handleSharePost(item)}
      onToggleBookmark={(id) => handleLocalToggleBookmark(id)}
      onDeletePost={(id) => deletePost(id)}
      onEditPost={(id, content) => editPost(id, content)}
      onBlockAuthor={(authorUid) => blockUser(authorUid)}
      onAuthorPress={(author) => {
        if (!user) {
          setPendingPostPreset(null);
          setIsFastLoginVisible(true);
          return;
        }
        if (user && (author.uid === user.uid || author.name === user.name || author.name === user.email)) {
          safePush('/profile');
          return;
        }
        if (author.uid) {
          safePush(`/@${author.uid}?from=feed`);
        }
      }}
    />
  ), [user, bookmarkedPostIds, connections, safePush, handleLocalClap, safePushPost, handleLocalVote, handleLocalConnectToggle, handleSharePost, handleLocalToggleBookmark, deletePost, editPost, blockUser]);

  return (
    <CustomDrawer
      ref={customDrawerRef}
      user={user}
      onLoginPress={() => safePush('/login')}
      onProfilePress={() => safePush('/profile')}
      onLogoutPress={handleSignOut}
      onNavigate={handleDrawerNavigate}
      activeScreen={activeScreen}
    >
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
        {showWelcome && (
          <View style={styles.welcomeToast}>
            <Ionicons name="sparkles" size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.welcomeToastText}>Welcome to MCE Digital campus!</Text>
          </View>
        )}
        {/* 1. Sleek Modern Feed Header with Side Drawer triggers */}
        <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
          <TouchableOpacity 
            style={styles.menuBtn} 
            onPress={() => customDrawerRef.current?.open()}
            activeOpacity={0.6}
          >
            <Ionicons name="menu-outline" size={26} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerBranding}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>MCE Connect</Text>
          </View>
          <NotificationBell />
        </View>

        {/* LinkedIn-style Global Search Bar */}
        <View style={[styles.searchSection, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
            <Ionicons
              name="search-outline"
              size={18}
              color="#94A3B8"
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search feed, updates, or members..."
              placeholderTextColor="#94A3B8"
              style={[styles.searchInput, { color: theme.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 2. FlatList Feed */}
        {!isStoreHydrated ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.feedScroll}
            style={{ flex: 1 }}
          >
            {/* Mind Card Skeleton */}
            <View style={[
              styles.mindCard, 
              { 
                backgroundColor: theme.backgroundElement, 
                borderColor: theme.cardBorder,
                shadowColor: theme.isDark ? '#000000' : '#0F172A',
                shadowOpacity: theme.isDark ? 0.35 : 0.04,
                shadowRadius: 16,
                borderRadius: 22,
                marginTop: 14,
                marginBottom: 10,
              }
            ]}>
              <View style={styles.mindRow}>
                <Animated.View style={[styles.skeletonAvatar, { opacity: 0.5, backgroundColor: theme.isDark ? '#334155' : '#E2E8F0' }]} />
                <View style={[styles.mindInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, borderWidth: 1, justifyContent: 'center', paddingLeft: 12, height: 40 }]}>
                  <Animated.View style={[styles.skeletonLine, { width: '65%', height: 10, borderRadius: 4, opacity: 0.5, backgroundColor: theme.isDark ? '#334155' : '#E2E8F0' }]} />
                </View>
              </View>
            </View>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </ScrollView>
        ) : (
          <FlatList
            data={filteredPosts}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={50}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={
              <RefreshControl
                refreshing={isPostsRefreshing}
                onRefresh={handlePullToRefresh}
                colors={[theme.primary || '#3B82F6']}
                tintColor={theme.primary || '#3B82F6'}
              />
            }
            onEndReached={handleLoadMorePosts}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFeedFooter}
            renderItem={renderFeedItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.feedScroll}
            ListHeaderComponent={
              <View style={[
                styles.mindCard, 
                { 
                  backgroundColor: theme.backgroundElement, 
                  borderColor: theme.cardBorder,
                  shadowColor: theme.isDark ? '#000000' : '#0F172A',
                  shadowOpacity: theme.isDark ? 0.35 : 0.04,
                  shadowRadius: 16,
                  borderRadius: 22,
                }
              ]}>
                <View style={styles.mindRow}>
                  <Image
                    source={{ uri: (user && user.role !== 'Guest' && user.photoUrl) ? user.photoUrl : 'https://cdn-icons-png.flaticon.com/512/149/149071.png' }}
                    style={[styles.mindAvatar, { borderColor: theme.cardBorder, borderWidth: 1 }]}
                  />
                  <TouchableOpacity
                    style={[styles.mindInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, borderWidth: 1 }]}
                    onPress={() => handleCreatePostPress('text')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.mindInputPlaceholder, { color: theme.textSecondary }]}>share you thoughts...</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.mindActionDivider, { backgroundColor: theme.cardBorder }]} />

                <View style={styles.mindActionsRow}>
                  <TouchableOpacity 
                    style={[styles.mindActionBtn, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.08)' : '#EFF6FF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }]} 
                    onPress={() => handleCreatePostPress('photo')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="image" size={16} color="#3B82F6" />
                    <Text style={[styles.mindActionText, { color: '#3B82F6' }]}>Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.mindActionBtn, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.08)' : '#FFF7ED', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }]} 
                    onPress={() => handleCreatePostPress('poll')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="stats-chart" size={16} color="#F97316" />
                    <Text style={[styles.mindActionText, { color: '#F97316' }]}>Poll</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.mindActionBtn, { backgroundColor: theme.isDark ? 'rgba(168, 85, 247, 0.08)' : '#F5F3FF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }]} 
                    onPress={() => handleCreatePostPress('anonymous')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="eye-off" size={16} color="#A855F7" />
                    <Text style={[styles.mindActionText, { color: '#A855F7' }]}>Anonymous</Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
            ListEmptyComponent={
              (isPostsLoading || lastPostsSyncTime === 0) ? (
                <View style={{ flex: 1, paddingVertical: 10 }}>
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                </View>
              ) : (
                <View style={styles.center}>
                  <Text style={styles.emptyEmoji}>📭</Text>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>Feed is quiet</Text>
                  <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
                    Be the first to share an update in the #{LOBBIES.find(l => l.id === selectedLobby)?.label || selectedLobby} channel!
                  </Text>
                </View>
              )
            }
          />
        )}

        {/* 3. COMMENTS SHEET OVERLAY MODAL */}
        <Modal visible={isCommentsVisible} animationType="slide" transparent onRequestClose={closeComments}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFillObject} 
              activeOpacity={1} 
              onPress={closeComments} 
            />
            
            <View style={[styles.bottomSheet, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={[styles.sheetHandle, { backgroundColor: theme.cardBorder }]} />
              <View style={[styles.sheetHeader, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.sheetTitle, { color: theme.text }]}>Comments ({activePost?.commentsCount || 0})</Text>
                <TouchableOpacity onPress={closeComments}>
                  <Text style={[styles.sheetClose, { color: theme.textSecondary }]}>Close</Text>
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
              >
                <FlatList
                  data={activePost?.comments || []}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.commentList}
                  ListHeaderComponent={() => (
                    activePost ? (
                      <View style={{ marginBottom: 12 }}>
                        <PostCard
                          item={activePost}
                          user={user}
                          connectionStatus={getConnectionStatus(activePost.authorName)}
                          isBookmarked={bookmarkedPostIds?.includes(activePost.id)}
                          onClap={(id) => handleLocalClap(id)}
                          onCommentPress={() => {}}
                          onVote={(postId, optionId) => handleLocalVote(postId, optionId)}
                          onConnectToggle={(name, uid, role, photo) => handleLocalConnectToggle(name, uid, role, photo)}
                          onLinkPress={(url) => safePush(url as any)}
                          onSharePress={() => handleSharePost(activePost)}
                          onToggleBookmark={(id) => handleLocalToggleBookmark(id)}
                          onDeletePost={(id) => deletePost(id)}
                          onEditPost={(id, content) => editPost(id, content)}
                          onBlockAuthor={(authorUid) => blockUser(authorUid)}
                          onAuthorPress={(author) => {
                             closeComments();
                              if (author.uid) {
                                router.push(author.uid === user?.uid ? '/profile' : `/@${author.uid}?from=feed`);
                              }
                           }}
                        />
                        <View style={{ borderBottomWidth: 1, borderBottomColor: theme.cardBorder, marginVertical: 8, marginHorizontal: 16 }} />
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text, marginLeft: 16, marginVertical: 4 }}>
                          Discussion
                        </Text>
                      </View>
                    ) : null
                  )}
                  ListEmptyComponent={
                    <View style={styles.center}>
                      <Text style={styles.emptyEmoji}>💬</Text>
                      <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>No comments yet. Start the conversation!</Text>
                    </View>
                  }
                  renderItem={({ item }: { item: Comment }) => (
                    <View style={[styles.commentCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                      <View style={styles.commentHeader}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}
                          onPress={() => {
                            if (item.userId) {
                              closeComments();
                               router.push(item.userId === user?.uid ? '/profile' : `/@${item.userId}?from=feed`);
                             }
                          }}
                        >
                          <Image
                            source={{ uri: item.userPhoto || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(item.userName) + '&background=0F172A&color=fff&size=60') }}
                            style={styles.commentAvatar}
                          />
                          <View style={styles.commentMeta}>
                            <Text style={[styles.commentName, { color: theme.text }]}>{item.userName}</Text>
                            <VerifiedBadge role={item.userRole} size="mini" />
                          </View>
                        </TouchableOpacity>
                        <Text style={[styles.commentTime, { color: theme.textSecondary }]}>{item.timestamp}</Text>
                        
                        {/* 3-dots comment options */}
                        {handleCanManageComment(item).canDelete && (
                          <TouchableOpacity 
                            style={styles.commentMoreBtn}
                            onPress={() => handleCommentOptions(item)}
                          >
                            <Ionicons name="ellipsis-horizontal" size={14} color={theme.textSecondary} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={[styles.commentBody, { color: theme.text }]}>{item.text}</Text>
                    </View>
                  )}
                />

                {/* Editing Comment Banner */}
                {editingCommentId && (
                  <View style={[styles.editingCommentBanner, { backgroundColor: theme.background, borderBottomColor: theme.cardBorder }]}>
                    <Text style={[styles.editingCommentText, { color: theme.textSecondary }]} numberOfLines={1}>
                      Editing comment: "{editingCommentText}"
                    </Text>
                    <TouchableOpacity onPress={() => { setEditingCommentId(null); setCommentText(''); }}>
                      <Ionicons name="close-circle" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Emojis Suggestion Row */}
                <View style={[styles.emojiSuggestionRow, { borderTopColor: theme.cardBorder }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiScrollContent}>
                    {['👍', '❤️', '👏', '🔥', '🙌', '💯', '😮', '🚀', '😍', '🎉'].map((emoji, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={[styles.emojiBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                        onPress={() => handleQuickEmojiComment(emoji)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Comment Input Box */}
                <View style={[styles.commentInputRow, { borderTopColor: theme.cardBorder }]}>
                  <TextInput
                    style={[styles.commentInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
                    placeholder="Add a comment on the post..."
                    placeholderTextColor="#94A3B8"
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={100}
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
                    onPress={handleSendComment}
                    disabled={!commentText.trim()}
                  >
                    <Ionicons name="send" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </View>
        </Modal>

        {/* ─── MODAL DRAWERS FROM DRAWER TRIGGER NAVS ─── */}
        <AboutModal visible={isAboutVisible} onClose={() => setIsAboutVisible(false)} />
        <AboutAppModal visible={isAboutAppVisible} onClose={() => setIsAboutAppVisible(false)} />
        <CampusMapModal visible={isMapVisible} onClose={() => setIsMapVisible(false)} />
        <EventsModal 
          visible={isEventsListVisible} 
          onClose={() => {
            setIsEventsListVisible(false);
            setSelectedEventId(null);
          }} 
          initialEventId={selectedEventId}
        />
        <HolidaysModal visible={isHolidaysVisible} onClose={() => setIsHolidaysVisible(false)} />
        <PrivacyModal visible={isPrivacyVisible} onClose={() => setIsPrivacyVisible(false)} />
        <SettingsModal 
          visible={isSettingsVisible} 
          onClose={() => setIsSettingsVisible(false)}
          onTriggerPassword={() => {
            setIsSettingsVisible(false);
            openPasswordConfig();
          }}
          onTriggerLogout={handleSignOut}
          onTriggerDeleteProfile={handleDeleteProfile}
          onOpenAbout={() => {
            setIsSettingsVisible(false);
            setTimeout(() => setIsAboutVisible(true), 280);
          }}
          onOpenPrivacy={() => {
            setIsSettingsVisible(false);
            setTimeout(() => setIsPrivacyVisible(true), 280);
          }}
        />
        <StudyMaterialsModal visible={isGalleryVisible} onClose={() => setIsGalleryVisible(false)} />

        {/* ─── PUBLIC BENTO USER PROFILE MODAL ─── */}
        <UserProfileModal
          visible={isProfileModalVisible}
          onClose={() => {
            setIsProfileModalVisible(false);
            setSelectedProfileUser(null);
          }}
          userProfile={selectedProfileUser}
        />

        <CreatePostModal
          visible={isCreatePostVisible}
          onClose={() => setCreatePostVisible(false)}
          presetType={createPostPreset}
        />

        {/* Fast Google Login Modal Overlay */}
        <Modal
          visible={isFastLoginVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsFastLoginVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFillObject} 
              activeOpacity={1} 
              onPress={() => setIsFastLoginVisible(false)} 
            />
            <View style={[styles.bottomSheet, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, height: 260 }]}>
              <View style={[styles.sheetHandle, { backgroundColor: theme.cardBorder }]} />
              <View style={[styles.sheetHeader, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.sheetTitle, { color: theme.text, fontSize: 16 }]}>Fast Login 🔒</Text>
                <TouchableOpacity onPress={() => setIsFastLoginVisible(false)}>
                  <Ionicons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={{ paddingHorizontal: 20, paddingTop: 18, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 20 }}>
                  Guests cannot post updates to campus feeds. Complete a quick Google Sign-In below to instantly unlock the caption editor and share with the MCE community!
                </Text>

                {/* Google Sign-In Button */}
                <TouchableOpacity
                  style={{ 
                    backgroundColor: '#FFFFFF', 
                    borderWidth: 1.2, 
                    borderColor: '#CBD5E1', 
                    height: 46, 
                    borderRadius: 12,
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    flexDirection: 'row',
                    width: '100%',
                    boxShadow: Platform.OS === 'web' ? `${0}px ${2}px ${4}px #000` : undefined,

                    elevation: 1,
                  }}
                  onPress={handleFastGoogleLogin}
                  disabled={isFastLoginLoading}
                  activeOpacity={0.85}
                >
                  {isFastLoginLoading ? (
                    <ActivityIndicator size="small" color="#1E293B" />
                  ) : (
                    <>
                      <Image
                        source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/1024px-Google_%22G%22_logo.svg.png' }}
                        style={{ width: 16, height: 16, marginRight: 10 }}
                      />
                      <Text style={{ color: '#1E293B', fontSize: 13.5, fontWeight: '700', letterSpacing: 0.15 }}>Sign in with Google (Fast Login)</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── WEB & MOBILE UNIFIED COMMENT ACTIONS MODAL ─── */}
        <Modal
          visible={selectedCommentForOptions !== null}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedCommentForOptions(null)}
        >
          <TouchableOpacity 
            style={styles.actionSheetBackdrop} 
            activeOpacity={1} 
            onPress={() => setSelectedCommentForOptions(null)}
          >
            <View style={[styles.actionSheetCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={styles.actionSheetHeader}>
                <Text style={[styles.actionSheetTitle, { color: theme.text }]}>Comment Options</Text>
                <Text style={[styles.actionSheetSub, { color: theme.textSecondary }]}>Choose an action for this comment</Text>
              </View>

              <View style={styles.actionSheetOptions}>
                {selectedCommentForOptions && handleCanManageComment(selectedCommentForOptions).canEdit && (
                  <TouchableOpacity
                    style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                    onPress={() => {
                      const comment = selectedCommentForOptions;
                      setSelectedCommentForOptions(null);
                      setEditingCommentId(comment.id);
                      setEditingCommentText(comment.text);
                      setCommentText(comment.text);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={18} color="#3B82F6" style={{ marginRight: 6 }} />
                    <Text style={[styles.actionSheetBtnText, { color: theme.text }]}>Edit Comment</Text>
                  </TouchableOpacity>
                )}

                {selectedCommentForOptions && handleCanManageComment(selectedCommentForOptions).canDelete && (
                  <TouchableOpacity
                    style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                    onPress={() => {
                      const comment = selectedCommentForOptions;
                      setSelectedCommentForOptions(null);
                      setTimeout(() => {
                        if (Platform.OS === 'web') {
                          const confirmed = window.confirm("Are you sure you want to permanently delete this comment?");
                          if (confirmed && activePost) {
                            deleteComment(activePost.id, comment.id).then(() => {
                              const updatedPost = useAppStore.getState().posts.find(p => p.id === activePost.id);
                              if (updatedPost) setActivePost(updatedPost);
                            });
                          }
                        } else {
                          Alert.alert(
                            'Delete Comment',
                            'Are you sure you want to permanently delete this comment?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Delete', 
                                style: 'destructive', 
                                onPress: async () => {
                                  if (!activePost) return;
                                  await deleteComment(activePost.id, comment.id);
                                  const updatedPost = useAppStore.getState().posts.find(p => p.id === activePost.id);
                                  if (updatedPost) setActivePost(updatedPost);
                                } 
                              }
                            ]
                          );
                        }
                      }, 100);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={[styles.actionSheetBtnText, { color: '#EF4444' }]}>Delete Comment</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.actionSheetCancelBtn, { backgroundColor: theme.background }]}
                onPress={() => setSelectedCommentForOptions(null)}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionSheetCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ─── CREATE / CHANGE PASSWORD MODAL (LOGIN SETTING) ─── */}
        {isPasswordModalVisible && user && (
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
                    <TextInput
                      style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text, height: 44, marginBottom: 0 }]}
                      placeholder={user.hasPassword ? "Enter new password to change or leave empty" : "Min 6 characters password"}
                      placeholderTextColor="#6D679E"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => {
                        setTimeout(() => {
                          configScrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 150);
                      }}
                    />
                    <PasswordHelperText
                      password={password}
                      result={validatePassword(password)}
                    />
                  </View>

                  <TouchableOpacity style={styles.saveSubmitBtn} onPress={handleSavePassword} activeOpacity={0.8} disabled={isSaving}>
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.saveSubmitBtnText}>Confirm Settings</Text>
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
                boxShadow: Platform.OS === 'web' ? `${0}px ${10}px ${20}px rgba(0,0,0,0.15)` : undefined,
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

      </SafeAreaView>
    </CustomDrawer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 40,
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
  menuBtn: {
    padding: 4,
  },
  headerBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerIcon: {
    padding: 4,
  },
  feedScroll: {
    flexGrow: 1,
    paddingBottom: 150,
  },
  
  mindCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    boxShadow: Platform.OS === 'web' ? `${0}px ${2}px ${4}px #000` : undefined,

    elevation: 1,
  },
  mindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mindAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  mindInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  mindInputPlaceholder: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  mindActionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  mindActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  mindActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  mindActionText: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#475569',
  },

  // Generic Centers
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  emptyBody: {
    fontSize: 12.5,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 4,
  },

  // Modal Sheet Generic
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: height * 0.88,
    flex: 1,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 16.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sheetClose: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: 'bold',
    padding: 4,
  },

  // Comment layout
  commentList: {
    paddingVertical: 8,
    gap: 8,
    flexGrow: 1,
  },
  commentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 0.8,
    borderColor: '#E2E8F0',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentMeta: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 3,
  },
  commentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  commentTime: {
    fontSize: 9.5,
    color: '#6B7280',
    marginLeft: 'auto',
  },
  commentBody: {
    fontSize: 12.5,
    color: '#111827',
    lineHeight: 17,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#111827',
    fontSize: 13.5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#FED7AA',
  },
  
  // Lobby Tab styling
  lobbyContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
  },
  lobbyScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  lobbyTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  lobbyTabActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  lobbyEmoji: {
    fontSize: 13,
  },
  lobbyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  lobbyLabelActive: {
    color: '#F97316',
    fontWeight: 'bold',
  },
  commentMoreBtn: {
    padding: 4,
    marginLeft: 6,
  },
  emojiSuggestionRow: {
    paddingVertical: 8,
    borderTopWidth: 0.5,
  },
  emojiScrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  emojiBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 14,
  },
  editingCommentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
  },
  editingCommentText: {
    fontSize: 11,
    fontWeight: 'bold',
    flex: 1,
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
    marginLeft: 12,
  },
  actionSheetCancelBtn: {
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  actionSheetCancelText: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  welcomeToast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    alignSelf: 'center',
    backgroundColor: '#F97316', // MCE orange
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${8}px #000` : undefined,

    elevation: 10,
    zIndex: 9999,
  },
  welcomeToastText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13.5,
  },

  // ─── MODAL DIALOG STYLING (COPIED FROM PROFILE) ───
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
  inputGroup: {
    marginBottom: 12,
    width: '100%',
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
  skeletonCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  skeletonMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  skeletonLine: {
    borderRadius: 4,
  },
  skeletonContent: {
    marginBottom: 16,
  },
  skeletonActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  skeletonActionBtn: {
    width: '28%',
    height: 28,
    borderRadius: 14,
  },
});
