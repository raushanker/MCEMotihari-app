import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, limit, getDocs, startAfter, where, orderBy, doc, updateDoc, deleteDoc, addDoc, QueryDocumentSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/utils/auditLogger';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 15;

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
}

export default function PostsModerationScreen() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  
  const [posts, setPosts] = useState<PostDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const categories = ['All', 'General', 'Departments', 'Hostels', 'Clubs', 'Placement', 'Sports', 'Alumni'];

  useEffect(() => {
    fetchPosts(true);
  }, [filterCategory]);

  const fetchPosts = async (isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
      setHasMore(true);
    } else {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }

    try {
      let q = collection(db, 'posts');
      let constraints: any[] = [];

      if (filterCategory !== 'All') {
        constraints.push(where('category', '==', filterCategory));
      }

      if (searchQuery.trim() !== '') {
        constraints.push(where('authorName', '>=', searchQuery));
        constraints.push(where('authorName', '<=', searchQuery + '\uf8ff'));
        constraints.push(orderBy('authorName'));
      } else {
        constraints.push(orderBy('createdAt', 'desc'));
      }

      constraints.push(limit(PAGE_SIZE));

      if (!isRefresh && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const finalQuery = query(q, ...constraints);
      const snapshot = await getDocs(finalQuery);

      const newPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PostDoc));

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
          action: currentHidden ? 'Unhide post' : 'Hide post',
          targetId: postId,
          targetType: 'Post',
          details: `Author: ${authorName}`
        });
      }

      // Send policy warning to author if hiding
      if (!currentHidden && item.authorUid) {
        try {
          const notifRef = collection(db, 'users', item.authorUid, 'notifications');
          const shortPreview = item.content.slice(0, 60) + (item.content.length > 60 ? '...' : '');
          const titlePreview = item.title ? `"${item.title}"` : `"${shortPreview}"`;
          
          const notifTitle = '⚠️ Post Hidden: Policy Violation';
          const notifBody = `Your post ${titlePreview} has been hidden because it violates our Terms, Conditions & Safety Policies. Tapping here allows you to view it.`;

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
      
      Alert.alert('Success', `Post is now ${!currentHidden ? 'hidden' : 'visible'}.`);
    } catch (error) {
      console.error('Error updating post visibility:', error);
      Alert.alert('Error', 'Failed to update post visibility');
    }
  };

  const confirmDeletePost = (item: PostDoc) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to permanently delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePost(item) }
      ]
    );
  };

  const deletePost = async (item: PostDoc) => {
    const postId = item.id;
    const authorName = item.authorName;
    try {
      // Send policy notification first before deleting doc
      if (item.authorUid) {
        try {
          const notifRef = collection(db, 'users', item.authorUid, 'notifications');
          const shortPreview = item.content.slice(0, 60) + (item.content.length > 60 ? '...' : '');
          const titlePreview = item.title ? `"${item.title}"` : `"${shortPreview}"`;
          
          const notifTitle = '⚠️ Post Removed: Policy Violation';
          const notifBody = `Your post ${titlePreview} has been permanently deleted because it violates our Terms, Conditions & Safety Policies. Tap to view the archived text.`;

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
              content: item.content,
              authorName: item.authorName,
              category: item.category,
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
                {item.category} • {item.timestamp || 'Recent'}
              </Text>
            </View>
          </View>
          
          {isHidden && (
            <View style={[styles.badge, { backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.badgeText, { color: '#EF4444' }]}>Hidden</Text>
            </View>
          )}
          {item.isSpamCandidate && !isHidden && (
            <View style={[styles.badge, { backgroundColor: '#FFFBEB' }]}>
              <Text style={[styles.badgeText, { color: '#D97706' }]}>SPAM FLAG</Text>
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
          <TouchableOpacity 
            style={[styles.actionBtn, { borderColor: '#3B82F6' }]} 
            onPress={() => router.push(`/post/${item.id}?fromAdmin=posts` as any)}
          >
            <Text style={[styles.actionText, { color: '#3B82F6' }]}>View Post</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { borderColor: '#F59E0B' }]} 
            onPress={() => toggleVisibility(item, !!isHidden)}
          >
            <Text style={[styles.actionText, { color: '#F59E0B' }]}>
              {isHidden ? 'Unhide' : 'Hide'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { borderColor: '#DC2626' }]} 
            onPress={() => confirmDeletePost(item)}
          >
            <Text style={[styles.actionText, { color: '#DC2626' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => router.replace('/notanadmin/dashboard')}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ marginLeft: 12, flexShrink: 1 }}>
            <Text style={styles.title} numberOfLines={2}>Content Moderation</Text>
            <Text style={styles.subtitle} numberOfLines={2}>Review, hide, or remove posts from the community</Text>
          </View>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Author Name (Prefix)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleFilters}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, filterCategory === cat && styles.filterChipActive]}
              onPress={() => setFilterCategory(cat)}
            >
              <Text style={[styles.filterChipText, filterCategory === cat && styles.filterChipTextActive]}>
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
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={() => fetchPosts(false)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No posts found</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="small" color="#3B82F6" style={{ margin: 20 }} /> : null
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
