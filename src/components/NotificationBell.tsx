import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ScrollView, Animated, Dimensions, Platform, Alert, Image } from 'react-native';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from '@/hooks/useThemeColors';
import { useNotificationStore, NotificationItem } from '@/store/useNotificationStore';
import { useAppStore } from '@/store/useAppStore';

import { verifyPostExists } from '@/utils/firestoreUtils';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

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

const { width } = Dimensions.get('window');

export function NotificationBell() {
  const theme = useThemeColors();
  const router = useRouter();
  const { user } = useAppStore();
  
  const { 
    notifications, 
    unreadCount, 
    initNotifications, 
    markAsRead, 
    markAllAsRead, 
    saveToNotepad,
    clearAllNotifications,
    deleteNotifications
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Unread badge pulsing dynamic animation
  useEffect(() => {
    if (unreadCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 900,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [unreadCount]);

  // Sync notifications on user auth mount
  useEffect(() => {
    if (user && user.role !== 'Guest') {
      const unsubscribe = initNotifications(user.uid);
      return () => unsubscribe();
    }
  }, [user]);

  const handleOpenDropdown = () => {
    if (!user || user.role === 'Guest') {
      Alert.alert(
        'Login Required 🔐',
        'Notifications dekhne ke liye pehle Google se login karein.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login with Google', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    setIsOpen(true);
    if (user && unreadCount > 0) {
      markAllAsRead(user.uid);
    }
  };

  const handleCloseDropdown = () => {
    setIsOpen(false);
    if (user && unreadCount > 0) {
      markAllAsRead(user.uid);
    }
  };

  const [hiddenNotificationIds, setHiddenNotificationIds] = useState<Set<string>>(new Set());

  const handleNotificationClick = async (item: NotificationItem) => {
    setIsOpen(false);
    if (user) {
      await markAllAsRead(user.uid);
    }
    
    // Redirect logic by event type
    if ((item.type === 'comment' || item.type === 'like' || item.type === 'post' || item.type === 'mention') && item.targetPostId) {
      const exists = await verifyPostExists(item.targetPostId);
      if (exists) {
        router.push(`/post/${item.targetPostId}`);
      } else {
        Alert.alert('Post Not Found', 'This post may have been deleted.');
      }
    } else if (item.type === 'event') {
      router.push('/explore?view=notices');
    } else if (item.type === 'system' || item.type === 'welcome' || item.type === 'post_policy_violation') {
      if (item.openStudy) {
        router.push(`/?openStudy=${item.openStudy}`);
      } else {
        // System messages - just show the full alert
        Alert.alert(item.title, item.body);
      }
    } else if (item.type === 'connection_request' || item.type === 'connection_accepted' || item.senderUsername || item.senderUid || item.senderName) {
      // Avoid navigating to system names like "MCE Connect Admin" or "MCE Connect"
      const isSystemSender = item.senderName && (item.senderName.toLowerCase().includes('mce connect') || item.senderName.toLowerCase().includes('admin'));
      
      if (isSystemSender) {
        Alert.alert(item.title, item.body);
      } else {
        if (item.senderUsername) {
          router.push(`/@${item.senderUsername}?from=notifications`);
        } else if (item.senderUid) {
          router.push(`/@${item.senderUid}?from=notifications`);
        } else {
          router.push('/profile');
        }
      }
    } else {
      router.push('/profile');
    }
  };

  const handleSaveToNotepadClick = async (e: any, item: NotificationItem) => {
    e.stopPropagation();
    const success = await saveToNotepad(item);
    if (success) {
      Alert.alert('Saved 📌', 'Notification details saved successfully to your study Notepad!');
    }
  };

  const handleClearClick = (e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const executeClear = async () => {
      if (user) {
        await clearAllNotifications(user.uid);
        setHiddenNotificationIds(new Set());
        useAppStore.getState().showToast('Notifications cleared', 'success');
      }
    };

    if (Platform.OS === 'web') {
      executeClear();
    } else {
      Alert.alert('Clear Alerts', 'Kya aap in alerts ko yahan se clear karna chahte hain?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: executeClear }
      ]);
    }
  };

  const recentNotifs = notifications.slice(0, 5);

  return (
    <View>
      <TouchableOpacity 
        style={[styles.bellBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} 
        onPress={handleOpenDropdown}
        activeOpacity={0.8}
      >
        <Ionicons name="notifications-outline" size={21} color={theme.text} />
        {unreadCount > 0 && (
          <Animated.View style={[
            styles.unreadDot, 
            { 
              transform: [{ scale: pulseAnim }],
              backgroundColor: '#EF4444' 
            }
          ]}>
            <Text style={styles.unreadCountText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Sleek Dropdown Overlay */}
      {isOpen && (
        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={handleCloseDropdown}
        >
          <TouchableOpacity 
            style={styles.dropdownBackdrop} 
            activeOpacity={1} 
            onPress={handleCloseDropdown}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => {
                if (e && e.stopPropagation) {
                  e.stopPropagation();
                }
              }}
              style={[
                styles.dropdownCard, 
                { 
                  backgroundColor: theme.backgroundElement, 
                  borderColor: theme.cardBorder,
                  shadowColor: theme.isDark ? '#000000' : '#0F172A'
                }
              ]}
            >
              {/* Header Action Bar */}
              <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Recent Notifications</Text>
              </View>

              {/* Items List */}
              <ScrollView showsVerticalScrollIndicator={false} style={styles.notifScroll}>
                {recentNotifs.length === 0 ? (
                  <View style={styles.emptyView}>
                    <Text style={styles.emptyEmoji}>🔔</Text>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No notifications yet.</Text>
                  </View>
                ) : (
                  recentNotifs.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.notifItem,
                        { borderBottomColor: theme.cardBorder },
                        !item.read && { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.05)' : '#FFFBEB' }
                      ]}
                      onPress={() => handleNotificationClick(item)}
                      activeOpacity={0.85}
                    >
                      {/* Visual Indicator Avatar Emoji */}
                      <TouchableOpacity 
                        style={[styles.emojiIndicatorFrame, { backgroundColor: theme.background }]}
                        onPress={() => handleNotificationClick(item)}
                        activeOpacity={0.7}
                      >
                        {item.senderPhoto ? (
                          <Image source={{ uri: item.senderPhoto }} style={styles.senderAvatar} />
                        ) : (
                          <Text style={styles.emojiText}>
                            {item.type === 'welcome' ? '🎉' : item.type === 'comment' ? '💬' : item.type === 'event' ? '📅' : item.type === 'like' ? '❤️' : item.type === 'mention' ? '🔔' : item.type === 'post' ? '📢' : '📢'}
                          </Text>
                        )}
                      </TouchableOpacity>

                      {/* Details Column */}
                      <View style={styles.detailsCol}>
                        <Text style={[styles.itemTitle, { color: theme.text }, !item.read && { fontWeight: '800' }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={[styles.itemBody, { color: theme.textSecondary }]} numberOfLines={2}>
                          {item.body}
                        </Text>
                        <Text style={[styles.itemTime, { color: theme.textSecondary }]}>
                          {getRelativeTime(item.timestamp)}
                        </Text>
                      </View>

                      {/* Actions */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity 
                          style={[styles.pinBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                          onPress={(e) => handleSaveToNotepadClick(e, item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="journal-outline" size={14} color="#F97316" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.pinBtn, { backgroundColor: theme.danger + '15', borderColor: theme.cardBorder }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            if (user) {
                              deleteNotifications(user.uid, new Set([item.id]));
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={14} color={theme.danger} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              {/* Footer Links */}
              <TouchableOpacity 
                style={[styles.footerBtn, { borderTopColor: theme.cardBorder }]}
                onPress={() => {
                  setIsOpen(false);
                  if (user) markAllAsRead(user.uid);
                  router.push('/notifications');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.footerText}>View all alerts ➔</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.8,
    borderColor: '#FFFFFF',
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 96 : 76,
    right: 16,
    width: width - 32,
    maxWidth: 360,
    borderRadius: 22,
    borderWidth: 1.2,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#22C55E',
  },
  notifScroll: {
    maxHeight: 280,
  },
  emptyView: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  emojiIndicatorFrame: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  senderAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  emojiText: {
    fontSize: 16,
  },
  detailsCol: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemBody: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  itemTime: {
    fontSize: 10,
    marginTop: 2,
    opacity: 0.75,
  },
  pinBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
  },
  footerText: {
    color: '#F97316',
    fontSize: 12.5,
    fontWeight: '800',
  },
});
