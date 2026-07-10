import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Platform, Modal, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useLocalSearchParams } from 'expo-router';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useGigsStore, Gig } from '@/store/useGigsStore';
import { Image } from 'expo-image';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { getFormattedPostTime as timeAgo } from '@/utils/timeFormat';
import { useAppStore } from '@/store/useAppStore';
import { FastLoginModal } from '@/components/modals/FastLoginModal';
import { ForwardSheet } from '@/components/modals/ForwardSheet';
import { ForwardableContent, getContentEmoji } from '@/utils/forwardEngine';

const TypedFlashList = FlashList as any;


export interface GigsScreenProps {
  onBack?: () => void;
  onItemClick?: (id: string) => void;
  onCreateClick?: () => void;
}

export default function GigsScreen({ onBack, onItemClick, onCreateClick }: GigsScreenProps = {}) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { gigs, loading, fetchGigs } = useGigsStore();
  const user = useAppStore(state => state.user);
  const [refreshing, setRefreshing] = useState(false);
  const [isFastLoginVisible, setFastLoginVisible] = useState(false);
  const [forwardContent, setForwardContent] = useState<ForwardableContent | null>(null);
  const [isForwardVisible, setIsForwardVisible] = useState(false);
  const [menuGig, setMenuGig] = useState<Gig | null>(null);
  const deleteGig = useGigsStore(state => state.deleteGig);

  const handleDelete = () => {
    if (!menuGig) return;
    const targetGig = menuGig; // Capture the reference
    setMenuGig(null);
    
    const confirmDelete = async () => {
      try {
        await deleteGig(targetGig.id);
        useAppStore.getState().showToast('Work deleted successfully', 'success');
      } catch (error) {
        useAppStore.getState().showToast('Failed to delete', 'error');
      }
    };

    if (Platform.OS === 'web') {
      const wantsDelete = window.confirm("Are you sure you want to delete this opportunity? This cannot be undone.");
      if (wantsDelete) confirmDelete();
    } else {
      Alert.alert('Delete Work', 'Are you sure you want to delete this opportunity? This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]);
    }
  };

  const handleForwardGig = (item: Gig) => {
    setForwardContent({
      contentId: item.id,
      contentType: 'gig',
      title: item.title,
      subtitle: item.rewardType === 'Any other' ? item.customReward : item.rewardType,
      senderName: item.authorName,
      emoji: getContentEmoji('gig'),
    });
    setIsForwardVisible(true);
  };

  useEffect(() => {
    fetchGigs();
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
    await fetchGigs();
    setRefreshing(false);
  };

  const showInfo = () => {
    const title = "About Opportunities & Work";
    const message = "This section is designed to help students, faculty, and seniors collaborate.\n\n" +
      "Guidelines:\n" +
      "• Post your requirements clearly.\n" +
      "• Offer a valid reward or token of appreciation.\n" +
      "• All replies and applications are private.\n" +
      "• Mark your post as 'Finished' once fulfilled.\n" +
      "• Keep communications respectful and professional.";

    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message, [{ text: "Understood", style: "default" }]);
    }
  };

  const getRewardIcon = (rewardType: string) => {
    switch (rewardType) {
      case 'Paid work': return 'cash-outline';
      case 'Party/Treat': return 'pizza-outline';
      case 'Chai+Samosa treat': return 'cafe-outline';
      case 'Trip sponsored': return 'airplane-outline';
      case 'Certificate': return 'ribbon-outline';
      case 'Recommendations': return 'star-outline';
      default: return 'gift-outline';
    }
  };

  const renderItem = ({ item }: { item: Gig }) => {
    const isAuthor = item.authorUid === user?.uid;
    const isClosed = item.status === 'closed';

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
        onPress={() => router.push(`/gigs/${item.id}`)}
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
                {(isAuthor && user ? user.adminRole : item.authorAdminRole) ? 'Admin' : (isAuthor && user ? user.role : item.authorRole)} • {timeAgo(item.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>
          {isClosed && (
            <View style={[styles.statusBadge, { backgroundColor: theme.danger + '20' }]}>
              <Text style={[styles.statusText, { color: theme.danger }]}>Closed</Text>
            </View>
          )}
          <TouchableOpacity 
            onPress={() => setMenuGig(item)}
            style={{ padding: 4, marginLeft: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.footer}>
          <View style={[styles.rewardBadge, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name={getRewardIcon(item.rewardType) as any} size={14} color={theme.primary} />
            <Text style={[styles.rewardText, { color: theme.primary }]}>
              {item.rewardType === 'Any other' ? item.customReward : item.rewardType}
            </Text>
          </View>
          
          <TouchableOpacity
            style={{ padding: 6, marginHorizontal: 4 }}
            onPress={() => handleForwardGig(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-redo-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          <Text style={[styles.applicationsCount, { color: theme.textSecondary }]}>
            {isAuthor ? 'Tap to view replies' : 'Tap to reply privately'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Opportunities & Work</Text>
          <TouchableOpacity onPress={showInfo} style={{ padding: 4, marginRight: -4 }}>
            <Ionicons name="information-circle-outline" size={26} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Find projects, research assistance, and campus tasks
        </Text>
      </View>

      {loading && gigs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <TypedFlashList
          data={gigs}
          renderItem={renderItem}
          keyExtractor={(item: Gig) => item.id}
          estimatedItemSize={200}
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
              <Ionicons name="briefcase-outline" size={60} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No opportunities yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Be the first to post a requirement or project!
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
            onCreateClick ? onCreateClick() : router.push('/gigs/create');
          }
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.fabText}>Post Work</Text>
      </TouchableOpacity>

      <FastLoginModal
        visible={isFastLoginVisible}
        onClose={() => setFastLoginVisible(false)}
      />

      {/* Universal Forward Sheet */}
      <ForwardSheet
        visible={isForwardVisible}
        content={forwardContent}
        onClose={() => { setIsForwardVisible(false); setForwardContent(null); }}
      />

      {/* Options Menu Modal */}
      <Modal transparent visible={!!menuGig} animationType="fade" onRequestClose={() => setMenuGig(null)}>
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuGig(null)} />
          <View style={[styles.menuBox, { backgroundColor: theme.backgroundElement }]}>
            {menuGig?.authorUid === user?.uid && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuGig(null); Alert.alert('Coming Soon', 'Edit feature will be available soon.'); }} activeOpacity={0.7}>
                <Ionicons name="pencil-outline" size={18} color={theme.text} />
                <Text style={[styles.menuLabel, { color: theme.text }]}>Edit Work</Text>
              </TouchableOpacity>
            )}

            {(menuGig?.authorUid === user?.uid || user?.role === 'SUPER_ADMIN') && (
              <TouchableOpacity style={styles.menuItem} onPress={handleDelete} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={[styles.menuLabel, { color: "#EF4444" }]}>Delete Work</Text>
              </TouchableOpacity>
            )}

            {menuGig?.authorUid !== user?.uid && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuGig(null); useAppStore.getState().showToast('Saved successfully', 'success'); }} activeOpacity={0.7}>
                  <Ionicons name="bookmark-outline" size={18} color={theme.text} />
                  <Text style={[styles.menuLabel, { color: theme.text }]}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { const id = menuGig?.id; setMenuGig(null); if(id) router.push(`/gigs/${id}`); }} activeOpacity={0.7}>
                  <Ionicons name="chatbubble-outline" size={18} color={theme.text} />
                  <Text style={[styles.menuLabel, { color: theme.text }]}>Private comment</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuGig(null); useAppStore.getState().showToast('Report submitted', 'success'); }} activeOpacity={0.7}>
                  <Ionicons name="flag-outline" size={18} color="#EF4444" />
                  <Text style={[styles.menuLabel, { color: "#EF4444" }]}>Report</Text>
                </TouchableOpacity>
              </>
            )}
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  },
  authorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    marginRight: 4,
  },
  timeAgo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 6,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
    paddingTop: 12,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rewardText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  applicationsCount: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  menuOverlay: {
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  menuBox: {
    borderTopLeftRadius: 22, 
    borderTopRightRadius: 22,
    padding: 8, 
    paddingBottom: 36,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, 
    shadowRadius: 12, 
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 14,
    paddingHorizontal: 20, 
    paddingVertical: 14,
  },
  menuLabel: { 
    fontSize: 15, 
    fontFamily: 'Inter-Medium',
  },
});
