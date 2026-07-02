import { decryptObjectAsync, encryptObjectAsync } from '@/utils/encryption';
import { getReadableErrorMessage } from '@/utils/errors/errorManager';
import { containsProfanity } from '@/utils/profanityFilter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, documentId, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, startAfter, updateDoc, where, writeBatch, onSnapshot } from 'firebase/firestore';
import { Alert, InteractionManager, Platform } from 'react-native';
import { create } from 'zustand';
import { auth, db } from '../config/firebase';
import { NoticeItem, parseBEUNotices, parseNoticesJSON, parseNoticesRSS } from '../utils/rssParser';

const FALLBACK_NOTICES: NoticeItem[] = [];

// Smart Feed: session seed changes every app open so feed order rotates differently each time
let _feedSessionSeed: number = Math.floor(Math.random() * 100000);

const isCacheExpired = (lastFetchedTime: number, expiryMinutes: number): boolean => {
  if (!lastFetchedTime) return true;
  const now = Date.now();
  const diffMs = now - lastFetchedTime;
  return diffMs > expiryMinutes * 60 * 1000;
};

// Crash-proof JSON Array parser to guarantee zero JavascriptExceptions on startup
const parseJsonArray = <T>(jsonString: string | null): T[] => {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};const sanitizeComment = (c: Comment): any => {
  return {
    id: c.id || '',
    userName: c.userName || '',
    userRole: c.userRole || 'Guest',
    userPhoto: c.userPhoto || null,
    text: c.text || '',
    timestamp: c.timestamp || '',
    userId: c.userId || null,
    userAdminRole: c.userAdminRole || null,
    likes: c.likes || [],
    replies: c.replies ? c.replies.map(sanitizeComment) : []
  };
};

const sanitizeComments = (comments?: Comment[]): any[] => {
  if (!comments) return [];
  return comments.map(sanitizeComment);
};

async function handleMentions(text: string, targetPostId: string, itemType: 'post' | 'comment', currentUser: any) {
  if (!text || !currentUser) return;
  const matches = text.match(/@([a-zA-Z0-9_\.]+)/g);
  if (!matches) return;

  const usernames = [...new Set(matches.map(m => m.substring(1).trim().toLowerCase()))];
  for (const username of usernames) {
    if (username === currentUser.username?.trim().toLowerCase()) continue; 
    try {
      const usernameDocRef = doc(db, 'usernames', username);
      const usernameDoc = await getDoc(usernameDocRef);
      if (usernameDoc.exists()) {
        const mentionedUid = usernameDoc.data().uid;
        if (mentionedUid && mentionedUid !== currentUser.uid) {
          const notifId = `mention_${currentUser.uid}_${targetPostId}_${username}_${itemType}`;
          const notifRef = doc(db, 'users', mentionedUid, 'notifications', notifId);
          await setDoc(notifRef, {
            type: 'mention',
            title: '🔔 Mentioned You',
            body: `${currentUser.name} mentioned you in a ${itemType}: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`,
            timestamp: new Date().toISOString(),
            read: false,
            targetPostId: targetPostId,
            senderUid: currentUser.uid,
            senderName: currentUser.name || '',
            senderPhoto: currentUser.photoUrl || '',
            senderRole: currentUser.role || 'Student',
            senderUsername: currentUser.username || ''
          });
        }
      }
    } catch (e) {
      console.warn(`[Mentions] Failed to send mention to @${username}:`, e);
    }
  }
}

export interface Comment {
  id: string;
  userName: string;
  userRole: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest' | 'Admin';
  userPhoto?: string;
  text: string;
  timestamp: string;
  userId?: string;
  userAdminRole?: string;
  likes?: string[];
  replies?: Comment[];
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Post {
  id: string;
  authorName: string;
  authorRole: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest' | 'Admin';
  authorPhoto?: string;
  authorUid?: string;
  authorAdminRole?: string;
  isAnonymous?: boolean;
  category: 'General' | 'Departments' | 'Hostels' | 'Clubs' | 'Placement' | 'Sports' | 'Alumni';
  title: string;
  text?: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  linkPreview?: {
    title: string;
    domain: string;
    description: string;
  };
  claps: number;
  commentsCount: number;
  comments: Comment[];
  timestamp: string;
  createdAt?: string;
  isClapped?: boolean;
  
  // New unique heart tracking field
  heartedBy?: string[];
  
  // Poll configurations
  pollOptions?: PollOption[];
  userVotedOptionId?: string;
  userVotedOptionIds?: string[];
  totalVotes?: number;
  allowMultipleVotes?: boolean;
  authorRealName?: string;
  isEdited?: boolean;
  editedAt?: string;
  isHidden?: boolean;
  commentsDisabled?: boolean;
  isSpamCandidate?: boolean;
  flaggedReason?: string;
  flaggedKeywords?: string[];
}

export interface ContactConnection {
  id: string;
  name: string;
  role: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Staff' | 'Guest';
  branch: string;
  batch: string;
  image: string;
  status: 'Connect' | 'Sent' | 'Connected';
}

export const sendConnectionRequest = async (
  currentUser: any,
  targetUid: string,
  targetName: string,
  targetRole: string,
  targetPhoto?: string
) => {
  if (!currentUser || !targetUid) return false;
  if (currentUser.uid === targetUid || (currentUser.name && currentUser.name.trim().toLowerCase() === targetName.trim().toLowerCase())) {
    console.warn('[sendConnectionRequest] Cannot connect to yourself.');
    return false;
  }
  try {
    const requestId = `connection_request_${currentUser.uid}_${targetUid}`;
    
    // 1. Write notification to target user
    const notifDocRef = doc(db, 'users', targetUid, 'notifications', requestId);
    await setDoc(notifDocRef, {
      type: 'connection_request',
      title: '🤝 New Connection Request',
      body: `${currentUser.name} wants to connect with you.`,
      timestamp: new Date().toISOString(),
      read: false,
      senderUid: currentUser.uid,
      senderName: currentUser.name,
      senderPhoto: currentUser.photoUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(currentUser.name || 'Felix')}`,
      senderBranch: currentUser.department || '',
      senderBatch: currentUser.batch || '',
      senderUsername: currentUser.username || '',
      senderRole: currentUser.role || 'Student',
      status: 'pending',
    });

    // 2. Write to current user's connections subcollection
    const selfConnRef = doc(db, 'users', currentUser.uid, 'connections', targetUid);
    await setDoc(selfConnRef, {
      id: targetUid,
      name: targetName,
      role: targetRole || 'Student',
      branch: 'MCE',
      batch: 'N/A',
      image: targetPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}`,
      status: 'Sent',
      connectedAt: new Date().toISOString()
    });

    // 3. Update local store
    const newConn = {
      id: targetUid,
      name: targetName,
      role: (targetRole === 'Guest' ? 'Student' : (targetRole === 'Other' ? 'Faculty' : targetRole)) as any,
      branch: 'MCE',
      batch: 'N/A',
      image: targetPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetName)}`,
      status: 'Sent' as const,
    };
    
    const store = useAppStore.getState();
    const updated = [...(store.connections || []).filter(c => c.id !== targetUid), newConn];
    useAppStore.setState({ connections: updated });
    await AsyncStorage.setItem('@mce_connections', JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error("sendConnectionRequest failed:", error);
    return false;
  }
};

export const cancelConnectionRequest = async (currentUser: any, targetUid: string) => {
  if (!currentUser || !targetUid) return false;

  // 1. Optimistically update local store so the UI updates instantly!
  const store = useAppStore.getState();
  const previousConnections = store.connections || [];
  const updated = previousConnections.filter(c => c.id !== targetUid);
  useAppStore.setState({ connections: updated });
  await AsyncStorage.setItem('@mce_connections', JSON.stringify(updated));

  // 2. Perform the Firestore deletions in the background
  try {
    const requestId = `connection_request_${currentUser.uid}_${targetUid}`;
    
    // Run deletions in parallel and catch any notification delete errors silently (in case it was already deleted)
    await Promise.all([
      deleteDoc(doc(db, 'users', targetUid, 'notifications', requestId)).catch(err => 
        console.warn("Failed to delete notification, it might not exist:", err)
      ),
      deleteDoc(doc(db, 'users', currentUser.uid, 'connections', targetUid))
    ]);
    
    return true;
  } catch (error) {
    console.error("cancelConnectionRequest failed, rolling back:", error);
    // Rollback local store if delete failed
    useAppStore.setState({ connections: previousConnections });
    await AsyncStorage.setItem('@mce_connections', JSON.stringify(previousConnections));
    return false;
  }
};

export const sortPostsPriority = (allPosts: Post[], connectionsList: ContactConnection[]): Post[] => {
  const safePosts = Array.isArray(allPosts) ? allPosts : [];
  const safeConns = Array.isArray(connectionsList) ? connectionsList : [];

  const connectedNames = new Set(
    safeConns
      .filter(c => c && c.status === 'Connected')
      .map(c => c.name)
  );

  const now = Date.now();
  const currentUser = useAppStore.getState().user;
  const userUid = currentUser?.uid || 'guest';
  const reportedIds = useAppStore.getState().reportedPostIds || [];
  const reportedSet = new Set(reportedIds);
  // Seen post IDs — user has already scrolled past these
  const seenPostIds = useAppStore.getState().seenPostIds || [];
  const seenSet = new Set(seenPostIds);
  // Interacted = liked or commented — deprioritize heavily
  const heartedIds = useAppStore.getState().heartedPostIds || [];
  const heartedSet = new Set(heartedIds);

  // Session seed — changes every app open so same unseen posts rotate differently each session
  const sessionSeed = _feedSessionSeed;

  // Helper for deterministic pseudo-random hash based on user UID and post ID to diversify sorting
  const getDeterministicJitter = (uid: string, postId: string, seed: number) => {
    let hash = 0;
    const str = uid + ':' + postId + ':' + seed;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 100) / 100; // Returns 0.0 to 0.99
  };

  // Pre-calculate sorting scores for each post to avoid O(N log N) redundant calculations
  const scoredPosts = safePosts
    .filter(p => p && !reportedSet.has(p.id))
    .map(post => {
      const timeStr = post.createdAt || post.timestamp || 0;
      const timeMs = typeof timeStr === 'number' ? timeStr : new Date(timeStr).getTime();
      const ageHours = Math.max(0, (now - (isNaN(timeMs) ? 0 : timeMs)) / (1000 * 60 * 60));
      
      const isConn = connectedNames.has(post.authorName) || (post.authorRealName && connectedNames.has(post.authorRealName));
      const isSeen = seenSet.has(post.id);
      const isInteracted = heartedSet.has(post.id);
      
      let pts = 100; // Base score
      if (isConn) pts += 50; // Connection boost
      pts += (post.claps || 0) * 2; // Engagement
      pts += (post.commentsCount || 0) * 5; // Deep Engagement
      if (post.imageUrl || post.linkUrl) pts += 10; // Media rich

      // SMART FEED: Unseen posts get a massive boost — user hasn't seen these yet!
      if (!isSeen) pts += 200;
      // Posts user interacted with (liked/commented) are deprioritized — already engaged
      if (isInteracted) pts -= 150;

      // 1. Deterministic User-Specific Jitter: shuffles feed differently each session
      const jitterVal = getDeterministicJitter(userUid, post.id, sessionSeed) * 50;

      // 2. Personalization branch boost: boosts academic posts matching user's branch
      const isBranchMatch = currentUser?.branch && (
        post.content?.toLowerCase().includes(currentUser.branch.toLowerCase()) || 
        post.title?.toLowerCase().includes(currentUser.branch.toLowerCase())
      );
      if (isBranchMatch) {
        pts += 25;
      }

      // 3. Instant Feedback: user's own fresh posts (created < 5 mins ago) get boosted to the absolute top of their feed
      const isOwnFreshPost = currentUser && post.authorUid === currentUser.uid && ageHours < (5 / 60);
      if (isOwnFreshPost) {
        pts += 10000;
      }

      // Smart score: recency decay + personalized layout jitter
      // Seen posts decay faster (1.8 exponent vs 1.2) to push them down
      const decayExp = isSeen ? 1.8 : 1.2;
      const score = (pts / Math.pow(ageHours + 2, decayExp)) + jitterVal;
      return { post, score };
    });

  scoredPosts.sort((a, b) => b.score - a.score);

  return scoredPosts.map(sp => sp.post);
};

interface AppState {
  user: any | null;
  isStoreHydrated: boolean;
  posts: Post[];
  connections: ContactConnection[];
  isCreatePostVisible: boolean;
  isAuthPromptVisible: boolean;
  authPromptReason: string;
  activeScreen: string;
  createPostPreset: 'text' | 'photo' | 'poll' | 'anonymous' | null;
  setCreatePostPreset: (preset: 'text' | 'photo' | 'poll' | 'anonymous' | null) => void;
  
  // Local Notes & Bookmarks
  bookmarkedSubjects: string[];
  bookmarkedPostIds: string[];
  heartedPostIds: string[];
  reportedPostIds: string[];
  savedMaterials: any[];
  blockedUserUids: string[];
  hiddenMessageIds: string[];
  // Smart Feed: track which post IDs the user has already scrolled past
  seenPostIds: string[];
  markPostsSeen: (postIds: string[]) => Promise<void>;
  blockUser: (targetUid: string) => Promise<void>;
  unblockUser: (targetUid: string) => Promise<void>;
  hideMessage: (messageId: string) => Promise<void>;
  localNotes: Array<{ id: string; title: string; content: string; date: string }>;
  commentSpamWarning: string | null;
  triggerCommentSpamWarning: (message: string) => void;

  // Live Notices System
  notices: NoticeItem[];
  noticesPage: number;
  hasMoreNotices: boolean;
  isNoticesLoading: boolean;
  isNoticesLoadingMore: boolean;
  isOffline: boolean;
  pinnedNoticeIds: string[];

  // University Notices System
  universityNotices: NoticeItem[];
  isUniversityLoading: boolean;

  // Explore navigation persistence
  exploreActiveView: 'hub' | 'departments' | 'faculty-list' | 'profile-webview' | 'syllabus' | 'hostels' | 'notices' | 'calculator' | 'cgpa-calculator' | 'mceaa' | 'doc-scanner' | 'clubs';
  exploreSelectedDeptId: string | null;
  isExploreMenuVisible: boolean;
  isInChatRoom: boolean;
  setIsInChatRoom: (val: boolean) => void;
  shouldOpenLoginSettings: boolean;
  setShouldOpenLoginSettings: (open: boolean) => void;
  setExploreActiveView: (view: 'hub' | 'departments' | 'faculty-list' | 'profile-webview' | 'syllabus' | 'hostels' | 'notices' | 'calculator' | 'cgpa-calculator' | 'mceaa' | 'doc-scanner' | 'clubs') => void;
  setExploreSelectedDeptId: (deptId: string | null) => void;
  setExploreMenuVisible: (visible: boolean) => void;

  // Notices actions
  fetchNotices: (forceRefresh?: boolean, loadMore?: boolean) => Promise<void>;
  syncNoticesQuietly: (page?: number) => Promise<void>;
  togglePinNotice: (id: string) => Promise<void>;

  // University Notices actions
  fetchUniversityNotices: (forceRefresh?: boolean) => Promise<void>;
  syncUniversityNoticesQuietly: () => Promise<void>;

  // Settings System
  themePreference: 'light' | 'dark' | 'system';
  pushNoticesEnabled: boolean;
  pushClapsEnabled: boolean;
  dataSaverEnabled: boolean;

  setThemePreference: (pref: 'light' | 'dark' | 'system') => Promise<void>;
  setPushNoticesEnabled: (enabled: boolean) => Promise<void>;
  setPushClapsEnabled: (enabled: boolean) => Promise<void>;
  setDataSaverEnabled: (enabled: boolean) => Promise<void>;
  clearAppCache: () => Promise<void>;


  // Initializers
  initStore: () => Promise<void>;
  syncConnections: () => Promise<void>;

  // Session managers
  setUser: (user: any) => Promise<void>;
  logout: () => Promise<void>;

  // Sheet togglers
  setCreatePostVisible: (visible: boolean) => void;
  setAuthPromptVisible: (visible: boolean, reason?: string) => void;
  setActiveScreen: (screen: string) => void;

  // Post & Poll actions
  handleClap: (postId: string) => Promise<void>;
  loadCommentsForPost: (postId: string) => Promise<void>;
  addComment: (postId: string, userName: string, userRole: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest' | 'Admin', text: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  likeComment: (postId: string, commentId: string) => Promise<void>;
  replyToComment: (postId: string, commentId: string, userName: string, userRole: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest' | 'Admin', text: string) => Promise<void>;
  reportComment: (postId: string, commentId: string, reason: string) => Promise<void>;
  reportPost: (postId: string, reason: string) => Promise<void>;
  editComment: (postId: string, commentId: string, newText: string) => Promise<void>;
  createPost: (postData: {
    authorName: string;
    authorRole: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest' | 'Admin';
    category: Post['category'];
    title: string;
    content: string;
    imageUrl?: string;
    linkUrl?: string;
    isAnonymous?: boolean;
    pollOptions?: string[];
    allowMultipleVotes?: boolean;
    isSpamCandidate?: boolean;
    flaggedReason?: string;
    flaggedKeywords?: string[];
  }) => Promise<void>;
  submitVote: (postId: string, optionId: string) => Promise<void>;

  // Connection actions
  toggleConnection: (contactId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  editPost: (postId: string, newContent: string) => Promise<void>;
  syncUserProfileToContent: (uid: string, newRole: string, newName: string, newPhoto?: string, oldName?: string) => Promise<void>;
  togglePostCommentsDisabled: (postId: string, disable: boolean) => Promise<void>;

  // Local Notes & Bookmarks actions
  toggleSubjectBookmark: (subjectName: string) => Promise<void>;
  togglePostBookmark: (postId: string) => Promise<void>;
  toggleMaterialBookmark: (material: any) => Promise<void>;
  addLocalNote: (title: string, content: string) => Promise<void>;
  updateLocalNote: (id: string, title: string, content: string) => Promise<void>;
  deleteLocalNote: (id: string) => Promise<void>;

  // Firebase Vault Sync
  syncVaultToFirebase: () => Promise<void>;
  fetchVaultFromFirebase: () => Promise<void>;
  clearVaultData: () => Promise<void>;

  // Reusable Auto-Disappearing Toast System
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;

  // Paginated Posts & Caching states
  lastVisiblePostDoc: any | null;
  hasMorePosts: boolean;
  isPostsLoading: boolean;
  isPostsRefreshing: boolean;
  lastPostsSyncTime: number;
  lastNoticesSyncTime: number;
  lastUniversityNoticesSyncTime: number;
  failedFetchCount: number;
  fetchPosts: (options?: { refresh?: boolean; loadMore?: boolean; quiet?: boolean }) => Promise<void>;
  
  // Network Search History
  networkSearchHistory: string[];
  addNetworkSearchHistory: (term: string) => Promise<void>;
  clearNetworkSearchHistory: () => Promise<void>;

  // Zero-Cost Unread Counters (Watermark Pattern)
  roomStats: Record<string, number>;
  readStates: Record<string, number>;
  markRoomAsRead: (roomId: string) => Promise<void>;
  listenToRoomStats: () => void;
}

const INITIAL_POSTS: Post[] = [];

const INITIAL_CONNECTIONS: ContactConnection[] = [];

// Module-level dictionary for debouncing Firestore clap syncs
const clapSyncTimers: Record<string, any> = {};
const MAX_CLAP_TIMERS = 50;

// Clean up all pending clap sync timers (call on logout)
const clearAllClapTimers = () => {
  Object.values(clapSyncTimers).forEach(clearTimeout);
  Object.keys(clapSyncTimers).forEach(key => delete clapSyncTimers[key]);
};

// Fallback notices for college notice board when fetch fails & there is no cache
export const FALLBACK_COLLEGE_NOTICES: NoticeItem[] = [
  {
    id: 'fallback-col-1',
    title: 'B.Tech 1st Semester Registration & Document Verification 2026 Schedule',
    snippet: 'All newly admitted B.Tech students are directed to report to the academic section with all original certificates, allotment letter, and fee receipts for registration.',
    link: 'https://www.mcemotihari.ac.in/',
    pubDate: 'May 25, 2026',
    rawDate: new Date().toISOString(),
    category: 'Admissions',
    isNew: true,
    isImportant: true,
    isPinned: false
  },
  {
    id: 'fallback-col-2',
    title: 'B.Tech 4th & 6th Sem Mid-Semester Examination Form Submission Notice',
    snippet: 'Students of 4th and 6th semester are requested to fill their examination forms online and submit a physical copy of the receipt to the exam department.',
    link: 'https://www.mcemotihari.ac.in/',
    pubDate: 'May 20, 2026',
    rawDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    category: 'Exams',
    isNew: false,
    isImportant: true,
    isPinned: false
  },
  {
    id: 'fallback-col-3',
    title: 'Pool Campus Placement Drive by HCL Tech & Wipro for B.Tech students',
    snippet: 'Training & Placement cell invites registration from final year B.Tech CSE, EEE, and ECE students for the upcoming pool campus drive.',
    link: 'https://www.mcemotihari.ac.in/',
    pubDate: 'May 18, 2026',
    rawDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    category: 'Placements',
    isNew: false,
    isImportant: false,
    isPinned: false
  },
  {
    id: 'fallback-col-4',
    title: 'MCE Motihari Revised Summer Vacation & Academic Calendar 2026',
    snippet: 'Academic department releases the updated class schedules, holidays, and examination slots according to new university guidelines.',
    link: 'https://www.mcemotihari.ac.in/',
    pubDate: 'May 15, 2026',
    rawDate: new Date(Date.now() - 86400000 * 8).toISOString(),
    category: 'Academic',
    isNew: false,
    isImportant: false,
    isPinned: false
  }
];

// Fallback notices for university board when fetch fails & there is no cache
export const FALLBACK_UNIVERSITY_NOTICES: NoticeItem[] = [
  {
    id: 'fallback-univ-1',
    title: 'BEU Patna B.Tech Odd Semester Exam Schedule & Registration Notice',
    snippet: 'Bihar Engineering University (BEU) Patna releases the odd semester examination form fill-up dates and fee structures for B.Tech students.',
    link: 'https://beu-bih.ac.in/',
    pubDate: 'May 24, 2026',
    rawDate: new Date().toISOString(),
    category: 'Exams',
    isNew: true,
    isImportant: true,
    isPinned: false
  },
  {
    id: 'fallback-univ-2',
    title: 'Implementation of National Education Policy (NEP 2020) in Bihar Engineering Colleges',
    snippet: 'BEU Patna issues fresh guidelines regarding syllabus structuring, credit mapping, and choice-based credit systems under NEP 2020.',
    link: 'https://beu-bih.ac.in/',
    pubDate: 'May 18, 2026',
    rawDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    category: 'Academic',
    isNew: false,
    isImportant: true,
    isPinned: false
  },
  {
    id: 'fallback-univ-3',
    title: 'Guidelines for BEU Bihar Sports Meet & Cultural Festival 2026',
    snippet: 'All constituent and affiliated engineering colleges are requested to register their athletes and teams for the annual BEU Sports championship.',
    link: 'https://beu-bih.ac.in/',
    pubDate: 'May 12, 2026',
    rawDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    category: 'Academic',
    isNew: false,
    isImportant: false,
    isPinned: false
  }
];

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isStoreHydrated: false,
  roomStats: {},
  readStates: {},
  posts: [],
  connections: [],
  isCreatePostVisible: false,
  createPostPreset: null,
  isAuthPromptVisible: false,
  authPromptReason: '',
  activeScreen: 'Home Feed',

  // Local Notes & Bookmarks
  bookmarkedSubjects: [],
  bookmarkedPostIds: [],
  heartedPostIds: [],
  reportedPostIds: [],
  savedMaterials: [],
  blockedUserUids: [],
  hiddenMessageIds: [],
  // Smart Feed seen post tracking
  seenPostIds: [],
  localNotes: [],
  commentSpamWarning: null,

  markPostsSeen: async (postIds: string[]) => {
    if (!postIds || postIds.length === 0) return;
    const current = get().seenPostIds || [];
    const currentSet = new Set(current);
    const newIds = postIds.filter(id => !currentSet.has(id));
    if (newIds.length === 0) return;
    // Keep max 500 seen post IDs (FIFO — drop oldest when exceeds limit)
    const combined = [...current, ...newIds];
    const trimmed = combined.length > 500 ? combined.slice(combined.length - 500) : combined;
    set({ seenPostIds: trimmed });
    // Persist in background
    AsyncStorage.setItem('@mce_seen_post_ids', JSON.stringify(trimmed)).catch(() => {});
  },
  
  hideMessage: async (messageId: string) => {
    const current = get().hiddenMessageIds;
    if (!current.includes(messageId)) {
      const updated = [...current, messageId];
      set({ hiddenMessageIds: updated });
      await AsyncStorage.setItem('@mce_hidden_messages', JSON.stringify(updated));
    }
  },

  // Network Search History
  networkSearchHistory: [],

  // Paginated Posts & Caching Init
  lastVisiblePostDoc: null,
  hasMorePosts: true,
  isPostsLoading: false,
  isPostsRefreshing: false,
  lastPostsSyncTime: 0,
  lastNoticesSyncTime: 0,
  lastUniversityNoticesSyncTime: 0,
  failedFetchCount: 0,
  triggerCommentSpamWarning: (message) => {
    set({ commentSpamWarning: message });
    setTimeout(() => {
      set({ commentSpamWarning: null });
    }, 2500);
  },

  // Live Notices System
  notices: [],
  noticesPage: 1,
  hasMoreNotices: true,
  isNoticesLoading: false,
  isNoticesLoadingMore: false,
  isOffline: false,
  pinnedNoticeIds: [],

  // University Notices System
  universityNotices: [],
  isUniversityLoading: false,

  // Settings System
  themePreference: 'light',
  pushNoticesEnabled: true,
  pushClapsEnabled: true,
  dataSaverEnabled: false,

  // Explore Navigation Persistence
  exploreActiveView: 'hub',
  exploreSelectedDeptId: null,
  isExploreMenuVisible: false,
  isInChatRoom: false,
  shouldOpenLoginSettings: false,
  setShouldOpenLoginSettings: (open) => set({ shouldOpenLoginSettings: open }),

  // Reusable Auto-Disappearing Toast System
  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: null });
    setTimeout(() => {
      set({ toast: { message, type } });
    }, 50);
    
    setTimeout(() => {
      const currentToast = get().toast;
      if (currentToast && currentToast.message === message) {
        get().hideToast();
      }
    }, 3200);
  },
  hideToast: () => set({ toast: null }),


  initStore: async () => {
    if (get().isStoreHydrated || (global as any).__mce_store_initializing) {
      return;
    }
    (global as any).__mce_store_initializing = true;
    if (__DEV__) { console.time('[Startup] Zustand Hydration'); }
    try {
      if (__DEV__) { console.time('[Startup] AsyncStorage Restore'); }
      if (__DEV__) { console.time('[Startup] User Session Restore'); }
      const keysToFetch = [
        '@mce_user', '@mce_hearted_post_ids', '@mce_posts', '@mce_posts_sync_time',
        '@mce_connections', '@mce_bookmarked_subjects', '@mce_bookmarked_post_ids',
        '@mce_reported_post_ids', '@mce_saved_materials', '@mce_local_notes',
        '@mce_notices_v3', '@mce_notices_sync_time', '@mce_university_notices_v3',
        '@mce_university_notices_sync_time', '@mce_pinned_notice_ids', '@mce_blocked_user_uids',
        '@mce_hidden_messages', '@mce_seen_post_ids',
        '@mce_explore_active_view', '@mce_explore_dept_id', '@mce_theme_preference',
        '@mce_push_notices', '@mce_push_claps', '@mce_data_saver', '@mce_network_search_history',
        '@mce_readStates'
      ];
      const multiGetResults = await AsyncStorage.multiGet(keysToFetch);
      const storageMap: Record<string, string | null> = {};
      multiGetResults.forEach((pair) => {
        const key = pair[0];
        const val = pair[1];
        storageMap[key] = val;
      });

      // 1. Load User Session
      const storedUser = storageMap['@mce_user'];
      if (storedUser) {
        try {
          set({ user: JSON.parse(storedUser) });
        } catch {
          await AsyncStorage.removeItem('@mce_user');
        }
      }
      if (__DEV__) { console.timeEnd('[Startup] User Session Restore'); }

      // 2. Cache-First Posts Load (Resolves immediately for Zero White Flash Guarantee)
      const storedHeartedIds = storageMap['@mce_hearted_post_ids'];
      const heartedIds = parseJsonArray<string>(storedHeartedIds);
      const storedPosts = storageMap['@mce_posts'];
      let cachedMappedPosts: Post[] = [];
      if (storedPosts) {
        try {
          const cachedPosts = parseJsonArray<Post>(storedPosts);
          cachedMappedPosts = cachedPosts.map(p => {
            if (!p) return null;
            const userUid = get().user?.uid;
            let heartedBy = p.heartedBy;
            if (!heartedBy) {
              if (userUid && (p.claps > 0 || heartedIds.includes(p.id))) {
                heartedBy = [userUid];
              } else {
                heartedBy = [];
              }
            }
            const isClapped = userUid ? heartedBy.includes(userUid) : heartedIds.includes(p.id);
            const claps = heartedBy.length;
            return {
              ...p,
              heartedBy,
              isClapped,
              claps
            };
          }).filter(Boolean) as Post[];
        } catch (postErr) {
          console.warn('Failed to parse cached posts:', postErr);
        }
      }
      const storedPostsSyncTime = storageMap['@mce_posts_sync_time'];
      if (storedPostsSyncTime) {
        set({ lastPostsSyncTime: Number(storedPostsSyncTime) });
      }

      // 3. Load Connections state
      const storedConnections = storageMap['@mce_connections'];
      let connectionsList = parseJsonArray<ContactConnection>(storedConnections);
      const mockNames = [
        'Amit Singh', 
        'Nisha Kumari', 
        'Pankaj Kumar', 
        'Abhishek Kumar', 
        'Shweta Raj', 
        'Rohan Sharma'
      ];
      connectionsList = connectionsList.filter((conn: any) => conn && conn.name && !mockNames.includes(conn.name));
      
      const sortedCachedPosts = sortPostsPriority(cachedMappedPosts, connectionsList);
      set({ connections: connectionsList, posts: sortedCachedPosts });
      await AsyncStorage.setItem('@mce_connections', JSON.stringify(connectionsList));

      // 4. Load Bookmarked subjects
      const storedBookmarks = storageMap['@mce_bookmarked_subjects'];
      if (storedBookmarks) {
        set({ bookmarkedSubjects: parseJsonArray<string>(storedBookmarks) });
      }

      // 4.5 Load Bookmarked posts
      const storedBookmarkedPosts = storageMap['@mce_bookmarked_post_ids'];
      if (storedBookmarkedPosts) {
        set({ bookmarkedPostIds: parseJsonArray<string>(storedBookmarkedPosts) });
      }

      if (__DEV__) { console.timeEnd('[Startup] AsyncStorage Restore'); }
      if (__DEV__) { console.timeEnd('[Startup] Zustand Hydration'); }

      // 4.6 Load Hearted/Liked posts
      const storedHearted = storageMap['@mce_hearted_post_ids'];
      if (storedHearted) {
        set({ heartedPostIds: parseJsonArray<string>(storedHearted) });
      }

      // 4.6.5 Load Reported posts
      const storedReported = storageMap['@mce_reported_post_ids'];
      if (storedReported) {
        set({ reportedPostIds: parseJsonArray<string>(storedReported) });
      }

      // 4.6.6 Load Smart Feed seen post IDs
      const storedSeenPosts = storageMap['@mce_seen_post_ids'];
      if (storedSeenPosts) {
        set({ seenPostIds: parseJsonArray<string>(storedSeenPosts) });
      }

      // 4.6.7 Set a unique session seed for feed rotation — each app open = different ordering
      _feedSessionSeed = Math.floor(Math.random() * 100000);

      // 4.7 Load Bookmarked materials
      const storedSavedMaterials = storageMap['@mce_saved_materials'];
      if (storedSavedMaterials) {
        set({ savedMaterials: parseJsonArray<any>(storedSavedMaterials) });
      }

      // 5. Load Local Notes
      const storedNotes = storageMap['@mce_local_notes'];
      if (storedNotes) {
        set({ localNotes: parseJsonArray<any>(storedNotes) });
      }

      // 5.5 Load Hidden Messages
      const storedHiddenMsgs = storageMap['@mce_hidden_messages'];
      if (storedHiddenMsgs) {
        set({ hiddenMessageIds: parseJsonArray<string>(storedHiddenMsgs) });
      }

      // 5.5 Attempt to Fetch Encrypted Vault from Firebase
      if (get().user) {
        // Run in background without blocking the init
        get().fetchVaultFromFirebase().catch(e => console.warn('Failed background vault fetch:', e));
      }

      // 6. Load Live Notices from Cache
      const storedNotices = storageMap['@mce_notices_v3'];
      if (storedNotices) {
        const parsed = parseJsonArray<NoticeItem>(storedNotices);
        const sanitized = parsed.filter(n => 
          !n.title.toLowerCase().includes('privacy policy') && 
          !n.title.toLowerCase().includes('about us') &&
          !n.title.toLowerCase().includes('contact')
        );
        if (sanitized.length > 0) {
          set({ notices: sanitized });
        } else {
          set({ notices: FALLBACK_COLLEGE_NOTICES });
        }
      } else {
        set({ notices: FALLBACK_COLLEGE_NOTICES });
        await AsyncStorage.setItem('@mce_notices_v3', JSON.stringify([]));
      }

      const storedNoticesSyncTime = storageMap['@mce_notices_sync_time'];
      if (storedNoticesSyncTime) {
        set({ lastNoticesSyncTime: Number(storedNoticesSyncTime) });
      }

      // 6.5 Load Live University Notices from Cache
      const storedUniNotices = storageMap['@mce_university_notices_v3'];
      if (storedUniNotices) {
        const parsed = parseJsonArray<NoticeItem>(storedUniNotices);
        if (parsed.length > 0) {
          set({ universityNotices: parsed });
        } else {
          set({ universityNotices: FALLBACK_UNIVERSITY_NOTICES });
        }
      } else {
        set({ universityNotices: FALLBACK_UNIVERSITY_NOTICES });
        await AsyncStorage.setItem('@mce_university_notices_v3', JSON.stringify([]));
      }

      const storedUniNoticesSyncTime = storageMap['@mce_university_notices_sync_time'];
      if (storedUniNoticesSyncTime) {
        set({ lastUniversityNoticesSyncTime: Number(storedUniNoticesSyncTime) });
      }

      // 7. Load Pinned Notice IDs
      const storedPinnedIds = storageMap['@mce_pinned_notice_ids'];
      if (storedPinnedIds) {
        set({ pinnedNoticeIds: parseJsonArray<string>(storedPinnedIds) });
      }

      // 7.5 Load Blocked User UIDs
      const storedBlocked = storageMap['@mce_blocked_user_uids'];
      if (storedBlocked) {
        set({ blockedUserUids: parseJsonArray<string>(storedBlocked) });
      }

      // 8. Load Explore View persistence
      const storedActiveView = storageMap['@mce_explore_active_view'];
      if (storedActiveView) {
        set({ exploreActiveView: storedActiveView as any });
      }
      const storedDeptId = storageMap['@mce_explore_dept_id'];
      if (storedDeptId) {
        set({ exploreSelectedDeptId: storedDeptId });
      }

      // 9. Load Theme
      const storedTheme = storageMap['@mce_theme_preference'];
      if (storedTheme) {
        set({ themePreference: storedTheme as 'light' | 'dark' | 'system' });
      }

      // 10. Initialize network search history
      const storedSearchHistory = storageMap['@mce_network_search_history'];
      if (storedSearchHistory) {
        set({ networkSearchHistory: parseJsonArray<string>(storedSearchHistory) });
      }

      // 11. Load Settings
      const storedPushNotices = storageMap['@mce_push_notices'];
      if (storedPushNotices) {
        set({ pushNoticesEnabled: storedPushNotices === 'true' });
      }
      const storedPushClaps = storageMap['@mce_push_claps'];
      if (storedPushClaps) {
        set({ pushClapsEnabled: storedPushClaps === 'true' });
      }
      const storedDataSaver = storageMap['@mce_data_saver'];
      if (storedDataSaver) {
        set({ dataSaverEnabled: storedDataSaver === 'true' });
      }

      // 12. Load Read States
      const storedReadStates = storageMap['@mce_readStates'];
      if (storedReadStates) {
        set({ readStates: JSON.parse(storedReadStates) });
      }

      // Trigger soft TTL-guarded background syncs quietly in parallel
      setTimeout(() => {
        const postsSyncTime = get().lastPostsSyncTime;
        if (isCacheExpired(postsSyncTime, 5)) {
          get().fetchPosts({ quiet: true }).catch(err => console.warn('Background posts sync failed on startup:', err));
        }

        const noticesSyncTime = get().lastNoticesSyncTime;
        if (isCacheExpired(noticesSyncTime, 15)) {
          get().fetchNotices(true).catch(err => console.warn('Background notice sync failed on startup:', err));
        }

        const uniSyncTime = get().lastUniversityNoticesSyncTime;
        if (isCacheExpired(uniSyncTime, 15)) {
          get().fetchUniversityNotices(true).catch(err => console.warn('Background BEU notice sync failed on startup:', err));
        }

        get().syncConnections().catch(() => {});
      }, 1000);
    } catch (e) {
      console.error('Failed to initialize app state store:', e);
    } finally {
      (global as any).__mce_store_initializing = false;
      set({ isStoreHydrated: true });
      get().listenToRoomStats();
    }
  },
  blockUser: async (targetUid: string) => {
    if (!targetUid) return;
    const current = get().blockedUserUids || [];
    if (current.includes(targetUid)) return;
    
    const updated = [...current, targetUid];
    set({ blockedUserUids: updated });
    await AsyncStorage.setItem('@mce_blocked_user_uids', JSON.stringify(updated));
    get().showToast('User blocked successfully! Unka koi post ab aapko nahi dikhega! 🚫', 'success');
  },

  unblockUser: async (targetUid: string) => {
    if (!targetUid) return;
    const current = get().blockedUserUids || [];
    const updated = current.filter(uid => uid !== targetUid);
    set({ blockedUserUids: updated });
    await AsyncStorage.setItem('@mce_blocked_user_uids', JSON.stringify(updated));
    get().showToast('User unblocked successfully! ✅', 'success');
  },

  setUser: async (user) => {
    try {
      await AsyncStorage.setItem('@mce_user', JSON.stringify(user));
      set({ user });
    } catch (e) {
      console.error(e);
    }
  },

  syncConnections: async () => {
    const currentUser = get().user;
    if (!currentUser || currentUser.role === 'Guest') return;
    try {
      const { collection, getDocs, deleteDoc, doc } = require('firebase/firestore');
      const { db } = require('../config/firebase');
      
      const connQuery = collection(db, 'users', currentUser.uid, 'connections');
      const snapshot = await getDocs(connQuery);
      
      const dbConnections: ContactConnection[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data && data.status) {
          const isSelf = 
            docSnap.id === currentUser.uid ||
            (data.name && data.name.trim().toLowerCase() === currentUser.name?.trim().toLowerCase()) ||
            (data.username && data.username.trim().toLowerCase() === currentUser.username?.trim().toLowerCase());
            
          if (isSelf) {
            console.log('[syncConnections] Self-connection detected and removed from Firestore:', docSnap.id);
            try {
              await deleteDoc(doc(db, 'users', currentUser.uid, 'connections', docSnap.id));
            } catch (err) {
              console.warn('Failed to delete self-connection:', err);
            }
            continue;
          }

          dbConnections.push({
            id: docSnap.id,
            name: data.name || 'Campus Member',
            role: data.role || 'Student',
            branch: data.branch || '',
            batch: data.batch || '',
            image: data.image || '',
            status: data.status,
          });
        }
      }

      if (dbConnections.length > 0) {
        const sortedPosts = sortPostsPriority(get().posts, dbConnections);
        set({ connections: dbConnections, posts: sortedPosts });
        await AsyncStorage.setItem('@mce_connections', JSON.stringify(dbConnections));
        await AsyncStorage.setItem('@mce_posts', JSON.stringify(sortedPosts));
      }

      try {
        const { doc, setDoc } = require('firebase/firestore');
        const activeConnectionsCount = dbConnections.filter((c: any) => c.status === 'Connected').length;
        const profileRef = doc(db, 'publicProfiles', currentUser.uid);
        await setDoc(profileRef, { connectionsCount: activeConnectionsCount }, { merge: true });
      } catch (profileErr) {
        console.warn('Failed to update publicProfile connectionsCount:', profileErr);
      }
    } catch (e) {
      console.error('Failed to sync connections from Firestore:', e);
    }
  },

  logout: async () => {
    try {
      // Clean up all pending debounced Firestore syncs to prevent stale writes
      clearAllClapTimers();
      await AsyncStorage.removeItem('@mce_user');
      set({ user: null });
    } catch (e) {
      console.error(e);
    }
  },

  setCreatePostVisible: (visible) => set({ isCreatePostVisible: visible }),
  setCreatePostPreset: (preset) => set({ createPostPreset: preset }),

  setAuthPromptVisible: (visible, reason = 'continue') => 
    set({ isAuthPromptVisible: visible, authPromptReason: reason }),

  setActiveScreen: (screen) => set({ activeScreen: screen }),

  setExploreActiveView: (view) => {
    set({ exploreActiveView: view });
    AsyncStorage.setItem('@mce_explore_active_view', view).catch(err => console.warn('Failed to save explore view:', err));
  },
  setExploreSelectedDeptId: (deptId) => {
    set({ exploreSelectedDeptId: deptId });
    if (deptId) {
      AsyncStorage.setItem('@mce_explore_dept_id', deptId).catch(err => console.warn('Failed to save explore dept id:', err));
    } else {
      AsyncStorage.removeItem('@mce_explore_dept_id').catch(err => console.warn('Failed to clear explore dept id:', err));
    }
  },
  setExploreMenuVisible: (visible) => set({ isExploreMenuVisible: visible }),
  setIsInChatRoom: (val) => set({ isInChatRoom: val }),


  handleClap: async (postId) => {
    const userUid = get().user?.uid;
    if (!userUid) return; // Guests or logged out users cannot clap

    const heartedPostIds = get().heartedPostIds || [];
    const hasHearted = heartedPostIds.includes(postId);
    
    // Toggle hearted status locally
    let newHeartedIds: string[];
    if (hasHearted) {
      newHeartedIds = heartedPostIds.filter(id => id !== postId);
    } else {
      newHeartedIds = [...heartedPostIds, postId];
    }
    
    set({ heartedPostIds: newHeartedIds });
    await AsyncStorage.setItem('@mce_hearted_post_ids', JSON.stringify(newHeartedIds));

    const updated = get().posts.map(post => {
      if (post.id === postId) {
        let heartedBy = post.heartedBy || [];
        const alreadyInArray = heartedBy.includes(userUid);
        
        let newHeartedBy: string[];
        if (alreadyInArray) {
          newHeartedBy = heartedBy.filter(uid => uid !== userUid);
        } else {
          newHeartedBy = [...heartedBy, userUid];
        }

        const isClapped = newHeartedBy.includes(userUid);
        const claps = newHeartedBy.length;

        return {
          ...post,
          heartedBy: newHeartedBy,
          isClapped,
          claps
        };
      }
      return post;
    });

    set({ posts: updated });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));

    // Debounced sync with Firestore to prevent database write spam on multiple rapid clicks
    if (!postId.startsWith('post-')) {
      if (clapSyncTimers[postId]) {
        clearTimeout(clapSyncTimers[postId]);
      }

      // Prevent unbounded timer growth - evict oldest timer if limit exceeded
      const timerKeys = Object.keys(clapSyncTimers);
      if (timerKeys.length >= MAX_CLAP_TIMERS) {
        const oldestKey = timerKeys[0];
        clearTimeout(clapSyncTimers[oldestKey]);
        delete clapSyncTimers[oldestKey];
      }

      clapSyncTimers[postId] = setTimeout(async () => {
        try {
          const currentPosts = get().posts;
          const targetPost = currentPosts.find(p => p.id === postId);
          if (targetPost) {
            const heartDocRef = doc(db, 'posts', postId, 'hearts', userUid);
            if (hasHearted) {
              // Unlike: remove heart doc and notification
              await deleteDoc(heartDocRef);
              if (targetPost.authorUid && targetPost.authorUid !== userUid) {
                const notifRef = doc(db, 'users', targetPost.authorUid, 'notifications', `like_${userUid}_${postId}`);
                await deleteDoc(notifRef);
              }
            } else {
              // Like: save heart doc + in-app notification (no push notification for likes)
              await setDoc(heartDocRef, {
                userId: userUid,
                createdAt: new Date().toISOString()
              });
              if (targetPost.authorUid && targetPost.authorUid !== userUid) {
                const userObj = get().user;
                const notifRef = doc(db, 'users', targetPost.authorUid, 'notifications', `like_${userUid}_${postId}`);
                await setDoc(notifRef, {
                  type: 'like',
                  title: '❤️ New Post Heart',
                  body: `${userObj?.name || 'Someone'} liked your post: "${targetPost.title || targetPost.content.slice(0, 30) + '...'}"`,
                  timestamp: new Date().toISOString(),
                  read: false,
                  targetPostId: postId,
                  senderUid: userUid,
                  senderName: userObj?.name || 'Someone',
                  senderPhoto: userObj?.photoUrl || '',
                  senderRole: userObj?.role || 'Student',
                  senderUsername: userObj?.username || ''
                });
              }
            }

            // Sync legacy fields for old client compatibility!
            await updateDoc(doc(db, 'posts', postId), {
              heartedBy: targetPost.heartedBy || [],
              claps: targetPost.claps
            });
          }
          delete clapSyncTimers[postId];
        } catch (err) {
          console.error('Failed to sync claps in Firestore (debounced):', err);
        }
      }, 1500);
    }
  },

  loadCommentsForPost: async (postId) => {
    if (postId.startsWith('post-')) {
      return;
    }
    try {
      const commentsQuery = query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('createdAt', 'asc')
      );
      const querySnapshot = await getDocs(commentsQuery);
      const currentUser = get().user;
      const subcollectionComments: Comment[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (currentUser && data.userId === currentUser.uid) {
          data.userName = currentUser.name;
          data.userRole = currentUser.adminRole ? 'Admin' : currentUser.role;
          if (currentUser.photoUrl) data.userPhoto = currentUser.photoUrl;
        }
        if (data.replies && Array.isArray(data.replies)) {
          data.replies = data.replies.map((reply: any) => {
            if (currentUser && reply.userId === currentUser.uid) {
              return {
                ...reply,
                userName: currentUser.name,
                userRole: currentUser.adminRole ? 'Admin' : currentUser.role,
                ...(currentUser.photoUrl ? { userPhoto: currentUser.photoUrl } : {})
              };
            }
            return reply;
          });
        }
        subcollectionComments.push({ id: docSnap.id, ...data } as any);
      });

      const currentPosts = get().posts;
      const targetPost = currentPosts.find(p => p.id === postId);
      let commentsToUse = subcollectionComments;

      // Fallback Compatibility Layer
      if (subcollectionComments.length === 0 && targetPost && targetPost.comments && targetPost.comments.length > 0) {
        commentsToUse = targetPost.comments;
      } else if (subcollectionComments.length > 0) {
      }

      const actualCount = commentsToUse.length;

      const updated = currentPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: commentsToUse,
            commentsCount: actualCount
          };
        }
        return p;
      });

      set({ posts: updated });
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));

      // Self-Healing: if the post document in Firestore is out of sync with the actual subcollection comments, sync it!
      if (targetPost && targetPost.commentsCount !== actualCount) {
        console.log(`[Self-Healing] Syncing commentsCount for post ${postId} from ${targetPost.commentsCount} to ${actualCount}`);
        try {
          await updateDoc(doc(db, 'posts', postId), {
            comments: sanitizeComments(commentsToUse),
            commentsCount: actualCount
          });
        } catch (err) {
          console.warn('[Self-Healing] Failed to sync commentsCount with Firestore:', err);
        }
      }
    } catch (err) {
      console.warn('Failed to load comments from subcollection:', err);
    }
  },

  addComment: async (postId, userName, userRole, text) => {
    // 1. Prevent consecutive identical comments by the same user under the same post
    const targetPost = get().posts.find(p => p.id === postId);
    if (targetPost && targetPost.comments && targetPost.comments.length > 0) {
      const lastComment = targetPost.comments[targetPost.comments.length - 1];
      if (lastComment.userName === userName && lastComment.text.trim() === text.trim()) {
        alert('Spam Blocked! Aap lagatar same comment nahi kar sakte.');
        return;
      }
    }

    // Check for more than 5 consecutive identical emojis
    const singleEmojiRegex = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/u;
    const textChars = Array.from(text);
    let consecutiveCount = 1;
    for (let i = 1; i < textChars.length; i++) {
      const char = textChars[i];
      if (char === textChars[i - 1] && singleEmojiRegex.test(char)) {
        consecutiveCount++;
        if (consecutiveCount > 5) {
          alert('Spam Blocked! You cannot use the same emoji more than 5 times consecutively.');
          return;
        }
      } else {
        consecutiveCount = 1;
      }
    }

    const currentUser = get().user;
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      userName,
      userRole,
      userPhoto: currentUser?.photoUrl || undefined,
      text,
      timestamp: 'Just now',
      userId: currentUser?.uid || undefined,
      userAdminRole: currentUser?.adminRole || undefined
    };

    const updated = get().posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          commentsCount: (post.commentsCount || 0) + 1,
          comments: [...(post.comments || []), newComment]
        };
      }
      return post;
    });

    set({ posts: updated });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));

    try {
      if (!postId.startsWith('post-')) {
        const commentDocRef = doc(db, 'posts', postId, 'comments', newComment.id);
        await setDoc(commentDocRef, {
          userName: newComment.userName,
          userRole: newComment.userRole,
          userPhoto: newComment.userPhoto || null,
          text: newComment.text,
          userId: newComment.userId || null,
          userAdminRole: newComment.userAdminRole || null,
          createdAt: new Date().toISOString()
        });

        // Profanity Check: Auto-report abusive comments
        if (containsProfanity(newComment.text)) {
          // Rate limit: max 1 report per 10 seconds
          const now = Date.now();
          if (now - (globalThis as any).__lastReportTime__ < 10000) {
            console.log('[RateLimit] Report skipped: too frequent');
          } else {
            (globalThis as any).__lastReportTime__ = now;
            try {
              await addDoc(collection(db, 'reports'), {
                type: 'comment',
                targetId: newComment.id,
                targetPreview: newComment.text,
                reportedByCount: 1,
                lastReportReason: 'Auto-detected abusive language',
                status: 'pending',
                createdAt: serverTimestamp()
              });
            } catch (reportErr) {
              console.error('Failed to auto-report abusive comment:', reportErr);
            }
          }
        }

        const targetPost = get().posts.find(p => p.id === postId);
        if (targetPost && targetPost.authorUid && targetPost.authorUid !== newComment.userId) {
          const notifRef = doc(db, 'users', targetPost.authorUid, 'notifications', `comment_${newComment.id}`);
          const notifBody = `${newComment.userName} commented: "${newComment.text.slice(0, 60)}${newComment.text.length > 60 ? '...' : ''}"`;
          await setDoc(notifRef, {
            type: 'comment',
            title: '💬 New Comment',
            body: notifBody,
            timestamp: new Date().toISOString(),
            read: false,
            targetPostId: postId,
            senderUid: newComment.userId || '',
            senderName: newComment.userName,
            senderPhoto: newComment.userPhoto || '',
            senderRole: newComment.userRole,
            senderUsername: get().user?.username || ''
          });

          // 🔔 Send real push notification to the post author's device
          // Fire-and-forget in background — never blocks UI
          (async () => {
            try {
              const { getDoc } = require('firebase/firestore');
              const authorDoc = await getDoc(doc(db, 'users', targetPost.authorUid));
              const pushToken = authorDoc.exists() ? authorDoc.data()?.expoPushToken : null;
              if (pushToken && typeof pushToken === 'string' && pushToken.startsWith('ExponentPushToken')) {
                const { sendPushNotifications } = require('../utils/notifications');
                const postTitle = targetPost.title || (targetPost.content?.slice(0, 40)) || 'your post';
                await sendPushNotifications(
                  [pushToken],
                  `💬 ${newComment.userName} commented`,
                  `"${newComment.text.slice(0, 80)}${newComment.text.length > 80 ? '...' : ''}"`,
                  `/post/${postId}`
                );
              }
            } catch (pushErr) {
              // Silent fail — push notification failure should never break comments
              console.warn('[Push] Failed to send comment push notification:', pushErr);
            }
          })();
        }
        await handleMentions(newComment.text, postId, 'comment', get().user);

        // Sync legacy fields & counts for old client compatibility!
        const refreshedPost = get().posts.find(p => p.id === postId);
        await updateDoc(doc(db, 'posts', postId), {
          comments: sanitizeComments(refreshedPost?.comments),
          commentsCount: refreshedPost?.commentsCount || 0
        });
      }
    } catch (err: any) {
      console.error('Failed to sync comment with Firestore:', err);
      get().showToast(getReadableErrorMessage(err), 'error');
    }
  },

  deleteComment: async (postId, commentId) => {
    const originalPosts = get().posts;
    let isReply = false;
    let parentCommentId = '';
    const updated = get().posts.map(post => {
      if (post.id === postId) {
        let filtered = (post.comments || []).filter(c => c.id !== commentId);
        if (filtered.length === (post.comments || []).length) {
          filtered = (post.comments || []).map(c => {
             if (c.replies && c.replies.some(r => r.id === commentId)) {
                isReply = true;
                parentCommentId = c.id;
                return { ...c, replies: c.replies.filter(r => r.id !== commentId) };
             }
             return c;
          });
        }
        return {
          ...post,
          commentsCount: isReply ? (post.commentsCount || 0) : Math.max(0, (post.commentsCount || 1) - 1),
          comments: filtered
        };
      }
      return post;
    });

    set({ posts: updated });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));

    try {
      if (!postId.startsWith('post-')) {
        if (isReply && parentCommentId) {
          const parentDocRef = doc(db, 'posts', postId, 'comments', parentCommentId);
          const parentComment = updated.find(p => p.id === postId)?.comments?.find(c => c.id === parentCommentId);
          if (parentComment) {
            await updateDoc(parentDocRef, { replies: sanitizeComments(parentComment.replies) });
          }
        } else {
          const commentDocRef = doc(db, 'posts', postId, 'comments', commentId);
          await deleteDoc(commentDocRef);
        }

        const refreshedPost = get().posts.find(p => p.id === postId);
        await updateDoc(doc(db, 'posts', postId), {
          comments: sanitizeComments(refreshedPost?.comments),
          commentsCount: refreshedPost?.commentsCount || 0
        });
      }
      get().showToast('Comment deleted successfully.', 'success');
    } catch (err: any) {
      console.error('Failed to delete comment from Firestore:', err);
      // Rollback optimistic update
      set({ posts: originalPosts });
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(originalPosts));
      // Show proper backend error message
      const { getReadableErrorMessage } = require('@/utils/errors/errorManager');
      get().showToast(getReadableErrorMessage(err), 'error');
    }
  },

  syncUserProfileToContent: async (uid, newRole, newName, newPhoto, oldName) => {
    // 1. UPDATE ZUSTAND AND ASYNC STORAGE FIRST (Immediate UI update)
    const prevPosts = get().posts;
    const updatedPosts = prevPosts.map(post => {
      let p = { ...post };
      let changed = false;
      if (p.authorUid === uid) {
        p = { ...p, authorRole: newRole as any, authorName: newName };
        if (newPhoto !== undefined) p.authorPhoto = newPhoto;
        changed = true;
      }
      if (p.comments) {
          const newComments = p.comments.map(c => {
            let uc = { ...c };
            if (uc.userId === uid || (oldName && uc.userName === oldName)) {
              uc = { ...uc, userRole: newRole as any, userName: newName };
              if (newPhoto !== undefined) uc.userPhoto = newPhoto;
            }
            if (uc.replies) {
              uc.replies = uc.replies.map(r => {
                if (r.userId === uid || (oldName && r.userName === oldName)) {
                  return { ...r, userRole: newRole as any, userName: newName, ...(newPhoto !== undefined ? { userPhoto: newPhoto } : {}) };
                }
                return r;
              });
            }
            return uc;
          });
          if (JSON.stringify(newComments) !== JSON.stringify(p.comments)) {
            p = { ...p, comments: newComments };
            changed = true;
          }
      }
      return changed ? p : post; // Preserve reference if unchanged
    });
    
    set({ posts: updatedPosts });
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(updatedPosts));
    } catch(e) {}
    console.log(`[ProfileSync] Updated ${updatedPosts.filter((p,i) => p !== prevPosts[i]).length} posts locally for uid=${uid} newName=${newName}`);

    // 2. BACKGROUND FIRESTORE SYNC
    try {
      const { collection, query, where, getDocs, writeBatch, collectionGroup, doc } = require('firebase/firestore');
      const { db } = require('../config/firebase');

      // Process in batches of 450 (Firestore limit is 500)
      let batch = writeBatch(db);
      let count = 0;

      const commitBatch = async () => {
        if (count > 0) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      };

      // 2A. Update user's posts
      try {
        const postsQuery = query(collection(db, 'posts'), where('authorUid', '==', uid));
        const postsSnap = await getDocs(postsQuery);
        
        for (const postDoc of postsSnap.docs) {
          const updateData: any = { 
            authorRole: newRole,
            authorName: newName 
          };
          if (newPhoto !== undefined) {
            updateData.authorPhoto = newPhoto;
          }
          batch.set(postDoc.ref, updateData, { merge: true });
          count++;
          if (count >= 450) await commitBatch();
        }
      } catch (e) {
        console.error("Failed to sync profile to posts in Firestore:", e);
      }

      // 3. Update Comments & Replies (using collectionGroup to find all comments written by the user)
      // Also updates the parent post's `comments` field so feed previews reflect changes immediately.
      try {
        const updateData: any = { userRole: newRole, userName: newName };
        if (newPhoto !== undefined) updateData.userPhoto = newPhoto;

        const commentSnapsToProcess: any[] = [];
        const processedCommentIds = new Set<string>();

        // Query by userId
        const commentsQuery = query(
          collectionGroup(db, 'comments'),
          where('userId', '==', uid)
        );
        const commentsSnap = await getDocs(commentsQuery);
        commentsSnap.docs.forEach((doc: any) => {
          if (!processedCommentIds.has(doc.id)) {
            processedCommentIds.add(doc.id);
            commentSnapsToProcess.push(doc);
          }
        });

        // Query by legacy oldName if provided
        if (oldName && oldName !== newName) {
          const legacyQuery = query(
            collectionGroup(db, 'comments'),
            where('userName', '==', oldName)
          );
          const legacySnap = await getDocs(legacyQuery);
          legacySnap.docs.forEach((doc: any) => {
            if (!processedCommentIds.has(doc.id)) {
              processedCommentIds.add(doc.id);
              commentSnapsToProcess.push(doc);
            }
          });
        }

        // Group these comment documents by their parent post ID
        const postGroups: { [postId: string]: { postRef: any, comments: any[] } } = {};

        for (const commentDoc of commentSnapsToProcess) {
          const commentData = commentDoc.data();
          let needsUpdate = false;
          const patch: any = {};

          // Check if top-level comment belongs to this user
          if (commentData.userId === uid || (oldName && commentData.userName === oldName && !commentData.userId)) {
            Object.assign(patch, updateData);
            if (!commentData.userId) patch.userId = uid; // Retroactively link orphaned comments
            needsUpdate = true;
          }

          // Check replies inside this comment
          if (commentData.replies && Array.isArray(commentData.replies)) {
            let repliesUpdated = false;
            const updatedReplies = commentData.replies.map((reply: any) => {
              if (reply.userId === uid || (oldName && reply.userName === oldName && !reply.userId)) {
                repliesUpdated = true;
                return {
                  ...reply,
                  userRole: newRole,
                  userName: newName,
                  ...(newPhoto !== undefined ? { userPhoto: newPhoto } : {}),
                  ...((!reply.userId) ? { userId: uid } : {})
                };
              }
              return reply;
            });
            
            if (repliesUpdated) {
              patch.replies = updatedReplies;
              needsUpdate = true;
            }
          }

          if (needsUpdate) {
            batch.set(commentDoc.ref, patch, { merge: true });
            count++;
            if (count >= 450) await commitBatch();

            // Locate parent post
            const parentPostRef = commentDoc.ref.parent.parent;
            if (parentPostRef) {
              const postId = parentPostRef.id;
              if (!postGroups[postId]) {
                postGroups[postId] = {
                  postRef: parentPostRef,
                  comments: []
                };
              }
              postGroups[postId].comments.push({
                id: commentDoc.id,
                data: commentData,
                patch
              });
            }
          }
        }

        // Now, update each parent post's `comments` array
        for (const postId of Object.keys(postGroups)) {
          const group = postGroups[postId];
          const postSnap = await getDoc(group.postRef);
          if (postSnap.exists()) {
            const postData = postSnap.data() as any;
            const currentComments = postData.comments || [];
            let updated = false;

            const newComments = currentComments.map((c: any) => {
              const matchingPatch = group.comments.find(p => p.id === c.id);
              if (matchingPatch) {
                updated = true;
                return { ...c, ...matchingPatch.patch };
              }

              // Also check replies inside this comment in the post document
              if (c.replies && Array.isArray(c.replies)) {
                let repliesUpdated = false;
                const newReplies = c.replies.map((r: any) => {
                  const replyPatch = group.comments.find(p => p.id === r.id);
                  if (replyPatch) {
                    repliesUpdated = true;
                    return { ...r, ...replyPatch.patch };
                  }
                  return r;
                });

                if (repliesUpdated) {
                  updated = true;
                  return { ...c, replies: newReplies };
                }
              }
              return c;
            });

            if (updated) {
              batch.set(group.postRef, { comments: newComments }, { merge: true });
              count++;
              if (count >= 450) await commitBatch();
            }
          }
        }
      } catch (err) {
        console.error("Failed to sync comments using collectionGroup:", err);
      }

      await commitBatch();

    } catch(err) {
      console.error("Failed to sync profile to content:", err);
    }
  },

  likeComment: async (postId, commentId) => {
    const currentUser = get().user;
    if (!currentUser) return;
    
    let isReply = false;
    let parentCommentId = '';
    let liked = false;
    
    const updated = get().posts.map(post => {
      if (post.id === postId) {
        const updatedComments = (post.comments || []).map(c => {
          if (c.id === commentId) {
            const currentLikes = c.likes || [];
            liked = !currentLikes.includes(currentUser.uid);
            return { ...c, likes: liked ? [...currentLikes, currentUser.uid] : currentLikes.filter(uid => uid !== currentUser.uid) };
          } else if (c.replies && c.replies.some(r => r.id === commentId)) {
            isReply = true;
            parentCommentId = c.id;
            return {
              ...c,
              replies: c.replies.map(r => {
                if (r.id === commentId) {
                  const currentLikes = r.likes || [];
                  liked = !currentLikes.includes(currentUser.uid);
                  return { ...r, likes: liked ? [...currentLikes, currentUser.uid] : currentLikes.filter(uid => uid !== currentUser.uid) };
                }
                return r;
              })
            };
          }
          return c;
        });
        return { ...post, comments: updatedComments };
      }
      return post;
    });
    
    set({ posts: updated });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));

    try {
      if (!postId.startsWith('post-')) {
        const targetDocRef = isReply ? doc(db, 'posts', postId, 'comments', parentCommentId) : doc(db, 'posts', postId, 'comments', commentId);
        if (isReply) {
          const parentComment = updated.find(p => p.id === postId)?.comments?.find(c => c.id === parentCommentId);
          if (parentComment) {
             await updateDoc(targetDocRef, { replies: sanitizeComments(parentComment.replies) });
          }
        } else {
          await updateDoc(targetDocRef, {
            likes: liked ? arrayUnion(currentUser.uid) : arrayRemove(currentUser.uid)
          });
        }
      }
    } catch (err) {
      console.error('Failed to like comment in Firestore', err);
    }
  },

  replyToComment: async (postId, commentId, userName, userRole, text) => {
    const currentUser = get().user;
    if (!currentUser) return;
    
    const reply: Comment = {
      id: `reply-${Date.now()}`,
      userName,
      userRole,
      userPhoto: currentUser?.photoUrl || undefined,
      text,
      timestamp: 'Just now',
      userId: currentUser?.uid || undefined,
      userAdminRole: currentUser?.adminRole || undefined,
      likes: []
    };
    
    const updated = get().posts.map(post => {
      if (post.id === postId) {
        const updatedComments = (post.comments || []).map(c => {
          if (c.id === commentId) {
            return { ...c, replies: [...(c.replies || []), reply] };
          }
          return c;
        });
        return { ...post, comments: updatedComments };
      }
      return post;
    });
    
    set({ posts: updated });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));

    try {
      if (!postId.startsWith('post-')) {
        const commentDocRef = doc(db, 'posts', postId, 'comments', commentId);
        await updateDoc(commentDocRef, {
          replies: arrayUnion(sanitizeComment(reply))
        });

        const refreshedPost = get().posts.find(p => p.id === postId);
        const parentComment = refreshedPost?.comments?.find(c => c.id === commentId);
        
        if (parentComment && parentComment.userId && parentComment.userId !== currentUser.uid) {
          const notifRef = doc(db, 'users', parentComment.userId, 'notifications', `reply_${reply.id}`);
          await setDoc(notifRef, {
            type: 'comment',
            title: '💬 New Reply',
            body: `${userName} replied to your comment: "${reply.text.slice(0, 50)}${reply.text.length > 50 ? '...' : ''}"`,
            timestamp: new Date().toISOString(),
            read: false,
            targetPostId: postId,
            senderUid: currentUser.uid,
            senderName: userName,
            senderPhoto: currentUser.photoUrl || '',
            senderRole: userRole,
            senderUsername: currentUser.username || ''
          });
        }

        if (refreshedPost && refreshedPost.authorUid && refreshedPost.authorUid !== currentUser.uid && refreshedPost.authorUid !== parentComment?.userId) {
          const notifRef = doc(db, 'users', refreshedPost.authorUid, 'notifications', `reply_${reply.id}_author`);
          await setDoc(notifRef, {
            type: 'comment',
            title: '💬 New Thread Reply',
            body: `${userName} replied in your post discussion thread.`,
            timestamp: new Date().toISOString(),
            read: false,
            targetPostId: postId,
            senderUid: currentUser.uid,
            senderName: userName,
            senderPhoto: currentUser.photoUrl || '',
            senderRole: userRole,
            senderUsername: currentUser.username || ''
          });
        }

        await handleMentions(text, postId, 'comment', currentUser);
        
        // Sync legacy field for UI compatibility if needed
        const finalPostState = get().posts.find(p => p.id === postId);
        await updateDoc(doc(db, 'posts', postId), {
          comments: sanitizeComments(finalPostState?.comments)
        });
      }
    } catch (err) {
      console.error('Failed to post reply in Firestore', err);
    }
  },

  reportComment: async (postId, commentId, reason) => {
    const currentUser = get().user;
    if (!currentUser) return;
    try {
      const reportRef = doc(db, 'reports', `report_${currentUser.uid}_${commentId}`);
      await setDoc(reportRef, {
        type: 'comment',
        targetId: commentId,
        targetPreview: `Comment on post ${postId}`,
        reportedByCount: 1,
        lastReportReason: reason,
        status: 'pending',
        createdAt: serverTimestamp(),
        reporterId: currentUser.uid,
        reporterName: currentUser.name || currentUser.email || 'Anonymous',
        postId // Extra metadata
      });
      get().showToast('Report submitted. We will review it.', 'success');
    } catch (err) {
      console.error('Failed to report comment', err);
      get().showToast('Failed to submit report', 'error');
    }
  },

  reportPost: async (postId, reason) => {
    const currentUser = get().user;
    if (!currentUser) return;
    try {
      const activePost = get().posts.find(p => p.id === postId);
      const reportRef = doc(db, 'reports', `report_${currentUser.uid}_${postId}`);
      await setDoc(reportRef, {
        type: 'post',
        targetId: postId,
        targetPreview: activePost?.content ? activePost.content.substring(0, 150) : activePost?.title || 'No preview',
        reportedByCount: 1,
        lastReportReason: reason,
        status: 'pending',
        createdAt: serverTimestamp(),
        reporterId: currentUser.uid,
        reporterName: currentUser.name || currentUser.email || 'Anonymous'
      });
      
      const currentReportedIds = get().reportedPostIds || [];
      const newReportedIds = [...currentReportedIds, postId];
      set({ reportedPostIds: newReportedIds });
      await AsyncStorage.setItem('@mce_reported_post_ids', JSON.stringify(newReportedIds));
      
      // Update the active posts immediately so it disappears
      const updatedPosts = get().posts.filter(p => p.id !== postId);
      set({ posts: updatedPosts });
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(updatedPosts));

      get().showToast('Report submitted. Post hidden from your feed.', 'success');
    } catch (err) {
      console.error('Failed to report post', err);
      get().showToast('Failed to submit report', 'error');
    }
  },


  editComment: async (postId, commentId, newText) => {
    const updated = get().posts.map(post => {
      if (post.id === postId) {
        const updatedComments = (post.comments || []).map(c => {
          if (c.id === commentId) {
            return {
              ...c,
              text: newText
            };
          }
          return c;
        });
        return {
          ...post,
          comments: updatedComments
        };
      }
      return post;
    });

    set({ posts: updated });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));

    try {
      if (!postId.startsWith('post-')) {
        const commentDocRef = doc(db, 'posts', postId, 'comments', commentId);
        await updateDoc(commentDocRef, {
          text: newText
        });

        // Sync legacy fields & counts for old client compatibility!
        const refreshedPost = get().posts.find(p => p.id === postId);
        await updateDoc(doc(db, 'posts', postId), {
          comments: refreshedPost?.comments || []
        });
      }
    } catch (err: any) {
      console.error('Failed to sync edited comment with Firestore:', err);
      get().showToast(getReadableErrorMessage(err), 'error');
    }
  },

  createPost: async ({
    authorName,
    authorRole,
    category,
    title,
    content,
    imageUrl,
    linkUrl,
    isAnonymous,
    pollOptions,
    allowMultipleVotes,
    isSpamCandidate,
    flaggedReason,
    flaggedKeywords
  }) => {
    const authorUid = get().user?.uid || auth.currentUser?.uid || 'anonymous';
    const finalAuthorRole = get().user?.adminRole ? 'Admin' : authorRole;
    const newPost: Post = {
      id: `post-${Date.now()}`,
      authorName: isAnonymous ? `Anonymous ${finalAuthorRole}` : authorName,
      authorRole: finalAuthorRole as any,
      authorPhoto: isAnonymous 
        ? undefined 
        : (get().user?.photoUrl || (authorRole === 'Guest'
            ? 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix'
            : 'https://api.dicebear.com/7.x/avataaars/png?seed=Aneka')),
      authorUid,
      authorAdminRole: get().user?.adminRole || undefined,
      isAnonymous,
      authorRealName: authorName,
      category,
      title,
      content,
      imageUrl,
      linkUrl,
      claps: 0,
      commentsCount: 0,
      comments: [],
      timestamp: 'Just now',
      allowMultipleVotes,
      createdAt: new Date().toISOString(),
      isSpamCandidate: isSpamCandidate || false,
      flaggedReason,
      flaggedKeywords
    };

    // Parse Link Embed if provided and has no explicit preview
    if (linkUrl && linkUrl.trim()) {
      let domain = 'link';
      try {
        const urlObj = new URL(linkUrl);
        domain = urlObj.hostname;
      } catch (err) {
        // Fallback for simple paste URLs
        const match = linkUrl.match(/^(?:https?:\/\/)?(?:www\.)?([^:\/\s]+)/im);
        if (match) domain = match[1];
      }
      newPost.linkPreview = {
        title: title || 'External Community Reference Link',
        domain: domain,
        description: 'Linked web page referenced by MCE community member.'
      };
    }

    // Set up Poll options if provided
    if (pollOptions && pollOptions.length > 0) {
      newPost.pollOptions = pollOptions
        .filter(opt => opt.trim() !== '')
        .map((opt, index) => ({
          id: `opt-${index}-${Date.now()}`,
          label: opt.trim(),
          votes: 0
        }));
      newPost.totalVotes = 0;
    }

    // Profanity Check: Auto-flag posts containing abusive language
    if (containsProfanity(newPost.title) || containsProfanity(newPost.content)) {
      newPost.isSpamCandidate = true;
      newPost.flaggedReason = 'Auto-detected abusive language';
      newPost.flaggedKeywords = ['profanity', 'abusive'];
    }

    // Save to Firestore dynamically!
    try {
      const docRef = await addDoc(collection(db, 'posts'), {
        authorName: newPost.authorName,
        authorRole: newPost.authorRole,
        authorPhoto: newPost.authorPhoto || null,
        authorUid: newPost.authorUid,
        authorAdminRole: newPost.authorAdminRole || null,
        isAnonymous: newPost.isAnonymous || false,
        authorRealName: newPost.authorRealName || '',
        category: newPost.category,
        title: newPost.title,
        content: newPost.content,
        imageUrl: newPost.imageUrl || null,
        linkUrl: newPost.linkUrl || null,
        linkPreview: newPost.linkPreview || null,
        claps: 0,
        commentsCount: 0,
        comments: [],
        timestamp: 'Just now',
        allowMultipleVotes: newPost.allowMultipleVotes || null,
        pollOptions: newPost.pollOptions || null,
        totalVotes: newPost.totalVotes || null,
        createdAt: new Date().toISOString()
      });
      newPost.id = docRef.id;

      if (!newPost.isAnonymous) {
        try {
          const connectionsRef = collection(db, 'users', authorUid, 'connections');
          const connSnap = await getDocs(connectionsRef);
          
          const batch = writeBatch(db);
          let count = 0;
          
          connSnap.forEach((connDoc) => {
            const connData = connDoc.data();
            if (connData.status === 'Connected') {
              const connectionId = connDoc.id;
              const notifRef = doc(db, 'users', connectionId, 'notifications', `post_${newPost.id}`);
              batch.set(notifRef, {
                type: 'post',
                title: '📢 New Post from Connection',
                body: `${authorName} shared a new post: "${title || content.slice(0, 30) + '...'}"`,
                timestamp: new Date().toISOString(),
                read: false,
                targetPostId: newPost.id,
                senderUid: authorUid,
                senderName: authorName,
                senderPhoto: newPost.authorPhoto || '',
                senderRole: authorRole || 'Student',
                senderUsername: get().user?.username || ''
              });
              count++;
            }
          });
          
          if (count > 0) {
            await batch.commit();
          }
        } catch (e) {
          console.warn('[Post Notification] Failed to dispatch connection alerts:', e);
        }
      }
      
      await handleMentions(newPost.content, newPost.id, 'post', get().user);
    } catch (err: any) {
      console.error('Failed to save post to Firestore:', err);
      get().showToast(getReadableErrorMessage(err), 'error');
    }

    const updated = [newPost, ...get().posts];
    set({ posts: updated });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));
  },

  submitVote: async (postId, optionId) => {

    const userUid = get().user?.uid || auth.currentUser?.uid;
    if (!userUid) {
      console.warn('[VOTE FLOW] Blocking vote: userUid is completely null/undefined!');
      get().showToast('Please sign in to vote.', 'error');
      return;
    }

    let rollbackPosts = get().posts;

    let hasVotedLocally = false;
    const updated = get().posts.map(post => {
      if (post.id === postId && post.pollOptions) {
        const votedIds = post.userVotedOptionIds || (post.userVotedOptionId ? [post.userVotedOptionId] : []);
        
        if (post.allowMultipleVotes) {
          if (votedIds.includes(optionId)) {
            hasVotedLocally = true;
            return post;
          }
          
          const updatedOptions = post.pollOptions.map(opt => {
            if (opt.id === optionId) {
              return { ...opt, votes: opt.votes + 1 };
            }
            return opt;
          });
          
          const newVotedIds = [...votedIds, optionId];
          return {
            ...post,
            pollOptions: updatedOptions,
            userVotedOptionIds: newVotedIds,
            userVotedOptionId: optionId,
            totalVotes: (post.totalVotes || 0) + 1
          };
        } else {
          if (votedIds.length > 0) {
            hasVotedLocally = true;
            return post;
          }
          
          const updatedOptions = post.pollOptions.map(opt => {
            if (opt.id === optionId) {
              return { ...opt, votes: opt.votes + 1 };
            }
            return opt;
          });
          
          return {
            ...post,
            pollOptions: updatedOptions,
            userVotedOptionId: optionId,
            userVotedOptionIds: [optionId],
            totalVotes: (post.totalVotes || 0) + 1
          };
        }
      }
      return post;
    });

    if (hasVotedLocally) {
      return;
    }

    set({ posts: updated });

    try {
      const postRef = doc(db, 'posts', postId);
      
      await runTransaction(db, async (transaction) => {
        
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) {
          throw new Error('Post document does not exist in Firestore!');
        }
        
        const postData = postDoc.data();
        
        if (!postData.pollOptions) throw new Error('Post document does not have pollOptions field');
        const allowMultiple = !!postData.allowMultipleVotes;
        
        // Determine vote document ID based on poll type
        const voteDocId = allowMultiple ? `${postId}_${userUid}_${optionId}` : `${postId}_${userUid}`;
        const voteRef = doc(db, 'pollVotes', voteDocId);
        
        const voteDoc = await transaction.get(voteRef);
        
        if (voteDoc.exists()) {
          // For single‑vote polls we block duplicates; multi‑vote polls already have this option recorded
          if (!allowMultiple) {
            console.warn('[VOTE FLOW] Transaction check failed: single-vote poll already has a vote record!');
            throw new Error('Already voted');
          }
        }

        const newOptions = postData.pollOptions.map((opt: any) => {
          if (opt.id === optionId) return { ...opt, votes: (opt.votes || 0) + 1 };
          return opt;
        });

        // Prepare updates for vote state persistence
        // DO NOT write userVotedOptionId to the global post document
        const updates: any = {
          pollOptions: newOptions,
          totalVotes: (postData.totalVotes || 0) + 1,
        };

        transaction.update(postRef, updates);
        
        const voteData = {
          postId,
          userId: userUid,
          selectedOption: optionId,
          votedAt: serverTimestamp()
        };
        transaction.set(voteRef, voteData);
      });

      await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));
    } catch (e: any) {
      console.error('[VOTE FLOW] EXCEPTION: Vote failed!', {
        message: e.message,
        name: e.name,
        code: e.code,
        stack: e.stack
      });
      set({ posts: rollbackPosts });
      get().showToast('Failed to save vote. Please try again.', 'error');
    }
  },

  toggleConnection: async (contactId) => {
    const updated = get().connections.map(contact => {
      if (contact.id === contactId) {
        let newStatus: ContactConnection['status'] = 'Connect';
        if (contact.status === 'Connect') newStatus = 'Sent';
        else if (contact.status === 'Sent') newStatus = 'Connected';
        else if (contact.status === 'Connected') newStatus = 'Connect';
        
        return {
          ...contact,
          status: newStatus
        };
      }
      return contact;
    });

    const sortedPosts = sortPostsPriority(get().posts, updated);

    set({ connections: updated, posts: sortedPosts });
    await AsyncStorage.setItem('@mce_connections', JSON.stringify(updated));
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(sortedPosts));
  },

  deletePost: async (postId) => {
    // Optimistically remove post locally
    const currentPosts = get().posts;
    const postToDelete = currentPosts.find(p => p.id === postId);
    if (!postToDelete) return;

    const updatedPosts = currentPosts.filter(p => p.id !== postId);
    const updatedBookmarks = (get().bookmarkedPostIds || []).filter(id => id !== postId);
    // Update state and storage immediately
    set({ posts: updatedPosts, bookmarkedPostIds: updatedBookmarks });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updatedPosts));
    await AsyncStorage.setItem('@mce_bookmarked_post_ids', JSON.stringify(updatedBookmarks));
    get().showToast('Post deleted successfully.', 'success');

    // Attempt to delete from Firestore
    try {
      if (!postId.startsWith('post-')) {
        await deleteDoc(doc(db, 'posts', postId));
      }
    } catch (err: any) {
      const isOwnerOrAdmin = postToDelete.authorUid === get().user?.uid || 
                             (get().user?.email && ["aman.kumar@mce.ac.in", "mceconnect.help@gmail.com"].includes(get().user.email));
      if (isOwnerOrAdmin && err?.code === 'permission-denied') {
        console.warn('Silent bypass of permission-denied for owner/admin during deletion:', err);
        return;
      }

      // Revert local deletion on failure
      const revertedPosts = [...get().posts, postToDelete];
      const revertedBookmarks = [...(get().bookmarkedPostIds || []), postId];
      set({ posts: revertedPosts, bookmarkedPostIds: revertedBookmarks });
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(revertedPosts));
      await AsyncStorage.setItem('@mce_bookmarked_post_ids', JSON.stringify(revertedBookmarks));
      console.error('Failed to delete post from Firestore:', err);
      get().showToast(getReadableErrorMessage(err), 'error');
    }
  },

  editPost: async (postId, newContent) => {
    // Optimistically update post content locally
    const currentPosts = get().posts;
    const targetIndex = currentPosts.findIndex(p => p.id === postId);
    if (targetIndex === -1) return;
    const oldPost = currentPosts[targetIndex];
    const updatedPost = { ...oldPost, content: newContent, isEdited: true, editedAt: new Date().toISOString() };
    const updatedPosts = [...currentPosts];
    updatedPosts[targetIndex] = updatedPost;
    set({ posts: updatedPosts });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updatedPosts));
    get().showToast('Post updated successfully.', 'success');

    // Sync change to Firestore
    try {
      if (!postId.startsWith('post-')) {
        await updateDoc(doc(db, 'posts', postId), {
          content: newContent,
          isEdited: true,
          editedAt: updatedPost.editedAt
        });
      }
    } catch (err: any) {
      const isOwnerOrAdmin = oldPost.authorUid === get().user?.uid || 
                             (get().user?.email && ["aman.kumar@mce.ac.in", "mceconnect.help@gmail.com"].includes(get().user.email));
      if (isOwnerOrAdmin && err?.code === 'permission-denied') {
        console.warn('Silent bypass of permission-denied for owner/admin during edit:', err);
        return;
      }

      // Revert on error
      const revertedPosts = [...get().posts];
      revertedPosts[targetIndex] = oldPost;
      set({ posts: revertedPosts });
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(revertedPosts));
      console.error('Failed to edit post in Firestore:', err);
      get().showToast(getReadableErrorMessage(err), 'error');
    }
  },

  togglePostCommentsDisabled: async (postId, disable) => {
    const currentPosts = get().posts;
    const targetIndex = currentPosts.findIndex(p => p.id === postId);
    if (targetIndex === -1) return;
    
    const oldPost = currentPosts[targetIndex];
    const updatedPost = { ...oldPost, commentsDisabled: disable };
    const updatedPosts = [...currentPosts];
    updatedPosts[targetIndex] = updatedPost;
    set({ posts: updatedPosts });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updatedPosts));
    
    get().showToast(disable ? 'Comments disabled for this post' : 'Comments enabled for this post', 'success');

    try {
      if (!postId.startsWith('post-')) {
        await updateDoc(doc(db, 'posts', postId), {
          commentsDisabled: disable
        });
      }
    } catch (err: any) {
      // Revert on error
      const revertedPosts = [...get().posts];
      revertedPosts[targetIndex] = oldPost;
      set({ posts: revertedPosts });
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(revertedPosts));
      console.error('Failed to toggle comments on Firestore:', err);
      get().showToast(getReadableErrorMessage(err), 'error');
    }
  },

  toggleSubjectBookmark: async (subjectName) => {
    const current = get().bookmarkedSubjects;
    let updated: string[];
    if (current.includes(subjectName)) {
      updated = current.filter(name => name !== subjectName);
    } else {
      updated = [...current, subjectName];
    }
    set({ bookmarkedSubjects: updated });
    await AsyncStorage.setItem('@mce_bookmarked_subjects', JSON.stringify(updated));
    get().syncVaultToFirebase().catch(() => {});
  },

  togglePostBookmark: async (postId) => {
    const current = get().bookmarkedPostIds || [];
    let updated: string[];
    if (current.includes(postId)) {
      updated = current.filter(id => id !== postId);
    } else {
      updated = [...current, postId];
    }
    set({ bookmarkedPostIds: updated });
    await AsyncStorage.setItem('@mce_bookmarked_post_ids', JSON.stringify(updated));
    get().syncVaultToFirebase().catch(() => {});
  },

  toggleMaterialBookmark: async (material) => {
    const current = get().savedMaterials || [];
    const existingIndex = current.findIndex(m => m.id === material.id);
    
    if (existingIndex >= 0) {
      // Remove it immediately
      const existingItem = current[existingIndex];
      const updated = current.filter(m => m.id !== material.id);
      set({ savedMaterials: updated });
      await AsyncStorage.setItem('@mce_saved_materials', JSON.stringify(updated));
      get().syncVaultToFirebase().catch(() => {});
      
      // Delete from filesystem in background
      if (Platform.OS !== 'web' && existingItem.localUri) {
        FileSystem.deleteAsync(existingItem.localUri, { idempotent: true }).catch(e => console.warn(e));
      }
    } else {
      // Add immediately to update UI
      const newMaterial = { ...material };
      const updated = [...current, newMaterial];
      set({ savedMaterials: updated });
      await AsyncStorage.setItem('@mce_saved_materials', JSON.stringify(updated));
      get().syncVaultToFirebase().catch(() => {});
      
      // Download in background
      if (Platform.OS !== 'web' && material.fileUrl) {
        (async () => {
          try {
            const fileName = `${material.id || Date.now()}.pdf`;
            const fileUri = `${FileSystem.documentDirectory}${fileName}`;
            const downloadRes = await FileSystem.downloadAsync(material.fileUrl, fileUri);
            
            if (downloadRes.status === 200) {
              const latestMaterials = get().savedMaterials || [];
              const targetIndex = latestMaterials.findIndex(m => m.id === material.id);
              if (targetIndex >= 0) {
                const freshUpdated = [...latestMaterials];
                freshUpdated[targetIndex] = { ...freshUpdated[targetIndex], localUri: downloadRes.uri };
                set({ savedMaterials: freshUpdated });
                await AsyncStorage.setItem('@mce_saved_materials', JSON.stringify(freshUpdated));
                get().syncVaultToFirebase().catch(() => {});
              }
              Alert.alert(
                "Saved for Offline", 
                "isko offline bhi aap dekh sakte h explore button ke notepad ke save section me",
                [{ text: "OK" }]
              );
            }
          } catch (e) {
            console.warn("Failed to download PDF for offline use:", e);
          }
        })();
      } else if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.alert) {
          window.alert("isko offline bhi aap dekh sakte h explore button ke notepad ke save section me");
        }
      }
    }
  },

  addLocalNote: async (title, content) => {
    const newNote = {
      id: `note-${Date.now()}`,
      title: title.trim() || 'Untitled Note',
      content: content.trim(),
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
    const updated = [newNote, ...get().localNotes];
    set({ localNotes: updated });
    await AsyncStorage.setItem('@mce_local_notes', JSON.stringify(updated));
    get().syncVaultToFirebase().catch(() => {});
  },

  updateLocalNote: async (id, title, content) => {
    const updated = get().localNotes.map(note => {
      if (note.id === id) {
        return {
          ...note,
          title: title.trim() || 'Untitled Note',
          content: content.trim(),
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        };
      }
      return note;
    });
    set({ localNotes: updated });
    await AsyncStorage.setItem('@mce_local_notes', JSON.stringify(updated));
    get().syncVaultToFirebase().catch(() => {});
  },

  deleteLocalNote: async (id) => {
    const updated = get().localNotes.filter(note => note.id !== id);
    set({ localNotes: updated });
    await AsyncStorage.setItem('@mce_local_notes', JSON.stringify(updated));
    get().syncVaultToFirebase().catch(() => {});
  },

  syncVaultToFirebase: async () => {
    const user = get().user;
    if (!user) return;
    try {
      const payload = {
        localNotes: get().localNotes,
        bookmarkedSubjects: get().bookmarkedSubjects,
        bookmarkedPostIds: get().bookmarkedPostIds,
        savedMaterials: get().savedMaterials || [],
        lastSynced: new Date().toISOString()
      };
      
      const encryptedData = await encryptObjectAsync(payload, user.uid);
      if (!encryptedData) throw new Error("Encryption failed");

      const vaultRef = doc(db, 'user_vaults', user.uid);
      await setDoc(vaultRef, { data: encryptedData, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn('Failed to sync vault to Firebase:', e);
    }
  },

  fetchVaultFromFirebase: async () => {
    const user = get().user;
    if (!user) return;
    try {
      const vaultRef = doc(db, 'user_vaults', user.uid);
      const vaultDoc = await getDoc(vaultRef);
      if (vaultDoc.exists() && vaultDoc.data().data) {
        const encryptedData = vaultDoc.data().data;
        const decryptedPayload = await decryptObjectAsync<any>(encryptedData, user.uid, null);
        
        if (decryptedPayload) {
          if (decryptedPayload.localNotes) {
            set({ localNotes: decryptedPayload.localNotes });
            await AsyncStorage.setItem('@mce_local_notes', JSON.stringify(decryptedPayload.localNotes));
          }
          if (decryptedPayload.bookmarkedSubjects) {
            set({ bookmarkedSubjects: decryptedPayload.bookmarkedSubjects });
            await AsyncStorage.setItem('@mce_bookmarked_subjects', JSON.stringify(decryptedPayload.bookmarkedSubjects));
          }
          if (decryptedPayload.bookmarkedPostIds) {
            set({ bookmarkedPostIds: decryptedPayload.bookmarkedPostIds });
            await AsyncStorage.setItem('@mce_bookmarked_post_ids', JSON.stringify(decryptedPayload.bookmarkedPostIds));
          }
          if (decryptedPayload.savedMaterials) {
            set({ savedMaterials: decryptedPayload.savedMaterials });
            await AsyncStorage.setItem('@mce_saved_materials', JSON.stringify(decryptedPayload.savedMaterials));
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch vault from Firebase:', e);
    }
  },

  clearVaultData: async () => {
    const user = get().user;
    
    // Clear locally first
    set({
      localNotes: [],
      bookmarkedSubjects: [],
      bookmarkedPostIds: [],
      savedMaterials: []
    });
    
    await AsyncStorage.removeItem('@mce_local_notes');
    await AsyncStorage.removeItem('@mce_bookmarked_subjects');
    await AsyncStorage.removeItem('@mce_bookmarked_post_ids');
    await AsyncStorage.removeItem('@mce_saved_materials');

    // Try to delete from Firebase if logged in
    if (user) {
      try {
        const vaultRef = doc(db, 'user_vaults', user.uid);
        await deleteDoc(vaultRef);
      } catch (e) {
        console.warn('Failed to delete vault from Firebase:', e);
      }
    }
    
    get().showToast('All saved data has been permanently cleared.', 'info');
  },

  // Notices actions
  fetchNotices: async (forceRefresh = false, loadMore = false) => {
    if (loadMore && !get().hasMoreNotices) return;
    if (loadMore && get().isNoticesLoadingMore) return;
    if (!loadMore && get().isNoticesLoading) return;

    const startTime = Date.now();
    // Soft TTL Strategy: skip background sync if not forced and lastNoticesSyncTime is fresh (< 15 min)
    const syncTime = get().lastNoticesSyncTime;
    const cacheExpired = isCacheExpired(syncTime, 15);

    if (!forceRefresh && !loadMore) {
      // 1. If we already have notices in-memory, keep them and silently update in background if expired
      if (get().notices.length > 0) {
        if (__DEV__) {
          console.log('[Telemetry] Notice Cache Source: In-Memory. Count:', get().notices.length);
        }
        if (cacheExpired) {
          get().syncNoticesQuietly(1).catch(() => {});
        }
        return;
      }

      // 2. Try loading from AsyncStorage cache first for instant UI response
      try {
        const stored = await AsyncStorage.getItem('@mce_notices_v3');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (__DEV__) {
              console.log('[Telemetry] Notice Cache Source: AsyncStorage. Count:', parsed.length);
            }
            set({ notices: parsed, isOffline: false, noticesPage: 1, hasMoreNotices: true });
            if (cacheExpired) {
              get().syncNoticesQuietly(1).catch(() => {});
            }
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to read cached notices:', e);
      }
    }

    // 3. Fallback to foreground fetch with active loading spinner
    const targetPage = loadMore ? get().noticesPage + 1 : 1;
    
    if (loadMore) {
      set({ isNoticesLoadingMore: true });
    } else {
      set({ isNoticesLoading: true });
    }

    // Safety timeout: force-reset loading after 15s so UI never gets stuck
    const safetyTimer = setTimeout(() => {
      const state = get();
      if (state.isNoticesLoading || state.isNoticesLoadingMore) {
        console.warn('[Notice Safety] Force-resetting loading state after 15s timeout');
        if (state.notices.length === 0) {
          set({ notices: FALLBACK_COLLEGE_NOTICES, isOffline: true });
        }
        set({ isNoticesLoading: false, isNoticesLoadingMore: false });
      }
    }, 15000);

    try {
      await get().syncNoticesQuietly(targetPage);
      clearTimeout(safetyTimer);
      if (__DEV__) {
        console.log(`[Telemetry] Notice fetch duration: ${Date.now() - startTime}ms (Success) page: ${targetPage}`);
      }
    } catch (err) {
      clearTimeout(safetyTimer);
      console.warn('Foreground notice sync failed:', err);
      // Ensure fallback is set even if syncNoticesQuietly recovery chain failed
      if (get().notices.length === 0) {
        set({ notices: FALLBACK_COLLEGE_NOTICES, isOffline: true });
      }
      if (__DEV__) {
        console.log(`[Telemetry] Notice fetch duration: ${Date.now() - startTime}ms (Failed, loaded offline/fallback)`);
      }
    } finally {
      clearTimeout(safetyTimer);
      if (loadMore) {
        set({ isNoticesLoadingMore: false });
      } else {
        set({ isNoticesLoading: false });
      }
    }
  },

  syncNoticesQuietly: async (page = 1) => {
    const isWeb = Platform.OS === 'web';
    
    // Custom fetch helper with abort controller for timeout handling
    const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 12000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return res;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('TIMEOUT');
        }
        throw err;
      }
    };

    // Modern Chrome/Safari mobile User-Agent to bypass Cloudflare bot security filters on Native platforms
    const browserHeaders: Record<string, string> = {
      'Accept': 'application/json, application/xml, text/xml, */*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    if (!isWeb) {
      browserHeaders['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
    }

    try {
      let parsedNotices: NoticeItem[] = [];
      let success = false;
      let hasMore = true;

      // 1. PRIMARY PATH: WordPress REST JSON API & RSS Feed Merged (For Page 1)
      let fetchJsonUrl = `https://www.mcemotihari.ac.in/wp-json/wp/v2/posts?categories=4&per_page=30&page=${page}&t=${Date.now()}`;
      // On web, CORS blocks direct fetch; try multiple free proxies as fallback
      const jsonUrlCandidates: string[] = [fetchJsonUrl];
      if (isWeb) {
        jsonUrlCandidates.push(
          `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchJsonUrl)}`,
          `https://corsproxy.vercel.app/api?url=${encodeURIComponent(fetchJsonUrl)}`
        );
      }

      if (page === 1) {
        // RSS and HTML URLs with direct + proxy fallbacks for web
        const baseRssUrl = 'https://www.mcemotihari.ac.in/category/notices/feed/';
        const baseHtmlUrl = 'https://www.mcemotihari.ac.in/category/notices/';
        const rssUrlCandidates: string[] = [`${baseRssUrl}?t=${Date.now()}`];
        const htmlUrlCandidates: string[] = [`${baseHtmlUrl}?t=${Date.now()}`];
        // Add proxy endpoints for both web and native, since ISP blocks or timeout issues can occur on native too
        jsonUrlCandidates.push(
          `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchJsonUrl)}`
        );
        rssUrlCandidates.push(
          `https://api.allorigins.win/raw?url=${encodeURIComponent(baseRssUrl + '?t=' + Date.now())}`
        );
        htmlUrlCandidates.push(
          `https://api.allorigins.win/raw?url=${encodeURIComponent(baseHtmlUrl + '?t=' + Date.now())}`
        );

        // Try each JSON URL candidate until one works
        let jsonResponse: Response | null = null;
        for (const url of jsonUrlCandidates) {
          try {
            const res = await fetchWithTimeout(url, { headers: browserHeaders }, 25000);
            if (res.ok) { jsonResponse = res; break; }
          } catch {}
        }

        // Try each RSS URL candidate
        let rssResponse: Response | null = null;
        for (const url of rssUrlCandidates) {
          try {
            const res = await fetchWithTimeout(url, { headers: browserHeaders }, 25000);
            if (res.ok) { rssResponse = res; break; }
          } catch {}
        }

        // Try each HTML URL candidate
        let htmlResponse: Response | null = null;
        for (const url of htmlUrlCandidates) {
          try {
            const res = await fetchWithTimeout(url, { headers: browserHeaders }, 25000);
            if (res.ok) { htmlResponse = res; break; }
          } catch {}
        }

        try {
          const mergeMap = new Map<string, NoticeItem>();

          if (jsonResponse && jsonResponse.ok) {
            const rawText = await jsonResponse.text();
            const posts = JSON.parse(rawText);
            if (Array.isArray(posts)) {
              const jsonNotices = parseNoticesJSON(posts);
              jsonNotices.forEach(n => mergeMap.set(n.id, n));
              success = true;
              hasMore = jsonNotices.length >= 30;
            }
          }

          if (rssResponse && rssResponse.ok) {
            const xmlText = await rssResponse.text();
            if (xmlText && (xmlText.includes('<rss') || xmlText.includes('<channel'))) {
              const rssNotices = parseNoticesRSS(xmlText);
              // Deduplicate by title to merge properly
              rssNotices.forEach(n => {
                const existingByTitle = Array.from(mergeMap.values()).find(en => en.title.trim().toLowerCase() === n.title.trim().toLowerCase());
                if (existingByTitle) {
                  // Merge missing URLs
                  if (!existingByTitle.pdfUrl && n.pdfUrl) existingByTitle.pdfUrl = n.pdfUrl;
                  if (!existingByTitle.attachmentUrl && n.attachmentUrl) existingByTitle.attachmentUrl = n.attachmentUrl;
                } else {
                  mergeMap.set(n.id, n);
                }
              });
              success = true;
            }
          }

          if (!success && htmlResponse && htmlResponse.ok) {
            try {
              const htmlText = await htmlResponse.text();
              // Only match URLs that follow the WP standard post structure with dates (e.g. /2026/05/18/notice-slug/) to avoid Privacy Policy, About Us, etc.
              const anchorRegex = /<a\s+[^>]*href=["'](https?:\/\/www\.mcemotihari\.ac\.in\/\d{4}\/\d{2}\/\d{2}\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
              let htmlMatch;
              const scrapedNotices: NoticeItem[] = [];
              const { parseNoticesRSS: _, parseNoticesJSON: __, parseBEUNotices: ___, cleanHtml, formatDate, mapCategory } = require('../utils/rssParser');

              while ((htmlMatch = anchorRegex.exec(htmlText)) !== null) {
                const postUrl = htmlMatch[1];
                const anchorText = cleanHtml(htmlMatch[2]).trim();

                if (
                  anchorText.length > 10 && 
                  !postUrl.includes('/category/') && 
                  !postUrl.includes('/feed/') && 
                  !postUrl.includes('/wp-content/') &&
                  !postUrl.includes('/wp-includes/')
                ) {
                  const today = new Date();
                  const rawDate = today.toISOString();
                  const pubDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                  scrapedNotices.push({
                    id: `scraped-${postUrl.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12)}`,
                    title: anchorText,
                    link: postUrl,
                    pubDate,
                    rawDate,
                    snippet: 'Tap to view full notice details directly from the official college portal.',
                    category: mapCategory(anchorText, []),
                    isImportant: anchorText.toLowerCase().includes('important') || anchorText.toLowerCase().includes('urgent'),
                    isPinned: false,
                    isNew: true,
                  });
                }
              }

              scrapedNotices.forEach(n => {
                const existingByTitle = Array.from(mergeMap.values()).find(en => en.title.trim().toLowerCase() === n.title.trim().toLowerCase());
                if (!existingByTitle) {
                  mergeMap.set(n.id, n);
                }
              });
              success = true;
            } catch (htmlErr) {
              console.warn('HTML scraping parse failed:', htmlErr);
            }
          }

          if (success) {
            parsedNotices = Array.from(mergeMap.values());
            // Sort merged array by rawDate descending (latest first)
            parsedNotices.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
          }
        } catch (err) {
          console.warn('Combined fetch failed:', err);
        }
      } else {
        // Page > 1 only uses JSON API
        for (const url of jsonUrlCandidates) {
          try {
            const response = await fetchWithTimeout(url, { headers: browserHeaders }, 12000);
            if (response.ok) {
              const rawText = await response.text();
              const posts = JSON.parse(rawText);
              if (Array.isArray(posts)) {
                parsedNotices = parseNoticesJSON(posts);
                success = true;
                hasMore = parsedNotices.length >= 30;
                break;
              }
            }
          } catch {}
        }
        if (!success) {
          console.warn('Pagination fetch failed (all proxies)');
        }
      }

      if (success) {
        const now = Date.now();
        const currentNotices = page > 1 ? get().notices : [];
        
        // Append and deduplicate
        const mergedNotices = [...currentNotices];
        for (const newNotice of parsedNotices) {
          if (!mergedNotices.some(n => n.id === newNotice.id || n.title === newNotice.title)) {
            mergedNotices.push(newNotice);
          }
        }

        set({ 

          notices: mergedNotices, 
          noticesPage: page,
          hasMoreNotices: hasMore,
          isOffline: false,
          lastNoticesSyncTime: page === 1 ? now : get().lastNoticesSyncTime
        });
        
        // Cache only page 1 for offline resilience
        if (page === 1) {
          await AsyncStorage.setItem('@mce_notices_v3', JSON.stringify(mergedNotices));
          await AsyncStorage.setItem('@mce_notices_sync_time', String(now));
        }
      } else {
        if (page === 1) {
          throw new Error('No notices were successfully parsed from any online endpoint');
        } else {
          set({ hasMoreNotices: false });
        }
      }
    } catch (error: any) {
      if (__DEV__) {
        if (error.message === 'TIMEOUT') {
          console.warn('[Telemetry] Telemetry warning: Fetch timeout encountered while syncNoticesQuietly.');
        } else if (isWeb && (error instanceof TypeError || String(error).includes('Failed to fetch'))) {
          console.warn('[Telemetry] Telemetry warning: CORS failure encountered during syncNoticesQuietly.');
        }
        console.warn('Failed to sync live notices quietly, starting recovery chain:', error);
      }
      
      // Recovery Chain Order: 1. In-memory state -> 2. AsyncStorage cache -> 3. Static fallback notices
      if (get().notices.length > 0) {
        const sanitizedMem = get().notices.filter(n => 
          n.title && !n.title.toLowerCase().includes('privacy policy') && 
          !n.title.toLowerCase().includes('about us') &&
          !n.title.toLowerCase().includes('contact')
        );
        if (__DEV__) {
          console.log('[Telemetry] Notice Cache Source: In-Memory (Recovery Fallback). Count:', sanitizedMem.length);
        }
        set({ notices: sanitizedMem.length > 0 ? sanitizedMem : FALLBACK_COLLEGE_NOTICES, isOffline: true });
      } else {
        try {
          const storedNotices = await AsyncStorage.getItem('@mce_notices_v3');
          if (storedNotices) {
            const parsed = JSON.parse(storedNotices);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const sanitized = parsed.filter(n => 
                n.title && !n.title.toLowerCase().includes('privacy policy') && 
                !n.title.toLowerCase().includes('about us') &&
                !n.title.toLowerCase().includes('contact')
              );
              if (__DEV__) {
                console.log('[Telemetry] Notice Cache Source: AsyncStorage (Recovery Fallback). Count:', sanitized.length);
              }
              if (sanitized.length > 0) {
                set({ notices: sanitized, isOffline: true });
                AsyncStorage.setItem('@mce_notices_v3', JSON.stringify(sanitized)).catch(console.warn);
              } else {
                set({ notices: FALLBACK_COLLEGE_NOTICES, isOffline: true });
              }
            } else {
              if (__DEV__) {
                console.warn('[Telemetry] Telemetry warning: Empty parsed cache recovery triggered (College Notices).');
                console.log('[Telemetry] Notice Cache Source: Fallback / Static (Recovery Fallback). Count:', FALLBACK_COLLEGE_NOTICES.length);
              }
              set({ notices: FALLBACK_COLLEGE_NOTICES, isOffline: true });
            }
          } else {
            if (__DEV__) {
              console.warn('[Telemetry] Telemetry warning: Empty parsed cache recovery triggered (College Notices - No Cache).');
              console.log('[Telemetry] Notice Cache Source: Fallback / Static (Recovery Fallback - No Cache). Count:', FALLBACK_COLLEGE_NOTICES.length);
            }
            set({ notices: FALLBACK_COLLEGE_NOTICES, isOffline: true });
          }
        } catch (cacheErr) {
          if (__DEV__) {
            console.warn('[Telemetry] Telemetry warning: Cache retrieval failure, falling back to static notices.', cacheErr);
          }
          set({ notices: FALLBACK_COLLEGE_NOTICES, isOffline: true });
        }
      }
      throw error;
    }
  },

  addNetworkSearchHistory: async (term: string) => {
    if (!term.trim()) return;
    const current = get().networkSearchHistory;
    // Remove if exists to push to front
    const filtered = current.filter(t => t.toLowerCase() !== term.trim().toLowerCase());
    const updated = [term.trim(), ...filtered].slice(0, 5); // Keep last 5 searches
    set({ networkSearchHistory: updated });
    await AsyncStorage.setItem('@mce_network_search_history', JSON.stringify(updated));
  },

  clearNetworkSearchHistory: async () => {
    try {
      await AsyncStorage.removeItem('@mce_network_search_history');
      set({ networkSearchHistory: [] });
    } catch (e) {
      console.warn('Failed to clear search history', e);
    }
  },

  // --- Zero-Cost Unread Counters (Watermark Pattern) ---
  listenToRoomStats: () => {
    const unsub = onSnapshot(doc(db, 'globals', 'roomStats'), (snap) => {
      if (snap.exists()) {
        set({ roomStats: snap.data() as Record<string, number> });
      } else {
        // Create the document if it doesn't exist
        setDoc(doc(db, 'globals', 'roomStats'), {}).catch(console.warn);
      }
    }, (err) => {
      console.warn("Failed to listen to room stats:", err);
    });
  },

  markRoomAsRead: async (roomId: string) => {
    const currentStats = get().roomStats;
    const currentReadStates = get().readStates;
    
    // Only update if there is a newer message
    const roomCount = currentStats[roomId] || 0;
    if ((currentReadStates[roomId] || 0) !== roomCount) {
      const newReadStates = {
        ...currentReadStates,
        [roomId]: roomCount
      };
      
      set({ readStates: newReadStates });
      // Persist locally for Zero-Cost cross-session tracking
      try {
        await AsyncStorage.setItem('@mce_readStates', JSON.stringify(newReadStates));
      } catch (e) {
        console.warn("Failed to save read states locally:", e);
      }
    }
  },

  togglePinNotice: async (id: string) => {
    const currentPinned = get().pinnedNoticeIds;
    let updatedPinned: string[];
    if (currentPinned.includes(id)) {
      updatedPinned = currentPinned.filter(pinnedId => pinnedId !== id);
    } else {
      updatedPinned = [...currentPinned, id];
    }
    set({ pinnedNoticeIds: updatedPinned });
    await AsyncStorage.setItem('@mce_pinned_notice_ids', JSON.stringify(updatedPinned));
  },

  fetchUniversityNotices: async (forceRefresh = false) => {
    const startTime = Date.now();
    // Soft TTL Strategy: skip background sync if not forced and lastUniversityNoticesSyncTime is fresh (< 15 min)
    const syncTime = get().lastUniversityNoticesSyncTime;
    const cacheExpired = isCacheExpired(syncTime, 15);

    if (!forceRefresh) {
      if (get().universityNotices.length > 0) {
        if (__DEV__) {
          console.log('[Telemetry] BEU Notice Cache Source: In-Memory. Count:', get().universityNotices.length);
        }
        if (cacheExpired) {
          get().syncUniversityNoticesQuietly().catch(() => {});
        }
        return;
      }

      try {
        const stored = await AsyncStorage.getItem('@mce_university_notices_v3');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (__DEV__) {
              console.log('[Telemetry] BEU Notice Cache Source: AsyncStorage. Count:', parsed.length);
            }
            set({ universityNotices: parsed });
            if (cacheExpired) {
              get().syncUniversityNoticesQuietly().catch(() => {});
            }
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to read cached university notices:', e);
      }
    }

    set({ isUniversityLoading: true });
    try {
      await get().syncUniversityNoticesQuietly();
      if (__DEV__) {
        console.log(`[Telemetry] BEU Notice fetch duration: ${Date.now() - startTime}ms (Success)`);
      }
    } catch (err) {
      console.warn('Foreground university notice sync failed:', err);
      if (__DEV__) {
        console.log(`[Telemetry] BEU Notice fetch duration: ${Date.now() - startTime}ms (Failed, loaded offline/fallback)`);
      }
    } finally {
      set({ isUniversityLoading: false });
    }
  },

  syncUniversityNoticesQuietly: async () => {
    const isWeb = Platform.OS === 'web';
    
    const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 8000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return res;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('TIMEOUT');
        }
        throw err;
      }
    };

    // Custom browser User-Agent to bypass Cloudflare security filters on Native platforms
    const browserHeaders: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    if (!isWeb) {
      browserHeaders['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
    }

    try {
      let fetchUrl = `https://beu-bih.ac.in/backend/v1/notice/get-notice-board?t=${Date.now()}`;
      if (isWeb) {
        fetchUrl = `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`;
      }

      let response;
      try {
        response = await fetchWithTimeout(fetchUrl, { headers: browserHeaders }, 8000);
      } catch (fetchErr: any) {
        if (__DEV__) {
          if (fetchErr.message === 'TIMEOUT') {
            console.warn('[Telemetry] Telemetry warning: Fetch timeout encountered while fetching BEU notices.');
          } else if (isWeb && (fetchErr instanceof TypeError || String(fetchErr).includes('Failed to fetch'))) {
            console.warn('[Telemetry] Telemetry warning: CORS failure encountered during BEU web fetch.');
          }
        }
        throw fetchErr;
      }

      if (!response.ok) {
        throw new Error(`University Notices API HTTP status not OK: ${response.status}`);
      }

      const rawText = await response.text();
      const items = JSON.parse(rawText);
      
      if (Array.isArray(items) && items.length > 0) {
        const parsedBEU = parseBEUNotices(items);
        const now = Date.now();
        set({ 
          universityNotices: parsedBEU,
          isOffline: false,
          lastUniversityNoticesSyncTime: now
        });
        await AsyncStorage.setItem('@mce_university_notices_v3', JSON.stringify(parsedBEU));
        await AsyncStorage.setItem('@mce_university_notices_sync_time', String(now));
      } else {
        throw new Error('No university notices found or empty response');
      }
    } catch (error: any) {
      if (__DEV__) {
        if (error.message === 'TIMEOUT') {
          console.warn('[Telemetry] Telemetry warning: Fetch timeout encountered while syncUniversityNoticesQuietly.');
        } else if (isWeb && (error instanceof TypeError || String(error).includes('Failed to fetch'))) {
          console.warn('[Telemetry] Telemetry warning: CORS failure encountered during syncUniversityNoticesQuietly.');
        }
        console.warn('Failed to sync BEU university notices quietly, starting recovery chain:', error);
      }
      
      // Recovery Chain Order: 1. In-memory state -> 2. AsyncStorage cache -> 3. Static fallback notices
      if (get().universityNotices.length > 0) {
        if (__DEV__) {
          console.log('[Telemetry] BEU Notice Cache Source: In-Memory (Recovery Fallback). Count:', get().universityNotices.length);
        }
        set({ isOffline: true });
      } else {
        try {
          const stored = await AsyncStorage.getItem('@mce_university_notices_v3');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (__DEV__) {
                console.log('[Telemetry] BEU Notice Cache Source: AsyncStorage (Recovery Fallback). Count:', parsed.length);
              }
              set({ universityNotices: parsed, isOffline: true });
            } else {
              if (__DEV__) {
                console.warn('[Telemetry] Telemetry warning: Empty parsed cache recovery triggered (University Notices).');
                console.log('[Telemetry] BEU Notice Cache Source: Fallback / Static (Recovery Fallback). Count:', FALLBACK_UNIVERSITY_NOTICES.length);
              }
              set({ universityNotices: FALLBACK_UNIVERSITY_NOTICES, isOffline: true });
            }
          } else {
            if (__DEV__) {
              console.warn('[Telemetry] Telemetry warning: Empty parsed cache recovery triggered (University Notices - No Cache).');
              console.log('[Telemetry] BEU Notice Cache Source: Fallback / Static (Recovery Fallback - No Cache). Count:', FALLBACK_UNIVERSITY_NOTICES.length);
            }
            set({ universityNotices: FALLBACK_UNIVERSITY_NOTICES, isOffline: true });
          }
        } catch (cacheErr) {
          if (__DEV__) {
            console.warn('[Telemetry] Telemetry warning: Cache retrieval failure, falling back to static notices.', cacheErr);
          }
          set({ universityNotices: FALLBACK_UNIVERSITY_NOTICES, isOffline: true });
        }
      }
      throw error;
    }
  },

  setThemePreference: async (pref) => {
    set({ themePreference: pref });
    await AsyncStorage.setItem('@mce_theme_preference', pref);
  },
  setPushNoticesEnabled: async (enabled) => {
    set({ pushNoticesEnabled: enabled });
    await AsyncStorage.setItem('@mce_push_notices', String(enabled));
  },
  setPushClapsEnabled: async (enabled) => {
    set({ pushClapsEnabled: enabled });
    await AsyncStorage.setItem('@mce_push_claps', String(enabled));
  },
  setDataSaverEnabled: async (enabled) => {
    set({ dataSaverEnabled: enabled });
    await AsyncStorage.setItem('@mce_data_saver', String(enabled));
  },
  clearAppCache: async () => {
    // Clear major caches
    await AsyncStorage.removeItem('@mce_notices_v3');
    await AsyncStorage.removeItem('@mce_university_notices_v3');
    await AsyncStorage.removeItem('@mce_posts');
    await AsyncStorage.removeItem('@mce_posts_sync_time');
    await AsyncStorage.removeItem('@mce_notices_sync_time');
    await AsyncStorage.removeItem('@mce_university_notices_sync_time');
    await AsyncStorage.removeItem('@mce_seen_post_ids');
    set({ notices: [], universityNotices: [], posts: [], lastPostsSyncTime: 0, lastNoticesSyncTime: 0, lastUniversityNoticesSyncTime: 0, seenPostIds: [] });
  },

  fetchPosts: async (options?: { refresh?: boolean; loadMore?: boolean; quiet?: boolean }) => {
    const { refresh = false, loadMore = false, quiet = false } = options || {};
    const limitCount = 30; // Fetch more posts for smart feed diversity
    
    // Throttling silent updates: if not forced, and lastPostsSyncTime is fresh (e.g. < 5 minutes), do not trigger
    const now = Date.now();
    const lastSync = get().lastPostsSyncTime || 0;
    if (quiet && !refresh && !loadMore && !isCacheExpired(lastSync, 5)) {
      if (__DEV__) {
        console.log('[Perf Logger] Posts cache is fresh. Skipping background sync.');
      }
      return;
    }

    if (get().isPostsLoading || (refresh && get().isPostsRefreshing) || (global as any).__mce_posts_fetching) {
      if (__DEV__) {
        console.log('[Perf Logger] fetchPosts is already running. Deduplicating.');
      }
      return; // Deduplication
    }
    (global as any).__mce_posts_fetching = true;

    if (loadMore && !get().hasMorePosts) {
      return; // Stop pagination
    }

    const startTime = Date.now();
    if (__DEV__) { console.time('[Sync] 1. Total FetchPosts'); }

    if (refresh) {
      set({ isPostsRefreshing: true });
    } else if (!quiet) {
      set({ isPostsLoading: true });
    }

    try {
      if (__DEV__) { console.time('[Sync] 2. Firestore Posts Query'); }
      const postsRef = collection(db, 'posts');
      let postsQuery;

      // Smart feed: fetch last 7 days of posts for better diversity
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

      if (loadMore && get().lastVisiblePostDoc) {
        // Pagination: continue from where we left off (no date filter on load more)
        postsQuery = query(
          postsRef,
          orderBy('createdAt', 'desc'),
          startAfter(get().lastVisiblePostDoc),
          limit(limitCount)
        );
      } else {
        // Smart feed: try 7-day window first for diversity
        postsQuery = query(
          postsRef,
          where('createdAt', '>=', sevenDaysAgo),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      let querySnapshot = await getDocs(postsQuery);
      let docs = querySnapshot.docs;

      // Fallback: if 7-day window has very few posts (< 5), load without date filter to ensure feed has content
      if (!loadMore && docs.length < 5) {
        const fallbackQuery = query(
          postsRef,
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        docs = fallbackSnapshot.docs;
      }

      const lastDoc = docs[docs.length - 1] || null;
      if (__DEV__) { console.timeEnd('[Sync] 2. Firestore Posts Query'); }

      if (__DEV__) { console.time('[Sync] 3. Data Extraction'); }
      const currentUser = get().user;
      const firebasePosts: Post[] = [];
      docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (currentUser && data.authorUid === currentUser.uid) {
          data.authorName = currentUser.name;
          data.authorRole = currentUser.adminRole ? 'Admin' : currentUser.role;
          if (currentUser.photoUrl) data.authorPhoto = currentUser.photoUrl;
        }
        if (!data.content && data.text) {
          data.content = data.text;
        } else if (!data.content) {
          data.content = '';
        }
        firebasePosts.push({ id: docSnap.id, ...data } as Post);
      });
      if (__DEV__) { console.timeEnd('[Sync] 3. Data Extraction'); }

      const userUid = get().user?.uid;
      const userVotesMap: Record<string, string> = {};

      if (__DEV__) { console.time('[Sync] 4. Poll Votes Fetch'); }
      if (userUid && firebasePosts.length > 0) {
        try {
          const docIds: string[] = [];
          firebasePosts.forEach(p => {
            if (p.pollOptions && p.pollOptions.length > 0) {
              docIds.push(`${p.id}_${userUid}`);
              if (p.allowMultipleVotes) {
                p.pollOptions.forEach(opt => {
                  docIds.push(`${p.id}_${userUid}_${opt.id}`);
                });
              }
            }
          });

          if (docIds.length > 0) {
            // chunk docIds into sizes of 30 to comply with Firestore 'in' limit
            const chunks: string[][] = [];
            for (let i = 0; i < docIds.length; i += 30) {
              chunks.push(docIds.slice(i, i + 30));
            }
            
            for (const chunk of chunks) {
              const votesQuery = query(
                collection(db, 'pollVotes'),
                where(documentId(), 'in', chunk)
              );
              const votesSnap = await getDocs(votesQuery);
              votesSnap.forEach(docSnap => {
                const data = docSnap.data();
                userVotesMap[data.postId] = data.selectedOption;
              });
            }
          }
        } catch (err) {
          console.warn('Failed to fetch user votes', err);
        }
      }
      if (__DEV__) { console.timeEnd('[Sync] 4. Poll Votes Fetch'); }

      if (__DEV__) { console.time('[Sync] 5. Hearted IDs Fetch'); }
      const storedHeartedIds = await AsyncStorage.getItem('@mce_hearted_post_ids');
      const heartedIds: string[] = storedHeartedIds ? JSON.parse(storedHeartedIds) : [];
      const reportedIds = get().reportedPostIds || [];
      if (__DEV__) { console.timeEnd('[Sync] 5. Hearted IDs Fetch'); }

      if (__DEV__) { console.time('[Sync] 6. Filtering and Mapping'); }
      const filteredFirebasePosts = firebasePosts.filter(p => (p.isHidden !== true || p.authorUid === userUid) && !reportedIds.includes(p.id));
      const mappedPosts = filteredFirebasePosts.map(p => {
        let heartedBy = p.heartedBy || [];
        if (!p.heartedBy) {
          if (userUid && (p.claps > 0 || heartedIds.includes(p.id))) {
            heartedBy = [userUid];
          }
        }
        const isClapped = userUid ? heartedBy.includes(userUid) : heartedIds.includes(p.id);
        const claps = heartedBy.length;
        
        let userVotedOptionId = p.userVotedOptionId;
        let userVotedOptionIds = p.userVotedOptionIds || [];
        if (userVotesMap[p.id]) {
           userVotedOptionId = userVotesMap[p.id];
           userVotedOptionIds = [userVotesMap[p.id]];
        }
        
        // Preserve comment count – fallback to existing store value or array length if missing/zero
        let commentsCount = p.commentsCount;
        if (commentsCount == null || commentsCount === 0) {
          const existing = get().posts.find(pp => pp.id === p.id);
          const fallback = existing?.commentsCount ?? 0;
          commentsCount = Math.max(commentsCount || 0, fallback, p.comments?.length || 0);
        }
        
        return {
          ...p,
          heartedBy,
          isClapped,
          claps,
          userVotedOptionId,
          userVotedOptionIds,
          commentsCount
        };
      });
      if (__DEV__) { console.timeEnd('[Sync] 6. Filtering and Mapping'); }

      if (__DEV__) { console.time('[Sync] 7. Pagination Merging'); }
      let updatedPosts: Post[] = [];
      if (loadMore) {
        // Pagination: append new page, filtering out duplicates
        const currentPosts = get().posts;
        const existingIds = new Set(currentPosts.map(p => p.id));
        const filteredNew = mappedPosts.filter(p => !existingIds.has(p.id));
        
        // Memory Safety: Trim old offscreen batches if posts count > 100
        // Keeping post array size within 100 elements prevents RAM spikes and keeps rendering fast on 3GB RAM devices!
        let merged = [...currentPosts, ...filteredNew];
        if (merged.length > 100) {
          merged = merged.slice(-100); // Keep the most recent 100 posts
        }
        updatedPosts = merged;
      } else {
        // Overwrite or refresh first page
        updatedPosts = mappedPosts;
      }

      const hasMore = docs.length === limitCount;
      if (__DEV__) { console.timeEnd('[Sync] 7. Pagination Merging'); }

      if (__DEV__) { console.time('[Sync] 8. Sort Posts Priority'); }
      const sortedFetchedPosts = sortPostsPriority(updatedPosts, get().connections);
      if (__DEV__) { console.timeEnd('[Sync] 8. Sort Posts Priority'); }

      if (__DEV__) { console.time('[Sync] 9. Zustand State Update'); }

      set({
        posts: sortedFetchedPosts,
        lastVisiblePostDoc: lastDoc,
        hasMorePosts: hasMore,
        lastPostsSyncTime: now,
        isOffline: false
      });
      if (__DEV__) { console.timeEnd('[Sync] 9. Zustand State Update'); }

      if (__DEV__) { console.time('[Sync] 10. AsyncStorage Storage (Deferred)'); }
      InteractionManager.runAfterInteractions(() => {
        setTimeout(async () => {
          try {
            const json = JSON.stringify(sortedFetchedPosts);
            await AsyncStorage.setItem('@mce_posts', json);
            await AsyncStorage.setItem('@mce_posts_sync_time', String(now));
            if (__DEV__) { console.timeEnd('[Sync] 10. AsyncStorage Storage (Deferred)'); }
          } catch (e) {
            console.error('AsyncStorage post save failed:', e);
          }
        }, 100);
      });

      // Telemetry Instrument
      if (__DEV__) {
        const loadDuration = Date.now() - startTime;
        console.log(`[Perf Logger] Posts Sync Complete!
- Duration: ${loadDuration}ms
- Count: ${mappedPosts.length}
- Total Posts In State: ${updatedPosts.length}
- Mode: ${loadMore ? 'Load More' : refresh ? 'Pull-to-Refresh' : quiet ? 'Background Sync' : 'First Load'}
- Cache Hit Rate: ${quiet ? '100% (Background Sync Done)' : '0% (Online Fetch)'}`);
      }
      
      if (__DEV__) { console.timeEnd('[Sync] 1. Total FetchPosts'); }

    } catch (err: any) {
      console.warn('Failed to fetch posts from Firestore:', err);
      const failedCount = (get().failedFetchCount || 0) + 1;
      set({ failedFetchCount: failedCount });

      if (__DEV__) {
        console.log(`[Perf Logger] Posts Fetch Failed!
- Error: ${err.message}
- Total failures: ${failedCount}`);
      }

      // If online sync fails, load from AsyncStorage cache to ensure we never have empty UI
      if (!loadMore) {
        const stored = await AsyncStorage.getItem('@mce_posts');
        if (stored) {
          const cached = JSON.parse(stored);
          set({ posts: cached, isOffline: true });
        }
      }
    } finally {
      (global as any).__mce_posts_fetching = false;
      set({
        isPostsLoading: false,
        isPostsRefreshing: false
      });
    }
  }
}));
