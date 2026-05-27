import { create } from 'zustand';
import { db, auth } from '@/config/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch, getDocs, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationItem {
  id: string;
  type: 'welcome' | 'comment' | 'event' | 'system' | 'connection_request';
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
  status?: 'pending' | 'accepted' | 'declined';
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  initNotifications: (uid: string) => () => void;
  markAsRead: (uid: string, notificationId: string) => Promise<void>;
  markAllAsRead: (uid: string) => Promise<void>;
  saveToNotepad: (notification: NotificationItem) => Promise<boolean>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: true,

  initNotifications: (uid: string) => {
    set({ loading: true });
    
    let unsubscribeSnapshot: (() => void) | null = null;

    const startListener = (authenticatedUid: string) => {
      if (unsubscribeSnapshot) return;

      const notifRef = collection(db, 'users', authenticatedUid, 'notifications');
      const q = query(notifRef, orderBy('timestamp', 'desc'), limit(40));

      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
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
            status: data.status,
          };
          items.push(item);
          if (!item.read) unread++;
        });

        // Web Push Notification trigger for new dynamic alerts (only if not initial load)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
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

        // Welcome alert generation fallback if collection is brand new
        if (items.length === 0) {
          const welcomeRef = collection(db, 'users', authenticatedUid, 'notifications');
          addDoc(welcomeRef, {
            type: 'welcome',
            title: '🎉 Welcome to MCE Connect!',
            body: 'Congratulations! Your verified campus profile has been successfully built by MCE Alumni & Students. Explore dynamic notice feeds, notes, and connections now!',
            timestamp: new Date().toLocaleString(),
            read: false
          }).catch(() => {});
        }

        set({ notifications: items, unreadCount: unread, loading: false });
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
      startListener(uid);
    }

    // Subscribe to auth state updates to bridge background timing gaps
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.uid === uid) {
        startListener(uid);
      } else {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  },

  markAsRead: async (uid: string, notificationId: string) => {
    try {
      const docRef = doc(db, 'users', uid, 'notifications', notificationId);
      await updateDoc(docRef, { read: true });
    } catch (e) {
      console.error("Failed to mark notification as read:", e);
    }
  },

  markAllAsRead: async (uid: string) => {
    try {
      const notifRef = collection(db, 'users', uid, 'notifications');
      const unreadQuery = query(notifRef);
      const snapshot = await getDocs(unreadQuery);
      
      const batch = writeBatch(db);
      let updated = false;

      snapshot.forEach((docSnap) => {
        if (!docSnap.data().read) {
          batch.update(docSnap.ref, { read: true });
          updated = true;
        }
      });

      if (updated) {
        await batch.commit();
      }
    } catch (e) {
      console.error("Failed to mark all as read:", e);
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
  }
}));
