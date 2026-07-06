import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useOlxStore, OlxItem } from '@/store/useOlxStore';
import { Image } from 'expo-image';
import { getFormattedPostTime as timeAgo } from '@/utils/timeFormat';
import { useAppStore } from '@/store/useAppStore';
import { FastLoginModal } from '@/components/modals/FastLoginModal';

const TypedFlashList = FlashList as any;


export interface OlxScreenProps {
  onBack?: () => void;
  onItemClick?: (id: string) => void;
  onCreateClick?: () => void;
}

export default function OlxScreen({ onBack, onItemClick, onCreateClick }: OlxScreenProps = {}) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, loading, fetchItems } = useOlxStore();
  const user = useAppStore(state => state.user);
  const [refreshing, setRefreshing] = useState(false);
  const [isFastLoginVisible, setFastLoginVisible] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) {
      if (router.canGoBack()) { router.back(); } else { router.replace('/'); }
    } else {
      router.push('/');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  const showInfo = () => {
    const title = "About Campus OLX";
    const message = "Buy and sell second-hand study materials within the campus.\n\n" +
      "Guidelines:\n" +
      "• Describe your item clearly.\n" +
      "• You can upload 1 image per item.\n" +
      "• Interested buyers will contact you privately.\n" +
      "• Mark your item as 'Sold' once it is gone.\n" +
      "• Keep communications respectful and professional.";

    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message, [{ text: "Understood", style: "default" }]);
    }
  };

  const renderItem = ({ item }: { item: OlxItem }) => {
    const isAuthor = item.authorUid === user?.uid;
    const isClosed = item.status === 'sold';

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
        onPress={() => onItemClick ? onItemClick(item.id) : router.push(`/olx/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <Image 
            source={{ uri: (isAuthor && user ? user.photoUrl : item.authorPhoto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(isAuthor && user ? (user.name || '') : item.authorName) }} 
            style={styles.avatar} 
          />
          <View style={styles.authorInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.authorName, { color: theme.text }]} numberOfLines={1}>
                {isAuthor && user ? user.name : item.authorName}
              </Text>
              {['SUPER_ADMIN', 'Admin'].includes((isAuthor && user ? user.adminRole : item.authorAdminRole) as string) && (
                <MaterialIcons name="verified" size={15} color="#1D9BF0" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>
              {(() => {
                const role = isAuthor && user ? user.role : item.authorRole;
                const branch = isAuthor && user ? user.branch : item.authorBranch;
                const semester = isAuthor && user ? user.semester : item.authorSemester;
                const adminRole = isAuthor && user ? user.adminRole : item.authorAdminRole;
                
                if (['SUPER_ADMIN', 'Admin'].includes(adminRole as string)) return 'Admin';
                if (role === 'Student') {
                  return `${branch || 'Student'}${semester ? ` • ${semester}` : ''}`;
                }
                return role || 'User';
              })()} • {timeAgo(item.createdAt)}
            </Text>
          </View>
          {isClosed && (
            <View style={[styles.statusBadge, { backgroundColor: theme.danger + '20' }]}>
              <Text style={[styles.statusText, { color: theme.danger }]}>Sold</Text>
            </View>
          )}
        </View>

        <View style={styles.contentRow}>
          <View style={styles.textContent}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={3}>
              {item.description}
            </Text>
          </View>
          {item.imageUrl && (
            <Image 
              source={{ uri: item.imageUrl.replace('/upload/', '/upload/q_auto:low,w_200/') }} 
              style={styles.itemImage} 
              contentFit="cover"
            />
          )}
        </View>

        <View style={styles.footer}>
          <View style={[styles.rewardBadge, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="pricetag-outline" size={14} color={theme.primary} />
            <Text style={[styles.rewardText, { color: theme.primary }]}>
              {item.price}
            </Text>
          </View>
          
          <Text style={[styles.applicationsCount, { color: theme.textSecondary }]}>
            {isAuthor ? 'Tap to view replies' : 'Tap to reply privately'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.background,
      ...(origin ? { borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' } : {})
    }]}>
      <View style={[styles.headerContainer, { 
        paddingTop: origin ? 24 : insets.top + 10, 
        backgroundColor: theme.backgroundElement, 
        borderBottomColor: theme.cardBorder,
        ...(origin ? { borderTopLeftRadius: 32, borderTopRightRadius: 32 } : {})
      }]}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text, marginLeft: 12 }]}>Campus OLX</Text>
          </View>
          <TouchableOpacity onPress={showInfo} style={{ padding: 4, marginRight: -4 }}>
            <Ionicons name="information-circle-outline" size={26} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <TypedFlashList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item: OlxItem) => item.id}
          estimatedItemSize={220}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetags-outline" size={60} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No items listed yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Be the first to list a second-hand material for sale!
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + 20 }]}
        onPress={() => {
          if (!user || user.role === 'Guest') {
            setFastLoginVisible(true);
          } else {
            if (onCreateClick) {
              onCreateClick();
            } else {
              router.push('/olx/create' as any);
            }
          }
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      <FastLoginModal visible={isFastLoginVisible} onClose={() => setFastLoginVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#E2E8F0',
  },
  authorInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 4,
  },
  timeAgo: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  textContent: {
    flex: 1,
    marginRight: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  applicationsCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
