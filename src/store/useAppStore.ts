import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, orderBy, limit, setDoc, startAfter } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Platform } from 'react-native';
import { NoticeItem, parseNoticesRSS, parseNoticesJSON, parseBEUNotices } from '../utils/rssParser';
import { getReadableErrorMessage } from '@/utils/errors/errorManager';

const FALLBACK_NOTICES: NoticeItem[] = [];

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
};


export interface Comment {
  id: string;
  userName: string;
  userRole: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest';
  userPhoto?: string;
  text: string;
  timestamp: string;
  userId?: string;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Post {
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

export const sortPostsPriority = (allPosts: Post[], connectionsList: ContactConnection[]): Post[] => {
  const safePosts = Array.isArray(allPosts) ? allPosts : [];
  const safeConns = Array.isArray(connectionsList) ? connectionsList : [];

  const connectedNames = new Set(
    safeConns
      .filter(c => c && c.status === 'Connected')
      .map(c => c.name)
  );

  return [...safePosts].sort((a, b) => {
    if (!a || !b) return 0;
    const aIsConn = connectedNames.has(a.authorName) || (a.authorRealName && connectedNames.has(a.authorRealName));
    const bIsConn = connectedNames.has(b.authorName) || (b.authorRealName && connectedNames.has(b.authorRealName));

    if (aIsConn && !bIsConn) return -1;
    if (!aIsConn && bIsConn) return 1;

    // Both are connections or both are not connections: sort by timestamp
    const aTime = new Date(a.createdAt || a.timestamp || 0).getTime();
    const bTime = new Date(b.createdAt || b.timestamp || 0).getTime();
    return bTime - aTime;
  });
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
  blockedUserUids: string[];
  blockUser: (targetUid: string) => Promise<void>;
  unblockUser: (targetUid: string) => Promise<void>;
  localNotes: Array<{ id: string; title: string; content: string; date: string }>;
  commentSpamWarning: string | null;
  triggerCommentSpamWarning: (message: string) => void;

  // Live Notices System
  notices: NoticeItem[];
  isNoticesLoading: boolean;
  isOffline: boolean;
  pinnedNoticeIds: string[];

  // University Notices System
  universityNotices: NoticeItem[];
  isUniversityLoading: boolean;

  // Explore navigation persistence
  exploreActiveView: 'hub' | 'departments' | 'faculty-list' | 'profile-webview' | 'syllabus' | 'hostels' | 'notices';
  exploreSelectedDeptId: string | null;
  isExploreMenuVisible: boolean;
  shouldOpenLoginSettings: boolean;
  setShouldOpenLoginSettings: (open: boolean) => void;
  setExploreActiveView: (view: 'hub' | 'departments' | 'faculty-list' | 'profile-webview' | 'syllabus' | 'hostels' | 'notices') => void;
  setExploreSelectedDeptId: (deptId: string | null) => void;
  setExploreMenuVisible: (visible: boolean) => void;

  // Notices actions
  fetchNotices: (forceRefresh?: boolean) => Promise<void>;
  syncNoticesQuietly: () => Promise<void>;
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
  addComment: (postId: string, userName: string, userRole: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest', text: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  editComment: (postId: string, commentId: string, newText: string) => Promise<void>;
  createPost: (postData: {
    authorName: string;
    authorRole: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest';
    category: Post['category'];
    title: string;
    content: string;
    imageUrl?: string;
    linkUrl?: string;
    isAnonymous?: boolean;
    pollOptions?: string[];
    allowMultipleVotes?: boolean;
  }) => Promise<void>;
  submitVote: (postId: string, optionId: string) => Promise<void>;

  // Connection actions
  toggleConnection: (contactId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  editPost: (postId: string, newContent: string) => Promise<void>;

  // Local Notes & Bookmarks actions
  toggleSubjectBookmark: (subjectName: string) => Promise<void>;
  togglePostBookmark: (postId: string) => Promise<void>;
  addLocalNote: (title: string, content: string) => Promise<void>;
  updateLocalNote: (id: string, title: string, content: string) => Promise<void>;
  deleteLocalNote: (id: string) => Promise<void>;

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
}

const INITIAL_POSTS: Post[] = [];

const INITIAL_CONNECTIONS: ContactConnection[] = [];

// Module-level dictionary for debouncing Firestore clap syncs
const clapSyncTimers: Record<string, any> = {};

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
    isImportant: false,
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
  blockedUserUids: [],
  localNotes: [],
  commentSpamWarning: null,

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
  isNoticesLoading: false,
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
    try {
      // 1. Load User Session
      const storedUser = await AsyncStorage.getItem('@mce_user');
      if (storedUser) {
        try {
          set({ user: JSON.parse(storedUser) });
        } catch {
          await AsyncStorage.removeItem('@mce_user');
        }
      }

      // 2. Cache-First Posts Load (Resolves immediately for Zero White Flash Guarantee)
      const storedHeartedIds = await AsyncStorage.getItem('@mce_hearted_post_ids');
      const heartedIds = parseJsonArray<string>(storedHeartedIds);
      const storedPosts = await AsyncStorage.getItem('@mce_posts');
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
      const storedPostsSyncTime = await AsyncStorage.getItem('@mce_posts_sync_time');
      if (storedPostsSyncTime) {
        set({ lastPostsSyncTime: Number(storedPostsSyncTime) });
      }

      // 3. Load Connections state
      const storedConnections = await AsyncStorage.getItem('@mce_connections');
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
      const storedBookmarks = await AsyncStorage.getItem('@mce_bookmarked_subjects');
      if (storedBookmarks) {
        set({ bookmarkedSubjects: parseJsonArray<string>(storedBookmarks) });
      }

      // 4.5 Load Bookmarked posts
      const storedBookmarkedPosts = await AsyncStorage.getItem('@mce_bookmarked_post_ids');
      if (storedBookmarkedPosts) {
        set({ bookmarkedPostIds: parseJsonArray<string>(storedBookmarkedPosts) });
      }

      // 4.6 Load Hearted/Liked posts
      const storedHearted = await AsyncStorage.getItem('@mce_hearted_post_ids');
      if (storedHearted) {
        set({ heartedPostIds: parseJsonArray<string>(storedHearted) });
      }

      // 5. Load Local Notes
      const storedNotes = await AsyncStorage.getItem('@mce_local_notes');
      if (storedNotes) {
        set({ localNotes: parseJsonArray<any>(storedNotes) });
      }

      // 6. Load Live Notices from Cache
      const storedNotices = await AsyncStorage.getItem('@mce_notices_v2');
      if (storedNotices) {
        const parsed = parseJsonArray<NoticeItem>(storedNotices);
        if (parsed.length > 0) {
          set({ notices: parsed });
        } else {
          set({ notices: FALLBACK_COLLEGE_NOTICES });
        }
      } else {
        set({ notices: FALLBACK_COLLEGE_NOTICES });
        await AsyncStorage.setItem('@mce_notices_v2', JSON.stringify([]));
      }

      const storedNoticesSyncTime = await AsyncStorage.getItem('@mce_notices_sync_time');
      if (storedNoticesSyncTime) {
        set({ lastNoticesSyncTime: Number(storedNoticesSyncTime) });
      }

      // 6.5 Load Live University Notices from Cache
      const storedUniNotices = await AsyncStorage.getItem('@mce_university_notices_v2');
      if (storedUniNotices) {
        const parsed = parseJsonArray<NoticeItem>(storedUniNotices);
        if (parsed.length > 0) {
          set({ universityNotices: parsed });
        } else {
          set({ universityNotices: FALLBACK_UNIVERSITY_NOTICES });
        }
      } else {
        set({ universityNotices: FALLBACK_UNIVERSITY_NOTICES });
        await AsyncStorage.setItem('@mce_university_notices_v2', JSON.stringify([]));
      }

      const storedUniNoticesSyncTime = await AsyncStorage.getItem('@mce_university_notices_sync_time');
      if (storedUniNoticesSyncTime) {
        set({ lastUniversityNoticesSyncTime: Number(storedUniNoticesSyncTime) });
      }

      // 7. Load Pinned Notice IDs
      const storedPinnedIds = await AsyncStorage.getItem('@mce_pinned_notice_ids');
      if (storedPinnedIds) {
        set({ pinnedNoticeIds: parseJsonArray<string>(storedPinnedIds) });
      }

      // 7.5 Load Blocked User UIDs
      const storedBlocked = await AsyncStorage.getItem('@mce_blocked_user_uids');
      if (storedBlocked) {
        set({ blockedUserUids: parseJsonArray<string>(storedBlocked) });
      }

      // 8. Load Explore View persistence
      const storedActiveView = await AsyncStorage.getItem('@mce_explore_active_view');
      if (storedActiveView) {
        set({ exploreActiveView: storedActiveView as any });
      }
      const storedDeptId = await AsyncStorage.getItem('@mce_explore_dept_id');
      if (storedDeptId) {
        set({ exploreSelectedDeptId: storedDeptId });
      }

      // 9. Load Theme & Settings
      const storedTheme = await AsyncStorage.getItem('@mce_theme_preference');
      if (storedTheme) {
        set({ themePreference: storedTheme as any });
      }
      const storedPushNotices = await AsyncStorage.getItem('@mce_push_notices');
      if (storedPushNotices) {
        set({ pushNoticesEnabled: storedPushNotices === 'true' });
      }
      const storedPushClaps = await AsyncStorage.getItem('@mce_push_claps');
      if (storedPushClaps) {
        set({ pushClapsEnabled: storedPushClaps === 'true' });
      }
      const storedDataSaver = await AsyncStorage.getItem('@mce_data_saver');
      if (storedDataSaver) {
        set({ dataSaverEnabled: storedDataSaver === 'true' });
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
      set({ isStoreHydrated: true });
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
      const { collection, getDocs } = require('firebase/firestore');
      const { db } = require('../config/firebase');
      
      const connQuery = collection(db, 'users', currentUser.uid, 'connections');
      const snapshot = await getDocs(connQuery);
      
      const dbConnections: ContactConnection[] = [];
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        if (data && data.status) {
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
      });

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

      clapSyncTimers[postId] = setTimeout(async () => {
        try {
          const currentPosts = get().posts;
          const targetPost = currentPosts.find(p => p.id === postId);
          if (targetPost) {
            const heartDocRef = doc(db, 'posts', postId, 'hearts', userUid);
            if (hasHearted) {
              await deleteDoc(heartDocRef);
            } else {
              await setDoc(heartDocRef, {
                userId: userUid,
                createdAt: new Date().toISOString()
              });
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
    if (postId.startsWith('post-')) return;
    try {
      const commentsQuery = query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('createdAt', 'asc')
      );
      const querySnapshot = await getDocs(commentsQuery);
      const subcollectionComments: Comment[] = [];
      querySnapshot.forEach((docSnap) => {
        subcollectionComments.push({ id: docSnap.id, ...docSnap.data() } as any);
      });

      const currentPosts = get().posts;
      const targetPost = currentPosts.find(p => p.id === postId);
      let commentsToUse = subcollectionComments;

      // Fallback Compatibility Layer
      if (subcollectionComments.length === 0 && targetPost && targetPost.comments && targetPost.comments.length > 0) {
        commentsToUse = targetPost.comments;
      }

      const updated = currentPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: commentsToUse,
            commentsCount: Math.max(p.commentsCount || 0, commentsToUse.length)
          };
        }
        return p;
      });

      set({ posts: updated });
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));
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

    // Check for duplicate emojis inside a single comment
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
    const emojis = text.match(emojiRegex);
    if (emojis) {
      const uniqueEmojis = new Set(emojis);
      if (uniqueEmojis.size !== emojis.length) {
        alert('Spam detected! You cannot use the same emoji more than once in a comment.');
        return;
      }
    }

    const currentUser = get().user;
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      userName,
      userRole,
      userPhoto: currentUser?.photoUrl,
      text,
      timestamp: 'Just now',
      userId: currentUser?.uid
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
          createdAt: new Date().toISOString()
        });

        // Sync legacy fields & counts for old client compatibility!
        const refreshedPost = get().posts.find(p => p.id === postId);
        await updateDoc(doc(db, 'posts', postId), {
          comments: refreshedPost?.comments || [],
          commentsCount: refreshedPost?.commentsCount || 0
        });
      }
    } catch (err: any) {
      console.error('Failed to sync comment with Firestore:', err);
      get().showToast(getReadableErrorMessage(err), 'error');
    }
  },

  deleteComment: async (postId, commentId) => {
    const updated = get().posts.map(post => {
      if (post.id === postId) {
        const filtered = (post.comments || []).filter(c => c.id !== commentId);
        return {
          ...post,
          commentsCount: Math.max(0, (post.commentsCount || 1) - 1),
          comments: filtered
        };
      }
      return post;
    });

    set({ posts: updated });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));

    try {
      if (!postId.startsWith('post-')) {
        const commentDocRef = doc(db, 'posts', postId, 'comments', commentId);
        await deleteDoc(commentDocRef);

        // Sync legacy fields & counts for old client compatibility!
        const refreshedPost = get().posts.find(p => p.id === postId);
        await updateDoc(doc(db, 'posts', postId), {
          comments: refreshedPost?.comments || [],
          commentsCount: refreshedPost?.commentsCount || 0
        });
      }
    } catch (err: any) {
      console.error('Failed to delete comment from Firestore:', err);
      get().showToast(getReadableErrorMessage(err), 'error');
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
    allowMultipleVotes
  }) => {
    const authorUid = get().user?.uid || auth.currentUser?.uid || 'anonymous';
    const newPost: Post = {
      id: `post-${Date.now()}`,
      authorName: isAnonymous ? `Anonymous ${authorRole}` : authorName,
      authorRole,
      authorPhoto: isAnonymous 
        ? undefined 
        : (get().user?.photoUrl || (authorRole === 'Guest'
            ? 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix'
            : 'https://api.dicebear.com/7.x/avataaars/png?seed=Aneka')),
      authorUid,
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

    // Save to Firestore dynamically!
    try {
      const docRef = await addDoc(collection(db, 'posts'), {
        authorName: newPost.authorName,
        authorRole: newPost.authorRole,
        authorPhoto: newPost.authorPhoto || null,
        authorUid: newPost.authorUid,
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
    } catch (err: any) {
      console.error('Failed to save post to Firestore:', err);
      get().showToast(getReadableErrorMessage(err), 'error');
    }

    const updated = [newPost, ...get().posts];
    set({ posts: updated });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));
  },

  submitVote: async (postId, optionId) => {
    const updated = get().posts.map(post => {
      if (post.id === postId && post.pollOptions) {
        const votedIds = post.userVotedOptionIds || (post.userVotedOptionId ? [post.userVotedOptionId] : []);
        
        if (post.allowMultipleVotes) {
          if (votedIds.includes(optionId)) return post;
          
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
          if (votedIds.length > 0) return post;
          
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

    set({ posts: updated });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));
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
    // Sync with Firestore dynamically
    try {
      if (!postId.startsWith('post-')) {
        await deleteDoc(doc(db, 'posts', postId));
      }
    } catch (err: any) {
      console.error('Failed to delete post from Firestore:', err);
      get().showToast(getReadableErrorMessage(err), 'error');
    }

    const updatedPosts = get().posts.filter(post => post.id !== postId);
    const updatedBookmarks = (get().bookmarkedPostIds || []).filter(id => id !== postId);
    set({ posts: updatedPosts, bookmarkedPostIds: updatedBookmarks });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updatedPosts));
    await AsyncStorage.setItem('@mce_bookmarked_post_ids', JSON.stringify(updatedBookmarks));
  },

  editPost: async (postId, newContent) => {
    // Sync with Firestore dynamically
    try {
      if (!postId.startsWith('post-')) {
        await updateDoc(doc(db, 'posts', postId), {
          content: newContent
        });
      }
    } catch (err: any) {
      console.error('Failed to edit post in Firestore:', err);
      get().showToast(getReadableErrorMessage(err), 'error');
    }

    const updated = get().posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          content: newContent
        };
      }
      return post;
    });
    set({ posts: updated });
    await AsyncStorage.setItem('@mce_posts', JSON.stringify(updated));
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
  },

  deleteLocalNote: async (id) => {
    const updated = get().localNotes.filter(note => note.id !== id);
    set({ localNotes: updated });
    await AsyncStorage.setItem('@mce_local_notes', JSON.stringify(updated));
  },

  // Notices actions
  fetchNotices: async (forceRefresh = false) => {
    const startTime = Date.now();
    // Soft TTL Strategy: skip background sync if not forced and lastNoticesSyncTime is fresh (< 15 min)
    const syncTime = get().lastNoticesSyncTime;
    const cacheExpired = isCacheExpired(syncTime, 15);

    if (!forceRefresh) {
      // 1. If we already have notices in-memory, keep them and silently update in background if expired
      if (get().notices.length > 0) {
        if (__DEV__) {
          console.log('[Telemetry] Notice Cache Source: In-Memory. Count:', get().notices.length);
        }
        if (cacheExpired) {
          get().syncNoticesQuietly().catch(() => {});
        }
        return;
      }

      // 2. Try loading from AsyncStorage cache first for instant UI response
      try {
        const stored = await AsyncStorage.getItem('@mce_notices_v2');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (__DEV__) {
              console.log('[Telemetry] Notice Cache Source: AsyncStorage. Count:', parsed.length);
            }
            set({ notices: parsed, isOffline: false });
            if (cacheExpired) {
              get().syncNoticesQuietly().catch(() => {});
            }
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to read cached notices:', e);
      }
    }

    // 3. Fallback to foreground fetch with active loading spinner
    set({ isNoticesLoading: true });
    try {
      await get().syncNoticesQuietly();
      if (__DEV__) {
        console.log(`[Telemetry] Notice fetch duration: ${Date.now() - startTime}ms (Success)`);
      }
    } catch (err) {
      console.warn('Foreground notice sync failed:', err);
      if (__DEV__) {
        console.log(`[Telemetry] Notice fetch duration: ${Date.now() - startTime}ms (Failed, loaded offline/fallback)`);
      }
    } finally {
      set({ isNoticesLoading: false });
    }
  },

  syncNoticesQuietly: async () => {
    const isWeb = Platform.OS === 'web';
    
    // Custom fetch helper with abort controller for timeout handling
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

    // Modern Chrome/Safari mobile User-Agent to bypass Cloudflare bot security filters on Native platforms
    const browserHeaders: Record<string, string> = {
      'Accept': 'application/json, application/xml, text/xml, */*'
    };

    if (!isWeb) {
      browserHeaders['Cache-Control'] = 'no-cache';
      browserHeaders['Pragma'] = 'no-cache';
      browserHeaders['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
    }

    try {
      // 1. PRIMARY PATH: WordPress REST JSON API
      let fetchJsonUrl = `https://www.mcemotihari.ac.in/wp-json/wp/v2/posts?categories=4&per_page=30&t=${Date.now()}`;
      if (isWeb) {
        fetchJsonUrl = `https://corsproxy.io/?${encodeURIComponent(fetchJsonUrl)}`;
      }

      let parsedNotices: NoticeItem[] = [];
      let success = false;

      try {
        const response = await fetchWithTimeout(fetchJsonUrl, { headers: browserHeaders }, 8000);
        
        if (response.ok) {
          const rawText = await response.text();
          const posts = JSON.parse(rawText);
          if (Array.isArray(posts) && posts.length > 0) {
            parsedNotices = parseNoticesJSON(posts);
            success = true;
          }
        } else {
          console.warn(`WordPress JSON API HTTP status not OK: ${response.status}`);
        }
      } catch (jsonErr: any) {
        if (__DEV__) {
          if (jsonErr.message === 'TIMEOUT') {
            console.warn('[Telemetry] Telemetry warning: Fetch timeout encountered while fetching college JSON notices.');
          } else if (isWeb && (jsonErr instanceof TypeError || String(jsonErr).includes('Failed to fetch'))) {
            console.warn('[Telemetry] Telemetry warning: CORS failure encountered during college JSON web fetch.');
          }
        }
        console.warn('WordPress JSON API fetch failed, trying RSS feed fallback:', jsonErr);
      }

      // 2. SECONDARY FALLBACK PATH: RSS XML Feed
      if (!success) {
        let fetchRssUrl = 'https://www.mcemotihari.ac.in/category/notices/feed/';
        if (isWeb) {
          fetchRssUrl = `https://corsproxy.io/?${encodeURIComponent(fetchRssUrl + '?t=' + Date.now())}`;
        } else {
          fetchRssUrl = `${fetchRssUrl}?t=${Date.now()}`;
        }

        const rssResponse = await fetchWithTimeout(fetchRssUrl, { headers: browserHeaders }, 8000);

        if (!rssResponse.ok) {
          throw new Error(`Both JSON API and RSS feed HTTP requests failed. RSS status: ${rssResponse.status}`);
        }

        const xmlText = await rssResponse.text();

        if (!xmlText || (!xmlText.includes('<rss') && !xmlText.includes('<channel'))) {
          throw new Error('Invalid XML feed structure received from server');
        }

        parsedNotices = parseNoticesRSS(xmlText);
        success = true;
      }

      if (parsedNotices.length > 0) {
        const now = Date.now();
        set({ 
          notices: parsedNotices, 
          isOffline: false,
          lastNoticesSyncTime: now
        });
        await AsyncStorage.setItem('@mce_notices_v2', JSON.stringify(parsedNotices));
        await AsyncStorage.setItem('@mce_notices_sync_time', String(now));
      } else {
        throw new Error('No notices were successfully parsed from any online endpoint');
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
        if (__DEV__) {
          console.log('[Telemetry] Notice Cache Source: In-Memory (Recovery Fallback). Count:', get().notices.length);
        }
        set({ isOffline: true });
      } else {
        try {
          const storedNotices = await AsyncStorage.getItem('@mce_notices_v2');
          if (storedNotices) {
            const parsed = JSON.parse(storedNotices);
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (__DEV__) {
                console.log('[Telemetry] Notice Cache Source: AsyncStorage (Recovery Fallback). Count:', parsed.length);
              }
              set({ notices: parsed, isOffline: true });
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
        const stored = await AsyncStorage.getItem('@mce_university_notices_v2');
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
      'Accept': 'application/json, text/plain, */*'
    };

    if (!isWeb) {
      browserHeaders['Cache-Control'] = 'no-cache';
      browserHeaders['Pragma'] = 'no-cache';
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
        await AsyncStorage.setItem('@mce_university_notices_v2', JSON.stringify(parsedBEU));
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
          const stored = await AsyncStorage.getItem('@mce_university_notices_v2');
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
    await AsyncStorage.removeItem('@mce_notices_v2');
    await AsyncStorage.removeItem('@mce_university_notices_v2');
    await AsyncStorage.removeItem('@mce_posts');
    await AsyncStorage.removeItem('@mce_posts_sync_time');
    await AsyncStorage.removeItem('@mce_notices_sync_time');
    await AsyncStorage.removeItem('@mce_university_notices_sync_time');
    set({ notices: [], universityNotices: [], posts: [], lastPostsSyncTime: 0, lastNoticesSyncTime: 0, lastUniversityNoticesSyncTime: 0 });
  },

  fetchPosts: async (options?: { refresh?: boolean; loadMore?: boolean; quiet?: boolean }) => {
    const { refresh = false, loadMore = false, quiet = false } = options || {};
    const limitCount = 10;
    
    // Throttling silent updates: if not forced, and lastPostsSyncTime is fresh (e.g. < 5 minutes), do not trigger
    const now = Date.now();
    const lastSync = get().lastPostsSyncTime || 0;
    if (quiet && !refresh && !loadMore && !isCacheExpired(lastSync, 5)) {
      if (__DEV__) {
        console.log('[Perf Logger] Posts cache is fresh. Skipping background sync.');
      }
      return;
    }

    if (get().isPostsLoading || (refresh && get().isPostsRefreshing)) {
      return; // Deduplication
    }

    if (loadMore && !get().hasMorePosts) {
      return; // Stop pagination
    }

    const startTime = Date.now();

    if (refresh) {
      set({ isPostsRefreshing: true });
    } else if (!quiet) {
      set({ isPostsLoading: true });
    }

    try {
      const postsRef = collection(db, 'posts');
      let postsQuery;

      if (loadMore && get().lastVisiblePostDoc) {
        postsQuery = query(
          postsRef,
          orderBy('createdAt', 'desc'),
          startAfter(get().lastVisiblePostDoc),
          limit(limitCount)
        );
      } else {
        postsQuery = query(
          postsRef,
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(postsQuery);
      const docs = querySnapshot.docs;
      const lastDoc = docs[docs.length - 1] || null;

      const firebasePosts: Post[] = [];
      docs.forEach((docSnap) => {
        firebasePosts.push({ id: docSnap.id, ...docSnap.data() } as Post);
      });

      const storedHeartedIds = await AsyncStorage.getItem('@mce_hearted_post_ids');
      const heartedIds: string[] = storedHeartedIds ? JSON.parse(storedHeartedIds) : [];
      const userUid = get().user?.uid;

      const mappedPosts = firebasePosts.map(p => {
        let heartedBy = p.heartedBy || [];
        if (!p.heartedBy) {
          if (userUid && (p.claps > 0 || heartedIds.includes(p.id))) {
            heartedBy = [userUid];
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
      });

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

      const sortedFetchedPosts = sortPostsPriority(updatedPosts, get().connections);

      set({
        posts: sortedFetchedPosts,
        lastVisiblePostDoc: lastDoc,
        hasMorePosts: hasMore,
        lastPostsSyncTime: now,
        isOffline: false
      });

      await AsyncStorage.setItem('@mce_posts', JSON.stringify(sortedFetchedPosts));
      await AsyncStorage.setItem('@mce_posts_sync_time', String(now));

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
      set({
        isPostsLoading: false,
        isPostsRefreshing: false
      });
    }
  }
}));
