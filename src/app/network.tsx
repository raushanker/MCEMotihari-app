import React, { useState, useEffect, useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppStore, ContactConnection } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useThemeColors } from '@/hooks/useThemeColors';
import { UserProfileModal } from '@/components/modals/UserProfileModal';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function NetworkScreen() {
  const router = useRouter();
  const theme = useThemeColors();

  const [selectedProfileUser, setSelectedProfileUser] = useState<{
    name: string;
    role: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest';
    photoUrl?: string;
    department?: string;
    batch?: string;
    rollNo?: string;
    regNo?: string;
    skills?: string[];
    experiences?: any[];
    username?: string;
  } | null>(null);

  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelfConnectionsOnly, setShowSelfConnectionsOnly] = useState(false);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const { connections, user } = useAppStore(useShallow(state => ({
    connections: state.connections,
    user: state.user
  })));

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<
    'All' | 'Student' | 'Alumni' | 'Others'
  >('All');

  // Fetch real verified profiles from Firestore, filtering out self-profile and private accounts
  useEffect(() => {

    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { collection, getDocs } = require('firebase/firestore');
        const { db } = require('../config/firebase');

        const querySnapshot = await getDocs(collection(db, 'publicProfiles'));
        const list: any[] = [];
        querySnapshot.forEach((docSnap: any) => {
          const data = docSnap.data();
          // Exclude dynamic system cards, guests, currently logged in user, and private accounts
          if (data && data.uid && data.role !== 'Guest' && data.uid !== user?.uid && data.isPrivate !== true) {
            list.push({
              id: data.uid,
              name: data.name || 'Campus Member',
              role: data.role || 'Student',
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
            });
          }
        });
        setDbUsers(list);
      } catch (err) {
        console.warn('Failed to fetch verified users from Firestore:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
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
          'Authentication Required\n\nGuests cannot view professional member profiles. Please sign in to access student and alumni profiles. Proceed to login?'
        );
        if (proceed) {
          router.replace('/login');
        }
      } else {
        Alert.alert(
          'Authentication Required 🔐',
          'Guests cannot view professional member profiles. Please sign in with Google to access student and alumni profiles.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.replace('/login') }
          ]
        );
      }
      return;
    }

    // Set dynamic modal data
    setSelectedProfileUser({
      name: item.name,
      role: item.role as any,
      photoUrl: item.image,
      department: item.branch,
      batch: item.batch,
      username: item.username,
      skills: item.skills,
      experiences: item.experiences,
      rollNo: item.rollNo,
      regNo: item.regNo,
    });
    setIsProfileModalVisible(true);

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
  };

  // Handle dynamic connection triggers (creating notifications in Firestore)
  const handleToggleConnection = async (item: any) => {
    if (!user || user.role === 'Guest') {
      if (Platform.OS === 'web') {
        const proceed = window.confirm(
          'Authentication Required\n\nGuests cannot send connection requests. Please sign in to build your professional grid. Proceed to login?'
        );
        if (proceed) {
          router.replace('/login');
        }
      } else {
        Alert.alert(
          'Authentication Required 🔐',
          'Guests cannot send connection requests. Please sign in to build your professional grid.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.replace('/login') }
          ]
        );
      }
      return;
    }

    const existingConn = connections.find(c => c.id === item.id || c.name === item.name);
    
    // Toggling connection status: if no connection exists, send a request
    if (!existingConn) {
      try {
        const { collection, addDoc } = require('firebase/firestore');
        const { db } = require('../config/firebase');

        // 1. Write the connection request notification to the recipient user's subcollection
        const notifRef = collection(db, 'users', item.id, 'notifications');
        await addDoc(notifRef, {
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
          status: 'pending',
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
    } else {
      // Toggle / Cancel connection if already exists
      const { doc, deleteDoc } = require('firebase/firestore');
      const { db } = require('../config/firebase');

      try {
        // Remove locally
        const updated = connections.filter(c => c.id !== item.id);
        useAppStore.setState({ connections: updated });
        await AsyncStorage.setItem('@mce_connections', JSON.stringify(updated));

        // Delete from Firestore connections list if exists
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'connections', item.id));
          await deleteDoc(doc(db, 'users', item.id, 'connections', user.uid));
        } catch (e) {}

        Alert.alert('Disconnected', `You removed ${item.name} from your connections grid.`);
      } catch (err) {
        console.error('Failed to toggle connection:', err);
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

  // Advanced Multi-Token Relevance Matching Search & Filter Engine
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

    if (!searchQuery.trim()) {
      return list;
    }

    // Split search input into spaces to construct combination matching
    const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);

    const scored = list.map(contact => {
      let score = 0;
      const nameLower = contact.name.toLowerCase();
      const branchLower = (contact.branch || '').toLowerCase();
      const batchLower = (contact.batch || '').toLowerCase();
      const usernameLower = (contact.username || '').toLowerCase();

      for (const token of tokens) {
        // 1. Username Matching
        if (token.startsWith('@')) {
          const cleanToken = token.substring(1);
          if (usernameLower === cleanToken) {
            score += 100;
          } else if (usernameLower.includes(cleanToken)) {
            score += 45;
          }
        } else {
          if (usernameLower === token) {
            score += 60;
          } else if (usernameLower.includes(token)) {
            score += 25;
          }
        }

        // 2. Name Matching
        if (nameLower === token) {
          score += 50;
        } else {
          const nameWords = nameLower.split(/\s+/);
          if (nameWords.includes(token)) {
            score += 40;
          } else if (nameLower.includes(token)) {
            score += 20;
          }
        }

        // 3. Department / Branch Matching
        if (branchLower === token) {
          score += 30;
        } else if (branchLower.includes(token)) {
          score += 15;
        }

        // 4. Batch Year Matching
        if (batchLower === token) {
          score += 30;
        } else if (batchLower.includes(token)) {
          score += 15;
        }
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
  const totalPages = Math.ceil(filteredConnections.length / 10);
  const paginatedConnections = useMemo(() => {
    return filteredConnections.slice((currentPage - 1) * 10, currentPage * 10);
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
                <Image source={{ uri: item.image }} style={styles.recentAvatar} />
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

  // Render Classic Page-wise Numeric selectors at directory list footer
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    return (
      <View style={styles.paginationContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paginationScroll}>
          {pages.map(p => (
            <TouchableOpacity
              key={p}
              style={[
                styles.pageChip,
                { backgroundColor: theme.background, borderColor: theme.cardBorder },
                currentPage === p && styles.pageChipActive
              ]}
              onPress={() => setCurrentPage(p)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pageChipText,
                  { color: theme.textSecondary },
                  currentPage === p && styles.pageChipTextActive
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <View style={styles.headerBranding}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Network Grid
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
                alert('Authentication Required 🔐\n\nGuests cannot view connection networks. Please sign in to build your professional grid!');
              } else {
                Alert.alert('Authentication Required 🔐', 'Guests cannot view connection networks. Please sign in to build your professional grid!');
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
            placeholder="Search by name, @username, batch, branch..."
            placeholderTextColor="#94A3B8"
            style={[styles.searchInput, { color: theme.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
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

      {/* Users Paginated Directory (LinkedIn-Style 1-Column List View) */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 120 }}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={{ color: theme.textSecondary, marginTop: 12, fontSize: 13.5, fontWeight: '600' }}>
            Syncing campus network...
          </Text>
        </View>
      ) : (
        <FlatList
          data={paginatedConnections}
          keyExtractor={item => item.id}
          numColumns={1}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={renderRecentlyViewed}
          ListFooterComponent={renderPagination}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No users found</Text>
              <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
                Try another search combination or filter status.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.linkedinCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.linkedinCardMain}
                onPress={() => handleOpenProfileCard(item)}
              >
                {/* Color-Coded Avatar Ring */}
                <View style={[styles.avatarRing, { borderColor: getRoleColor(item.role) }]}>
                  <Image source={{ uri: item.image }} style={styles.avatar} />
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
                            item.role === 'Student'
                              ? theme.isDark
                                ? 'rgba(168, 85, 247, 0.15)'
                                : '#FAF5FF'
                              : item.role === 'Alumni'
                              ? theme.isDark
                                ? 'rgba(59, 130, 246, 0.15)'
                                : '#EFF6FF'
                              : theme.isDark
                              ? 'rgba(249, 115, 22, 0.15)'
                              : '#FFF7ED',
                          borderColor:
                            item.role === 'Student'
                              ? theme.isDark
                                ? 'rgba(168, 85, 247, 0.3)'
                                : '#E9D5FF'
                              : item.role === 'Alumni'
                              ? theme.isDark
                                ? 'rgba(59, 130, 246, 0.3)'
                                : '#BFDBFE'
                              : theme.isDark
                              ? 'rgba(249, 115, 22, 0.3)'
                              : '#FFEDD5',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          {
                            color:
                              item.role === 'Student'
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
                      ? 'Pending'
                      : 'Connected'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
      <UserProfileModal
        visible={isProfileModalVisible}
        onClose={() => {
          setIsProfileModalVisible(false);
          setSelectedProfileUser(null);
        }}
        userProfile={selectedProfileUser}
      />
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
    boxShadow: `${0}px ${4}px ${10}px #0F172A`,

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