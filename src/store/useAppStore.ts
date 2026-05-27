import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, orderBy, limit, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Platform } from 'react-native';
import { NoticeItem, parseNoticesRSS, parseNoticesJSON, parseBEUNotices } from '../utils/rssParser';

const FALLBACK_NOTICES: NoticeItem[] = [];


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

interface AppState {
  user: any | null;
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
}

const INITIAL_POSTS: Post[] = [];

const INITIAL_CONNECTIONS: ContactConnection[] = [];

// Module-level dictionary for debouncing Firestore clap syncs
const clapSyncTimers: Record<string, any> = {};

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
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
  localNotes: [],
  commentSpamWarning: null,
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
        set({ user: JSON.parse(storedUser) });
      }

      // 2. Load Feed Posts from Firestore (with AsyncStorage fallback)
      const storedHeartedIds = await AsyncStorage.getItem('@mce_hearted_post_ids');
      const heartedIds: string[] = storedHeartedIds ? JSON.parse(storedHeartedIds) : [];
      
      try {
        const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
        const querySnapshot = await getDocs(postsQuery);
        const firebasePosts: Post[] = [];
        querySnapshot.forEach((docSnap) => {
          firebasePosts.push({ id: docSnap.id, ...docSnap.data() } as Post);
        });
        
        const mappedPosts = firebasePosts.map(p => {
          const userUid = get().user?.uid;
          let heartedBy = p.heartedBy;
          
          if (!heartedBy) {
            // Clean up legacy/fake claps: if it has claps or user local heart, restrict to 1 unique heart max
            if (userUid && (p.claps > 0 || heartedIds.includes(p.id))) {
              heartedBy = [userUid];
            } else {
              heartedBy = [];
            }
            
            // Automatically clean up/migrate this post in Firestore
            if (!p.id.startsWith('post-')) {
              updateDoc(doc(db, 'posts', p.id), {
                heartedBy: heartedBy,
                claps: heartedBy.length
              }).catch(err => console.error('Failed to migrate legacy post claps:', err));
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
        
        set({ posts: mappedPosts });
        await AsyncStorage.setItem('@mce_posts', JSON.stringify(mappedPosts));
      } catch (err) {
        console.warn('Failed to load posts from Firestore, using offline cache:', err);
        const storedPosts = await AsyncStorage.getItem('@mce_posts');
        if (storedPosts) {
          const cachedPosts: Post[] = JSON.parse(storedPosts);
          const mappedCached = cachedPosts.map(p => {
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
          });
          set({ posts: mappedCached });
        } else {
          set({ posts: [] });
        }
      }

      // 3. Load Connections state
      const storedConnections = await AsyncStorage.getItem('@mce_connections');
      let connectionsList = storedConnections ? JSON.parse(storedConnections) : [];
      // Clean up mock connections so they are cleared out for the user
      const mockNames = [
        'Amit Singh', 
        'Nisha Kumari', 
        'Pankaj Kumar', 
        'Abhishek Kumar', 
        'Shweta Raj', 
        'Rohan Sharma'
      ];
      connectionsList = connectionsList.filter((conn: any) => conn && conn.name && !mockNames.includes(conn.name));
      set({ connections: connectionsList });
      await AsyncStorage.setItem('@mce_connections', JSON.stringify(connectionsList));

      // 4. Load Bookmarked subjects
      const storedBookmarks = await AsyncStorage.getItem('@mce_bookmarked_subjects');
      if (storedBookmarks) {
        set({ bookmarkedSubjects: JSON.parse(storedBookmarks) });
      }

      // 4.5 Load Bookmarked posts
      const storedBookmarkedPosts = await AsyncStorage.getItem('@mce_bookmarked_post_ids');
      if (storedBookmarkedPosts) {
        set({ bookmarkedPostIds: JSON.parse(storedBookmarkedPosts) });
      }

      // 4.6 Load Hearted/Liked posts
      const storedHearted = await AsyncStorage.getItem('@mce_hearted_post_ids');
      if (storedHearted) {
        set({ heartedPostIds: JSON.parse(storedHearted) });
      }

      // 5. Load Local Notes
      const storedNotes = await AsyncStorage.getItem('@mce_local_notes');
      if (storedNotes) {
        set({ localNotes: JSON.parse(storedNotes) });
      }

      // 6. Load Live Notices from Cache
      const storedNotices = await AsyncStorage.getItem('@mce_notices_v2');
      if (storedNotices) {
        set({ notices: JSON.parse(storedNotices) });
      } else {
        set({ notices: [] });
        await AsyncStorage.setItem('@mce_notices_v2', JSON.stringify([]));
      }

      // 6.5 Load Live University Notices from Cache
      const storedUniNotices = await AsyncStorage.getItem('@mce_university_notices_v2');
      if (storedUniNotices) {
        set({ universityNotices: JSON.parse(storedUniNotices) });
      } else {
        set({ universityNotices: [] });
        await AsyncStorage.setItem('@mce_university_notices_v2', JSON.stringify([]));
      }

      // 7. Load Pinned Notice IDs
      const storedPinnedIds = await AsyncStorage.getItem('@mce_pinned_notice_ids');
      if (storedPinnedIds) {
        set({ pinnedNoticeIds: JSON.parse(storedPinnedIds) });
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


      // Trigger a silent background fetch once on app start to sync cache quietly in the background
      setTimeout(() => {
        get().fetchNotices(true).catch(err => console.warn('Background notice sync failed on startup:', err));
        get().fetchUniversityNotices(true).catch(err => console.warn('Background BEU notice sync failed on startup:', err));
      }, 1500);
    } catch (e) {
      console.error('Failed to initialize app state store:', e);
    }
  },
  setUser: async (user) => {
    try {
      await AsyncStorage.setItem('@mce_user', JSON.stringify(user));
      set({ user });
    } catch (e) {
      console.error(e);
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
    } catch (err) {
      console.error('Failed to sync comment with Firestore:', err);
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
    } catch (err) {
      console.error('Failed to delete comment from Firestore:', err);
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
    } catch (err) {
      console.error('Failed to sync edited comment with Firestore:', err);
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
    } catch (err) {
      console.error('Failed to save post to Firestore:', err);
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

    set({ connections: updated });
    await AsyncStorage.setItem('@mce_connections', JSON.stringify(updated));
  },

  deletePost: async (postId) => {
    // Sync with Firestore dynamically
    try {
      if (!postId.startsWith('post-')) {
        await deleteDoc(doc(db, 'posts', postId));
      }
    } catch (err) {
      console.error('Failed to delete post from Firestore:', err);
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
    } catch (err) {
      console.error('Failed to edit post in Firestore:', err);
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
    // Stale-While-Revalidate Strategy for instant load & offline resilience
    if (!forceRefresh) {
      // 1. If we already have notices in-memory, keep them and trigger silent update
      if (get().notices.length > 0) {
        // Trigger silent update in background
        get().syncNoticesQuietly().catch(() => {});
        return;
      }

      // 2. Try loading from AsyncStorage cache first for instant UI response
      try {
        const stored = await AsyncStorage.getItem('@mce_notices_v2');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            set({ notices: parsed, isOffline: false });
            // Trigger silent background update
            get().syncNoticesQuietly().catch(() => {});
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to read cached notices:', e);
      }
    }

    // 3. Fallback to full foreground fetch with active loading spinner
    set({ isNoticesLoading: true });
    try {
      await get().syncNoticesQuietly();
    } catch (err) {
      console.warn('Foreground notice sync failed:', err);
    } finally {
      set({ isNoticesLoading: false });
    }
  },

  syncNoticesQuietly: async () => {
    const isWeb = Platform.OS === 'web';
    
    // Modern Chrome/Safari mobile User-Agent to bypass Cloudflare bot security filters on Native platforms
    // On Web platforms, setting 'User-Agent', 'Cache-Control' or 'Pragma' headers is blocked by browser security (CORS/Forbidden Headers)
    const browserHeaders: Record<string, string> = {
      'Accept': 'application/json, application/xml, text/xml, */*'
    };

    if (!isWeb) {
      browserHeaders['Cache-Control'] = 'no-cache';
      browserHeaders['Pragma'] = 'no-cache';
      browserHeaders['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
    }

    // High-fidelity fallback college notices if fetch completely fails & there's no cache
    const FALLBACK_COLLEGE_NOTICES: NoticeItem[] = [
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

    try {
      // 1. PRIMARY PATH: WordPress REST JSON API (gives full high-fidelity details and attached PDF documents)
      // Append dynamic cache-busting timestamp to bypass Cloudflare and proxy caching
      let fetchJsonUrl = `https://www.mcemotihari.ac.in/wp-json/wp/v2/posts?categories=4&per_page=30&t=${Date.now()}`;
      if (isWeb) {
        // Prepend corsproxy.io (extremely fast, stable public CORS proxy) instead of allorigins
        fetchJsonUrl = `https://corsproxy.io/?${encodeURIComponent(fetchJsonUrl)}`;
      }

      let parsedNotices: NoticeItem[] = [];
      let success = false;

      try {
        const response = await fetch(fetchJsonUrl, {
          headers: browserHeaders
        });
        
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
      } catch (jsonErr) {
        console.warn('WordPress JSON API fetch failed, trying RSS feed fallback:', jsonErr);
      }

      // 2. SECONDARY FALLBACK PATH: RSS XML Feed (standard WordPress category feed)
      if (!success) {
        let fetchRssUrl = 'https://www.mcemotihari.ac.in/category/notices/feed/';
        if (isWeb) {
          fetchRssUrl = `https://corsproxy.io/?${encodeURIComponent(fetchRssUrl + '?t=' + Date.now())}`;
        } else {
          fetchRssUrl = `${fetchRssUrl}?t=${Date.now()}`;
        }

        const rssResponse = await fetch(fetchRssUrl, {
          headers: browserHeaders
        });

        if (!rssResponse.ok) {
          throw new Error(`Both JSON API and RSS feed HTTP requests failed. RSS status: ${rssResponse.status}`);
        }

        const xmlText = await rssResponse.text();

        // If proxy returned a Cloudflare block page instead of XML, throw error
        if (!xmlText || !xmlText.includes('<rss') && !xmlText.includes('<channel')) {
          throw new Error('Invalid XML feed structure received from server');
        }

        parsedNotices = parseNoticesRSS(xmlText);
        success = true;
      }

      if (parsedNotices.length > 0) {
        set({ 
          notices: parsedNotices, 
          isOffline: false
        });
        await AsyncStorage.setItem('@mce_notices_v2', JSON.stringify(parsedNotices));
      } else {
        throw new Error('No notices were successfully parsed from any online endpoint');
      }
    } catch (error) {
      console.warn('Failed to sync live notices quietly, loading from cache or offline fallback:', error);
      
      const storedNotices = await AsyncStorage.getItem('@mce_notices_v2');
      if (storedNotices) {
        set({ 
          notices: JSON.parse(storedNotices),
          isOffline: true
        });
      } else {
        // NO CACHE: Fallback to static lists so Notice Board is never blank!
        set({ 
          notices: FALLBACK_COLLEGE_NOTICES,
          isOffline: true
        });
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
    // Stale-While-Revalidate Strategy for instant load & offline resilience
    if (!forceRefresh) {
      // 1. If we already have notices in-memory, keep them and trigger silent update
      if (get().universityNotices.length > 0) {
        get().syncUniversityNoticesQuietly().catch(() => {});
        return;
      }

      // 2. Try loading from AsyncStorage cache first for instant UI response
      try {
        const stored = await AsyncStorage.getItem('@mce_university_notices_v2');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            set({ universityNotices: parsed });
            get().syncUniversityNoticesQuietly().catch(() => {});
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to read cached university notices:', e);
      }
    }

    // 3. Fallback to full foreground fetch with active loading spinner
    set({ isUniversityLoading: true });
    try {
      await get().syncUniversityNoticesQuietly();
    } catch (err) {
      console.warn('Foreground university notice sync failed:', err);
    } finally {
      set({ isUniversityLoading: false });
    }
  },

  syncUniversityNoticesQuietly: async () => {
    const isWeb = Platform.OS === 'web';
    
    // Custom browser User-Agent to bypass Cloudflare security filters on Native platforms
    const browserHeaders: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*'
    };

    if (!isWeb) {
      browserHeaders['Cache-Control'] = 'no-cache';
      browserHeaders['Pragma'] = 'no-cache';
      browserHeaders['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
    }

    // High-fidelity fallback university notices if fetch completely fails & there's no cache
    const FALLBACK_UNIVERSITY_NOTICES: NoticeItem[] = [
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

    try {
      let fetchUrl = `https://beu-bih.ac.in/backend/v1/notice/get-notice-board?t=${Date.now()}`;
      if (isWeb) {
        fetchUrl = `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`;
      }

      const response = await fetch(fetchUrl, {
        headers: browserHeaders
      });

      if (!response.ok) {
        throw new Error(`University Notices API HTTP status not OK: ${response.status}`);
      }

      const rawText = await response.text();
      const items = JSON.parse(rawText);
      
      if (Array.isArray(items) && items.length > 0) {
        const parsedBEU = parseBEUNotices(items);
        set({ 
          universityNotices: parsedBEU,
          isOffline: false
        });
        await AsyncStorage.setItem('@mce_university_notices_v2', JSON.stringify(parsedBEU));
      } else {
        throw new Error('No university notices found or empty response');
      }
    } catch (error) {
      console.warn('Failed to sync BEU university notices quietly, loading cache:', error);
      
      const stored = await AsyncStorage.getItem('@mce_university_notices_v2');
      if (stored) {
        set({ 
          universityNotices: JSON.parse(stored),
          isOffline: true
        });
      } else {
        set({ 
          universityNotices: FALLBACK_UNIVERSITY_NOTICES,
          isOffline: true
        });
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
    set({ notices: [], universityNotices: [] });
  }
}));
