import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore, Post } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { PostCard } from '@/components/PostCard';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

export default function PublicPostsScreen() {
  const theme = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const { username } = useLocalSearchParams<{ username: string }>();
  
  const posts = useAppStore(state => state.posts);
  const fetchPosts = useAppStore(state => state.fetchPosts);
  
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState<string>('');
  const [profileUid, setProfileUid] = useState<string>('');

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isDirectLoading, setIsDirectLoading] = useState(false);

  useEffect(() => {
    const resolveUser = async () => {
      if (!username) return;
      let originalUsername = Array.isArray(username) ? username[0] : username;
      originalUsername = originalUsername.trim();
      if (originalUsername.startsWith('@')) {
        originalUsername = originalUsername.substring(1);
      }
      const lowercaseUsername = originalUsername.toLowerCase();
      
      try {
        const usernameDocRef = doc(db, 'usernames', lowercaseUsername);
        const usernameDoc = await getDoc(usernameDocRef);
        
        let resolvedUid = null;
        if (usernameDoc.exists()) {
          resolvedUid = usernameDoc.data().uid;
        } else {
          // Fallback: Check if the original casing is itself a valid UID
          const publicDocRefTest = doc(db, 'publicProfiles', originalUsername);
          const publicDocTest = await getDoc(publicDocRefTest);
          if (publicDocTest.exists()) {
            resolvedUid = originalUsername;
          } else {
            resolvedUid = lowercaseUsername;
          }
        }
        
        const publicDocRef = doc(db, 'publicProfiles', resolvedUid);
        const publicDoc = await getDoc(publicDocRef);
        if (publicDoc.exists()) {
          setProfileName(publicDoc.data().name);
          setProfileUid(resolvedUid);
        }
      } catch (err) {
        console.warn('Failed to resolve profile name for public posts:', err);
      } finally {
        // Fetch posts so we actually have data to filter
        if (useAppStore.getState().posts.length === 0) {
           await fetchPosts({ refresh: true });
         }
        setLoading(false);
      }
    };
    resolveUser();
  }, [username]);

  useEffect(() => {
    if (!profileUid) return;
    
    let active = true;
    const fetchDirectPosts = async () => {
      setIsDirectLoading(true);
      try {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where('authorUid', '==', profileUid));
        const querySnapshot = await getDocs(q);
        
        if (!active) return;
        
        const fetched: Post[] = [];
        querySnapshot.forEach(docSnap => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as Post);
        });
        
        // Sort descending in memory by createdAt
        fetched.sort((a, b) => {
          const tA = a.createdAt ? (typeof a.createdAt === 'object' && 'seconds' in a.createdAt ? (a.createdAt as any).seconds * 1000 : new Date(a.createdAt as any).getTime()) : 0;
          const tB = b.createdAt ? (typeof b.createdAt === 'object' && 'seconds' in b.createdAt ? (b.createdAt as any).seconds * 1000 : new Date(b.createdAt as any).getTime()) : 0;
          return tB - tA;
        });
        
        setUserPosts(fetched);
      } catch (err) {
        console.warn('Failed to fetch user posts directly in public-posts:', err);
      } finally {
        if (active) {
          setIsDirectLoading(false);
        }
      }
    };
    
    fetchDirectPosts();
    
    return () => {
      active = false;
    };
  }, [profileUid]);

  const publicPosts = useMemo(() => {
    if (!profileUid && !profileName) return [];
    
    const combined = [...userPosts];
    const seenIds = new Set(combined.map(p => p.id));
    
    posts.forEach(post => {
      if (!seenIds.has(post.id)) {
        const matchesUid = post.authorUid && profileUid && post.authorUid === profileUid;
        const matchesRealName = post.authorRealName && profileName && post.authorRealName === profileName;
        const matchesAuthorName = post.authorName && profileName && post.authorName === profileName;
        const isAuthor = !!(matchesUid || matchesRealName || matchesAuthorName);
        if (isAuthor) {
          combined.push(post);
          seenIds.add(post.id);
        }
      }
    });

    combined.sort((a, b) => {
      const tA = a.createdAt ? (typeof a.createdAt === 'object' && 'seconds' in a.createdAt ? (a.createdAt as any).seconds * 1000 : new Date(a.createdAt as any).getTime()) : 0;
      const tB = b.createdAt ? (typeof b.createdAt === 'object' && 'seconds' in b.createdAt ? (b.createdAt as any).seconds * 1000 : new Date(b.createdAt as any).getTime()) : 0;
      return tB - tA;
    });

    return combined.filter(post => {
      if (post.isAnonymous) return false;
      const matchesUid = post.authorUid && profileUid && post.authorUid === profileUid;
      const matchesRealName = post.authorRealName && profileName && post.authorRealName === profileName;
      const matchesAuthorName = post.authorName && profileName && post.authorName === profileName;
      return !!(matchesUid || matchesRealName || matchesAuthorName);
    });
  }, [userPosts, posts, profileUid, profileName]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchPosts({ refresh: true });
    } catch (e) {
      console.warn('Global fetchPosts refresh failed:', e);
    }
    
    if (profileUid) {
      try {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where('authorUid', '==', profileUid));
        const querySnapshot = await getDocs(q);
        const fetched: Post[] = [];
        querySnapshot.forEach(docSnap => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as Post);
        });
        fetched.sort((a, b) => {
          const tA = a.createdAt ? (typeof a.createdAt === 'object' && 'seconds' in a.createdAt ? (a.createdAt as any).seconds * 1000 : new Date(a.createdAt as any).getTime()) : 0;
          const tB = b.createdAt ? (typeof b.createdAt === 'object' && 'seconds' in b.createdAt ? (b.createdAt as any).seconds * 1000 : new Date(b.createdAt as any).getTime()) : 0;
          return tB - tA;
        });
        setUserPosts(fetched);
      } catch (err) {
        console.warn('Failed to refresh direct posts:', err);
      }
    }
    setLoading(false);
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top, paddingBottom: 12 }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
        <Ionicons name="chevron-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <View style={{ flex: 1, paddingRight: 40 }}>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {profileName ? `${profileName}'s Posts` : 'Public Activity'}
        </Text>
      </View>
    </View>
  );

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {renderHeader()}
      
      { (loading || isDirectLoading) ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : publicPosts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No public posts available.</Text>
        </View>
      ) : (
        <FlatList
          data={publicPosts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          refreshing={loading || isDirectLoading}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PostCard 
              item={item} 
              user={user}
              onClap={() => {}}
              onCommentPress={() => {}}
              onVote={() => {}}
              onPressCard={() => router.push(`/post/${item.id}`)} 
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContent: {
    paddingTop: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  }
});
