import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
const TypedFlashList = FlashList as any;
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, setDoc, arrayUnion, arrayRemove, runTransaction, deleteDoc } from 'firebase/firestore';
import { getFormattedPostTime } from '@/utils/timeFormat';
import { db } from '@/config/firebase';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore, sortPostsPriority } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasDuplicateEmojis } from '@/utils/emojiValidator';
import { getOptimizedImageUrl } from '@/utils/cloudinary';
import { canReportContent } from '@/utils/permissions';
import { PostCard } from '@/components/PostCard';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

interface Comment {
  id: string;
  userName: string;
  userRole: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest' | 'Admin';
  userPhoto?: string;
  text: string;
  timestamp: string;
  userId?: string;
  userAdminRole?: string;
  replies?: Comment[];
  likes?: string[];
}

interface PollOption {
  id: string;
  label: string;
  votes: number;
}

interface Post {
  id: string;
  authorName: string;
  authorRole: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest' | 'Admin';
  authorPhoto?: string;
  authorUid?: string;
  authorAdminRole?: string;
  isAnonymous?: boolean;
  category: 'General' | 'Departments' | 'Hostels' | 'Clubs' | 'Placement' | 'Sports' | 'Alumni';
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  claps: number;
  commentsCount: number;
  comments: Comment[];
  timestamp: string;
  createdAt?: string;
  heartedBy?: string[];
  pollOptions?: PollOption[];
  userVotedOptionIds?: string[];
  totalVotes?: number;
  isEdited?: boolean;
  editedAt?: string;
  isHidden?: boolean;
  commentsDisabled?: boolean;
}

export default function PostDetailScreen() {
  const { id, focus, fromAdmin, from } = useLocalSearchParams<{ id: string, focus?: string, fromAdmin?: string, from?: string }>();
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  const navigateBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    
    if (fromAdmin) {
      if (fromAdmin === 'posts') {
        router.replace('/notanadmin/posts');
      } else if (fromAdmin === 'reports') {
        router.replace('/notanadmin/reports');
      } else if (fromAdmin === 'deletions') {
        router.replace('/notanadmin/deletions');
      } else {
        router.replace('/notanadmin/dashboard');
      }
    } else if (from) {
      if (from === 'profile') {
        router.replace('/profile');
      } else if (from === 'activity') {
        router.replace('/activity-feed');
      } else if (from === 'notifications') {
        router.replace('/notifications');
      } else if (from === 'feed') {
        router.replace('/');
      } else if (from === 'network') {
        router.replace('/network');
      } else if (from === 'search') {
        router.replace('/search');
      } else if (from.startsWith('user_')) {
        const username = from.replace('user_', '');
        const cleanUsername = username.replace(/^@/, '');
        router.replace(`/@${cleanUsername}`);
      } else {
        router.replace('/');
      }
    } else {
      router.replace('/');
    }
  };
  const { user, posts, loadCommentsForPost, addComment, handleClap, connections } = useAppStore(
    useShallow(state => ({
      user: state.user,
      posts: state.posts,
      loadCommentsForPost: state.loadCommentsForPost,
      addComment: state.addComment,
      handleClap: state.handleClap,
      connections: state.connections,
    }))
  );

  const [localPost, setLocalPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [showEmojiSuggestions, setShowEmojiSuggestions] = useState(false);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [updatingPost, setUpdatingPost] = useState(false);
  const [isMenuModalVisible, setIsMenuModalVisible] = useState(false);
  const [isCommentMenuModalVisible, setIsCommentMenuModalVisible] = useState(false);
  const [selectedComment, setSelectedComment] = useState<{ id: string; authorId?: string; authorName?: string; text?: string } | null>(null);
  const [isEditCommentModalVisible, setIsEditCommentModalVisible] = useState(false);
  const [editCommentTextContent, setEditCommentTextContent] = useState('');
  const [savingEditComment, setSavingEditComment] = useState(false);
  
  const commentInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<any>(null);
  const isDeleting = useRef(false);

  // 1. Get post either from local store or fetch from Firestore
  useEffect(() => {
    if (!id || isDeleting.current) return;
    
    const resolvePost = async () => {
      // Try resolving from store first
      const storePost = posts.find(p => p.id === id);
      if (storePost) {
        setLocalPost(storePost as any);
        setLoading(false);
        loadCommentsForPost(id); // load comments in the background silently
        return;
      }

      // Fetch from Firestore directly for deep-link/notification entry
      try {
        const postDocRef = doc(db, 'posts', id);
        const postSnap = await getDoc(postDocRef);
        if (postSnap.exists()) {
          const data = postSnap.data();
          setLocalPost({ id: postSnap.id, ...data } as any);
          setLoading(false);
          loadCommentsForPost(id); // load comments in the background silently
        } else {
          // Log postId and Firestore failure reason
          console.warn(`[Firestore Failure] Post ID: ${id} was deleted, orphaned, or is no longer available in Firebase Cloud.`);
          
          Alert.alert('Unavailable', 'Post not available or removed.');
          
          // Remove from local cache/state automatically
          const store = useAppStore.getState();
          const filteredPosts = store.posts.filter(p => p.id !== id);
          useAppStore.setState({ posts: filteredPosts });
          await AsyncStorage.setItem('@mce_posts', JSON.stringify(filteredPosts));
          
          navigateBack();
        }
      } catch (err: any) {
        console.error(`[Firestore Failure] Failed to fetch post details for post ID: ${id}. Reason: ${err.message}`, err);
      } finally {
        setLoading(false);
      }
    };

    resolvePost();
  }, [id, posts]);

  // Synchronize localPost whenever store posts update
  const activePost = useMemo(() => {
    if (!id) return null;
    return posts.find(p => p.id === id) || localPost;
  }, [posts, localPost, id]);

  const isOwnerOrAdmin = useMemo(() => {
    if (!activePost || !user) return false;
    const isOwnPost = activePost.authorUid === user.uid || activePost.authorName === user.name;
    const hasAdminRole = !!user.adminRole || user.role === 'Admin';
    const isMasterAdmin = user.uid === (process.env.EXPO_PUBLIC_ADMIN_UID || 'Zdxi8kTc2kcs1cOPxWS81PTVmco2');
    return isOwnPost || hasAdminRole || isMasterAdmin;
  }, [activePost, user]);

  const isPostRestricted = useMemo(() => {
    if (!activePost) return false;
    if (activePost.isHidden && !isOwnerOrAdmin) return true;
    return false;
  }, [activePost, isOwnerOrAdmin]);

  // 2. Sort comments chronologically or newest-first
  const sortedComments = useMemo(() => {
    if (!activePost || !activePost.comments) return [];
    const list = [...activePost.comments];
    return list.sort((a, b) => {
      const aTime = new Date(a.timestamp || 0).getTime();
      const bTime = new Date(b.timestamp || 0).getTime();
      return sortBy === 'newest' ? bTime - aTime : aTime - bTime;
    });
  }, [activePost?.comments, sortBy]);

  // 2.5 Keyboard listener to scroll comments smoothly
  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        if (!sortedComments || sortedComments.length === 0) return;
        // Small delay to let keyboard layout adjust
        setTimeout(() => {
          if (sortBy === 'newest') {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          } else {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    );
    return () => showListener.remove();
  }, [sortedComments, sortBy]);

  // 2.6 Auto-focus comment input if requested
  useEffect(() => {
    if (focus === 'true' && !loading) {
      const timer = setTimeout(() => {
        commentInputRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [focus, loading]);

  // 3. Clap handler
  const handleHeartPress = async () => {
    if (!user || user.role === 'Guest') {
      Alert.alert('Login Required', 'Post like karne ke liye pehle login karein.');
      return;
    }
    if (!activePost) return;
    await handleClap(activePost.id);
  };

  // 4. Poll Voting Handler
  const handleVotePress = async (optionId: string) => {
    if (!user || user.role === 'Guest' || !activePost) return;
    try {
      const storeState = useAppStore.getState();
      await storeState.submitVote?.(activePost.id, optionId);
    } catch (e) {
      console.warn('Failed to submit vote:', e);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || user.role === 'Guest') {
      Alert.alert('Login Required', 'Comment post karne ke liye login karein.');
      return;
    }
    if (!commentText.trim() || !activePost || submittingComment) return;

    const textToCheck = commentText.trim();
    if (hasDuplicateEmojis(textToCheck)) {
      Alert.alert("Moderation Notice 🔒", "Oops! You cannot repeat the same emoji more than 5 times consecutively in a single comment.");
      return;
    }

    setSubmittingComment(true);
    try {
      if (replyingToCommentId) {
        await useAppStore.getState().replyToComment(
          activePost.id,
          replyingToCommentId,
          user.name || user.email || 'Campus Member',
          user.role || 'Student',
          commentText.trim()
        );
        setReplyingToCommentId(null);
      } else {
        await addComment(
          activePost.id,
          user.name || user.email || 'Campus Member',
          user.role || 'Student',
          commentText.trim()
        );
      }
      
      setCommentText('');
      Keyboard.dismiss();
      
      if (sortBy === 'newest') {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReplyPress = (comment: Comment) => {
    setReplyingToCommentId(comment.id);
    setCommentText(`@${comment.userName.replace(/\s+/g, '')} `);
    commentInputRef.current?.focus();
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user || user.role === 'Guest') {
      Alert.alert('Login Required', 'Please login to like comments.');
      return;
    }
    if (activePost) {
      await useAppStore.getState().likeComment(activePost.id, commentId);
    }
  };

  const handleCommentOptions = (commentId: string, commentAuthorId?: string, commentAuthorName?: string, commentText?: string) => {
    if (!user || user.role === 'Guest' || !activePost) return;
    setSelectedComment({ id: commentId, authorId: commentAuthorId, authorName: commentAuthorName, text: commentText });
    setIsCommentMenuModalVisible(true);
  };

  // Check bookmark status on mount / user change / post change
  useEffect(() => {
    if (!user || !id) return;
    const checkSavedStatus = async () => {
      try {
        const savedRef = doc(db, 'savedPosts', user.uid, 'posts', id);
        const snap = await getDoc(savedRef);
        setIsSaved(snap.exists());
      } catch (err) {
        console.warn('Failed to check saved status:', err);
      }
    };
    checkSavedStatus();
  }, [user?.uid, id]);

  // 6. Share Post Handler
  const handleShare = async () => {
    if (!activePost) return;
    try {
      const profileUrl = `https://mcemotihari-app.web.app/post/${activePost.id}`;
      const Share = require('react-native').Share;
      await Share.share({
        title: activePost.title || 'MCE Connect Post',
        message: `${activePost.title ? activePost.title + '\n\n' : ''}${activePost.content.slice(0, 120)}...\n\nRead full post on MCE Connect:\n🔗 ${profileUrl}`,
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSavePost = async () => {
    if (!user || user.role === 'Guest') {
      Alert.alert('Login Required', 'Post save karne ke liye pehle login karein.');
      return;
    }
    if (!activePost) return;
    try {
      const savedRef = doc(db, 'savedPosts', user.uid, 'posts', activePost.id);
      if (isSaved) {
        await deleteDoc(savedRef);
        setIsSaved(false);
        Alert.alert('Removed', 'Post has been removed from your saved list.');
      } else {
        await setDoc(savedRef, {
          id: activePost.id,
          title: activePost.title || '',
          content: activePost.content || '',
          imageUrl: activePost.imageUrl || null,
          category: activePost.category || 'General',
          authorName: activePost.authorName || '',
          authorPhoto: activePost.authorPhoto || '',
          authorRole: activePost.authorRole || 'Student',
          savedAt: new Date().toISOString()
        });
        setIsSaved(true);
        Alert.alert('Saved', 'Post has been bookmarked to your saved list!');
      }
    } catch (err) {
      console.error('Error saving post:', err);
      Alert.alert('Error', 'Unable to update bookmark state.');
    }
  };

  const submitPostReport = async (reason: string) => {
    if (!user || !activePost) return;
    try {
      await useAppStore.getState().reportPost?.(activePost.id, reason);
      Alert.alert('Thank You', 'We have received your report. The post has been hidden from your feed.');
      navigateBack();
    } catch (err) {
      console.error('Error submitting report:', err);
      Alert.alert('Error', 'Unable to submit report at this time.');
    }
  };

  const handleReportPostOptions = () => {
    if (!user || user.role === 'Guest') {
      Alert.alert('Login Required', 'Post report karne ke liye login karein.');
      return;
    }
    
    if (Platform.OS === 'web') {
      const reason = window.prompt("Why are you reporting this post?", "Violating community guidelines");
      if (reason) submitPostReport(reason);
      return;
    }

    Alert.alert(
      'Report Post',
      'Choose a reason for reporting this post:',
      [
        { text: 'Spam or Misleading', onPress: () => submitPostReport('Spam or Misleading') },
        { text: 'Harassment or Hate Speech', onPress: () => submitPostReport('Harassment or Hate Speech') },
        { text: 'Inappropriate Content', onPress: () => submitPostReport('Inappropriate Content') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleDeletePost = async () => {
    if (!activePost) return;
    isDeleting.current = true;
    try {
      const storeState = useAppStore.getState();
      await storeState.deletePost(activePost.id);
      navigateBack();
    } catch (err) {
      console.error('Error deleting post:', err);
      navigateBack();
    }
  };

  const handleToggleCommentsDisabled = async () => {
    if (!activePost) return;
    try {
      const newState = !activePost.commentsDisabled;
      await useAppStore.getState().togglePostCommentsDisabled(activePost.id, newState);
      // The store update should trigger a re-render if activePost is derived from store correctly, 
      // but just in case, we also update local state if we maintain one for activePost.
      setLocalPost(prev => prev ? { ...prev, commentsDisabled: newState } : null);
    } catch (error) {
      console.error('Error toggling comments:', error);
    }
  };

  const handleEditPost = () => {
    if (!activePost) return;
    setEditTitle(activePost.title || '');
    setEditContent(activePost.content || '');
    setIsEditModalVisible(true);
  };

  const handleSaveEditedPost = async () => {
    if (!activePost || !user) return;
    if (!editContent.trim()) {
      Alert.alert('Required', 'Content cannot be empty.');
      return;
    }
    setUpdatingPost(true);
    try {
      const postRef = doc(db, 'posts', activePost.id);
      const updateData = {
        title: editTitle.trim(),
        content: editContent.trim(),
        isEdited: true,
        editedAt: new Date().toISOString()
      };
      await updateDoc(postRef, updateData);

      // Update state in global store
      const updatedPosts = posts.map(p => {
        if (p.id === activePost.id) {
          return { ...p, ...updateData };
        }
        return p;
      });
      useAppStore.setState({ posts: updatedPosts });

      // Update local state if needed
      setLocalPost(prev => prev ? { ...prev, ...updateData } : null);

      setIsEditModalVisible(false);
      Alert.alert('Success', 'Post has been updated.');
    } catch (err) {
      console.error('Error saving post edits:', err);
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setUpdatingPost(false);
    }
  };

  const handlePostMenuPress = () => {
    setIsMenuModalVisible(true);
  };

  // Custom Inline Markdown Formatter
  const renderFormattedContent = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    return lines.map((line, lineIndex) => {
      const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;

      const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
      const parts = cleanLine.split(regex);

      const parsedLine = parts.map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={`bold-${partIndex}`} style={styles.boldText}>
              {part.slice(2, -2)}
            </Text>
          );
        } else if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <Text key={`italic-${partIndex}`} style={styles.italicText}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        return part;
      });

      return (
        <View key={`line-${lineIndex}`} style={styles.contentLineRow}>
          {isBullet && <Text style={[styles.bulletDot, { color: theme.textSecondary }]}>•</Text>}
          <Text style={[styles.postContentText, isBullet && styles.bulletText, { color: theme.text }]}>
            {parsedLine}
          </Text>
        </View>
      );
    });
  };

  const focusCommentInput = React.useCallback(() => {
    if (activePost?.commentsDisabled) {
      useAppStore.getState().showToast('Author ne is post par comments band kar diye hain! 🙊', 'error');
      return;
    }
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [activePost?.commentsDisabled]);

  const hasHearted = activePost?.heartedBy?.includes(user?.uid || '');

  const postHeaderElement = useMemo(() => {
    if (!activePost) return null;
    
    const getConnectionStatus = (authorUid?: string, authorName?: string) => {
      if (!authorName) return 'Connect';
      const contact = authorUid ? connections.find(c => c.id === authorUid) : connections.find(c => c.name === authorName);
      return contact ? contact.status : 'Connect';
    };

    return (
      <View style={{ marginBottom: 12 }}>
        <PostCard
          item={activePost}
          user={user}
          hideHeader={true}
          connectionStatus={getConnectionStatus(activePost.authorUid, activePost.authorName)}
          isBookmarked={isSaved}
          onClap={() => handleHeartPress()}
          onCommentPress={() => focusCommentInput()}
          onVote={(postId, optionId) => handleVotePress(optionId)}
          onConnectToggle={async (name, uid, role, photo) => {
            if (!user) {
              Alert.alert('Login Required', 'Connect request bejne ke liye pehle login karein.');
              return;
            }
            if (!uid) {
              Alert.alert('Connection Failed', 'Profile ID not found. Unable to connect.');
              return;
            }

            const contact = connections.find(c => c.id === uid);
            if (contact && (contact.status === 'Connected' || contact.status === 'Sent')) {
              return;
            }

            try {
              const { doc, setDoc } = require('firebase/firestore');
              const { db } = require('@/config/firebase');

              const requestId = `connection_request_${user.uid}_${uid}`;

              // 1. Write the connection request notification to the recipient user's subcollection
              const notifDocRef = doc(db, 'users', uid, 'notifications', requestId);
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
              const selfConnRef = doc(db, 'users', user.uid, 'connections', uid);
              await setDoc(selfConnRef, {
                id: uid,
                name: name,
                role: role || 'Student',
                branch: 'MCE',
                batch: 'N/A',
                image: photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
                status: 'Sent',
                connectedAt: new Date().toISOString()
              });

              // 2. Add connection locally in store as "Sent"
              const newConn = {
                id: uid,
                name: name,
                role: (role === 'Guest' ? 'Student' : (role === 'Other' ? 'Faculty' : role)) as any,
                branch: 'MCE',
                batch: 'N/A',
                image: photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
                status: 'Sent' as const,
              };

              const updated = [...(connections || []).filter(c => c.id !== uid), newConn];
              useAppStore.setState({ connections: updated });
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              await AsyncStorage.setItem('@mce_connections', JSON.stringify(updated));

              const sortedPosts = sortPostsPriority(useAppStore.getState().posts, updated);
              useAppStore.setState({ posts: sortedPosts });
              await AsyncStorage.setItem('@mce_posts', JSON.stringify(sortedPosts));

              if (Platform.OS === 'web') {
                alert('Request Sent! Connection request sent successfully to ' + name);
              } else {
                Alert.alert('Request Sent 🤝', 'Connection request sent successfully to ' + name);
              }
            } catch (err: any) {
              console.error('Failed to send request:', err);
              Alert.alert('Connection Failed', 'Failed to send connection request.');
            }
          }}
          onLinkPress={(url) => router.push(url as any)}
          onSharePress={() => handleShare()}
          onToggleBookmark={() => handleSavePost()}
          onDeletePost={() => handleDeletePost()}
          onEditPost={() => handleEditPost()}
          onBlockAuthor={(authorUid) => useAppStore.getState().blockUser?.(authorUid)}
          onAuthorPress={(author) => {
             if (author.uid) {
               router.push(`/@${author.uid}?from=post_${id}`);
             }
           }}
        />
      </View>
    );
  }, [activePost, hasHearted, theme, sortBy, user, focusCommentInput, isSaved, connections]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#D95A1D" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading discussions...</Text>
      </View>
    );
  }

  if (!activePost || isPostRestricted) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Post not available or removed.</Text>
        <TouchableOpacity style={styles.backLink} onPress={navigateBack}>
          <Text style={styles.backLinkText}>{fromAdmin ? "Go back to Admin Console" : "Go back to Home Feed"}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {Platform.OS === 'web' && (
        <Head>
          <title>{activePost.title || 'MCE Connect Post'}</title>
          <meta name="description" content={activePost.content?.slice(0, 150)} />
        </Head>
      )}

      {/* Header bar */}
      <View style={[styles.headerRow, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder, justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: insets.top, height: 60 + insets.top }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <TouchableOpacity 
            style={[styles.backBtn, { borderColor: theme.cardBorder, backgroundColor: theme.background, marginRight: 12, borderWidth: 0 }]} 
            onPress={() => navigateBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            activeOpacity={0.8}
            onPress={() => {
              if (activePost.authorUid) {
                router.push(`/@${activePost.authorUid}?from=post_${id}`);
              }
            }}
          >
            {activePost.isAnonymous ? (
              <View style={[styles.anonymousAvatar, { backgroundColor: theme.background, borderColor: theme.cardBorder, borderWidth: 1, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="eye-off-outline" size={18} color={theme.textSecondary} />
              </View>
            ) : (
              <Image
                source={{ uri: getOptimizedImageUrl((activePost.authorUid && activePost.authorUid === user?.uid && user?.photoUrl) ? user.photoUrl : (activePost.authorPhoto || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix'), 100) }}
                style={{ width: 36, height: 36, borderRadius: 18, borderColor: theme.cardBorder, borderWidth: 1 }}
              />
            )}
            <View style={{ marginLeft: 10, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }} numberOfLines={1}>
                  {activePost.isAnonymous ? 'Anonymous Student' : ((activePost.authorUid && activePost.authorUid === user?.uid && user?.name) ? user.name : activePost.authorName)}
                  {!activePost.isAnonymous && (activePost.authorUid === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || activePost.authorUid === 'DdP2c855PSRUJwhmN9rvbkYBraP2' || (activePost.authorRole as string) === 'SUPER_ADMIN' || activePost.authorAdminRole === 'SUPER_ADMIN') && (
                    <Text> <MaterialIcons name="verified" size={14} color="#1D9BF0" /></Text>
                  )}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: theme.textSecondary }} numberOfLines={1}>
                {getFormattedPostTime(activePost.createdAt, activePost.timestamp)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' }}
          onPress={handlePostMenuPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 20}
      >
        <TypedFlashList
          ref={flatListRef}
          data={sortedComments}
          keyExtractor={(item: Comment) => item.id}
          estimatedItemSize={120}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollListBody, { paddingBottom: 120 }]}
          ListEmptyComponent={() => (
            <View style={[styles.emptyStateContainer, { paddingVertical: 40 }]}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontSize: 16, fontWeight: '600' }]}>No comments yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary, marginTop: 4 }]}>
                Be the first to share your thoughts!
              </Text>
            </View>
          )}
          ListHeaderComponent={postHeaderElement}
          renderItem={({ item: comment }: { item: Comment }) => (
            <View style={[styles.commentCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              {/* Comment Header */}
              <View style={styles.commentHeader}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}
                  onPress={() => {
                    if (comment.userId) {
                      router.push(`/@${comment.userId}?from=post_${id}`);
                    }
                  }}
                >
                  <Image 
                    source={{ uri: (comment.userId && comment.userId === user?.uid && user?.photoUrl) ? user.photoUrl : (comment.userPhoto || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix') }}
                    style={[styles.commentAvatar, { borderColor: theme.cardBorder }]}
                  />
                  <View style={styles.commentMeta}>
                    <View style={styles.commentNameRow}>
                      <Text style={[styles.commentAuthorName, { color: theme.text }]}>
                        {(comment.userId && comment.userId === user?.uid && user?.name) ? user.name : comment.userName}
                        {(comment.userId && (comment.userId === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || comment.userId === 'DdP2c855PSRUJwhmN9rvbkYBraP2' || ((comment.userId === user?.uid && user?.role) ? user.adminRole : comment.userRole) === 'SUPER_ADMIN' || comment.userAdminRole === 'SUPER_ADMIN')) && (
                          <Text> <MaterialIcons name="verified" size={12} color="#1D9BF0" /></Text>
                        )}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <View style={[styles.roleLabelBadge, { backgroundColor: ((comment.userId === user?.uid && user?.role) ? user.role : comment.userRole) === 'Admin' ? '#DCFCE7' : ((comment.userId === user?.uid && user?.role) ? user.role : comment.userRole) === 'Alumni' ? '#DBEAFE' : ((comment.userId === user?.uid && user?.role) ? user.role : comment.userRole) === 'Faculty' ? '#FEE2E2' : '#F3E8FF' }]}>
                        <Text style={[styles.roleLabelText, { color: ((comment.userId === user?.uid && user?.role) ? user.role : comment.userRole) === 'Admin' ? '#166534' : ((comment.userId === user?.uid && user?.role) ? user.role : comment.userRole) === 'Alumni' ? '#1E40AF' : ((comment.userId === user?.uid && user?.role) ? user.role : comment.userRole) === 'Faculty' ? '#991B1B' : '#6B21A8' }]}>
                          {(comment.userId && comment.userId === user?.uid && user?.role) ? (user.adminRole ? 'Admin' : user.role) : comment.userRole}
                        </Text>
                      </View>
                      <Text style={[styles.commentTime, { color: theme.textSecondary, marginTop: 0 }]}>{comment.timestamp}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleCommentOptions(comment.id, comment.userId, comment.userName, comment.text)} style={{ padding: 4 }}>
                   <Ionicons name="ellipsis-vertical" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Comment Body */}
              <Text style={[styles.commentTextContent, { color: theme.text }]}>{comment.text}</Text>

              {/* Threaded Action Row (Reply Ready) */}
              <View style={styles.commentActionRow}>
                <TouchableOpacity onPress={() => handleLikeComment(comment.id)} style={styles.commentActionBtn} activeOpacity={0.7}>
                  <Ionicons name={comment.likes?.includes(user?.uid || '') ? "heart" : "heart-outline"} size={13} color={comment.likes?.includes(user?.uid || '') ? "#EF4444" : theme.textSecondary} />
                  <Text style={[styles.commentActionText, { color: comment.likes?.includes(user?.uid || '') ? "#EF4444" : theme.textSecondary }]}>
                    {comment.likes?.length ? comment.likes.length : 'Like'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.commentActionBtn} 
                  onPress={() => {
                    if (activePost?.commentsDisabled) {
                      useAppStore.getState().showToast('Author ne is post par comments band kar diye hain! 🙊', 'error');
                      return;
                    }
                    handleReplyPress(comment);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-outline" size={13} color={theme.textSecondary} />
                  <Text style={[styles.commentActionText, { color: theme.textSecondary }]}>Reply</Text>
                </TouchableOpacity>
              </View>

              {/* Threaded Replies (Nested Structure) */}
              {comment.replies && comment.replies.map((reply: Comment) => (
                <View key={reply.id} style={[styles.nestedReplyCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                  <View style={styles.commentHeader}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}
                      onPress={() => {
                        if (reply.userId) {
                          router.push(`/@${reply.userId}?from=post_${id}`);
                        }
                      }}
                    >
                      <Image 
                        source={{ uri: (reply.userId && reply.userId === user?.uid && user?.photoUrl) ? user.photoUrl : (reply.userPhoto || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix') }}
                        style={[styles.replyAvatar, { borderColor: theme.cardBorder }]}
                      />
                      <View style={styles.commentMeta}>
                        <View style={styles.commentNameRow}>
                          <Text style={[styles.commentAuthorName, { color: theme.text, fontSize: 11 }]}>
                            {(reply.userId && reply.userId === user?.uid && user?.name) ? user.name : reply.userName}
                            {(reply.userId && (reply.userId === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || reply.userId === 'DdP2c855PSRUJwhmN9rvbkYBraP2' || ((reply.userId === user?.uid && user?.role) ? user.adminRole : reply.userRole) === 'SUPER_ADMIN' || reply.userAdminRole === 'SUPER_ADMIN')) && (
                              <Text> <MaterialIcons name="verified" size={10} color="#1D9BF0" /></Text>
                            )}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <View style={[styles.roleLabelBadge, { paddingHorizontal: 4, paddingVertical: 1, backgroundColor: ((reply.userId === user?.uid && user?.role) ? user.role : reply.userRole) === 'Admin' ? '#DCFCE7' : ((reply.userId === user?.uid && user?.role) ? user.role : reply.userRole) === 'Alumni' ? '#DBEAFE' : ((reply.userId === user?.uid && user?.role) ? user.role : reply.userRole) === 'Faculty' ? '#FEE2E2' : '#F3E8FF' }]}>
                            <Text style={[styles.roleLabelText, { fontSize: 8, color: ((reply.userId === user?.uid && user?.role) ? user.role : reply.userRole) === 'Admin' ? '#166534' : ((reply.userId === user?.uid && user?.role) ? user.role : reply.userRole) === 'Alumni' ? '#1E40AF' : ((reply.userId === user?.uid && user?.role) ? user.role : reply.userRole) === 'Faculty' ? '#991B1B' : '#6B21A8' }]}>
                              {(reply.userId && reply.userId === user?.uid && user?.role) ? (user.adminRole ? 'Admin' : user.role) : reply.userRole}
                            </Text>
                          </View>
                          <Text style={[styles.commentTime, { color: theme.textSecondary, fontSize: 9, marginTop: 0 }]}>{reply.timestamp}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleCommentOptions(reply.id, reply.userId, reply.userName, reply.text)} style={{ padding: 4 }}>
                       <Ionicons name="ellipsis-vertical" size={12} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.commentTextContent, { color: theme.text, fontSize: 12, marginLeft: 34, marginTop: 4 }]}>
                    {reply.text}
                  </Text>
                  
                  <View style={[styles.commentActionRow, { marginLeft: 34, marginTop: 4 }]}>
                    <TouchableOpacity onPress={() => handleLikeComment(reply.id)} style={styles.commentActionBtn} activeOpacity={0.7}>
                      <Ionicons name={reply.likes?.includes(user?.uid || '') ? "heart" : "heart-outline"} size={11} color={reply.likes?.includes(user?.uid || '') ? "#EF4444" : theme.textSecondary} />
                      <Text style={[styles.commentActionText, { color: reply.likes?.includes(user?.uid || '') ? "#EF4444" : theme.textSecondary, fontSize: 10 }]}>
                        {reply.likes?.length ? reply.likes.length : 'Like'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        />

        {/* Comment input field pinned at bottom - Modern Pill Design */}
        <View style={[styles.inputStickyBar, { backgroundColor: theme.backgroundElement, borderTopColor: theme.cardBorder }]}>
          {showEmojiSuggestions && (
            <View style={[styles.emojiSuggestionsRow, { borderBottomColor: theme.cardBorder }]}>
              {['👍', '❤️', '👏', '😮', '😂', '😊', '🎉'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    setCommentText(prev => prev + emoji);
                  }}
                  style={styles.emojiSuggestionBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiSuggestionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: showEmojiSuggestions ? 8 : 0 }}>
            <View style={[styles.pillContainer, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <TouchableOpacity 
                onPress={() => setShowEmojiSuggestions(prev => !prev)}
                style={styles.emojiToggleBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons 
                  name={showEmojiSuggestions ? "happy" : "happy-outline"} 
                  size={20} 
                  color={showEmojiSuggestions ? "#F97316" : theme.textSecondary} 
                />
              </TouchableOpacity>

              <TextInput
                ref={commentInputRef}
                placeholder={activePost.commentsDisabled ? "Comments are turned off" : `Comment as ${user?.name || 'Anonymous'}...`}
                placeholderTextColor={theme.textSecondary}
                style={[styles.pillInput, { color: theme.text }]}
                value={commentText}
                onChangeText={setCommentText}
                maxLength={500}
                editable={!activePost.commentsDisabled}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  handleSubmitComment();
                  setShowEmojiSuggestions(false);
                }}
              />
              {activePost.commentsDisabled && (
                <TouchableOpacity
                  style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
                  onPress={() => useAppStore.getState().showToast('Author ne is post par comments band kar diye hain! 🙊', 'error')}
                />
              )}
              <TouchableOpacity 
                onPress={() => {
                  handleSubmitComment();
                  setShowEmojiSuggestions(false);
                }} 
                disabled={!commentText.trim() || submittingComment || activePost.commentsDisabled} 
                style={[
                  styles.pillSendBtn, 
                  commentText.trim() ? { backgroundColor: '#3B82F6' } : { backgroundColor: 'transparent' }
                ]}
                activeOpacity={0.8}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color={commentText.trim() ? "#FFF" : theme.textSecondary} />
                ) : (
                  <Ionicons name="send" size={18} color={commentText.trim() ? "#FFF" : theme.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Edit Post Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Post</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Post Title (Optional)</Text>
              <TextInput
                style={[styles.modalTextInput, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background }]}
                placeholder="Enter post title..."
                placeholderTextColor={theme.textSecondary}
                value={editTitle}
                onChangeText={setEditTitle}
                maxLength={100}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Post Content</Text>
              <TextInput
                style={[styles.modalTextArea, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background }]}
                placeholder="Write your post content here..."
                placeholderTextColor={theme.textSecondary}
                value={editContent}
                onChangeText={setEditContent}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.cardBorder }]}>
              <TouchableOpacity 
                style={[styles.cancelBtn, { borderColor: theme.cardBorder }]} 
                onPress={() => setIsEditModalVisible(false)}
                disabled={updatingPost}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, (!editContent.trim() || updatingPost) && { opacity: 0.6 }]} 
                onPress={handleSaveEditedPost}
                disabled={!editContent.trim() || updatingPost}
              >
                {updatingPost ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Post Options Menu Modal */}
      <Modal
        visible={isMenuModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsMenuModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsMenuModalVisible(false)}
        >
          <View style={[styles.menuModalContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={[styles.menuModalHeader, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.menuModalTitle, { color: theme.text }]}>Post Options</Text>
            </View>

            <View style={styles.menuModalContent}>
              <TouchableOpacity 
                style={styles.menuOptionRow} 
                onPress={() => {
                  setIsMenuModalVisible(false);
                  handleSavePost();
                }}
              >
                <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color={isSaved ? "#D95A1D" : theme.text} />
                <Text style={[styles.menuOptionText, { color: theme.text }]}>
                  {isSaved ? 'Unsave Post' : 'Save Post'}
                </Text>
              </TouchableOpacity>

              {((activePost.authorUid !== user?.uid && activePost.authorName !== user?.name) && canReportContent(user?.uid, activePost.authorUid, user?.name, activePost.authorName)) && (
                <TouchableOpacity 
                  style={styles.menuOptionRow} 
                  onPress={() => {
                    setIsMenuModalVisible(false);
                    handleReportPostOptions();
                  }}
                >
                  <Ionicons name="flag-outline" size={20} color="#EF4444" />
                  <Text style={[styles.menuOptionText, { color: '#EF4444' }]}>Report Post</Text>
                </TouchableOpacity>
              )}

              {isOwnerOrAdmin && (
                <>
                  <View style={[styles.menuDivider, { backgroundColor: theme.cardBorder }]} />
                  
                  <TouchableOpacity 
                    style={styles.menuOptionRow} 
                    onPress={() => {
                      setIsMenuModalVisible(false);
                      handleEditPost();
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color={theme.text} />
                    <Text style={[styles.menuOptionText, { color: theme.text }]}>Edit Post</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.menuOptionRow} 
                    onPress={() => {
                      setIsMenuModalVisible(false);
                      handleToggleCommentsDisabled();
                    }}
                  >
                    <Ionicons name={activePost.commentsDisabled ? "chatbubble-outline" : "chatbubble-ellipses-outline"} size={20} color={theme.text} />
                    <Text style={[styles.menuOptionText, { color: theme.text }]}>{activePost.commentsDisabled ? 'Turn On Comments' : 'Turn Off Comments'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.menuOptionRow} 
                    onPress={() => {
                      setIsMenuModalVisible(false);
                      handleDeletePost();
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    <Text style={[styles.menuOptionText, { color: '#EF4444', fontWeight: '700' }]}>Delete Post</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.menuCancelRow, { borderTopColor: theme.cardBorder }]} 
              onPress={() => setIsMenuModalVisible(false)}
            >
              <Text style={[styles.menuCancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={isCommentMenuModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsCommentMenuModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsCommentMenuModalVisible(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: theme.backgroundElement }]}>
            {user && selectedComment && (user.uid === selectedComment.authorId || user.uid === activePost?.authorUid) && (
              <>
                <TouchableOpacity 
                  style={[styles.menuRow, { borderBottomColor: theme.cardBorder }]} 
                  onPress={() => {
                    setIsCommentMenuModalVisible(false);
                    if (selectedComment.authorId === user.uid) {
                      setEditCommentTextContent(selectedComment.text || '');
                      setIsEditCommentModalVisible(true);
                    }
                  }}
                >
                  <Ionicons name="pencil-outline" size={20} color={theme.text} style={styles.menuIcon} />
                  <Text style={[styles.menuText, { color: theme.text }]}>Edit Comment</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuRow, { borderBottomColor: theme.cardBorder }]} 
                  onPress={() => {
                    setIsCommentMenuModalVisible(false);
                    if (activePost) {
                      useAppStore.getState().deleteComment(activePost.id, selectedComment.id);
                    }
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" style={styles.menuIcon} />
                  <Text style={[styles.menuText, { color: '#EF4444' }]}>Delete Comment</Text>
                </TouchableOpacity>
              </>
            )}

            {user && selectedComment && user.uid !== selectedComment.authorId && canReportContent(user.uid, selectedComment.authorId, user.name, selectedComment.authorName) && (
              <TouchableOpacity 
                style={[styles.menuRow, { borderBottomColor: theme.cardBorder }]} 
                onPress={() => {
                  setIsCommentMenuModalVisible(false);
                  if (activePost) {
                    useAppStore.getState().reportComment(activePost.id, selectedComment.id, 'Inappropriate content');
                  }
                }}
              >
                <Ionicons name="flag-outline" size={20} color="#EF4444" style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: '#EF4444' }]}>Report Comment</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.menuCancelRow, { borderTopColor: theme.cardBorder }]} 
              onPress={() => setIsCommentMenuModalVisible(false)}
            >
              <Text style={[styles.menuCancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={isEditCommentModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditCommentModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsEditCommentModalVisible(false)}
        >
          <View style={[styles.editModalContainer, { backgroundColor: theme.backgroundElement }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.editModalTitle, { color: theme.text }]}>Edit Comment</Text>
            <TextInput
              style={[styles.editModalInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.cardBorder }]}
              value={editCommentTextContent}
              onChangeText={setEditCommentTextContent}
              multiline
              autoFocus
              placeholder="Edit your comment..."
              placeholderTextColor={theme.textSecondary}
            />
            <View style={styles.editModalActions}>
              <TouchableOpacity 
                style={[styles.editModalButton, { backgroundColor: theme.background }]} 
                onPress={() => setIsEditCommentModalVisible(false)}
              >
                <Text style={[styles.editModalButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.editModalButton, { backgroundColor: '#3B82F6' }]} 
                disabled={savingEditComment || !editCommentTextContent.trim() || editCommentTextContent === selectedComment?.text}
                onPress={async () => {
                  if (!activePost || !selectedComment || !editCommentTextContent.trim()) return;
                  setSavingEditComment(true);
                  await useAppStore.getState().editComment(activePost.id, selectedComment.id, editCommentTextContent.trim());
                  setSavingEditComment(false);
                  setIsEditCommentModalVisible(false);
                }}
              >
                {savingEditComment ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.editModalButtonText, { color: '#FFF' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  errorText: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  backLink: {
    padding: 10,
  },
  backLinkText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      }
    })
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  scrollListBody: {
    paddingBottom: 130,
  },
  postDetailCard: {
    borderBottomWidth: 1,
    paddingBottom: 16,
    marginBottom: 12,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 14,
    gap: 12,
  },
  anonymousAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
  },
  authorMetadata: {
    flex: 1,
    gap: 2,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorNameText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  connectedTag: {
    borderRadius: 6,
  },
  connectedTagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  authorRoleText: {
    fontSize: 11,
  },
  postTitleText: {
    fontSize: 17,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 8,
    lineHeight: 22,
  },
  postBodyParagraph: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  contentLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletDot: {
    fontSize: 13,
    marginRight: 6,
    marginTop: 1,
  },
  postContentText: {
    fontSize: 14.5,
    lineHeight: 20.5,
  },
  bulletText: {
    flex: 1,
  },
  boldText: {
    fontWeight: 'bold',
  },
  italicText: {
    fontStyle: 'italic',
  },
  postImageAttachment: {
    width: '100%',
    height: 240,
    marginTop: 8,
    marginBottom: 12,
  },
  pollPanel: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  pollTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pollOptionBar: {
    height: 40,
    borderRadius: 8,
    borderWidth: 0.5,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  pollProgressFill: {
    ...StyleSheet.absoluteFillObject,
  },
  pollOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    alignItems: 'center',
    zIndex: 1,
  },
  pollOptionLabel: {
    fontSize: 12,
  },
  pollOptionPercent: {
    fontSize: 11,
    fontWeight: '600',
  },
  pollTotalVotesText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  engagementSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  actionsPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  commentsFeedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderTopWidth: 0.5,
    paddingTop: 16,
    marginTop: 4,
  },
  commentFeedTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  sortChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#D95A1D',
  },
  commentCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 12,
    gap: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  commentMeta: {
    flex: 1,
    gap: 1.5,
  },
  commentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentAuthorName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  roleLabelBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 0.5,
    marginTop: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  channelBadgeText: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#F97316',
  },
  roleLabelText: {
    fontSize: 8.5,
    fontWeight: '700',
  },
  commentTime: {
    fontSize: 9.5,
  },
  commentTextContent: {
    fontSize: 12.5,
    lineHeight: 18,
    paddingLeft: 2,
  },
  commentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingLeft: 4,
    marginTop: 2,
  },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  nestedReplyCard: {
    marginLeft: 32,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 0.5,
    padding: 10,
    gap: 6,
  },
  replyAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 17,
  },
  inputStickyBar: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0.5,
  },
  pillContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pillInput: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  pillSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  textInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputFieldText: {
    flex: 1,
    fontSize: 13,
    maxHeight: 80,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  charCountText: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '700',
    position: 'absolute',
    right: 8,
    bottom: -6,
  },
  sendCommentBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContainer: {
    width: 250,
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuCancelRow: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 0.5,
  },
  menuCancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  editModalContainer: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  editModalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
    marginBottom: 20,
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  editModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  editModalButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    padding: 2,
  },
  modalContent: {
    padding: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalTextInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalTextArea: {
    minHeight: 120,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#D95A1D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuModalContainer: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuModalHeader: {
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    marginHorizontal: 16,
  },
  menuModalTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuModalContent: {
    paddingVertical: 8,
  },
  menuOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  menuOptionText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  menuDivider: {
    height: 0.5,
    marginVertical: 4,
  },

  customViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  customViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  customViewerHeaderBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customViewerZoomScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  customViewerImageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customViewerImage: {
    width: '100%',
    height: '100%',
  },
  customViewerBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  customViewerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customViewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  customViewerAvatarAnonymous: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  customViewerAuthorMeta: {
    flex: 1,
    marginLeft: 12,
  },
  customViewerAuthorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  customViewerAuthorRole: {
    fontSize: 11,
    color: '#CCCCCC',
    marginTop: 1,
  },
  customViewerConnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  customViewerConnectBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  customViewerCaptionContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  customViewerCaption: {
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
  },
  customViewerSeeMoreBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  customViewerSeeMoreText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  customViewerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  customViewerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  customViewerActionText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  emojiToggleBtn: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiSuggestionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    width: '100%',
  },
  emojiSuggestionBtn: {
    padding: 6,
    borderRadius: 8,
  },
  emojiSuggestionText: {
    fontSize: 22,
  }
});
