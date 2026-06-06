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
  FlatList,
  Alert,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
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

interface Comment {
  id: string;
  userName: string;
  userRole: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest';
  userPhoto?: string;
  text: string;
  timestamp: string;
  userId?: string;
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
  authorRole: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest';
  authorPhoto?: string;
  authorUid?: string;
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

  const navigateBack = () => {
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
      } else if (from.startsWith('user_')) {
        const username = from.replace('user_', '');
        const cleanUsername = username.replace(/^@/, '');
        router.replace(`/@${cleanUsername}`);
      } else {
        router.canGoBack() ? router.back() : router.replace('/');
      }
    } else {
      router.canGoBack() ? router.back() : router.replace('/');
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
  
  const commentInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const isDeleting = useRef(false);

  // 1. Get post either from local store or fetch from Firestore
  useEffect(() => {
    if (!id || isDeleting.current) return;
    
    const resolvePost = async () => {
      // Try resolving from store first
      const storePost = posts.find(p => p.id === id);
      if (storePost) {
        setLocalPost(storePost as any);
        await loadCommentsForPost(id);
        setLoading(false);
        return;
      }

      // Fetch from Firestore directly for deep-link/notification entry
      try {
        const postDocRef = doc(db, 'posts', id);
        const postSnap = await getDoc(postDocRef);
        if (postSnap.exists()) {
          const data = postSnap.data();
          setLocalPost({ id: postSnap.id, ...data } as any);
          await loadCommentsForPost(id);
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
    const ADMIN_EMAILS = ["aman.kumar@mce.ac.in", "mceconnect.help@gmail.com"];
    const isAdminEmail = user.email && ADMIN_EMAILS.includes(user.email);
    const hasAdminRole = !!user.adminRole;
    const isMasterAdmin = user.uid === (process.env.EXPO_PUBLIC_ADMIN_UID || 'Zdxi8kTc2kcs1cOPxWS81PTVmco2');
    return isOwnPost || isAdminEmail || hasAdminRole || isMasterAdmin;
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
    if (!user) {
      Alert.alert('Login Required', 'Post like karne ke liye pehle login karein.');
      return;
    }
    if (!activePost) return;
    await handleClap(activePost.id);
  };

  // 4. Poll Voting Handler
  const handleVotePress = async (optionId: string) => {
    if (!user || !activePost) return;
    try {
      const storeState = useAppStore.getState();
      await storeState.submitVote?.(activePost.id, optionId);
    } catch (e) {
      console.warn('Failed to submit vote:', e);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
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
    if (!user) {
      Alert.alert('Login Required', 'Please login to like comments.');
      return;
    }
    if (activePost) {
      await useAppStore.getState().likeComment(activePost.id, commentId);
    }
  };

  const handleCommentOptions = (commentId: string, commentAuthorId?: string, commentAuthorName?: string) => {
    if (!user || !activePost) return;
    const isCommentAuthor = user.uid === commentAuthorId;
    const isPostAuthor = user.uid === activePost.authorUid;

    if (Platform.OS === 'web') {
       if (isCommentAuthor || isPostAuthor) {
          if (window.confirm("Delete this comment permanently?")) useAppStore.getState().deleteComment(activePost.id, commentId);
       } else {
          if (window.confirm("Report this comment to moderators?")) useAppStore.getState().reportComment(activePost.id, commentId, 'Inappropriate content');
       }
       return;
    }

    const options = [];
    if (isCommentAuthor || isPostAuthor) {
      options.push({
        text: 'Delete',
        style: 'destructive' as const,
        onPress: () => {
          Alert.alert('Delete Comment', 'Are you sure you want to delete this?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => useAppStore.getState().deleteComment(activePost.id, commentId) }
          ]);
        }
      });
    } else if (canReportContent(user?.uid, commentAuthorId, user?.name, commentAuthorName)) {
      options.push({
        text: 'Report',
        style: 'destructive' as const,
        onPress: () => {
          Alert.alert('Report Comment', 'Report this comment for violating community guidelines?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Report', style: 'destructive', onPress: () => useAppStore.getState().reportComment(activePost.id, commentId, 'Inappropriate content') }
          ]);
        }
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' as const });
    Alert.alert('Comment Options', 'Choose an action', options);
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
    if (!user) {
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
      const reportId = `report_${user.uid}_${activePost.id}`;
      const reportRef = doc(db, 'reportedPosts', reportId);
      await setDoc(reportRef, {
        postId: activePost.id,
        reporterId: user.uid,
        reporterName: user.name || user.email || 'Anonymous',
        postTitle: activePost.title || '',
        postContent: activePost.content || '',
        reason,
        timestamp: new Date().toISOString()
      });
      Alert.alert('Thank You', 'We have received your report and will investigate it soon.');
    } catch (err) {
      console.error('Error submitting report:', err);
      Alert.alert('Error', 'Unable to submit report at this time.');
    }
  };

  const handleReportPostOptions = () => {
    if (!user) {
      Alert.alert('Login Required', 'Post report karne ke liye login karein.');
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
    
    const getConnectionStatus = (authorName: string) => {
      const contact = connections.find(c => c.name === authorName);
      if (!contact) return 'Connect';
      return contact.status as any;
    };

    return (
      <View style={{ marginBottom: 12 }}>
        <PostCard
          item={activePost}
          user={user}
          connectionStatus={getConnectionStatus(activePost.authorName)}
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
               router.push(author.uid === user?.uid ? '/profile' : `/@${author.uid}?from=post_${id}`);
             }
           }}
        />
        <View style={{ borderBottomWidth: 1, borderBottomColor: theme.cardBorder, marginVertical: 8, marginHorizontal: 16 }} />
        <View style={[styles.commentsFeedHeader, { borderTopColor: 'transparent', marginTop: 0, paddingTop: 4 }]}>
          <Text style={[styles.commentFeedTitle, { color: theme.text }]}>Discussion Thread</Text>
          <TouchableOpacity 
            style={[styles.sortChip, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
            onPress={() => setSortBy(prev => prev === 'newest' ? 'oldest' : 'newest')}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-vertical" size={12} color="#D95A1D" />
            <Text style={styles.sortChipText}>Sort: {sortBy === 'newest' ? 'Newest' : 'Oldest'}</Text>
          </TouchableOpacity>
        </View>
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {Platform.OS === 'web' && (
        <Head>
          <title>{activePost.title || 'MCE Connect Post'}</title>
          <meta name="description" content={activePost.content?.slice(0, 150)} />
        </Head>
      )}

      {/* Header bar */}
      <View style={[styles.headerRow, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.backBtn, { borderColor: theme.cardBorder, backgroundColor: theme.background }]} 
          onPress={() => navigateBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Post Discussion</Text>
        <View style={{ width: 40 }} /> {/* Balanced spacer replacing duplicate menu */}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={sortedComments}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollListBody, { paddingBottom: 120 }]}
          ListEmptyComponent={() => (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyEmoji}>🚀</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Start the discussion 🚀</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Aap pehle student ya alumni banein jo is post par apni ray share karein!
              </Text>
            </View>
          )}
          ListHeaderComponent={postHeaderElement}
          renderItem={({ item: comment }) => (
            <View style={[styles.commentCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              {/* Comment Header */}
              <View style={styles.commentHeader}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}
                  onPress={() => {
                    if (comment.userId) {
                      router.push(comment.userId === user?.uid ? '/profile' : `/@${comment.userId}?from=post_${id}`);
                    }
                  }}
                >
                  <Image 
                    source={{ uri: comment.userPhoto || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix' }}
                    style={[styles.commentAvatar, { borderColor: theme.cardBorder }]}
                  />
                  <View style={styles.commentMeta}>
                    <View style={styles.commentNameRow}>
                      <Text style={[styles.commentAuthorName, { color: theme.text }]}>{comment.userName}</Text>
                      <View style={[styles.roleLabelBadge, { backgroundColor: comment.userRole === 'Alumni' ? '#DBEAFE' : comment.userRole === 'Faculty' ? '#FEE2E2' : '#F3E8FF' }]}>
                        <Text style={[styles.roleLabelText, { color: comment.userRole === 'Alumni' ? '#1E40AF' : comment.userRole === 'Faculty' ? '#991B1B' : '#6B21A8' }]}>
                          {comment.userRole}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.commentTime, { color: theme.textSecondary }]}>{comment.timestamp}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleCommentOptions(comment.id, comment.userId, comment.userName)} style={{ padding: 4 }}>
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
                          router.push(reply.userId === user?.uid ? '/profile' : `/@${reply.userId}?from=post_${id}`);
                        }
                      }}
                    >
                      <Image 
                        source={{ uri: reply.userPhoto || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix' }}
                        style={[styles.replyAvatar, { borderColor: theme.cardBorder }]}
                      />
                      <View style={styles.commentMeta}>
                        <View style={styles.commentNameRow}>
                          <Text style={[styles.commentAuthorName, { color: theme.text, fontSize: 11 }]}>{reply.userName}</Text>
                          <View style={[styles.roleLabelBadge, { paddingHorizontal: 4, paddingVertical: 1, backgroundColor: reply.userRole === 'Alumni' ? '#DBEAFE' : reply.userRole === 'Faculty' ? '#FEE2E2' : '#F3E8FF' }]}>
                            <Text style={[styles.roleLabelText, { fontSize: 8, color: reply.userRole === 'Alumni' ? '#1E40AF' : reply.userRole === 'Faculty' ? '#991B1B' : '#6B21A8' }]}>
                              {reply.userRole}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.commentTime, { color: theme.textSecondary, fontSize: 9 }]}>{reply.timestamp}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleCommentOptions(reply.id, reply.userId, reply.userName)} style={{ padding: 4 }}>
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
                placeholder={activePost.commentsDisabled ? "Comments are turned off" : "Write a comment..."}
                placeholderTextColor={theme.textSecondary}
                style={[styles.pillInput, { color: theme.text }]}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
                editable={!activePost.commentsDisabled}
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
    </SafeAreaView>
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
    paddingVertical: 12,
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
  menuCancelRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderTopWidth: 0.5,
  },
  menuCancelText: {
    fontSize: 14,
    fontWeight: '700',
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
