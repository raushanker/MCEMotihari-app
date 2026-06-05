import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore, sortPostsPriority } from '@/store/useAppStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { getCachedProfile, setCachedProfile } from '@/utils/profileCache';
import { getFormattedPostTime } from '@/utils/timeFormat';
import { canReportContent } from '@/utils/permissions';
import { useRouter } from 'expo-router';
import { VerifiedBadge } from '../ui/VerifiedBadge';

const { width, height } = Dimensions.get('window');

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userProfile: {
    id?: string;
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
    vibeStatus?: string;
    connectionsCount?: number;
  } | null;
}

interface ProfileDetails {
  vibe: string;
  skills: string[];
  links: { github?: string; linkedin?: string; instagram?: string };
  rollNo?: string;
  regNo?: string;
  stats: { posts: number; hearts: number; connections: number };
  experiences?: Array<{
    id: string;
    role: string;
    company: string;
    employmentType: 'Full-time' | 'Part-time' | 'Internship';
    startMonth: string;
    startYear: string;
    endMonth?: string;
    endYear?: string;
    isCurrent: boolean;
    description?: string;
  }>;
}

// Visual high-fidelity mock data mapping for known campus members
const MEMBER_PROFILES: Record<string, ProfileDetails> = {
  'Prof. Preeti Kumari': {
    vibe: 'Teaching Assistant & Grinding Algorithms 💻',
    skills: ['Algorithms', 'React Native', 'Data Science', 'Public Speaking', 'Mentoring'],
    links: { github: 'https://github.com/preetikumari', linkedin: 'https://linkedin.com/in/preetikumari' },
    rollNo: '23015',
    stats: { posts: 14, hearts: 245, connections: 42 },
    experiences: [
      {
        id: 'exp-preeti-1',
        role: 'Teaching Assistant',
        company: 'MCE Motihari',
        employmentType: 'Full-time',
        startMonth: 'Aug',
        startYear: '2023',
        isCurrent: true,
        description: 'Conducting tutorials, lab assessments, and workshops for B.Tech CSE students on Data Structures & Algorithms.'
      }
    ]
  },
  'CSE Technical Coordinator': {
    vibe: 'Organizing Hackathons & Coding quests 🏆',
    skills: ['Event Management', 'Web Dev', 'Java', 'Community Building'],
    links: { github: 'https://github.com/cse-coordinator', linkedin: 'https://linkedin.com/in/cse-coordinator' },
    rollNo: '21124',
    stats: { posts: 8, hearts: 156, connections: 68 },
  },
  'Amit Singh': {
    vibe: 'SDE @ Amazon | Always open to mentor juniors 💼',
    skills: ['System Design', 'Java', 'AWS', 'Scalability', 'Career Prep'],
    links: { github: 'https://github.com/amitsingh', linkedin: 'https://linkedin.com/in/amitsingh' },
    rollNo: '16045',
    stats: { posts: 24, hearts: 512, connections: 189 },
    experiences: [
      {
        id: 'exp-amit-1',
        role: 'Software Development Engineer',
        company: 'Amazon',
        employmentType: 'Full-time',
        startMonth: 'Jul',
        startYear: '2020',
        isCurrent: true,
        description: 'Optimizing high-throughput video indexing microservices for Prime Video using AWS serverless architectures.'
      },
      {
        id: 'exp-amit-2',
        role: 'Software Engineer Intern',
        company: 'Amazon',
        employmentType: 'Internship',
        startMonth: 'Jan',
        startYear: '2020',
        endMonth: 'Jun',
        endYear: '2020',
        isCurrent: false,
        description: 'Built a real-time server health and memory-leak profiling dashboard with React and AWS Lambdas.'
      }
    ]
  },
  'Nisha Kumari': {
    vibe: 'Power Grid Engineer | Let\'s talk energy ⚡',
    skills: ['Power Systems', 'Renewable Energy', 'MATLAB', 'Aptitude Prep'],
    links: { linkedin: 'https://linkedin.com/in/nishakumari', instagram: 'https://instagram.com/nisha' },
    rollNo: '18021',
    stats: { posts: 5, hearts: 43, connections: 34 },
  },
  'Pankaj Kumar': {
    vibe: 'Structural Engineer | Designing stable builds 🏗️',
    skills: ['AutoCAD', 'Structural Design', 'Concrete Tech', 'Project Planning'],
    links: { linkedin: 'https://linkedin.com/in/pankajkumar' },
    rollNo: '14012',
    stats: { posts: 3, hearts: 18, connections: 12 },
  },
  'Abhishek Kumar': {
    vibe: 'React Native Fanatic | Building MCE Connect 🚀',
    skills: ['TypeScript', 'React Native', 'UI Design', 'NodeJS', 'Figma'],
    links: { github: 'https://github.com/abhishekkumar', linkedin: 'https://linkedin.com/in/abhishekkumar' },
    rollNo: '23102',
    stats: { posts: 7, hearts: 89, connections: 51 },
    experiences: [
      {
        id: 'exp-abhi-1',
        role: 'Mobile Developer Intern',
        company: 'MCE Tech Cell',
        employmentType: 'Internship',
        startMonth: 'Apr',
        startYear: '2024',
        isCurrent: true,
        description: 'Spearheading the engineering of the official MCE Connect mobile application with clean Expo, Zustand state persistence, and beautiful bento-grid styling.'
      }
    ]
  },
  'Shweta Raj': {
    vibe: 'Automotive Designer | Revving up engines 🚗',
    skills: ['SolidWorks', 'Thermodynamics', 'Product Design', 'Debating'],
    links: { instagram: 'https://instagram.com/shweta', linkedin: 'https://linkedin.com/in/shweta' },
    rollNo: '24089',
    stats: { posts: 4, hearts: 32, connections: 25 },
  },
};

export function UserProfileModal({ visible, onClose, userProfile }: UserProfileModalProps) {
  const theme = useThemeColors();
  const router = useRouter();
  const { connections, toggleConnection, posts, user, blockedUserUids, blockUser, unblockUser } = useAppStore();
  const { notifications } = useNotificationStore();

  const [loadedProfile, setLoadedProfile] = React.useState<any>(null);

  React.useEffect(() => {
    if (!visible || !userProfile || !userProfile.id) {
      setLoadedProfile(userProfile);
      return;
    }
    
    let active = true;
    setLoadedProfile(userProfile);
    
    const fetchFullProfile = async () => {
      const uid = userProfile.id;
      if (!uid) return;
      
      try {
        const cached = await getCachedProfile(uid);
        if (cached && active) {
          setLoadedProfile(cached);
          console.log('[Cache Hit] Loaded profile from local storage in UserProfileModal:', uid);
        }
      } catch (err) {
        console.warn('Cache lookup failed:', err);
      }
      
      try {
        const { doc, getDoc } = require('firebase/firestore');
        const { db } = require('../../config/firebase');
        
        const publicDoc = await getDoc(doc(db, 'publicProfiles', uid));
        if (publicDoc.exists() && active) {
          const freshData = { id: uid, ...userProfile, ...publicDoc.data() };
          setLoadedProfile(freshData);
          await setCachedProfile(uid, freshData);
          console.log('[Cache Write] Loaded fresh profile from Firestore in UserProfileModal:', uid);
        }
      } catch (err) {
        console.warn('Firestore fetch failed:', err);
      }
    };
    
    fetchFullProfile();
    
    return () => {
      active = false;
    };
  }, [visible, userProfile]);

  const handleOpenExternalLinkWithConfirmation = (url?: string) => {
    if (!url) return;
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    
    if (Platform.OS === 'web') {
      const confirm = window.confirm(`Open external website?\n\nDo you want to visit:\n${formattedUrl}?`);
      if (confirm) {
        Linking.openURL(formattedUrl);
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
  const isOwnProfile = userProfile && user && (userProfile.name === user.name || userProfile.name === user.email);

  const [contributionsCount, setContributionsCount] = React.useState(0);

  React.useEffect(() => {
    const loadContributions = async () => {
      if (!userProfile) return;
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        
        // 1. Notes contribution count
        const storedNotes = await AsyncStorage.getItem('@mce_study_materials');
        let notesCount = 0;
        if (storedNotes) {
          const list = JSON.parse(storedNotes);
          if (Array.isArray(list)) {
            notesCount = list.filter(item => 
              (item.uploaderName && item.uploaderName.toLowerCase() === userProfile.name.toLowerCase())
            ).length;
          }
        }

        // 2. Events contribution count
        const storedEvents = await AsyncStorage.getItem('@mce_campus_events');
        let eventsCount = 0;
        if (storedEvents) {
          const list = JSON.parse(storedEvents);
          if (Array.isArray(list)) {
            eventsCount = list.filter(item => 
              (item.authorName && item.authorName.toLowerCase() === userProfile.name.toLowerCase())
            ).length;
          }
        }

        setContributionsCount(notesCount + eventsCount);
      } catch (err) {
        console.warn('Failed to load contributions count:', err);
      }
    };

    if (visible && userProfile) {
      loadContributions();
    }
  }, [visible, userProfile]);

  const p = loadedProfile || userProfile;

  const peerPosts = React.useMemo(() => {
    if (!p) return [];
    return posts.filter((post: any) => {
      const matchesUid = post.authorUid && p.id && post.authorUid === p.id;
      const matchesRealName = post.authorRealName && p.name && post.authorRealName === p.name;
      const matchesAuthorName = post.authorName && p.name && post.authorName === p.name;
      const isAuthor = !!(matchesUid || matchesRealName || matchesAuthorName);

      if (post.isAnonymous) {
        // Anonymous posts should ONLY be visible to their owner
        return !!(isOwnProfile && isAuthor);
      }
      return isAuthor;
    });
  }, [posts, p, isOwnProfile]);

  if (!userProfile) return null;

  const realConnectionsCount = isOwnProfile 
    ? connections.filter(c => c.status === 'Connected').length 
    : (p.connectionsCount || 0);

  // Find actual connection status
  const connectionObj = connections.find(c => c.name === p.name);
  const status = connectionObj ? connectionObj.status : 'Connect';

  // Find pending received connection request notification from this user
  const pendingNotif = (status === 'Connect' && notifications)
    ? notifications.find(
        n => n.type === 'connection_request' && n.status !== 'accepted' && (n.senderUid === p.id || n.senderName === p.name)
      )
    : null;

  // Resolve matching profile details or generate smart default fallback
  const details = MEMBER_PROFILES[p.name] || {
    vibe: p.vibeStatus || `${p.role} representing the ${p.department || 'MCE'} branch ✨`,
    skills: p.skills || ['Engineering', 'Networking', 'Academics', 'Self Prep'],
    links: p.links || { linkedin: 'https://linkedin.com' },
    rollNo: p.rollNo || 'N/A',
    stats: {
      posts: posts.filter(post => !post.isAnonymous && post.authorName === p.name).length || 0,
      hearts: posts.filter(post => !post.isAnonymous && post.authorName === p.name).reduce((sum, post) => sum + post.claps, 0) || 0,
      connections: Math.floor(Math.random() * 20) + 5,
    },
  };

  const rollNoVal = p.rollNo || (details.rollNo !== 'N/A' ? details.rollNo : undefined);
  const regNoVal = p.regNo || details.regNo;
  const peerExperiences = p.experiences || details.experiences || [];
  const skillsVal = p.skills || details.skills || [];

  const getRoleColor = (role: string) => {
    if (role === 'Student') return '#A855F7'; // Purple
    if (role === 'Alumni') return '#3B82F6'; // Blue
    return '#F97316'; // Orange / Staff
  };

  const getStatusColor = (currentStatus: string) => {
    if (currentStatus === 'Connected') return '#22C55E';
    if (currentStatus === 'Sent') return '#F97316';
    return '#FFFFFF';
  };

  const handleAcceptRequest = async (notifItem: any) => {
    if (!user) return;
    try {
      const { runTransaction, doc } = require('firebase/firestore');
      const { db } = require('../../config/firebase');

      const senderUid = notifItem.senderUid;
      if (!senderUid) {
        throw new Error("Sender UID not found in notification.");
      }

      const requestId = notifItem.id;
      // Deterministic notification ID for connection acceptance
      const acceptanceNotifId = `connection_accepted_${user.uid}_${senderUid}_${requestId}`;
      const sortedUserIds = [user.uid, senderUid].sort().join('_');

      console.log('[Accept Transaction Init]', {
        requestId,
        senderId: senderUid,
        receiverId: user.uid,
        notificationId: acceptanceNotifId,
        sortedUserIds
      });

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
          console.log(`[Idempotency Check] Request ${requestId} already accepted.`);
          return; // Abort cleanly, already accepted
        }

        // 2. Prevent duplicate connection records by checking recipientConnRef
        const recipientConnDoc = await transaction.get(recipientConnRef);
        if (recipientConnDoc.exists() && recipientConnDoc.data().status === 'Connected') {
          console.log(`[Idempotency Check] Connection with ${senderUid} already exists.`);
          return; // Abort cleanly, already connected
        }

        // 3. Atomically perform all writes
        // 3.1 Update B's connection request notification status to 'accepted' and mark as read
        transaction.update(notifDocRef, {
          status: 'accepted',
          read: true,
          body: `You accepted ${notifItem.senderName}'s connection request.`
        });

        // 3.2 Write mutually linked connection doc under A's profile (sender)
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

        // 3.3 Write mutually linked connection doc under B's profile (recipient)
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

        // 3.4 Send a reciprocal connection_accepted notification to A (sender) with deterministic ID
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

      console.log('[Accept Transaction Committed Successfully]', {
        requestId,
        senderId: senderUid,
        receiverId: user.uid,
        notificationId: acceptanceNotifId
      });

      // 4. Update the local Zustand & AsyncStorage connections list
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
      const updatedConnections = [...storeState.connections.filter(c => c.id !== senderUid), localConn];
      useAppStore.setState({ connections: updatedConnections });
      
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('@mce_connections', JSON.stringify(updatedConnections));

      // 5. Trigger priority re-sorting of feed posts
      const sortedPosts = sortPostsPriority(storeState.posts, updatedConnections);
      useAppStore.setState({ posts: sortedPosts });
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(sortedPosts));

      if (Platform.OS === 'web') {
        alert(`Connected! You are now connected with ${notifItem.senderName}.`);
      } else {
        Alert.alert('Connected 🤝', `You are now connected with ${notifItem.senderName}!`);
      }
    } catch (err) {
      console.error('Failed to accept request in profile modal transaction:', err);
      Alert.alert('Acceptance Failed', 'Unable to complete connection.');
    }
  };

  const handleRemoveConnection = async () => {
    if (!user || !p.id) return;
    
    const confirmMsg = `Remove "${p.name}" from your connections grid? You will no longer see their updates prioritized in your feed.`;
    
    const executeDisconnect = async () => {
      try {
        const { doc, deleteDoc } = require('firebase/firestore');
        const { db } = require('../../config/firebase');
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;

        // 1. Remove locally
        const storeState = useAppStore.getState();
        const updated = storeState.connections.filter(c => c.id !== p.id);
        
        // 2. Re-sort posts
        const sortedPosts = sortPostsPriority(storeState.posts, updated);
        
        useAppStore.setState({ connections: updated, posts: sortedPosts });
        await AsyncStorage.setItem('@mce_connections', JSON.stringify(updated));
        await AsyncStorage.setItem('@mce_posts', JSON.stringify(sortedPosts));

        // 3. Delete from Firestore connections list for both users
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'connections', p.id));
          await deleteDoc(doc(db, 'users', p.id, 'connections', user.uid));
        } catch (e) {
          console.warn('Firestore connection removal error (non-fatal):', e);
        }

        if (Platform.OS === 'web') {
          alert(`Disconnected! You removed ${p.name} from your connections.`);
        } else {
          Alert.alert('Disconnected 🤝', `You removed ${p.name} from your connections grid.`);
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

  const handleShare = async () => {
    try {
      const profileUrl = `https://mcemotihari-app.web.app/@${p.username || 'username'}`;
      
      const rolePrefix = p.role === 'Student' ? 'B.Tech Student' : p.role === 'Alumni' ? 'MCE Alumni' : p.role === 'Faculty' ? 'MCE Faculty' : 'MCE Member';
      const departmentLabel = p.department ? ` | ${p.department}` : '';

      let shareMessage = `Hey MCEians! 👋\n`;
      shareMessage += `Let's sync up on MCE Connect—our community space developed by Alumni & Students for college notices, alumni connections, and study resources.\n\n`;
      shareMessage += `${p.name.toUpperCase()}\n`;
      shareMessage += `${rolePrefix}${departmentLabel}\n\n`;
      shareMessage += `Check out my profile card:\n`;
      shareMessage += `🔗 ${profileUrl}\n\n`;
      shareMessage += `📲 Build your verified profile card today!`;

      await Share.share({
        title: `${userProfile.name}'s Profile`,
        message: shareMessage,
      });
    } catch (error) {
      console.warn('Share error:', error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(15,23,42,0.45)' }]}>
        <View style={[styles.sheet, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          {/* Header Bar */}
          <View style={[styles.headerRow, { borderBottomColor: theme.cardBorder }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Member Profile</Text>
            <View style={styles.headerActions}>
              {!isOwnProfile && (
                <>
                  {/* Block / Unblock Button */}
                  <TouchableOpacity 
                    style={[styles.actionIconBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} 
                    onPress={() => {
                      const isBlocked = blockedUserUids?.includes(p.id || '');
                      if (isBlocked) {
                        if (Platform.OS === 'web') {
                          const confirmed = window.confirm(`Kya aap "${p.name}" ko unblock karna chahte hain?`);
                          if (confirmed) unblockUser(p.id || '');
                        } else {
                          Alert.alert(
                            'Unblock User',
                            `Kya aap "${p.name}" ko unblock karna chahte hain?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Unblock', 
                                onPress: async () => {
                                  await unblockUser(p.id || '');
                                } 
                              }
                            ]
                          );
                        }
                      } else {
                        if (Platform.OS === 'web') {
                          const confirmed = window.confirm(`Kya aap "${p.name}" ko block karna chahte hain? Block karne par unka koi bhi post aapke feed me nahi dikhega.`);
                          if (confirmed) blockUser(p.id || '');
                        } else {
                          Alert.alert(
                            'Block User 🚫',
                            `Kya aap "${p.name}" ko block karna chahte hain? Block karne par unka koi bhi post aapke feed me nahi dikhega.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Block', 
                                style: 'destructive',
                                onPress: async () => {
                                  await blockUser(p.id || '');
                                } 
                              }
                            ]
                          );
                        }
                      }
                    }}
                  >
                    <Ionicons 
                      name={blockedUserUids?.includes(p.id || '') ? "ban" : "ban-outline"} 
                      size={18} 
                      color="#EF4444" 
                    />
                  </TouchableOpacity>

                  {(() => {
                    const isOwnProfileResolved = isOwnProfile || (p && user && (p.id === user.uid || p.name === user.name));
                    return !isOwnProfileResolved && canReportContent(user?.uid, p.id, user?.name, p.name);
                  })() && (
                    <TouchableOpacity 
                      style={[styles.actionIconBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} 
                      onPress={() => {
                        if (Platform.OS === 'web') {
                          const confirmed = window.confirm(`Are you sure you want to report "${p.name}" for community guideline violations? Our safety team will review this profile within 24 hours.`);
                          if (confirmed) alert('Thank you. This profile has been successfully reported for safety review.');
                        } else {
                          Alert.alert(
                            'Report Profile',
                            `Are you sure you want to report "${p.name}" for community guideline violations? Our safety team will review this profile within 24 hours.`,
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
                      }}
                    >
                      <Ionicons name="flag-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                  {status === 'Connected' && (
                    <TouchableOpacity 
                      style={[styles.actionIconBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} 
                      onPress={() => {
                        if (Platform.OS === 'web') {
                          const confirmed = window.confirm(`Kya aap "${p.name}" ke sath connection remove karna chahte hain?`);
                          if (confirmed) handleRemoveConnection();
                        } else {
                          Alert.alert(
                            'Remove Connection 🤝',
                            `Kya aap "${p.name}" ke sath connection remove karna chahte hain?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Remove', 
                                style: 'destructive',
                                onPress: async () => {
                                  await handleRemoveConnection();
                                } 
                              }
                            ]
                          );
                        }
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </>
              )}
              <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} onPress={handleShare}>
                <Ionicons name="share-outline" size={18} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} onPress={onClose}>
                <Ionicons name="close" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Visual Cover Section */}
            <View style={[styles.coverSection, { backgroundColor: '#001b59' }]}>
              <View style={styles.coverImageMask}>
                <Image 
                  source={require('../../../assets/images/NAB.png')} 
                  style={styles.coverImage} 
                  resizeMode="contain" 
                />
              </View>
              <View style={styles.coverOverlay} />
            </View>

            {/* Avatar Section - Centered layout completely below cover to guarantee WCAG contrast */}
            <View style={{ alignItems: 'center', marginTop: -20, marginBottom: 16 }}>
              <View style={[styles.avatarRing, { borderColor: getRoleColor(p.role) }]}>
                <Image
                  source={{ uri: p.photoUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix' }}
                  style={styles.avatarImage}
                />
              </View>
              <View style={{ alignItems: 'center', marginTop: 10, paddingHorizontal: 20 }}>
                <Text style={[styles.profileName, { color: theme.text, textAlign: 'center' }]}>{p.name}</Text>
                <View style={{ marginTop: 8, alignItems: 'center', justifyContent: 'center' }}>
                  <VerifiedBadge role={p.role} size="medium" />
                </View>
                
                {/* Subtle LinkedIn-style achievement badges */}


                {/* Compact Social & Web Links Row */}
                {(() => {
                  const links = p.links || details.links || {};
                  const customLinks = p.customLinks || [];
                  const activeLinksList = [];

                  if (links.portfolio && links.portfolio.trim()) activeLinksList.push({ key: 'portfolio', value: links.portfolio });
                  if (links.website && links.website.trim()) activeLinksList.push({ key: 'website', value: links.website });
                  if (links.linkedin && links.linkedin.trim()) activeLinksList.push({ key: 'linkedin', value: links.linkedin });
                  if (links.github && links.github.trim()) activeLinksList.push({ key: 'github', value: links.github });
                  if (links.instagram && links.instagram.trim()) activeLinksList.push({ key: 'instagram', value: links.instagram });
                  if (links.googlescholar && links.googlescholar.trim()) activeLinksList.push({ key: 'googlescholar', value: links.googlescholar });
                  if (links.youtube && links.youtube.trim()) activeLinksList.push({ key: 'youtube', value: links.youtube });
                  if (links.facebook && links.facebook.trim()) activeLinksList.push({ key: 'facebook', value: links.facebook });
                  if (links.twitter && links.twitter.trim()) activeLinksList.push({ key: 'twitter', value: links.twitter });

                  customLinks.forEach((link: { title: string, url: string }) => {
                    if (link.title && link.title.trim() && link.url && link.url.trim()) {
                      activeLinksList.push({ key: `custom_${link.title}_${link.url}`, value: link.url });
                    }
                  });

                  if (activeLinksList.length === 0) return null;

                  return (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12, paddingHorizontal: 16 }}>
                      {activeLinksList.map((item) => {
                        let iconName: any = 'globe-outline';
                        let brandColor = '#06B6D4';
                        
                        if (item.key === 'linkedin' || item.key.includes('linkedin')) { iconName = 'logo-linkedin'; brandColor = '#0A66C2'; }
                        else if (item.key === 'instagram' || item.key.includes('instagram')) { iconName = 'logo-instagram'; brandColor = '#E1306C'; }
                        else if (item.key === 'facebook' || item.key.includes('facebook')) { iconName = 'logo-facebook'; brandColor = '#1877F2'; }
                        else if (item.key === 'twitter' || item.key.includes('twitter')) { iconName = 'logo-twitter'; brandColor = theme.isDark ? '#FFFFFF' : '#000000'; }
                        else if (item.key === 'github' || item.key.includes('github')) { iconName = 'logo-github'; brandColor = theme.isDark ? '#FFFFFF' : '#24292E'; }
                        else if (item.key === 'youtube' || item.key.includes('youtube')) { iconName = 'logo-youtube'; brandColor = '#FF0000'; }
                        else if (item.key === 'googlescholar' || item.key.includes('scholar')) { iconName = 'school-outline'; brandColor = '#4285F4'; }
                        else if (item.key === 'portfolio') { iconName = 'briefcase-outline'; brandColor = '#0D9488'; }
                        else if (item.key === 'website') { iconName = 'globe-outline'; brandColor = '#0F766E'; }

                        return (
                          <TouchableOpacity
                            key={item.key}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 18,
                              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                              borderWidth: 1,
                              borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            onPress={() => handleOpenExternalLinkWithConfirmation(item.value)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name={iconName} size={18} color={brandColor} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })()}
              </View>
            </View>

            {/* Vibe Status capsule (Bento Card Highlight) */}
            {userProfile.vibeStatus ? (
              <View style={[styles.vibeCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                <Text style={[styles.vibeText, { color: theme.text }]}>
                  "{userProfile.vibeStatus}"
                </Text>
              </View>
            ) : null}

            {/* Bento Grid Layout */}
            <View style={styles.bentoGrid}>
              {/* Card 1: Academic Standings */}
              {['Student', 'Alumni', 'Faculty'].includes(userProfile.role) && (
                <View style={[styles.bentoCard, { width: '100%', backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="school" size={16} color={getRoleColor(userProfile.role)} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Campus Credentials</Text>
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={11} color="#22C55E" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  </View>
                  
                  <View style={styles.credentialsGrid}>
                    <View style={styles.credentialItem}>
                      <Text style={styles.credentialLabel}>Branch / Major</Text>
                      <Text style={[styles.credentialVal, { color: theme.text }]}>{(userProfile.department && userProfile.department !== 'MCE') ? userProfile.department : 'N/A'}</Text>
                    </View>

                  <View style={styles.credentialRow}>
                    <View style={styles.credentialHalf}>
                      <Text style={styles.credentialLabel}>Academic Batch</Text>
                      <Text style={[styles.credentialVal, { color: theme.text }]}>{userProfile.batch || 'N/A'}</Text>
                    </View>
                    <View style={styles.credentialHalf}>
                      <Text style={styles.credentialLabel}>Roll Number</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={[
                          styles.credentialVal, 
                          { color: theme.text }
                        ]}>
                          {rollNoVal ? (isOwnProfile ? rollNoVal : '••••••••••') : 'N/A'}
                        </Text>
                        {rollNoVal ? (
                          <View style={[styles.privateBadge, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2' }]}>
                            <Ionicons name={isOwnProfile ? "eye" : "eye-off"} size={10} color="#EF4444" />
                            <Text style={[styles.privateBadgeText, { color: '#EF4444' }]}>{isOwnProfile ? '🔒 Owner Only' : '🔒 Masked'}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  
                  {regNoVal ? (
                    <View style={styles.credentialItem}>
                      <Text style={styles.credentialLabel}>Registration Number</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={[
                          styles.credentialVal, 
                          { color: theme.text }
                        ]}>
                          {isOwnProfile ? regNoVal : '••••••••••'}
                        </Text>
                        <View style={[styles.privateBadge, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2' }]}>
                          <Ionicons name={isOwnProfile ? "eye" : "eye-off"} size={10} color="#EF4444" />
                          <Text style={[styles.privateBadgeText, { color: '#EF4444' }]}>{isOwnProfile ? '🔒 Owner Only' : '🔒 Masked'}</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
              )}

              {/* Card 2: Interactive Skills Tag Cloud */}
              {skillsVal && skillsVal.length > 0 ? (
                <View style={[styles.bentoCard, { width: '100%', backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="sparkles" size={16} color="#A855F7" />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Tech Skills & Core Competencies</Text>
                  </View>
                  <View style={styles.tagGrid}>
                    {skillsVal.map((skill: string, index: number) => (
                      <View key={index} style={[styles.skillTag, { backgroundColor: theme.isDark ? 'rgba(168, 85, 247, 0.08)' : '#F3E8FF', borderColor: theme.isDark ? 'rgba(168, 85, 247, 0.2)' : '#E9D5FF' }]}>
                        <Text style={[styles.skillTagText, { color: '#9333EA' }]}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}



              {/* Activity Section */}
              {peerPosts.length > 0 && (
                <View style={[styles.bentoCard, { width: '100%', backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="newspaper-outline" size={16} color="#10B981" />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Activity</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    decelerationRate="fast"
                    contentContainerStyle={{ gap: 12, paddingBottom: 8, paddingHorizontal: 2 }}
                  >
                    {peerPosts.slice(0, 10).map((post: any) => {
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
                            onClose();
                            router.push(`/post/${post.id}`);
                          }}
                          style={{
                            width: width - 80,
                            backgroundColor: theme.backgroundElement,
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
                </View>
              )}

              {/* Card 4: Stats & Impact Summary */}
              <View style={[styles.bentoCard, { width: '100%', backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="analytics" size={16} color="#EC4899" />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Impact Highlights</Text>
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statCell}>
                    <Text style={[styles.statNum, { color: theme.text }]}>{details.stats.hearts}</Text>
                    <Text style={styles.statLabel}>Hearts</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: theme.cardBorder }]} />
                  <View style={styles.statCell}>
                    <Text style={[styles.statNum, { color: theme.text }]}>{details.stats.posts}</Text>
                    <Text style={styles.statLabel}>Posts</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: theme.cardBorder }]} />
                  <View style={styles.statCell}>
                    <Text style={[styles.statNum, { color: theme.text }]}>{contributionsCount}</Text>
                    <Text style={styles.statLabel}>Contributions</Text>
                  </View>
                </View>
              </View>
              {/* Card 5: Professional Experience */}
              {peerExperiences && peerExperiences.length > 0 && (
                <View style={[styles.bentoCard, { width: '100%', backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="briefcase" size={16} color="#3B82F6" />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Experiences</Text>
                  </View>
                  <View style={styles.experienceList}>
                    {peerExperiences.map((exp: any, index: number) => (
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
              )}
            </View>

            {/* Connect Action Trigger */}
            {!isOwnProfile && (status !== 'Connected' || pendingNotif) && (
              <TouchableOpacity
                style={[
                  styles.connectBtn,
                  pendingNotif && { backgroundColor: '#22C55E' },
                  status === 'Connected' && { backgroundColor: theme.isDark ? '#451A03' : '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1 },
                  status === 'Sent' && styles.connectBtnSent,
                  (status === 'Connect' && !pendingNotif) && { backgroundColor: theme.isDark ? '#1E293B' : '#0F172A' }
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
                      if (p.id) {
                        try {
                          const { doc, deleteDoc } = require('firebase/firestore');
                          const { db } = require('../../config/firebase');
                          await deleteDoc(doc(db, 'users', user.uid, 'connections', p.id));
                          await deleteDoc(doc(db, 'users', p.id, 'connections', user.uid));
                        } catch (e) {}
                      }
                    }
                  } else {
                    // Send connection request
                    if (!p.id) {
                      Alert.alert('Connection Failed', 'Profile ID not found. Unable to connect.');
                      return;
                    }
                    try {
                      const { doc, setDoc } = require('firebase/firestore');
                      const { db } = require('../../config/firebase');

                      const requestId = `connection_request_${user.uid}_${p.id}`;

                      // 1. Write the connection request notification to the recipient user's subcollection
                      const notifDocRef = doc(db, 'users', p.id, 'notifications', requestId);
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
                      const selfConnRef = doc(db, 'users', user.uid, 'connections', p.id);
                      await setDoc(selfConnRef, {
                        id: p.id,
                        name: p.name,
                        role: p.role || 'Student',
                        branch: p.department || 'MCE',
                        batch: p.batch || 'N/A',
                        image: p.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}`,
                        status: 'Sent',
                        connectedAt: new Date().toISOString()
                      });

                      // 2. Add connection locally in store as "Sent"
                      const newConn = {
                        id: p.id,
                        name: p.name,
                        role: (p.role === 'Guest' ? 'Student' : (p.role === 'Other' ? 'Faculty' : p.role)) as any,
                        branch: p.department || 'MCE',
                        batch: p.batch || 'N/A',
                        image: p.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}`,
                        status: 'Sent' as const,
                      };
                      const storeState = useAppStore.getState();
                      const updated = [...storeState.connections.filter(c => c.id !== p.id), newConn];
                      useAppStore.setState({ connections: updated });
                      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                      await AsyncStorage.setItem('@mce_connections', JSON.stringify(updated));

                      if (Platform.OS === 'web') {
                        alert('Request Sent! Connection request sent successfully to ' + p.name);
                      } else {
                        Alert.alert('Request Sent 🤝', 'Connection request sent successfully to ' + p.name);
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
                    : `Connect with ${p.name.split(' ')[0]}`}
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    height: height * 0.85,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    boxShadow: Platform.OS === 'web' ? `${0}px ${-4}px ${12}px #000` : undefined,

    elevation: 20,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollBody: {
    paddingBottom: 40,
  },
  coverSection: {
    height: 160,
    backgroundColor: '#001b59',
    position: 'relative',
    overflow: 'hidden',
  },
  coverImageMask: {
    width: '100%',
    height: 80,
    overflow: 'hidden',
    marginTop: 20,
  },
  coverImage: {
    width: '100%',
    height: 120,
    alignSelf: 'center',
  },
  coverBlob1: {
    position: 'absolute',
    top: -30,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
  },
  coverBlob2: {
    position: 'absolute',
    bottom: -45,
    right: -10,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginTop: -40,
    marginBottom: 16,
  },
  avatarRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2.5,
    padding: 2,
    backgroundColor: '#FFFFFF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  profileMainMeta: {
    marginLeft: 14,
    marginBottom: 4,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  profileRoleLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  vibeCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  vibeText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bentoGrid: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
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
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  verifiedBadge: {
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
  verifiedText: {
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  connectBtn: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  connectBtnSent: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  connectBtnConnected: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
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
    color: '#10B981',
  },
  experienceList: {
    gap: 12,
    marginTop: 10,
  },
  experienceItem: {
    flexDirection: 'row',
    gap: 12,
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  experienceIconFrame: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  experienceDetails: {
    flex: 1,
    gap: 2,
  },
  experienceRole: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  experienceCompany: {
    fontSize: 11,
    fontWeight: '600',
  },
  experienceTypeTag: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  experienceDates: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  experienceDesc: {
    fontSize: 11.5,
    marginTop: 4,
    lineHeight: 16,
  },
});
