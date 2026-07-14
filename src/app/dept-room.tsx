import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
   Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Modal, Image, ScrollView, Pressable, Linking, Share,
  Animated, Dimensions, StatusBar } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  collection, addDoc, deleteDoc, doc, updateDoc,
  onSnapshot, orderBy, query, serverTimestamp, Timestamp,
  getDocs, where, writeBatch, setDoc, increment, limit, startAfter,
  QueryDocumentSnapshot, DocumentData,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '@/utils/cloudinary';
import { getFormattedPostTime as timeAgo, parseDate } from '@/utils/timeFormat';
import { pickMediaWithOptions } from '@/utils/mediaPicker';
import { useAppStore } from '@/store/useAppStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { containsProfanity, parseTextForLinks } from '@/utils/textFilter';
import ImageViewing from '@/components/ImageViewingWrapper';
import { useExploreBack } from '@/hooks/useExploreBack';
import { ForwardSheet } from '@/components/modals/ForwardSheet';
import { ForwardableContent, getContentEmoji } from '@/utils/forwardEngine';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_CHARS = 500;
const MAX_IMAGES = 4;
const PAGE_SIZE = 8;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Dept helpers ─────────────────────────────────────────────────────────────
const DEPT_SHORT: Record<string, string> = {
  cse: 'CSE',
  cse_ai: 'CSE (AI)',
  civil: 'Civil',
  civil_ca: 'Civil (CA)',
  eee: 'EEE',
  mechanical: 'Mechanical',
  humanities: 'Humanities',
  tnp: 'T&P Cell',
  ecell: 'E-Cell',
};
const DEPT_COLOR: Record<string, string> = {
  cse: '#3B82F6',
  cse_ai: '#8B5CF6',
  civil: '#10B981',
  civil_ca: '#14B8A6',
  eee: '#F59E0B',
  mechanical: '#EF4444',
  humanities: '#64748B',
  tnp: '#0EA5E9',
  ecell: '#EAB308',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface NoticePost {
  id: string;
  text: string;
  images: string[];
  link?: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  isPinned: boolean;
  createdAt: Timestamp | null;
  deptId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toSentenceCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTime12hr(ts: Timestamp | null): string {
  if (!ts) return '';
  const d = parseDate(ts) || new Date();
  const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${dateStr} at ${timeStr}`;
}

function getRoleBadgeColor(role: string): string {
  switch (role?.toLowerCase()) {
    case 'faculty': return '#8B5CF6';
    case 'admin': return '#F97316';
    case 'staff': return '#3B82F6';
    default: return '#64748B';
  }
}

// Cloudinary URL transformations
function getLowQualityUrl(url: string): string {
  if (!url?.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/q_10,w_200,e_blur:200/');
}

function getPreviewUrl(url: string): string {
  if (!url?.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/q_auto:low,w_500/');
}

function getHighQualityUrl(url: string): string {
  if (!url?.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/q_auto:best,w_1200/');
}

// ─── Lazy Image Component ──────────────────────────────────────────────────────
function LazyImage({
  uri,
  style,
  resizeMode = 'cover',
  highQuality = false,
}: {
  uri: string;
  style: any;
  resizeMode?: 'cover' | 'contain';
  highQuality?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const sourceUri = highQuality ? getHighQualityUrl(uri) : getPreviewUrl(uri);
  const blurUri = getLowQualityUrl(uri);

  const handleLoad = () => {
    setLoaded(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={[style, { overflow: 'hidden' }]}>
      {/* Low quality placeholder */}
      <Image
        source={{ uri: blurUri }}
        style={[StyleSheet.absoluteFill, { borderRadius: (style as any)?.borderRadius }]}
        resizeMode={resizeMode}
        blurRadius={Platform.OS === 'ios' ? 8 : 4}
      />
      {/* High quality progressive load */}
      <Animated.Image
        source={{ uri: sourceUri }}
        style={[StyleSheet.absoluteFill, { opacity, borderRadius: (style as any)?.borderRadius }]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
      />
    </View>
  );
}

// ─── Featured Hero Card (Newest / Pinned) ─────────────────────────────────────
function FeaturedNoticeCard({
  post,
  deptColor,
  deptShort,
  canManage,
  isAuthor,
  isOtherUser,
  onPin,
  onDelete,
  onImagePress,
  onForward,
}: {
  post: NoticePost;
  deptColor: string;
  deptShort: string;
  canManage: boolean;
  isAuthor: boolean;
  isOtherUser: boolean;
  onPin: (post: NoticePost) => void;
  onDelete: (post: NoticePost) => void;
  onImagePress: (url: string, allUrls: string[], index: number) => void;
  onForward?: (post: NoticePost) => void;
}) {
  const theme = useThemeColors();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAppStore();

  const displayAvatar = isAuthor && user ? user.photoUrl : post.authorAvatar;
  const displayName = isAuthor && user ? user.name : post.authorName;
  const displayRole = isAuthor && user ? (user.adminRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : user.role) : post.authorRole;

  const handleShare = async () => {
    try {
      const shortText = post.text
        ? (post.text.length > 60 ? post.text.substring(0, 60) + '...' : post.text)
        : 'Image attached';
      const message = `📢 ${deptShort} Notice Board\n\n"${shortText}"\n\nRead more on MCEMotihari App:\nhttps://play.google.com/store/apps/details?id=com.mcemotihari.app`;
      await Share.share({ message });
    } catch {}
  };

  const handleReport = () => {
    Alert.alert('Report Notice', 'Thank you for reporting. Our admin team will review this notice soon.');
    setMenuOpen(false);
  };

  const handleSave = () => {
    Alert.alert('Saved!', 'Notice saved to your bookmarks (Coming Soon).');
    setMenuOpen(false);
  };

  const textSegments = post.text ? parseTextForLinks(post.text) : [];

  return (
    <View style={[
      styles.featuredCard,
      {
        backgroundColor: theme.backgroundElement,
        borderColor: post.isPinned ? deptColor + '80' : theme.cardBorder,
        shadowColor: deptColor,
      },
    ]}>
      {/* Pinned ribbon */}
      {post.isPinned && (
        <View style={[styles.pinnedRibbon, { backgroundColor: deptColor }]}>
          <Ionicons name="pin" size={10} color="#FFF" />
          <Text style={styles.pinnedRibbonText}>PINNED</Text>
        </View>
      )}



      {/* Author row */}
      <View style={styles.featuredAuthorRow}>
        {displayAvatar ? (
          <Image source={{ uri: displayAvatar }} style={styles.featuredAvatar} />
        ) : (
          <View style={[styles.featuredAvatarFallback, { backgroundColor: deptColor + '22' }]}>
            <Ionicons name="person" size={20} color={deptColor} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.featuredAuthorName, { color: theme.text }]}>{displayName}</Text>
            {(post.authorId === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || post.authorId === 'DdP2c855PSRUJwhmN9rvbkYBraP2' || displayRole === 'SUPER_ADMIN') && (
              <MaterialIcons name="verified" size={15} color="#1D9BF0" />
            )}
          </View>
          <View style={styles.featuredMetaRow}>
            <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(displayRole || 'Student') + '18' }]}>
              <Text style={[styles.roleText, { color: getRoleBadgeColor(displayRole || 'Student') }]}>
                {displayRole}
              </Text>
            </View>
            <Text style={[styles.featuredMeta, { color: theme.textSecondary }]}>
              • {formatTime12hr(post.createdAt)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          style={styles.moreBtn}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Text */}
      {post.text.length > 0 && (
        <Text style={[styles.featuredText, { color: theme.text }]}>
          {textSegments.map((seg, idx) =>
            seg.type === 'link' ? (
              <Text
                key={idx}
                style={{ color: '#3B82F6', textDecorationLine: 'underline' }}
                onPress={() => Linking.openURL(seg.content.startsWith('http') ? seg.content : `https://${seg.content}`).catch(() => {})}
              >
                {seg.content}
              </Text>
            ) : (
              <Text key={idx}>{seg.content}</Text>
            )
          )}
        </Text>
      )}

      {/* Link chip */}
      {!!post.link && (
        <TouchableOpacity
          style={[styles.linkChip, { borderColor: deptColor + '50', backgroundColor: deptColor + '0D' }]}
          onPress={() => Linking.openURL(post.link!.startsWith('http') ? post.link! : `https://${post.link}`).catch(() => {})}
          activeOpacity={0.7}
        >
          <Ionicons name="link-outline" size={14} color={deptColor} />
          <Text style={[styles.linkChipText, { color: deptColor }]} numberOfLines={1}>{post.link}</Text>
          <Ionicons name="open-outline" size={12} color={deptColor} />
        </TouchableOpacity>
      )}

      {/* Images */}
      {post.images.length > 0 && (
        <View style={styles.featuredImagesGrid}>
          {post.images.slice(0, 4).map((url, i) => {
            const isFirst = i === 0 && post.images.length === 1;
            const isWide = i === 0 && post.images.length === 3;
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.9}
                style={[
                  styles.featuredImageWrapper,
                  isFirst && styles.featuredImageSingle,
                  isWide && styles.featuredImageWide,
                  { borderRadius: 12 },
                ]}
                onPress={() => onImagePress(url, post.images, i)}
              >
                <LazyImage uri={url} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                {i === 3 && post.images.length > 4 && (
                  <View style={styles.moreImagesOverlay}>
                    <Text style={styles.moreImagesText}>+{post.images.length - 4}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Action bar */}
      <View style={[styles.featuredActions, { borderTopColor: theme.cardBorder }]}>
        <TouchableOpacity style={styles.actionPill} onPress={handleShare} activeOpacity={0.7}>
          <Ionicons name="share-social-outline" size={15} color={theme.textSecondary} />
          <Text style={[styles.actionPillText, { color: theme.textSecondary }]}>Share</Text>
        </TouchableOpacity>
        {onForward && (
          <TouchableOpacity style={styles.actionPill} onPress={() => onForward(post)} activeOpacity={0.7}>
            <Ionicons name="arrow-forward-circle-outline" size={15} color={theme.textSecondary} />
            <Text style={[styles.actionPillText, { color: theme.textSecondary }]}>Forward</Text>
          </TouchableOpacity>
        )}
        {isOtherUser && (
          <>
            <TouchableOpacity style={styles.actionPill} onPress={handleSave} activeOpacity={0.7}>
              <Ionicons name="bookmark-outline" size={15} color={theme.textSecondary} />
              <Text style={[styles.actionPillText, { color: theme.textSecondary }]}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionPill} onPress={handleReport} activeOpacity={0.7}>
              <Ionicons name="flag-outline" size={15} color="#EF4444" />
              <Text style={[styles.actionPillText, { color: '#EF4444' }]}>Report</Text>
            </TouchableOpacity>
          </>
        )}
        {(canManage || isAuthor) && (
          <TouchableOpacity
            style={[styles.actionPill, { backgroundColor: '#EF444415' }]}
            onPress={() => onDelete(post)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
            <Text style={[styles.actionPillText, { color: '#EF4444' }]}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Context Menu */}
      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuBox, { backgroundColor: theme.backgroundElement }]}>
            <MenuItem icon="share-outline" label="Share Notice" onPress={() => { setMenuOpen(false); handleShare(); }} color={theme.text} />
            {onForward && <MenuItem icon="arrow-forward-circle-outline" label="Forward Notice" onPress={() => { setMenuOpen(false); onForward(post); }} color={theme.text} />}
            <MenuDivider theme={theme} />
            <MenuItem icon="bookmark-outline" label="Save Notice" onPress={() => { setMenuOpen(false); handleSave(); }} color={theme.text} />
            {(canManage || isAuthor) && (
              <>
                <MenuDivider theme={theme} />
                {canManage && (
                  <MenuItem
                    icon={post.isPinned ? 'pin' : 'pin-outline'}
                    label={post.isPinned ? 'Unpin Post' : 'Pin to Top'}
                    onPress={() => { setMenuOpen(false); onPin(post); }}
                    color={deptColor}
                  />
                )}
                <MenuDivider theme={theme} />
                <MenuItem icon="trash-outline" label="Remove Notice" onPress={() => { setMenuOpen(false); onDelete(post); }} color="#EF4444" />
              </>
            )}
            {isOtherUser && (
              <>
                <MenuDivider theme={theme} />
                <MenuItem icon="flag-outline" label="Report Notice" onPress={handleReport} color="#EF4444" />
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Small List Notice Card ────────────────────────────────────────────────────
function SmallNoticeCard({
  post,
  deptColor,
  deptShort,
  canManage,
  isAuthor,
  isOtherUser,
  onPin,
  onDelete,
  onImagePress,
  onForward,
}: {
  post: NoticePost;
  deptColor: string;
  deptShort: string;
  canManage: boolean;
  isAuthor: boolean;
  isOtherUser: boolean;
  onPin: (post: NoticePost) => void;
  onDelete: (post: NoticePost) => void;
  onImagePress: (url: string, allUrls: string[], index: number) => void;
  onForward?: (post: NoticePost) => void;
}) {
  const theme = useThemeColors();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleNoticeBookmark = useAppStore(state => state.toggleNoticeBookmark);
  const savedNotices = useAppStore(state => state.savedNotices);
  
  const isSaved = savedNotices?.some(n => n.id === post.id);

  const handleShare = async () => {
    try {
      const shortText = post.text ? (post.text.length > 60 ? post.text.substring(0, 60) + '...' : post.text) : 'Image attached';
      await Share.share({ message: `📢 ${deptShort} Notice\n\n"${shortText}"\n\nhttps://play.google.com/store/apps/details?id=com.mcemotihari.app` });
    } catch {}
  };

  const textSegments = post.text ? parseTextForLinks(post.text) : [];
  const hasImage = post.images.length > 0;

  return (
    <View style={[
      styles.smallCard,
      {
        backgroundColor: theme.backgroundElement,
        borderColor: post.isPinned ? deptColor + '60' : theme.cardBorder,
      },
    ]}>
      {post.isPinned && (
        <View style={[styles.smallPinnedBar, { backgroundColor: deptColor }]}>
          <Ionicons name="pin" size={9} color="#FFF" />
          <Text style={styles.smallPinnedText}>PINNED</Text>
        </View>
      )}

      <View style={styles.smallCardInner}>
        {/* Left: avatar + content */}
        <View style={styles.smallCardLeft}>
          {/* Author row */}
          <View style={styles.smallAuthorRow}>
            {post.authorAvatar ? (
              <Image source={{ uri: post.authorAvatar }} style={styles.smallAvatar} />
            ) : (
              <View style={[styles.smallAvatarFallback, { backgroundColor: deptColor + '22' }]}>
                <Ionicons name="person" size={12} color={deptColor} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.smallAuthorName, { color: theme.text }]} numberOfLines={1}>{post.authorName}</Text>
                {(post.authorId === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || post.authorId === 'DdP2c855PSRUJwhmN9rvbkYBraP2') && (
                  <MaterialIcons name="verified" size={13} color="#1D9BF0" />
                )}
              </View>
              <View style={styles.smallMetaRow}>
                <View style={[styles.smallRoleBadge, { backgroundColor: getRoleBadgeColor(post.authorRole) + '15' }]}>
                  <Text style={[styles.smallRoleText, { color: getRoleBadgeColor(post.authorRole) }]}>{post.authorRole}</Text>
                </View>
                <Text style={[styles.smallTime, { color: theme.textSecondary }]}>• {formatTime12hr(post.createdAt)}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setMenuOpen(true)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="ellipsis-vertical" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Text */}
          {post.text.length > 0 && (
            <Text style={[styles.smallCardText, { color: theme.text }]} numberOfLines={3}>
              {textSegments.map((seg, idx) =>
                seg.type === 'link' ? (
                  <Text key={idx} style={{ color: '#3B82F6', textDecorationLine: 'underline' }}
                    onPress={() => Linking.openURL(seg.content.startsWith('http') ? seg.content : `https://${seg.content}`).catch(() => {})}>
                    {seg.content}
                  </Text>
                ) : <Text key={idx}>{seg.content}</Text>
              )}
            </Text>
          )}

          {/* Link */}
          {!!post.link && (
            <TouchableOpacity
              style={[styles.smallLinkChip, { borderColor: deptColor + '40', backgroundColor: deptColor + '0A' }]}
              onPress={() => Linking.openURL(post.link!.startsWith('http') ? post.link! : `https://${post.link}`).catch(() => {})}
              activeOpacity={0.7}
            >
              <Ionicons name="link-outline" size={11} color={deptColor} />
              <Text style={[styles.smallLinkText, { color: deptColor }]} numberOfLines={1}>{post.link}</Text>
            </TouchableOpacity>
          )}

          {/* Bottom actions */}
          <View style={styles.smallActions}>
            <TouchableOpacity style={styles.smallAction} onPress={handleShare} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={13} color={theme.textSecondary} />
              <Text style={[styles.smallActionText, { color: theme.textSecondary }]}>Share</Text>
            </TouchableOpacity>
            {onForward && (
              <TouchableOpacity style={styles.smallAction} onPress={() => onForward(post)} activeOpacity={0.7}>
                <Ionicons name="arrow-forward-circle-outline" size={13} color={theme.textSecondary} />
                <Text style={[styles.smallActionText, { color: theme.textSecondary }]}>Forward</Text>
              </TouchableOpacity>
            )}
            {isOtherUser && (
              <>
                <TouchableOpacity style={styles.smallAction} onPress={() => toggleNoticeBookmark(post)} activeOpacity={0.7}>
                  <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={13} color={isSaved ? deptColor : theme.textSecondary} />
                  <Text style={[styles.smallActionText, { color: isSaved ? deptColor : theme.textSecondary }]}>{isSaved ? 'Saved' : 'Save'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallAction} onPress={() => Alert.alert('Report Notice', 'Thank you for reporting.')} activeOpacity={0.7}>
                  <Ionicons name="flag-outline" size={13} color="#EF4444" />
                  <Text style={[styles.smallActionText, { color: '#EF4444' }]}>Report</Text>
                </TouchableOpacity>
              </>
            )}
            {(canManage || isAuthor) && (
              <TouchableOpacity style={styles.smallAction} onPress={() => onDelete(post)} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={13} color="#EF4444" />
                <Text style={[styles.smallActionText, { color: '#EF4444' }]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Right: thumbnail image if present */}
        {hasImage && (
          <TouchableOpacity
            style={styles.smallThumbnailWrap}
            onPress={() => onImagePress(post.images[0], post.images, 0)}
            activeOpacity={0.85}
          >
            <LazyImage uri={post.images[0]} style={styles.smallThumbnail} />
            {post.images.length > 1 && (
              <View style={styles.smallImageCount}>
                <Ionicons name="images-outline" size={10} color="#FFF" />
                <Text style={styles.smallImageCountText}>{post.images.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Context menu */}
      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuBox, { backgroundColor: theme.backgroundElement }]}>
            <MenuItem icon="share-outline" label="Share Notice" onPress={() => { setMenuOpen(false); handleShare(); }} color={theme.text} />
            {onForward && <MenuItem icon="arrow-forward-circle-outline" label="Forward Notice" onPress={() => { setMenuOpen(false); onForward(post); }} color={theme.text} />}
            <MenuDivider theme={theme} />
            <MenuItem icon="bookmark-outline" label="Save Notice" onPress={() => { setMenuOpen(false); Alert.alert('Coming Soon'); }} color={theme.text} />
            {(canManage || isAuthor) && (
              <>
                <MenuDivider theme={theme} />
                {canManage && (
                  <MenuItem icon={post.isPinned ? 'pin' : 'pin-outline'} label={post.isPinned ? 'Unpin' : 'Pin to Top'} onPress={() => { setMenuOpen(false); onPin(post); }} color={deptColor} />
                )}
                <MenuDivider theme={theme} />
                <MenuItem icon="trash-outline" label="Remove Notice" onPress={() => { setMenuOpen(false); onDelete(post); }} color="#EF4444" />
              </>
            )}
            {isOtherUser && (
              <>
                <MenuDivider theme={theme} />
                <MenuItem icon="flag-outline" label="Report Notice" onPress={() => { setMenuOpen(false); Alert.alert('Report', 'Thank you. Our team will review this.'); }} color="#EF4444" />
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Shared small helpers ──────────────────────────────────────────────────────
function MenuItem({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MenuDivider({ theme }: { theme: any }) {
  return <View style={[styles.menuDivider, { backgroundColor: theme.cardBorder }]} />;
}





// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DeptRoomScreen() {
  const { deptId, from } = useLocalSearchParams<{ deptId: string; from?: string }>();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, markRoomAsRead, roomStats, readStates } = useAppStore();


  const deptColor = DEPT_COLOR[deptId ?? ''] ?? '#3B82F6';
  const deptShort = DEPT_SHORT[deptId ?? ''] ?? deptId ?? 'Dept';
  const statusBarHeight = StatusBar.currentHeight;
  const paddingTop = Math.max(insets.top, 16);
  const handleExploreBack = useExploreBack();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (from === 'hub' && deptId) {
      router.replace(`/department/${encodeURIComponent(deptId)}?deptId=${encodeURIComponent(deptId)}`);
      return;
    }
    if (from === 'explore') {
      handleExploreBack(from);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  // ── Access control ────────────────────────────────────────────────────────────
  // Can post & delete: Faculty + Faculty Admin + Super Admin
  const isFacultyRole = user?.role === 'Faculty';
  const isFacultyAdmin =
    user?.adminRole === 'SUPER_ADMIN' ||
    (user?.deptFacultyAdminRoles as string[] | undefined)?.includes(deptId ?? '');
  const canPost = isFacultyRole || isFacultyAdmin;
  const canManage = isFacultyAdmin; // extra privileges: pin, bulk delete

  // Other users (Students, Alumni, etc.) — they get save/share/report
  const isOtherUser = !isFacultyRole && !isFacultyAdmin;



  // ── State ──────────────────────────────────────────────────────────────────
  const [posts, setPosts] = useState<NoticePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const allPostsRef = useRef<NoticePost[]>([]);

  const [forwardContent, setForwardContent] = useState<ForwardableContent | null>(null);
  const [isForwardVisible, setIsForwardVisible] = useState(false);

  const handleForwardDeptNotice = useCallback((post: NoticePost) => {
    setForwardContent({
      contentId: post.id,
      contentType: 'dept_notice',
      title: post.text ? (post.text.length > 50 ? post.text.substring(0, 50).replace(/\n/g, ' ') + '...' : post.text.replace(/\n/g, ' ')) : 'Image attached',
      subtitle: `${deptShort} Notice Board`,
      senderName: post.authorName,
      emoji: '📢',
      imageUrl: post.images?.[0],
    });
    setIsForwardVisible(true);
  }, [deptShort]);

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Fullscreen viewer
  const [viewerUrls, setViewerUrls] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  };

  // ── Realtime listener (first page) ──────────────────────────────────────────
  useEffect(() => {
    if (!deptId) return;

    // 1. Mark as read in global stats
    useAppStore.getState().markDeptNoticeAsRead(deptId);
    useAppStore.getState().markRoomAsRead(deptId);

    // 2. Setup Realtime Listener
    const ref = collection(db, 'deptNoticeBoard', deptId, 'posts');
    const q = query(ref, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data({ serverTimestamps: 'estimate' }),
        images: d.data({ serverTimestamps: 'estimate' }).images ?? [],
        link: d.data({ serverTimestamps: 'estimate' }).link ?? '',
      } as NoticePost));

      // Pinned first, then newest
      data.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });

      allPostsRef.current = data;
      setPosts(data);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoading(false);
    }, (error) => {
      console.error('deptNoticeBoard sync error:', error);
      setLoading(false);
    });

    return () => {
      unsub();
    };
  }, [deptId]);

  // ── Load more ───────────────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!deptId || !hasMore || loadingMore || !lastDocRef.current) return;
    setLoadingMore(true);
    try {
      const ref = collection(db, 'deptNoticeBoard', deptId, 'posts');
      const q = query(ref, orderBy('createdAt', 'desc'), startAfter(lastDocRef.current), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      const more = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        images: d.data().images ?? [],
        link: d.data().link ?? '',
      } as NoticePost));
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setPosts(prev => {
        const ids = new Set(prev.map(p => p.id));
        return [...prev, ...more.filter(p => !ids.has(p.id))];
      });
    } catch (e) {
      console.error('Load more error:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [deptId, hasMore, loadingMore]);

  // ── Image picker ────────────────────────────────────────────────────────────
  const handlePickImage = useCallback(async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit', `Maximum ${MAX_IMAGES} images allowed per post.`);
      return;
    }
    const result = await pickMediaWithOptions({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
    });
    if (!result.error && result.uri) {
      setImages(prev => [...prev, result.uri!].slice(0, MAX_IMAGES));
    }
  }, [images]);

  // ── Post ─────────────────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!text.trim() && images.length === 0) {
      Alert.alert('Empty Post', 'Please write something or add an image.');
      return;
    }
    if (text.trim() && containsProfanity(text.trim())) {
      Alert.alert('Warning', 'Abusive or offensive language is not allowed.');
      return;
    }
    if (!user || !deptId) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const uri of images) {
        const url = await uploadToCloudinary(uri, 'low');
        if (url) uploadedUrls.push(url);
      }

      const displayRole = (user as any).adminRole ? 'Admin' : (user.role || 'Faculty');

      const newPostData = {
        text: toSentenceCase(text.trim()),
        images: uploadedUrls,
        link: link.trim() || '',
        authorId: user.uid,
        authorName: user.name || 'Faculty',
        authorRole: displayRole,
        authorAvatar: user.photoUrl || null,
        isPinned: false,
        deptId,
      };

      const docRef = await addDoc(collection(db, 'deptNoticeBoard', deptId, 'posts'), {
        ...newPostData,
        createdAt: serverTimestamp(),
      });
      
      // onSnapshot automatically receives the new post immediately via local latency compensation.
      // Do not manually append to allPostsRef to prevent duplicate keys causing crashes!
      // Update global department notice stats for red dot unread logic
      try {
        await setDoc(doc(db, 'globals', 'deptNoticeStats'), {
          [deptId]: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn("Failed to update global dept notice stats:", err);
      }

      setText('');
      setLink('');
      setImages([]);
      setComposeOpen(false);

      // Notify students (fire-and-forget)
      const usersRef = collection(db, 'users');
      const studentQ = query(usersRef, where('department', '==', deptId), where('role', '==', 'Student'));
      getDocs(studentQ).then(async (snap) => {
        if (snap.empty) return;
        const batch = writeBatch(db);
        const tokens: string[] = [];
        snap.forEach((docSnap) => {
          const notifRef = doc(collection(db, 'users', docSnap.id, 'notifications'));
          batch.set(notifRef, {
            title: `New Notice: ${deptShort} Department`,
            body: text ? (text.length > 40 ? text.substring(0, 40) + '...' : text) : 'A new notice has been posted.',
            type: 'notice',
            isRead: false,
            timestamp: serverTimestamp(),
            link: `/dept-room?deptId=${deptId}`,
            icon: 'megaphone-outline',
          });
          if (docSnap.data().expoPushToken) tokens.push(docSnap.data().expoPushToken);
        });
        await batch.commit().catch(console.error);
        updateDoc(doc(db, 'globals', 'roomStats'), { [deptId]: increment(1) })
          .catch(() => setDoc(doc(db, 'globals', 'roomStats'), { [deptId]: 1 }, { merge: true }).catch(console.error));
        if (tokens.length > 0) {
          fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: tokens,
              sound: 'default',
              title: `📢 ${deptShort} Notice Board`,
              body: text ? (text.length > 60 ? text.substring(0, 60) + '...' : text) : 'New notice posted by faculty.',
              data: { url: `/dept-room?deptId=${deptId}` },
            }),
          }).catch(console.error);
        }
      }).catch(console.error);
      // Show success toast to the user immediately
      showToast('Notice posted successfully! 🎉');

      setText('');
      setLink('');
      setImages([]);
      setComposeOpen(false);
    } catch (e) {
      Alert.alert('Error', 'Post nahi ho paya. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Pin / Delete ─────────────────────────────────────────────────────────────
  const handlePin = async (post: NoticePost) => {
    try {
      await updateDoc(doc(db, 'deptNoticeBoard', deptId!, 'posts', post.id), { isPinned: !post.isPinned });
    } catch {
      Alert.alert('Error', 'Pin update failed.');
    }
  };

  const handleDelete = async (post: NoticePost) => {
    // Optimistic UI — remove instantly from local state
    setPosts(prev => prev.filter(p => p.id !== post.id));
    showToast('Notice removed successfully');
    try {
      await deleteDoc(doc(db, 'deptNoticeBoard', deptId!, 'posts', post.id));
    } catch {
      // Revert optimistic update on failure
      setPosts(prev => {
        const exists = prev.find(p => p.id === post.id);
        if (exists) return prev;
        return [post, ...prev].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
        });
      });
      showToast('Delete failed. Please try again.');
    }
  };

  const openImageViewer = (url: string, allUrls: string[], index: number) => {
    setViewerUrls(allUrls.length > 0 ? allUrls : [url]);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  // ── List rendering — no useCallback to avoid stale closure on handleDelete ────
  const renderItem = ({ item, index }: { item: NoticePost; index: number }) => {
    const isFirst = index === 0;
    const isAuthor = item.authorId === user?.uid;
    const otherUser = !canPost;

    return isFirst ? (
      <FeaturedNoticeCard
        post={item}
        deptColor={deptColor}
        deptShort={deptShort}
        canManage={canManage ?? false}
        isAuthor={isAuthor}
        isOtherUser={otherUser}
        onPin={handlePin}
        onDelete={handleDelete}
        onImagePress={openImageViewer}
        onForward={handleForwardDeptNotice}
      />
    ) : (
      <SmallNoticeCard
        post={item}
        deptColor={deptColor}
        deptShort={deptShort}
        canManage={canManage ?? false}
        isAuthor={isAuthor}
        isOtherUser={otherUser}
        onPin={handlePin}
        onDelete={handleDelete}
        onImagePress={openImageViewer}
        onForward={handleForwardDeptNotice}
      />
    );
  };

  const ListFooter = () => (
    <View style={styles.listFooter}>
      {loadingMore && <ActivityIndicator size="small" color={deptColor} />}
      {!loadingMore && hasMore && posts.length >= PAGE_SIZE && (
        <TouchableOpacity
          style={[styles.loadMoreBtn, { borderColor: deptColor + '50', backgroundColor: deptColor + '0D' }]}
          onPress={loadMore}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-down-circle-outline" size={18} color={deptColor} />
          <Text style={[styles.loadMoreText, { color: deptColor }]}>Load Older Notices</Text>
        </TouchableOpacity>
      )}
      {!hasMore && posts.length > 0 && (
        <Text style={[styles.endText, { color: theme.textSecondary }]}>· All notices loaded ·</Text>
      )}
    </View>
  );

  const ListHeader = () => (
    posts.length > 1 ? (
      <View style={styles.olderHeader}>
        <View style={[styles.olderHeaderLine, { backgroundColor: theme.cardBorder }]} />
        <Text style={[styles.olderHeaderText, { color: theme.textSecondary }]}>OLDER NOTICES</Text>
        <View style={[styles.olderHeaderLine, { backgroundColor: theme.cardBorder }]} />
      </View>
    ) : null
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {deptShort} Notice Board
          </Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]} numberOfLines={1}>
            Faculty can post Notice / Updates
          </Text>
        </View>

        <View style={[styles.deptChip, { backgroundColor: deptColor + '18', borderColor: deptColor + '44' }]}>
          <View style={[styles.chipDot, { backgroundColor: deptColor }]} />
          <Text style={[styles.chipText, { color: deptColor }]}>{deptShort}</Text>
        </View>
      </View>

      {/* Feed */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={deptColor} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading notices...</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: deptColor + '15' }]}>
            <Ionicons name="megaphone-outline" size={40} color={deptColor} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No updates yet</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>No notices from {deptShort} Department</Text>
          {canPost && (
            <TouchableOpacity
              style={[styles.emptyPostBtn, { backgroundColor: deptColor }]}
              onPress={() => setComposeOpen(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.emptyPostBtnText}>Post First Notice</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={p => p.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            posts.length > 0 ? (
              <View style={[styles.latestHeader, { backgroundColor: deptColor + '10' }]}>
                <Ionicons name="megaphone" size={14} color={deptColor} />
                <Text style={[styles.latestHeaderText, { color: deptColor }]}>LATEST NOTICE</Text>
              </View>
            ) : null
          )}
          ListFooterComponent={() => (
            <>
              <ListHeader />
              <ListFooter />
            </>
          )}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews
        />
      )}

      {/* FAB for faculty/admin */}
      {canPost && posts.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: deptColor }]}
          onPress={() => setComposeOpen(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Compose Modal */}
      <Modal visible={composeOpen} animationType="slide" transparent={false} onRequestClose={() => setComposeOpen(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Compose header */}
          <View style={[styles.composeHeader, {
            backgroundColor: theme.backgroundElement,
            borderBottomColor: theme.cardBorder,
            paddingTop: insets.top || 20,
          }]}>
            <TouchableOpacity onPress={() => setComposeOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.composeTitle, { color: theme.text }]}>New Notice</Text>
              <Text style={[styles.composeSub, { color: theme.textSecondary }]}>{deptShort} Department</Text>
            </View>
            <TouchableOpacity
              style={[styles.postBtn, { backgroundColor: (!text.trim() && images.length === 0) ? '#94A3B8' : deptColor }]}
              onPress={handlePost}
              disabled={uploading || (!text.trim() && images.length === 0)}
              activeOpacity={0.85}
            >
              {uploading
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={styles.postBtnText}>Post</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.composeBody} keyboardShouldPersistTaps="handled">
            {/* Author preview */}
            <View style={styles.composeAuthorRow}>
              {user?.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} style={styles.composeAvatar} />
              ) : (
                <View style={[styles.composeAvatarFallback, { backgroundColor: deptColor + '22' }]}>
                  <Ionicons name="person" size={18} color={deptColor} />
                </View>
              )}
              <View>
                <Text style={[styles.composeAuthorName, { color: theme.text }]}>{user?.name || 'Faculty'}</Text>
                <View style={[styles.roleBadge, { backgroundColor: deptColor + '18' }]}>
                  <Text style={[styles.roleText, { color: deptColor }]}>{(user as any)?.adminRole ? 'Admin' : (user?.role || 'Faculty')}</Text>
                </View>
              </View>
            </View>

            {/* Text area */}
            <TextInput
              style={[styles.composeInput, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}
              placeholder={`Write a notice for ${deptShort} department...`}
              placeholderTextColor={theme.textSecondary}
              multiline
              value={text}
              onChangeText={t => { if (t.length <= MAX_CHARS) setText(t); }}
              autoFocus
              textAlignVertical="top"
             autoCapitalize="sentences" />
            <Text style={[styles.charCount, { color: text.length > MAX_CHARS * 0.9 ? '#EF4444' : theme.textSecondary }]}>
              {text.length} / {MAX_CHARS}
            </Text>

            {/* Link field */}
            <View style={[styles.linkInputRow, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="link-outline" size={16} color={theme.textSecondary} />
              <TextInput
                style={[styles.linkInput, { color: theme.text }]}
                placeholder="Add a link (optional)"
                placeholderTextColor={theme.textSecondary}
                value={link}
                onChangeText={setLink}
                autoCapitalize="none"
                keyboardType="url"
              />
              {!!link && (
                <TouchableOpacity onPress={() => setLink('')}>
                  <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Image strip */}
            {images.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageStrip}>
                {images.map((uri, i) => (
                  <View key={i} style={styles.imageThumbWrap}>
                    <Image source={{ uri }} style={styles.imageThumb} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Add image button */}
            {images.length < MAX_IMAGES && (
              <TouchableOpacity
                style={[styles.addImageBtn, { borderColor: deptColor + '55', backgroundColor: deptColor + '08' }]}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                <Ionicons name="image-outline" size={20} color={deptColor} />
                <Text style={[styles.addImageText, { color: deptColor }]}>
                  Add Image ({images.length}/{MAX_IMAGES})  — Optional
                </Text>
              </TouchableOpacity>
            )}

            {/* Tips */}
            <View style={[styles.tipBox, { backgroundColor: deptColor + '0D', borderColor: deptColor + '30' }]}>
              <Ionicons name="information-circle-outline" size={16} color={deptColor} />
              <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                Max {MAX_CHARS} characters · Up to {MAX_IMAGES} images · Add a link for reference · Pinned posts appear at top
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Fullscreen Image Viewer */}
      <ImageViewing
        images={viewerUrls.map(url => ({ uri: url }))}
        imageIndex={viewerIndex}
        visible={viewerOpen}
        onRequestClose={() => setViewerOpen(false)}
        swipeToCloseEnabled={false}
        doubleTapToZoomEnabled={true}
      />

      {/* Universal Forward Sheet */}
      <ForwardSheet
        visible={isForwardVisible}
        content={forwardContent}
        onClose={() => { setIsForwardVisible(false); setForwardContent(null); }}
      />

      {/* Toast notification */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastOpacity,
              backgroundColor: toastMsg.includes('failed') ? '#EF4444' : '#1E293B',
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons
            name={toastMsg.includes('failed') ? 'alert-circle' : 'checkmark-circle'}
            size={18}
            color="#FFF"
          />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
    maxWidth: 300,
  },
  toastText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Header
  header: {
    height: 60,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 11, marginTop: 1 },
  deptChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 11, fontWeight: '800' },

  // List
  list: { padding: 16, paddingBottom: 120 },
  latestHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, marginBottom: 10,
    alignSelf: 'flex-start',
  },
  latestHeaderText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  olderHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 20, marginBottom: 12,
  },
  olderHeaderLine: { flex: 1, height: 1 },
  olderHeaderText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  listFooter: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  loadMoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1,
  },
  loadMoreText: { fontSize: 13, fontWeight: '700' },
  endText: { fontSize: 12, fontWeight: '500' },

  // ── Featured Card ────────────────────────────────────────────────────────────
  featuredCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 6,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  pinnedRibbon: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  pinnedRibbonText: { fontSize: 10, fontWeight: '900', color: '#FFF', letterSpacing: 0.6 },

  featuredNewBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1,
  },
  featuredNewDot: { width: 6, height: 6, borderRadius: 3 },
  featuredNewText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  featuredAuthorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  featuredAvatar: { width: 44, height: 44, borderRadius: 22 },
  featuredAvatarFallback: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  featuredAuthorName: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  featuredMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featuredMeta: { fontSize: 11 },

  roleBadge: {
    paddingHorizontal: 8, paddingVertical: 2.5,
    borderRadius: 6,
  },
  roleText: { fontSize: 10, fontWeight: '800' },

  featuredText: {
    fontSize: 15, lineHeight: 23,
    paddingHorizontal: 16, paddingBottom: 12,
    fontWeight: '500',
  },
  linkChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
  },
  linkChipText: { flex: 1, fontSize: 12, fontWeight: '600' },

  featuredImagesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  featuredImageWrapper: { width: '48.5%', height: 140 },
  featuredImageSingle: { width: '100%', height: 200 },
  featuredImageWide: { width: '100%', height: 160 },
  moreImagesOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  moreImagesText: { color: '#FFF', fontSize: 20, fontWeight: '800' },

  featuredActions: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12,
  },
  actionPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  actionPillText: { fontSize: 12, fontWeight: '700' },

  moreBtn: { padding: 4 },

  // ── Small Card ──────────────────────────────────────────────────────────────
  smallCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  smallPinnedBar: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  smallPinnedText: { fontSize: 9, fontWeight: '900', color: '#FFF', letterSpacing: 0.4 },
  smallCardInner: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 12, gap: 10,
  },
  smallCardLeft: { flex: 1 },
  smallAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  smallAvatar: { width: 32, height: 32, borderRadius: 16 },
  smallAvatarFallback: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  smallAuthorName: { fontSize: 12, fontWeight: '800' },
  smallMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  smallRoleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  smallRoleText: { fontSize: 9, fontWeight: '800' },
  smallTime: { fontSize: 10 },
  smallCardText: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  smallLinkChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 7, borderWidth: 1, marginBottom: 8,
  },
  smallLinkText: { fontSize: 10, fontWeight: '600', flex: 1 },
  smallActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  smallAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  smallActionText: { fontSize: 11, fontWeight: '700' },
  smallThumbnailWrap: { position: 'relative' },
  smallThumbnail: { width: 80, height: 80, borderRadius: 10 },
  smallImageCount: {
    position: 'absolute', bottom: 4, right: 4,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  smallImageCountText: { color: '#FFF', fontSize: 9, fontWeight: '800' },

  // ── Shared Menu ─────────────────────────────────────────────────────────────
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  menuBox: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 8, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  menuLabel: { fontSize: 15, fontWeight: '600' },
  menuDivider: { height: 1, marginHorizontal: 16 },

  // ── Empty / Loading ──────────────────────────────────────────────────────────
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { fontSize: 12, marginTop: 10 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyPostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  emptyPostBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  // ── FAB ──────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute', right: 20, bottom: 28,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },

  // ── Compose ───────────────────────────────────────────────────────────────────
  composeHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  closeBtn: { padding: 4 },
  composeTitle: { fontSize: 17, fontWeight: '800' },
  composeSub: { fontSize: 11, marginTop: 1 },
  postBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  postBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  composeBody: { padding: 16 },
  composeAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  composeAvatar: { width: 44, height: 44, borderRadius: 22 },
  composeAvatarFallback: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  composeAuthorName: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  composeInput: {
    fontSize: 15, lineHeight: 24, borderWidth: 1, borderRadius: 14,
    padding: 14, minHeight: 120, textAlignVertical: 'top', marginBottom: 6,
  },
  charCount: { fontSize: 11, textAlign: 'right', marginBottom: 14 },
  linkInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 14,
  },
  linkInput: { flex: 1, fontSize: 13, padding: 0 },
  imageStrip: { marginBottom: 12 },
  imageThumbWrap: { marginRight: 10, position: 'relative' },
  imageThumb: { width: 90, height: 90, borderRadius: 10 },
  removeImageBtn: { position: 'absolute', top: -6, right: -6 },
  addImageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    justifyContent: 'center', marginBottom: 16,
  },
  addImageText: { fontWeight: '700', fontSize: 13 },
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderWidth: 1, borderRadius: 12, padding: 12,
  },
  tipText: { flex: 1, fontSize: 11.5, lineHeight: 17 },

  // ── Fullscreen Viewer ─────────────────────────────────────────────────────────
  fullscreenOverlay: {
    flex: 1, backgroundColor: '#000000F0',
    justifyContent: 'center', alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute', top: 50, right: 20, zIndex: 10,
    padding: 10, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 22,
  },
  fullscreenCounter: {
    position: 'absolute', top: 56, alignSelf: 'center',
    color: '#FFF', fontSize: 13, fontWeight: '700', opacity: 0.8,
    zIndex: 10,
  },
  dotRow: {
    position: 'absolute', bottom: 40,
    flexDirection: 'row', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#FFF', width: 18 },
});
