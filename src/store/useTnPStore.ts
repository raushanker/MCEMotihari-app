import { create } from 'zustand';
import { db } from '@/config/firebase'; // Assuming there is a firebase config
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export interface Brochure {
  id: string;
  title: string;
  url: string;
  year: string;
}

export interface PlacementList {
  id: string;
  title: string;
  url: string;
  batch: string;
}

interface TnPState {
  brochures: Brochure[];
  placementLists: PlacementList[];
  isFetching: boolean;
  fetchData: () => Promise<void>;
}

// Static fallbacks extracted from the website screenshots
const STATIC_BROCHURES: Brochure[] = [
  { id: 'b1', title: 'T&P Brochure 2022-23', year: '2022-23', url: 'https://www.mcemotihari.ac.in/wp-content/uploads/2022/12/MCE_TnP_2022-23.pdf' },
  { id: 'b2', title: 'T&P Brochure 2021-22', year: '2021-22', url: 'https://www.mcemotihari.ac.in/wp-content/uploads/2022/12/MCE_TnP_2021-22.pdf' },
  { id: 'b3', title: 'T&P Brochure 2020-21', year: '2020-21', url: 'https://www.mcemotihari.ac.in/wp-content/uploads/2022/12/MCE_TnP_2020-21.pdf' },
  { id: 'b4', title: 'T&P Brochure 2019-20', year: '2019-20', url: 'https://www.mcemotihari.ac.in/wp-content/uploads/2020/06/NEW-TP-BROCHURE-FINAL-2019-20.pdf' },
  { id: 'b5', title: 'T&P Brochure 2018-19', year: '2018-19', url: 'https://www.mcemotihari.ac.in/wp-content/uploads/2019/03/TP-Brochure-converted.pdf' },
];

const STATIC_PLACEMENT_LISTS: PlacementList[] = [
  { id: 'p1', title: 'Placement Drive 2024 Pass-out Batch', batch: '2024', url: 'https://www.mcemotihari.ac.in/wp-content/uploads/2024/08/Placement-Records-1.pdf' },
  { id: 'p2', title: 'Placement Drive 2023 Pass-out Batch', batch: '2023', url: 'https://www.mcemotihari.ac.in/wp-content/uploads/2024/08/2023-placement.pdf' },
  { id: 'p3', title: 'Placement Drive 2022 Pass-out Batch', batch: '2022', url: 'https://www.mcemotihari.ac.in/wp-content/uploads/2022/12/2022XPlacements.pdf' },
  { id: 'p4', title: 'Placement Drive 2021 Pass-out Batch', batch: '2021', url: 'https://www.mcemotihari.ac.in/wp-content/uploads/2022/12/2021XPlacement.pdf' },
  { id: 'p5', title: 'Placement Drive 2020 Pass-out Batch', batch: '2020', url: 'https://www.mcemotihari.ac.in/wp-content/uploads/2022/12/2020XPlacements.pdf' },
  { id: 'p6', title: 'Placement Drive 2019 Pass-out Batch', batch: '2019', url: 'https://www.mcemotihari.ac.in/wp-content/uploads/2019/03/final_1-1.docx' },
];

export const useTnPStore = create<TnPState>((set) => ({
  brochures: STATIC_BROCHURES,
  placementLists: STATIC_PLACEMENT_LISTS,
  isFetching: false,
  
  fetchData: async () => {
    set({ isFetching: true });
    try {
      // Try to fetch from Firebase
      const brochuresSnapshot = await getDocs(query(collection(db, 'tnp_brochures'), orderBy('year', 'desc')));
      const listsSnapshot = await getDocs(query(collection(db, 'tnp_placement_lists'), orderBy('batch', 'desc')));
      
      let fetchedBrochures: Brochure[] = [];
      let fetchedLists: PlacementList[] = [];
      
      brochuresSnapshot.forEach((doc) => {
        fetchedBrochures.push({ id: doc.id, ...doc.data() } as Brochure);
      });
      
      listsSnapshot.forEach((doc) => {
        fetchedLists.push({ id: doc.id, ...doc.data() } as PlacementList);
      });

      // If Firebase has data, override the static data
      if (fetchedBrochures.length > 0) {
        set({ brochures: fetchedBrochures });
      }
      
      if (fetchedLists.length > 0) {
        set({ placementLists: fetchedLists });
      }
      
    } catch (error) {
      console.log('Error fetching T&P data from Firebase, falling back to static data:', error);
      // On error (e.g. offline, permissions), we just rely on the static data already set as default.
    } finally {
      set({ isFetching: false });
    }
  }
}));
