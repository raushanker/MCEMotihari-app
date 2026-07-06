import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  Clipboard,
  Dimensions,
  Linking,
  ScrollView,
  TouchableWithoutFeedback,
  Animated,
  BackHandler
} from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { uploadToCloudinary } from '@/utils/cloudinary';
import { pickMediaWithOptions } from '@/utils/mediaPicker';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/useAppStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors } from '@/hooks/useThemeColors';
import { feedScrollY } from '@/utils/scrollState';
import { containsProfanity, isSpam, parseTextForLinks } from '@/utils/textFilter';
import { db, auth } from '@/config/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDoc,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  setDoc,
  writeBatch,
  increment,
  QueryDocumentSnapshot,
  startAfter,
  endBefore,
  limitToLast
} from 'firebase/firestore';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { ExploreMenuModal } from '@/components/modals/ExploreMenuModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  text: string;
  senderUid: string;
  senderName: string;
  senderPhoto?: string;
  senderRole: string;
  senderAdminRole?: string;
  timestamp: any;
  isPinned?: boolean;
  imageUrl?: string;
  imageUrls?: string[];
}

interface CommunityRoom {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'department';
  color: string;
  icon: string;
  guidelines: string;
}

const ROOMS: CommunityRoom[] = [
  {
    id: 'sports',
    name: 'Sports Lobby',
    description: 'Talk about games, events, tournaments, and sports updates publicly.',
    type: 'public',
    color: '#10B981',
    icon: 'football',
    guidelines: 'Welcome to Sports Lobby! 🏆\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Keep discussions civil, positive, and sports-related.\n3. No spamming, abusive language, or unrelated links.\n4. Faculty and Admins can pin important announcements.\n5. Repeated violations may lead to a temporary ban.'
  },
  {
    id: 'cse_ai',
    name: 'CSE / AI Room',
    description: 'Official information and notices for CSE and AI departments.',
    type: 'department',
    color: '#3B82F6',
    icon: 'code-working',
    guidelines: 'CSE / AI Department Room 💻\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Share academic queries, notices, projects, and tech discussions.\n3. No spam, memes, or off-topic content.\n4. Only Faculty and Admins can pin important notices.\n5. Be respectful to all members of the community.'
  },
  {
    id: 'civil_ca',
    name: 'Civil / CA Room',
    description: 'Official notices, schedules, and alerts for Civil & CA departments.',
    type: 'department',
    color: '#8B5CF6',
    icon: 'business',
    guidelines: 'Civil / CA Department Room 🏗️\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Use this room for academic discussions, notices, and department updates.\n3. Avoid off-topic, abusive, or misleading content.\n4. Only Faculty and Admins can pin important notices.\n5. Maintain discipline and professionalism.'
  },
  {
    id: 'mech',
    name: 'Mechanical Room',
    description: 'Official announcements and notices for Mechanical engineering.',
    type: 'department',
    color: '#64748B',
    icon: 'construct',
    guidelines: 'Mechanical Department Room ⚙️\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Discuss lab sessions, practicals, exams, and academic topics.\n3. No spam, memes, or content unrelated to academics.\n4. Only Faculty and Admins can pin announcements.\n5. Report any misuse to the admin team.'
  },
  {
    id: 'ee',
    name: 'EEE Room',
    description: 'Official notices, lab schedules, and events for EEE department.',
    type: 'department',
    color: '#F59E0B',
    icon: 'flash',
    guidelines: 'EEE Department Room ⚡\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Share class schedules, lab updates, and exam-related information.\n3. No spam or off-topic messages.\n4. Only Faculty and Admins can pin notices.\n5. Keep the room clean and productive.'
  },
  {
    id: 'humanities',
    name: 'NSS / Yoga / Health',
    description: 'Discussions related to NSS, Yoga, and Mental Health.',
    type: 'department',
    color: '#F43F5E',
    icon: 'heart',
    guidelines: 'NSS / Yoga / Health Room 🧘\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Share NSS events, yoga sessions, health tips, and wellness content.\n3. Be kind, supportive, and sensitive to others\' health topics.\n4. No negativity, bullying, or inappropriate content.\n5. This is a safe space — respect everyone.'
  },
  {
    id: 'startup',
    name: 'Startup/Idea discussion',
    description: 'Discuss startups, pitch innovative business ideas, and find co-founders.',
    type: 'public',
    color: '#EC4899',
    icon: 'rocket',
    guidelines: 'Startup / Idea Discussion Room 🚀\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Share your startup ideas, find co-founders, and collaborate on projects.\n3. Respect others\' intellectual property — do not steal ideas.\n4. No spam, self-promotion without context, or unrelated content.\n5. Constructive criticism is welcome; personal attacks are not.'
  },
  {
    id: 'gate',
    name: 'GATE Discussion',
    description: 'Discuss GATE exam syllabus, share notes, preparation tips, and study resources.',
    type: 'public',
    color: '#06B6D4',
    icon: 'school',
    guidelines: 'GATE Discussion Room 📚\n\n1. Everyone can now post messages here — students, faculty, staff, and alumni!\n2. Share GATE study notes, PYQs, preparation tips, and resources.\n3. Discuss subject-wise topics and help each other prepare.\n4. No spam or content unrelated to GATE/competitive exams.\n5. Keep it focused and helpful for all aspirants.'
  },
  {
    id: 'alumni_network',
    name: 'Alumni Network',
    description: 'Connect with MCE alumni, share experiences, job opportunities, and campus memories.',
    type: 'public',
    color: '#F97316',
    icon: 'people',
    guidelines: 'Alumni Network Room 🎓\n\n1. Everyone can post messages here — students, faculty, staff, and alumni!\n2. Use this space for networking, career guidance, and sharing opportunities.\n3. Be respectful and professional in your interactions.\n4. No spam, irrelevant promotions, or abusive language.\n5. Keep the MCE spirit alive!'
  }
];


export default function CommunityScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();

  const [selectedFilters, setSelectedFilters] = useState<string[]>(['All']);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  useEffect(() => {
    const loadDefaultFilter = async () => {
      try {
        const saved = await AsyncStorage.getItem('@default_community_branch_v2');
        if (saved) {
          setSelectedFilters(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load default community branch', e);
      }
    };
    loadDefaultFilter();
  }, []);

  const handleSetDefaultFilter = async () => {
    try {
      await AsyncStorage.setItem('@default_community_branch_v2', JSON.stringify(selectedFilters));
      const text = selectedFilters.join(', ');
      if (Platform.OS === 'web') {
        window.alert(`Default branches set to: ${text}`);
      } else {
        Alert.alert('Success', `Default branches set to: ${text}`);
      }
    } catch (e) {
      console.error('Failed to save default community branch', e);
    }
  };

  // Scroll tracking for global tab bar
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

  const params = useLocalSearchParams<{ room?: string, from?: string }>();
  const activeRoomId = params.room;

  // Tab bar hiding is handled globally via useAppStore(state => state.isInChatRoom)
  
  const { user, roomStats, readStates, markRoomAsRead } = useAppStore();
  const blockedUserUids = useAppStore(state => state.blockedUserUids) || [];
  const hiddenMessageIds = useAppStore(state => state.hiddenMessageIds) || [];
  const hideMessage = useAppStore(state => state.hideMessage);
  const blockUser = useAppStore(state => state.blockUser);
  const unblockUser = useAppStore(state => state.unblockUser);
  const showToast = useAppStore(state => state.showToast);
  const setIsInChatRoom = useAppStore(state => state.setIsInChatRoom);

  // Screen state
  const [activeRoom, setActiveRoom] = useState<CommunityRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (activeRoom) {
          setIsInChatRoom(false);
          setActiveRoom(null);
          router.setParams({ room: undefined });
          return true; // prevent default back navigation
        }
        return false;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () =>
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [activeRoom])
  );
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ localUri: string; cloudinaryUrl: string | null; isUploading: boolean } | null>(null);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  
  // Spam Tracking
  const [lastSentText, setLastSentText] = useState<string | null>(null);
  const [spamCount, setSpamCount] = useState(0);

  // Modals & Menus
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isBlocklistOpen, setIsBlocklistOpen] = useState(false);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);

  // Pagination
  const [oldestDoc, setOldestDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const oldestDocRef = useRef<QueryDocumentSnapshot | null>(null);

  // Long press message options modal
  const [msgOptionsVisible, setMsgOptionsVisible] = useState(false);
  const [msgOptionsTarget, setMsgOptionsTarget] = useState<ChatMessage | null>(null);

  // Selection Mode
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  const flatListRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<any>(null);

  const isDark = theme.isDark;

  // Auto-open room from navigation param
  useEffect(() => {
    if (activeRoomId) {
      const room = ROOMS.find(r => r.id === activeRoomId);
      setActiveRoom(room || null);
      markRoomAsRead(activeRoomId);

      // Reset input state when switching rooms to prevent leakage
      setInputText('');
      setSelectedImage(null);
      setLastSentText(null);
      setSpamCount(0);
      // Auto-focus chatbox when entering a room
      setTimeout(() => inputRef.current?.focus(), 400);
    } else {
      setActiveRoom(null);
    }
  }, [activeRoomId]);

  // Safely manage tab bar visibility ONLY when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (activeRoomId) {
        setIsInChatRoom(true);
      } else {
        setIsInChatRoom(false);
      }
      return () => {
        // Always restore tab bar when screen loses focus (e.g., hardware back button switches tabs)
        setIsInChatRoom(false);
      };
    }, [activeRoomId])
  );

  // Check if current user is Admin or Faculty
  const canPostInDeptRoom = 
    user && 
    (user.role === 'Faculty' || 
     user.adminRole === 'SUPER_ADMIN' || 
     user.uid === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || 
     user.uid === 'DdP2c855PSRUJwhmN9rvbkYBraP2');

  // Subscribe to real-time chat messages (latest 30)
  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      setPinnedMessage(null);
      setOldestDoc(null);
      oldestDocRef.current = null;
      setHasMoreMessages(true);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    setLoading(true);
    setHasMoreMessages(true);
    setOldestDoc(null);
    oldestDocRef.current = null;

    const messagesRef = collection(db, 'communities', activeRoomId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(30));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      let pinned: ChatMessage | null = null;
      let firstDoc: QueryDocumentSnapshot | null = null;

      snapshot.forEach((docSnap) => {
        if (!firstDoc) firstDoc = docSnap as QueryDocumentSnapshot;
        const data = docSnap.data();
        const msg = {
          id: docSnap.id,
          text: data.text || '',
          senderUid: data.senderUid || '',
          senderName: data.senderName || 'Anonymous',
          senderPhoto: data.senderPhoto,
          senderRole: data.senderRole || 'Student',
          senderAdminRole: data.senderAdminRole,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          isPinned: data.isPinned || false,
          imageUrl: data.imageUrl,
          imageUrls: data.imageUrls
        };
        msgs.push(msg);
        if (msg.isPinned) pinned = msg;
      });

      // Only update oldest if not already paginated further back
      if (firstDoc && !oldestDocRef.current) {
        oldestDocRef.current = firstDoc;
        setOldestDoc(firstDoc);
      }

      setMessages(prev => {
        // Merge: keep older paginated messages at front, replace live tail
        if (prev.length > msgs.length) {
          const olderPart = prev.filter(p => !msgs.find(m => m.id === p.id));
          return [...olderPart, ...msgs];
        }
        return msgs;
      });
      setPinnedMessage(pinned);
      setLoading(false);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }, (error) => {
      console.error('Firestore messages sync error:', error);
      setLoading(false);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [activeRoomId]);

  // Load older messages when user scrolls to top
  const loadMoreMessages = async () => {
    if (!activeRoomId || loadingMore || !hasMoreMessages || !oldestDocRef.current) return;
    setLoadingMore(true);
    try {
      const messagesRef = collection(db, 'communities', activeRoomId, 'messages');
      const q = query(
        messagesRef,
        orderBy('timestamp', 'asc'),
        endBefore(oldestDocRef.current),
        limitToLast(20)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setHasMoreMessages(false);
      } else {
        const olderMsgs: ChatMessage[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          olderMsgs.push({
            id: docSnap.id,
            text: data.text || '',
            senderUid: data.senderUid || '',
            senderName: data.senderName || 'Anonymous',
            senderPhoto: data.senderPhoto,
            senderRole: data.senderRole || 'Student',
            senderAdminRole: data.senderAdminRole,
            timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
            isPinned: data.isPinned || false,
            imageUrl: data.imageUrl,
            imageUrls: data.imageUrls
          });
        });
        // Update oldest cursor to the first of the newly fetched
        const newOldest = snap.docs[0] as QueryDocumentSnapshot;
        oldestDocRef.current = newOldest;
        setOldestDoc(newOldest);
        if (olderMsgs.length < 20) setHasMoreMessages(false);
        setMessages(prev => [...olderMsgs, ...prev]);
      }
    } catch (e) {
      console.error('loadMore error:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !selectedImage) || !activeRoomId) return;

    // Always use Firebase Auth's currentUser uid — guarantees Firestore rules match
    const firebaseUid = auth.currentUser?.uid;
    if (!firebaseUid) {
      showToast('Please log in to send messages.', 'error');
      return;
    }

    if (selectedImage && selectedImage.isUploading) {
      showToast('Image is still uploading, please wait...', 'error');
      return;
    }

    const textToSend = inputText.trim();

    if (textToSend.length > 500) {
      Alert.alert('Limit Reached', 'Message cannot exceed 500 characters.');
      return;
    }

    if (textToSend) {
      if (containsProfanity(textToSend)) {
        Alert.alert('Warning', 'Abusive or offensive language is not allowed. Please keep the community clean.');
        return;
      }

      const spamCheck = isSpam(textToSend, lastSentText, spamCount);
      if (spamCheck.isSpam) {
        Alert.alert('Warning', spamCheck.reason || 'Please do not spam messages.');
        setSpamCount(spamCheck.newSpamCount);
        return;
      }
      setSpamCount(spamCheck.newSpamCount);
      setLastSentText(textToSend);
    }

    const uploadedUrl = selectedImage?.cloudinaryUrl || null;
    setInputText('');
    setSelectedImage(null);

    try {
      const messagesRef = collection(db, 'communities', activeRoomId, 'messages');
      await addDoc(messagesRef, {
        text: textToSend,
        ...(uploadedUrl && { imageUrls: [uploadedUrl] }),
        senderUid: firebaseUid,
        senderName: user?.name || 'Campus Member',
        senderPhoto: user?.photoUrl || '',
        senderRole: user?.role || 'Student',
        senderAdminRole: user?.adminRole || '',
        timestamp: serverTimestamp(),
        isPinned: false
      });

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      console.error('Error sending message:', e);
      showToast(`Failed: ${e?.code || e?.message || 'Try again.'}`, 'error');
    }
  };


  const handlePickImage = async () => {
    if (!activeRoomId || !user) return;
    if (selectedImage) {
      Alert.alert('Limit reached', 'You can only attach 1 image per message.');
      return;
    }
    try {
      const result = await pickMediaWithOptions({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setSelectedImage({ localUri: uri, cloudinaryUrl: null, isUploading: true });
        // Auto-focus text input so Enter key sends, not triggers image button
        setTimeout(() => inputRef.current?.focus(), 100);
        
        try {
          const uploadedUrl = await uploadToCloudinary(uri, 'low');
          if (uploadedUrl) {
            setSelectedImage(prev => prev && prev.localUri === uri ? { ...prev, cloudinaryUrl: uploadedUrl, isUploading: false } : prev);
          } else {
            setSelectedImage(null);
            showToast('Failed to upload image. ❌', 'error');
          }
        } catch (uploadError) {
          console.error('Background upload failed:', uploadError);
          setSelectedImage(null);
          showToast('Failed to upload image. ❌', 'error');
        }
      }
    } catch (e) {
      console.error('Error picking image:', e);
      showToast('Error picking image.', 'error');
    }
  };

  const handleCopyMessage = (text: string) => {
    Clipboard.setString(text);
    showToast('Copied to clipboard! 📋', 'success');
  };

  const handlePinMessage = async (message: ChatMessage) => {
    if (!canPostInDeptRoom) {
      showToast('Only Faculty and Admins can pin messages! 🔐', 'error');
      return;
    }

    try {
      if (pinnedMessage) {
        const oldRef = doc(db, 'communities', activeRoomId!, 'messages', pinnedMessage.id);
        await updateDoc(oldRef, { isPinned: false });
      }

      const msgRef = doc(db, 'communities', activeRoomId!, 'messages', message.id);
      await updateDoc(msgRef, { isPinned: true });
      showToast('Message pinned successfully! 📌', 'success');
    } catch (e) {
      console.error('Error pinning message:', e);
      showToast('Pin failed.', 'error');
    }
  };

  const handleUnpinMessage = async (message: ChatMessage) => {
    if (!canPostInDeptRoom) return;

    try {
      const msgRef = doc(db, 'communities', activeRoomId!, 'messages', message.id);
      await updateDoc(msgRef, { isPinned: false });
      showToast('Message unpinned! 🔓', 'success');
    } catch (e) {
      console.error('Error unpinning message:', e);
    }
  };

  const handleDeleteMessage = async (message: ChatMessage, forEveryone: boolean) => {
    if (!forEveryone) {
      await hideMessage(message.id);
      showToast('Message deleted for you. 🗑️', 'success');
      return;
    }

    const isOwner = user && user.uid === message.senderUid;
    const isAdmin = user && (user.adminRole === 'SUPER_ADMIN' || user.uid === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || user.uid === 'DdP2c855PSRUJwhmN9rvbkYBraP2');

    if (!isOwner && !isAdmin) {
      showToast('Aap sirf apni messages hi everyone ke liye delete kar sakte hain.', 'error');
      return;
    }

    Alert.alert(
      'Delete for Everyone',
      'Kya aap sach me is message ko sabke liye delete karna chahte hain?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const msgRef = doc(db, 'communities', activeRoomId!, 'messages', message.id);
              await deleteDoc(msgRef);
              showToast('Message deleted for everyone! 🗑️', 'success');
            } catch (e) {
              console.error('Delete failed:', e);
            }
          }
        }
      ]
    );
  };

  const handleBatchDeleteMessages = async () => {
    if (selectedMessageIds.size === 0) {
      setIsSelectMode(false);
      return;
    }

    const isAdmin = user && (user.adminRole === 'SUPER_ADMIN' || user.uid === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || user.uid === 'DdP2c855PSRUJwhmN9rvbkYBraP2');
    
    // Check if user is owner of all selected messages or admin
    const isAllDeletableGlobally = Array.from(selectedMessageIds).every(id => {
      const msg = messages.find(m => m.id === id);
      const isOwner = user && msg && (user.uid === msg.senderUid);
      return isOwner || isAdmin;
    });

    const alertOptions = [
      { text: 'Cancel', style: 'cancel' as any },
      {
        text: 'Delete for me',
        onPress: async () => {
          try {
            for (const id of Array.from(selectedMessageIds)) {
              await hideMessage(id);
            }
            setIsSelectMode(false);
            setSelectedMessageIds(new Set());
            showToast(`${selectedMessageIds.size} messages deleted for you! 🗑️`, 'success');
          } catch (e) {
            console.error('Batch hide failed:', e);
            showToast('Error hiding messages.', 'error');
          }
        }
      }
    ];

    if (isAllDeletableGlobally) {
      alertOptions.push({
        text: 'Delete for everyone',
        style: 'destructive' as any,
        onPress: async () => {
          try {
            const batch = writeBatch(db);
            selectedMessageIds.forEach(id => {
              const msgRef = doc(db, 'communities', activeRoomId!, 'messages', id);
              batch.delete(msgRef);
            });
            await batch.commit();
            setIsSelectMode(false);
            setSelectedMessageIds(new Set());
            showToast(`${selectedMessageIds.size} messages deleted for everyone! 🗑️`, 'success');
          } catch (e) {
            console.error('Batch delete failed:', e);
            showToast('Error deleting messages.', 'error');
          }
        }
      });
    }

    Alert.alert(
      'Delete Messages',
      `Kya aap in ${selectedMessageIds.size} messages ko delete karna chahte hain?`,
      alertOptions
    );
  };

  const handleReportMessage = (message: ChatMessage) => {
    Alert.alert(
      'Report Message',
      'Are you sure you want to report this message? Admins will review it.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Report', 
          style: 'destructive',
          onPress: async () => {
             if (!activeRoomId || !user) return;
             try {
                await addDoc(collection(db, 'reports'), {
                   type: 'community_message',
                   messageId: message.id,
                   messageText: message.text,
                   senderUid: message.senderUid,
                   roomId: activeRoomId,
                   reportedBy: user.uid,
                   reportedAt: serverTimestamp(),
                   status: 'pending'
                });
                showToast('Report submitted. 🚩', 'success');
             } catch (e) {
                showToast('Error reporting message.', 'error');
             }
          }
        }
      ]
    );
  };

  const handleMessageLongPress = (message: ChatMessage) => {
    setMsgOptionsTarget(message);
    setMsgOptionsVisible(true);
  };

  // Compute options for the message options modal
  const getMsgOptions = (message: ChatMessage | null) => {
    if (!message) return [];
    const isOwner = user && (auth.currentUser?.uid === message.senderUid);
    const isAdmin = user && (user.adminRole === 'SUPER_ADMIN' || user.uid === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || user.uid === 'DdP2c855PSRUJwhmN9rvbkYBraP2');
    const isFaculty = user && user.role === 'Faculty';
    const canPin = isAdmin || isFaculty;

    const options: { label: string; icon: string; color?: string; action: () => void }[] = [];

    if (message.text) {
      options.push({ label: 'Copy Text', icon: 'copy-outline', action: () => handleCopyMessage(message.text) });
    }
    if (canPin) {
      if (message.isPinned) {
        options.push({ label: 'Unpin Message', icon: 'pin-outline', action: () => handleUnpinMessage(message) });
      } else {
        options.push({ label: 'Pin Message', icon: 'pin', action: () => handlePinMessage(message) });
      }
    }
    if (isOwner) {
      options.push({ label: 'Delete for Everyone', icon: 'trash', color: '#EF4444', action: () => handleDeleteMessage(message, true) });
      options.push({ label: 'Delete for Me', icon: 'trash-outline', color: '#EF4444', action: () => handleDeleteMessage(message, false) });
    }
    if (!isOwner) {
      options.push({ label: 'Delete', icon: 'trash-outline', color: '#EF4444', action: () => handleDeleteMessage(message, false) });
      options.push({ label: 'Report Message', icon: 'flag-outline', color: '#F59E0B', action: () => handleReportMessage(message) });
      options.push({ label: 'Block Sender', icon: 'ban-outline', color: '#EF4444', action: () => handleBlockSender(message.senderUid) });
    }
    if (isAdmin && !isOwner) {
      options.push({ label: 'Delete for Everyone', icon: 'trash', color: '#EF4444', action: () => handleDeleteMessage(message, true) });
    }
    
    // Everyone can select messages now
    options.push({
      label: 'Select Message',
      icon: 'checkmark-circle-outline',
      action: () => {
        setIsSelectMode(true);
        setSelectedMessageIds(new Set([message.id]));
      }
    });
    return options;
  };

  const handleBlockSender = async (senderUid: string) => {
    Alert.alert(
      'Block Sender',
      'Kya aap is sender ko block karna chahte hain? Unki messages aapko ab se show nahi hongi.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            await blockUser(senderUid);
          }
        }
      ]
    );
  };

  const handleRefresh = async () => {
    if (!activeRoomId) return;
    setLoading(true);
    try {
      const messagesRef = collection(db, 'communities', activeRoomId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(80));
      const snaps = await getDocs(q);
      const msgs: ChatMessage[] = [];
      let pinned: ChatMessage | null = null;
      snaps.forEach(docSnap => {
        const data = docSnap.data();
        const msg = {
          id: docSnap.id,
          text: data.text || '',
          senderUid: docSnap.data().senderUid || '',
          senderName: data.senderName || 'Anonymous',
          senderPhoto: data.senderPhoto,
          senderRole: data.senderRole || 'Student',
          senderAdminRole: data.senderAdminRole,
          timestamp: data.timestamp ? data.timestamp.toDate() : new Date(),
          isPinned: data.isPinned || false,
          imageUrl: data.imageUrl,
          imageUrls: data.imageUrls
        };
        msgs.push(msg);
        if (msg.isPinned) pinned = msg;
      });
      setMessages(msgs);
      setPinnedMessage(pinned);
      showToast('Feed refreshed! 🔄', 'success');
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(msg => !blockedUserUids.includes(msg.senderUid) && !hiddenMessageIds.includes(msg.id));

  const renderLobbyItem = ({ item }: { item: CommunityRoom }) => (
    <TouchableOpacity
      style={[
        styles.lobbyCard,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: theme.cardBorder
        }
      ]}
      activeOpacity={0.8}
      onPress={() => {
        if (!user) {
          router.push('/login');
          return;
        }
        router.push(`/community?room=${item.id}`);
      }}
    >
      <View style={[styles.lobbyIconBox, { backgroundColor: `${item.color}15` }]}>
        <Ionicons name={item.icon as any} size={28} color={item.color} />
      </View>
      <View style={styles.lobbyDetails}>
        <View style={styles.lobbyTitleRow}>
          <Text style={[styles.lobbyName, { color: theme.text }]}>{item.name}</Text>
          {(() => {
            const total = roomStats[item.id] || 0;
            const read = readStates[item.id] || 0;
            const unread = Math.max(0, total - read);
            if (unread > 0) {
              return (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              );
            }
            return null;
          })()}
        </View>
        <Text style={[styles.lobbyDesc, { color: theme.textSecondary }]}>{item.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item, index }: { item: ChatMessage, index: number }) => {
    const isCurrentUser = user && user.uid === item.senderUid;
    const isSuperAdmin = item.senderUid === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || item.senderUid === 'DdP2c855PSRUJwhmN9rvbkYBraP2' || item.senderAdminRole === 'SUPER_ADMIN' || item.senderRole === 'SUPER_ADMIN';
    const isFaculty = item.senderRole === 'Faculty';
    const isAdmin = item.senderRole === 'Admin' || item.senderAdminRole === 'SUPER_ADMIN';

    // Check if previous message was from the same sender
    const prevMessage = index > 0 ? filteredMessages[index - 1] : null;
    const isContinuous = prevMessage ? prevMessage.senderUid === item.senderUid : false;

    let roleLabel = '';
    let badgeColor: string = theme.textSecondary;
    if (isSuperAdmin || isAdmin) {
      roleLabel = 'Admin 🛡️';
      badgeColor = '#2563EB';
    } else if (isFaculty) {
      roleLabel = 'Faculty 🎖️';
      badgeColor = '#3B82F6';
    } else if (item.senderRole === 'Alumni') {
      roleLabel = 'Alumni 🎓';
      badgeColor = '#8B5CF6';
    } else if (item.senderRole === 'Student') {
      roleLabel = 'Student';
      badgeColor = '#A855F7';
    } else if (item.senderRole === 'Other') {
      roleLabel = 'Other';
      badgeColor = '#10B981';
    }

    const formatMessageTime = (date: Date) => {
      try {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        return '';
      }
    };

    const isSelected = selectedMessageIds.has(item.id);

    const handlePress = () => {
      if (isSelectMode) {
        const canDelete = isCurrentUser || isAdmin || isFaculty;
        if (!canDelete) return;
        const newSet = new Set(selectedMessageIds);
        if (newSet.has(item.id)) newSet.delete(item.id);
        else newSet.add(item.id);
        setSelectedMessageIds(newSet);
        if (newSet.size === 0) setIsSelectMode(false);
      }
    };

    return (
      <TouchableOpacity
        activeOpacity={isSelectMode ? 0.7 : 0.9}
        onPress={isSelectMode ? handlePress : undefined}
        onLongPress={() => !isSelectMode && handleMessageLongPress(item)}
        style={[
          { width: '100%', paddingHorizontal: 16, paddingVertical: 4, marginBottom: 8 },
          isSelected && { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)' }
        ]}
      >
        <View style={[
          styles.msgBubbleContainer,
          isCurrentUser ? styles.msgBubbleRight : styles.msgBubbleLeft,
          { marginBottom: 0 } // override to avoid double spacing
        ]}>
        {!isCurrentUser && (
          <View style={styles.msgAvatar}>
            {!isContinuous && (
              <Image
                source={{ uri: item.senderPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.senderName)}&background=0F172A&color=fff&size=60` }}
                style={{ width: '100%', height: '100%', borderRadius: 16 }}
              />
            )}
          </View>
        )}
        <View style={styles.msgCol}>
          {!isContinuous && (
            <View style={[styles.msgSenderRow, isCurrentUser && { justifyContent: 'flex-end' }]}>
              <Text style={[styles.msgSenderName, { color: theme.text }]}>
                {item.senderName}
                {isSuperAdmin && (
                  <Text> <MaterialIcons name="verified" size={13} color="#1D9BF0" /></Text>
                )}
              </Text>
              {roleLabel ? (
                <Text style={[styles.msgSenderRole, { color: badgeColor, borderColor: badgeColor }]}>
                  {roleLabel}
                </Text>
              ) : null}
            </View>
          )}
          <View
            style={[
              styles.msgBubble,
              {
                backgroundColor: isCurrentUser
                  ? '#3B82F6'
                  : isDark
                  ? '#1E293B'
                  : '#F1F5F9'
              }
            ]}
          >
            {item.isPinned && (
              <View style={styles.bubblePinnedBox}>
                <Ionicons name="pin" size={12} color={isCurrentUser ? '#FFFFFF90' : theme.textSecondary} />
                <Text style={[styles.bubblePinnedText, { color: isCurrentUser ? '#FFFFFF90' : theme.textSecondary }]}>
                  Pinned Announcement
                </Text>
              </View>
            )}
            {item.imageUrls && item.imageUrls.length > 0 ? (
              <View style={styles.imageGrid}>
                {item.imageUrls.map((url, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.9}
                    onPress={() => isSelectMode ? handlePress() : setFullscreenImageUrl(url)}
                    onLongPress={() => !isSelectMode && handleMessageLongPress(item)}
                    style={styles.imageAttachmentTouchMulti}
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.messageImageMulti}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            ) : item.imageUrl ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => isSelectMode ? handlePress() : setFullscreenImageUrl(item.imageUrl!)}
                onLongPress={() => !isSelectMode && handleMessageLongPress(item)}
                style={styles.imageAttachmentTouch}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.messageImage}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ) : null}
            {item.text ? (
              <Text style={[styles.msgText, { color: isCurrentUser ? '#FFFFFF' : theme.text }]}>
                {parseTextForLinks(item.text).map((segment, idx) => {
                  if (segment.type === 'link') {
                    return (
                      <Text
                        key={idx}
                        style={{ color: isCurrentUser ? '#E0F2FE' : '#3B82F6', textDecorationLine: 'underline' }}
                        onPress={() => Linking.openURL(segment.content.startsWith('http') ? segment.content : `https://${segment.content}`).catch(() => Alert.alert('Invalid Link', 'This link could not be opened.'))}
                      >
                        {segment.content}
                      </Text>
                    );
                  }
                  return <Text key={idx}>{segment.content}</Text>;
                })}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: isCurrentUser ? 'flex-end' : 'flex-start', marginTop: 4 }}>
              <Text style={[styles.msgTime, { color: isCurrentUser ? '#FFFFFF80' : theme.textSecondary }]}>
                {formatMessageTime(item.timestamp)}
              </Text>
              {isCurrentUser && (
                <Ionicons 
                  name="checkmark-done" 
                  size={16} 
                  color={isDark ? "#60A5FA" : "#93C5FD"} 
                  style={{ marginLeft: 4 }} 
                />
              )}
            </View>
          </View>
        </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleBackToLobby = () => {
    setIsInChatRoom(false);
    setActiveRoom(null);
    router.setParams({ room: undefined });
  };

  const showGuidelines = () => {
    if (!activeRoom) return;
    setIsGuidelinesOpen(true);
  };

  const renderLobbyHeader = () => (
    <View style={[styles.lobbyHeader, { backgroundColor: theme.backgroundElement, justifyContent: 'space-between', paddingHorizontal: 16 }]}>
      <View style={styles.headerTitleCol}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Community Rooms</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Connect, discuss & share with everyone</Text>
      </View>
      <TouchableOpacity 
        style={{ padding: 4 }}
        onPress={() => setIsFilterVisible(prev => !prev)}
      >
        <Ionicons name="options-outline" size={24} color={theme.text} />
      </TouchableOpacity>
    </View>
  );

  const renderChatHeader = () => {
    if (isSelectMode) {
      return (
        <View style={[styles.lobbyHeader, { backgroundColor: theme.backgroundElement, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              style={styles.lobbyBackBtn} 
              onPress={() => { setIsSelectMode(false); setSelectedMessageIds(new Set()); }}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.lobbyHeaderTitle, { color: theme.text, fontSize: 18, marginLeft: 8 }]}>
              {selectedMessageIds.size} Selected
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.menuIconBtn}
            onPress={handleBatchDeleteMessages}
          >
            <Ionicons name="trash" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.lobbyHeader, { backgroundColor: theme.backgroundElement, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }]}>
      <TouchableOpacity style={styles.lobbyBackBtn} onPress={handleBackToLobby}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <View style={styles.chatHeaderMeta}>
        <Text style={[styles.lobbyHeaderTitle, { color: theme.text, fontSize: 16 }]} numberOfLines={1}>
          {activeRoom?.name}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.menuIconBtn}
        onPress={() => setIsHeaderMenuOpen(prev => !prev)}
      >
        <Ionicons name="ellipsis-vertical" size={22} color={theme.text} />
      </TouchableOpacity>

      {isHeaderMenuOpen && (
        <View style={[styles.headerFloatingMenu, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: theme.cardBorder }]}
            onPress={() => {
              setIsHeaderMenuOpen(false);
              showGuidelines();
            }}
          >
            <Ionicons name="information-circle-outline" size={16} color={theme.text} />
            <Text style={[styles.menuItemText, { color: theme.text }]}>Guidelines/Info</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: theme.cardBorder }]}
            onPress={() => {
              setIsHeaderMenuOpen(false);
              setIsBlocklistOpen(true);
            }}
          >
            <Ionicons name="shield-outline" size={16} color={theme.text} />
            <Text style={[styles.menuItemText, { color: theme.text }]}>Blocklist</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setIsHeaderMenuOpen(false);
              handleRefresh();
            }}
          >
            <Ionicons name="refresh-outline" size={16} color={theme.text} />
            <Text style={[styles.menuItemText, { color: theme.text }]}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
    );
  };

  const filteredRooms = selectedFilters.includes('All') 
    ? ROOMS 
    : ROOMS.filter(r => selectedFilters.includes(r.name));

  const filterOptions = ['All', ...ROOMS.map(r => r.name)];

  const toggleFilter = (option: string) => {
    if (option === 'All') {
      setSelectedFilters(['All']);
      return;
    }
    
    setSelectedFilters(prev => {
      // Remove 'All' if it's currently selected
      let next = prev.filter(f => f !== 'All');
      
      if (next.includes(option)) {
        // Toggle off
        next = next.filter(f => f !== option);
      } else {
        // Toggle on
        next = [...next, option];
      }
      
      // If nothing is selected anymore, revert to 'All'
      if (next.length === 0) {
        return ['All'];
      }
      return next;
    });
  };

  const renderFilters = () => {
    if (!isFilterVisible) return null;
    return (
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>Choose Chatroom</Text>
          <TouchableOpacity onPress={handleSetDefaultFilter} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="pin" size={16} color="#3B82F6" />
            <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600' }}>Set Default</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {filterOptions.map(option => {
            const isSelected = selectedFilters.includes(option);
            return (
              <TouchableOpacity
                key={option}
                onPress={() => toggleFilter(option)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isSelected ? '#3B82F6' : theme.isDark ? '#334155' : '#F1F5F9',
                }}
              >
                <Text style={{
                  color: isSelected ? '#FFFFFF' : theme.textSecondary,
                  fontWeight: isSelected ? '700' : '500',
                  fontSize: 14
                }}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.rootContainer, { backgroundColor: theme.background }]}>
      <View style={{ height: insets.top, backgroundColor: theme.backgroundElement }} />
      
      {!activeRoomId ? (
        <View style={{ flex: 1 }}>
          {renderLobbyHeader()}
          <Animated.FlatList
            data={filteredRooms}
            renderItem={renderLobbyItem}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={[styles.lobbyList, { paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            ListHeaderComponent={() => (
              <View>
                {renderFilters()}
              </View>
            )}
          />
        </View>
      ) : (
        <KeyboardAvoidingView 
          style={[styles.rootContainer, { backgroundColor: theme.background }]}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          {renderChatHeader()}
          {pinnedMessage && (
            <View style={[styles.pinnedBanner, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF', borderBottomColor: theme.cardBorder }]}>
              <View style={styles.pinnedIconRow}>
                <Ionicons name="pin" size={18} color="#3B82F6" />
                <Text style={styles.pinnedTitle}>Pinned Announcement</Text>
                {canPostInDeptRoom && (
                  <TouchableOpacity onPress={() => handleUnpinMessage(pinnedMessage)}>
                    <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.pinnedBody, { color: theme.text }]} numberOfLines={2}>
                <Text style={{ fontWeight: '700' }}>{pinnedMessage.senderName}: </Text>
                {pinnedMessage.text}
              </Text>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={filteredMessages}
              renderItem={renderMessageItem}
              keyExtractor={item => item.id}
              contentContainerStyle={[styles.chatList, { paddingBottom: 16 }]}
              showsVerticalScrollIndicator={false}
              onStartReached={loadMoreMessages}
              onStartReachedThreshold={0.2}
              ListHeaderComponent={loadingMore ? (
                <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>Loading older messages...</Text>
                </View>
              ) : hasMoreMessages ? (
                <TouchableOpacity
                  onPress={loadMoreMessages}
                  style={{ paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600' }}>↑ Load older messages</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>— Beginning of conversation —</Text>
                </View>
              )}
            />
          )}

          {selectedImage && (
            <View style={[styles.imagePreviewContainer, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.imagePreviewBox}>
                <Image source={{ uri: selectedImage.localUri }} style={styles.imagePreviewThumb} contentFit="cover" />
                {selectedImage.isUploading && (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderRadius: 8 }]}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.imagePreviewRemoveBtn}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View style={[styles.inputContainer, { backgroundColor: theme.backgroundElement, borderTopColor: theme.cardBorder, paddingBottom: Math.max(16, insets.bottom) }]}>
            <TouchableOpacity
              style={[
                styles.imagePickerBtn,
                // Remove web focus outline on image button
                Platform.OS === 'web' ? { outline: 'none' } as any : {}
              ]}
              activeOpacity={0.7}
              onPress={handlePickImage}
            >
              <Ionicons name="image" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={[styles.chatInput, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', color: theme.text, borderColor: theme.cardBorder }]}
              placeholder="Type your message..."
              placeholderTextColor={theme.textSecondary}
              value={inputText}
              onChangeText={(text) => {
                // Sentence case: auto-capitalize first letter
                if (text.length === 1) {
                  setInputText(text.toUpperCase());
                } else {
                  setInputText(text);
                }
              }}
              autoCapitalize="sentences"
              textContentType="none"
              autoComplete="off"
              importantForAutofill="no"
              autoCorrect={true}
              multiline={false}
              maxLength={400}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
              blurOnSubmit={false}
              onKeyPress={(e: any) => {
                // Web: send on Enter (not Shift+Enter)
                if (Platform.OS === 'web' && e.nativeEvent?.key === 'Enter' && !e.nativeEvent?.shiftKey) {
                  e.preventDefault?.();
                  handleSendMessage();
                }
              }}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: (inputText.trim() || selectedImage) ? '#3B82F6' : '#94A3B8' }]}
              disabled={!inputText.trim() && !selectedImage}
              onPress={handleSendMessage}
            >
              {selectedImage?.isUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Message Options Modal (Long Press) */}
      <Modal
        visible={msgOptionsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMsgOptionsVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMsgOptionsVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 12,
              paddingBottom: Math.max(24, insets.bottom),
              paddingHorizontal: 0,
            }}>
              {/* Handle bar */}
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? '#334155' : '#E2E8F0', alignSelf: 'center', marginBottom: 16 }} />

              {/* Message preview */}
              {msgOptionsTarget && (
                <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                    {msgOptionsTarget.senderName}
                  </Text>
                  <Text style={{ color: theme.text, fontSize: 13, numberOfLines: 2 } as any} numberOfLines={2}>
                    {msgOptionsTarget.text || (msgOptionsTarget.imageUrls?.length ? '📷 Image' : '')}
                  </Text>
                </View>
              )}

              <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#F1F5F9', marginBottom: 8 }} />

              {/* Options */}
              {getMsgOptions(msgOptionsTarget).map((opt, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setMsgOptionsVisible(false);
                    setTimeout(() => opt.action(), 300);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 15,
                    paddingHorizontal: 24,
                    gap: 16,
                  }}
                >
                  <Ionicons name={opt.icon as any} size={22} color={opt.color || theme.text} />
                  <Text style={{ color: opt.color || theme.text, fontSize: 16, fontWeight: '500' }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={{ height: 1, backgroundColor: isDark ? '#334155' : '#F1F5F9', marginTop: 8, marginBottom: 4 }} />
              <TouchableOpacity
                onPress={() => setMsgOptionsVisible(false)}
                style={{ paddingVertical: 15, alignItems: 'center' }}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Guidelines Modal */}
      <Modal visible={isGuidelinesOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, marginHorizontal: 20 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {activeRoom?.name} Info
              </Text>
              <TouchableOpacity onPress={() => setIsGuidelinesOpen(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <View style={{ backgroundColor: isDark ? '#1E293B' : '#EFF6FF', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                <Text style={{ color: theme.text, fontSize: 14, lineHeight: 22, fontWeight: '500', marginBottom: 10 }}>
                  {activeRoom?.guidelines}
                </Text>
                <View style={{ height: 1, backgroundColor: theme.cardBorder, marginVertical: 10 }} />
                <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 20 }}>
                  • Daily Limit: 200 messages per day.{'\n'}
                  • Max Length: 500 characters per message.{'\n'}
                  • Spam, abuse, or offensive content is strictly prohibited.{'\n'}
                  • Repetitive messages/emojis will be blocked.
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#3B82F6', alignSelf: 'stretch', alignItems: 'center' }]} 
                onPress={() => setIsGuidelinesOpen(false)}
              >
                <Text style={styles.actionBtnText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Blocklist Manager Modal */}
      <Modal visible={isBlocklistOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Community Blocklist</Text>
              <TouchableOpacity onPress={() => setIsBlocklistOpen(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {blockedUserUids.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <Ionicons name="shield-checkmark" size={48} color={theme.textSecondary} style={{ marginBottom: 12 }} />
                  <Text style={[styles.modalEmptyTitle, { color: theme.text }]}>Blocklist is clean</Text>
                  <Text style={[styles.modalEmptySub, { color: theme.textSecondary }]}>
                    No blocked users. Messages from all campus members are visible.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={blockedUserUids}
                  keyExtractor={item => item}
                  renderItem={({ item }) => (
                    <View style={[styles.blockRow, { borderBottomColor: theme.cardBorder }]}>
                      <Text style={[styles.blockName, { color: theme.text }]} numberOfLines={1}>
                        User UID: {item}
                      </Text>
                      <TouchableOpacity
                        style={styles.unblockBtn}
                        onPress={async () => {
                          await unblockUser(item);
                          showToast('User unblocked! ✅', 'success');
                        }}
                      >
                        <Text style={styles.unblockBtnText}>Unblock</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image Viewer Modal */}
      <Modal
        visible={fullscreenImageUrl !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenImageUrl(null)}
      >
        <View style={styles.fullscreenImageOverlay}>
          <TouchableOpacity
            style={[styles.fullscreenCloseBtn, { top: Math.max(insets.top, 20) + 10 }]}
            onPress={() => setFullscreenImageUrl(null)}
            activeOpacity={0.7}
          >
            <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 24 }}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          {fullscreenImageUrl && (
            <Image
              source={{ uri: fullscreenImageUrl }}
              style={styles.fullscreenImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
      <ExploreMenuModal />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  lobbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  lobbyBackBtn: {
    padding: 4,
  },
  lobbyHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  lobbyList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  lobbyWelcomeBox: {
    marginBottom: 20,
  },
  lobbyWelcomeTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  lobbyWelcomeDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  lobbyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  lobbyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  lobbyDetails: {
    flex: 1,
    paddingRight: 8,
  },
  lobbyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  lobbyName: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  lobbyDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  chatHeaderMeta: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  chatRoomSub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  menuIconBtn: {
    padding: 6,
  },
  headerFloatingMenu: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 170,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1000,
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  chatList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  msgBubbleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  msgBubbleLeft: {
    alignSelf: 'flex-start',
  },
  msgBubbleRight: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  msgCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  msgSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 4,
  },
  msgSenderName: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 6,
  },
  msgSenderRole: {
    fontSize: 8.5,
    fontWeight: '700',
    borderWidth: 0.8,
    paddingHorizontal: 4,
    paddingVertical: 0.8,
    borderRadius: 4,
  },
  msgBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  bubblePinnedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bubblePinnedText: {
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 4,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 18,
  },
  msgTime: {
    fontSize: 8.5,
    alignSelf: 'flex-end',
    marginTop: 4,
    fontWeight: '600',
  },
  pinnedBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pinnedIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pinnedTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3B82F6',
    flex: 1,
    marginLeft: 6,
  },
  pinnedBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  inputBlockedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  inputBlockedText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  loadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    height: '60%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalBody: {
    flex: 1,
    paddingTop: 12,
  },
  modalEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalEmptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.8,
  },
  blockName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  unblockBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unblockBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  imagePickerBtn: {
    padding: 8,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageAttachmentTouch: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 6,
  },
  messageImage: {
    width: SCREEN_WIDTH * 0.58,
    height: SCREEN_WIDTH * 0.44,
    borderRadius: 12,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  imageAttachmentTouchMulti: {
    borderRadius: 8,
    overflow: 'hidden',
    width: (SCREEN_WIDTH * 0.58 - 4) / 2,
    aspectRatio: 1,
  },
  messageImageMulti: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  imagePreviewBox: {
    marginRight: 8,
    position: 'relative',
  },
  imagePreviewThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  imagePreviewRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 2,
  },
  fullscreenImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 999,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  }
});
