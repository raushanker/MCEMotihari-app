import { create } from 'zustand';
import { db } from '@/config/firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, getDoc, serverTimestamp } from 'firebase/firestore';

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
  status: 'open' | 'closed';
  createdAt: string;
  applicationsCount?: number;
}

export interface GigApplication {
  id: string;
  gigId: string;
  applicantUid: string;
  applicantName: string;
  applicantPhoto?: string;
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
  reportGig: (gigId: string, reason: string) => Promise<void>;
}

export const useGigsStore = create<GigsState>((set, get) => ({
  gigs: [],
  applications: {},
  loading: false,

  fetchGigs: async () => {
    set({ loading: true });
    try {
      const q = query(collection(db, 'gigs'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetchedGigs: Gig[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        fetchedGigs.push({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt 
        } as Gig);
      });
      set({ gigs: fetchedGigs, loading: false });
    } catch (error) {
      console.error("Error fetching gigs:", error);
      set({ loading: false });
    }
  },

  createGig: async (data) => {
    try {
      const newGig = {
        ...data,
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'gigs'), {
        ...newGig,
        createdAt: serverTimestamp(),
      });
      set(state => ({
        gigs: [{ id: docRef.id, ...newGig } as Gig, ...state.gigs]
      }));
    } catch (error) {
      console.error("Error creating gig:", error);
      throw error;
    }
  },

  updateGig: async (gigId, data) => {
    try {
      await updateDoc(doc(db, 'gigs', gigId), data);
      set(state => ({
        gigs: state.gigs.map(g => g.id === gigId ? { ...g, ...data } : g)
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
        gigs: state.gigs.map(g => g.id === gigId ? { ...g, status } : g)
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
        gigs: state.gigs.filter(g => g.id !== gigId)
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
      const apps: GigApplication[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        apps.push({ 
          id: doc.id, 
          gigId, 
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
        } as GigApplication);
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
      await updateDoc(doc(db, 'gigs', gigId, 'applications', applicationId), {
        ownerReply: reply
      });
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
  }
}));
