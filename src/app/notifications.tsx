import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useNotificationStore, NotificationItem } from '@/store/useNotificationStore';
import { useAppStore, ContactConnection, sortPostsPriority } from '@/store/useAppStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfileModal } from '@/components/modals/UserProfileModal';

export default function NotificationsHistoryScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const { user } = useAppStore();

  const [selectedProfileUser, setSelectedProfileUser] = useState<{
    id?: string;
    name: string;
    role: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest';
    photoUrl?: string;
    department?: string;
    batch?: string;
    username?: string;
  } | null>(null);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

  const {
    notifications,
    unreadCount,
    loading,
    initNotifications,
    markAsRead,
    markAllAsRead,
    saveToNotepad
  } = useNotificationStore();

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
    if (item.type === 'comment' && item.targetPostId) {
      router.push('/');
      setTimeout(() => {
        const feedState = useAppStore.getState();
        const targetPost = feedState.posts.find(p => p.id === item.targetPostId);
        if (targetPost) {
          const setCommentsState = (global as any).__mce_open_comments;
          if (setCommentsState) setCommentsState(targetPost);
        }
      }, 350);
    } else if (item.type === 'event') {
      router.push('/explore?view=notices');
    } else if (item.type === 'connection_request' || item.type === 'connection_accepted') {
      setSelectedProfileUser({
        id: item.senderUid,
        name: item.senderName || 'Campus Member',
        role: (item.senderRole || 'Student') as any,
        photoUrl: item.senderPhoto,
        department: item.senderBranch || 'Engineering',
        batch: item.senderBatch || '',
        username: item.senderUsername,
      });
      setIsProfileModalVisible(true);
    } else {
      router.push('/profile');
    }
  };

  const handleAcceptConnection = async (e: any, item: NotificationItem) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const { doc, updateDoc, setDoc, collection, addDoc } = require('firebase/firestore');
      const { db } = require('../config/firebase');

      // 1. Update connection status to 'accepted' and mark as read in notifications subcollection
      const notifDocRef = doc(db, 'users', user.uid, 'notifications', item.id);
      await updateDoc(notifDocRef, {
        status: 'accepted',
        read: true,
        body: `You accepted ${item.senderName}'s connection request.`
      });

      // 2. Write mutually linked connection docs under both profiles with full basic profile info
      const senderConnRef = doc(db, 'users', item.senderUid!, 'connections', user.uid);
      await setDoc(senderConnRef, {
        id: user.uid,
        name: user.name,
        role: user.role || 'Student',
        branch: user.department || '',
        batch: user.batch || '',
        image: user.photoUrl || '',
        status: 'Connected',
        connectedAt: new Date().toISOString()
      });

      const recipientConnRef = doc(db, 'users', user.uid, 'connections', item.senderUid!);
      await setDoc(recipientConnRef, {
        id: item.senderUid!,
        name: item.senderName!,
        role: item.senderRole || 'Student',
        branch: item.senderBranch || '',
        batch: item.senderBatch || '',
        image: item.senderPhoto || '',
        status: 'Connected',
        connectedAt: new Date().toISOString()
      });

      // 3. Send a reciprocal clickable connection_accepted notification to the sender
      const senderNotifRef = collection(db, 'users', item.senderUid!, 'notifications');
      await addDoc(senderNotifRef, {
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
      });

      // 4. Instantly update the local Zustand/AsyncStorage connections list and prioritize feed sorting
      const localConn: ContactConnection = {
        id: item.senderUid!,
        name: item.senderName!,
        role: (item.senderRole || 'Student') as any,
        branch: item.senderBranch || '',
        batch: item.senderBatch || '',
        image: item.senderPhoto || '',
        status: 'Connected',
      };

      const storeState = useAppStore.getState();
      const updatedConnections = [...storeState.connections.filter(c => c.id !== item.senderUid), localConn];
      const sortedPosts = sortPostsPriority(storeState.posts, updatedConnections);
      
      useAppStore.setState({ connections: updatedConnections, posts: sortedPosts });
      await AsyncStorage.setItem('@mce_connections', JSON.stringify(updatedConnections));
      await AsyncStorage.setItem('@mce_posts', JSON.stringify(sortedPosts));

      if (Platform.OS === 'web') {
        alert(`Connected! You are now connected with ${item.senderName}.`);
      } else {
        Alert.alert('Connected 🤝', `You are now connected with ${item.senderName}!`);
      }
    } catch (err) {
      console.error('Failed to accept connection request:', err);
      Alert.alert('Acceptance Failed', 'Unable to complete connection. Please check your network.');
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

  // Render Auth Gate for Guest profiles to prevent perpetual loading spinners
  if (!user || user.role === 'Guest') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        {/* Header Row */}
        <View style={[styles.headerRow, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
          <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Alerts & Notifications</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔐</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Authentication Required</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary, marginBottom: 20 }]}>
            Guests cannot access campus notification networks. Please sign in with Google to explore verified community updates.
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
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading alerts history...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header Row */}
      <View style={[styles.headerRow, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Alerts & Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} onPress={handleMarkAllRead}>
            <Ionicons name="checkmark-done" size={20} color="#22C55E" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {notifications.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Your inbox is clean</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              When students or alumni react, comment or share notices, we will alert you instantly here!
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {notifications.map((item) => {
              const isConnRequest = item.type === 'connection_request';
              const ContainerComponent = TouchableOpacity;
              const containerProps = { onPress: () => handleNotificationClick(item), activeOpacity: 0.85 };

              return (
                <ContainerComponent
                  key={item.id}
                  {...containerProps}
                  style={[
                    styles.notifItem,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.cardBorder
                    },
                    !item.read && { borderLeftWidth: 4, borderLeftColor: '#F97316' }
                  ]}
                >
                  {/* Visual Avatar frame */}
                  <View style={[styles.emojiFrame, { backgroundColor: theme.background }]}>
                    {isConnRequest && item.senderPhoto ? (
                      <Image source={{ uri: item.senderPhoto }} style={styles.senderAvatar} />
                    ) : (
                      <Text style={styles.emojiText}>
                        {item.type === 'welcome' ? '🎉' : item.type === 'comment' ? '💬' : item.type === 'event' ? '📅' : '📢'}
                      </Text>
                    )}
                  </View>

                  {/* Details Column */}
                  <View style={styles.detailsCol}>
                    <View style={styles.metaHeader}>
                      <Text style={[styles.categoryTag, { color: '#F97316' }]}>
                        {item.type.toUpperCase()}
                      </Text>
                      <Text style={[styles.itemTime, { color: theme.textSecondary }]}>
                        {item.timestamp}
                      </Text>
                    </View>

                    <Text style={[styles.itemTitle, { color: theme.text }, !item.read && { fontWeight: '800' }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.itemBody, { color: theme.textSecondary }]}>
                      {item.body}
                    </Text>

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
            })}
          </View>
        )}
      </ScrollView>

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
});
