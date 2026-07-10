import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Platform, Modal } from 'react-native';
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
import { ForwardSheet } from '@/components/modals/ForwardSheet';
import { ForwardableContent, getContentEmoji } from '@/utils/forwardEngine';

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
  const user = useAppStore(state => state.user);
  const bookmarkedOlxIds = useAppStore(state => state.bookmarkedOlxIds) || [];
  const toggleOlxBookmark = useAppStore(state => state.toggleOlxBookmark);
  const { items, loading, fetchItems, deleteItem, reportItem } = useOlxStore();
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OlxItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isFastLoginVisible, setFastLoginVisible] = useState(false);
  const [forwardContent, setForwardContent] = useState<ForwardableContent | null>(null);
  const [isForwardVisible, setIsForwardVisible] = useState(false);

  const handleForwardItem = (item: OlxItem) => {
    setForwardContent({
      contentId: item.id,
      contentType: 'olx',
      title: item.title,
      subtitle: item.price,
      senderName: item.authorName,
      emoji: getContentEmoji('olx'),
      imageUrl: item.imageUrl || undefined,
      price: item.price,
    });
    setIsForwardVisible(true);
  };

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

  const handleOpenOptions = (item: OlxItem) => {
    setSelectedItem(item);
    setIsOptionsVisible(true);
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
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            onPress={() => {
              if (item.authorUsername) {
                router.push(`/@${item.authorUsername}` as any);
              } else if (item.authorUid) {
                router.push(`/@${item.authorUid}` as any);
              }
            }}
            activeOpacity={0.7}
          >
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
          </TouchableOpacity>
          {isClosed && (
            <View style={[styles.statusBadge, { backgroundColor: theme.danger + '20' }]}>
              <Text style={[styles.statusText, { color: theme.danger }]}>Sold</Text>
            </View>
          )}
          <TouchableOpacity 
            style={{ padding: 4, marginLeft: 4 }} 
            onPress={() => handleOpenOptions(item)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.rewardBadge, { backgroundColor: theme.isDark ? '#1F2937' : '#F0FDF4', borderColor: theme.isDark ? '#374151' : '#BBF7D0', borderWidth: 1 }]}>
              <Ionicons name="pricetag" size={14} color={theme.isDark ? '#34D399' : '#059669'} />
              <Text style={[styles.rewardText, { color: theme.isDark ? '#34D399' : '#059669' }]}>
                {item.price}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.forwardIconBtn, { marginLeft: 12 }]}
              onPress={() => handleForwardItem(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-redo-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.applicationsCount, { color: theme.textSecondary, flex: 0 }]}>
              {isAuthor ? 'View replies' : 'Reply privately'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={{ marginLeft: 2 }} />
          </View>
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

      {/* Universal Forward Sheet */}
      <ForwardSheet
        visible={isForwardVisible}
        content={forwardContent}
        onClose={() => { setIsForwardVisible(false); setForwardContent(null); }}
      />

      {/* ─── OPTIONS MODAL ─── */}
      <Modal
        visible={isOptionsVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsOptionsVisible(false)}
      >
        <View style={styles.actionSheetBackdrop}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setIsOptionsVisible(false)}
          />
          <View style={[styles.actionSheetCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={styles.actionSheetHeader}>
              <Text style={[styles.actionSheetTitle, { color: theme.text }]}>Item Options</Text>
              <Text style={[styles.actionSheetSub, { color: theme.textSecondary }]}>Choose an action for this item</Text>
            </View>

            <View style={styles.actionSheetOptions}>
              {(() => {
                if (!selectedItem) return null;
                const isItemOwner = selectedItem.authorUid === user?.uid;
                const ADMIN_EMAILS = ["aman.kumar@mce.ac.in", "mceconnect.help@gmail.com"];
                const isSuperAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
                const isItemSaved = bookmarkedOlxIds.includes(selectedItem.id);

                return (
                  <>
                    {/* SAVE / UNSAVE - For Owner & Others */}
                    {!isSuperAdmin && (
                      <TouchableOpacity
                        style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                        onPress={() => {
                          setIsOptionsVisible(false);
                          if (!user || user.role === 'Guest') {
                            setFastLoginVisible(true);
                            return;
                          }
                          toggleOlxBookmark(selectedItem.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={isItemSaved ? 'bookmark' : 'bookmark-outline'} size={18} color="#F97316" style={{ marginRight: 6 }} />
                        <Text style={[styles.actionSheetBtnText, { color: theme.text }]}>
                          {isItemSaved ? 'Unsave Item' : 'Save Item'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* EDIT - For Owner */}
                    {isItemOwner && (
                      <TouchableOpacity
                        style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                        onPress={() => {
                          setIsOptionsVisible(false);
                          router.push(`/olx/edit/${selectedItem.id}` as any);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="pencil" size={18} color="#3B82F6" style={{ marginRight: 6 }} />
                        <Text style={[styles.actionSheetBtnText, { color: theme.text }]}>Edit Item</Text>
                      </TouchableOpacity>
                    )}

                    {/* DELETE - For Owner & Super Admin */}
                    {(isItemOwner || isSuperAdmin) && (
                      <TouchableOpacity
                        style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                        onPress={() => {
                          const doDelete = async () => {
                            setIsOptionsVisible(false);
                            try {
                              await deleteItem(selectedItem.id);
                              useAppStore.getState().showToast("Item deleted", "success");
                            } catch (error: any) {
                              console.error('Delete failed:', error);
                              useAppStore.getState().showToast(`Failed: ${error.message}`, "error");
                            }
                          };

                          if (Platform.OS === 'web') {
                            if (window.confirm("Are you sure you want to delete this item?")) {
                              doDelete();
                            } else {
                              setIsOptionsVisible(false);
                            }
                          } else {
                            Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
                              { text: "Cancel", style: "cancel", onPress: () => setIsOptionsVisible(false) },
                              { text: "Delete", style: "destructive", onPress: doDelete }
                            ]);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                        <Text style={[styles.actionSheetBtnText, { color: theme.danger }]}>Delete Item</Text>
                      </TouchableOpacity>
                    )}

                    {/* COMMENT PRIVATELY - For Others */}
                    {!isItemOwner && !isSuperAdmin && (
                      <TouchableOpacity
                        style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                        onPress={() => {
                          setIsOptionsVisible(false);
                          if (!user || user.role === 'Guest') {
                            setFastLoginVisible(true);
                            return;
                          }
                          router.push(`/olx/${selectedItem.id}` as any);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={18} color="#10B981" style={{ marginRight: 6 }} />
                        <Text style={[styles.actionSheetBtnText, { color: theme.text }]}>Comment Privately</Text>
                      </TouchableOpacity>
                    )}

                    {/* REPORT - For Others */}
                    {!isItemOwner && !isSuperAdmin && (
                      <TouchableOpacity
                        style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                        onPress={() => {
                          if (!user || user.role === 'Guest') {
                            setIsOptionsVisible(false);
                            setFastLoginVisible(true);
                            return;
                          }
                          const doReport = async () => {
                            setIsOptionsVisible(false);
                            await reportItem(selectedItem.id, "Inappropriate content");
                            useAppStore.getState().showToast("Report submitted", "success");
                          };

                          if (Platform.OS === 'web') {
                            if (window.confirm("Is this item inappropriate or spam? Report it?")) {
                              doReport();
                            } else {
                              setIsOptionsVisible(false);
                            }
                          } else {
                            Alert.alert("Report Item", "Is this item inappropriate or spam?", [
                              { text: "Cancel", style: "cancel", onPress: () => setIsOptionsVisible(false) },
                              { text: "Report", style: "destructive", onPress: doReport }
                            ]);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="flag-outline" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
                        <Text style={[styles.actionSheetBtnText, { color: theme.text }]}>Report Item</Text>
                      </TouchableOpacity>
                    )}
                  </>
                );
              })()}
            </View>
            <TouchableOpacity 
              style={[styles.actionSheetCancel, { backgroundColor: theme.backgroundElement }]} 
              onPress={() => setIsOptionsVisible(false)}
            >
              <Text style={[styles.actionSheetCancelText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  actionSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
  },
  actionSheetHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  actionSheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  actionSheetSub: {
    fontSize: 14,
  },
  actionSheetOptions: {
    marginBottom: 16,
  },
  actionSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionSheetBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionSheetCancel: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontWeight: '700',
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
    flex: 1,
  },
  forwardIconBtn: {
    padding: 6,
    marginHorizontal: 4,
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
