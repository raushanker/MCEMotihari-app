import React, { useState, useEffect, useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { feedScrollY, clampedScrollY } from '@/utils/scrollState';
import { Image } from 'expo-image';

import { Ionicons } from '@expo/vector-icons';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppStore, ContactConnection, sendConnectionRequest, cancelConnectionRequest } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useThemeColors } from '@/hooks/useThemeColors';

import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

const { width } = Dimensions.get('window');

function NetworkAvatar({ uri, name, style }: { uri: string; name: string; style: any }) {
  const fallbackUri = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(name || 'Felix')}`;
  const initialUri = uri && typeof uri === 'string' && uri.trim() !== '' && uri !== 'null' && uri !== 'undefined' ? uri : fallbackUri;
  const [imgSrc, setImgSrc] = useState<any>({ uri: initialUri });

  useEffect(() => {
    const nextUri = uri && typeof uri === 'string' && uri.trim() !== '' && uri !== 'null' && uri !== 'undefined' ? uri : fallbackUri;
    setImgSrc({ uri: nextUri });
  }, [uri, fallbackUri]);

  return (
    <Image
      source={imgSrc}
      style={style}
      onError={() => {
        if (imgSrc.uri !== fallbackUri) {
          setImgSrc({ uri: fallbackUri });
        }
      }}
    />
  );
}

import { FlashList } from '@shopify/flash-list';
const TypedFlashList = FlashList as any;

export default function NetworkScreen() {
  const router = useRouter();
  const theme = useThemeColors();


  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSelfConnectionsOnly, setShowSelfConnectionsOnly] = useState(false);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const { connections, user } = useAppStore(useShallow(state => ({
    connections: state.connections,
    user: state.user
  })));

  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 250ms Input Debounce for performance optimization and typing lag prevention
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(inputText);
    }, 250);
    return () => clearTimeout(handler);
  }, [inputText]);

  // Helper to validate the privacy-first search query
  const isValidQuery = (query: string): boolean => {
    const cleaned = query.trim().toLowerCase();
    if (cleaned.length < 2) return false;

    const tokens = cleaned.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return false;

    // Direct department / branch terms
    const blockedTerms = new Set([
      'cse', 'civil', 'mech', 'mechanical', 'electrical', 'eee', 'ece', 'it', 'cyber', 'ai', 'iot',
      'science', 'humanities', 'btech', 'mtech', 'guest', 'student', 'alumni', 'faculty', 'staff', 'other',
      'computer', 'engineering'
    ]);

    const isBranchOrBatchToken = (token: string): boolean => {
      // 1. Matches year patterns: 2020, 2020-24, 2020-2024
      if (/^\d{4}$/.test(token)) return true;
      if (/^\d{4}-\d{2,4}$/.test(token)) return true;
      
      // 2. Matches blocked department terms
      if (blockedTerms.has(token)) return true;
      
      return false;
    };

    // The search is valid ONLY if there is at least one token that is NOT a branch/batch token (i.e. a name/username token)
    return tokens.some(token => {
      return token.startsWith('@') || !isBranchOrBatchToken(token);
    });
  };

  const [activeFilter, setActiveFilter] = useState<
    'All' | 'Student' | 'Alumni' | 'Others'
  >('All');

  const fetchUsers = async (options?: { force?: boolean; quiet?: boolean }) => {
    const force = options?.force || false;
    const quiet = options?.quiet || false;

    if (loading && !quiet) return;
    if (refreshing) return;

    if (force) {
      setRefreshing(true);
    } else if (!quiet) {
      setLoading(true);
    }

    const startTime = Date.now();
    try {
      const { collection, getDocs } = require('firebase/firestore');
      const { db } = require('../config/firebase');

      const querySnapshot = await getDocs(collection(db, 'publicProfiles'));
      const list: any[] = [];
      querySnapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        if (data && data.uid && data.role !== 'Guest' && data.uid !== user?.uid && data.isPrivate !== true && data.status !== 'suspended' && data.status !== 'banned') {
          list.push({
            id: data.uid,
            name: data.name || 'Campus Member',
            role: data.adminRole ? 'Admin' : (data.role || 'Student'),
            branch: data.department || 'MCE',
            batch: data.batch || '2024',
            image: data.photoUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(data.name || 'Felix')}`,
            username: data.username || '',
            vibeStatus: data.vibeStatus || '',
            skills: data.skills || [],
            links: data.links || {},
            experiences: data.experiences || [],
            rollNo: data.rollNo || undefined,
            regNo: data.regNo || undefined,
            connectionsCount: data.connectionsCount || 0,
          });
        }
      });

      setDbUsers(list);
      await AsyncStorage.setItem('@mce_cached_network_profiles', JSON.stringify(list));
      await AsyncStorage.setItem('@mce_network_profiles_sync_time', String(Date.now()));

      if (__DEV__) {
        const duration = Date.now() - startTime;
        console.log(`[Perf Logger] Network Profiles Sync Complete!
- Duration: ${duration}ms
- Count: ${list.length}
- Mode: ${force ? 'Pull-to-Refresh' : quiet ? 'Background Sync' : 'Foreground Fetch'}`);
      }
    } catch (err) {
      console.warn('Failed to fetch verified users from Firestore:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch real verified profiles from Firestore (Cache-First with 30 min Soft TTL)
  useEffect(() => {
    const loadCachedProfiles = async () => {
      try {
        const stored = await AsyncStorage.getItem('@mce_cached_network_profiles');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDbUsers(parsed);
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn('Failed to read cached network profiles:', err);
      }
    };

    const runSync = async () => {
      await loadCachedProfiles();
      
      try {
        const lastSyncStr = await AsyncStorage.getItem('@mce_network_profiles_sync_time');
        const lastSync = lastSyncStr ? Number(lastSyncStr) : 0;
        const now = Date.now();
        const diffMs = now - lastSync;
        const expired = diffMs > 30 * 60 * 1000; // 30 min soft TTL

        if (expired || !lastSyncStr || dbUsers.length === 0) {
          fetchUsers({ quiet: true });
        }
      } catch (e) {
        fetchUsers({ quiet: true });
      }
    };

    runSync();
  }, [user]);

  // Load recently viewed profile UIDs on mount
  useEffect(() => {
    const loadRecentlyViewed = async () => {
      try {
        const stored = await AsyncStorage.getItem('@mce_recently_viewed');
        if (stored) {
          setRecentlyViewedIds(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Failed to load recently viewed UIDs:', e);
      }
    };
    loadRecentlyViewed();
  }, [user?.uid]);

  // Handle click on member card to open modal and save to recently viewed
  const handleOpenProfileCard = async (item: any) => {
    if (!user || user.role === 'Guest') {
      if (Platform.OS === 'web') {
        const proceed = window.confirm(
          'Login Required 🔐\n\nStudent aur Alumni profiles dekhne ke liye pehle Google se Login karein.'
        );
        if (proceed) {
          router.replace('/login');
        }
      } else {
        Alert.alert(
          'Login Required 🔐',
          'Student aur Alumni profiles dekhne ke liye pehle Google se Login karein.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Login', onPress: () => router.replace('/login') }
          ]
        );
      }
      return;
    }

    // Save to recently viewed list (bring to front, remove duplicates, limit to 6)
    try {
      const stored = await AsyncStorage.getItem('@mce_recently_viewed');
      let recent: string[] = stored ? JSON.parse(stored) : [];
      recent = [item.id, ...recent.filter(id => id !== item.id)].slice(0, 6);
      await AsyncStorage.setItem('@mce_recently_viewed', JSON.stringify(recent));
      setRecentlyViewedIds(recent);
    } catch (err) {
      console.warn('Failed to update recently viewed UIDs:', err);
    }

    // Navigate to unified public profile screen
    if (item.username) {
      router.push(`/@${item.username}?from=network`);
    } else {
      router.push(`/@${item.id}?from=network`);
    }
  };

  // Handle dynamic connection triggers (creating notifications in Firestore)
  const handleToggleConnection = async (item: any) => {
    if (!user || user.role === 'Guest') {
      if (Platform.OS === 'web') {
        const proceed = window.confirm(
          'Login Required 🔐\n\nStudent aur Alumni profiles dekhne ke liye pehle Google se Login karein.'
        );
        if (proceed) {
          router.replace('/login');
        }
      } else {
        Alert.alert(
          'Login Required 🔐',
          'Student aur Alumni profiles dekhne ke liye pehle Google se Login karein.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Login', onPress: () => router.replace('/login') }
          ]
        );
      }
      return;
    }

    const existingConn = connections.find(c => c.id === item.id || c.name === item.name);
    
    // Toggling connection status: if no connection exists, send a request
    if (!existingConn) {
      try {
        const { doc, setDoc } = require('firebase/firestore');
        const { db } = require('../config/firebase');

        const requestId = `connection_request_${user.uid}_${item.id}`;

        // 1. Write the connection request notification to the recipient user's subcollection
        const notifDocRef = doc(db, 'users', item.id, 'notifications', requestId);
        await setDoc(notifDocRef, {
          type: 'connection_request',
          title: '🤝 New Connection Request',
          body: `${user.name} wants to connect with you.`,
          timestamp: new Date().toLocaleString(),
          read: false,
          senderUid: user.uid,
          senderName: user.name,
          senderPhoto: user.photoUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(user.name || 'Felix')}`,
          senderBranch: user.department || '',
          senderBatch: user.batch || '',
          senderUsername: user.username || '',
          senderRole: user.role || 'Student',
          status: 'pending',
        });

        // 1.5 Write connection 'Sent' locally to A's connections in Firestore
        const selfConnRef = doc(db, 'users', user.uid, 'connections', item.id);
        await setDoc(selfConnRef, {
          id: item.id,
          name: item.name,
          role: item.role,
          branch: item.branch,
          batch: item.batch,
          image: item.image,
          status: 'Sent',
          connectedAt: new Date().toISOString()
        });

        // 2. Add connection locally in store as "Sent"
        const newConn: ContactConnection = {
          id: item.id,
          name: item.name,
          role: item.role,
          branch: item.branch,
          batch: item.batch,
          image: item.image,
          status: 'Sent',
        };
        const updated = [...connections, newConn];
        useAppStore.setState({ connections: updated });
        await AsyncStorage.setItem('@mce_connections', JSON.stringify(updated));

        if (Platform.OS === 'web') {
          alert('Request Sent! Connection request sent successfully to ' + item.name);
        } else {
          Alert.alert('Request Sent 🤝', 'Connection request sent successfully to ' + item.name);
        }
      } catch (err: any) {
        console.error('Failed to send connection request in Firestore:', err);
        Alert.alert('Connection Failed', 'Failed to send connection request. Please try again.');
      }
    } else if (existingConn.status === 'Connected') {
      // Already connected - maybe show disconnect modal in future, for now do nothing or disconnect
      Alert.alert('Connected', `You are already connected with ${item.name}.`);
    } else if (existingConn.status === 'Sent') {
      if (Platform.OS === 'web') {
        const confirm = window.confirm(`Do you want to cancel the connection request sent to ${item.name}?`);
        if (confirm) {
          await cancelConnectionRequest(user, item.id);
        }
      } else {
        Alert.alert(
          'Cancel Request',
          `Do you want to cancel the connection request sent to ${item.name}?`,
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes, Cancel',
              style: 'destructive',
              onPress: async () => {
                await cancelConnectionRequest(user, item.id);
              }
            }
          ]
        );
      }
    }
  };

  const displayUsers = useMemo(() => {
    return dbUsers.map(u => {
      const localConn = connections.find(c => c.id === u.id || c.name === u.name);
      return {
        ...u,
        status: localConn ? localConn.status : 'Connect'
      };
    });
  }, [dbUsers, connections]);

  // Advanced Privacy-First Relevance Matching Search & Filter Engine
  const filteredConnections = useMemo(() => {
    let list = displayUsers.filter(contact => {
      const matchesFilter =
        activeFilter === 'All'
          ? true
          : activeFilter === 'Others'
          ? contact.role === 'Faculty' ||
            contact.role === 'Staff' ||
            contact.role === 'Other'
          : contact.role === activeFilter;

      if (showSelfConnectionsOnly && contact.status !== 'Connected' && contact.status !== 'Sent') {
        return false;
      }

      return matchesFilter;
    });

    if (!searchQuery.trim() || !isValidQuery(searchQuery)) {
      // Return empty results if search query is invalid (e.g. branch or batch only)
      // This strictly enforces the privacy-first search logic
      return searchQuery.trim() ? [] : list;
    }

    // Split search input into spaces to construct combination matching
    const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);

    const scored = list.map(contact => {
      let score = 0;
      const nameLower = contact.name.toLowerCase();
      const branchLower = (contact.branch || '').toLowerCase();
      const batchLower = (contact.batch || '').toLowerCase();
      const usernameLower = (contact.username || '').toLowerCase();

      let hasNameOrUsernameMatch = false;

      for (const token of tokens) {
        // 1. Username Matching
        if (token.startsWith('@')) {
          const cleanToken = token.substring(1);
          if (usernameLower === cleanToken) {
            score += 1000;
            hasNameOrUsernameMatch = true;
          } else if (usernameLower.includes(cleanToken)) {
            score += 150;
            hasNameOrUsernameMatch = true;
          }
        } else {
          if (usernameLower === token) {
            score += 800;
            hasNameOrUsernameMatch = true;
          } else if (usernameLower.includes(token)) {
            score += 100;
            hasNameOrUsernameMatch = true;
          }
        }

        // 2. Name Matching
        if (nameLower === token) {
          score += 500;
          hasNameOrUsernameMatch = true;
        } else {
          const nameWords = nameLower.split(/\s+/);
          if (nameWords.includes(token)) {
            score += 200;
            hasNameOrUsernameMatch = true;
          } else if (nameLower.includes(token)) {
            score += 50;
            hasNameOrUsernameMatch = true;
          }
        }

        // 3. Department / Branch Matching
        if (branchLower === token) {
          score += 30;
        } else if (branchLower.includes(token)) {
          score += 10;
        }

        // 4. Batch Year Matching
        if (batchLower === token) {
          score += 30;
        } else if (batchLower.includes(token)) {
          score += 10;
        }
      }

      // If there is absolutely no name or username match, the score is zero
      // This mathematically guarantees that branch/batch alone can NEVER rank or return profiles!
      if (!hasNameOrUsernameMatch) {
        score = 0;
      }

      return { contact, score };
    });

    // Remove elements with 0 matches and sort descending by relevance score
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.contact);
  }, [displayUsers, searchQuery, activeFilter, showSelfConnectionsOnly]);

  // Reset pagination page when search queries or filters alter
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, showSelfConnectionsOnly]);

  // Pagination bounds & slicing
  const paginatedConnections = useMemo(() => {
    return filteredConnections.slice(0, currentPage * 10);
  }, [filteredConnections, currentPage]);

  // Map recently viewed circular profile indicators
  const recentlyViewedUsers = useMemo(() => {
    return recentlyViewedIds
      .map(id => dbUsers.find(u => u.id === id))
      .filter(Boolean);
  }, [recentlyViewedIds, dbUsers]);

  const getStatusColor = (status: string) => {
    if (status === 'Connected') return '#22C55E';
    if (status === 'Sent') return '#F97316';
    return '#64748B';
  };

  const getRoleColor = (role: string) => {
    if (role === 'Student') return '#A855F7';
    if (role === 'Alumni') return '#3B82F6';
    if (role === 'Admin') return '#2563EB';
    return '#F97316';
  };

  // Render Horizontal Circular Avatar Pill Carousel for Recently Viewed members
  const renderRecentlyViewed = () => {
    if (recentlyViewedUsers.length === 0) return null;

    return (
      <View style={[styles.recentSection, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <Text style={[styles.recentTitle, { color: theme.textSecondary }]}>
          RECENTLY VIEWED
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScroll}>
          {recentlyViewedUsers.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.recentUserBubble}
              onPress={() => handleOpenProfileCard(item)}
              activeOpacity={0.8}
            >
              <View style={[styles.recentAvatarRing, { borderColor: getRoleColor(item.role) }]}>
                <NetworkAvatar uri={item.image} name={item.name} style={styles.recentAvatar} />
              </View>
              <Text style={[styles.recentName, { color: theme.text }]} numberOfLines={1}>
                {item.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render Load More button at directory list footer
  const renderPagination = () => {
    if (currentPage * 10 >= filteredConnections.length) return null;

    return (
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <TouchableOpacity
          style={{
            backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9',
            paddingVertical: 10,
            paddingHorizontal: 24,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.cardBorder
          }}
          onPress={() => setCurrentPage(p => p + 1)}
          activeOpacity={0.8}
        >
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
            Load More
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
      <Animated.View style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: theme.background,
        transform: [{
          translateY: Platform.OS === 'web' ? 0 : Animated.diffClamp(clampedScrollY, 0, 60).interpolate({
            inputRange: [0, 60],
            outputRange: [0, -60],
            extrapolate: 'clamp',
          })
        }]
      }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <View style={styles.headerBranding}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Network
            </Text>
            {showSelfConnectionsOnly && (
              <Text style={{ fontSize: 10, color: '#F97316', fontWeight: 'bold', marginTop: 2 }}>
                Showing My Connections Only
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.headerIcon,
            showSelfConnectionsOnly && { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED', borderColor: '#F97316' }
          ]}
          onPress={() => {
            if (!user || user.role === 'Guest') {
              if (Platform.OS === 'web') {
                alert('Login Required 🔐\n\nNetwork dekhne ke liye pehle Google se login karein.\n\nLogin ke baad aap sabhi features access kar sakenge.');
              } else {
                Alert.alert('Login Required 🔐', 'Network dekhne ke liye pehle Google se login karein.\n\nLogin ke baad aap sabhi features access kar sakenge.');
              }
              return;
            }
            setShowSelfConnectionsOnly(!showSelfConnectionsOnly);
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={showSelfConnectionsOnly ? "people" : "people-outline"}
            size={20}
            color={showSelfConnectionsOnly ? "#F97316" : theme.text}
          />
        </TouchableOpacity>
      </View>

      {/* Search Input Box */}
      <View style={[styles.searchSection, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#94A3B8"
            style={styles.searchIcon}
          />

          <TextInput
            placeholder="Search by name, @username"
            placeholderTextColor="#94A3B8"
            style={[styles.searchInput, { color: theme.text }]}
            value={inputText}
            onChangeText={setInputText}
          />

          {inputText !== '' && (
            <TouchableOpacity onPress={() => { setInputText(''); setSearchQuery(''); }}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={[styles.filterBar, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        {(['All', 'Student', 'Alumni', 'Others'] as const).map(filter => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              { backgroundColor: theme.background, borderColor: theme.cardBorder },
              activeFilter === filter && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(filter)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: theme.textSecondary },
                activeFilter === filter && styles.filterChipTextActive,
              ]}
            >
              {filter === 'All' ? 'ALL' : filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      </Animated.View>

      {loading && dbUsers.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 120 }}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={{ color: theme.textSecondary, marginTop: 12, fontSize: 13.5, fontWeight: '600' }}>
            Syncing campus network...
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {loading && dbUsers.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.08)' : 'rgba(249, 115, 22, 0.04)' }}>
              <ActivityIndicator size="small" color="#F97316" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 11, color: '#F97316', fontWeight: '500' }}>Syncing latest campus network...</Text>
            </View>
          )}
          <TypedFlashList
            estimatedItemSize={85}
            onScroll={(event: any) => {
              feedScrollY.setValue(event.nativeEvent.contentOffset.y);
            }}
            scrollEventThrottle={16}
            data={paginatedConnections}
            keyExtractor={(item: any) => item.id}
            numColumns={1}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.listContainer, { paddingTop: 160, paddingBottom: 120 }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchUsers({ force: true })}
                colors={['#F97316']}
                tintColor="#F97316"
              />
            }
          ListHeaderComponent={renderRecentlyViewed}
          ListFooterComponent={renderPagination}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {searchQuery.trim() && !isValidQuery(searchQuery)
                  ? 'Search students by name or username'
                  : searchQuery.trim()
                  ? 'No users found'
                  : 'Search students by name or username.'}
              </Text>
              <Text style={[styles.emptyBody, { color: theme.textSecondary }, { textAlign: 'center', paddingHorizontal: 12 }]}>
                {searchQuery.trim() && !isValidQuery(searchQuery)
                  ? 'Branch, batch or department term akela search nahi kiya ja sakta. Kripya name ke sath combination use karein (e.g. "Raushan Civil" or "@username").'
                  : 'Try another search combination or filter status.'}
              </Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <View style={[styles.linkedinCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.linkedinCardMain}
                onPress={() => handleOpenProfileCard(item)}
              >
                {/* Color-Coded Avatar Ring */}
                <View style={[styles.avatarRing, { borderColor: getRoleColor(item.role) }]}>
                  <NetworkAvatar uri={item.image} name={item.name} style={styles.avatar} />
                </View>

                {/* Vertical Stacked Details Column */}
                <View style={styles.detailsColumn}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>

                  <View style={styles.roleBadgeContainer}>
                    <View
                      style={[
                        styles.roleBadge,
                        {
                          backgroundColor:
                            item.role === 'Admin'
                              ? theme.isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF'
                              : item.role === 'Student'
                              ? theme.isDark ? 'rgba(168, 85, 247, 0.15)' : '#FAF5FF'
                              : item.role === 'Alumni'
                              ? theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF'
                              : theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED',
                          borderColor:
                            item.role === 'Admin'
                              ? theme.isDark ? 'rgba(37, 99, 235, 0.3)' : '#BFDBFE'
                              : item.role === 'Student'
                              ? theme.isDark ? 'rgba(168, 85, 247, 0.3)' : '#E9D5FF'
                              : item.role === 'Alumni'
                              ? theme.isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE'
                              : theme.isDark ? 'rgba(249, 115, 22, 0.3)' : '#FFEDD5',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          {
                            color:
                              item.role === 'Admin'
                                ? '#2563EB'
                                : item.role === 'Student'
                                ? '#A855F7'
                                : item.role === 'Alumni'
                                ? '#3B82F6'
                                : '#F97316',
                          },
                        ]}
                      >
                        {item.role}
                      </Text>
                    </View>
                  </View>

                  {item.vibeStatus ? (
                    <Text style={[styles.vibeStatusText, { color: theme.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                      "{item.vibeStatus}"
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>

              {/* Connect Inline Button (Right Aligned) */}
              <View style={styles.actionContainer}>
                <TouchableOpacity
                  style={[
                    styles.connectButtonChip,
                    item.status === 'Sent' && styles.connectBtnSent,
                    item.status === 'Connected' && styles.connectBtnActive,
                  ]}
                  onPress={() => handleToggleConnection(item)}
                  disabled={item.status === 'Connected'}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={
                      item.status === 'Connected'
                        ? 'checkmark'
                        : item.status === 'Sent'
                        ? 'time-outline'
                        : 'person-add-outline'
                    }
                    size={13}
                    color={
                      item.status === 'Connect'
                        ? '#FFFFFF'
                        : getStatusColor(item.status)
                    }
                    style={{ marginRight: 4 }}
                  />

                  <Text
                    style={[
                      styles.connectButtonChipText,
                      item.status !== 'Connect' && {
                        color: getStatusColor(item.status),
                      },
                    ]}
                  >
                    {item.status === 'Connect'
                      ? 'Connect'
                      : item.status === 'Sent'
                      ? 'Request Sent'
                      : 'Connected'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  headerBranding: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },

  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 40,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    padding: 0,
  },

  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },

  filterChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },

  filterChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  filterChipTextActive: {
    color: '#F97316',
    fontWeight: '700',
  },

  listContainer: {
    paddingBottom: 150,
  },

  // Premium LinkedIn card style single column layout
  linkedinCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${10}px #0F172A` : undefined,

    elevation: 1,
  },

  linkedinCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },

  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    padding: 1.5,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
  },

  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },

  detailsColumn: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  nameText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 160,
  },

  branchText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },

  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },

  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  roleBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  batchText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
  },

  vibeStatusText: {
    fontSize: 11,
    color: '#F97316',
    fontWeight: '500',
    fontStyle: 'italic',
    marginTop: 2,
    maxWidth: 180,
  },

  actionContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },

  connectButtonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 80,
  },

  connectBtnSent: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  connectBtnActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },

  connectButtonChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Recently Viewed layout
  recentSection: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },

  recentTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  recentScroll: {
    gap: 14,
    paddingRight: 16,
  },

  recentUserBubble: {
    alignItems: 'center',
    width: 60,
  },

  recentAvatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.8,
    padding: 1.5,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },

  recentAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },

  recentName: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },

  // Numeric page pagination styles
  paginationContainer: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },

  paginationScroll: {
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pageChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pageChipActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },

  pageChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  pageChipTextActive: {
    color: '#FFFFFF',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingTop: 90,
    paddingHorizontal: 32,
  },

  emptyEmoji: {
    fontSize: 46,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },

  emptyBody: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});