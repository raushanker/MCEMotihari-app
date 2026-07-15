import { db, functions } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/utils/auditLogger';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { QueryDocumentSnapshot, addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, LayoutAnimation, Platform, ScrollView, StyleSheet, Text,  TouchableOpacity, View, useWindowDimensions, Modal } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { httpsCallable } from 'firebase/functions';

import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { sendPushNotifications } from '@/utils/notifications';

const PAGE_SIZE = 10;

type UserRole = 'Student' | 'Alumni' | 'Faculty' | 'Guest';
type UserStatus = 'active' | 'suspended' | 'banned';

interface UserDoc {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  profilePic?: string;
  department?: string;
  batch?: string;
  status?: UserStatus;
  isHidden?: boolean;
  createdAt?: any;
  phone?: string;
  rollNo?: string;
  regNo?: string;
}

export default function UsersScreen() {
  const { user: currentUser } = useAuth();
  const showToast = useAppStore(state => state.showToast);
  const router = useRouter();
  const theme = useThemeColors();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'All'>('All');

  const cachedPublicProfiles = useRef<any[] | null>(null);
  const cachedPrivateUsers = useRef<Record<string, any> | null>(null);

  const [expandedUserIds, setExpandedUserIds] = useState<Record<string, boolean>>({});

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [targetUserIdForPassword, setTargetUserIdForPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const handleSetPasswordPress = (userId: string) => {
    setTargetUserIdForPassword(userId);
    setNewPassword('');
    setPasswordModalVisible(true);
  };

  const handleAdminChangePassword = async () => {
    if (!targetUserIdForPassword) return;
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    setIsSettingPassword(true);
    try {
      const adminChangePasswordFunc = httpsCallable(functions, 'adminChangePassword');
      const result = await adminChangePasswordFunc({
        targetUid: targetUserIdForPassword,
        newPassword: newPassword,
      });

      if ((result.data as any).success) {
        logAdminAction({
          adminUid: currentUser?.uid || 'unknown',
          adminName: currentUser?.displayName || 'Unknown Admin',
          adminEmail: currentUser?.email || 'unknown',
          action: 'CHANGE_PASSWORD',
          targetId: targetUserIdForPassword,
          targetType: 'USER',
          details: `Changed password for user: ${targetUserIdForPassword}`
        });
        showToast('Password updated successfully.', 'success');
        setPasswordModalVisible(false);
      } else {
        throw new Error((result.data as any).message || 'Failed to update password');
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      showToast(error.message || 'Error changing password', 'error');
    } finally {
      setIsSettingPassword(false);
    }
  };

  const toggleExpand = (userId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedUserIds(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(inputText);
    }, 300);
    return () => clearTimeout(handler);
  }, [inputText]);

  useEffect(() => {
    fetchUsers(true);
  }, [searchQuery, filterRole]);

  const fetchUsers = async (isRefresh = false, queryOverride?: string) => {
    const currentLastDoc = isRefresh ? null : lastDoc;

    if (isRefresh) {
      if (users.length === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setHasMore(true);
      setLastDoc(null);
    } else {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }

    try {
      const cleanQuery = (queryOverride !== undefined ? queryOverride : searchQuery).trim();
      let matchedUsers: UserDoc[] = [];
      let lastDocSnapshot: QueryDocumentSnapshot | null = null;

      if (cleanQuery !== '') {
        // Hybrid Search Engine (capped at 500 for cost optimization)
        if (!cachedPublicProfiles.current) {
          const pubSnap = await getDocs(query(collection(db, 'publicProfiles'), limit(500)));
          cachedPublicProfiles.current = pubSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        
        if (!cachedPrivateUsers.current) {
          const privSnap = await getDocs(query(collection(db, 'privateUsers'), limit(500)));
          const privMap: Record<string, any> = {};
          privSnap.docs.forEach(d => { privMap[d.id] = d.data(); });
          cachedPrivateUsers.current = privMap;
        }

        const matched = cachedPublicProfiles.current.filter(pubData => {
          const pData = cachedPrivateUsers.current![pubData.id] || {};
          
          const searchableText = [
            pubData.name,
            pubData.username,
            pubData.department,
            pubData.batch,
            pData.email,
            pData.phone,
            pData.rollNo,
            pData.regNo
          ].filter(Boolean).join(' ').toLowerCase();

          return searchableText.includes(cleanQuery);
        });

        // Apply Role Filter
        const finalMatched = filterRole === 'All' ? matched : matched.filter(u => u.role === filterRole);

        matchedUsers = finalMatched.map(pubData => {
          const pData = cachedPrivateUsers.current![pubData.id] || {};
          return {
            id: pubData.id,
            name: pubData.name || 'Campus Member',
            email: pData.email || '',
            username: pubData.username || '',
            role: pubData.role || 'Student',
            profilePic: pubData.photoUrl || pubData.profilePic || '',
            department: pubData.department || '',
            batch: pubData.batch || '',
            status: pubData.status || 'active',
            isHidden: pubData.isHidden || false,
            createdAt: pubData.createdAt,
            phone: pData.phone || '',
            rollNo: pData.rollNo || '',
            regNo: pData.regNo || ''
          } as UserDoc;
        });
        
        lastDocSnapshot = null;
        setHasMore(false); // Pagination disabled during search

      } else {
        // 5. Regular (No Search) Query
        let qPub = collection(db, 'publicProfiles');
        let constraints: any[] = [];
        if (filterRole !== 'All') {
          constraints.push(where('role', '==', filterRole));
          constraints.push(orderBy('createdAt', 'desc'));
        } else {
          constraints.push(orderBy('createdAt', 'desc'));
        }
        constraints.push(limit(PAGE_SIZE));
        if (currentLastDoc) {
          constraints.push(startAfter(currentLastDoc));
        }

        const finalQuery = query(qPub, ...constraints);
        const snapshot = await getDocs(finalQuery);
        lastDocSnapshot = snapshot.docs[snapshot.docs.length - 1] || null;

        const promises = snapshot.docs.map(async (docSnap) => {
          const pubData = docSnap.data();
          let email = 'No email';
          let phone = '';
          let rollNo = '';
          let regNo = '';
          try {
            const privateSnap = await getDoc(doc(db, 'privateUsers', docSnap.id));
            if (privateSnap.exists()) {
              const pData = privateSnap.data();
              if (pData.email) email = pData.email;
              if (pData.phone) phone = pData.phone;
              if (pData.rollNo) rollNo = pData.rollNo;
              if (pData.regNo) regNo = pData.regNo;
            }
          } catch (e) {
            console.warn('Error reading private data:', docSnap.id, e);
          }
          return {
            id: docSnap.id,
            name: pubData.name || 'Campus Member',
            email,
            username: pubData.username || '',
            role: pubData.role || 'Student',
            profilePic: pubData.photoUrl || pubData.profilePic || '',
            department: pubData.department || '',
            batch: pubData.batch || '',
            status: pubData.status || 'active',
            isHidden: pubData.isHidden || false,
            createdAt: pubData.createdAt,
            phone,
            rollNo,
            regNo
          } as UserDoc;
        });
        matchedUsers = await Promise.all(promises);
      }

      // Apply client-side role filter fallback if searching and a specific role tag is selected
      if (cleanQuery !== '' && filterRole !== 'All') {
        matchedUsers = matchedUsers.filter(u => u.role === filterRole);
      }

      if (isRefresh) {
        setUsers(matchedUsers);
      } else {
        setUsers(prev => [...prev, ...matchedUsers]);
      }

      setLastDoc(lastDocSnapshot);
      setHasMore(matchedUsers.length >= PAGE_SIZE);

    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Failed to fetch users', 'error');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = () => {
    fetchUsers(true);
  };



  const handleUpdateStatus = (userId: string, newStatus: UserStatus, userName: string) => {
    let actionText = newStatus === 'suspended' ? 'suspend' : newStatus === 'banned' ? 'ban' : 'reactivate';
    if (Platform.OS === 'web') {
      const confirm = window.confirm(`Are you sure you want to ${actionText} ${userName}?`);
      if (confirm) updateUserStatus(userId, newStatus, userName);
    } else {
      Alert.alert(
        'Confirm Action',
        `Are you sure you want to ${actionText} ${userName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', style: 'destructive', onPress: () => updateUserStatus(userId, newStatus, userName) }
        ]
      );
    }
  };

  const handleToggleVisibility = (userId: string, currentIsHidden: boolean, userName: string) => {
    const actionText = currentIsHidden ? 'Unhide' : 'Hide';
    if (Platform.OS === 'web') {
      const confirm = window.confirm(`Are you sure you want to ${actionText} ${userName} from the network?`);
      if (confirm) updateVisibility(userId, !currentIsHidden);
    } else {
      Alert.alert(
        'Confirm Visibility',
        `Are you sure you want to ${actionText} ${userName} from the network?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', style: 'default', onPress: () => updateVisibility(userId, !currentIsHidden) }
        ]
      );
    }
  };

  const updateVisibility = async (userId: string, newIsHidden: boolean) => {
    try {
      await updateDoc(doc(db, 'publicProfiles', userId), { isHidden: newIsHidden });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isHidden: newIsHidden } : u));
      if (currentUser) {
        await logAdminAction({
          adminUid: currentUser.uid,
          adminName: currentUser.name || 'Admin',
          adminEmail: currentUser.email || '',
          action: `Set user visibility to ${newIsHidden ? 'hidden' : 'visible'}`,
          targetId: userId,
          targetType: 'User'
        });
      }
      showToast(`User is now ${newIsHidden ? 'hidden' : 'visible'} in network.`, 'success');
    } catch (error) {
      console.error('Error toggling visibility:', error);
      showToast('Error updating visibility', 'error');
    }
  };

  const updateUserStatus = async (userId: string, newStatus: UserStatus, userName: string) => {
    try {
      await updateDoc(doc(db, 'publicProfiles', userId), { status: newStatus });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      
      if (currentUser) {
        await logAdminAction({
          adminUid: currentUser.uid,
          adminName: currentUser.name || 'Admin',
          adminEmail: currentUser.email || '',
          action: `Set user status to ${newStatus}`,
          targetId: userId,
          targetType: 'User',
          details: `User Name: ${userName}`
        });
      }

      // Send status warning/update notification to user
      try {
        const notifRef = collection(db, 'users', userId, 'notifications');
        let title = '';
        let body = '';
        let type: 'system' | 'post_policy_violation' = 'system';
        
        if (newStatus === 'suspended') {
          title = '⚠️ Account Suspended';
          body = `Hello ${userName}, your account has been temporarily suspended by the MCE Connect Moderation Team for violating our Community Safety Guidelines and Terms of Service. If you believe this is a mistake, please reach out to Support.`;
        } else if (newStatus === 'banned') {
          title = '🚨 Account Permanently Banned';
          body = `Hello ${userName}, your account has been permanently banned from MCE Connect due to severe or repeated violations of our Community Safety Guidelines. Access to all features is revoked.`;
        } else if (newStatus === 'active') {
          title = '✅ Account Reactivated';
          body = `Hello ${userName}, your account has been successfully reactivated by the MCE Connect Moderation Team. You can now access all app features. Please adhere to the community policies going forward.`;
        }

        if (body !== '') {
          await addDoc(notifRef, {
            type,
            title,
            body,
            timestamp: new Date().toLocaleString(),
            read: false,
            category: 'Account Moderation',
            senderName: 'MCE Connect Moderation Team'
          });

          // Fetch target user's push token and send native push alert
          const profileSnap = await getDoc(doc(db, 'publicProfiles', userId));
          if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            if (profileData.pushToken) {
              await sendPushNotifications([profileData.pushToken], title, body, '/notifications');
            }
          }
        }
      } catch (err) {
        console.error('Failed to send status notification to user:', err);
      }
      
      showToast(`User status updated to ${newStatus}`, 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update user status', 'error');
    }
  };

  const getJoinedDate = (createdAt: any) => {
    if (!createdAt) return 'Legacy Member';
    try {
      if (typeof createdAt.toDate === 'function') return createdAt.toDate().toLocaleDateString('en-GB');
      if (createdAt.seconds) return new Date(createdAt.seconds * 1000).toLocaleDateString('en-GB');
      return new Date(createdAt).toLocaleDateString('en-GB');
    } catch {
      return 'Unknown';
    }
  };

  const renderItem = ({ item }: { item: UserDoc }) => {
    const isExpanded = !!expandedUserIds[item.id];
    const isSuspended = item.status === 'suspended';
    const isBanned = item.status === 'banned';

    return (
      <View style={[styles.userCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
        <View style={[styles.cardHeader, !isDesktop && styles.cardHeaderMobile]}>
          <View style={[styles.cardMainContent, !isDesktop && styles.cardMainContentMobile]}>
            <TouchableOpacity 
              style={{ flexDirection: 'row', flex: 1, alignItems: 'flex-start' }}
              activeOpacity={0.8}
              onPress={() => router.push(`/@${item.username || item.id}?fromAdmin=users` as any)}
            >
              <Image 
                source={{ uri: item.profilePic || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix' }} 
                style={styles.avatar} 
              />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
                  {item.username ? `@${item.username} • ` : ''}{item.email}
                </Text>
                <View style={styles.badges}>
                  <View style={[styles.badge, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={[styles.badgeText, { color: '#0284C7' }]}>{item.role}</Text>
                  </View>
                  {!!item.department && (
                    <View style={[styles.badge, { backgroundColor: theme.isDark ? '#334155' : '#F3F4F6' }]}>
                      <Text style={[styles.badgeText, { color: theme.textSecondary }]}>{item.department}</Text>
                    </View>
                  )}
                  {!!item.batch && (
                    <View style={[styles.badge, { backgroundColor: theme.isDark ? '#334155' : '#F3F4F6' }]}>
                      <Text style={[styles.badgeText, { color: theme.textSecondary }]}>{item.batch}</Text>
                    </View>
                  )}
                  {isSuspended && (
                    <View style={[styles.badge, { backgroundColor: theme.isDark ? 'rgba(217,119,6,0.2)' : '#FEF3C7' }]}>
                      <Text style={[styles.badgeText, { color: '#D97706' }]}>Suspended</Text>
                    </View>
                  )}
                  {isBanned && (
                    <View style={[styles.badge, { backgroundColor: theme.isDark ? 'rgba(220,38,38,0.2)' : '#FEE2E2' }]}>
                      <Text style={[styles.badgeText, { color: '#DC2626' }]}>Banned</Text>
                    </View>
                  )}
                  {item.isHidden && (
                    <View style={[styles.badge, { backgroundColor: theme.isDark ? '#334155' : '#F1F5F9' }]}>
                      <Text style={[styles.badgeText, { color: theme.textSecondary }]}>Hidden</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.actions, !isDesktop && styles.actionsMobile]}>
            <TouchableOpacity 
              style={[styles.actionBtn, !isDesktop && styles.actionBtnMobile, { borderColor: '#3B82F6' }]} 
              onPress={() => {
                const target = item.username ? `@${item.username}` : `@${item.id}`;
                router.push({
                  pathname: '/[username]',
                  params: { username: target, fromAdmin: 'users' }
                } as any);
              }}
            >
              <Text style={[styles.actionText, { color: '#3B82F6' }]}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, !isDesktop && styles.actionBtnMobile, { borderColor: '#8B5CF6' }]} 
              onPress={() => handleSetPasswordPress(item.id)}
            >
              <Text style={[styles.actionText, { color: '#8B5CF6' }]}>Set Password</Text>
            </TouchableOpacity>
            {!isBanned && !isSuspended && (
              <>
                <TouchableOpacity 
                  style={[styles.actionBtn, !isDesktop && styles.actionBtnMobile, { borderColor: '#F59E0B' }]} 
                  onPress={() => handleUpdateStatus(item.id, 'suspended', item.name)}
                >
                  <Text style={[styles.actionText, { color: '#F59E0B' }]}>Suspend</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, !isDesktop && styles.actionBtnMobile, { borderColor: '#DC2626' }]} 
                  onPress={() => handleUpdateStatus(item.id, 'banned', item.name)}
                >
                  <Text style={[styles.actionText, { color: '#DC2626' }]}>Ban</Text>
                </TouchableOpacity>
              </>
            )}
            {(isBanned || isSuspended) && (
              <TouchableOpacity 
                style={[styles.actionBtn, !isDesktop && styles.actionBtnMobile, { borderColor: '#10B981' }]} 
                onPress={() => handleUpdateStatus(item.id, 'active', item.name)}
              >
                <Text style={[styles.actionText, { color: '#10B981' }]}>Reactivate</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.actionBtn, !isDesktop && styles.actionBtnMobile, { borderColor: '#64748B' }]} 
              onPress={() => handleToggleVisibility(item.id, !!item.isHidden, item.name)}
            >
              <Text style={[styles.actionText, { color: '#64748B' }]}>{item.isHidden ? 'Unhide' : 'Hide'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* View Details Toggle Button */}
        <TouchableOpacity 
          style={[styles.viewDetailsBtn, { borderTopColor: theme.cardBorder }]}
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewDetailsBtnText}>
            {isExpanded ? 'Hide Contact & Academic Details' : 'View Contact & Academic Details'}
          </Text>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={14} 
            color="#F97316" 
            style={{ marginLeft: 6 }} 
          />
        </TouchableOpacity>

        {/* Expanded Box */}
        {isExpanded && (
          <View style={[styles.expandedBox, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderColor: theme.cardBorder }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Email Address:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]} selectable={true}>{item.email || 'Not available'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Username:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]} selectable={true}>{item.username || 'Not set'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Phone Number:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]} selectable={true}>{item.phone || 'Not provided'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Registration No:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]} selectable={true}>{item.regNo || 'Not provided'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Roll Number:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]} selectable={true}>{item.rollNo || 'Not provided'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Academic Batch:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]} selectable={true}>{item.batch || 'Not provided'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Department:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]} selectable={true}>{item.department || 'Not provided'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Joined Date:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]} selectable={true}>{getJoinedDate(item.createdAt)}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <View style={[styles.headerRow, { justifyContent: 'space-between', flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, minWidth: 200 }}>
            <TouchableOpacity 
              style={[styles.backBtn, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]} 
              onPress={() => router.replace('/notanadmin/dashboard')}
            >
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>
            <View style={{ marginLeft: 12, flexShrink: 1 }}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>User Directory</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={2}>Manage and moderate all accounts</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.broadcastBtn}
            onPress={() => router.push('/notanadmin/broadcast' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="megaphone-outline" size={18} color="#FFFFFF" />
            <Text style={styles.broadcastBtnText}>Broadcast Alert</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.filtersContainer, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
          { (loading || refreshing) && searchQuery !== '' ? (
            <ActivityIndicator size="small" color="#94A3B8" />
          ) : (
            <Ionicons name="search" size={20} color="#94A3B8" />
          )}
          <TextInput
            style={[styles.searchInput, { color: theme.text, minWidth: 0 }]}
            placeholder="Search by Name, Batch, Email or Phone..."
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            returnKeyType="search"
           autoCapitalize="sentences" />
          {inputText.length > 0 && (
            <TouchableOpacity 
              style={{ padding: 4 }}
              onPress={() => {
                setInputText('');
                setSearchQuery('');
              }}
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleFilters}>
          {['All', 'Student', 'Alumni', 'Faculty'].map((role) => (
            <TouchableOpacity
              key={role}
              style={[
                styles.filterChip,
                { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' },
                filterRole === role && { backgroundColor: theme.isDark ? '#F97316' : '#0F172A' }
              ]}
              onPress={() => setFilterRole(role as UserRole | 'All')}
            >
              <Text style={[
                styles.filterChipText,
                { color: theme.textSecondary },
                filterRole === role && { color: '#FFFFFF' }
              ]}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => fetchUsers(true)}
          onEndReached={() => fetchUsers(false)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
          ListFooterComponent={
            <View style={{ padding: 20, alignItems: 'center', paddingBottom: 120 }}>
              {loadingMore ? (
                <ActivityIndicator size="small" color="#F97316" />
              ) : hasMore && users.length > 0 ? (
                <TouchableOpacity 
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED',
                    borderColor: '#F97316',
                    borderWidth: 1,
                    paddingHorizontal: 24,
                    paddingVertical: 10,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                  onPress={() => fetchUsers(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cloud-download-outline" size={18} color="#F97316" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#F97316', fontWeight: '700', fontSize: 14 }}>Load More Users</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Change User Password</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 16 }}>
              Set a new password for this user (minimum 6 characters).
            </Text>

            <TextInput
              style={[styles.modalInput, { color: theme.text, backgroundColor: theme.isDark ? '#0F172A' : '#F1F5F9', borderColor: theme.cardBorder }]}
              placeholder="Enter new password"
              placeholderTextColor="#94A3B8"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 }}>
              <TouchableOpacity
                style={{ paddingVertical: 10, paddingHorizontal: 16 }}
                onPress={() => setPasswordModalVisible(false)}
                disabled={isSettingPassword}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: '#8B5CF6',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 6,
                  opacity: (newPassword.length < 6 || isSettingPassword) ? 0.6 : 1,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
                onPress={handleAdminChangePassword}
                disabled={newPassword.length < 6 || isSettingPassword}
              >
                {isSettingPassword ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>Save Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    flexWrap: 'wrap',
    gap: 8,
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
  userCard: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  actions: {
    marginLeft: 16,
    gap: 8,
  },
  actionBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    width: 86,
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
  },
  cardMainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardMainContentMobile: {
    width: '100%',
  },
  actionsMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    marginLeft: 0,
    marginTop: 12,
    gap: 8,
  },
  actionBtnMobile: {
    flexGrow: 1,
    flexBasis: '45%',
    width: 'auto',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  cardHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    width: '100%',
  },
  viewDetailsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F97316',
  },
  expandedBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'right',
  },

  broadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  broadcastBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalScroll: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.01)',
  },
  modalTextArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitBroadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EA580C',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  submitBroadcastBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
