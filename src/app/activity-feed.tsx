import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostCard } from '@/components/PostCard';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { verifyPostExists } from '@/utils/firestoreUtils';
import { clampedScrollY, feedScrollY } from '@/utils/scrollState';
import { useShallow } from 'zustand/react/shallow';

import { FlashList } from '@shopify/flash-list';

type FilterType = 'All' | 'Public' | 'Anonymous' | 'Polls' | 'Images';
const TypedFlashList = FlashList as any;
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList as any);
const ACTIVITY_HEADER_HEIGHT = 100;

export default function ActivityFeedScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  
  const { 
    posts, 
    user, 
    connections,
    bookmarkedPostIds,
    handleClap, 
    deletePost, 
    editPost, 
    blockUser,
    fetchPosts
  } = useAppStore(
    useShallow(state => ({
      posts: state.posts,
      user: state.user,
      connections: state.connections,
      bookmarkedPostIds: state.bookmarkedPostIds,
      handleClap: state.handleClap,
      deletePost: state.deletePost,
      editPost: state.editPost,
      blockUser: state.blockUser,
      fetchPosts: state.fetchPosts
    }))
  );

  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [visibleCount, setVisibleCount] = useState(10);
  const [refreshing, setRefreshing] = useState(false);

  // Filter posts authored by the logged-in user
  const myAllPosts = useMemo(() => {
    if (!user) return [];
    // Filter out deleted, missing, orphaned, or inaccessible posts
    const validPosts = posts.filter(post => post && post.id && (post.content || post.title || post.pollOptions) && post.authorName);
    return validPosts.filter(p => {
      const matchesUid = p.authorUid && p.authorUid === user.uid;
      const matchesRealName = p.authorRealName && user.name && p.authorRealName === user.name;
      const matchesAuthorName = !p.isAnonymous && p.authorName && user.name && p.authorName === user.name;
      return !!(matchesUid || matchesRealName || matchesAuthorName);
    });
  }, [posts, user?.name, user?.uid]);

  // Apply active category filters
  const filteredPosts = useMemo(() => {
    switch (activeFilter) {
      case 'Public':
        return myAllPosts.filter(p => !p.isAnonymous && !p.pollOptions);
      case 'Anonymous':
        return myAllPosts.filter(p => p.isAnonymous);
      case 'Polls':
        return myAllPosts.filter(p => !!p.pollOptions);
      case 'Images':
        return myAllPosts.filter(p => !!p.imageUrl);
      default:
        return myAllPosts;
    }
  }, [myAllPosts, activeFilter]);

  // Paginated data slice
  const paginatedData = useMemo(() => {
    return filteredPosts.slice(0, visibleCount);
  }, [filteredPosts, visibleCount]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchPosts({ refresh: true });
      setVisibleCount(10);
      useAppStore.getState().showToast('Activity feed updated! 🚀', 'success');
    } catch (e) {
      console.warn('Failed to refresh activity feed posts:', e);
      useAppStore.getState().showToast('Failed to update activity feed ⚠️', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (visibleCount < filteredPosts.length) {
      setVisibleCount(prev => prev + 10);
    }
  };

  // connection lookups
  const getConnectionStatus = (authorUid?: string, authorName?: string) => {
    if (!authorName) return 'Connect';
    const conn = authorUid ? connections.find(c => c.id === authorUid) : connections.find(c => c.name === authorName);
    return conn ? conn.status : 'Connect';
  };

  const renderFilterChip = (filter: FilterType) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        key={filter}
        onPress={() => {
          setActiveFilter(filter);
          setVisibleCount(10); // Reset pagination on filter swap
        }}
        style={[
          styles.chip,
          { 
            backgroundColor: isActive ? '#D95A1D' : theme.backgroundElement,
            borderColor: theme.cardBorder
          }
        ]}
        activeOpacity={0.8}
      >
        <Text style={[styles.chipText, { color: isActive ? '#FFFFFF' : theme.textSecondary }]}>
          {filter}
        </Text>
      </TouchableOpacity>
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Fixed Status Bar Background */}
      <View style={{ height: insets.top, backgroundColor: theme.backgroundElement, zIndex: 101 }} />

      {/* Header bar */}
      <View style={{ zIndex: 100, backgroundColor: theme.background }}>
        <View style={[styles.headerRow, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder, height: 60 }]}>
          <TouchableOpacity 
            style={[styles.backBtn, { borderColor: theme.cardBorder, backgroundColor: theme.background }]} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>My Activities</Text>
          <View style={{ width: 34 }} />
        </View>

        {/* Horizontal filter chips list */}
        <View style={styles.filterWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={['All', 'Public', 'Anonymous', 'Polls', 'Images'] as FilterType[]}
            renderItem={({ item }) => renderFilterChip(item)}
            keyExtractor={item => item}
            contentContainerStyle={styles.filterListContainer}
          />
        </View>
      </View>

      {/* Activities Feed */}
      {paginatedData.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📝</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No matching activities</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Aapne is filter category me koi post share nahi kiya hai.
          </Text>
        </View>
      ) : (
        <AnimatedFlashList
          estimatedItemSize={380}
          drawDistance={Platform.OS === 'android' ? 2000 : 1500}
          data={paginatedData}
          onScroll={(event: any) => {
            feedScrollY.setValue(event.nativeEvent.contentOffset.y);
          }}
          scrollEventThrottle={16}
          keyExtractor={(item: any) => item.id}
          showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.feedScrollBody, { paddingTop: 10, paddingBottom: 120 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#D95A1D']}
              tintColor="#D95A1D"
              progressViewOffset={0}
              progressBackgroundColor={theme.backgroundElement || '#FFFFFF'}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={() => {
            if (visibleCount < filteredPosts.length) {
              return (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color="#D95A1D" />
                </View>
              );
            }
            return null;
          }}
          renderItem={({ item }: { item: any }) => (
            <View style={styles.cardSpacing}>
              <PostCard
                item={item}
                user={user}
                connectionStatus={getConnectionStatus(item.authorUid, item.authorName)}
                isBookmarked={bookmarkedPostIds?.includes(item.id)}
                onClap={(id) => handleClap(id)}
                onCommentPress={async (post) => {
                  const exists = await verifyPostExists(post.id);
                  if (exists) {
                    router.push(`/post/${post.id}?focus=true&from=activity`);
                  }
                }}
                onPressCard={async (postId) => {
                  const exists = await verifyPostExists(postId);
                  if (exists) {
                    router.push(`/post/${postId}?from=activity`);
                  }
                }}
                onVote={(postId, optionId) => {
                  const storeState = useAppStore.getState();
                  storeState.submitVote?.(postId, optionId);
                }}
                onConnectToggle={() => {}}
                onLinkPress={(url) => {
                  if (Platform.OS === 'web') {
                    const newWindow = window.open(url, '_blank');
                    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                      window.location.href = url;
                    }
                  } else {
                    const Linking = require('react-native').Linking;
                    Linking.openURL(url).catch(() => {});
                  }
                }}
                onSharePress={() => {
                  const postUrl = `https://mcemotihari-app.web.app/post/${item.id}`;
                  let shareMessage = `Hey MCEians! 👋\n\n`;
                  shareMessage += `Check out this post on MCE Connect:\n\n`;
                  if (item.title) {
                    shareMessage += `"${item.title}"\n\n`;
                  }
                  shareMessage += `📲 Download MCE Connect App!\n\n`;
                  shareMessage += `Read full post here:\n`;
                  shareMessage += `${postUrl}`;

                  const Share = require('react-native').Share;
                  Share.share({
                    title: item.title || 'MCE Connect Post',
                    message: shareMessage,
                    url: postUrl,
                  }).catch(() => {});
                }}
                onToggleBookmark={(id) => {
                  const storeState = useAppStore.getState();
                  storeState.togglePostBookmark?.(id);
                }}
                onDeletePost={(id) => deletePost(id)}
                onEditPost={(id, content) => editPost(id, content)}
                onBlockAuthor={(authorUid) => blockUser(authorUid)}
                onAuthorPress={(author) => {
                  if (user && author.uid === user.uid) {
                    router.push('/profile');
                  } else if (author.uid) {
                    router.push(`/@${author.uid}?from=feed`);
                  }
                }}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      }
    })
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  filterWrapper: {
    paddingVertical: 10,
  },
  filterListContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  feedScrollBody: {
    paddingBottom: 24,
  },
  cardSpacing: {
    marginBottom: 10,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  center: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  }
});
