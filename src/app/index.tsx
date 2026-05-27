import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, View, Text, Image, TouchableOpacity, FlatList,
  Modal, KeyboardAvoidingView, Platform, TextInput, Dimensions,
  ScrollView, Share, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, Post, Comment } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { hasDuplicateEmojis } from '@/utils/emojiValidator';
import { useAuth } from '@/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Components & Modals
import { CustomDrawer, CustomDrawerRef } from '@/components/drawer/CustomDrawer';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { PostCard } from '@/components/PostCard';

// Modals for side drawer actions
import { AboutModal } from '@/components/modals/AboutModal';
import { CampusMapModal } from '@/components/modals/CampusMapModal';
import { EventsModal } from '@/components/modals/EventsModal';
import { HolidaysModal } from '@/components/modals/HolidaysModal';
import { PrivacyModal } from '@/components/modals/PrivacyModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { StudyMaterialsModal } from '@/components/modals/StudyMaterialsModal';
import { UserProfileModal } from '@/components/modals/UserProfileModal';
import { CreatePostModal } from '@/components/modals/CreatePostModal';
import { NotificationBell } from '@/components/NotificationBell';

const { height } = Dimensions.get('window');

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

export default function HomeFeedScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  
  // Zustand Store integrations with useShallow for premium rendering performance
  const {
    user, posts, handleClap, addComment, submitVote,
    connections, toggleConnection, setCreatePostVisible, setCreatePostPreset,
    activeScreen, setActiveScreen, initStore,
    deletePost, editPost, togglePostBookmark, bookmarkedPostIds,
    deleteComment, editComment, isCreatePostVisible, createPostPreset, loadCommentsForPost
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
    loadCommentsForPost: state.loadCommentsForPost
  })));

  const [showWelcome, setShowWelcome] = useState(false);

  // Load store resources on mount
  useEffect(() => {
    initStore();
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

  const { loginWithGoogle, logout } = useAuth();
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

  // Auto-open comments bottom sheet when routed with openComments param
  const { openComments } = useLocalSearchParams<{ openComments?: string }>();
  const hasOpenedCommentsRef = useRef(false);

  useEffect(() => {
    if (openComments && posts.length > 0 && !hasOpenedCommentsRef.current) {
      const post = posts.find(p => p.id === openComments);
      if (post) {
        if (!user) {
          setPendingPostPreset(null);
          setIsFastLoginVisible(true);
          hasOpenedCommentsRef.current = true;
          return;
        }
        loadCommentsForPost(post.id);
        setActivePost(post);
        setIsCommentsVisible(true);
        hasOpenedCommentsRef.current = true;
      }
    }
  }, [openComments, posts, user]);

  // Side-drawer modals state
  const customDrawerRef = useRef<CustomDrawerRef>(null);
  const [activeModalRequest, setActiveModalRequest] = useState<string | null>(null);
  const [isAboutVisible, setIsAboutVisible] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [isHolidaysVisible, setIsHolidaysVisible] = useState(false);
  const [isEventsListVisible, setIsEventsListVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isPrivacyVisible, setIsPrivacyVisible] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<{
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
    
    if (screen === 'Sign In') {
      router.push('/login');
    } else if (screen === 'Profile tab') {
      router.push('/profile');
    } else if (screen === 'Home Feed') {
      // Stay on home screen feed
    } else if (screen === 'Syllabus') {
      router.push('/syllabus');
    } else if (screen === 'Study Materials') {
      setIsGalleryVisible(true);
    } else if (screen === 'College Notices') {
      router.push('/notice');
    } else if (screen === 'Academic Departments') {
      router.push('/departments');
    } else if (screen === 'Faculty Directory') {
      router.push('/faculty');
    } else if (screen === 'Hostels & Campus Living') {
      if (user?.role === 'Guest') {
        Alert.alert(
          'Authentication Required',
          'Guests cannot access campus hostel details or booking profiles. Please sign in with Google to view accommodation guidelines.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.replace('/login') }
          ]
        );
      } else {
        router.push('/hostels');
      }
    } else if (screen === 'Contact Support') {
      router.push('/support');
    } else {
      // detailed campus modals
      setActiveModalRequest(screen);
    }
  };

  useEffect(() => {
    if (!activeModalRequest) return;
    if (activeModalRequest === 'About MCE Motihari') setIsAboutVisible(true);
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

  const handleConnectToggle = (authorName: string) => {
    const contact = connections.find(c => c.name === authorName);
    if (contact) {
      toggleConnection(contact.id);
    } else {
      alert(`Networking request sent to ${authorName}!`);
    }
  };

  const handleSendComment = async () => {
    if (!user) {
      Alert.alert(
        'Authentication Required',
        'Guests cannot post comments in the community. Please sign in to participate.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    if (!activePost || !commentText.trim()) return;
    
    const textToCheck = commentText.trim();
    if (hasDuplicateEmojis(textToCheck)) {
      Alert.alert("Moderation Notice 🔒", "Oops! You cannot repeat the same emoji more than once in a single comment.");
      return;
    }

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
  };

  const handleQuickEmojiComment = (emoji: string) => {
    if (!user) {
      Alert.alert(
        'Authentication Required',
        'Guests cannot react or post comments. Please sign in to interact.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') }
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
        Alert.alert('Google Sign-In Failed', 'Unable to complete fast login. Please try again.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An error occurred during Google Sign-In.');
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

  const handleLocalConnectToggle = (name: string) => {
    if (!user) {
      setPendingPostPreset(null);
      setIsFastLoginVisible(true);
      return;
    }
    handleConnectToggle(name);
  };

  const handleLocalToggleBookmark = (id: string) => {
    if (!user) {
      Alert.alert(
        'Authentication Required',
        'Guests cannot bookmark posts. Please sign in to save interesting content.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    togglePostBookmark(id);
  };

  const handleSharePost = async (post: Post) => {
    try {
      const postUrl = `https://mcemotihari-app.web.app/post/${post.id}`;
      const titlePrefix = post.title ? `"${post.title}"\n\n` : '';
      let shareMessage = `Hey MCEians! 👋\n`;
      shareMessage += `Check out this interesting post on MCE Connect—our community space developed by Alumni & Students:\n\n`;
      shareMessage += `${titlePrefix}${post.content}\n\n`;
      shareMessage += `Read full post and comments here:\n`;
      shareMessage += `🔗 ${postUrl}\n\n`;
      shareMessage += `📲 Download the MCE Connect app today!`;

      await Share.share({
        title: post.title || 'MCE Connect Post',
        message: shareMessage,
      });
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  };

  // Filter posts instantly by active lobby channel and search query
  const filteredPosts = useMemo(() => {
    let result = selectedLobby === 'All'
      ? posts
      : posts.filter(post => post.category === selectedLobby);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(post => 
        (post.title && post.title.toLowerCase().includes(q)) ||
        (post.content && post.content.toLowerCase().includes(q)) ||
        (post.authorName && post.authorName.toLowerCase().includes(q))
      );
    }
    return result;
  }, [posts, selectedLobby, searchQuery]);

  return (
    <CustomDrawer
      ref={customDrawerRef}
      user={user}
      onLoginPress={() => router.push('/login')}
      onProfilePress={() => router.push('/profile')}
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
        <FlatList
          data={filteredPosts}
          renderItem={({ item }) => (
            <PostCard
              item={item}
              user={user}
              connectionStatus={getConnectionStatus(item.authorName)}
              isBookmarked={bookmarkedPostIds?.includes(item.id)}
              onClap={(id) => handleLocalClap(id)}
              onCommentPress={(post) => {
                if (!user) {
                  setPendingPostPreset(null);
                  setIsFastLoginVisible(true);
                  return;
                }
                loadCommentsForPost(post.id);
                setActivePost(post);
                setIsCommentsVisible(true);
              }}
              onVote={(postId, optionId) => handleLocalVote(postId, optionId)}
              onConnectToggle={(name) => handleLocalConnectToggle(name)}
              onLinkPress={(url) => router.push(url as any)}
              onSharePress={() => handleSharePost(item)}
              onToggleBookmark={(id) => handleLocalToggleBookmark(id)}
              onDeletePost={(id) => deletePost(id)}
              onEditPost={(id, content) => editPost(id, content)}
              onAuthorPress={(author) => {
                if (!user) {
                  setPendingPostPreset(null);
                  setIsFastLoginVisible(true);
                  return;
                }
                if (user && (author.name === user.name || author.name === user.email)) {
                  router.push('/profile');
                  return;
                }
                const matchingConn = connections.find(c => c.name === author.name);
                setSelectedProfileUser({
                  name: author.name,
                  role: author.role,
                  photoUrl: author.photoUrl,
                  department: matchingConn?.branch ? `${matchingConn.branch} Engineering` : 'Computer Science & Engineering',
                  batch: matchingConn?.batch ? `Class of ${matchingConn.batch}` : 'Class of 2026',
                });
                setIsProfileModalVisible(true);
              }}
            />
          )}
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
                  <Text style={[styles.mindInputPlaceholder, { color: theme.textSecondary }]}>What's on your mind? Share thoughts... ✍️</Text>
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
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Feed is quiet</Text>
              <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
                Be the first to share an update in the #{LOBBIES.find(l => l.id === selectedLobby)?.label || selectedLobby} channel!
              </Text>
            </View>
          }
        />

        {/* 3. COMMENTS SHEET OVERLAY MODAL */}
        <Modal visible={isCommentsVisible} animationType="slide" transparent onRequestClose={() => setIsCommentsVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFillObject} 
              activeOpacity={1} 
              onPress={() => setIsCommentsVisible(false)} 
            />
            
            <View style={[styles.bottomSheet, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={[styles.sheetHandle, { backgroundColor: theme.cardBorder }]} />
              <View style={[styles.sheetHeader, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.sheetTitle, { color: theme.text }]}>Comments ({activePost?.commentsCount || 0})</Text>
                <TouchableOpacity onPress={() => setIsCommentsVisible(false)}>
                  <Text style={[styles.sheetClose, { color: theme.textSecondary }]}>Close</Text>
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
              >
                <FlatList
                  data={activePost?.comments || []}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.commentList}
                  ListEmptyComponent={
                    <View style={styles.center}>
                      <Text style={styles.emptyEmoji}>💬</Text>
                      <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>No comments yet. Start the conversation!</Text>
                    </View>
                  }
                  renderItem={({ item }: { item: Comment }) => (
                    <View style={[styles.commentCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                      <View style={styles.commentHeader}>
                        <Image
                          source={{ uri: item.userPhoto || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(item.userName) + '&background=0F172A&color=fff&size=60') }}
                          style={styles.commentAvatar}
                        />
                        <View style={styles.commentMeta}>
                          <Text style={[styles.commentName, { color: theme.text }]}>{item.userName}</Text>
                          <VerifiedBadge role={item.userRole} size="mini" />
                        </View>
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
        <CampusMapModal visible={isMapVisible} onClose={() => setIsMapVisible(false)} />
        <EventsModal visible={isEventsListVisible} onClose={() => setIsEventsListVisible(false)} />
        <HolidaysModal visible={isHolidaysVisible} onClose={() => setIsHolidaysVisible(false)} />
        <PrivacyModal visible={isPrivacyVisible} onClose={() => setIsPrivacyVisible(false)} />
        <SettingsModal 
          visible={isSettingsVisible} 
          onClose={() => setIsSettingsVisible(false)} 
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
                    boxShadow: `${0}px ${2}px ${4}px #000`,

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
    boxShadow: `${0}px ${2}px ${4}px #000`,

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
    boxShadow: `${0}px ${4}px ${8}px #000`,

    elevation: 10,
    zIndex: 9999,
  },
  welcomeToastText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13.5,
  },
});
