import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, ScrollView, Animated, Dimensions, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useNotificationStore, NotificationItem } from '@/store/useNotificationStore';
import { useAppStore } from '@/store/useAppStore';
import { useRouter } from 'expo-router';

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
    saveToNotepad 
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
        'Authentication Required',
        'Guests cannot access campus notification networks. Please sign in with Google to explore verified community updates.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    setIsOpen(true);
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    setIsOpen(false);
    if (user) {
      await markAsRead(user.uid, item.id);
    }
    
    // Redirect logic by event type
    if (item.type === 'comment' && item.targetPostId) {
      router.push('/');
      // Trigger opening comments modal on feed
      setTimeout(() => {
        const feedState = useAppStore.getState();
        const targetPost = feedState.posts.find(p => p.id === item.targetPostId);
        if (targetPost) {
          // Open comments sheet inside index feed dynamically
          const setCommentsState = (global as any).__mce_open_comments;
          if (setCommentsState) setCommentsState(targetPost);
        }
      }, 350);
    } else if (item.type === 'event') {
      router.push('/explore?view=notices');
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

  const handleMarkAllReadClick = async () => {
    if (user) {
      await markAllAsRead(user.uid);
    }
  };

  const recentNotifs = notifications.slice(0, 4);

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
          onRequestClose={() => setIsOpen(false)}
        >
          <TouchableOpacity 
            style={styles.dropdownBackdrop} 
            activeOpacity={1} 
            onPress={() => setIsOpen(false)}
          >
            <View style={[
              styles.dropdownCard, 
              { 
                backgroundColor: theme.backgroundElement, 
                borderColor: theme.cardBorder,
                shadowColor: theme.isDark ? '#000000' : '#0F172A'
              }
            ]}>
              {/* Header Action Bar */}
              <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Recent Notifications</Text>
                {unreadCount > 0 && (
                  <TouchableOpacity 
                    style={styles.markAllBtn} 
                    onPress={handleMarkAllReadClick}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark-done" size={16} color="#22C55E" style={{ marginRight: 4 }} />
                    <Text style={styles.markAllText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
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
                      <View style={[styles.emojiIndicatorFrame, { backgroundColor: theme.background }]}>
                        <Text style={styles.emojiText}>
                          {item.type === 'welcome' ? '🎉' : item.type === 'comment' ? '💬' : item.type === 'event' ? '📅' : '📢'}
                        </Text>
                      </View>

                      {/* Details Column */}
                      <View style={styles.detailsCol}>
                        <Text style={[styles.itemTitle, { color: theme.text }, !item.read && { fontWeight: '800' }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={[styles.itemBody, { color: theme.textSecondary }]} numberOfLines={2}>
                          {item.body}
                        </Text>
                        <Text style={[styles.itemTime, { color: theme.textSecondary }]}>
                          {item.timestamp}
                        </Text>
                      </View>

                      {/* Dynamic Notebook Pin Button */}
                      <TouchableOpacity 
                        style={[styles.pinBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                        onPress={(e) => handleSaveToNotepadClick(e, item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="journal-outline" size={14} color="#F97316" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              {/* Footer Links */}
              <TouchableOpacity 
                style={[styles.footerBtn, { borderTopColor: theme.cardBorder }]}
                onPress={() => {
                  setIsOpen(false);
                  router.push('/notifications');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.footerText}>View all alerts ➔</Text>
              </TouchableOpacity>
            </View>
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
