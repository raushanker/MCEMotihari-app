import { create } from 'zustand';
import { db, auth } from '@/config/firebase';
import { collection, setDoc, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';

export interface OlxItem {
  id: string;
  title: string;
  description: string;
  price: string;
  imageUrl?: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  authorRole?: string;
  authorAdminRole?: string;
  authorBranch?: string;
  authorSemester?: string;
  status: 'open' | 'sold';
  createdAt: string;
  commentsCount?: number;
}

export interface OlxComment {
  id: string;
  itemId: string;
  applicantUid: string;
  applicantName: string;
  applicantPhoto?: string;
  message: string;
  createdAt: string;
  ownerReply?: string;
}

interface OlxState {
  items: OlxItem[];
  comments: Record<string, OlxComment[]>; // Keyed by itemId
  loading: boolean;
  
  fetchItems: () => Promise<void>;
  createItem: (data: Omit<OlxItem, 'id' | 'createdAt' | 'authorUid' | 'authorName' | 'authorPhoto' | 'authorRole' | 'authorAdminRole' | 'authorBranch' | 'authorSemester' | 'status'>) => Promise<void>;
  updateItemStatus: (itemId: string, status: 'open' | 'sold') => Promise<void>;
  editItem: (itemId: string, data: { title: string; description: string; price: string }) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  
  fetchComments: (itemId: string) => Promise<void>;
  addComment: (itemId: string, data: { message: string }) => Promise<void>;
  editComment: (itemId: string, commentId: string, message: string) => Promise<void>;
  replyToComment: (itemId: string, commentId: string, replyText: string) => Promise<void>;
  editReply: (itemId: string, commentId: string, replyText: string) => Promise<void>;
  deleteComment: (itemId: string, commentId: string) => Promise<void>;
    deleteReply: (itemId: string, commentId: string) => Promise<void>;
  reportItem: (itemId: string, reason: string) => Promise<void>;
  reportComment: (itemId: string, commentId: string, reason: string) => Promise<void>;
}

export const useOlxStore = create<OlxState>((set, get) => ({
  items: [],
  comments: {},
  loading: false,

  fetchItems: async () => {
    try {
      set({ loading: true });
      const itemsRef = collection(db, 'campusOlx');
      const q = query(itemsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const itemsList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
        } as OlxItem;
      });
      set({ items: itemsList, loading: false });
    } catch (error) {
      console.error("Error fetching OLX items:", error);
      set({ loading: false });
    }
  },

  createItem: async (data) => {
    try {
const { useAppStore } = require('./useAppStore');
      const currentUser = useAppStore.getState().user;
      
      const newItem = {
        ...data,
        authorUid: currentUser?.uid || '',
        authorName: currentUser?.name || 'Anonymous',
        authorPhoto: currentUser?.photoUrl || '',
        authorRole: currentUser?.role || 'Student',
        authorAdminRole: currentUser?.adminRole || 'User',
        authorBranch: currentUser?.branch || '',
        authorSemester: currentUser?.semester || '',
        status: 'open',
        createdAt: serverTimestamp(),
      };
      
      const itemsRef = collection(db, 'campusOlx');
      const docRef = await addDoc(itemsRef, newItem);
      
      const createdItem = {
        ...newItem,
        id: docRef.id,
        createdAt: new Date().toISOString()
      } as OlxItem;
      
      set(state => ({
        items: [createdItem, ...state.items]
      }));
    } catch (error) {
      console.error("Error creating OLX item:", error);
      throw error;
    }
  },

  updateItemStatus: async (itemId, status) => {
    try {
      const itemRef = doc(db, 'campusOlx', itemId);
      await updateDoc(itemRef, { status });
      
      set(state => ({
        items: state.items.map(item => 
          item.id === itemId ? { ...item, status } : item
        )
      }));
    } catch (error) {
      console.error("Error updating OLX item status:", error);
      throw error;
    }
  },

  editItem: async (itemId, data) => {
    try {
      const itemRef = doc(db, 'campusOlx', itemId);
      await updateDoc(itemRef, data);
      
      set(state => ({
        items: state.items.map(item => 
          item.id === itemId ? { ...item, ...data } : item
        )
      }));
    } catch (error) {
      console.error("Error editing OLX item:", error);
      throw error;
    }
  },

  deleteItem: async (itemId) => {
    try {
      await deleteDoc(doc(db, 'campusOlx', itemId));
      set(state => ({
        items: state.items.filter(i => i.id !== itemId)
      }));
    } catch (error) {
      console.error("Error deleting OLX item:", error);
      throw error;
    }
  },

  fetchComments: async (itemId) => {
    try {
      const commentsRef = collection(db, `campusOlx/${itemId}/comments`);
      const q = query(commentsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const commentsList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
        } as OlxComment;
      });
      
      set(state => ({
        comments: {
          ...state.comments,
          [itemId]: commentsList
        }
      }));
    } catch (error) {
      console.error("Error fetching OLX comments:", error);
    }
  },

  addComment: async (itemId, data) => {
    try {
const { useAppStore } = require('./useAppStore');
      const currentUser = useAppStore.getState().user;
      
      const newComment = {
        ...data,
        itemId,
        applicantUid: currentUser?.uid || '',
        applicantName: currentUser?.name || 'Anonymous',
        applicantPhoto: currentUser?.photoUrl || '',
        createdAt: serverTimestamp(),
      };
      
      const commentsRef = collection(db, `campusOlx/${itemId}/comments`);
      const docRef = await addDoc(commentsRef, newComment);
      
      const createdComment = {
        ...newComment,
        id: docRef.id,
        createdAt: new Date().toISOString()
      } as OlxComment;
      
      set(state => ({
        comments: {
          ...state.comments,
          [itemId]: [createdComment, ...(state.comments[itemId] || [])]
        },
        items: state.items.map(item => 
          item.id === itemId ? { ...item, commentsCount: (item.commentsCount || 0) + 1 } : item
        )
      }));
    } catch (error) {
      console.error("Error adding OLX comment:", error);
      throw error;
    }
  },

  editComment: async (itemId, commentId, message) => {
    try {
      const commentRef = doc(db, `campusOlx/${itemId}/comments`, commentId);
      await updateDoc(commentRef, { message });
      
      set(state => ({
        comments: {
          ...state.comments,
          [itemId]: (state.comments[itemId] || []).map(comment => 
            comment.id === commentId ? { ...comment, message } : comment
          )
        }
      }));
    } catch (error) {
      console.error("Error editing OLX comment:", error);
      throw error;
    }
  },

  replyToComment: async (itemId, commentId, replyText) => {
    try {
      const commentRef = doc(db, `campusOlx/${itemId}/comments`, commentId);
      await updateDoc(commentRef, { ownerReply: replyText });
      
      set(state => ({
        comments: {
          ...state.comments,
          [itemId]: (state.comments[itemId] || []).map(comment => 
            comment.id === commentId ? { ...comment, ownerReply: replyText } : comment
          )
        }
      }));
    } catch (error) {
      console.error("Error replying to OLX comment:", error);
      throw error;
    }
  },

  editReply: async (itemId, commentId, replyText) => {
    try {
      const commentRef = doc(db, `campusOlx/${itemId}/comments`, commentId);
      await updateDoc(commentRef, { ownerReply: replyText });
      
      set(state => ({
        comments: {
          ...state.comments,
          [itemId]: (state.comments[itemId] || []).map(comment => 
            comment.id === commentId ? { ...comment, ownerReply: replyText } : comment
          )
        }
      }));
    } catch (error) {
      console.error("Error editing OLX reply:", error);
      throw error;
    }
  },

  deleteComment: async (itemId, commentId) => {
    try {
      await deleteDoc(doc(db, `campusOlx/${itemId}/comments`, commentId));
      set(state => {
        const itemComments = state.comments[itemId] || [];
        return {
          comments: {
            ...state.comments,
            [itemId]: itemComments.filter(c => c.id !== commentId)
          }
        };
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  },

  
  reportItem: async (itemId: string, reason: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not authenticated");
      const { items } = get();
      const itemState = items.find(i => i.id === itemId);
      const reportRef = doc(db, 'reports', `report_${currentUser.uid}_olx_${itemId}`);
      await setDoc(reportRef, {
        targetId: itemId,
        targetType: 'olx_item',
        reason,
        reportedAt: serverTimestamp(),
        reportedByCount: 1,
        status: 'pending',
        targetContent: itemState?.title || 'Unknown OLX Item',
        authorUid: itemState?.authorUid || null,
        reporterId: currentUser.uid,
        reporterName: currentUser.displayName || currentUser.email || 'Anonymous'
      });
    } catch (error) {
      console.error("Error reporting item:", error);
      throw error;
    }
  },

  reportComment: async (itemId, commentId, reason) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not authenticated");
      const { comments } = get();
      const itemComments = comments[itemId] || [];
      const commentState = itemComments.find(c => c.id === commentId);
      const reportRef = doc(db, 'reports', `report_${currentUser.uid}_olx_comment_${commentId}`);
      await setDoc(reportRef, {
        targetId: commentId,
        targetType: 'olx_comment',
        reason,
        reportedAt: serverTimestamp(),
        reportedByCount: 1,
        status: 'pending',
        targetContent: commentState?.message || 'Unknown Comment',
        authorUid: commentState?.applicantUid || null,
        reporterId: currentUser.uid,
        reporterName: currentUser.displayName || currentUser.email || 'Anonymous',
        parentId: itemId
      });
    } catch (error) {
      console.error("Error reporting comment:", error);
      throw error;
    }
  },

  deleteReply: async (itemId, commentId) => {
    try {
      const commentRef = doc(db, `campusOlx/${itemId}/comments`, commentId);
      await updateDoc(commentRef, { ownerReply: null }); // Using null to remove it

      set(state => {
        const itemComments = state.comments[itemId] || [];
        return {
          comments: {
            ...state.comments,
            [itemId]: itemComments.map(c => 
              c.id === commentId ? { ...c, ownerReply: undefined } : c
            )
          }
        };
      });
    } catch (error) {
      console.error("Error deleting reply:", error);
      throw error;
    }
  }
}));
