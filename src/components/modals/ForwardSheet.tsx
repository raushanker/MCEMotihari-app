/**
 * ForwardSheet — Universal Forward Bottom Sheet
 *
 * Opens when a user taps the Forward icon on any content card.
 * Shows all community chat rooms with multi-select (max 5).
 * Sends a lightweight reference to selected rooms via forwardEngine.
 *
 * No room is pre-selected by default.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { TextInput } from '@/components/ui/TextInput';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { CHAT_ROOMS, ChatRoom } from '@/constants/chatRooms';
import {
  ForwardableContent,
  forwardToRooms,
  getContentLabel,
} from '@/utils/forwardEngine';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_FORWARD_ROOMS = 5;

interface ForwardSheetProps {
  visible: boolean;
  content: ForwardableContent | null;
  onClose: () => void;
}

export function ForwardSheet({ visible, content, onClose }: ForwardSheetProps) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const user = useAppStore((s) => s.user);
  const showToast = useAppStore((s) => s.showToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [isForwarding, setIsForwarding] = useState(false);

  // Slide-up animation
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSelectedRoomIds(new Set());
      setIsForwarding(false);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: Platform.OS !== 'web',
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [visible]);

  const filteredRooms = CHAT_ROOMS.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleRoom = useCallback(
    (roomId: string) => {
      setSelectedRoomIds((prev) => {
        const next = new Set(prev);
        if (next.has(roomId)) {
          next.delete(roomId);
        } else {
          if (next.size >= MAX_FORWARD_ROOMS) {
            showToast(`Maximum ${MAX_FORWARD_ROOMS} rooms allowed`, 'error');
            return prev;
          }
          next.add(roomId);
        }
        return next;
      });
    },
    [showToast]
  );

  const handleForward = async () => {
    if (!user || user.role === 'Guest') {
      showToast('Please log in to forward content.', 'error');
      return;
    }
    if (!content) return;
    if (selectedRoomIds.size === 0) {
      showToast('Please select at least one chat room.', 'error');
      return;
    }

    setIsForwarding(true);
    Keyboard.dismiss();
    try {
      await forwardToRooms(Array.from(selectedRoomIds), content, {
        uid: user.uid,
        name: user.name ?? 'Campus Member',
        photoUrl: user.photoUrl,
        role: user.role,
        adminRole: user.adminRole,
        username: user.username,
      });
      const count = selectedRoomIds.size;
      showToast(
        `✓ Forwarded to ${count} ${count === 1 ? 'room' : 'rooms'}!`,
        'success'
      );
      onClose();
    } catch (e: any) {
      console.error('[ForwardSheet] Forward failed:', e);
      showToast('Forward failed. Please try again.', 'error');
    } finally {
      setIsForwarding(false);
    }
  };

  const handleClose = () => {
    if (isForwarding) return;
    onClose();
  };

  // Room item renderer
  const renderRoom = (room: ChatRoom) => {
    const isSelected = selectedRoomIds.has(room.id);
    return (
      <TouchableOpacity
        key={room.id}
        style={[
          styles.roomRow,
          { borderBottomColor: theme.cardBorder },
          isSelected && {
            backgroundColor: theme.isDark
              ? 'rgba(249,115,22,0.08)'
              : 'rgba(249,115,22,0.06)',
          },
        ]}
        onPress={() => toggleRoom(room.id)}
        activeOpacity={0.7}
      >
        {/* Room Icon */}
        <View
          style={[
            styles.roomIcon,
            { backgroundColor: room.isImage ? 'transparent' : room.color + '20', borderColor: room.isImage ? 'transparent' : room.color + '40', overflow: 'hidden' },
          ]}
        >
          {room.isImage ? (
            <Image source={room.imageSource} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Ionicons name={room.icon as any} size={18} color={room.color} />
          )}
        </View>

        {/* Room Info */}
        <View style={styles.roomInfo}>
          <Text
            style={[styles.roomName, { color: theme.text }]}
            numberOfLines={1}
          >
            {room.name}
          </Text>
          <Text
            style={[styles.roomDesc, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {room.description}
          </Text>
        </View>

        {/* Type Badge + Checkbox */}
        <View style={styles.roomRight}>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor:
                  room.type === 'public'
                    ? theme.isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5'
                    : theme.isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF',
              },
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                { color: room.type === 'public' ? '#10B981' : '#3B82F6' },
              ]}
            >
              {room.type === 'public' ? 'Public' : 'Dept'}
            </Text>
          </View>

          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: isSelected ? '#F97316' : 'transparent',
                borderColor: isSelected ? '#F97316' : theme.textSecondary,
              },
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={12} color="#FFF" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!visible && slideAnim._value === SCREEN_HEIGHT) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      >
        <Animated.View
          style={[
            styles.backdropInner,
            {
              opacity: slideAnim.interpolate({
                inputRange: [0, SCREEN_HEIGHT],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.backgroundElement,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: theme.textSecondary + '60' }]} />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Forward to Chat Room
            </Text>
            {content && (
              <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
                {content.emoji} {getContentLabel(content.contentType)} — {content.title.slice(0, 38)}{content.title.length > 38 ? '…' : ''}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeBtn}
            activeOpacity={0.7}
            disabled={isForwarding}
          >
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { borderBottomColor: theme.cardBorder }]}>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: theme.isDark
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(0,0,0,0.04)',
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <Ionicons name="search" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search chat rooms..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Selection counter */}
        {selectedRoomIds.size > 0 && (
          <View style={[styles.selectionBar, { backgroundColor: theme.isDark ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.07)', borderBottomColor: theme.cardBorder }]}>
            <Ionicons name="checkmark-circle" size={14} color="#F97316" style={{ marginRight: 6 }} />
            <Text style={styles.selectionText}>
              {selectedRoomIds.size}/{MAX_FORWARD_ROOMS} rooms selected
            </Text>
          </View>
        )}

        {/* Room List */}
        <ScrollView
          style={styles.roomList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* All Rooms / Filtered */}
          {filteredRooms.length === 0 ? (
            <View style={styles.emptySearch}>
              <Text style={[styles.emptySearchText, { color: theme.textSecondary }]}>
                No rooms found for "{searchQuery}"
              </Text>
            </View>
          ) : (
            filteredRooms.map(renderRoom)
          )}
          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Forward Button */}
        <View style={[styles.footer, { borderTopColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={[
              styles.forwardBtn,
              selectedRoomIds.size === 0 && styles.forwardBtnDisabled,
            ]}
            onPress={handleForward}
            disabled={selectedRoomIds.size === 0 || isForwarding}
            activeOpacity={0.85}
          >
            {isForwarding ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="arrow-redo" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.forwardBtnText}>
                  {selectedRoomIds.size === 0
                    ? 'Select a Room to Forward'
                    : `Forward to ${selectedRoomIds.size} ${selectedRoomIds.size === 1 ? 'Room' : 'Rooms'}`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropInner: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.82,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '400',
    maxWidth: 260,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  selectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F97316',
  },
  roomList: {
    flex: 1,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.8,
  },
  roomIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roomInfo: {
    flex: 1,
    marginRight: 8,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  roomDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  roomRight: {
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySearch: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  forwardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  forwardBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  forwardBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
