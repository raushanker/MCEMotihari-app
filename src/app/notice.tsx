import { clampedScrollY, feedScrollY } from '@/utils/scrollState';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert, Animated,
    Platform,
    RefreshControl, Share,
    StatusBar,
    StyleSheet,
    Text,
    
    TouchableOpacity,
    View
} from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Redesigned components
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { NoticesScreen } from '@/screens/NoticesScreen';
import { useAppStore } from '@/store/useAppStore';
import { NoticeItem } from '@/utils/rssParser';
import { useShallow } from 'zustand/react/shallow';
import { ExploreMenuModal } from '@/components/modals/ExploreMenuModal';

const TypedFlashList = FlashList as any;
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList as any);

// Total header height: header (60px) + search (~60px) + segment selector (~28px)
const HEADER_HEIGHT = 160;

const CATEGORY_META: Record<string, { icon: string; color: string; bg: string }> = {
  All: { icon: 'grid-outline', color: '#475569', bg: '#F1F5F9' },
  Exams: { icon: 'school-outline', color: '#8B5CF6', bg: '#F5F3FF' },
  Placements: { icon: 'briefcase-outline', color: '#10B981', bg: '#ECFDF5' },
  Holidays: { icon: 'calendar-outline', color: '#F43F5E', bg: '#FFF1F2' },
  Academic: { icon: 'book-outline', color: '#3B82F6', bg: '#EFF6FF' },
  Workshops: { icon: 'easel-outline', color: '#F59E0B', bg: '#FEF3C7' },
  Circulars: { icon: 'document-text-outline', color: '#6366F1', bg: '#EEF2FF' },
  Admissions: { icon: 'person-add-outline', color: '#06B6D4', bg: '#ECFEFF' },
  Scholarships: { icon: 'cash-outline', color: '#14B8A6', bg: '#F0FDFA' },
};

export default function NoticesHubScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const [activeSegment, setActiveSegment] = useState<'college' | 'university'>('college');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [universityHydrationCompleted, setUniversityHydrationCompleted] = useState(false);
  const [visibleUniversityCount, setVisibleUniversityCount] = useState(10);

  useEffect(() => {
    setVisibleUniversityCount(10);
  }, [searchQuery]);

  // ZUSTAND store integration for university notices with useShallow
  const {
    universityNotices,
    isUniversityLoading,
    fetchUniversityNotices,
    pinnedNoticeIds,
    togglePinNotice,
    isNoticesLoading,
    notices
  } = useAppStore(useShallow(state => ({
    universityNotices: state.universityNotices,
    isUniversityLoading: state.isUniversityLoading,
    fetchUniversityNotices: state.fetchUniversityNotices,
    pinnedNoticeIds: state.pinnedNoticeIds,
    togglePinNotice: state.togglePinNotice,
    isNoticesLoading: state.isNoticesLoading,
    notices: state.notices
  })));

  // Load university notices on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await useAppStore.getState().initStore();
        await fetchUniversityNotices(false);
      } catch (err) {
        console.warn('Failed to hydrate university notices on mount:', err);
      } finally {
        setUniversityHydrationCompleted(true);
      }
    };
    initialize();
  }, []);

  // Auto-open notice details when routed with openNotice param
  const { openNotice } = useLocalSearchParams<{ openNotice?: string }>();
  const hasAutoOpenedNoticeRef = useRef(false);

  useEffect(() => {
    if (openNotice && !hasAutoOpenedNoticeRef.current) {
      const match = notices.find(n => n.id === openNotice) || 
                    universityNotices.find(n => n.id === openNotice);
      
      if (match) {
        handleOpenNotice(match);
        hasAutoOpenedNoticeRef.current = true;
      }
    }
  }, [openNotice, notices, universityNotices]);

  const scrollY = React.useRef(new Animated.Value(0)).current;
  const lastScrollY = React.useRef(0);
  const clampedScrollYLocal = React.useMemo(() => {
    return scrollY.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolateLeft: 'clamp',
      extrapolateRight: 'extend',
    });
  }, [scrollY]);

  React.useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      lastScrollY.current = value;
      feedScrollY.setValue(value);
    });
    return () => {
      scrollY.removeListener(listenerId);
    };
  }, [scrollY]);

  useFocusEffect(
    React.useCallback(() => {
      feedScrollY.setValue(lastScrollY.current);
      return () => {};
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeSegment === 'college') {
        await useAppStore.getState().fetchNotices(true);
      } else {
        await fetchUniversityNotices(true);
      }
      useAppStore.getState().showToast('Notices updated! 📢', 'success');
    } catch (err) {
      console.warn('Notice refresh failed:', err);
      useAppStore.getState().showToast('Failed to update notices ⚠️', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenNotice = async (notice: NoticeItem) => {
    try {
      let pdfUrl = notice.pdfUrl;
      const isBEUNotice = notice.id.startsWith('beu-') || (notice.link && notice.link.includes('beu-bih.ac.in'));
      const defaultDomain = isBEUNotice ? 'https://beu-bih.ac.in' : 'https://www.mcemotihari.ac.in';

      const makeAbsolute = (url: string | undefined) => {
        if (!url) return '';
        let clean = url.trim();
        if (clean.startsWith('//')) return `https:${clean}`;
        if (clean.startsWith('/')) return `${defaultDomain}${clean}`;
        if (!/^https?:\/\//i.test(clean)) return `${defaultDomain}/${clean}`;
        return clean;
      };
      
      if (!pdfUrl && notice.link && notice.link.includes('mcemotihari.ac.in') && !notice.link.includes('.pdf')) {
        console.log('No pdfUrl preloaded. Performing runtime fetch of notice link:', notice.link);
        try {
          let scrapeUrl = notice.link;
          if (Platform.OS === 'web') {
            scrapeUrl = `https://corsproxy.io/?${encodeURIComponent(scrapeUrl)}`;
          }
          const htmlRes = await fetch(scrapeUrl);
          if (htmlRes.ok) {
            const htmlText = await htmlRes.text();
            const pdfMatch = htmlText.match(/href=["']([^"']+\.pdf)["']/i);
            if (pdfMatch && pdfMatch[1]) {
              pdfUrl = makeAbsolute(pdfMatch[1]);
              console.log('Successfully scraped PDF at runtime:', pdfUrl);
            }
          }
        } catch (scrapeErr) {
          console.warn('Runtime PDF scrape failed, falling back to standard webpage:', scrapeErr);
        }
      }

      const targetUrl = makeAbsolute(pdfUrl || notice.attachmentUrl || notice.link);
      
      if (!targetUrl) {
        Alert.alert('Unavailable', 'No valid link or document attached to this notice.');
        return;
      }

      if (Platform.OS === 'web') {
        const newWindow = window.open(targetUrl, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          window.location.href = targetUrl;
        }
      } else {
        await WebBrowser.openBrowserAsync(targetUrl, {
          toolbarColor: '#0F172A',
          controlsColor: '#FFFFFF',
          showTitle: true,
          enableBarCollapsing: true,
        });
      }
    } catch (error) {
      console.error('Error opening notice browser:', error);
      Alert.alert('Error', 'Unable to open the document. Please try again.');
    }
  };

  const handleShareNotice = async (notice: NoticeItem) => {
    try {
      const noticeUrl = `https://mcemotihari-app.web.app/notice/${notice.id}`;
      let shareMessage = `📢 MCE Connect Official Announcement:\n\n`;
      shareMessage += `📌 ${notice.title}\n`;
      shareMessage += `📅 Date: ${notice.pubDate}\n`;
      if (notice.snippet) {
        shareMessage += `📝 Summary: ${notice.snippet}\n\n`;
      } else {
        shareMessage += `\n`;
      }
      shareMessage += `📲 Download the MCE Connect app today!\n\n`;
      shareMessage += `Read official circular or document details directly on MCE Connect:\n`;
      shareMessage += `${noticeUrl}`;

      await Share.share({
        title: notice.title,
        message: shareMessage,
        url: noticeUrl,
      });
    } catch (error) {
      console.error('Error sharing notice:', error);
    }
  };

  // Performant search filter for University notices
  const filteredUniversityNotices = useMemo(() => {
    return universityNotices.filter(notice => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const inTitle = notice.title.toLowerCase().includes(query);
        const inCategory = notice.category.toLowerCase().includes(query);
        const inDate = notice.pubDate.toLowerCase().includes(query);
        return inTitle || inCategory || inDate;
      }
      return true;
    });
  }, [universityNotices, searchQuery]);

  // Notice item renderer
  const renderUniversityNoticeRow = useCallback(({ item }: { item: NoticeItem }) => {
    const meta = CATEGORY_META[item.category] || CATEGORY_META.Academic;
    const isUserPinned = pinnedNoticeIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.feedCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
        onPress={() => handleOpenNotice(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.cardColorStrip, { backgroundColor: meta.color }]} />

        <View style={styles.feedCardMain}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : meta.bg }]}>
              <Ionicons name={meta.icon as any} size={10} color={theme.isDark ? '#E2E8F0' : meta.color} style={{ marginRight: 4 }} />
              <Text style={[styles.badgeText, { color: theme.isDark ? '#E2E8F0' : meta.color }]}>
                {item.category}
              </Text>
            </View>
            
            <View style={styles.badgeRow}>
              {item.isNew && (
                <View style={[styles.newBadge, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
              {item.isImportant && (
                <View style={[styles.newBadge, { backgroundColor: '#EA580C' }]}>
                  <Text style={styles.newBadgeText}>URGENT</Text>
                </View>
              )}
              <TouchableOpacity 
                onPress={() => togglePinNotice(item.id)}
                style={styles.feedCardPinBtn}
                activeOpacity={0.6}
              >
                <Ionicons 
                  name={isUserPinned ? "bookmark" : "bookmark-outline"} 
                  size={14} 
                  color={isUserPinned ? "#F97316" : "#94A3B8"} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.feedCardTitle, { color: theme.text }]}>
            {item.title}
          </Text>

          <Text style={[styles.cardSnippet, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.snippet}
          </Text>

          <View style={styles.feedCardFooter}>
            <View style={styles.dateCol}>
              <Ionicons name="calendar-outline" size={11} color={theme.textSecondary} />
              <Text style={[styles.cardDate, { color: theme.textSecondary }]}>{item.pubDate}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity 
                onPress={() => handleShareNotice(item)}
                style={styles.actionBtn}
                activeOpacity={0.6}
              >
                <Ionicons name="share-social-outline" size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleOpenNotice(item)}
                style={styles.cardArrowLink}
                activeOpacity={0.6}
              >
                <Ionicons name="arrow-forward-circle" size={22} color="#F97316" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [pinnedNoticeIds, togglePinNotice, theme.isDark, theme.backgroundElement, theme.cardBorder, theme.text, theme.textSecondary]);

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar
        backgroundColor={theme.backgroundElement}
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        translucent={true}
      />
      <View style={{ height: insets.top, backgroundColor: theme.backgroundElement, zIndex: 101 }} />
      {/* 1. LinkedIn-style Global Header with App Branding */}
      <View style={{ zIndex: 100, backgroundColor: theme.background }}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, height: 60, borderBottomColor: theme.cardBorder }]}>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Notice Board</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Real-time campus & university announcements</Text>
        </View>
        <TouchableOpacity 
          onPress={handleRefresh} 
          style={styles.refreshHeaderBtn}
          activeOpacity={0.6}
          disabled={activeSegment === 'college' ? isNoticesLoading : isUniversityLoading}
        >
          {(activeSegment === 'college' ? isNoticesLoading : isUniversityLoading) ? (
            <ActivityIndicator size="small" color="#F97316" />
          ) : (
            <Ionicons name="sync" size={18} color="#F97316" />
          )}
        </TouchableOpacity>
      </View>

      {/* 2. Global LinkedIn-style Universal Search Bar */}
      <View style={[styles.searchSection, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#94A3B8"
            style={styles.searchIcon}
          />
          <TextInput
            placeholder={`Search ${activeSegment === 'college' ? 'college notices...' : 'university announcements...'}`}
            placeholderTextColor="#94A3B8"
            style={[styles.searchInput, { color: theme.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            returnKeyType="search"
           autoCapitalize="sentences" />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. Glassmorphic Segmented Selector */}
      <View style={[styles.segmentContainer, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.segmentBar, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'college' && styles.segmentBtnActive]}
            onPress={() => setActiveSegment('college')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="school-outline"
              size={13}
              color={activeSegment === 'college' ? '#FFFFFF' : theme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentText, { color: activeSegment === 'college' ? '#FFFFFF' : theme.textSecondary }, activeSegment === 'college' && styles.segmentTextActive]}>
              College Notices
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'university' && styles.segmentBtnActive]}
            onPress={() => setActiveSegment('university')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="globe-outline"
              size={13}
              color={activeSegment === 'university' ? '#FFFFFF' : theme.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.segmentText, { color: activeSegment === 'university' ? '#FFFFFF' : theme.textSecondary }, activeSegment === 'university' && styles.segmentTextActive]}>
              University Notices
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      </View>

      {/* 4. Content Area */}
      <View style={styles.contentContainer}>
        {activeSegment === 'college' ? (
          <NoticesScreen hideHeader searchQuery={searchQuery} scrollY={scrollY} />
        ) : (
          <View style={{ flex: 1 }}>
            {!universityHydrationCompleted && universityNotices.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#F97316" />
                <Text style={styles.loadingText}>Fetching announcements from BEU Patna portal...</Text>
              </View>
            ) : (
              <AnimatedFlashList
                onScroll={(event: any) => {
                  scrollY.setValue(event.nativeEvent.contentOffset.y);
                }}
                scrollEventThrottle={16}
                data={filteredUniversityNotices.slice(0, visibleUniversityCount)}
                renderItem={renderUniversityNoticeRow}
                keyExtractor={(item: NoticeItem) => item.id}
                estimatedItemSize={140}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.listContent, { paddingTop: 10, paddingBottom: 180 + insets.bottom }]}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor="#F97316"
                    colors={['#F97316']}
                    progressViewOffset={0}
                    progressBackgroundColor={theme.backgroundElement || '#FFFFFF'}
                  />
                }
                ListHeaderComponent={() => (
                  filteredUniversityNotices.length > 0 ? (
                    <View style={styles.sectionHeader}>
                      <Ionicons name="bookmark-outline" size={14} color={theme.textSecondary} />
                      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>BIHAR ENGINEERING UNIVERSITY circulars</Text>
                    </View>
                  ) : null
                )}
                ListFooterComponent={() => (
                  filteredUniversityNotices.length > visibleUniversityCount ? (
                    <TouchableOpacity
                      style={[styles.loadMoreBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                      onPress={() => setVisibleUniversityCount(prev => prev + 10)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#F97316" style={{ marginRight: 6 }} />
                      <Text style={styles.loadMoreText}>Load More</Text>
                    </TouchableOpacity>
                  ) : null
                )}
                ListEmptyComponent={
                  (!universityHydrationCompleted || isUniversityLoading || refreshing) ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#F97316" />
                      <Text style={styles.loadingText}>Loading BEU announcements...</Text>
                    </View>
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="notifications-off-outline" size={48} color={theme.isDark ? '#334155' : '#CBD5E1'} />
                      <Text style={[styles.emptyText, { color: theme.text }]}>No university notices found</Text>
                      <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                        Either you are offline or no university notices match your search term.
                      </Text>
                      {searchQuery && (
                        <TouchableOpacity
                          style={styles.resetBtn}
                          onPress={() => setSearchQuery('')}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.resetBtnText}>Clear Search Filters</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )
                }
              />
            )}
          </View>
        )}
      </View>
      <ExploreMenuModal />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  refreshHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  segmentContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    width: '100%',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#F97316',
    boxShadow: Platform.OS === 'web' ? `${0}px ${3}px ${4}px #F97316` : undefined,

    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 80,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  feedCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: Platform.OS === 'web' ? `${0}px ${2}px ${4}px #000` : undefined,

    elevation: 1,
  },
  cardColorStrip: {
    width: 4,
    height: '100%',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  feedCardMain: {
    flex: 1,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  feedCardPinBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  feedCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 6,
    marginTop: 4,
  },
  cardSnippet: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  feedCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 10,
    marginTop: 4,
  },
  dateCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDate: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  cardArrowLink: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  resetBtn: {
    marginTop: 14,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Premium Web app restriction gate styles
  webGateRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  webGlowOrb1: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(249, 115, 22, 0.07)',
  },
  webGlowOrb2: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  webGateCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 28,
    borderWidth: 1.5,
    padding: 32,
    alignItems: 'center',
  },
  webGateIconFrame: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#F97316',
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  webGateTitle: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  webGateBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  webGateDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignSelf: 'stretch',
    shadowColor: '#F97316',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginBottom: 10,
  },
  webGateDownloadText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  webGateBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignSelf: 'stretch',
  },
  webGateBackText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    elevation: 1,
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
  },
});
