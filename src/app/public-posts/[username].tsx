import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Platform, ActivityIndicator, Alert, Share } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore, Post, sendConnectionRequest, cancelConnectionRequest, sortPostsPriority } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { PostCard } from '@/components/PostCard';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

const resolvedProfileCache: Record<string, { uid: string; name: string; role?: string; adminRole?: string }> = {};

export default function PublicPostsScreen() {
  const theme = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const { username } = useLocalSearchParams<{ username: string }>();
  
  const posts = useAppStore(state => state.posts);
  const fetchPosts = useAppStore(state => state.fetchPosts);
  
  const handleClap = useAppStore(state => state.handleClap);
  const submitVote = useAppStore(state => state.submitVote);
  const togglePostBookmark = useAppStore(state => state.togglePostBookmark);
  const bookmarkedPostIds = useAppStore(state => state.bookmarkedPostIds);
  const connections = useAppStore(state => state.connections);
  const deletePost = useAppStore(state => state.deletePost);
  const editPost = useAppStore(state => state.editPost);
  const blockUser = useAppStore(state => state.blockUser);

  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState<string>('');
  const [profileUid, setProfileUid] = useState<string>('');
  const [profileRole, setProfileRole] = useState<string>('');
  const [profileAdminRole, setProfileAdminRole] = useState<string>('');

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isDirectLoading, setIsDirectLoading] = useState(false);

  const handleLocalClap = useCallback((id: string) => {
    if (!user || user.role === 'Guest') {
      Alert.alert('Login Required 🔐', 'Clap karne ke liye pehle login karein.');
      return;
    }
    handleClap(id);
  }, [handleClap, user]);

  const handleLocalVote = useCallback((postId: string, optionId: string) => {
    if (!user || user.role === 'Guest') {
      Alert.alert('Login Required 🔐', 'Vote karne ke liye pehle login karein.');
      return;
    }
    submitVote(postId, optionId);
  }, [submitVote, user]);

  const handleLocalConnectToggle = useCallback(async (authorName: string, authorUid?: string, authorRole?: string, authorPhoto?: string) => {
    if (!user || user.role === 'Guest') {
      Alert.alert('Login Required 🔐', 'Connect karne ke liye pehle login karein.');
      return;
    }
    if (!authorUid) {
      Alert.alert('Connection Failed', 'Profile ID not found. Unable to connect.');
      return;
    }

    const contact = connections.find(c => c.id === authorUid);
    if (contact && contact.status === 'Connected') {
      return;
    }

    if (contact && contact.status === 'Sent') {
      if (Platform.OS === 'web') {
        const confirm = window.confirm(`Do you want to cancel the connection request sent to ${authorName}?`);
        if (confirm) {
          const success = await cancelConnectionRequest(user, authorUid);
          if (success) {
            const sortedPosts = sortPostsPriority(useAppStore.getState().posts, useAppStore.getState().connections);
            useAppStore.setState({ posts: sortedPosts });
          }
        }
      } else {
        Alert.alert(
          'Cancel Request',
          `Do you want to cancel the connection request sent to ${authorName}?`,
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes, Cancel',
              style: 'destructive',
              onPress: async () => {
                const success = await cancelConnectionRequest(user, authorUid);
                if (success) {
                  const sortedPosts = sortPostsPriority(useAppStore.getState().posts, useAppStore.getState().connections);
                  useAppStore.setState({ posts: sortedPosts });
                }
              }
            }
          ]
        );
      }
      return;
    }

    try {
      const success = await sendConnectionRequest(user, authorUid, authorName, authorRole || 'Student', authorPhoto);
      if (success) {
        const sortedPosts = sortPostsPriority(useAppStore.getState().posts, useAppStore.getState().connections);
        useAppStore.setState({ posts: sortedPosts });
        if (Platform.OS === 'web') {
          alert('Request Sent! Connection request sent successfully to ' + authorName);
        } else {
          Alert.alert('Request Sent 🤝', 'Connection request sent successfully to ' + authorName);
        }
      }
    } catch (err) {
      console.error('Failed to send request:', err);
      Alert.alert('Connection Failed', 'Failed to send connection request.');
    }
  }, [user, connections]);

  const handleLocalToggleBookmark = useCallback((id: string) => {
    if (!user || user.role === 'Guest') {
      Alert.alert('Login Required 🔐', 'Posts save karne ke liye pehle login karein.');
      return;
    }
    togglePostBookmark(id);
  }, [togglePostBookmark, user]);

  const handleCommentPress = useCallback((item: Post) => {
    router.push(`/post/${item.id}?focusComment=true` as any);
  }, [router]);

  const handleSharePost = useCallback(async (post: Post) => {
    try {
      const postUrl = `https://mcemotihari-app.web.app/post/${post.id}`;
      const titlePrefix = post.title ? `"${post.title}"\n` : '';
      
      let shortContent = post.content || '';
      if (shortContent.length > 120) {
        shortContent = shortContent.substring(0, 117) + '...';
      }
      
      let shareMessage = `📌 MCE Connect Post:\n`;
      shareMessage += `${titlePrefix || ''}${shortContent}\n\n`;
      shareMessage += `🔗 Read full post & view image: ${postUrl}\n\n`;
      shareMessage += `Download App: MCE Motihari connect\n`;
      shareMessage += `https://play.google.com/store/apps/details?id=mcemotihari.app`;

      await Share.share({
        title: post.title || 'MCE Connect Post',
        message: shareMessage,
        url: postUrl,
      });
    } catch (error) {
      console.error('Error sharing post:', error);
    }
  }, []);

  useEffect(() => {
    const resolveUser = async () => {
      if (!username) return;
      let originalUsername = Array.isArray(username) ? username[0] : username;
      originalUsername = originalUsername.trim();
      if (originalUsername.startsWith('@')) {
        originalUsername = originalUsername.substring(1);
      }
      const lowercaseUsername = originalUsername.toLowerCase();
      
      if (resolvedProfileCache[lowercaseUsername]) {
        const cached = resolvedProfileCache[lowercaseUsername];
        setProfileName(cached.name);
        setProfileUid(cached.uid);
        setProfileRole(cached.role || '');
        setProfileAdminRole(cached.adminRole || '');
        setLoading(false);
        return;
      }
      
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
          const name = publicDoc.data().name;
          const role = publicDoc.data().role || 'Student';
          const adminRole = publicDoc.data().adminRole || '';
          setProfileName(name);
          setProfileUid(resolvedUid);
          setProfileRole(role);
          setProfileAdminRole(adminRole);
          resolvedProfileCache[lowercaseUsername] = { uid: resolvedUid, name, role, adminRole };
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

    const userUid = user?.uid;
    const resolved = combined.map(p => {
      const storePost = posts.find(sp => sp.id === p.id);
      if (storePost) {
        return storePost;
      }
      const heartedBy = p.heartedBy || [];
      const isClapped = userUid ? heartedBy.includes(userUid) : false;
      return {
        ...p,
        isClapped
      };
    });

    resolved.sort((a, b) => {
      const tA = a.createdAt ? (typeof a.createdAt === 'object' && 'seconds' in a.createdAt ? (a.createdAt as any).seconds * 1000 : new Date(a.createdAt as any).getTime()) : 0;
      const tB = b.createdAt ? (typeof b.createdAt === 'object' && 'seconds' in b.createdAt ? (b.createdAt as any).seconds * 1000 : new Date(b.createdAt as any).getTime()) : 0;
      return tB - tA;
    });

    return resolved.filter(post => {
      if (post.isAnonymous) return false;
      const matchesUid = post.authorUid && profileUid && post.authorUid === profileUid;
      const matchesRealName = post.authorRealName && profileName && post.authorRealName === profileName;
      const matchesAuthorName = post.authorName && profileName && post.authorName === profileName;
      return !!(matchesUid || matchesRealName || matchesAuthorName);
    });
  }, [userPosts, posts, profileUid, profileName, user]);

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

  const renderHeader = () => {
    const isVerifiedAdmin = profileUid === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || 
                           profileUid === 'DdP2c855PSRUJwhmN9rvbkYBraP2' || 
                           profileAdminRole === 'SUPER_ADMIN';
    return (
      <View style={[styles.header, { paddingTop: insets.top, paddingBottom: 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingRight: 40, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {profileName ? `${profileName}'s Posts` : 'Public Activity'}
            {isVerifiedAdmin && (
              <Text> <Ionicons name="checkmark-circle" size={16} color="#1D9BF0" /></Text>
            )}
          </Text>
        </View>
      </View>
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {renderHeader()}
      
      { (loading || (isDirectLoading && publicPosts.length === 0)) ? (
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
          contentContainerStyle={[styles.listContent, { paddingBottom: 180 + insets.bottom }]}
          refreshing={loading || isDirectLoading}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const contact = item.authorUid ? connections.find(c => c.id === item.authorUid) : connections.find(c => c.name === item.authorName);
            const connectionStatus = contact ? contact.status : 'Connect';
            const isBookmarked = bookmarkedPostIds?.includes(item.id);

            return (
              <PostCard 
                item={item} 
                user={user}
                connectionStatus={connectionStatus}
                isBookmarked={isBookmarked}
                onClap={handleLocalClap}
                onCommentPress={() => handleCommentPress(item)}
                onPressCard={() => router.push(`/post/${item.id}`)}
                onVote={handleLocalVote}
                onConnectToggle={handleLocalConnectToggle}
                onSharePress={() => handleSharePost(item)}
                onToggleBookmark={handleLocalToggleBookmark}
                onDeletePost={deletePost}
                onEditPost={editPost}
                onBlockAuthor={blockUser}
                onAuthorPress={(author) => {
                  if (author.username) {
                    router.push(`/@${author.username}`);
                  } else if (author.uid) {
                    router.push(`/@${author.uid}`);
                  }
                }}
              />
            );
          }}
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
