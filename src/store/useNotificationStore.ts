import { create } from 'zustand';
import { db, auth } from '@/config/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch, getDocs, addDoc, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationItem {
  id: string;
  type: 'welcome' | 'comment' | 'event' | 'system' | 'connection_request' | 'connection_accepted' | 'like' | 'mention' | 'post' | 'post_policy_violation';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  targetPostId?: string; // Redirect reference on click
  category?: string;
  senderUid?: string;
  senderName?: string;
  senderPhoto?: string;
  senderBranch?: string;
  senderBatch?: string;
  senderUsername?: string;
  senderRole?: string;
  status?: 'pending' | 'accepted' | 'declined';
  deletedPostData?: {
    title: string;
    content: string;
    authorName: string;
    category: string;
    deletedAt: string;
  } | null;
  imageUrl?: string;
  actionUrl?: string;
  openStudy?: string;
}


interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  initNotifications: (uid: string) => () => void;
  loadMoreNotifications: (uid: string) => void;
  markAsRead: (uid: string, notificationId: string) => Promise<void>;
  markAllAsRead: (uid: string) => Promise<void>;
  saveToNotepad: (notification: NotificationItem) => Promise<boolean>;
  clearAllNotifications: (uid: string) => Promise<void>;
  deleteNotifications: (uid: string, ids: Set<string>) => Promise<void>;
}

let activeUid: string | null = null;
let activeUnsubscribeSnapshot: (() => void) | null = null;
let activeUnsubscribeAuth: (() => void) | null = null;
let subscriberCount = 0;
let currentLimit = 15;
let startListenerRef: ((authenticatedUid: string) => void) | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: true,
  hasMore: true,

  loadMoreNotifications: (uid: string) => {
    currentLimit += 15;
    // Start listener
    if (startListenerRef) {
      startListenerRef(uid);
    }
  },

  initNotifications: (uid: string) => {
    // If a listener is already active for this user, do not recreate it
    if (activeUid === uid) {
      subscriberCount++;
      if (__DEV__) {
        console.log(`[Notification Store] Shared existing listener for user ${uid}. Subscriber count: ${subscriberCount}`);
      }
      return () => {
        subscriberCount--;
        if (__DEV__) {
          console.log(`[Notification Store] Unsubscribed client. Subscriber count: ${subscriberCount}`);
        }
        if (subscriberCount <= 0) {
          if (__DEV__) {
            console.log(`[Notification Store] Cleaning up notification listener for user ${uid}`);
          }
          if (activeUnsubscribeSnapshot) {
            activeUnsubscribeSnapshot();
            activeUnsubscribeSnapshot = null;
          }
          if (activeUnsubscribeAuth) {
            activeUnsubscribeAuth();
            activeUnsubscribeAuth = null;
          }
          activeUid = null;
        }
      };
    }

    // If activeUid is different, clean up the previous listener
    if (activeUnsubscribeSnapshot) {
      activeUnsubscribeSnapshot();
      activeUnsubscribeSnapshot = null;
    }
    if (activeUnsubscribeAuth) {
      activeUnsubscribeAuth();
      activeUnsubscribeAuth = null;
    }

    activeUid = uid;
    subscriberCount = 1;
    currentLimit = 15;
    set({ loading: true, hasMore: true });

    startListenerRef = (authenticatedUid: string) => {
      if (activeUnsubscribeSnapshot) {
        activeUnsubscribeSnapshot();
        activeUnsubscribeSnapshot = null;
      }

      const notifRef = collection(db, 'users', authenticatedUid, 'notifications');
      const q = query(notifRef, orderBy('timestamp', 'desc'), limit(currentLimit));

      let isInitial = true;
      activeUnsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const items: NotificationItem[] = [];
        let unread = 0;
        
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const item: NotificationItem = {
            id: docSnap.id,
            type: data.type || 'system',
            title: data.title || '',
            body: data.body || '',
            timestamp: data.timestamp || new Date().toLocaleString(),
            read: !!data.read,
            targetPostId: data.targetPostId,
            category: data.category,
            senderUid: data.senderUid,
            senderName: data.senderName,
            senderPhoto: data.senderPhoto,
            senderBranch: data.senderBranch,
            senderBatch: data.senderBatch,
            senderUsername: data.senderUsername,
            senderRole: data.senderRole,
            status: data.status,
            deletedPostData: data.deletedPostData || null,
            imageUrl: data.imageUrl,
            openStudy: data.openStudy,
          };

          items.push(item);
          if (!item.read) unread++;
        });

        // Web Push Notification trigger for new dynamic alerts (only if not initial load)
        if (!isInitial && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const currentNotifs = get().notifications;
          if (currentNotifs.length > 0) {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const data = change.doc.data();
                if (data && !data.read) {
                  const exists = currentNotifs.some(n => n.id === change.doc.id);
                  if (!exists) {
                    try {
                      new Notification(data.title || 'MCE Connect Update', {
                        body: data.body || '',
                        icon: 'https://mcemotihari-app.web.app/assets/images/mce-logo.png',
                      });
                    } catch (e) {
                      console.warn("Failed to display browser notification:", e);
                    }
                  }
                }
              }
            });
          }
        }

        // (Welcome notification logic removed to allow users to clear their notifications without respawning)

        set({ 
          notifications: items, 
          unreadCount: unread, 
          loading: false,
          hasMore: items.length >= currentLimit
        });
        isInitial = false;
      }, (error) => {
        if (error.code === 'permission-denied') {
          console.warn("Firestore subscription permission-denied. Retrying when auth session stabilizes.");
        } else {
          console.error("Error listening to notifications:", error);
        }
        set({ loading: false });
      });
    };

    // Fast-track if Firebase Auth is already validated
    if (auth.currentUser && auth.currentUser.uid === uid) {
      if (startListenerRef) startListenerRef(uid);
    }

    // Subscribe to auth state updates to bridge background timing gaps
    activeUnsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.uid === uid) {
        if (startListenerRef) startListenerRef(uid);
      } else {
        if (activeUnsubscribeSnapshot) {
          activeUnsubscribeSnapshot();
          activeUnsubscribeSnapshot = null;
        }
      }
    });

    return () => {
      subscriberCount--;
      if (__DEV__) {
        console.log(`[Notification Store] Unsubscribed client (cleanup). Subscriber count: ${subscriberCount}`);
      }
      if (subscriberCount <= 0) {
        if (__DEV__) {
          console.log(`[Notification Store] Cleaning up notification listener for user ${uid} (cleanup)`);
        }
        if (activeUnsubscribeSnapshot) {
          activeUnsubscribeSnapshot();
          activeUnsubscribeSnapshot = null;
        }
        if (activeUnsubscribeAuth) {
          activeUnsubscribeAuth();
          activeUnsubscribeAuth = null;
        }
        activeUid = null;
      }
    };
  },

  markAsRead: async (uid: string, notificationId: string) => {
    try {
      // 1. Optimistic UI update
      set(state => {
        const notif = state.notifications.find(n => n.id === notificationId);
        if (notif && !notif.read) {
          const updatedNotifs = state.notifications.map(n => n.id === notificationId ? { ...n, read: true } : n);
          return {
            notifications: updatedNotifs,
            unreadCount: Math.max(0, state.unreadCount - 1)
          };
        }
        return state;
      });

      // 2. Sync to Firestore
      const docRef = doc(db, 'users', uid, 'notifications', notificationId);
      await updateDoc(docRef, { read: true });
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
    }
  },

  markAllAsRead: async (uid: string) => {
    try {
      if (get().unreadCount === 0) return;

      const currentNotifs = get().notifications;
      const unreadNotifs = currentNotifs.filter(n => !n.read);

      // 1. Optimistic UI update for instantaneous feedback
      const updatedNotifs = currentNotifs.map(n => n.read ? n : { ...n, read: true });
      set({ notifications: updatedNotifs, unreadCount: 0 });

      // 2. Sync to Firestore backend
      if (unreadNotifs.length > 0) {
        const batch = writeBatch(db);
        unreadNotifs.forEach((n) => {
          const docRef = doc(db, 'users', uid, 'notifications', n.id);
          batch.update(docRef, { read: true });
        });
        await batch.commit();
      }
    } catch (e) {
      console.error("Failed to mark all as read in Firestore:", e);
    }
  },

  saveToNotepad: async (notification: NotificationItem) => {
    try {
      // Fetch current notepad list
      const savedNotesStr = await AsyncStorage.getItem('@mce_notepad_notes');
      let notes = savedNotesStr ? JSON.parse(savedNotesStr) : [];
      
      // Prevent duplicates
      const exists = notes.some((n: any) => n.id === `notif-note-${notification.id}`);
      if (exists) return true;

      const newNote = {
        id: `notif-note-${notification.id}`,
        title: `📌 Alert: ${notification.title}`,
        content: `${notification.body}\n\nShared on: ${notification.timestamp}`,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        category: 'Alerts'
      };

      notes.unshift(newNote);
      await AsyncStorage.setItem('@mce_notepad_notes', JSON.stringify(notes));
      return true;
    } catch (e) {
      console.error("Error saving alert to notepad:", e);
      return false;
    }
  },

  clearAllNotifications: async (uid: string) => {
    try {
      // 1. Optimistic UI update
      set({ notifications: [], unreadCount: 0 });

      // 2. Query and delete all notifications in Firestore
      const notifRef = collection(db, 'users', uid, 'notifications');
      const snapshot = await getDocs(notifRef);
      
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const chunk = docs.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(docSnap => batch.delete(docSnap.ref));
        await batch.commit();
      }
    } catch (e) {
      console.error("Failed to clear all notifications in Firestore:", e);
    }
  },

  deleteNotifications: async (uid: string, ids: Set<string>) => {
    if (ids.size === 0) return;
    try {
      // 1. Optimistic UI update
      set(state => {
        const remaining = state.notifications.filter(n => !ids.has(n.id));
        return {
          notifications: remaining,
          unreadCount: remaining.filter(n => !n.read).length
        };
      });

      // 2. Delete from Firestore
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, 'users', uid, 'notifications', id));
      });
      await batch.commit();
    } catch (e) {
      console.error("Failed to delete notifications in Firestore:", e);
    }
  }
}));
