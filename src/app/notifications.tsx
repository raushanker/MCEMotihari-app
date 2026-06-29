import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
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

const TypedFlashList = FlashList as any;
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList as any);
const NOTIF_HEADER_HEIGHT = 56;

function getRelativeTime(timestamp: string) {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  } catch (e) {
    return timestamp;
  }
}



export default function NotificationsHistoryScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const user = useAppStore(state => state.user);

  const [archivedPost, setArchivedPost] = useState<any>(null);
  const [isArchiveModalVisible, setIsArchiveModalVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);



  const [refreshing, setRefreshing] = useState(false);

  const {
    notifications,
    unreadCount,
    loading,
    initNotifications,
    markAsRead,
    markAllAsRead,
    saveToNotepad,
    clearAllNotifications
  } = useNotificationStore();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (user && user.role !== 'Guest') {
        const { collection, getDocs, query, orderBy, limit } = require('firebase/firestore');
        const { db } = require('../config/firebase');
        const notifRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notifRef, orderBy('timestamp', 'desc'), limit(40));
        await getDocs(q);
        useAppStore.getState().showToast('Notifications updated! 🔔', 'success');
      } else {
        useAppStore.getState().showToast('Notifications are up to date', 'info');
      }
    } catch (e) {
      console.warn("Refresh error:", e);
      useAppStore.getState().showToast('Failed to update notifications ⚠️', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleClearAllPress = () => {
    const executeClear = async () => {
      if (user) {
        await clearAllNotifications(user.uid);
        Alert.alert('Cleared 🎉', 'All notifications successfully cleared!');
      }
    };

    if (Platform.OS === 'web') {
      executeClear();
    } else {
      Alert.alert(
        'Clear All Notifications',
        'Kya aap sabhi notifications ko permanently delete karna chahte hain?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear All', style: 'destructive', onPress: executeClear }
        ]
      );
    }
  };

  // Sync notifications history hook on mount
  useEffect(() => {
    if (user && user.role !== 'Guest') {
      const unsubscribe = initNotifications(user.uid);
      return () => unsubscribe();
    }
  }, [user]);

  const handleNotificationClick = async (item: NotificationItem) => {
    if (user) {
      await markAsRead(user.uid, item.id);
    }

    // Redirect logic based on type
    if (item.type === 'post_policy_violation') {
      if (item.targetPostId) {
        // Hidden post, still exists
        router.push(`/post/${item.targetPostId}?from=notifications`);
      } else if (item.deletedPostData) {
        // Deleted post, show archive modal
        setArchivedPost(item.deletedPostData);
        setIsArchiveModalVisible(true);
      } else {
        Alert.alert('Content Removed', 'This post was permanently deleted and is no longer available.');
      }
    } else if ((item.type === 'comment' || item.type === 'like' || item.type === 'post' || item.type === 'mention') && item.targetPostId) {
      const exists = await verifyPostExists(item.targetPostId);
      if (exists) {
        router.push(`/post/${item.targetPostId}?from=notifications`);
      }
    } else if (item.type === 'event') {
      router.push('/explore?view=notices');
    } else if (item.type === 'connection_request' || item.type === 'connection_accepted') {
      if (item.senderUid) {
        router.push(`/@${item.senderUid}?from=notifications`);
      } else if (item.senderUsername) {
        router.push(`/@${item.senderUsername}?from=notifications`);
      } else {
        router.push('/profile');
      }
    } else if (item.type === 'system') {
      if (item.openStudy) {
        router.push(`/?openStudy=${item.openStudy}`);
      } else if (item.imageUrl) {
        setSelectedImageUrl(item.imageUrl);
      }

    } else if (item.senderUid) {
      router.push(`/@${item.senderUid}?from=notifications`);
    } else if (item.senderUsername) {
      router.push(`/@${item.senderUsername}?from=notifications`);
    } else {
      router.push('/profile');
    }
  };

  const handleAcceptConnection = async (e: any, item: NotificationItem) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const { runTransaction, doc } = require('firebase/firestore');
      const { db } = require('../config/firebase');

      const senderUid = item.senderUid;
      if (!senderUid) {
        throw new Error("Sender UID not found in notification.");
      }

      const requestId = item.id;
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
          body: `You accepted ${item.senderName}'s connection request.`
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
          name: item.senderName || '',
          role: item.senderRole || 'Student',
          branch: item.senderBranch || '',
          batch: item.senderBatch || '',
          image: item.senderPhoto || '',
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

      // 4. Instantly update the local Zustand/AsyncStorage connections list and prioritize feed sorting
      const localConn: ContactConnection = {
        id: senderUid,
        name: item.senderName!,
        role: (item.senderRole || 'Student') as any,
        branch: item.senderBranch || '',
        batch: item.senderBatch || '',
        image: item.senderPhoto || '',
        status: 'Connected',
      };

      const storeState = useAppStore.getState();
      const updatedConnections = [...storeState.connections.filter(c => c.id !== senderUid), localConn];
      const sortedPosts = sortPostsPriority(storeState.posts, updatedConnections);
      
      useAppStore.setState({ connections: updatedConnections, posts: sortedPosts });
      await AsyncStorage.setItem('@mce_connections', JSON.stringify(updatedConnections));
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(sortedPosts));

      if (Platform.OS === 'web') {
        alert(`Connected! You are now connected with ${item.senderName}.`);
      } else {
        Alert.alert('Connected 🤝', `You are now connected with ${item.senderName}!`);
      }
    } catch (err: any) {
      if (err.message && (err.message.includes("Pending connection") || err.message.includes("already accepted") || err.message.includes("already exists"))) {
        useAppStore.getState().showToast('Already connected or request resolved.', 'success');
      } else {
        useAppStore.getState().showToast('Connection resolved.', 'success');
        console.warn('Connection silent fail:', err);
      }
    }
  };

  const handleSaveToNotepadClick = async (e: any, item: NotificationItem) => {
    e.stopPropagation();
    const success = await saveToNotepad(item);
    if (success) {
      Alert.alert('Saved 📌', 'Notification details saved successfully to your study Notepad!');
    }
  };

  const handleMarkAllRead = async () => {
    if (user) {
      await markAllAsRead(user.uid);
      Alert.alert('Success 🎉', 'All notifications successfully marked as read!');
    }
  };

  const insets = useSafeAreaInsets();

  // Render Auth Gate for Guest profiles to prevent perpetual loading spinners
  if (!user || user.role === 'Guest') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header Row */}
        <View style={[styles.headerRow, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement, paddingTop: insets.top, height: NOTIF_HEADER_HEIGHT + insets.top }]}>
          <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Alerts & Notifications</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔐</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Login Required 🔐</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary, marginBottom: 20 }]}>
            Notifications dekhne ke liye pehle Google se login karein.
          </Text>
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: '#F97316', paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12 }]}
            onPress={() => router.push('/login')}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={[styles.acceptBtnText, { fontSize: 13.5 }]}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading alerts history...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Animated Header Row */}
      <Animated.View style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: theme.background,
        transform: [{
          translateY: Platform.OS === 'web' ? 0 : Animated.diffClamp(clampedScrollY, 0, NOTIF_HEADER_HEIGHT).interpolate({
            inputRange: [0, NOTIF_HEADER_HEIGHT],
            outputRange: [0, -NOTIF_HEADER_HEIGHT],
            extrapolate: 'clamp',
          })
        }]
      }}>
        <View style={[styles.headerRow, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement, paddingTop: insets.top, height: NOTIF_HEADER_HEIGHT + insets.top }]}>
          <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Alerts & Notifications</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity 
              style={[styles.actionIconBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} 
              onPress={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#F97316" />
              ) : (
                <Ionicons name="refresh" size={19} color={theme.text} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {notifications.length === 0 ? (
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={[styles.scrollBody, { paddingTop: NOTIF_HEADER_HEIGHT + insets.top + 10, paddingBottom: 120 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#F97316']}
              tintColor="#F97316"
              progressViewOffset={NOTIF_HEADER_HEIGHT + insets.top}
              progressBackgroundColor={theme.backgroundElement || '#FFFFFF'}
            />
          }
        >
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Your inbox is clean</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              When students or alumni react, comment or share notices, we will alert you instantly here!
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <AnimatedFlashList
            data={notifications}
            estimatedItemSize={120}
            onScroll={(event: any) => {
              feedScrollY.setValue(event.nativeEvent.contentOffset.y);
            }}
            scrollEventThrottle={16}
            getItemType={(item: NotificationItem) => item.type}
            keyExtractor={(item: NotificationItem) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollBody, { paddingTop: NOTIF_HEADER_HEIGHT + insets.top + 10, paddingBottom: 120 }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#F97316']}
                tintColor="#F97316"
                progressViewOffset={NOTIF_HEADER_HEIGHT + insets.top}
                progressBackgroundColor={theme.backgroundElement || '#FFFFFF'}
              />
            }
            renderItem={({ item }: { item: NotificationItem }) => {
              const isConnRequest = item.type === 'connection_request';
              const ContainerComponent = TouchableOpacity;
              const containerProps = { onPress: () => handleNotificationClick(item), activeOpacity: 0.85 };

              const isPolicyViolation = item.type === 'post_policy_violation';
              return (
                <ContainerComponent
                  {...containerProps}
                  style={[
                    styles.notifItem,
                    {
                      backgroundColor: isPolicyViolation 
                        ? (theme.isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2') 
                        : theme.backgroundElement,
                      borderColor: isPolicyViolation 
                        ? (theme.isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2') 
                        : theme.cardBorder
                    },
                    !item.read && { borderLeftWidth: 4, borderLeftColor: isPolicyViolation ? '#EF4444' : '#F97316' }
                  ]}
                >
                  {/* Visual Avatar frame */}
                  <View style={[styles.emojiFrame, { backgroundColor: isPolicyViolation ? (theme.isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2') : theme.background }]}>
                    {item.senderPhoto && !isPolicyViolation ? (
                      <Image source={{ uri: item.senderPhoto }} style={styles.senderAvatar} />
                    ) : (
                      <Text style={[styles.emojiText, isPolicyViolation && { color: '#EF4444' }]}>
                        {isPolicyViolation ? '⚠️' : item.type === 'welcome' ? '🎉' : item.type === 'comment' ? '💬' : item.type === 'event' ? '📅' : item.type === 'like' ? '❤️' : item.type === 'mention' ? '🔔' : item.type === 'post' ? '📢' : '📢'}
                      </Text>
                    )}
                  </View>

                  {/* Details Column */}
                  <View style={styles.detailsCol}>
                    <View style={styles.metaHeader}>
                      <Text style={[styles.categoryTag, { color: isPolicyViolation ? '#EF4444' : '#F97316' }]}>
                        {item.type === 'system' ? 'ADMIN' : item.type.toUpperCase().replace('_', ' ')}
                      </Text>
                      <Text style={[styles.itemTime, { color: theme.textSecondary }]}>
                        {getRelativeTime(item.timestamp)}
                      </Text>
                    </View>

                    <Text style={[styles.itemTitle, { color: theme.text }, !item.read && { fontWeight: '800' }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.itemBody, { color: theme.textSecondary }]}>
                      {item.body}
                    </Text>
                    {item.imageUrl && (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedImageUrl(item.imageUrl || null);
                        }}
                        style={[styles.attachedImageContainer, { borderColor: theme.cardBorder }]}
                      >
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.attachedImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    )}

                    {/* Inline Dual Action Buttons for connection requests */}
                    {isConnRequest && (
                      <View style={styles.actionsRow}>
                        {item.status === 'accepted' ? (
                          <View style={styles.acceptedBadge}>
                            <Ionicons name="checkmark-circle" size={13} color="#22C55E" style={{ marginRight: 4 }} />
                            <Text style={styles.acceptedText}>Connected</Text>
                          </View>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.acceptBtn}
                              onPress={(e) => handleAcceptConnection(e, item)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="person-add" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                              <Text style={styles.acceptBtnText}>Accept</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.viewProfileBtn, { borderColor: theme.cardBorder }]}
                              onPress={() => handleNotificationClick(item)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="eye" size={12} color={theme.text} style={{ marginRight: 4 }} />
                              <Text style={[styles.viewProfileBtnText, { color: theme.text }]}>View Profile</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Save To Notepad Pin Icon (Hidden on connection requests for cleanliness) */}
                  {!isConnRequest && (
                    <TouchableOpacity
                      style={[styles.pinBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                      onPress={(e) => handleSaveToNotepadClick(e, item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="journal-outline" size={15} color="#F97316" />
                    </TouchableOpacity>
                  )}
                </ContainerComponent>
              );
            }}
          />
        </View>
      )}


      {/* Modal for archived view of deleted posts */}
      <Modal
        visible={isArchiveModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsArchiveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Archived Removed Post</Text>
              <TouchableOpacity 
                style={[styles.closeModalBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                onPress={() => setIsArchiveModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Violation Banner */}
            <View style={styles.violationBanner}>
              <Ionicons name="warning" size={22} color="#FFFFFF" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.violationBannerTitle}>Post Permanently Removed</Text>
                <Text style={styles.violationBannerBody}>
                  This content was removed by college moderators for violating our terms, conditions, and community safety guidelines.
                </Text>
              </View>
            </View>

            {/* Archived Content Details */}
            {archivedPost && (
              <ScrollView style={styles.archivedDetailsScroll} showsVerticalScrollIndicator={false}>
                <Text style={[styles.archivedMeta, { color: theme.textSecondary }]}>
                  Category: {archivedPost.category || 'General'} • Deleted At: {archivedPost.deletedAt}
                </Text>
                
                {archivedPost.title ? (
                  <Text style={[styles.archivedPostTitle, { color: theme.text }]}>
                    {archivedPost.title}
                  </Text>
                ) : null}

                <Text style={[styles.archivedPostContent, { color: theme.text }]}>
                  {archivedPost.content}
                </Text>
              </ScrollView>
            )}

            {/* Modal Footer Button */}
            <TouchableOpacity 
              style={styles.ackBtn} 
              onPress={() => setIsArchiveModalVisible(false)}
            >
              <Text style={styles.ackBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={!!selectedImageUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageUrl(null)}
      >
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity 
            style={styles.imagePreviewCloseBtn} 
            onPress={() => setSelectedImageUrl(null)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImageUrl && (
            <Image 
              source={{ uri: selectedImageUrl }} 
              style={styles.imagePreviewFull} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 80,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13.5,
    fontWeight: '600',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    zIndex: -1,
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
    padding: 16,
    paddingBottom: 40,
  },
  listContainer: {
    gap: 12,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.2,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.01,
    shadowRadius: 4,
    elevation: 1,
  },
  emojiFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  emojiText: {
    fontSize: 18,
  },
  senderAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  detailsCol: {
    flex: 1,
    gap: 4,
  },
  metaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  itemTime: {
    fontSize: 10,
    opacity: 0.7,
  },
  itemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
  },
  itemBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  pinBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Connection card specific button actions
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  viewProfileBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  acceptedText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 450,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  violationBanner: {
    flexDirection: 'row',
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  violationBannerTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13.5,
    marginBottom: 4,
  },
  violationBannerBody: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11.5,
    lineHeight: 16,
  },
  archivedDetailsScroll: {
    maxHeight: 250,
    marginBottom: 20,
  },
  archivedMeta: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 10,
  },
  archivedPostTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  archivedPostContent: {
    fontSize: 13.5,
    lineHeight: 20,
    opacity: 0.9,
  },
  ackBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  ackBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  attachedImageContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    height: 150,
    width: '100%',
  },
  attachedImage: {
    width: '100%',
    height: '100%',
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  imagePreviewCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  imagePreviewFull: {
    width: '100%',
    height: '80%',
  },
});
