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
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const TypedFlashList = FlashList as any;

const SEARCH_HISTORY_KEY = '@mce_search_history';
const MAX_HISTORY_ITEMS = 10;
type TabType = 'All' | 'Profiles' | 'Materials' | 'Posts' | 'Events';

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
  experiences?: Array<{
    company: string;
    role: string;
    isCurrent: boolean;
  }>;
  education?: Array<{
    school: string;
    degree: string;
    fieldOfStudy: string;
  }>;
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
  | ({ type: 'event' } & SearchEvent);

export default function SearchScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  
  const { type: searchType } = useLocalSearchParams<{ type?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>(searchType === 'profiles' ? 'Profiles' : 'All');
  const [profileSubFilter, setProfileSubFilter] = useState<'All' | 'Student' | 'Alumni' | 'Others'>('All');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
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

  const inputRef = useRef<TextInput>(null);

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
            pRes = pRes.filter(p => p.role !== 'Student' && p.role !== 'Alumni');
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

    return results;
  };

  const filteredResults = useMemo(() => getFilteredResults(), [searchQuery, activeTab, dataLoaded, profiles, posts, materials, events]);

  const handleClearInput = () => {
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleResultPress = (item: SearchResultItem) => {
    saveToHistory(searchQuery);
    Keyboard.dismiss();
    
    switch (item.type) {
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
    const tabs: TabType[] = ['All', 'Profiles', 'Materials', 'Posts', 'Events'];
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
                    borderColor: isActive ? theme.primary : theme.cardBorder
                  }
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[
                  styles.tabText,
                  { color: isActive ? '#FFFFFF' : theme.textSecondary, fontWeight: isActive ? '700' : '500' }
                ]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderProfileSubFilters = () => {
    const filters = ['All', 'Student', 'Alumni', 'Others'] as const;
    return (
      <View style={[styles.subFiltersWrapper, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subFiltersContainer}>
          {filters.map(filter => {
            const isActive = profileSubFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.subFilterChip,
                  { 
                    backgroundColor: isActive ? theme.primary : 'transparent',
                    borderColor: isActive ? theme.primary : theme.cardBorder
                  }
                ]}
                onPress={() => setProfileSubFilter(filter)}
              >
                <Text style={[
                  styles.subFilterText,
                  { color: isActive ? '#FFFFFF' : theme.textSecondary, fontWeight: isActive ? '700' : '500' }
                ]}>
                  {filter}
                </Text>
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
    return null;
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement, paddingTop: insets.top + 10, paddingBottom: 10 }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
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

      {renderTabs()}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.content}
      >
        {isLoadingData && !dataLoaded ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={{ color: theme.textSecondary, marginTop: 10, fontSize: 13 }}>Waking up search engine...</Text>
          </View>
        ) : searchQuery.length > 0 ? (
          <View style={{ flex: 1 }}>
            {(searchType === 'profiles' || activeTab === 'Profiles') && renderProfileSubFilters()}
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
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No results found for "{searchQuery}"</Text>
                </View>
              }
            />
          </View>
        ) : (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={[styles.recentTitle, { color: theme.textSecondary }]}>Recent Searches</Text>
              <TouchableOpacity onPress={() => {
                setRecentSearches([]);
                AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
              }}>
                <Text style={[styles.clearAllBtn, { color: theme.primary }]}>Clear</Text>
              </TouchableOpacity>
            </View>
            <TypedFlashList
              data={recentSearches}
              keyExtractor={(item: string, index: number) => `recent-${index}`}
              estimatedItemSize={60}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }: { item: string }) => (
                <View style={[styles.historyRow, { borderBottomColor: theme.cardBorder }]}>
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
              )}
              ListEmptyComponent={
                <View style={[styles.emptyContainer, { marginTop: 40 }]}>
                  <Ionicons name="search" size={40} color={theme.textSecondary} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>What are you looking for today?</Text>
                </View>
              }
            />
          </View>
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
