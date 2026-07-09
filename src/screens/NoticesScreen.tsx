import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { NoticeItem } from '@/utils/rssParser';
import { feedScrollY } from '@/utils/scrollState';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert, Animated,
    Platform,
    RefreshControl, Share,
    StyleSheet,
    Text,
    
    TouchableOpacity,
    View
} from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ForwardSheet } from '@/components/modals/ForwardSheet';
import { ForwardableContent, getContentEmoji } from '@/utils/forwardEngine';

// Cast FlashList to prevent TSX React 19 compiler warnings
const TypedFlashList = FlashList as any;
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList as any);

interface NoticesScreenProps {
  onBack?: () => void;
  searchQuery?: string;
  hideHeader?: boolean;
  scrollY?: Animated.Value;
}

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

export const NoticesScreen: React.FC<NoticesScreenProps> = ({ onBack, searchQuery, hideHeader, scrollY: propScrollY }) => {
  const localScrollY = useRef(new Animated.Value(0)).current;
  const scrollY = propScrollY || localScrollY;
  const theme = useThemeColors();
  const { 
    notices, 
    isNoticesLoading, 
    pinnedNoticeIds, 
    fetchNotices, 
    togglePinNotice 
  } = useAppStore();

  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const activeSearchQuery = searchQuery !== undefined ? searchQuery : localSearchQuery;
  const [refreshing, setRefreshing] = useState(false);
  const [hydrationCompleted, setHydrationCompleted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [forwardContent, setForwardContent] = useState<ForwardableContent | null>(null);
  const [isForwardVisible, setIsForwardVisible] = useState(false);

  const handleForwardCollegeNotice = useCallback((notice: NoticeItem) => {
    setForwardContent({
      contentId: notice.id,
      contentType: 'notice',
      title: notice.title,
      subtitle: notice.pubDate,
      senderName: 'MCE Motihari',
      emoji: getContentEmoji('notice'),
      externalUrl: notice.link,
    });
    setIsForwardVisible(true);
  }, []);

  useEffect(() => {
    setVisibleCount(10);
  }, [activeSearchQuery]);

  const insets = useSafeAreaInsets();

  // Sync fresh updates on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await useAppStore.getState().initStore();
        await fetchNotices(false);
      } catch (err) {
        console.warn('Failed to hydrate notices on mount:', err);
      } finally {
        setHydrationCompleted(true);
      }
    };
    initialize();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotices(true);
    setVisibleCount(10);
    setRefreshing(false);
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
      shareMessage += `Read official circular or document details directly on MCE Connect:\n`;
      shareMessage += `🔗 ${noticeUrl}\n\n`;
      shareMessage += `📲 Download the MCE Connect app today!`;

      await Share.share({
        title: notice.title,
        message: shareMessage,
      });
    } catch (error) {
      console.error('Error sharing notice:', error);
    }
  };

  // Performant useMemo search filter
  const filteredNotices = useMemo(() => {
    return notices.filter(notice => {
      if (activeSearchQuery.trim()) {
        const query = activeSearchQuery.toLowerCase().trim();
        const inTitle = notice.title.toLowerCase().includes(query);
        const inSnippet = notice.snippet.toLowerCase().includes(query);
        const inCategory = notice.category.toLowerCase().includes(query);
        const inDate = notice.pubDate.toLowerCase().includes(query);
        return inTitle || inSnippet || inCategory || inDate;
      }
      return true;
    });
  }, [notices, activeSearchQuery]);

  // Main list header rendering (Section title only)
  const renderListHeader = () => {
    return (
      <View>
        {filteredNotices.length > 0 && (
          <View style={[styles.sectionHeader, { marginTop: 14, marginBottom: 8 }]}>
            <Ionicons name="newspaper-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>LATEST ANNOUNCEMENTS</Text>
          </View>
        )}
      </View>
    );
  };

  // Performant notice list row renderer (LinkedIn + Google News Style Card)
  const renderNoticeRow = useCallback(({ item }: { item: NoticeItem }) => {
    const meta = CATEGORY_META[item.category] || CATEGORY_META.Academic;
    const isUserPinned = pinnedNoticeIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.feedCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
        onPress={() => handleOpenNotice(item)}
        activeOpacity={0.8}
      >
        {/* Left Color strip accent for categorization styling */}
        <View style={[styles.cardColorStrip, { backgroundColor: meta.color }]} />

        <View style={styles.feedCardMain}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : meta.bg }]}>
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
                onPress={() => handleForwardCollegeNotice(item)}
                style={styles.actionBtn}
                activeOpacity={0.6}
              >
                <Ionicons name="arrow-redo-outline" size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>Forward</Text>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Premium Header */}
      {!hideHeader && (
        <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.6}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleCol}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>College Notices</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Real-time campus updates & announcements</Text>
          </View>
          <TouchableOpacity 
            onPress={handleRefresh} 
            style={styles.refreshHeaderBtn}
            activeOpacity={0.6}
            disabled={isNoticesLoading}
          >
            {isNoticesLoading ? (
              <ActivityIndicator size="small" color="#F97316" />
            ) : (
              <Ionicons name="sync" size={18} color="#F97316" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      {!hideHeader && (
        <View style={[styles.filterSection, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.searchBarContainer, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search notices, exams, circulars..."
              placeholderTextColor="#94A3B8"
              value={activeSearchQuery}
              onChangeText={searchQuery !== undefined ? undefined : setLocalSearchQuery}
              clearButtonMode="while-editing"
              returnKeyType="search"
             autoCapitalize="sentences" />
            {activeSearchQuery ? (
              <TouchableOpacity onPress={() => searchQuery !== undefined ? null : setLocalSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={16} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* Performance-Optimized Notice Feed using FlashList */}
      <View style={styles.listContainer}>
        {!hydrationCompleted && notices.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>Fetching notices from official MCE Motihari portal...</Text>
          </View>
        ) : (
          <AnimatedFlashList
            onScroll={(event: any) => {
              scrollY.setValue(event.nativeEvent.contentOffset.y);
            }}
            scrollEventThrottle={16}
            data={filteredNotices.slice(0, visibleCount)}
            renderItem={renderNoticeRow}
            keyExtractor={(item: NoticeItem) => item.id}
            estimatedItemSize={160}
            ListHeaderComponent={renderListHeader}
            ListFooterComponent={() => (
              filteredNotices.length > visibleCount ? (
                <TouchableOpacity
                  style={[styles.loadMoreBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                  onPress={() => setVisibleCount(prev => prev + 10)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#F97316" style={{ marginRight: 6 }} />
                  <Text style={styles.loadMoreText}>Load More</Text>
                </TouchableOpacity>
              ) : null
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.listContent, hideHeader ? { paddingTop: 10, paddingBottom: 180 + insets.bottom } : { paddingTop: 0 }]}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh}
                tintColor="#F97316"
                colors={['#F97316']}
              />
            }
            ListEmptyComponent={
              (!hydrationCompleted || isNoticesLoading || refreshing) ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#F97316" />
                  <Text style={styles.loadingText}>Loading latest announcements...</Text>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-off-outline" size={48} color={theme.isDark ? '#334155' : '#CBD5E1'} />
                  <Text style={[styles.emptyText, { color: theme.text }]}>No circulars found</Text>
                  <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                    No notices match your selection. Try clearing the search query.
                  </Text>
                  {activeSearchQuery !== '' && searchQuery === undefined && (
                    <TouchableOpacity
                      style={styles.resetBtn}
                      onPress={() => setLocalSearchQuery('')}
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

      {/* Universal Forward Sheet */}
      <ForwardSheet
        visible={isForwardVisible}
        content={forwardContent}
        onClose={() => { setIsForwardVisible(false); setForwardContent(null); }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  listContent: {
    paddingBottom: 100,
  },
  header: {
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? `${0}px ${1}px ${3}px #000` : undefined,

  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
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
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 6,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 140,
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
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: 0.8,
    marginLeft: 6,
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
  cardArrowLink: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
