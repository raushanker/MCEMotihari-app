import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { PostCard } from '@/components/PostCard';
import { doc, getDoc } from 'firebase/firestore';
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

  const publicPosts = useMemo(() => {
    if (!profileUid && !profileName) return [];
    return posts.filter(post => {
      if (post.isAnonymous) return false;
      const matchesUid = post.authorUid && profileUid && post.authorUid === profileUid;
      const matchesRealName = post.authorRealName && profileName && post.authorRealName === profileName;
      const matchesAuthorName = post.authorName && profileName && post.authorName === profileName;
      return !!(matchesUid || matchesRealName || matchesAuthorName);
    });
  }, [posts, profileUid, profileName]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchPosts({ refresh: true });
    setLoading(false);
  };

  const renderHeader = () => (
    <View style={styles.header}>
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

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
      {renderHeader()}
      
      {loading ? (
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
          refreshing={loading}
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
    </SafeAreaView>
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
    paddingVertical: 12,
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
