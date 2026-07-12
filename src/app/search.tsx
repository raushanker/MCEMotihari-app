import PdfViewerModal from '@/components/modals/PdfViewerModal';
import { DetailModal } from '@/components/modals/DetailModal';
import { db } from '@/config/firebase';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { STARTUPS_DATA } from '@/app/ecell/startups';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    
    TouchableOpacity,
    View,
    Modal,
    TouchableWithoutFeedback
, TextInput as RNTextInput} from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const TypedFlashList = FlashList as any;

const SEARCH_HISTORY_KEY = '@mce_search_history';
const MAX_HISTORY_ITEMS = 10;
type TabType = 'All' | 'Profiles' | 'Materials' | 'Posts' | 'Events' | 'Features';

interface SearchProfile {
  id: string;
  name: string;
  username?: string;
  role: string;
  branch?: string;
  photoUrl?: string;
  organization?: string;
  company?: string;
  bio?: string;
  experiences?: {
    company: string;
    role: string;
    isCurrent: boolean;
  }[];
  education?: {
    school: string;
    degree: string;
    fieldOfStudy: string;
  }[];
}

interface SearchPost {
  id: string;
  text: string;
  authorName: string;
  authorRole?: string;
}

interface SearchMaterial {
  id: string;
  title: string;
  subject?: string;
  tags?: string[];
  documentType?: string;
  url?: string;
  fileName?: string;
  files?: any[];
}

interface SearchEvent {
  id: string;
  title: string;
  desc: string;
  category: string;
  date: string;
}

type SearchResultItem = 
  | ({ type: 'profile' } & SearchProfile)
  | ({ type: 'post' } & SearchPost)
  | ({ type: 'material' } & SearchMaterial)
  | ({ type: 'event' } & SearchEvent)
  | ({ type: 'feature' } & SearchFeature);

interface SearchFeature {
  id: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
  route: string;
  subtitlePrefix?: string;
}

const APP_FEATURES: SearchFeature[] = [
  { id: 'f-lib', title: 'Central Library', desc: 'Books, Journals, and reading materials', icon: 'library-outline', color: '#6366F1', route: '/library' },
  { id: 'f-sports', title: 'Sports Facilities', desc: 'Outdoor and indoor games, cricket, volleyball, badminton', icon: 'football-outline', color: '#10B981', route: '/sports' },
  { id: 'f-canteen', title: 'College Canteen', desc: 'Order food online, menu, cafeteria', icon: 'fast-food-outline', color: '#F59E0B', route: '/canteen' },
  { id: 'f-stationary', title: 'Stationary Store', desc: 'Scientific calci, Minidrafter, Engineering books, Notebook, A4 Pages, Scale, Pen drive, Pencil, Colours, Chartpapers', icon: 'color-palette-outline', color: '#10B981', route: '/stationary' },
  { id: 'f-ecell', title: 'E-Cell & Startups', desc: 'Entrepreneurship cell, startups, business', icon: 'bulb-outline', color: '#EAB308', route: '/ecell' },
  { id: 'f-alumni', title: 'Alumni Association (MCEAA)', desc: 'Connect with alumni network', icon: 'people-outline', color: '#8B5CF6', route: '/explore' },
  { id: 'f-nss', title: 'NSS', desc: 'National Service Scheme', icon: 'leaf-outline', color: '#22C55E', route: '/nss' },
  { id: 'f-clubs', title: 'Clubs & Societies', desc: 'Technical, Cultural, and Sports clubs', icon: 'planet-outline', color: '#EAB308', route: '/clubs' },
  { id: 'f-hostels', title: 'Hostels & Mess', desc: 'Boys and Girls hostels, mess routines', icon: 'home-outline', color: '#8B5CF6', route: '/hostels' },
  { id: 'f-settings', title: 'Settings', desc: 'App preferences and configurations', icon: 'settings-outline', color: '#64748B', route: '/settings' },
  { id: 'f-depts', title: 'Departments', desc: 'Academic streams, CSE, EE, ME, CE', icon: 'school-outline', color: '#F97316', route: '/departments' },
  { id: 'f-syllabus', title: 'Syllabus', desc: 'BEU B.Tech curriculum and syllabus', icon: 'book-outline', color: '#10B981', route: '/syllabus' },
];

export default function SearchScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  
  const { type: searchType } = useLocalSearchParams<{ type?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('Profiles');
  const [profileSubFilter, setProfileSubFilter] = useState<'All' | 'Student' | 'Alumni' | 'Faculty' | 'Others'>('All');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentlyViewedItems, setRecentlyViewedItems] = useState<SearchResultItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [materials, setMaterials] = useState<SearchMaterial[]>([]);
  const [events, setEvents] = useState<SearchEvent[]>([]);

  const [activePdfUrl, setActivePdfUrl] = useState('');
  const [activePdfTitle, setActivePdfTitle] = useState('');
  const [isPdfVisible, setIsPdfVisible] = useState(false);
  const [selectedMultiFileItem, setSelectedMultiFileItem] = useState<SearchMaterial | null>(null);

  const inputRef = useRef<RNTextInput>(null);

  useEffect(() => {
    loadSearchHistory();
    // Lazy load search data only when user actually searches
    setTimeout(() => {
      inputRef.current?.focus();
    }, 200);
  }, []);

  useEffect(() => {
    if (searchType === 'profiles') {
      setActiveTab('Profiles');
    }
  }, [searchType]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      fetchBaseData();
    }
  }, [searchQuery]);

  const loadSearchHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
      const storedViewed = await AsyncStorage.getItem('@mce_recently_viewed_items');
      if (storedViewed) {
        setRecentlyViewedItems(JSON.parse(storedViewed));
      }
    } catch (e) {
      console.error('Failed to load search history', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveToHistory = async (queryToSave: string) => {
    const q = queryToSave.trim();
    if (!q) return;
    try {
      const filtered = recentSearches.filter(item => item.toLowerCase() !== q.toLowerCase());
      const updated = [q, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      setRecentSearches(updated);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save search history', e);
    }
  };

  const removeHistoryItem = async (queryToRemove: string) => {
    try {
      const updated = recentSearches.filter(q => q !== queryToRemove);
      setRecentSearches(updated);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to remove history item', e);
    }
  };

  const fetchBaseData = async () => {
    if (dataLoaded) return;
    setIsLoadingData(true);
    try {
      // Optimized: reduced limits from 500→200, 150→50
      const profilesSnap = await getDocs(query(collection(db, 'publicProfiles'), limit(200)));
      const fetchedProfiles: SearchProfile[] = [];
      profilesSnap.forEach(docSnap => {
        const d = docSnap.data();
        if (d.isHidden === true) return;
        const exps = d.experiences || [];
        const edus = d.education || [];
        const currentExp = exps.find((exp: any) => exp.isCurrent) || exps[0];
        const resolvedOrg = d.organization || d.company || (currentExp ? (currentExp.role ? `${currentExp.role} at ${currentExp.company}` : currentExp.company) : '');

        fetchedProfiles.push({
          id: docSnap.id,
          name: d.name || 'Unknown',
          username: d.username,
          role: d.role || 'Student',
          branch: d.branch || d.department || '',
          photoUrl: d.photoUrl,
          organization: resolvedOrg,
          bio: d.bio || d.about || '',
          experiences: exps,
          education: edus
        });
      });

      const postsSnap = await getDocs(query(collection(db, 'posts'), limit(50)));
      const fetchedPosts: SearchPost[] = [];
      postsSnap.forEach(docSnap => {
        const d = docSnap.data();
        fetchedPosts.push({
          id: docSnap.id,
          text: d.text || d.content || '',
          authorName: d.authorName || 'Unknown',
          authorRole: d.authorRole
        });
      });

      const matSnap = await getDocs(query(collection(db, 'study_material_submissions'), where('status', '==', 'APPROVED'), limit(50)));
      const fetchedMaterials: SearchMaterial[] = [];
      matSnap.forEach(docSnap => {
        const d = docSnap.data();
        fetchedMaterials.push({
          id: docSnap.id,
          title: d.title || 'Untitled',
          subject: d.semester || '',
          tags: [d.branch || '', d.materialType || '', d.semester || ''],
          documentType: d.materialType,
          url: d.directUrl || d.fileUrl || d.webViewUrl || d.url || '',
          fileName: d.fileName || '',
          files: d.files || []
        });
      });

      const storedEvents = await AsyncStorage.getItem('@mce_campus_events');
      let fetchedEvents: SearchEvent[] = [];
      if (storedEvents) {
        fetchedEvents = JSON.parse(storedEvents).map((e: any) => ({
          id: e.id,
          title: e.title || '',
          desc: e.desc || '',
          category: e.category || '',
          date: e.date || ''
        }));
      }

      setProfiles(fetchedProfiles);
      setPosts(fetchedPosts);
      setMaterials(fetchedMaterials);
      setEvents(fetchedEvents);
      setDataLoaded(true);
    } catch (e) {
      console.warn('Failed to fetch base data for search', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const getFilteredResults = (): SearchResultItem[] => {
    if (!searchQuery.trim()) return [];

    const queryLower = searchQuery.toLowerCase().trim();
    const tokens = queryLower.split(/\s+/);
    
    const isMatch = (target: string) => {
      if (!target) return false;
      const targetLower = target.toLowerCase();
      return tokens.every(token => targetLower.includes(token));
    };

    let results: SearchResultItem[] = [];

    if (activeTab === 'All' || activeTab === 'Profiles') {
      let pRes = profiles.filter(p => {
        const expText = (p.experiences || []).map((exp: any) => `${exp.company || ''} ${exp.role || ''}`).join(' ');
        const eduText = (p.education || []).map((edu: any) => `${edu.school || ''} ${edu.degree || ''} ${edu.fieldOfStudy || ''}`).join(' ');
        const combinedText = `${p.name} ${p.username || ''} ${p.role} ${p.branch || ''} ${p.organization || ''} ${p.company || ''} ${p.bio || ''} ${expText} ${eduText}`.toLowerCase();
        
        return tokens.every(token => combinedText.includes(token));
      });

      // If activeTab is Profiles or searchType is profiles, apply user type sub-filter
      if (searchType === 'profiles' || activeTab === 'Profiles') {
        if (profileSubFilter !== 'All') {
          if (profileSubFilter === 'Others') {
            pRes = pRes.filter(p => !['student', 'alumni', 'faculty'].includes(p.role.toLowerCase()));
          } else {
            pRes = pRes.filter(p => p.role.toLowerCase() === profileSubFilter.toLowerCase());
          }
        }
      }

      results = [...results, ...pRes.map(p => ({ ...p, type: 'profile' as const }))];
    }

    if (activeTab === 'All' || activeTab === 'Materials') {
      const mRes = materials.filter(m => 
        isMatch(m.title) || 
        isMatch(m.subject || '') || 
        isMatch(m.fileName || '') ||
        (m.files && m.files.some((f: any) => isMatch(f.fileName))) ||
        m.tags?.some(tag => isMatch(tag))
      ).map(m => ({ ...m, type: 'material' as const }));
      results = [...results, ...mRes];
    }

    if (activeTab === 'All' || activeTab === 'Posts') {
      const poRes = posts.filter(p => 
        isMatch(p.text) || 
        isMatch(p.authorName)
      ).map(p => ({ ...p, type: 'post' as const }));
      results = [...results, ...poRes];
    }

    if (activeTab === 'All' || activeTab === 'Events') {
      const eRes = events.filter(e => 
        isMatch(e.title) || 
        isMatch(e.desc) || 
        isMatch(e.category)
      ).map(e => ({ ...e, type: 'event' as const }));
      results = [...results, ...eRes];
    }

    if (activeTab === 'All' || activeTab === 'Features') {
      const startupFeatures: SearchFeature[] = STARTUPS_DATA.map(s => ({
        id: `startup-${s.id}`,
        title: s.name,
        desc: `${s.domain} • Founder: ${s.founder}`,
        icon: 'rocket-outline',
        color: '#EAB308',
        route: '/ecell/startups',
        subtitlePrefix: 'Startup'
      }));
      
      const allFeatures = [...APP_FEATURES, ...startupFeatures];
      
      const fRes = allFeatures.filter(f => 
        isMatch(f.title) || 
        isMatch(f.desc)
      ).map(f => ({ ...f, type: 'feature' as const }));
      results = [...results, ...fRes];
    }

    return results;
  };

  const filteredResults = useMemo(() => getFilteredResults(), [searchQuery, activeTab, profileSubFilter, dataLoaded, profiles, posts, materials, events]);

  const handleClearInput = () => {
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleResultPress = async (item: SearchResultItem) => {
    saveToHistory(searchQuery);
    try {
      let recent = [item, ...recentlyViewedItems.filter(i => i.id !== item.id)].slice(0, 5);
      setRecentlyViewedItems(recent);
      await AsyncStorage.setItem('@mce_recently_viewed_items', JSON.stringify(recent));
    } catch (e) {
      console.warn('Failed to save recently viewed item', e);
    }
    Keyboard.dismiss();
    
    switch (item.type) {
      case 'feature':
        if (item.route.startsWith('modal:')) {
           router.push('/explore' as any); // fallback for modal routes
        } else {
           router.push(item.route as any);
        }
        break;
      case 'profile':
        if (item.username) {
          router.push(`/@${item.username}?from=search` as any);
        } else {
          router.push(`/@${item.id}?from=search` as any);
        }
        break;
      case 'post':
        router.push(`/post/${item.id}?from=search` as any);
        break;
      case 'material':
        if (item.files && item.files.length > 1) {
          setSelectedMultiFileItem(item);
        } else if (item.url) {
          setActivePdfUrl(item.url);
          setActivePdfTitle(item.title);
          setIsPdfVisible(true);
        } else {
          router.push(`/study/${item.id}` as any);
        }
        break;
      case 'event':
        // No direct event page usually, but if it exists, push to it. Otherwise maybe explore modal.
        router.push(`/explore` as any);
        break;
    }
  };

  const renderTabs = () => {
    if (searchType === 'profiles') return null;
    const tabs: TabType[] = ['All', 'Profiles', 'Materials', 'Posts', 'Events', 'Features'];
    return (
      <View style={[styles.tabsWrapper, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabChip,
                  { 
                    backgroundColor: isActive ? theme.primary : 'transparent',
                    borderColor: isActive ? theme.primary : theme.cardBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4
                  }
                ]}
                onPress={() => {
                  if (tab === 'Profiles') {
                    if (!isActive) setActiveTab('Profiles');
                    setIsProfileDropdownOpen(true);
                  } else {
                    setActiveTab(tab);
                  }
                }}
              >
                <Text style={[
                  styles.tabText,
                  { color: isActive ? '#FFFFFF' : theme.textSecondary, fontWeight: isActive ? '700' : '500' }
                ]}>
                  {tab === 'Profiles' && profileSubFilter !== 'All' ? `Profiles: ${profileSubFilter}` : tab}
                </Text>
                {tab === 'Profiles' && (
                  <Ionicons name="chevron-down" size={14} color={isActive ? '#FFFFFF' : theme.textSecondary} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderResultItem = ({ item }: { item: SearchResultItem }) => {
    if (item.type === 'profile') {
      return (
        <TouchableOpacity style={[styles.resultCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} onPress={() => handleResultPress(item)}>
          <View style={styles.resultHeader}>
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.profileImage} cachePolicy="memory-disk" />
            ) : (
              <View style={[styles.profileImage, { backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person" size={24} color="#3B82F6" />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.resultSub, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.role} {item.branch ? `• ${item.branch}` : ''} {item.organization ? `• ${item.organization}` : ''}
              </Text>
              {!!item.bio && (
                <Text style={[styles.bioText, { color: theme.textSecondary, marginTop: 4 }]} numberOfLines={1}>{item.bio}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.cardBorder} />
          </View>
        </TouchableOpacity>
      );
    }
    
    if (item.type === 'material') {
      return (
        <TouchableOpacity style={[styles.resultCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} onPress={() => handleResultPress(item)}>
          <View style={styles.resultHeader}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
              <Ionicons name="document-text" size={20} color="#F97316" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.resultSub, { color: theme.textSecondary }]} numberOfLines={1}>
                Study Material {item.subject ? `• ${item.subject}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.cardBorder} />
          </View>
        </TouchableOpacity>
      );
    }

    if (item.type === 'post') {
      return (
        <TouchableOpacity style={[styles.resultCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} onPress={() => handleResultPress(item)}>
          <View style={styles.resultHeader}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={2}>{item.text}</Text>
              <Text style={[styles.resultSub, { color: theme.textSecondary }]} numberOfLines={1}>
                Posted by {item.authorName}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.cardBorder} />
          </View>
        </TouchableOpacity>
      );
    }

    if (item.type === 'event') {
      return (
        <TouchableOpacity style={[styles.resultCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} onPress={() => handleResultPress(item)}>
          <View style={styles.resultHeader}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="calendar" size={20} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.resultSub, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.category} • {item.date}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.cardBorder} />
          </View>
        </TouchableOpacity>
      );
    }
    
    if (item.type === 'feature') {
      return (
        <TouchableOpacity style={[styles.resultCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} onPress={() => handleResultPress(item)}>
          <View style={styles.resultHeader}>
            <View style={[styles.iconBox, { backgroundColor: `${item.color}20` }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.resultSub, { color: theme.textSecondary }]} numberOfLines={2}>
                {item.subtitlePrefix || 'App Feature'} • {item.desc}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.cardBorder} />
          </View>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement, paddingTop: insets.top + 10, paddingBottom: 10 }]}>
        <TouchableOpacity 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')} 
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <View style={[styles.searchBarContainer, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
          <Ionicons name="search-outline" size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={searchType === 'profiles' ? "Search by name, @username..." : "Search profiles, posts, materials..."}
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearInput} style={styles.clearBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searchQuery.length > 0 && renderTabs()}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.content}
      >
        {isLoadingData && !dataLoaded ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={{ color: theme.textSecondary, marginTop: 10, fontSize: 13 }}>Waking up search engine...</Text>
          </View>
        ) : searchQuery.length > 0 ? (
          <View style={{ flex: 1 }}>
            <TypedFlashList
              data={filteredResults}
              keyExtractor={(item: any) => `${item.type}-${item.id}`}
              getItemType={(item: any) => item.type}
              estimatedItemSize={80}
              renderItem={renderResultItem}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No data available</Text>
                </View>
              }
            />
          </View>
        ) : (
          <ScrollView style={styles.recentSection} showsVerticalScrollIndicator={false}>
            {recentlyViewedItems.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <View style={styles.recentHeader}>
                  <Text style={[styles.recentTitle, { color: theme.textSecondary }]}>Recently Viewed</Text>
                  <TouchableOpacity onPress={() => {
                    setRecentlyViewedItems([]);
                    AsyncStorage.removeItem('@mce_recently_viewed_items');
                  }}>
                    <Text style={[styles.clearAllBtn, { color: theme.danger }]}>Clear All</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                  {recentlyViewedItems.map(item => (
                    <TouchableOpacity
                      key={`${item.type}-${item.id}`}
                      style={{
                        width: 110,
                        marginRight: 12,
                        padding: 12,
                        borderRadius: 16,
                        backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
                        borderWidth: 1,
                        borderColor: theme.cardBorder,
                        alignItems: 'center'
                      }}
                      onPress={() => handleResultPress(item)}
                    >
                      {item.type === 'profile' ? (
                        item.photoUrl ? (
                          <Image source={{ uri: item.photoUrl }} style={{ width: 48, height: 48, borderRadius: 24, marginBottom: 8 }} />
                        ) : (
                          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                            <Ionicons name="person" size={24} color="#3B82F6" />
                          </View>
                        )
                      ) : item.type === 'post' ? (
                        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(249, 115, 22, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                          <Ionicons name="document-text" size={24} color="#F97316" />
                        </View>
                      ) : item.type === 'material' ? (
                        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                          <Ionicons name="library" size={24} color="#10B981" />
                        </View>
                      ) : item.type === 'feature' ? (
                        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: `${item.color}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                          <Ionicons name={item.icon as any} size={24} color={item.color} />
                        </View>
                      ) : (
                        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(139, 92, 246, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                          <Ionicons name="calendar" size={24} color="#8B5CF6" />
                        </View>
                      )}
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>
                        {item.type === 'profile' ? item.name.split(' ')[0] : item.type === 'post' ? (item as any).text : (item as any).title}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 2 }} numberOfLines={1}>
                        {item.type === 'profile' ? item.role : item.type === 'feature' ? (item.subtitlePrefix || 'Feature') : item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {recentSearches.length > 0 && (
              <View>
                <View style={styles.recentHeader}>
                  <Text style={[styles.recentTitle, { color: theme.textSecondary }]}>Recent Searches</Text>
                  <TouchableOpacity onPress={() => {
                    setRecentSearches([]);
                    AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
                  }}>
                    <Text style={[styles.clearAllBtn, { color: theme.danger }]}>Clear All</Text>
                  </TouchableOpacity>
                </View>
                {recentSearches.map((item, index) => (
                  <View key={`recent-${index}`} style={[styles.historyRow, { borderBottomColor: theme.cardBorder }]}>
                    <TouchableOpacity 
                      style={styles.historyItem} 
                      onPress={() => setSearchQuery(item)}
                    >
                      <Ionicons name="time-outline" size={20} color={theme.textSecondary} style={{ marginRight: 12 }} />
                      <Text style={[styles.historyText, { color: theme.text }]} numberOfLines={1}>{item}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.historyDeleteBtn} 
                      onPress={() => removeHistoryItem(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {recentSearches.length === 0 && recentlyViewedItems.length === 0 && (
              <View style={[styles.emptyContainer, { marginTop: 40 }]}>
                <Ionicons name="search" size={40} color={theme.textSecondary} style={{ opacity: 0.2, marginBottom: 12 }} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>What are you looking for today?</Text>
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      {isPdfVisible && (
        <PdfViewerModal
          visible={isPdfVisible}
          onClose={() => setIsPdfVisible(false)}
          url={activePdfUrl}
          title={activePdfTitle}
        />
      )}
      <Modal visible={isProfileDropdownOpen} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsProfileDropdownOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableWithoutFeedback>
              <View style={{ width: 280, backgroundColor: theme.backgroundElement, borderRadius: 16, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
                <Text style={{ padding: 16, fontSize: 13, fontWeight: '700', color: theme.textSecondary, backgroundColor: theme.background }}>FILTER PROFILES BY</Text>
                {['All', 'Student', 'Alumni', 'Faculty', 'Others'].map((f, i, arr) => (
                  <TouchableOpacity 
                    key={f}
                    style={{ 
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16, 
                      borderBottomWidth: i === arr.length - 1 ? 0 : 1, 
                      borderBottomColor: theme.cardBorder,
                      backgroundColor: profileSubFilter === f ? theme.primary + '10' : theme.backgroundElement
                    }}
                    onPress={() => {
                      setProfileSubFilter(f as any);
                      setActiveTab('Profiles');
                      setIsProfileDropdownOpen(false);
                    }}
                  >
                    <Text style={{ color: profileSubFilter === f ? theme.primary : theme.text, fontSize: 15, fontWeight: profileSubFilter === f ? '700' : '500' }}>
                      {f === 'All' ? 'All Profiles' : f}
                    </Text>
                    {profileSubFilter === f && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {selectedMultiFileItem && (
        <DetailModal
          visible={!!selectedMultiFileItem}
          title={selectedMultiFileItem.title}
          onClose={() => setSelectedMultiFileItem(null)}
        >
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.text, marginBottom: 4 }}>
              📚 Associated Documents ({selectedMultiFileItem.files?.length || 0}):
            </Text>

            {selectedMultiFileItem.files?.map((file: any, index: number) => (
              <View 
                key={index} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: 12, 
                  backgroundColor: theme.backgroundElement, 
                  borderColor: theme.cardBorder, 
                  borderWidth: 1, 
                  borderRadius: 10,
                  gap: 12
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10, overflow: 'hidden' }}>
                  <Ionicons name="document-text" size={24} color="#EF4444" style={{ flexShrink: 0 }} />
                  <Text 
                    style={{ fontSize: 13, fontWeight: '600', color: theme.text, flex: 1 }} 
                    numberOfLines={1} 
                    ellipsizeMode="tail"
                  >
                    {file.fileName}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{ 
                    backgroundColor: '#F97316', 
                    paddingHorizontal: 12, 
                    paddingVertical: 6, 
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4
                  }}
                  onPress={() => {
                    setActivePdfUrl(file.directUrl || file.webViewUrl);
                    setActivePdfTitle(file.fileName);
                    setIsPdfVisible(true);
                  }}
                >
                  <Ionicons name="eye-outline" size={13} color="#FFF" />
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>Open</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </DetailModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 12 },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    padding: 0,
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
  },
  clearBtn: { marginLeft: 8 },
  tabsWrapper: {
    height: 54,
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  tabText: {
    fontSize: 13,
  },
  content: { flex: 1 },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    padding: 12,
  },
  resultCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultSub: {
    fontSize: 13,
  },
  bioText: {
    fontSize: 12,
    opacity: 0.8,
  },
  recentSection: {
    flex: 1,
    paddingTop: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearAllBtn: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyText: {
    fontSize: 15,
    flex: 1,
  },
  historyDeleteBtn: { paddingLeft: 12 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  subFiltersWrapper: {
    height: 54,
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  subFiltersContainer: {
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
  },
  subFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  subFilterText: {
    fontSize: 13,
  },
});
