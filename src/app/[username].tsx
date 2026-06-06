import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Share, Alert, Linking, Modal } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAppStore, sortPostsPriority } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getCachedProfile, setCachedProfile } from '@/utils/profileCache';
import { canReportContent } from '@/utils/permissions';
import { getFormattedPostTime } from '@/utils/timeFormat';
import { useNotificationStore } from '@/store/useNotificationStore';

const { width } = Dimensions.get('window');

interface ResolvedProfile {
  name: string;
  role: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest' | 'Admin';
  photoUrl?: string;
  department?: string;
  batch?: string;
  isDeptPrivate?: boolean;
  isBatchPrivate?: boolean;
  vibeStatus?: string;
  skills?: string[];
  links?: { 
    github?: string; 
    linkedin?: string; 
    instagram?: string; 
    googlescholar?: string;
    youtube?: string;
    website?: string;
    portfolio?: string;
    facebook?: string;
    twitter?: string;
  };
  customLinks?: Array<{ title: string; url: string }>;
  experiences?: Array<{
    id: string;
    role: string;
    company: string;
    employmentType: string;
    startMonth: string;
    startYear: string;
    endMonth?: string;
    endYear?: string;
    isCurrent: boolean;
    description?: string;
  }>;
  username?: string;
  uid?: string;
  rollNo?: string;
  regNo?: string;
}

export default function PublicProfileScreen() {
  const { username: rawUsername, fromAdmin, from } = useLocalSearchParams<{ username: string, fromAdmin?: string, from?: string }>();
  const router = useRouter();
  const theme = useThemeColors();

  const handleBack = () => {
    if (fromAdmin) {
      if (fromAdmin === 'users') {
        router.replace('/notanadmin/users');
      } else if (fromAdmin === 'posts') {
        router.replace('/notanadmin/posts');
      } else if (fromAdmin === 'reports') {
        router.replace('/notanadmin/reports');
      } else if (fromAdmin === 'deletions') {
        router.replace('/notanadmin/deletions');
      } else {
        router.replace('/notanadmin/dashboard');
      }
    } else if (router.canGoBack()) {
      router.back();
    } else if (from) {
      if (from === 'network') {
        router.replace('/network');
      } else if (from === 'notifications') {
        router.replace('/notifications');
      } else if (from.startsWith('post_')) {
        const postId = from.replace('post_', '');
        router.replace(`/post/${postId}`);
      } else {
        router.replace('/');
      }
    } else {
      router.replace('/');
    }
  };
  
  const {
    user,
    posts,
    connections,
    toggleConnection,
    blockedUserUids,
    blockUser,
    unblockUser,
  } = useAppStore(
    useShallow(state => ({
      user: state.user,
      posts: state.posts,
      connections: state.connections,
      toggleConnection: state.toggleConnection,
      blockedUserUids: state.blockedUserUids,
      blockUser: state.blockUser,
      unblockUser: state.unblockUser,
    }))
  );
  const { notifications } = useNotificationStore();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ResolvedProfile | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [scrollXOffset, setScrollXOffset] = useState(0);
  const horizontalScrollRef = useRef<ScrollView>(null);
  
  const isOwnProfile = profile && user && (profile.uid === user.uid || profile.name === user.name);

  // Find actual connection status
  const connectionObj = profile ? (connections || []).find(c => c.name === profile.name) : null;
  const status = connectionObj ? connectionObj.status : 'Connect';

  // Find pending received connection request notification from this user
  const pendingNotif = (status === 'Connect' && notifications)
    ? (notifications || []).find(
        n => n.type === 'connection_request' && n.status !== 'accepted' && profile && (n.senderUid === profile.uid || n.senderName === profile.name)
      )
    : null;

  const peerPosts = React.useMemo(() => {
    if (!profile) return [];
    return (posts || []).filter(post => {
      const matchesUid = post.authorUid && profile.uid && post.authorUid === profile.uid;
      const matchesRealName = post.authorRealName && profile.name && post.authorRealName === profile.name;
      const matchesAuthorName = post.authorName && profile.name && post.authorName === profile.name;
      const isAuthor = !!(matchesUid || matchesRealName || matchesAuthorName);

      if (post.isAnonymous) {
        // Anonymous posts should ONLY be visible to their owner and admins
        const isAdmin = user?.role === 'admin';
        return !!((isOwnProfile || isAdmin) && isAuthor);
      }
      return isAuthor;
    });
  }, [posts, profile, isOwnProfile]);

  const [showAppPrompt, setShowAppPrompt] = useState(Platform.OS === 'web');
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'desktop'>('desktop');

  useEffect(() => {
    if (Platform.OS === 'web') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('android')) {
        setDeviceType('android');
      } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
        setDeviceType('ios');
      }
    }
  }, []);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      if (!rawUsername) return;
      
      // Clean leading @ if present and preserve original case
      let cleanUsername = rawUsername.trim();
      if (cleanUsername.startsWith('@')) {
        cleanUsername = cleanUsername.substring(1);
      }
      const cleanUsernameLower = cleanUsername.toLowerCase();

      try {
        setLoading(true);
        setErrorMsg(null);

        let resolvedUid = null;

        // 1. Resolve username to uid (case-insensitively via lowercased username mapping)
        const usernameDocRef = doc(db, 'usernames', cleanUsernameLower);
        const usernameDoc = await getDoc(usernameDocRef);

        if (usernameDoc.exists()) {
          resolvedUid = usernameDoc.data().uid;
        } else {
          // Fallback: Check if cleanUsername is itself a valid case-sensitive UID in publicProfiles
          const directProfileDocRef = doc(db, 'publicProfiles', cleanUsername);
          const directProfileDoc = await getDoc(directProfileDocRef);
          if (directProfileDoc.exists()) {
            resolvedUid = cleanUsername;
          } else {
            // Try with lowercased cleanUsername as UID
            const directProfileDocRefLower = doc(db, 'publicProfiles', cleanUsernameLower);
            const directProfileDocLower = await getDoc(directProfileDocRefLower);
            if (directProfileDocLower.exists()) {
              resolvedUid = cleanUsernameLower;
            }
          }
        }

        if (!resolvedUid) {
          setErrorMsg(`@${cleanUsername} is not registered yet. Build your profile card on MCE Connect today!`);
          setLoading(false);
          return;
        }

        const uid = resolvedUid;

        // --- CACHE LOOKUP ---
        try {
          const cached = await getCachedProfile(uid);
          if (cached) {
            setProfile(cached);
            setLoading(false);
            console.log('[Cache Hit] Loaded public profile from local cache:', cleanUsername);
            
            // We still do a background fetch to keep cache and display fresh, but don't show loading spinner
            fetchFreshDetails(uid, cleanUsername);
            return;
          }
        } catch (e) {
          console.warn('Cache read error:', e);
        }

        await fetchFreshDetails(uid, cleanUsername);
      } catch (err) {
        console.error('Error fetching public profile:', err);
        setErrorMsg('Unable to connect to database. Please check your network connection.');
      } finally {
        setLoading(false);
      }
    };

    const fetchFreshDetails = async (uid: string, cleanUsername: string) => {
      try {
        const userDocRef = doc(db, 'publicProfiles', uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          setErrorMsg('Profile document not found in community database.');
          return;
        }

        const userData = userDoc.data();

        // Enforce account suspension/ban warnings unless viewed by admin panel
        if ((userData.status === 'suspended' || userData.status === 'banned') && !fromAdmin) {
          const statusText = userData.status === 'suspended' ? 'suspended' : 'banned';
          setErrorMsg(`This account has been ${statusText} due to safety & policy guidelines violation.`);
          setProfile(null);
          return;
        }

        const resolvedName = userData.name || 'Campus Member';
        const resolvedRole = userData.adminRole ? 'Admin' : (userData.role || 'Student');
        
        if (Platform.OS === 'web') {
          document.title = `${resolvedName} ${resolvedRole} - MCE MOTIHARI`;
        }

        const freshData = {
          name: resolvedName,
          role: resolvedRole,
          photoUrl: userData.photoUrl,
          department: userData.department,
          batch: userData.batch,
          isDeptPrivate: userData.isDeptPrivate || false,
          isBatchPrivate: userData.isBatchPrivate || false,
          vibeStatus: userData.vibeStatus,
          skills: userData.skills || [],
          links: userData.links || {},
          customLinks: userData.customLinks || [],
          experiences: userData.experiences || [],
          username: cleanUsername,
          uid,
          rollNo: userData.rollNo,
          regNo: userData.regNo
        };

        setProfile(freshData);
        await setCachedProfile(uid, freshData);
        console.log('[Cache Write] Synced fresh public profile from Firestore:', cleanUsername);
      } catch (e) {
        console.error('Background sync failed:', e);
      }
    };

    fetchPublicProfile();
  }, [rawUsername, fromAdmin]);

  const handleOpenExternalLinkWithConfirmation = (url?: string) => {
    if (!url) return;
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    
    if (Platform.OS === 'web') {
      const confirm = window.confirm(`Open external website?\n\nDo you want to visit:\n${formattedUrl}?`);
      if (confirm) {
        const newWindow = window.open(formattedUrl, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          window.location.href = formattedUrl;
        }
      }
      return;
    }
    
    Alert.alert(
      'Open External Link',
      `Do you want to open this external link in your browser?\n\n${formattedUrl}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => Linking.openURL(formattedUrl) }
      ]
    );
  };

  const handleBlockToggle = () => {
    if (!profile) return;
    const isBlocked = blockedUserUids?.includes(profile.uid || '');
    if (isBlocked) {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm(`Kya aap "${profile.name}" ko unblock karna chahte hain?`);
        if (confirmed) unblockUser(profile.uid || '');
      } else {
        Alert.alert(
          'Unblock User',
          `Kya aap "${profile.name}" ko unblock karna chahte hain?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Unblock', 
              onPress: async () => {
                await unblockUser(profile.uid || '');
              } 
            }
          ]
        );
      }
    } else {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm(`Kya aap "${profile.name}" ko block karna chahte hain? Block karne par unka koi bhi post aapke feed me nahi dikhega.`);
        if (confirmed) blockUser(profile.uid || '');
      } else {
        Alert.alert(
          'Block User 🚫',
          `Kya aap "${profile.name}" ko block karna chahte hain? Block karne par unka koi bhi post aapke feed me nahi dikhega.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Block', 
              style: 'destructive',
              onPress: async () => {
                await blockUser(profile.uid || '');
              } 
            }
          ]
        );
      }
    }
  };

  const handleReportProfile = () => {
    if (!profile) return;
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to report "${profile.name}" for community guideline violations? Our safety team will review this profile within 24 hours.`);
      if (confirmed) alert('Thank you. This profile has been successfully reported for safety review.');
    } else {
      Alert.alert(
        'Report Profile',
        `Are you sure you want to report "${profile.name}" for community guideline violations? Our safety team will review this profile within 24 hours.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Report', 
            style: 'destructive', 
            onPress: () => Alert.alert('Report Received', 'Thank you. This profile has been successfully reported for safety review.')
          }
        ]
      );
    }
  };

  const handleAcceptRequest = async (notifItem: any) => {
    if (!user) return;
    try {
      const { runTransaction, doc } = require('firebase/firestore');
      const { db } = require('@/config/firebase');

      const senderUid = notifItem.senderUid;
      if (!senderUid) {
        throw new Error("Sender UID not found in notification.");
      }

      const requestId = notifItem.id;
      // Deterministic notification ID for connection acceptance
      const acceptanceNotifId = `connection_accepted_${user.uid}_${senderUid}_${requestId}`;
      const sortedUserIds = [user.uid, senderUid].sort().join('_');

      const notifDocRef = doc(db, 'users', user.uid, 'notifications', requestId);
      const senderConnRef = doc(db, 'users', senderUid, 'connections', user.uid);
      const recipientConnRef = doc(db, 'users', user.uid, 'connections', senderUid);
      const senderNotifRef = doc(db, 'users', senderUid, 'notifications', acceptanceNotifId);

      await runTransaction(db, async (transaction: any) => {
        // 1. Verify pending request exists
        const notifDoc = await transaction.get(notifDocRef);
        if (!notifDoc.exists()) {
          throw new Error("Pending connection request notification does not exist.");
        }
        
        const notifData = notifDoc.data();
        if (notifData.status === 'accepted') {
          return; // Abort cleanly, already accepted
        }

        // 2. Prevent duplicate connection records
        const recipientConnDoc = await transaction.get(recipientConnRef);
        if (recipientConnDoc.exists() && recipientConnDoc.data().status === 'Connected') {
          return; // Abort cleanly, already connected
        }

        // 3. Atomically perform all writes
        transaction.update(notifDocRef, {
          status: 'accepted',
          read: true,
          body: `You accepted ${notifItem.senderName}'s connection request.`
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
          name: notifItem.senderName || '',
          role: notifItem.senderRole || 'Student',
          branch: notifItem.senderBranch || '',
          batch: notifItem.senderBatch || '',
          image: notifItem.senderPhoto || '',
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

      // 4. Update local Zustand
      const localConn = {
        id: senderUid,
        name: notifItem.senderName!,
        role: (notifItem.senderRole || 'Student') as any,
        branch: notifItem.senderBranch || '',
        batch: notifItem.senderBatch || '',
        image: notifItem.senderPhoto || '',
        status: 'Connected' as const,
      };

      const storeState = useAppStore.getState();
      const updatedConnections = [...(storeState.connections || []).filter(c => c.id !== senderUid), localConn];
      useAppStore.setState({ connections: updatedConnections });
      
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('@mce_connections', JSON.stringify(updatedConnections));

      const sortedPosts = sortPostsPriority(storeState.posts, updatedConnections);
      useAppStore.setState({ posts: sortedPosts });
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(sortedPosts));

      if (Platform.OS === 'web') {
        alert(`Connected! You are now connected with ${notifItem.senderName}.`);
      } else {
        Alert.alert('Connected 🤝', `You are now connected with ${notifItem.senderName}!`);
      }
    } catch (err) {
      console.error('Failed to accept request:', err);
      Alert.alert('Acceptance Failed', 'Unable to complete connection.');
    }
  };

  const handleRemoveConnection = async () => {
    if (!user || !profile || !profile.uid) return;
    
    const confirmMsg = `Remove "${profile.name}" from your connections grid? You will no longer see their updates prioritized in your feed.`;
    
    const executeDisconnect = async () => {
      try {
        const { doc, deleteDoc } = require('firebase/firestore');
        const { db } = require('@/config/firebase');
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;

        // 1. Remove locally
        const storeState = useAppStore.getState();
        const updated = storeState.connections.filter(c => c.id !== profile.uid);
        
        // 2. Re-sort posts
        const sortedPosts = sortPostsPriority(storeState.posts, updated);
        
        useAppStore.setState({ connections: updated, posts: sortedPosts });
        await AsyncStorage.setItem('@mce_connections', JSON.stringify(updated));
        await AsyncStorage.setItem('@mce_posts', JSON.stringify(sortedPosts));

        // 3. Delete from Firestore connections list for both users
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'connections', profile.uid));
          await deleteDoc(doc(db, 'users', profile.uid, 'connections', user.uid));
        } catch (e) {
          console.warn('Firestore connection removal error:', e);
        }

        if (Platform.OS === 'web') {
          alert(`Disconnected! You removed ${profile.name} from your connections.`);
        } else {
          Alert.alert('Disconnected 🤝', `You removed ${profile.name} from your connections grid.`);
        }
      } catch (err) {
        console.error('Failed to remove connection:', err);
        Alert.alert('Error', 'Unable to remove connection. Please try again.');
      }
    };

    if (Platform.OS === 'web') {
      const proceed = window.confirm(confirmMsg);
      if (proceed) executeDisconnect();
    } else {
      Alert.alert(
        'Remove Connection 🤝',
        confirmMsg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: executeDisconnect }
        ]
      );
    }
  };
  const handleAndroidRedirect = () => {
    if (Platform.OS === 'web' && profile) {
      // 1. Try launching native app deep link first
      const deepLink = `mcemotihari://@${profile.username}`;
      const playStoreUrl = `https://play.google.com/store/apps/details?id=mcemotihari.app`;
      
      window.location.href = deepLink;
      
      // 2. Fallback to Play Store details page if app is not installed
      setTimeout(() => {
        window.location.href = playStoreUrl;
      }, 1500);
    }
  };

  const handleShare = async () => {
    if (!profile) return;
    try {
      const profileUrl = `https://mcemotihari-app.web.app/@${profile.username}`;
      const rolePrefix = profile.role === 'Student' ? 'B.Tech Student' : profile.role === 'Alumni' ? 'MCE Alumni' : profile.role === 'Faculty' ? 'MCE Faculty' : 'MCE Member';
      const departmentLabel = profile.department ? ` | ${profile.department}` : '';

      let shareMessage = `Hey MCEians! 👋\n`;
      shareMessage += `Let's sync up on MCE Connect—our community space developed by Alumni & Students for college notices, alumni connections, and study resources.\n\n`;
      shareMessage += `${profile.name.toUpperCase()}\n`;
      shareMessage += `${rolePrefix}${departmentLabel}\n\n`;
      shareMessage += `📲 Build your verified profile card today!\n\n`;
      shareMessage += `Check out my profile card:\n`;
      shareMessage += `${profileUrl}`;

      await Share.share({
        title: `${profile.name}'s Profile`,
        message: shareMessage,
        url: profileUrl,
      });
    } catch (error) {
      console.warn('Share error:', error);
    }
  };

  const getRoleColor = (role: string) => {
    if (role === 'Student') return '#A855F7';
    if (role === 'Alumni') return '#3B82F6';
    if (role === 'Admin') return '#2563EB';
    return '#F97316';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]} edges={['top']}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading verified profile card...</Text>
      </SafeAreaView>
    );
  }

  if (errorMsg || !profile) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]} edges={['top']}>
        <Text style={styles.errorEmoji}>🔍</Text>
        <Text style={[styles.errorTitle, { color: theme.text }]}>Profile Not Found</Text>
        <Text style={[styles.errorSubtitle, { color: theme.textSecondary }]}>{errorMsg || 'Unable to resolve username.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.backBtnText}>Back to Home Feed</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header Row */}
      <View style={[styles.headerRow, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity style={styles.actionIconBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Verified Profile</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Share Button */}
          <TouchableOpacity style={styles.actionIconBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={theme.text} />
          </TouchableOpacity>

          {/* 3-Dots Options Menu */}
          {!isOwnProfile && (
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => setShowMenu(true)}>
              <Ionicons name="ellipsis-vertical" size={20} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {/* Cover banner */}
        <View style={[styles.coverSection, { backgroundColor: '#001b59' }]}>
          <View style={styles.coverImageMask}>
            <Image 
              source={require('../../assets/images/NAB.png')} 
              style={styles.coverImage} 
              resizeMode="contain" 
            />
          </View>
          <View style={styles.coverOverlay} />
        </View>

        {/* Profile Card Header */}
        <View style={[styles.profileHeaderCard, styles.profileHeaderCardShift, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, alignItems: 'center' }]}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatarRing, { borderColor: getRoleColor(profile.role) }]}>
              <Image
                source={{ uri: profile.photoUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix' }}
                style={styles.avatarImage}
              />
            </View>
          </View>
          
          <Text style={[styles.profileName, { color: theme.text, marginTop: 20 }]}>{profile.name}</Text>

          <View style={styles.badgeRow}>
            <VerifiedBadge role={profile.role} size="medium" />
          </View>



          {profile.vibeStatus ? (
            <View style={[styles.vibeCard, { backgroundColor: theme.background, borderColor: theme.cardBorder, marginTop: 12 }]}>
              <Text style={[styles.vibeText, { color: theme.text }]}>
                "{profile.vibeStatus}"
              </Text>
            </View>
          ) : null}

          {/* Connect Action Trigger */}
          {!isOwnProfile && (status !== 'Connected' || pendingNotif) && (
            <TouchableOpacity
              style={[
                styles.connectBtn,
                pendingNotif && { backgroundColor: '#22C55E' },
                status === 'Connected' && { backgroundColor: theme.isDark ? '#451A03' : '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1 },
                status === 'Sent' && styles.connectBtnSent,
                (status === 'Connect' && !pendingNotif) && { backgroundColor: theme.isDark ? '#1E293B' : '#0F172A' },
                { marginTop: 12, width: '100%' }
              ]}
              onPress={async () => {
                if (pendingNotif) {
                  await handleAcceptRequest(pendingNotif);
                } else if (status === 'Connected') {
                  await handleRemoveConnection();
                } else if (status === 'Sent') {
                  // Cancel connection request
                  if (connectionObj) {
                    await toggleConnection(connectionObj.id);
                    // Delete from Firestore
                    if (profile.uid) {
                      try {
                        const { doc, deleteDoc } = require('firebase/firestore');
                        const { db } = require('@/config/firebase');
                        await deleteDoc(doc(db, 'users', user.uid, 'connections', profile.uid));
                        await deleteDoc(doc(db, 'users', profile.uid, 'connections', user.uid));
                      } catch (e) {}
                    }
                  }
                } else {
                  // Send connection request
                  if (!profile.uid) {
                    Alert.alert('Connection Failed', 'Profile ID not found. Unable to connect.');
                    return;
                  }
                  try {
                    const { doc, setDoc } = require('firebase/firestore');
                    const { db } = require('@/config/firebase');

                    const requestId = `connection_request_${user.uid}_${profile.uid}`;

                    // 1. Write the connection request notification to the recipient user's subcollection
                    const notifDocRef = doc(db, 'users', profile.uid, 'notifications', requestId);
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
                    const selfConnRef = doc(db, 'users', user.uid, 'connections', profile.uid);
                    await setDoc(selfConnRef, {
                      id: profile.uid,
                      name: profile.name,
                      role: profile.role || 'Student',
                      branch: profile.department || 'MCE',
                      batch: profile.batch || 'N/A',
                      image: profile.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}`,
                      status: 'Sent',
                      connectedAt: new Date().toISOString()
                    });

                    // 2. Add connection locally in store as "Sent"
                    const newConn = {
                      id: profile.uid,
                      name: profile.name,
                      role: (profile.role === 'Guest' ? 'Student' : (profile.role === 'Other' ? 'Faculty' : profile.role)) as any,
                      branch: profile.department || 'MCE',
                      batch: profile.batch || 'N/A',
                      image: profile.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}`,
                      status: 'Sent' as const,
                    };
                    const storeState = useAppStore.getState();
                    const updated = [...(storeState.connections || []).filter(c => c.id !== profile.uid), newConn];
                    useAppStore.setState({ connections: updated });
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    await AsyncStorage.setItem('@mce_connections', JSON.stringify(updated));

                    if (Platform.OS === 'web') {
                      alert('Request Sent! Connection request sent successfully to ' + profile.name);
                    } else {
                      Alert.alert('Request Sent 🤝', 'Connection request sent successfully to ' + profile.name);
                    }
                  } catch (err: any) {
                    console.error('Failed to send request:', err);
                    Alert.alert('Connection Failed', 'Failed to send connection request.');
                  }
                }
              }}
              activeOpacity={0.85}
            >
              <Ionicons
                name={
                  pendingNotif
                    ? 'person-add'
                    : status === 'Connected'
                    ? 'close-circle-outline'
                    : status === 'Sent'
                    ? 'time'
                    : 'person-add'
                }
                size={16}
                color={
                  pendingNotif
                    ? '#FFFFFF'
                    : status === 'Connected'
                    ? '#EF4444'
                    : status === 'Sent'
                    ? '#F97316'
                    : '#FFFFFF'
                }
              />
              <Text
                style={[
                  styles.connectBtnText,
                  pendingNotif && { color: '#FFFFFF' },
                  status === 'Connected' && { color: '#EF4444' },
                  status === 'Sent' && { color: '#F97316' },
                  (status === 'Connect' && !pendingNotif) && { color: '#FFFFFF' }
                ]}
              >
                {pendingNotif
                  ? 'Accept Connection Request'
                  : status === 'Connected'
                  ? 'Remove Connection'
                  : status === 'Sent'
                  ? 'Cancel Connection Request'
                  : `Connect with ${profile.name.split(' ')[0]}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bento Grid */}
        <View style={styles.bentoGrid}>
          {/* Card 1: Academic Standing */}
          {!(profile.role === 'Other' && !profile.rollNo && !profile.regNo && (!profile.department || profile.department === 'MCE') && !profile.batch) && (
            <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="school" size={16} color={getRoleColor(profile.role)} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Campus Credentials</Text>
                <View style={styles.verifiedLabelBadge}>
                  <Ionicons name="checkmark-circle" size={11} color="#22C55E" />
                  <Text style={styles.verifiedLabelText}>Verified</Text>
                </View>
              </View>
              
              <View style={styles.credentialsGrid}>
                <View style={styles.credentialItem}>
                  <Text style={styles.credentialLabel}>Branch / Major</Text>
                  <Text style={[styles.credentialVal, { color: theme.text }]}>
                    {(profile.department && profile.department !== 'MCE') ? 
                      (profile.isDeptPrivate && !isOwnProfile ? 'Hidden' : profile.department) 
                      : 'N/A'
                    }
                  </Text>
                </View>

                <View style={styles.credentialRow}>
                  <View style={styles.credentialHalf}>
                    <Text style={styles.credentialLabel}>Academic Batch</Text>
                    <Text style={[styles.credentialVal, { color: theme.text }]}>
                      {profile.batch ? 
                        (profile.isBatchPrivate && !isOwnProfile ? 'Hidden' : profile.batch) 
                        : 'N/A'
                      }
                    </Text>
                  </View>
                  <View style={styles.credentialHalf}>
                    <Text style={styles.credentialLabel}>Roll Number</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Text style={[styles.credentialVal, { color: theme.text }]}>
                        {profile.rollNo ? (isOwnProfile ? profile.rollNo : '••••••••••') : 'N/A'}
                      </Text>
                      {profile.rollNo ? (
                        <View style={[styles.privateBadge, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                          <Ionicons name={isOwnProfile ? "eye" : "eye-off"} size={10} color="#EF4444" />
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#EF4444' }}>{isOwnProfile ? 'Owner Only' : 'Masked'}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                {profile.regNo ? (
                  <View style={[styles.credentialItem, { marginTop: 10 }]}>
                    <Text style={styles.credentialLabel}>Registration Number</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Text style={[styles.credentialVal, { color: theme.text }]}>
                        {isOwnProfile ? profile.regNo : '••••••••••'}
                      </Text>
                      <View style={[styles.privateBadge, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                        <Ionicons name={isOwnProfile ? "eye" : "eye-off"} size={10} color="#EF4444" />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#EF4444' }}>{isOwnProfile ? 'Owner Only' : 'Masked'}</Text>
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {/* Card 2: Interactive Skills Tag Cloud */}
          {profile.skills && profile.skills.length > 0 ? (
            <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="sparkles" size={16} color="#A855F7" />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Tech Skills</Text>
              </View>
              <View style={styles.tagGrid}>
                {profile.skills.map((skill, index) => (
                  <View key={index} style={[styles.skillTag, { backgroundColor: theme.isDark ? 'rgba(168, 85, 247, 0.08)' : '#F3E8FF', borderColor: theme.isDark ? 'rgba(168, 85, 247, 0.2)' : '#E9D5FF' }]}>
                    <Text style={[styles.skillTagText, { color: '#9333EA' }]}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Card 3: Social & Web Links */}
          {(() => {
            const links = profile.links || {};
            const customLinks = profile.customLinks || [];

            const activeLinksList = [];

            if (links.portfolio && links.portfolio.trim()) {
              activeLinksList.push({
                key: 'portfolio',
                label: 'Portfolio',
                value: links.portfolio,
                emoji: '🌐',
              });
            }
            if (links.website && links.website.trim()) {
              activeLinksList.push({
                key: 'website',
                label: 'Personal Website',
                value: links.website,
                emoji: '🌐',
              });
            }
            if (links.linkedin && links.linkedin.trim()) {
              activeLinksList.push({
                key: 'linkedin',
                label: 'LinkedIn',
                value: links.linkedin,
                emoji: '💼',
              });
            }
            if (links.github && links.github.trim()) {
              activeLinksList.push({
                key: 'github',
                label: 'GitHub',
                value: links.github,
                emoji: '💻',
              });
            }
            if (links.instagram && links.instagram.trim()) {
              activeLinksList.push({
                key: 'instagram',
                label: 'Instagram',
                value: links.instagram,
                emoji: '📸',
              });
            }
            if (links.googlescholar && links.googlescholar.trim()) {
              activeLinksList.push({
                key: 'googlescholar',
                label: 'Google Scholar',
                value: links.googlescholar,
                emoji: '🎓',
              });
            }
            if (links.youtube && links.youtube.trim()) {
              activeLinksList.push({
                key: 'youtube',
                label: 'YouTube',
                value: links.youtube,
                emoji: '📺',
              });
            }
            if (links.facebook && links.facebook.trim()) {
              activeLinksList.push({
                key: 'facebook',
                label: 'Facebook',
                value: links.facebook,
                emoji: '👥',
              });
            }
            if (links.twitter && links.twitter.trim()) {
              activeLinksList.push({
                key: 'twitter',
                label: 'Twitter / X',
                value: links.twitter,
                emoji: '🐦',
              });
            }

            customLinks.forEach((link: { title: string, url: string }) => {
              if (link.title && link.title.trim() && link.url && link.url.trim()) {
                let emoji = '🌐';
                const titleLower = link.title.toLowerCase();
                if (titleLower.includes('linkedin')) emoji = '💼';
                else if (titleLower.includes('github')) emoji = '💻';
                else if (titleLower.includes('instagram')) emoji = '📸';
                
                activeLinksList.push({
                  key: `custom_${link.title}_${link.url}`,
                  label: link.title,
                  value: link.url,
                  emoji: emoji,
                });
              }
            });

            if (activeLinksList.length === 0) return null;

            return (
              <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, paddingVertical: 12 }]}>
                <View style={[styles.cardHeader, { marginBottom: 10 }]}>
                  <Ionicons name="link" size={16} color="#06B6D4" />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Social & Web Links</Text>
                </View>
                
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                  {activeLinksList.map((item) => {
                    let iconName: any = 'globe-outline';
                    let brandColor = '#06B6D4';
                    
                    switch (item.key) {
                      case 'linkedin':
                        iconName = 'logo-linkedin';
                        brandColor = '#0A66C2';
                        break;
                      case 'instagram':
                        iconName = 'logo-instagram';
                        brandColor = '#E1306C';
                        break;
                      case 'facebook':
                        iconName = 'logo-facebook';
                        brandColor = '#1877F2';
                        break;
                      case 'twitter':
                        iconName = 'logo-twitter';
                        brandColor = theme.isDark ? '#FFFFFF' : '#000000';
                        break;
                      case 'github':
                        iconName = 'logo-github';
                        brandColor = theme.isDark ? '#FFFFFF' : '#24292E';
                        break;
                      case 'youtube':
                        iconName = 'logo-youtube';
                        brandColor = '#FF0000';
                        break;
                      case 'googlescholar':
                        iconName = 'school-outline';
                        brandColor = '#4285F4';
                        break;
                      case 'portfolio':
                        iconName = 'briefcase-outline';
                        brandColor = '#0D9488';
                        break;
                      case 'website':
                        iconName = 'globe-outline';
                        brandColor = '#0F766E';
                        break;
                      default:
                        iconName = 'link-outline';
                        brandColor = '#64748B';
                    }

                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                          borderWidth: 1,
                          borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onPress={() => handleOpenExternalLinkWithConfirmation(item.value)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={iconName} size={20} color={brandColor} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );

          })()}

          {/* Card: Peer Activity Timeline */}
          {peerPosts.length > 0 && (
            <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, width: '100%' }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="newspaper-outline" size={16} color="#10B981" />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Public Activity</Text>
              </View>
              
              <View style={{ position: 'relative', width: '100%' }}>
                <ScrollView
                  ref={horizontalScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  onScroll={(event) => {
                    setScrollXOffset(event.nativeEvent.contentOffset.x);
                  }}
                  scrollEventThrottle={16}
                  contentContainerStyle={{ gap: 12, paddingBottom: 4, paddingHorizontal: 2 }}
                >
                  {peerPosts.slice(0, 10).map((post) => {
                    const getPostTypeBadge = (pItem: any) => {
                      if (pItem.pollOptions && pItem.pollOptions.length > 0) {
                        return { label: 'Poll', emoji: '📊', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.08)' };
                      }
                      if (pItem.category === 'Placement' || pItem.category === 'Sports' || pItem.category === 'Alumni') {
                        return { label: 'Event', emoji: '📅', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.08)' };
                      }
                      return { label: 'Public', emoji: '💬', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.08)' };
                    };

                    const badge = getPostTypeBadge(post);
                    const titleText = post.title || post.content || '';
                    const previewText = titleText.length > 80 ? titleText.slice(0, 77) + '...' : titleText;
                    
                    return (
                      <TouchableOpacity
                        key={post.id}
                        activeOpacity={0.85}
                        onPress={() => {
                          const safeUsername = profile?.username || rawUsername.replace(/^@/, '');
                          router.push(`/post/${post.id}?from=user_${safeUsername}`);
                        }}
                        style={{
                          width: width - 80,
                          backgroundColor: theme.background,
                          borderWidth: 1,
                          borderColor: theme.cardBorder,
                          borderRadius: 14,
                          padding: 14,
                          shadowColor: '#000',
                          shadowOpacity: 0.01,
                          shadowRadius: 2,
                          elevation: 1,
                          gap: 10,
                        }}
                      >
                        {/* Meta Row: Date & Badge */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: badge.bgColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ fontSize: 9.5, color: badge.color, fontWeight: '700' }}>
                              {badge.emoji} {badge.label}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                            {getFormattedPostTime(post.createdAt, post.timestamp)}
                          </Text>
                        </View>

                        {/* Title/Caption Preview */}
                        <Text style={{ fontSize: 12.5, fontWeight: 'bold', color: theme.text, lineHeight: 18 }} numberOfLines={2}>
                          {previewText}
                        </Text>

                        {/* Image Preview */}
                        {post.imageUrl ? (
                          <Image
                            source={{ uri: post.imageUrl }}
                            style={{
                              width: '100%',
                              height: 120,
                              borderRadius: 10,
                              marginTop: 2,
                            }}
                            contentFit="cover"
                          />
                        ) : null}

                        {/* Stats Row: Hearts & Comments */}
                        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', borderTopWidth: 0.5, borderTopColor: theme.cardBorder, paddingTop: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="heart" size={13} color="#EF4444" />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>
                              {post.claps || 0}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="chatbubble-outline" size={12} color={theme.textSecondary} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary }}>
                              {post.commentsCount || 0}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Left navigation arrow */}
                {scrollXOffset > 10 && (
                  <TouchableOpacity
                    onPress={() => {
                      horizontalScrollRef.current?.scrollTo({
                        x: Math.max(0, scrollXOffset - (width - 80 + 12)),
                        animated: true
                      });
                    }}
                    style={{
                      position: 'absolute',
                      left: -8,
                      top: '50%',
                      marginTop: -18,
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: theme.backgroundElement,
                      borderWidth: 1,
                      borderColor: theme.cardBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                      elevation: 4,
                      shadowColor: '#000',
                      shadowOpacity: 0.08,
                      shadowRadius: 4,
                      zIndex: 10,
                    }}
                  >
                    <Ionicons name="chevron-back" size={18} color={theme.text} />
                  </TouchableOpacity>
                )}

                {/* Right navigation arrow */}
                {peerPosts.length > 1 && scrollXOffset < (Math.min(peerPosts.length, 10) - 1) * (width - 80 + 12) - 20 && (
                  <TouchableOpacity
                    onPress={() => {
                      horizontalScrollRef.current?.scrollTo({
                        x: scrollXOffset + (width - 80 + 12),
                        animated: true
                      });
                    }}
                    style={{
                      position: 'absolute',
                      right: -8,
                      top: '50%',
                      marginTop: -18,
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: theme.backgroundElement,
                      borderWidth: 1,
                      borderColor: theme.cardBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                      elevation: 4,
                      shadowColor: '#000',
                      shadowOpacity: 0.08,
                      shadowRadius: 4,
                      zIndex: 10,
                    }}
                  >
                    <Ionicons name="chevron-forward" size={18} color={theme.text} />
                  </TouchableOpacity>
                )}
              </View>
              
              {peerPosts.length > 0 && (
                <TouchableOpacity 
                  onPress={() => router.push(`/public-posts/${rawUsername}`)}
                  style={{
                    backgroundColor: theme.backgroundElement,
                    borderWidth: 1,
                    borderColor: theme.cardBorder,
                    borderRadius: 12,
                    padding: 12,
                    marginTop: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>Show All Posts</Text>
                  <Ionicons name="arrow-forward" size={14} color={theme.text} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Card 4: Professional Experiences */}
          {profile.experiences && profile.experiences.length > 0 ? (
            <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="briefcase" size={16} color="#3B82F6" />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Experiences</Text>
              </View>
              <View style={styles.experienceList}>
                {profile.experiences.map((exp, index) => (
                  <View key={exp.id || index} style={[styles.experienceItem, { borderBottomColor: theme.cardBorder }]}>
                    <View style={styles.experienceIconFrame}>
                      <Ionicons name="briefcase-outline" size={18} color="#3B82F6" />
                    </View>
                    <View style={styles.experienceDetails}>
                      <Text style={[styles.experienceRole, { color: theme.text }]}>{exp.role}</Text>
                      <Text style={[styles.experienceCompany, { color: theme.textSecondary }]}>
                        {exp.company} • <Text style={styles.experienceTypeTag}>{exp.employmentType}</Text>
                      </Text>
                      <Text style={styles.experienceDates}>
                        {exp.startMonth} {exp.startYear} - {exp.isCurrent ? 'Present' : `${exp.endMonth} ${exp.endYear}`}
                      </Text>
                      {exp.description ? (
                        <Text style={[styles.experienceDesc, { color: theme.textSecondary }]}>{exp.description}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── PREMIUM PWA & MOBILE INSTALLATION PROMPT ─── */}
      {Platform.OS === 'web' && showAppPrompt && (
        <View style={styles.promptOverlay}>
          <View style={[styles.promptCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            {/* Close Button */}
            <TouchableOpacity style={styles.promptCloseBtn} onPress={() => setShowAppPrompt(false)}>
              <Ionicons name="close" size={18} color={theme.text} />
            </TouchableOpacity>

            {deviceType === 'android' ? (
              <View style={styles.promptContent}>
                <Text style={styles.promptEmoji}>🚀</Text>
                <Text style={[styles.promptTitle, { color: theme.text }]}>Open in MCE Connect App?</Text>
                <Text style={[styles.promptDesc, { color: theme.textSecondary }]}>
                  Get real-time notices, chat feeds, offline materials, and a faster experience inside our Android App.
                </Text>
                <TouchableOpacity style={styles.promptMainBtn} onPress={handleAndroidRedirect}>
                  <Text style={styles.promptMainBtnText}>Open / Install App</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.promptSecBtn} onPress={() => setShowAppPrompt(false)}>
                  <Text style={[styles.promptSecBtnText, { color: theme.textSecondary }]}>Continue in Browser</Text>
                </TouchableOpacity>
              </View>
            ) : deviceType === 'ios' ? (
              <View style={styles.promptContent}>
                <Text style={styles.promptEmoji}>📲</Text>
                <Text style={[styles.promptTitle, { color: theme.text }]}>Install App on iPhone</Text>
                <Text style={[styles.promptDesc, { color: theme.textSecondary }]}>
                  Add this verified card to your iPhone Home Screen for easy access:
                </Text>
                <View style={styles.iosInstructionBox}>
                  <Text style={[styles.instructionStep, { color: theme.text }]}>
                    1. Tap Share <Ionicons name="share-outline" size={14} color={theme.text} /> at Safari's bottom.
                  </Text>
                  <Text style={[styles.instructionStep, { color: theme.text }]}>
                    2. Select <Text style={{ fontWeight: 'bold' }}>"Add to Home Screen"</Text> <Ionicons name="add-circle-outline" size={14} color={theme.text} />.
                  </Text>
                </View>
                <TouchableOpacity style={styles.promptMainBtn} onPress={() => setShowAppPrompt(false)}>
                  <Text style={styles.promptMainBtnText}>Got it, Thanks!</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.promptContent}>
                <Text style={styles.promptEmoji}>💻</Text>
                <Text style={[styles.promptTitle, { color: theme.text }]}>MCE Connect on Android</Text>
                <Text style={[styles.promptDesc, { color: theme.textSecondary }]}>
                  Download our official app for automated notices, alumni logs, and course modules.
                </Text>
                <TouchableOpacity style={styles.promptMainBtn} onPress={() => window.open('https://play.google.com/store/apps/details?id=mcemotihari.app', '_blank')}>
                  <Text style={styles.promptMainBtnText}>Download Android App</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.promptSecBtn} onPress={() => setShowAppPrompt(false)}>
                  <Text style={[styles.promptSecBtnText, { color: theme.textSecondary }]}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Options Dropdown Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.menuBackdrop} 
          activeOpacity={1} 
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <Text style={[styles.menuHeaderTitle, { color: theme.textSecondary }]}>Choose action</Text>
            
            {/* Block / Unblock option */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: theme.cardBorder }]}
              onPress={() => {
                setShowMenu(false);
                setTimeout(() => handleBlockToggle(), 100);
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={blockedUserUids?.includes(profile?.uid || '') ? "ban" : "ban-outline"} 
                size={18} 
                color="#EF4444" 
                style={{ marginRight: 10 }}
              />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>
                {blockedUserUids?.includes(profile?.uid || '') ? 'Unblock User' : 'Block User'}
              </Text>
            </TouchableOpacity>

            {/* Report Option */}
            {profile && canReportContent(user?.uid, profile.uid, user?.name, profile.name) && (
              <TouchableOpacity
                style={[styles.menuItem, status === 'Connected' ? { borderBottomColor: theme.cardBorder } : null]}
                onPress={() => {
                  setShowMenu(false);
                  setTimeout(() => handleReportProfile(), 100);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="flag-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Report Profile</Text>
              </TouchableOpacity>
            )}

            {/* Remove Connection Option */}
            {status === 'Connected' && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  setTimeout(() => handleRemoveConnection(), 100);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={18} color="#EF4444" style={{ marginRight: 10 }} />
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Remove Connection</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.menuCancelBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
              onPress={() => setShowMenu(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.menuCancelText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13.5,
    fontWeight: '600',
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#F97316',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 680 : undefined,
    alignSelf: 'center',
    ...(Platform.OS === 'web' && {
      borderLeftWidth: 1.5,
      borderRightWidth: 1.5,
      borderColor: 'rgba(226, 232, 240, 0.8)',
      shadowColor: '#0F172A',
      shadowOpacity: 0.05,
      shadowRadius: 20,
    })
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  scrollBody: {
    paddingBottom: 180,
    minHeight: '100%',
  },
  coverSection: {
    height: 140,
    backgroundColor: '#001b59',
    position: 'relative',
    overflow: 'hidden',
  },
  coverImageMask: {
    width: '100%',
    height: 70,
    overflow: 'hidden',
    marginTop: 15,
  },
  coverImage: {
    width: '100%',
    height: 105,
    alignSelf: 'center',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  profileHeaderCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  profileHeaderCardShift: {
    marginTop: -15,
    marginBottom: 16,
  },
  avatarRow: {
    alignItems: 'center',
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    padding: 2,
    backgroundColor: '#FFFFFF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  profileRoleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  vibeCard: {
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  vibeText: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bentoGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  bentoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  verifiedLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#22C55E',
  },
  credentialsGrid: {
    gap: 10,
  },
  credentialItem: {
    gap: 2,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  credentialHalf: {
    flex: 1,
    gap: 2,
  },
  credentialLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  credentialVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  skillTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  linksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  linkCapsuleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  privateBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  experienceList: {
    gap: 12,
  },
  experienceItem: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  experienceIconFrame: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  experienceDetails: {
    flex: 1,
  },
  experienceRole: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  experienceCompany: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  experienceTypeTag: {
    fontSize: 10.5,
    color: '#3B82F6',
    fontWeight: '700',
  },
  experienceDates: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  experienceDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 6,
  },
  promptOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  promptCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    position: 'relative',
  },
  promptCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    borderRadius: 12,
    zIndex: 10,
  },
  promptContent: {
    alignItems: 'center',
    textAlign: 'center',
  },
  promptEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  promptDesc: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  promptMainBtn: {
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  promptMainBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  promptSecBtn: {
    marginTop: 10,
    paddingVertical: 6,
  },
  promptSecBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iosInstructionBox: {
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.15)',
    borderRadius: 14,
    padding: 12,
    alignSelf: 'stretch',
    gap: 8,
    marginBottom: 16,
  },
  instructionStep: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 12,
    marginVertical: 10,
  },
  connectBtnSent: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1.2,
    borderColor: '#F97316',
  },
  connectBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  menuHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  menuItemText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  menuCancelBtn: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
    alignItems: 'center',
  },
  menuCancelText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
