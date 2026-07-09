import { create } from 'zustand';
import { db } from '@/config/firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, getDoc, serverTimestamp } from 'firebase/firestore';

export interface GigUpdate {
  id: string;
  text: string;
  createdAt: string;
}

export interface Gig {
  id: string;
  title: string;
  description: string;
  rewardType: string;
  customReward?: string;
  authorUid: string;
  authorName: string;
  authorPhoto?: string;
  authorRole?: string;
  authorAdminRole?: string;
  authorUsername?: string;
  status: 'open' | 'closed';
  createdAt: string;
  applicationsCount?: number;
  publicUpdates?: GigUpdate[];
}

export interface GigApplication {
  id: string;
  gigId: string;
  applicantUid: string;
  applicantName: string;
  applicantPhoto?: string;
  applicantRole?: string;
  applicantAdminRole?: string;
  applicantIsVerified?: boolean;
  message: string;
  createdAt: string;
  ownerReply?: string;
}

interface GigsState {
  gigs: Gig[];
  applications: Record<string, GigApplication[]>; // Keyed by gigId
  loading: boolean;
  
  fetchGigs: () => Promise<void>;
  createGig: (data: Omit<Gig, 'id' | 'createdAt'>) => Promise<void>;
  updateGig: (gigId: string, data: Partial<Omit<Gig, 'id' | 'createdAt' | 'authorUid'>>) => Promise<void>;
  updateGigStatus: (gigId: string, status: 'open' | 'closed') => Promise<void>;
  deleteGig: (gigId: string) => Promise<void>;
  
  fetchApplications: (gigId: string) => Promise<void>;
  applyToGig: (gigId: string, data: Omit<GigApplication, 'id' | 'gigId' | 'createdAt'>) => Promise<void>;
  replyToApplication: (gigId: string, applicationId: string, reply: string) => Promise<void>;
  editApplication: (gigId: string, applicationId: string, newText: string) => Promise<void>;
  deleteApplication: (gigId: string, applicationId: string) => Promise<void>;
  editReply: (gigId: string, applicationId: string, newText: string) => Promise<void>;
  deleteReply: (gigId: string, applicationId: string) => Promise<void>;
  reportApplication: (gigId: string, applicationId: string, reason: string) => Promise<void>;
  reportGig: (gigId: string, reason: string) => Promise<void>;
  addPublicUpdate: (gigId: string, text: string) => Promise<void>;
}

export const useGigsStore = create<GigsState>((set, get) => ({
  gigs: [],
  applications: {},
  loading: false,

  fetchGigs: async () => {
    try {
      set({ loading: true });
      const gigsRef = collection(db, 'gigs');
      const q = query(gigsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const gigsList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
        } as Gig;
      });
      set({ gigs: gigsList, loading: false });
    } catch (error) {
      console.error("Error fetching gigs:", error);
      set({ loading: false });
    }
  },

  createGig: async (data) => {
    try {
const { useAppStore } = require('./useAppStore');
      const currentUser = useAppStore.getState().user;
      
      const newGig = {
        ...data,
        authorUid: currentUser?.uid || '',
        authorName: currentUser?.name || 'Anonymous',
        authorPhoto: currentUser?.photoUrl || '',
        authorRole: currentUser?.role || '',
        authorAdminRole: currentUser?.adminRole || '',
        status: 'open',
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'gigs'), newGig);
      
      // Update local state with ISO string for Date
      const gigWithId = { 
        ...newGig, 
        id: docRef.id,
        createdAt: new Date().toISOString()
      } as Gig;
      
      set(state => ({ gigs: [gigWithId, ...state.gigs] }));
    } catch (error) {
      console.error("Error creating gig:", error);
      throw error;
    }
  },

  updateGig: async (gigId, data) => {
    try {
      await updateDoc(doc(db, 'gigs', gigId), data);
      set(state => ({
        gigs: state.gigs.map(gig => gig.id === gigId ? { ...gig, ...data } : gig)
      }));
    } catch (error) {
      console.error("Error updating gig:", error);
      throw error;
    }
  },

  updateGigStatus: async (gigId, status) => {
    try {
      await updateDoc(doc(db, 'gigs', gigId), { status });
      set(state => ({
        gigs: state.gigs.map(gig => gig.id === gigId ? { ...gig, status } : gig)
      }));
    } catch (error) {
      console.error("Error updating gig status:", error);
      throw error;
    }
  },

  deleteGig: async (gigId) => {
    try {
      await deleteDoc(doc(db, 'gigs', gigId));
      set(state => ({
        gigs: state.gigs.filter(gig => gig.id !== gigId)
      }));
    } catch (error) {
      console.error("Error deleting gig:", error);
      throw error;
    }
  },

  fetchApplications: async (gigId) => {
    try {
      const appsRef = collection(db, 'gigs', gigId, 'applications');
      const q = query(appsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const apps = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          gigId,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
        } as GigApplication;
      });
      set(state => ({
        applications: {
          ...state.applications,
          [gigId]: apps
        }
      }));
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  },

  applyToGig: async (gigId, data) => {
    try {
      const newApp = {
        ...data,
        createdAt: new Date().toISOString(),
      };
      const appsRef = collection(db, 'gigs', gigId, 'applications');
const { addDoc, serverTimestamp } = require('firebase/firestore');
      const docRef = await addDoc(appsRef, {
        ...newApp,
        createdAt: serverTimestamp(),
      });
      set(state => ({
        applications: {
          ...state.applications,
          [gigId]: [
            { id: docRef.id, gigId, ...newApp } as GigApplication,
            ...(state.applications[gigId] || [])
          ]
        }
      }));
    } catch (error) {
      console.error("Error applying to gig:", error);
      throw error;
    }
  },

  replyToApplication: async (gigId, applicationId, reply) => {
    try {
const { doc, updateDoc, setDoc, serverTimestamp } = require('firebase/firestore');
      
      await updateDoc(doc(db, 'gigs', gigId, 'applications', applicationId), {
        ownerReply: reply
      });
      
      const appState = get().applications[gigId]?.find(a => a.id === applicationId);
      if (appState && appState.applicantUid) {
        // Send notification to applicant
const { useAppStore } = require('./useAppStore');
        const currentUser = useAppStore.getState().user;
        const activeGig = get().gigs.find(g => g.id === gigId);
        
        if (currentUser && activeGig) {
          const notifRef = doc(db, 'users', appState.applicantUid, 'notifications', `gig_reply_${applicationId}`);
          setDoc(notifRef, {
            id: `gig_reply_${applicationId}`,
            type: 'gig_reply',
            sourceUid: currentUser.uid,
            sourceName: currentUser.name || 'Author',
            sourcePhoto: currentUser.photoUrl || '',
            targetId: gigId,
            content: `Replied to your application on: ${activeGig.title}`,
            isRead: false,
            createdAt: serverTimestamp()
          }).catch((err: any) => console.log('Non-fatal error creating gig reply notification', err));
        }
      }

      set(state => ({
        applications: {
          ...state.applications,
          [gigId]: (state.applications[gigId] || []).map(app => 
            app.id === applicationId ? { ...app, ownerReply: reply } : app
          )
        }
      }));
    } catch (error) {
      console.error("Error replying to application:", error);
      throw error;
    }
  },

  editApplication: async (gigId, applicationId, newText) => {
    try {
const { doc, updateDoc } = require('firebase/firestore');
      await updateDoc(doc(db, 'gigs', gigId, 'applications', applicationId), {
        message: newText
      });
      set(state => ({
        applications: {
          ...state.applications,
          [gigId]: (state.applications[gigId] || []).map(app => 
            app.id === applicationId ? { ...app, message: newText } : app
          )
        }
      }));
    } catch (error) {
      console.error("Error editing application:", error);
      throw error;
    }
  },

  deleteApplication: async (gigId, applicationId) => {
    try {
const { doc, deleteDoc } = require('firebase/firestore');
      await deleteDoc(doc(db, 'gigs', gigId, 'applications', applicationId));
      set(state => ({
        applications: {
          ...state.applications,
          [gigId]: (state.applications[gigId] || []).filter(app => app.id !== applicationId)
        }
      }));
    } catch (error) {
      console.error("Error deleting application:", error);
      throw error;
    }
  },

  editReply: async (gigId, applicationId, newText) => {
    try {
const { doc, updateDoc } = require('firebase/firestore');
      await updateDoc(doc(db, 'gigs', gigId, 'applications', applicationId), {
        ownerReply: newText
      });
      set(state => ({
        applications: {
          ...state.applications,
          [gigId]: (state.applications[gigId] || []).map(app => 
            app.id === applicationId ? { ...app, ownerReply: newText } : app
          )
        }
      }));
    } catch (error) {
      console.error("Error editing reply:", error);
      throw error;
    }
  },

  deleteReply: async (gigId, applicationId) => {
    try {
const { doc, updateDoc, deleteField } = require('firebase/firestore');
      await updateDoc(doc(db, 'gigs', gigId, 'applications', applicationId), {
        ownerReply: deleteField()
      });
      set(state => ({
        applications: {
          ...state.applications,
          [gigId]: (state.applications[gigId] || []).map(app => {
            const updatedApp = { ...app };
            delete updatedApp.ownerReply;
            return updatedApp;
          })
        }
      }));
    } catch (error) {
      console.error("Error deleting reply:", error);
      throw error;
    }
  },

  reportApplication: async (gigId, applicationId, reason) => {
    try {
const { useAppStore } = require('./useAppStore');
      const currentUser = useAppStore.getState().user;
      if (!currentUser) return;
const { doc, setDoc, serverTimestamp } = require('firebase/firestore');
      
      const appState = get().applications[gigId]?.find(a => a.id === applicationId);
      
      const reportRef = doc(db, 'reports', `report_${currentUser.uid}_app_${applicationId}`);
      await setDoc(reportRef, {
        type: 'gig_application',
        targetId: applicationId,
        gigId: gigId,
        targetPreview: appState?.message?.substring(0, 50) || 'No preview',
        reportedByCount: 1,
        lastReportReason: reason,
        status: 'pending',
        createdAt: serverTimestamp(),
        reporterId: currentUser.uid,
        reporterName: currentUser.name || currentUser.email || 'Anonymous',
        reportedUserId: appState?.applicantUid || null
      });
    } catch (error) {
      console.error("Error reporting application:", error);
      throw error;
    }
  },


  reportGig: async (gigId: string, reason: string) => {
    try {
      // Find gig locally for preview
      const activeGig = get().gigs.find(g => g.id === gigId);
      
      // we need to access user from app store. We can import it or pass it.
      // Better to just use AppStore since it's global
const { useAppStore } = require('./useAppStore');
      const currentUser = useAppStore.getState().user;
      
      if (!currentUser) return;
      
const { doc, setDoc, serverTimestamp } = require('firebase/firestore');
      
      const reportRef = doc(db, 'reports', `report_${currentUser.uid}_${gigId}`);
      await setDoc(reportRef, {
        type: 'gig',
        targetId: gigId,
        targetPreview: activeGig?.title || 'No preview',
        reportedByCount: 1,
        lastReportReason: reason,
        status: 'pending',
        createdAt: serverTimestamp(),
        reporterId: currentUser.uid,
        reporterName: currentUser.name || currentUser.email || 'Anonymous'
      });
    } catch (error) {
      console.error("Error reporting gig:", error);
      throw error;
    }
  },

  addPublicUpdate: async (gigId: string, text: string) => {
    try {
      const gigRef = doc(db, 'gigs', gigId);
      const gigDoc = await getDoc(gigRef);
      if (!gigDoc.exists()) throw new Error('Gig not found');
      
      const newUpdate = {
        id: Date.now().toString(),
        text,
        createdAt: new Date().toISOString()
      };
      
      const currentUpdates = gigDoc.data().publicUpdates || [];
      const updatedUpdates = [...currentUpdates, newUpdate];
      
      await updateDoc(gigRef, { publicUpdates: updatedUpdates });
      
      set(state => ({
        gigs: state.gigs.map(g => g.id === gigId ? { ...g, publicUpdates: updatedUpdates } : g)
      }));
    } catch (error) {
      console.error("Error adding public update:", error);
      throw error;
    }
  }
}));
