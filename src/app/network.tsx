import React, { useState, useEffect, useMemo } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  
  TouchableOpacity,
  View,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Animated,
  Keyboard,
  StatusBar } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { Image } from 'expo-image';

import { Ionicons, MaterialIcons } from '@expo/vector-icons';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore, ContactConnection, sendConnectionRequest, cancelConnectionRequest } from '@/store/useAppStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useShallow } from 'zustand/react/shallow';
import { useThemeColors } from '@/hooks/useThemeColors';

import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

import { FlashList } from '@shopify/flash-list';
import { ExploreMenuModal } from '@/components/modals/ExploreMenuModal';

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
const TypedFlashList = FlashList as any;

export default function NetworkScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSelfConnectionsOnly, setShowSelfConnectionsOnly] = useState(false);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    const loadDismissed = async () => {
      try {
        const stored = await AsyncStorage.getItem('@mce_dismissed_suggestions');
        if (stored) {
          setDismissedIds(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Failed to load dismissed suggestions:', e);
      }
    };
    loadDismissed();
  }, []);

  const handleDismissSuggestion = async (targetId: string) => {
    try {
      const nextDismissed = [...dismissedIds, targetId];
      setDismissedIds(nextDismissed);
      await AsyncStorage.setItem('@mce_dismissed_suggestions', JSON.stringify(nextDismissed));
    } catch (e) {
      console.warn('Failed to save dismissed suggestion:', e);
    }
  };

  const { connections, user, showToast } = useAppStore(useShallow(state => ({
    connections: state.connections,
    user: state.user,
    showToast: state.showToast
  })));



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
        if (data && data.uid && data.role !== 'Guest' && data.uid !== user?.uid && data.isPrivate !== true && data.status !== 'suspended' && data.status !== 'banned' && data.isHidden !== true) {
          list.push({
            id: data.uid,
            name: data.name || 'Campus Member',
            role: data.adminRole ? 'Admin' : (data.role || 'Student'),
            adminRole: data.adminRole || undefined,
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

  const triggerLoginPrompt = () => {
    if (Platform.OS === 'web') {
      const proceed = window.confirm(
        'Login Required 🔐\n\nStudent, Alumni aur Faculty profiles dekhne ya connect karne ke liye pehle Google se Login/Signup karein.'
      );
      if (proceed) {
        router.replace('/login');
      }
    } else {
      Alert.alert(
        'Login Required 🔐',
        'Student, Alumni aur Faculty profiles dekhne ya connect karne ke liye pehle Google se Login/Signup karein.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login / Signup', onPress: () => router.replace('/login') }
        ]
      );
    }
  };

  const checkConnectionLimits = async (): Promise<boolean> => {
    try {
      const stored = await AsyncStorage.getItem('@mce_sent_invitation_timestamps');
      const now = Date.now();
      let timestamps: number[] = stored ? JSON.parse(stored) : [];

      // Clean up old timestamps (older than 7 days)
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      timestamps = timestamps.filter(t => t >= oneWeekAgo);
      await AsyncStorage.setItem('@mce_sent_invitation_timestamps', JSON.stringify(timestamps));

      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const dailySent = timestamps.filter(t => t >= oneDayAgo).length;
      const weeklySent = timestamps.length;

      if (dailySent >= 15) {
        if (Platform.OS === 'web') {
          window.alert(
            "Limit Reach Ho Gyi! 🛑\n\nArre yaar! Aapne aaj ki 15 connection requests ki limit poori kar li hai. Spam se bachne ke liye, kripya kal tak ka wait karein aur naye students se kal connect karein!"
          );
        } else {
          Alert.alert(
            "Limit Reach Ho Gyi! 🛑",
            "Arre yaar! Aapne aaj ki 15 connection requests ki limit poori kar li hai. Spam se bachne ke liye, kripya kal tak ka wait karein aur naye students se kal connect karein!",
            [{ text: "Theek Hai, Samjh Gaya" }]
          );
        }
        return false;
      }

      if (weeklySent >= 30) {
        if (Platform.OS === 'web') {
          window.alert(
            "Weekly Limit Exceeded! ⚠️\n\nAapne is hafte ki 30 connection requests ki limit cross kar li hai. Kripya naye connections banane ke liye thoda wait karein aur spamming se bachein!"
          );
        } else {
          Alert.alert(
            "Weekly Limit Exceeded! ⚠️",
            "Aapne is hafte ki 30 connection requests ki limit cross kar li hai. Kripya naye connections banane ke liye thoda wait karein aur spamming se bachein!",
            [{ text: "Theek Hai, Okay" }]
          );
        }
        return false;
      }

      return true;
    } catch (e) {
      console.warn('Failed to check connection limits:', e);
      return true;
    }
  };

  const recordConnectionSent = async () => {
    try {
      const stored = await AsyncStorage.getItem('@mce_sent_invitation_timestamps');
      let timestamps: number[] = stored ? JSON.parse(stored) : [];
      timestamps.push(Date.now());
      await AsyncStorage.setItem('@mce_sent_invitation_timestamps', JSON.stringify(timestamps));
    } catch (e) {
      console.warn('Failed to record connection timestamp:', e);
    }
  };

  // Handle click on member card to open modal and save to recently viewed
  const handleOpenProfileCard = async (item: any) => {
    if (!user || user.role === 'Guest') {
      triggerLoginPrompt();
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
      triggerLoginPrompt();
      return;
    }

    const existingConn = connections.find(c => c.id === item.id || c.name === item.name);
    
    // Toggling connection status: if no connection exists, send a request
    if (!existingConn) {
      const canProceed = await checkConnectionLimits();
      if (!canProceed) return;

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
          role: item.role as any,
          branch: item.branch,
          batch: item.batch,
          image: item.image,
          status: 'Sent',
        };
        const updated = [...connections, newConn];
        useAppStore.setState({ connections: updated });
        await AsyncStorage.setItem('@mce_connections', JSON.stringify(updated));

        // Record the invitation timestamp
        await recordConnectionSent();

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

  const handleAcceptRequest = async (e: any, item: any) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const { runTransaction, doc } = require('firebase/firestore');
      const { db } = require('../config/firebase');

      let senderUid = item.senderUid;
      if (!senderUid && item.id && item.id.startsWith('connection_request_')) {
        const parts = item.id.split('_');
        if (parts.length >= 3) {
          senderUid = parts[2];
        }
      }

      if (!senderUid) {
        throw new Error("Sender UID not found in notification.");
      }

      const requestId = item.id;
      const acceptanceNotifId = `connection_accepted_${user.uid}_${senderUid}_${requestId}`;
      const sortedUserIds = [user.uid, senderUid].sort().join('_');

      const notifDocRef = doc(db, 'users', user.uid, 'notifications', requestId);
      const senderConnRef = doc(db, 'users', senderUid, 'connections', user.uid);
      const recipientConnRef = doc(db, 'users', user.uid, 'connections', senderUid);
      const senderNotifRef = doc(db, 'users', senderUid, 'notifications', acceptanceNotifId);

      await runTransaction(db, async (transaction: any) => {
        const notifDoc = await transaction.get(notifDocRef);
        if (!notifDoc.exists()) {
          throw new Error("Pending request notification does not exist.");
        }
        
        const notifData = notifDoc.data();
        if (notifData.status === 'accepted') {
          return; // Already accepted
        }

        const recipientConnDoc = await transaction.get(recipientConnRef);
        if (recipientConnDoc.exists() && recipientConnDoc.data().status === 'Connected') {
          return; // Already connected
        }

        transaction.update(notifDocRef, {
          status: 'accepted',
          read: true,
          body: `You accepted ${item.senderName}'s connection request.`
        });

        transaction.set(senderConnRef, {
          id: user.uid,
          name: user.name,
          role: user.role || 'Student',
          branch: user.department || '',
          batch: user.batch || '',
          image: user.photoUrl || '',
          status: 'Connected',
          sortedUserIds,
          connectedAt: new Date().toISOString()
        });

        transaction.set(recipientConnRef, {
          id: senderUid,
          name: item.senderName || '',
          role: item.senderRole || 'Student',
          branch: item.senderBranch || '',
          batch: item.senderBatch || '',
          image: item.senderPhoto || '',
          status: 'Connected',
          sortedUserIds,
          connectedAt: new Date().toISOString()
        });

        transaction.set(senderNotifRef, {
          type: 'connection_accepted',
          title: '🤝 Connection Accepted',
          body: `${user.name} accepted your connection request. You are now connected!`,
          timestamp: new Date().toLocaleString(),
          read: false,
          senderUid: user.uid,
          senderName: user.name,
          senderPhoto: user.photoUrl || '',
          senderBranch: user.department || '',
          senderBatch: user.batch || '',
          senderUsername: user.username || '',
          senderRole: user.role || 'Student',
          requestId
        });
      });

      // Optimistic local update to instantly hide the invitation
      useNotificationStore.setState(state => ({
        notifications: state.notifications.map(n => 
          n.id === item.id ? { ...n, status: 'accepted', read: true } : n
        )
      }));

      showToast(`Connected with ${item.senderName}! 🤝`, 'success');
    } catch (err: any) {
      console.warn('Accept connection failed:', err);
      Alert.alert('Error', 'Failed to accept invitation: ' + err.message);
    }
  };

  const handleIgnoreRequest = async (e: any, item: any) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const { doc, updateDoc } = require('firebase/firestore');
      const { db } = require('../config/firebase');
      const notifDocRef = doc(db, 'users', user.uid, 'notifications', item.id);
      
      await updateDoc(notifDocRef, {
        status: 'declined',
        read: true
      });
      
      // Optimistic local update to instantly hide the invitation
      useNotificationStore.setState(state => ({
        notifications: state.notifications.map(n => 
          n.id === item.id ? { ...n, status: 'declined', read: true } : n
        )
      }));

      showToast('Invitation ignored.', 'info');
    } catch (err) {
      console.warn('Ignore invitation failed:', err);
      Alert.alert('Error', 'Failed to ignore invitation.');
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

  // Simplified list of recommended users
  const filteredConnections = useMemo(() => {
    return displayUsers.filter(contact => {
      // Exclude the current user from their own network list
      if (user && contact.id === user.uid) return false;

      // Exclude dismissed suggestions
      if (dismissedIds.includes(contact.id)) return false;

      if (showSelfConnectionsOnly) {
        // Show only active or pending connections
        if (contact.status !== 'Connected' && contact.status !== 'Sent') return false;
      } else {
        // Recommendations: do NOT show already connected or sent users in recommendations list
        if (contact.status === 'Connected' || contact.status === 'Sent') return false;
      }
      return true;
    });
  }, [displayUsers, showSelfConnectionsOnly, dismissedIds, user]);

  // Reset pagination page when filters alter
  useEffect(() => {
    setCurrentPage(1);
  }, [showSelfConnectionsOnly]);

  // Sort suggestions by same-department priority (first priority: branch matches user's department)
  const prioritizedConnections = useMemo(() => {
    const userDept = user?.department || '';
    if (!userDept) return filteredConnections;

    const cleanUserDept = userDept.toLowerCase().trim();
    return [...filteredConnections].sort((a, b) => {
      const aSameDept = (a.branch || '').toLowerCase().trim() === cleanUserDept;
      const bSameDept = (b.branch || '').toLowerCase().trim() === cleanUserDept;

      if (aSameDept && !bSameDept) return -1;
      if (!aSameDept && bSameDept) return 1;
      return 0; // maintain original search relevance score
    });
  }, [filteredConnections, user?.department]);

  // Pagination bounds & slicing (6 items per page to reduce density)
  const paginatedConnections = useMemo(() => {
    return prioritizedConnections.slice(0, currentPage * 6);
  }, [prioritizedConnections, currentPage]);

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

  const { notifications, initNotifications } = useNotificationStore(
    useShallow(state => ({
      notifications: state.notifications,
      initNotifications: state.initNotifications,
    }))
  );

  // Sync notifications on mount/auth state changes to fetch invitations
  useEffect(() => {
    if (user && user.role !== 'Guest') {
      const unsubscribe = initNotifications(user.uid);
      return () => unsubscribe();
    }
  }, [user, initNotifications]);

  const connectionsCount = useMemo(() => {
    if (!user || user.role === 'Guest') return 0;
    return connections.filter(c => c.status === 'Connected').length;
  }, [connections, user]);

  const receivedRequestsCount = useMemo(() => {
    if (!user || user.role === 'Guest') return 0;
    const mockNames = ['Amit Singh', 'Nisha Kumari', 'Pankaj Kumar', 'Abhishek Kumar', 'Shweta Raj', 'Rohan Sharma'];
    return notifications.filter(n => 
      n.type === 'connection_request' && 
      n.status !== 'accepted' &&
      (!n.senderName || !mockNames.includes(n.senderName))
    ).length;
  }, [notifications, user]);

  const getConnectBtnStyle = (status: string) => {
    if (status === 'Connected') {
      return {
        borderColor: '#22C55E',
        backgroundColor: theme.isDark ? 'rgba(34, 197, 94, 0.1)' : '#F0FDF4',
        textColor: '#22C55E',
        icon: 'checkmark' as const,
        text: 'Connected'
      };
    }
    if (status === 'Sent') {
      return {
        borderColor: '#F97316',
        backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.1)' : '#FFF7ED',
        textColor: '#F97316',
        icon: 'time-outline' as const,
        text: 'Pending'
      };
    }
    return {
      borderColor: '#2563EB',
      backgroundColor: theme.isDark ? 'rgba(37, 99, 235, 0.1)' : '#EFF6FF',
      textColor: '#2563EB',
      icon: 'person-add-outline' as const,
      text: 'Connect'
    };
  };

  const renderListHeader = () => {
    return (
      <View style={{ backgroundColor: theme.background }}>
        {/* Manage my network row */}
        <TouchableOpacity
          style={[styles.menuRow, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}
          onPress={() => {
            if (!user || user.role === 'Guest') {
              router.replace('/login');
              return;
            }
            router.push('/my-connections');
          }}
          activeOpacity={0.7}
        >
          <View style={styles.menuRowLeft}>
            <Ionicons name="people-outline" size={20} color={theme.text} style={{ marginRight: 12 }} />
            <Text style={[styles.menuRowText, { color: theme.text }]}>Manage my network</Text>
          </View>
          <View style={styles.menuRowRight}>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </View>
        </TouchableOpacity>

        {/* Received Invitations Section Header (Non-clickable) */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          paddingHorizontal: 4, 
          paddingVertical: 10,
          marginTop: 6,
          marginBottom: 6,
          width: '100%'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="mail-unread-outline" size={20} color={theme.text} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 14.5, fontWeight: '800', color: theme.text }}>Invitations Received</Text>
          </View>

          {/* Sent Requests Redirect Button */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8 }}
            onPress={() => {
              if (!user || user.role === 'Guest') {
                triggerLoginPrompt();
                return;
              }
              router.push('/sent-requests');
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, color: '#F97316', fontWeight: '800' }}>Sent Requests</Text>
            <Ionicons name="arrow-forward" size={14} color="#F97316" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* Inline List of Received Connection Invites (Max 4) */}
        {(() => {
          const mockNames = ['Amit Singh', 'Nisha Kumari', 'Pankaj Kumar', 'Abhishek Kumar', 'Shweta Raj', 'Rohan Sharma'];
          const pendingRequests = notifications.filter(n => {
            const isAlreadyConnected = connections.some(c => c.id === n.senderUid && c.status === 'Connected');
            return n.type === 'connection_request' && 
            n.status !== 'accepted' && 
            n.status !== 'declined' &&
            !isAlreadyConnected &&
            (!n.senderName || !mockNames.includes(n.senderName));
          });
          const maxDisplayRequests = pendingRequests.slice(0, 4);

          if (pendingRequests.length === 0) {
            return (
              <View style={{ 
                paddingVertical: 20, 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: theme.backgroundElement, 
                borderRadius: 16, 
                marginBottom: 14, 
                borderWidth: 1, 
                borderColor: theme.cardBorder 
              }}>
                <Ionicons name="mail-open-outline" size={26} color={theme.textSecondary} style={{ marginBottom: 6, opacity: 0.65 }} />
                <Text style={{ fontSize: 12.5, color: theme.textSecondary, fontWeight: '700' }}>No pending invitations yet</Text>
              </View>
            );
          }

          return (
            <View style={{ 
              backgroundColor: theme.backgroundElement, 
              borderRadius: 18, 
              borderWidth: 1, 
              borderColor: theme.cardBorder, 
              paddingHorizontal: 16, 
              paddingVertical: 4,
              marginBottom: 14 
            }}>
              {maxDisplayRequests.map((item, index) => (
                <View 
                  key={item.id} 
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    paddingVertical: 12, 
                    borderBottomWidth: index === maxDisplayRequests.length - 1 ? 0 : 1, 
                    borderBottomColor: theme.cardBorder 
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Image
                      source={{ uri: item.senderPhoto || 'https://api.dicebear.com/7.x/avataaars/png?seed=' + encodeURIComponent(item.senderName || 'Felix') }}
                      style={{ width: 38, height: 38, borderRadius: 19, marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.text }} numberOfLines={1}>
                        {item.senderName}
                      </Text>
                      <Text style={{ fontSize: 11, color: theme.textSecondary }} numberOfLines={1}>
                        {item.senderRole === 'Student' ? `${item.senderBranch || ''} Student` : item.senderRole || 'MCE Member'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginLeft: 8 }}>
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#22C55E',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 10,
                      }}
                      onPress={(e) => handleAcceptRequest(e, item)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: '#FFF', fontSize: 11.5, fontWeight: '700' }}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        backgroundColor: theme.background,
                        borderWidth: 1,
                        borderColor: theme.cardBorder,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 10,
                      }}
                      onPress={(e) => handleIgnoreRequest(e, item)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: theme.textSecondary, fontSize: 11.5, fontWeight: '600' }}>Ignore</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              
              {/* View All Button */}
              {pendingRequests.length > 4 && (
                <TouchableOpacity
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: theme.cardBorder,
                    marginTop: 4,
                  }}
                  onPress={() => router.push('/received-requests')}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: '#F97316', fontSize: 13, fontWeight: '800' }}>
                    View All ({pendingRequests.length})
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

        {/* Recently Viewed Carousel moved to search state */}

        {/* Section title for recommendations */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          <Text style={[styles.sectionTitleText, { color: theme.text }]}>
            {showSelfConnectionsOnly ? 'My Connections' : 'People you may know from MCE Motihari'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar
        backgroundColor={theme.backgroundElement}
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        translucent={true}
      />
      <View style={{ height: insets.top, backgroundColor: theme.backgroundElement, zIndex: 101 }} />
      {/* Stable Header & Search & Filter Bar */}
      <View style={{
        backgroundColor: theme.backgroundElement,
        borderBottomWidth: 1,
        borderBottomColor: theme.cardBorder,
        zIndex: 100,
      }}>
        {/* Restored Header Title & Action button */}
        <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
          <View style={styles.headerBranding}>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Network</Text>
              {user && user.role !== 'Guest' && showSelfConnectionsOnly && (
                <Text style={{ fontSize: 10, color: '#F97316', fontWeight: 'bold', marginTop: 2 }}>
                  Showing My Connections Only
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Search Bar - Navigates to Global Search */}
        <View style={[styles.searchSection, { backgroundColor: theme.backgroundElement }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (!user || user.role === 'Guest') {
                triggerLoginPrompt();
              } else {
                router.push('/search?type=profiles');
              }
            }}
            style={{ width: '100%' }}
          >
            <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
              <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
              <Text style={[styles.searchInput, { color: '#94A3B8', paddingTop: 0 }]}>Search by name, @username</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>





      {/* Main List Body */}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.08)' : 'rgba(249, 115, 22, 0.04)', zIndex: 90, marginTop: 8 }}>
              <ActivityIndicator size="small" color="#F97316" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 11, color: '#F97316', fontWeight: '500' }}>Syncing latest campus network...</Text>
            </View>
          )}
          <TypedFlashList
            estimatedItemSize={75}
            data={paginatedConnections}
            keyExtractor={(item: any) => item.id}
            numColumns={1}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.listContainer, { paddingTop: 12, paddingBottom: 180 + insets.bottom }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchUsers({ force: true })}
                colors={['#F97316']}
                tintColor="#F97316"
              />
            }
            ListHeaderComponent={renderListHeader}
            ListFooterComponent={renderPagination}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>👥</Text>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  No users found
                </Text>
                <Text style={[styles.emptyBody, { color: theme.textSecondary }, { textAlign: 'center', paddingHorizontal: 12 }]}>
                  There are currently no users in your network matching this criteria.
                </Text>
              </View>
            }
            renderItem={({ item }: { item: any }) => {
              const btnStyle = getConnectBtnStyle(item.status);
              const showDismissBtn = !showSelfConnectionsOnly && item.status !== 'Connected';
              return (
                <View style={[styles.linkedinListRow, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                  {/* Left: Profile Avatar */}
                  <TouchableOpacity
                    onPress={() => handleOpenProfileCard(item)}
                    activeOpacity={0.9}
                    style={styles.rowAvatarContainer}
                  >
                    <NetworkAvatar uri={item.image} name={item.name} style={styles.rowAvatar} />
                  </TouchableOpacity>

                  {/* Middle: Details */}
                  <View style={styles.rowTextContainer}>
                    <TouchableOpacity
                      onPress={() => handleOpenProfileCard(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.rowNameText, { color: theme.text }]} numberOfLines={1}>
                        {item.name}
                        {(item.id === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || item.id === 'DdP2c855PSRUJwhmN9rvbkYBraP2' || item.adminRole === 'SUPER_ADMIN') && (
                          <Text> <MaterialIcons name="verified" size={14} color="#1D9BF0" /></Text>
                        )}
                      </Text>
                      <Text style={[styles.rowRoleText, { color: theme.textSecondary }]}>
                        {item.role === 'Admin' ? 'Admin' : (item.role || 'Student')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Right: Connect and Dismiss Actions */}
                  <View style={styles.rowActionContainer}>
                    <TouchableOpacity
                      style={[styles.rowConnectBtn, { borderColor: btnStyle.borderColor, backgroundColor: btnStyle.backgroundColor }]}
                      onPress={() => handleToggleConnection(item)}
                      disabled={item.status === 'Connected'}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={btnStyle.icon} size={12} color={btnStyle.textColor} style={{ marginRight: 4 }} />
                      <Text style={[styles.rowConnectBtnText, { color: btnStyle.textColor }]}>
                        {btnStyle.text}
                      </Text>
                    </TouchableOpacity>

                    {showDismissBtn && (
                      <TouchableOpacity
                        style={[styles.rowDismissBtn, { backgroundColor: theme.isDark ? '#334155' : '#F1F5F9' }]}
                        onPress={() => handleDismissSuggestion(item.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}
      <ExploreMenuModal />
    </View>
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

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuRowText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  menuRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuCountText: {
    fontSize: 13,
    fontWeight: '500',
  },
  badgeContainer: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  linkedinGridCard: {
    flex: 1,
    margin: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    height: 280,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardCover: {
    height: 60,
    width: '100%',
  },
  cardAvatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    marginTop: -30,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  cardAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  cardDismissBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cardContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    width: '95%',
  },
  cardHeadline: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14,
    width: '95%',
  },
  cardDetail: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  cardConnectBtn: {
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    width: '90%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  cardConnectBtnText: {
    fontSize: 12,
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

  searchBackdrop: {
    position: 'absolute',
    top: 144,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 110,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  },

  searchHistoryOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 120,
    borderBottomWidth: 1.5,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  searchHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  searchHistoryTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },

  historyRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  historyText: {
    fontSize: 13,
    fontWeight: '600',
  },

  linkedinListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  rowAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  rowAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  rowTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  rowNameText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  rowRoleText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  rowActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowConnectBtn: {
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  rowConnectBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rowDismissBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});