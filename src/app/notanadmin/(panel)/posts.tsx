import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity,  ActivityIndicator, Alert, Image, Dimensions, ScrollView, Platform } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { collection, query, limit, getDocs, startAfter, where, orderBy, doc, updateDoc, deleteDoc, addDoc, QueryDocumentSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/utils/auditLogger';
import { getFormattedPostTime } from '@/utils/timeFormat';
import { useThemeColors } from '@/hooks/useThemeColors';

import { useAppStore } from '@/store/useAppStore';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 12;

interface PostDoc {
  id: string;
  authorName: string;
  authorRole?: string;
  authorUid?: string;
  category: string;
  title?: string;
  content: string;
  imageUrl?: string;
  claps: number;
  commentsCount: number;
  isHidden?: boolean;
  createdAt?: any;
  timestamp?: string;
  isSpamCandidate?: boolean;
  flaggedReason?: string;
  flaggedKeywords?: string[];
}

export default function PostsModerationScreen() {
  const { isDark } = useThemeColors();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const globalPosts = useAppStore(state => state.posts);
  
  const [posts, setPosts] = useState<PostDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('Today post');

  const categories = ['Today post', 'All post', 'Spam detected post', 'Spam and removed'];

  useEffect(() => {
    fetchPosts(true);
  }, [filterCategory]);

  const fetchPosts = async (isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
      setHasMore(true);
      setPosts([]); // Clear immediately so stale data doesn't persist if query fails
    } else {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }

    try {
      const qText = searchQuery.trim().toLowerCase();
      
      // 1. ZERO COST: Client-side searching across cached posts OR Today's posts
      if (qText !== '' || filterCategory === 'Today post') {
        let filtered = globalPosts.map(p => ({
          ...p,
          id: p.id,
          authorName: p.authorName,
          category: p.category,
          content: p.content,
          imageUrl: p.imageUrl,
          title: p.title,
          claps: p.claps || 0,
          commentsCount: p.commentsCount || 0,
          isHidden: p.isHidden,
          isSpamCandidate: p.isSpamCandidate,
          createdAt: p.createdAt,
          timestamp: p.timestamp
        } as unknown as PostDoc));

        if (qText !== '') {
          filtered = filtered.filter(p => 
            (p.authorName && p.authorName.toLowerCase().includes(qText)) ||
            (p.title && p.title.toLowerCase().includes(qText)) ||
            (p.content && p.content.toLowerCase().includes(qText))
          );
        } else if (filterCategory === 'Today post') {
          const today = new Date();
          today.setHours(0,0,0,0);
          filtered = filtered.filter(p => {
            let date = new Date(0);
            if (p.createdAt) {
              date = p.createdAt.seconds ? new Date(p.createdAt.seconds * 1000) : new Date(p.createdAt);
            } else if (p.timestamp) {
              date = new Date(p.timestamp);
            }
            return date >= today;
          });
        }

        const startIndex = isRefresh ? 0 : posts.length;
        const nextBatch = filtered.slice(startIndex, startIndex + PAGE_SIZE);
        
        if (isRefresh) {
          setPosts(nextBatch);
        } else {
          setPosts(prev => [...prev, ...nextBatch]);
        }

        setHasMore(startIndex + PAGE_SIZE < filtered.length);
        setLastDoc(null);
        return;
      }

      // 2. SERVER COST: Pagination over full database for All, Spam, etc.
      let q = collection(db, 'posts');
      let constraints: any[] = [];

      if (filterCategory === 'Spam detected post') {
        constraints.push(where('isSpamCandidate', '==', true));
      } else if (filterCategory === 'Spam and removed') {
        constraints.push(where('isHidden', '==', true));
      } else {
        constraints.push(orderBy('createdAt', 'desc'));
      }

      constraints.push(limit(PAGE_SIZE));

      if (!isRefresh && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const finalQuery = query(q, ...constraints);
      const snapshot = await getDocs(finalQuery);

      let newPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PostDoc));

      // Sort manually for Spam queries if needed (since we omitted orderBy to avoid index error)
      if (filterCategory !== 'All post') {
        newPosts.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
      }

      if (isRefresh) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to fetch posts');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearchSubmit = () => {
    fetchPosts(true);
  };

  const toggleVisibility = async (item: PostDoc, currentHidden: boolean) => {
    const postId = item.id;
    const authorName = item.authorName;
    try {
      await updateDoc(doc(db, 'posts', postId), { isHidden: !currentHidden });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isHidden: !currentHidden } : p));
      
      if (currentUser) {
        await logAdminAction({
          adminUid: currentUser.uid,
          adminName: currentUser.name || 'Admin',
          adminEmail: currentUser.email || '',
          action: currentHidden ? 'Removed Spam Mark' : 'Marked post as Spam',
          targetId: postId,
          targetType: 'Post',
          details: `Author: ${authorName}`
        });
      }

      // Send policy warning to author if hiding
      if (!currentHidden && item.authorUid) {
        try {
          const notifRef = collection(db, 'users', item.authorUid, 'notifications');
          const safeContent = item.content || '';
          const shortPreview = safeContent.slice(0, 60) + (safeContent.length > 60 ? '...' : '');
          const titlePreview = item.title ? `"${item.title}"` : `"${shortPreview}"`;
          
          const notifTitle = 'Post Review Completed';
          const notifBody = 'Your post was reviewed by administrators and has been removed from public feed due to policy concerns.';

          await addDoc(notifRef, {
            type: 'post_policy_violation',
            title: notifTitle,
            body: notifBody,
            timestamp: new Date().toLocaleString(),
            read: false,
            targetPostId: postId,
            category: 'Policy Warning',
            senderName: 'MCE Connect Moderation Team',
            deletedPostData: null
          });

          const profileSnap = await getDoc(doc(db, 'publicProfiles', item.authorUid));
          if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            if (profileData.pushToken) {
              const { sendPushNotifications } = require('@/utils/notifications');
              await sendPushNotifications([profileData.pushToken], notifTitle, notifBody, '/notifications');
            }
          }
        } catch (err) {
          console.error('Failed to send policy notification:', err);
        }
      }
      
      Alert.alert('Success', `Post has been ${!currentHidden ? 'marked as spam and removed' : 'restored to feed'}.`);
    } catch (error) {
      console.error('Error updating post visibility:', error);
      Alert.alert('Error', 'Failed to update post status');
    }
  };

  const confirmDeletePost = (item: PostDoc) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm('Are you sure you want to permanently delete this post? This cannot be undone.');
      if (confirm) deletePost(item);
    } else {
      Alert.alert(
        'Delete Post',
        'Are you sure you want to permanently delete this post? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deletePost(item) }
        ]
      );
    }
  };

  const deletePost = async (item: PostDoc) => {
    const postId = item.id;
    const authorName = item.authorName;
    try {
      // Send policy notification first before deleting doc
      if (item.authorUid) {
        try {
          const notifRef = collection(db, 'users', item.authorUid, 'notifications');
          const safeContent = item.content || '';
          const shortPreview = safeContent.slice(0, 60) + (safeContent.length > 60 ? '...' : '');
          const titlePreview = item.title ? `"${item.title}"` : `"${shortPreview}"`;
          
          const notifTitle = 'Post Review Completed';
          const notifBody = 'Your post was reviewed by administrators and has been removed from public feed due to policy concerns.';

          await addDoc(notifRef, {
            type: 'post_policy_violation',
            title: notifTitle,
            body: notifBody,
            timestamp: new Date().toLocaleString(),
            read: false,
            targetPostId: '', // post no longer exists
            category: 'Policy Warning',
            senderName: 'MCE Connect Moderation Team',
            deletedPostData: {
              title: item.title || '',
              content: item.content || '',
              authorName: item.authorName || 'Unknown',
              category: item.category || 'General',
              deletedAt: new Date().toLocaleString()
            }
          });

          const profileSnap = await getDoc(doc(db, 'publicProfiles', item.authorUid));
          if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            if (profileData.pushToken) {
              const { sendPushNotifications } = require('@/utils/notifications');
              await sendPushNotifications([profileData.pushToken], notifTitle, notifBody, '/notifications');
            }
          }
        } catch (err) {
          console.error('Failed to send policy notification:', err);
        }
      }

      await deleteDoc(doc(db, 'posts', postId));
      setPosts(prev => prev.filter(p => p.id !== postId));
      
      if (currentUser) {
        await logAdminAction({
          adminUid: currentUser.uid,
          adminName: currentUser.name || 'Admin',
          adminEmail: currentUser.email || '',
          action: 'Deleted post',
          targetId: postId,
          targetType: 'Post',
          details: `Author: ${authorName}`
        });
      }
      
      Alert.alert('Success', 'Post deleted permanently.');
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post');
    }
  };

  const approvePost = async (item: PostDoc, isIgnore: boolean) => {
    const postId = item.id;
    try {
      await updateDoc(doc(db, 'posts', postId), { isSpamCandidate: false, isApproved: true, flaggedReason: null, flaggedKeywords: null });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isSpamCandidate: false, isApproved: true, flaggedReason: undefined, flaggedKeywords: undefined } : p));
      
      if (!isIgnore && item.authorUid) {
        try {
          const notifRef = collection(db, 'users', item.authorUid, 'notifications');
          const notifTitle = 'Post Review Completed';
          const notifBody = 'Your post was reviewed and approved.';
          await addDoc(notifRef, {
            type: 'post_approved',
            title: notifTitle,
            body: notifBody,
            timestamp: new Date().toLocaleString(),
            read: false,
            targetPostId: postId,
            category: 'System',
            senderName: 'MCE Connect Moderation Team'
          });
          const profileSnap = await getDoc(doc(db, 'publicProfiles', item.authorUid));
          if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            if (profileData.pushToken) {
              const { sendPushNotifications } = require('@/utils/notifications');
              await sendPushNotifications([profileData.pushToken], notifTitle, notifBody, '/notifications');
            }
          }
        } catch (err) {
          console.error('Failed to send approval notification:', err);
        }
      }
      
      if (currentUser) {
        await logAdminAction({
          adminUid: currentUser.uid,
          adminName: currentUser.name || 'Admin',
          adminEmail: currentUser.email || '',
          action: isIgnore ? 'Ignored spam flag' : 'Approved post',
          targetId: postId,
          targetType: 'Post',
          details: `Author: ${item.authorName}`
        });
      }
    } catch (error) {
      console.error('Error approving post:', error);
      Alert.alert('Error', 'Failed to update post');
    }
  };

  const renderItem = ({ item }: { item: PostDoc }) => {
    const isHidden = item.isHidden;
    
    return (
      <View style={[styles.postCard, isHidden && styles.postCardHidden]}>
        <View style={styles.postHeader}>
          <View style={styles.authorInfo}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{item.authorName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.authorName}>{item.authorName}</Text>
              <Text style={styles.postMeta}>
                {item.category} • {getFormattedPostTime(item.createdAt, item.timestamp)}
              </Text>
            </View>
          </View>
          
          {isHidden && (
            <View style={[styles.badge, { backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.badgeText, { color: '#EF4444' }]}>Hidden</Text>
            </View>
          )}
          {item.isSpamCandidate && !isHidden && (
            <View style={{ marginTop: 8, padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5' }}>
              <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>[SPAM FLAG] RESTRICTED CONTENT</Text>
              <Text style={{ color: '#991B1B', fontSize: 11, marginTop: 4 }}>Reason: {item.flaggedReason}</Text>
              {item.flaggedKeywords && item.flaggedKeywords.length > 0 && (
                <Text style={{ color: '#991B1B', fontSize: 11, marginTop: 2 }}>Keywords: {item.flaggedKeywords.join(', ')}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.postBody}>
          {item.title ? <Text style={styles.postTitle}>{item.title}</Text> : null}
          <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>
          {item.imageUrl && (
            <View style={styles.imageIndicator}>
              <Ionicons name="image-outline" size={14} color="#64748B" />
              <Text style={styles.imageIndicatorText}>Contains Image</Text>
            </View>
          )}
        </View>
        
        <View style={styles.postStats}>
          <Text style={styles.statText}>❤️ {item.claps || 0} Hearts</Text>
          <Text style={styles.statText}>💬 {item.commentsCount || 0} comments</Text>
        </View>

        <View style={styles.actions}>
          {item.isSpamCandidate ? (
            <>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: '#10B981' }]} onPress={() => approvePost(item, false)}>
                <Text style={[styles.actionText, { color: '#10B981' }]}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { borderColor: '#64748B' }]} onPress={() => approvePost(item, true)}>
                <Text style={[styles.actionText, { color: '#64748B' }]}>Ignore Flag</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, { borderColor: '#3B82F6' }]} onPress={() => router.push(`/post/${item.id}?fromAdmin=posts` as any)}>
              <Text style={[styles.actionText, { color: '#3B82F6' }]}>View Post</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.actionBtn, { borderColor: '#F59E0B' }]} onPress={() => toggleVisibility(item, !!isHidden)}>
            <Text style={[styles.actionText, { color: '#F59E0B' }]}>{isHidden ? 'Unmark Spam' : 'Mark as Spam'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: '#DC2626' }]} onPress={() => confirmDeletePost(item)}>
            <Text style={[styles.actionText, { color: '#DC2626' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]} 
            onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          >
            <Ionicons name="arrow-back" size={20} color={isDark ? '#F8FAFC' : '#0F172A'} />
          </TouchableOpacity>
          <View style={{ marginLeft: 16 }}>
            <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Discussions</Text>
            <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>Moderation & Content Review</Text>
          </View>
        </View>
      </View>

      <View style={[styles.filtersContainer, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
          <Ionicons name="search" size={18} color={isDark ? '#64748B' : '#94A3B8'} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
            placeholder="Search caption, title, or author..."
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
           autoCapitalize="sentences" />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={isDark ? '#64748B' : '#94A3B8'} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleFilters}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip, 
                { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                filterCategory === cat && [styles.filterChipActive, { backgroundColor: isDark ? '#F8FAFC' : '#0F172A', borderColor: isDark ? '#F8FAFC' : '#0F172A' }]
              ]}
              onPress={() => setFilterCategory(cat)}
            >
              <Text style={[
                styles.filterChipText, 
                { color: isDark ? '#94A3B8' : '#64748B' },
                filterCategory === cat && [styles.filterChipTextActive, { color: isDark ? '#0F172A' : '#FFFFFF' }]
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={Platform.OS === 'web' ? undefined : () => fetchPosts(false)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No posts found</Text>
            </View>
          }
          ListFooterComponent={
            <View style={{ padding: 20, alignItems: 'center', paddingBottom: 120 }}>
              {loadingMore ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : hasMore && posts.length > 0 ? (
                <TouchableOpacity 
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderColor: '#3B82F6',
                    borderWidth: 1,
                    paddingHorizontal: 24,
                    paddingVertical: 10,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                  onPress={() => fetchPosts(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cloud-download-outline" size={18} color="#3B82F6" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#3B82F6', fontWeight: '700', fontSize: 14 }}>Load More Posts</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#0F172A',
    minWidth: 0,
  },
  roleFilters: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  postCardHidden: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    opacity: 0.8,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  postMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  postBody: {
    marginBottom: 12,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  postContent: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  imageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  imageIndicatorText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
    fontWeight: '500',
  },
  postStats: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  actionBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 12,
  }
});
