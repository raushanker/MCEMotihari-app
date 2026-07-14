import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  RefreshControl,
  Pressable,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ContactConnection, sortPostsPriority, useAppStore } from '@/store/useAppStore';
import { NotificationItem, useNotificationStore } from '@/store/useNotificationStore';
import { verifyPostExists } from '@/utils/firestoreUtils';
import { clampedScrollY, feedScrollY } from '@/utils/scrollState';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlashList } from '@shopify/flash-list';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList as any);
const NOTIF_HEADER_HEIGHT = 56;
const PAGE_INITIAL = 15;
const PAGE_MORE = 10;

/**
 * Robustly parse timestamps stored in multiple formats:
 *  - ISO:              "2026-06-30T06:42:29.000Z"
 *  - Firestore locale: "30/06/2026, 06:42:29"   (DD/MM/YYYY)
 *  - US locale:        "6/30/2026, 6:42:29 PM"  (MM/DD/YYYY)
 *  - Relative text:    "Just now", "4d ago" etc. → returns 0 (sort last)
 */
function parseTimestamp(ts: string): number {
  if (!ts) return 0;
  // Already a valid ISO / US-locale string?
  const direct = Date.parse(ts);
  if (!isNaN(direct)) return direct;

  // Try DD/MM/YYYY[, HH:mm:ss] — common Indian locale format
  // e.g. "30/06/2026, 06:42:29" or "30/6/2026"
  const ddmmMatch = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(.*))?$/);
  if (ddmmMatch) {
    const [, dd, mm, yyyy, rest] = ddmmMatch;
    const reordered = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}${rest ? 'T' + rest.trim() : ''}`;
    const t = Date.parse(reordered);
    if (!isNaN(t)) return t;
  }
  return 0;
}

function getRelativeTime(timestamp: string) {
  try {
    const ms = parseTimestamp(timestamp);
    if (!ms) return timestamp;
    const now = Date.now();
    const diff = Math.floor((now - ms) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    const d = new Date(ms);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
  } catch {
    return timestamp;
  }
}

function getTypeEmoji(type: NotificationItem['type']) {
  switch (type) {
    case 'comment': return '💬';
    case 'like': return '❤️';
    case 'mention': return '🔔';
    case 'event': return '📅';
    case 'welcome': return '🎉';
    case 'connection_request': return '🤝';
    case 'connection_accepted': return '✅';
    case 'post': return '📢';
    case 'post_policy_violation': return '⚠️';
    default: return '📢';
  }
}

function getTypeLabel(type: NotificationItem['type']) {
  switch (type) {
    case 'system': return 'ADMIN';
    case 'post_policy_violation': return 'POLICY';
    case 'connection_request': return 'CONNECTION';
    case 'connection_accepted': return 'CONNECTED';
    default: return type.toUpperCase().replace('_', ' ');
  }
}

export default function NotificationsHistoryScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const user = useAppStore(state => state.user);

  const {
    notifications,
    loading,
    hasMore,
    initNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    deleteNotifications,
    saveToNotepad,
  } = useNotificationStore();

  // ── State ──────────────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [archivedPost, setArchivedPost] = useState<any>(null);
  const [isArchiveModalVisible, setIsArchiveModalVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // Sorted newest-first, then paginated
  const sortedNotifs = useMemo(
    () => [...notifications].sort((a, b) => {
      // Use robust multi-format parser so DD/MM/YYYY locale strings sort correctly
      const ta = parseTimestamp(a.timestamp);
      const tb = parseTimestamp(b.timestamp);
      // Items with unparseable timestamps go to the bottom
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return tb - ta; // newest first
    }),
    [notifications]
  );
  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && user.role !== 'Guest') {
      const unsub = initNotifications(user.uid);
      return () => unsub();
    }
  }, [user]);

  // Reset pagination on fresh data
  useEffect(() => {
    // Pagination is now handled by the store
  }, [notifications.length]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (user && user.role !== 'Guest') {
        const { collection, getDocs, query, orderBy, limit } = require('firebase/firestore');
        const { db } = require('../config/firebase');
        const q = query(collection(db, 'users', user.uid, 'notifications'), orderBy('timestamp', 'desc'), limit(15));
        await getDocs(q);
        useAppStore.getState().showToast('Notifications refreshed 🔔', 'success');
      }
    } catch {
      useAppStore.getState().showToast('Refresh failed ⚠️', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    if (user) {
      loadMoreNotifications(user.uid);
    }
    setTimeout(() => {
      setLoadingMore(false);
    }, 500);
  };

  const handleClearAll = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Kya aap sabhi notifications permanently delete karna chahte hain? Ye action undo nahi ho sakti.')) {
        if (user) {
          await clearAllNotifications(user.uid);
          useAppStore.getState().showToast('All notifications cleared 🗑️', 'success');
        }
      }
    } else {
      Alert.alert(
        'Clear All Notifications',
        'Kya aap sabhi notifications permanently delete karna chahte hain? Ye action undo nahi ho sakti.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear All', style: 'destructive', onPress: async () => {
              if (user) {
                await clearAllNotifications(user.uid);
                useAppStore.getState().showToast('All notifications cleared 🗑️', 'success');
              }
            }
          },
        ]
      );
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    const executeDelete = async () => {
      if (!user) return;
      try {
        await deleteNotifications(user.uid, selectedIds);
        const deletedCount = selectedIds.size;
        setSelectedIds(new Set());
        setSelectMode(false);
        useAppStore.getState().showToast(`${deletedCount} notifications deleted`, 'success');
      } catch {
        useAppStore.getState().showToast('Delete failed ⚠️', 'error');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${selectedIds.size} Notification${selectedIds.size > 1 ? 's' : ''}?\nSelected notifications permanently delete ho jayengi.`)) {
        await executeDelete();
      }
    } else {
      Alert.alert(
        `Delete ${selectedIds.size} Notification${selectedIds.size > 1 ? 's' : ''}`,
        'Selected notifications permanently delete ho jayengi.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: executeDelete },
        ]
      );
    }
  };

  const handleMarkAllRead = async () => {
    if (user) {
      await markAllAsRead(user.uid);
      useAppStore.getState().showToast('All marked as read ✅', 'success');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (selectMode) { toggleSelect(item.id); return; }
    if (user) await markAsRead(user.uid, item.id);

    if (item.type === 'post_policy_violation') {
      if (item.targetPostId) {
        router.push(`/post/${item.targetPostId}?from=notifications`);
      } else if (item.deletedPostData) {
        setArchivedPost(item.deletedPostData);
        setIsArchiveModalVisible(true);
      } else {
        Alert.alert('Content Removed', 'This post was permanently deleted.');
      }
    } else if (['comment', 'like', 'post', 'mention'].includes(item.type) && item.targetPostId) {
      const exists = await verifyPostExists(item.targetPostId);
      if (exists) {
        router.push(`/post/${item.targetPostId}?from=notifications`);
      } else {
        useAppStore.getState().showToast('Post no longer available', 'info');
      }
    } else if (item.type === 'event') {
      router.push('/explore?view=notices');
    } else if (item.type === 'connection_request' || item.type === 'connection_accepted') {
      if (item.senderUsername) router.push(`/@${item.senderUsername}?from=notifications`);
      else if (item.senderUid) router.push(`/@${item.senderUid}?from=notifications`);
      else router.push('/profile');
    } else if (item.type === 'system') {
      if (item.openStudy) router.push(`/?openStudy=${item.openStudy}`);
      else if (item.imageUrl) setSelectedImageUrl(item.imageUrl);
    } else if (item.senderUsername) {
      router.push(`/@${item.senderUsername}?from=notifications`);
    } else if (item.senderUid) {
      router.push(`/@${item.senderUid}?from=notifications`);
    }
  };

  const handleAcceptConnection = async (e: any, item: NotificationItem) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const { runTransaction, doc } = require('firebase/firestore');
      const { db } = require('../config/firebase');
      const senderUid = item.senderUid;
      if (!senderUid) throw new Error('Sender UID missing');
      const requestId = item.id;
      const acceptanceNotifId = `connection_accepted_${user.uid}_${senderUid}_${requestId}`;
      const sortedUserIds = [user.uid, senderUid].sort().join('_');
      const notifDocRef = doc(db, 'users', user.uid, 'notifications', requestId);
      const senderConnRef = doc(db, 'users', senderUid, 'connections', user.uid);
      const recipientConnRef = doc(db, 'users', user.uid, 'connections', senderUid);
      const senderNotifRef = doc(db, 'users', senderUid, 'notifications', acceptanceNotifId);
      await runTransaction(db, async (transaction: any) => {
        const notifDoc = await transaction.get(notifDocRef);
        if (!notifDoc.exists()) throw new Error('Request not found');
        if (notifDoc.data().status === 'accepted') return;
        const recipientConnDoc = await transaction.get(recipientConnRef);
        if (recipientConnDoc.exists() && recipientConnDoc.data().status === 'Connected') return;
        transaction.update(notifDocRef, { status: 'accepted', read: true, body: `You accepted ${item.senderName}'s connection request.` });
        transaction.set(senderConnRef, { id: user.uid, name: user.name, role: user.role || 'Student', branch: user.department || '', batch: user.batch || '', image: user.photoUrl || '', status: 'Connected', sortedUserIds, connectedAt: new Date().toISOString() });
        transaction.set(recipientConnRef, { id: senderUid, name: item.senderName || '', role: item.senderRole || 'Student', branch: item.senderBranch || '', batch: item.senderBatch || '', image: item.senderPhoto || '', status: 'Connected', sortedUserIds, connectedAt: new Date().toISOString() });
        transaction.set(senderNotifRef, { type: 'connection_accepted', title: '🤝 Connection Accepted', body: `${user.name} accepted your connection request. You are now connected!`, timestamp: new Date().toLocaleString(), read: false, senderUid: user.uid, senderName: user.name, senderPhoto: user.photoUrl || '', senderBranch: user.department || '', senderBatch: user.batch || '', senderUsername: user.username || '', senderRole: user.role || 'Student', requestId });
      });
      const localConn: ContactConnection = { id: senderUid, name: item.senderName!, role: (item.senderRole || 'Student') as any, branch: item.senderBranch || '', batch: item.senderBatch || '', image: item.senderPhoto || '', status: 'Connected' };
      const storeState = useAppStore.getState();
      const updatedConnections = [...storeState.connections.filter(c => c.id !== senderUid), localConn];
      const sortedPosts = sortPostsPriority(storeState.posts, updatedConnections);
      useAppStore.setState({ connections: updatedConnections, posts: sortedPosts });
      await AsyncStorage.setItem('@mce_connections', JSON.stringify(updatedConnections));
      Alert.alert('Connected 🤝', `You are now connected with ${item.senderName}!`);
    } catch (err: any) {
      useAppStore.getState().showToast('Already connected or request resolved.', 'success');
    }
  };

  // ── Guest / Loading screens ────────────────────────────────────────────────
  if (!user || user.role === 'Guest') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.headerRow, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement, paddingTop: insets.top, height: NOTIF_HEADER_HEIGHT + insets.top }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Alerts & Notifications</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔐</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Login Required</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary, marginBottom: 24 }]}>Notifications dekhne ke liye pehle login karein.</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')} activeOpacity={0.85}>
            <Ionicons name="logo-google" size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.loginBtnText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary, marginTop: 14 }]}>Loading notifications...</Text>
      </View>
    );
  }

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* ── Fixed Header ──────────────────────────────────────────────────── */}
      <View style={[
        styles.headerRow,
        {
          backgroundColor: theme.backgroundElement,
          borderBottomColor: theme.cardBorder,
          paddingTop: insets.top,
          height: NOTIF_HEADER_HEIGHT + insets.top,
        }
      ]}>
        {/* Back / Cancel */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            if (selectMode) { setSelectMode(false); setSelectedIds(new Set()); }
            else router.canGoBack() ? router.back() : router.replace('/');
          }}
        >
          <Ionicons name={selectMode ? 'close' : 'arrow-back'} size={20} color={theme.text} />
        </TouchableOpacity>

        {/* Title */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          {selectMode ? (
            <Text style={[styles.headerTitle, { color: '#F97316' }]}>
              {selectedIds.size} Selected
            </Text>
          ) : (
            <Text style={[styles.headerTitle, { color: theme.text }]}>Alerts & Notifications</Text>
          )}
        </View>

        {/* Right actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {selectMode ? (
            <TouchableOpacity
              style={[styles.deleteSelBtn, selectedIds.size === 0 && { opacity: 0.4 }]}
              onPress={handleDeleteSelected}
              disabled={selectedIds.size === 0}
            >
              <Ionicons name="trash" size={14} color="#FFF" />
              <Text style={styles.deleteSelBtnText}>Delete</Text>
            </TouchableOpacity>
          ) : (
            /* ⋮ 3-dot menu trigger */
            <TouchableOpacity
              style={[styles.iconBtn, menuVisible && { backgroundColor: theme.isDark ? 'rgba(249,115,22,0.15)' : '#FFF7ED' }]}
              onPress={() => setMenuVisible(v => !v)}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── 3-dot Menu — rendered in Modal to float above FlashList ────────── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation?.()} style={[
            styles.menuCard,
            {
              top: NOTIF_HEADER_HEIGHT + insets.top + 6,
              backgroundColor: theme.backgroundElement,
              borderColor: theme.cardBorder,
            }
          ]}>
                {[
                  { icon: 'refresh', label: 'Refresh', color: '#3B82F6', onPress: () => { setMenuVisible(false); handleRefresh(); } },
                  { icon: 'checkmark-done', label: 'Mark All as Read', color: '#22C55E', onPress: () => { setMenuVisible(false); handleMarkAllRead(); } },
                  { icon: 'checkbox-outline', label: 'Select to Delete', color: '#F97316', onPress: () => { setMenuVisible(false); setSelectMode(true); } },
                  { icon: 'trash-outline', label: 'Clear All', color: '#EF4444', onPress: () => { setMenuVisible(false); handleClearAll(); } },
                  { icon: 'notifications-outline', label: 'Notification Settings', color: '#8B5CF6', onPress: () => { setMenuVisible(false); router.push('/settings'); } },
                ].map((opt, idx, arr) => (
                  <TouchableOpacity
                    key={opt.label}
                    style={[
                      styles.menuItem,
                      idx !== arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.cardBorder }
                    ]}
                    onPress={opt.onPress}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuIconCircle, { backgroundColor: `${opt.color}18` }]}>
                      <Ionicons name={opt.icon as any} size={16} color={opt.color} />
                    </View>
                    <Text style={[styles.menuLabel, { color: theme.text }]}>{opt.label}</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
                  </TouchableOpacity>
                ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Notification List ─────────────────────────────────────────────── */}
      {sortedNotifs.length === 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollBody, { paddingTop: 12, paddingBottom: insets.bottom + 100 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#F97316']} tintColor="#F97316" />}
        >
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Your inbox is clean</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Jab koi comment, like ya connection request aayegi, hum aapko yahan notify karenge!
            </Text>
          </View>
        </ScrollView>
      ) : (
        <AnimatedFlashList
          data={sortedNotifs}
          estimatedItemSize={110}
          onScroll={(event: any) => feedScrollY.setValue(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          keyExtractor={(item: NotificationItem) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 12,
            paddingHorizontal: 14,
            paddingBottom: insets.bottom + 100,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#F97316']}
              tintColor="#F97316"
              progressBackgroundColor={theme.backgroundElement || '#FFF'}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListFooterComponent={() => (
            <View style={{ paddingBottom: 8 }}>
              {hasMore && !loadingMore ? (
                <TouchableOpacity style={[styles.loadMoreBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} onPress={handleLoadMore} activeOpacity={0.8}>
                  <Ionicons name="chevron-down" size={15} color="#F97316" />
                  <Text style={[styles.loadMoreText, { color: theme.text }]}>
                    Load more notifications
                  </Text>
                </TouchableOpacity>
              ) : null}
              {loadingMore ? (
                <View style={styles.loadingMoreRow}>
                  <ActivityIndicator size="small" color="#F97316" />
                  <Text style={[styles.loadMoreText, { color: theme.textSecondary }]}>Loading...</Text>
                </View>
              ) : null}
              {!hasMore && sortedNotifs.length > 15 ? (
                <Text style={[styles.endText, { color: theme.textSecondary }]}>
                  All {sortedNotifs.length} notifications loaded
                </Text>
              ) : null}
            </View>
          )}
          renderItem={({ item }: { item: NotificationItem }) => {
            const isConnRequest = item.type === 'connection_request';
            const isPolicyViolation = item.type === 'post_policy_violation';
            const isSelected = selectedIds.has(item.id);
            const isComment = item.type === 'comment';
            const typeColor = isPolicyViolation ? '#EF4444' : isComment ? '#3B82F6' : '#F97316';

            return (
              <TouchableOpacity
                onPress={() => handleNotificationClick(item)}
                onLongPress={() => { if (!selectMode) { setSelectMode(true); toggleSelect(item.id); } }}
                activeOpacity={0.82}
                style={[
                  styles.notifCard,
                  {
                    backgroundColor: isSelected
                      ? (theme.isDark ? 'rgba(249,115,22,0.12)' : '#FFF7ED')
                      : isPolicyViolation
                        ? (theme.isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2')
                        : theme.backgroundElement,
                    borderColor: isSelected
                      ? '#F97316'
                      : isPolicyViolation
                        ? (theme.isDark ? 'rgba(239,68,68,0.3)' : '#FEE2E2')
                        : theme.cardBorder,
                  },
                  !item.read && { borderLeftWidth: 3.5, borderLeftColor: typeColor },
                ]}
              >
                {/* Selection circle */}
                {selectMode ? (
                  <View style={[styles.selCircle, isSelected && styles.selCircleActive]}>
                    {isSelected ? <Ionicons name="checkmark" size={13} color="#FFF" /> : null}
                  </View>
                ) : null}

                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: isPolicyViolation ? (theme.isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2') : theme.background }]}>
                  {!!item.senderPhoto && !isPolicyViolation ? (
                    <Image source={{ uri: item.senderPhoto }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarEmoji}>{getTypeEmoji(item.type)}</Text>
                  )}
                  {/* Unread dot */}
                  {!item.read ? (
                    <View style={[styles.unreadDot, { backgroundColor: typeColor }]} />
                  ) : null}
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                  {/* Row 1: type tag + time */}
                  <View style={styles.metaRow}>
                    <View style={[styles.typeTag, { backgroundColor: `${typeColor}18` }]}>
                      <Text style={[styles.typeTagText, { color: typeColor }]}>{getTypeLabel(item.type)}</Text>
                    </View>
                    <Text style={[styles.timeText, { color: theme.textSecondary }]}>{getRelativeTime(item.timestamp)}</Text>
                  </View>

                  {/* Row 2: title */}
                  <Text style={[styles.notifTitle, { color: theme.text }, !item.read && { fontWeight: '800' }]} numberOfLines={2}>
                    {item.title}
                  </Text>

                  {/* Row 3: body */}
                  <Text style={[styles.notifBody, { color: theme.textSecondary }]} numberOfLines={3}>
                    {(() => {
                      if (!item.body) return null;
                      const urlRegex = /(https?:\/\/[^\s]+)/g;
                      const parts = item.body.split(urlRegex);
                      return parts.map((part, index) => {
                        if (part.match(urlRegex)) {
                          return (
                            <Text
                              key={index}
                              style={{ color: '#3B82F6', textDecorationLine: 'underline' }}
                              onPress={(e) => {
                                e.stopPropagation();
                                Linking.openURL(part).catch(() => {});
                              }}
                            >
                              {part}
                            </Text>
                          );
                        }
                        return <Text key={index}>{part}</Text>;
                      });
                    })()}
                  </Text>

                  {/* Comment CTA */}
                  {isComment && !!item.targetPostId ? (
                    <View style={styles.ctaRow}>
                      <Ionicons name="arrow-forward-circle" size={13} color="#3B82F6" />
                      <Text style={styles.ctaText}>Tap to view the comment on post</Text>
                    </View>
                  ) : null}
                  
                  {/* Action URL CTA */}
                  {!!item.actionUrl ? (
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, padding: 8, backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF', borderRadius: 8, alignSelf: 'flex-start' }}
                      onPress={(e) => {
                        e.stopPropagation();
                        import('react-native').then(({ Linking }) => {
                          Linking.openURL(item.actionUrl!).catch(() => {});
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="link" size={14} color="#3B82F6" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600' }}>Open Link</Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Attached Image */}
                  {!!item.imageUrl ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={e => { e.stopPropagation?.(); setSelectedImageUrl(item.imageUrl || null); }}
                      style={[styles.attachedImg, { borderColor: theme.cardBorder }]}
                    >
                      <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </TouchableOpacity>
                  ) : null}

                  {/* Connection Request Actions */}
                  {isConnRequest ? (
                    <View style={styles.connActions}>
                      {item.status === 'accepted' ? (
                        <View style={styles.connectedBadge}>
                          <Ionicons name="checkmark-circle" size={13} color="#22C55E" />
                          <Text style={styles.connectedText}>Connected</Text>
                        </View>
                      ) : (
                        <>
                          <TouchableOpacity style={styles.acceptBtn} onPress={e => handleAcceptConnection(e, item)} activeOpacity={0.85}>
                            <Ionicons name="person-add" size={12} color="#FFF" />
                            <Text style={styles.acceptBtnText}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.viewBtn, { borderColor: theme.cardBorder }]} onPress={() => handleNotificationClick(item)} activeOpacity={0.8}>
                            <Ionicons name="eye" size={12} color={theme.text} />
                            <Text style={[styles.viewBtnText, { color: theme.text }]}>View Profile</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  ) : null}
                </View>

                {/* Pin to notepad */}
                {!isConnRequest && !selectMode ? (
                  <TouchableOpacity
                    style={[styles.pinBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                    onPress={async e => { e.stopPropagation?.(); await saveToNotepad(item); useAppStore.getState().showToast('Saved to Notepad 📌', 'success'); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="journal-outline" size={14} color="#F97316" />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── Archived Post Modal ───────────────────────────────────────────── */}
      <Modal visible={isArchiveModalVisible} animationType="slide" transparent onRequestClose={() => setIsArchiveModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={[styles.modalHead, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.modalHeadTitle, { color: theme.text }]}>Archived Removed Post</Text>
              <TouchableOpacity style={[styles.iconBtn, { borderWidth: 1, borderColor: theme.cardBorder }]} onPress={() => setIsArchiveModalVisible(false)}>
                <Ionicons name="close" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.violationBanner}>
              <Ionicons name="warning" size={20} color="#FFF" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.violationTitle}>Post Permanently Removed</Text>
                <Text style={styles.violationBody}>Community guidelines violation ke karan moderators ne is content ko remove kar diya.</Text>
              </View>
            </View>
            {archivedPost ? (
              <ScrollView style={{ maxHeight: 240, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.archivedMeta, { color: theme.textSecondary }]}>
                  {archivedPost.category || 'General'} • Deleted: {archivedPost.deletedAt}
                </Text>
                {!!archivedPost.title ? <Text style={[styles.archivedTitle, { color: theme.text }]}>{archivedPost.title}</Text> : null}
                <Text style={[styles.archivedBody, { color: theme.text }]}>{archivedPost.content}</Text>
              </ScrollView>
            ) : null}
            <TouchableOpacity style={styles.ackBtn} onPress={() => setIsArchiveModalVisible(false)}>
              <Text style={styles.ackBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Image Preview Modal ───────────────────────────────────────────── */}
      <Modal visible={!!selectedImageUrl} transparent animationType="fade" onRequestClose={() => setSelectedImageUrl(null)}>
        <View style={styles.imgPreviewOverlay}>
          <TouchableOpacity style={styles.imgPreviewClose} onPress={() => setSelectedImageUrl(null)}>
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
          {!!selectedImageUrl ? <Image source={{ uri: selectedImageUrl }} style={styles.imgPreviewFull} resizeMode="contain" /> : null}
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    zIndex: 200,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteSelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  deleteSelBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  // ── 3-dot menu ──────────────────────────────────────────────────────────
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuCard: {
    position: 'absolute',
    right: 12,
    minWidth: 220,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 300,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  menuIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 13, fontWeight: '600' },

  // ── Scroll / List ────────────────────────────────────────────────────────
  scrollBody: { padding: 14 },

  // ── Notification card ────────────────────────────────────────────────────
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 13,
    gap: 12,
  },
  selCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flexShrink: 0,
  },
  selCircleActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    flexShrink: 0,
    position: 'relative',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarEmoji: { fontSize: 18 },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  cardContent: { flex: 1, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  typeTag: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  timeText: { fontSize: 10, opacity: 0.7 },
  notifTitle: { fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  notifBody: { fontSize: 12, lineHeight: 17 },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ctaText: { fontSize: 11, fontWeight: '700', color: '#3B82F6' },
  attachedImg: {
    marginTop: 8,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    height: 130,
    width: '100%',
  },
  pinBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
    flexShrink: 0,
  },

  // ── Connection actions ───────────────────────────────────────────────────
  connActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22C55E', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  acceptBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  viewBtnText: { fontSize: 11, fontWeight: '700' },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  connectedText: { color: '#22C55E', fontSize: 11, fontWeight: '700' },

  // ── Pagination ───────────────────────────────────────────────────────────
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  loadMoreText: { fontSize: 13, fontWeight: '700' },
  loadingMoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, paddingVertical: 8 },
  endText: { textAlign: 'center', fontSize: 11, fontWeight: '600', marginTop: 14, opacity: 0.6 },

  // ── Empty / Center ────────────────────────────────────────────────────────
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySubtitle: { fontSize: 13.5, textAlign: 'center', lineHeight: 20 },
  loginBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F97316', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  loginBtnText: { color: '#FFF', fontSize: 13.5, fontWeight: '700' },

  // ── Archived Modal ────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { width: '100%', maxWidth: 450, borderRadius: 24, borderWidth: 1, padding: 20, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, marginBottom: 14 },
  modalHeadTitle: { fontSize: 16, fontWeight: '800' },
  violationBanner: { flexDirection: 'row', backgroundColor: '#DC2626', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 16 },
  violationTitle: { color: '#FFF', fontWeight: '800', fontSize: 13, marginBottom: 3 },
  violationBody: { color: 'rgba(255,255,255,0.9)', fontSize: 11.5, lineHeight: 16 },
  archivedMeta: { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  archivedTitle: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
  archivedBody: { fontSize: 13, lineHeight: 19, opacity: 0.9 },
  ackBtn: { backgroundColor: '#DC2626', paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  ackBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // ── Image Preview ─────────────────────────────────────────────────────────
  imgPreviewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  imgPreviewClose: { position: 'absolute', top: 50, right: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  imgPreviewFull: { width: '100%', height: '80%' },
});
