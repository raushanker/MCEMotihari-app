import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Alert,  Modal, Platform, ScrollView } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { Post, useAppStore } from '@/store/useAppStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getOptimizedImageUrl } from '@/utils/cloudinary';
import { canReportContent } from '@/utils/permissions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFormattedPostTime } from '@/utils/timeFormat';

const { width } = Dimensions.get('window');

interface PostCardProps {
  item: Post;
  user: any;
  connectionStatus?: 'Connect' | 'Sent' | 'Connected';
  onClap: (postId: string) => void;
  onCommentPress: (post: Post) => void;
  onVote: (postId: string, optionId: string) => void;
  onConnectToggle?: (authorName: string, authorUid?: string, authorRole?: string, authorPhoto?: string) => void;
  onLinkPress?: (url: string) => void;
  onSharePress?: () => void;
  onForwardPress?: () => void;
  onAuthorPress?: (author: { name: string; role: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest' | 'Admin'; photoUrl?: string; uid?: string; username?: string }) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onEditPost?: (postId: string, newContent: string) => void;
  onBlockAuthor?: (authorUid: string) => void;
  onPressCard?: (postId: string) => void;
  hideHeader?: boolean;
}

function PostCardInternal({
  item,
  user,
  connectionStatus = 'Connect',
  onClap,
  onCommentPress,
  onVote,
  onConnectToggle,
  onLinkPress,
  onSharePress,
  onForwardPress,
  onAuthorPress,
  isBookmarked = false,
  onToggleBookmark,
  onDeletePost,
  onEditPost,
  onBlockAuthor,
  onPressCard,
  hideHeader
}: PostCardProps) {
  const theme = useThemeColors();
  const votedOptionIds = item.userVotedOptionIds || (item.userVotedOptionId ? [item.userVotedOptionId] : []);
  const isVoted = votedOptionIds.length > 0;

  const [isOptionsVisible, setIsOptionsVisible] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [editText, setEditText] = React.useState(item.content);
  const [isLightboxVisible, setIsLightboxVisible] = React.useState(false);
  const [isLightboxOverlayVisible, setIsLightboxOverlayVisible] = React.useState(true);
  const [isCaptionExpanded, setIsCaptionExpanded] = React.useState(false);
  const [zoomScale, setZoomScale] = React.useState(1);
  const lastTapRef = React.useRef<number>(0);
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef<ScrollView>(null);

  const handleImageDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      setZoomScale(prev => (prev === 1 ? 2.5 : 1));
    } else {
      lastTapRef.current = now;
    }
  };



  const isSelf = item.authorUid && item.authorUid === user?.uid;
  
  // Real-time dynamic overrides for the current user to instantly reflect profile edits everywhere
  const displayAuthorName = isSelf && user?.name ? user.name : item.authorName;
  const displayAuthorRole = isSelf && user?.role ? (user.adminRole ? 'Admin' : user.role) : item.authorRole;
  const displayAuthorPhoto = isSelf && user?.photoUrl ? user.photoUrl : item.authorPhoto;

  // Super admin check — uid-based + adminRole field
  const SUPER_ADMIN_UIDS = ['Zdxi8kTc2kcs1cOPxWS81PTVmco2', 'DdP2c855PSRUJwhmN9rvbkYBraP2'];
  const isSuperAdminPost = !item.isAnonymous && (
    (item.authorUid && SUPER_ADMIN_UIDS.includes(item.authorUid)) ||
    item.authorAdminRole === 'SUPER_ADMIN'
  );

  const isOwnPost = item.authorUid ? (item.authorUid === user?.uid) : false;

  const ADMIN_EMAILS = ["aman.kumar@mce.ac.in", "mceconnect.help@gmail.com"];
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
  const isOwnerOrAdmin = isOwnPost || isAdmin;

  const handleOpenOptionsMenu = () => {
    setIsOptionsVisible(true);
  };

  // Custom Inline Markdown Formatter
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, lineIndex) => {
      // Check if line is a bullet point
      const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;

      // Regular expressions for bold (**text**) and italic (*text*)
      const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
      const parts = cleanLine.split(regex);

      const parsedLine = parts.map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={`bold-${partIndex}`} style={styles.boldText}>
              {part.slice(2, -2)}
            </Text>
          );
        } else if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <Text key={`italic-${partIndex}`} style={styles.italicText}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        return part;
      });

      return (
        <View key={`line-${lineIndex}`} style={styles.contentLineRow}>
          {isBullet && <Text style={[styles.bulletDot, { color: theme.textSecondary }]}>•</Text>}
          <Text style={[styles.postContentText, isBullet && styles.bulletText, { color: theme.text }]}>
            {parsedLine}
          </Text>
        </View>
      );
    });
  };

  const shouldShowReadMore = item.content.length > 200 || item.content.split('\n').length > 5;
  const displayText = isExpanded ? item.content : (shouldShowReadMore ? item.content.slice(0, 180) + '...' : item.content);

  return (
    <TouchableOpacity 
      activeOpacity={onPressCard ? 0.95 : 1}
      onPress={() => {
        if (!isEditing && onPressCard) {
          onPressCard(item.id);
        }
      }}
      style={[
        styles.postCard, 
        { 
          backgroundColor: theme.backgroundElement, 
          borderColor: theme.cardBorder,
          shadowColor: theme.isDark ? '#000000' : '#0F172A',
          shadowOpacity: theme.isDark ? 0.35 : 0.05,
          shadowRadius: 16,
        }
      ]}
    >
      {item.isHidden && (
        <View style={[styles.hiddenWarningBanner, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2', borderColor: theme.isDark ? 'rgba(239, 68, 68, 0.3)' : '#FEE2E2' }]}>
          <Ionicons name="eye-off" size={14} color="#EF4444" style={{ marginRight: 6 }} />
          <Text style={[styles.hiddenWarningText, { color: '#EF4444' }]}>
            Hidden by moderators (Visible only to you)
          </Text>
        </View>
      )}
      {/* 1. Header Block */}
      {!hideHeader && (
      <View style={styles.postHeader}>
        {item.isAnonymous ? (
          <View style={[styles.anonymousAvatar, { backgroundColor: theme.background, borderColor: theme.cardBorder, borderWidth: 1 }]}>
            <Ionicons name="eye-off-outline" size={18} color={theme.textSecondary} />
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onAuthorPress?.({ name: displayAuthorName, role: displayAuthorRole, photoUrl: displayAuthorPhoto, uid: item.authorUid, username: item.authorUid })}
          >
            <Image
              source={{ uri: getOptimizedImageUrl(displayAuthorPhoto || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix', 100) }}
              style={[styles.authorPhoto, { borderColor: theme.cardBorder, borderWidth: 1 }]}
            />
          </TouchableOpacity>
        )}

        <View style={styles.postMeta}>
          <View style={styles.authorTitleRow}>
            {item.isAnonymous ? (
              <Text style={[styles.postName, { color: theme.text }]}>Anonymous Student</Text>
            ) : isSuperAdminPost ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.postName, { color: theme.text }]}>
                  Notice
                </Text>
                <MaterialIcons name="verified" size={15} color="#1D9BF0" />
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onAuthorPress?.({ name: displayAuthorName, role: displayAuthorRole, photoUrl: displayAuthorPhoto, uid: item.authorUid, username: item.authorUid })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Text style={[styles.postName, { color: theme.text }]}>
                  {displayAuthorName}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.postTime, { color: theme.textSecondary }]}>
            {item.isAnonymous
              ? `Shared Anonymously • ${getFormattedPostTime(item.createdAt, item.timestamp)}`
              : ['Student', 'Alumni', 'Faculty', 'Admin'].includes(displayAuthorRole)
              ? `${displayAuthorRole} • ${getFormattedPostTime(item.createdAt, item.timestamp)}`
              : getFormattedPostTime(item.createdAt, item.timestamp)}
          </Text>
          {item.category && item.category !== 'General' && (
            <View style={[styles.channelBadge, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.12)' : '#FFF7ED', borderColor: theme.isDark ? 'rgba(249, 115, 22, 0.25)' : '#FED7AA' }]}>
              <Ionicons 
                name={
                  item.category === 'Placement' ? 'briefcase' :
                  item.category === 'Clubs' ? 'trophy' :
                  item.category === 'Hostels' ? 'home' :
                  item.category === 'Departments' ? 'school' :
                  item.category === 'Sports' ? 'football' :
                  item.category === 'Alumni' ? 'ribbon' : 'chatbubbles'
                } 
                size={10} 
                color="#F97316" 
              />
              <Text style={[styles.channelBadgeText, { color: '#F97316' }]}>
                {
                  item.category === 'Placement' ? 'Career & Placement' :
                  item.category === 'Clubs' ? 'Campus Clubs' :
                  item.category === 'Hostels' ? 'Hostel Feeds' :
                  item.category === 'Departments' ? 'Departments' :
                  item.category === 'Sports' ? 'Sports & Fests' :
                  item.category === 'Alumni' ? 'Alumni Network' : item.category
                }
              </Text>
            </View>
          )}
        </View>

        {/* Connect Button (hidden for self or anonymous posts, or if user is not logged in) */}
        {!item.isAnonymous && user && displayAuthorName !== user?.name && onConnectToggle && (
          <TouchableOpacity
            style={[
              styles.cardConnectBtn,
              connectionStatus === 'Connect' && { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.12)' : '#FFF7ED', borderColor: theme.isDark ? 'rgba(249, 115, 22, 0.25)' : '#FED7AA' },
              connectionStatus === 'Sent' && [styles.cardConnectBtnPending, theme.isDark && { backgroundColor: 'rgba(234, 88, 12, 0.12)', borderColor: 'rgba(234, 88, 12, 0.25)' }],
              connectionStatus === 'Connected' && [styles.cardConnectBtnActive, theme.isDark && { backgroundColor: 'rgba(22, 163, 74, 0.12)', borderColor: 'rgba(22, 163, 74, 0.25)' }]
            ]}
            onPress={() => onConnectToggle(displayAuthorName, item.authorUid, displayAuthorRole, displayAuthorPhoto)}
            disabled={connectionStatus === 'Connected' || connectionStatus === 'Sent'}
            activeOpacity={0.8}
          >
            <Ionicons
              name={connectionStatus === 'Connected' ? 'checkmark' : connectionStatus === 'Sent' ? 'time' : 'person-add'}
              size={11}
              color={connectionStatus === 'Connect' ? '#F97316' : connectionStatus === 'Sent' ? '#EA580C' : '#16A34A'}
            />
            <Text
              style={[
                styles.cardConnectBtnText,
                connectionStatus === 'Sent' && { color: '#EA580C' },
                connectionStatus === 'Connected' && { color: '#16A34A' }
              ]}
            >
              {connectionStatus === 'Connect' ? 'Connect' : connectionStatus === 'Sent' ? 'Request Sent' : 'Connected'}
            </Text>
          </TouchableOpacity>
        )}

        {/* 3-dots actions menu button */}
        <TouchableOpacity
          style={styles.moreOptionsBtn}
          onPress={handleOpenOptionsMenu}
          activeOpacity={0.65}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
      )}

      {/* 2. Post Title & Formatted Content */}
      <View style={{ flex: 1 }}>
        {item.title ? (
          <Text style={[styles.postTitle, { color: theme.text }]}>{item.title}</Text>
        ) : null}
        
        {isEditing ? (
          <View style={[styles.editContainer, { borderColor: theme.cardBorder }]}>
            <TextInput
              style={[styles.editInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.cardBorder }]}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
             autoCapitalize="sentences" />
            <View style={styles.editActions}>
              <TouchableOpacity 
                style={[styles.editBtn, styles.cancelBtn, { borderColor: theme.cardBorder }]} 
                onPress={() => setIsEditing(false)}
              >
                <Text style={[styles.editBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.editBtn, styles.saveBtn]} 
                onPress={() => {
                  if (!editText.trim()) {
                    Alert.alert('Empty Post', 'Post content cannot be empty!');
                    return;
                  }
                  onEditPost?.(item.id, editText.trim());
                  setIsEditing(false);
                }}
              >
                <Text style={[styles.editBtnText, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.postContentContainer}>
            {renderFormattedContent(displayText)}
            {shouldShowReadMore && (
              <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7} style={styles.readMoreBtn}>
                <Text style={[styles.readMoreText, { color: theme.isDark ? '#F43F5E' : '#E11D48' }]}>
                  {isExpanded ? 'show less' : 'read more....'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 3. Optional Image Attachment */}
        {item.imageUrl && (
          <TouchableOpacity 
            onPress={() => {
              setIsLightboxVisible(true);
            }}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: getOptimizedImageUrl(item.imageUrl, 600) }}
              style={styles.postImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* 4. Optional Link Embed Card */}
      {item.linkUrl && item.linkPreview && (
        <TouchableOpacity
          style={[styles.linkCard, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
          onPress={() => onLinkPress ? onLinkPress(item.linkUrl!) : alert(`Opening link: ${item.linkUrl}`)}
          activeOpacity={0.85}
        >
          <View style={styles.linkMeta}>
            <Text style={styles.linkDomain}>{item.linkPreview.domain.toUpperCase()}</Text>
            <Text style={[styles.linkTitle, { color: theme.text }]} numberOfLines={1}>{item.linkPreview.title}</Text>
            <Text style={[styles.linkDesc, { color: theme.textSecondary }]} numberOfLines={1}>{item.linkPreview.description}</Text>
          </View>
          <View style={[styles.linkIconBox, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="link-outline" size={16} color={theme.textSecondary} />
          </View>
        </TouchableOpacity>
      )}

      {/* 5. Optional Poll Container */}
      {item.pollOptions && item.pollOptions.length > 0 && (
        <View style={[styles.pollContainer, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
          {item.pollOptions.map((opt) => {
            const optionVotes = opt.votes || 0;
            const totalVotes = item.totalVotes || 1;
            const percent = Math.round((optionVotes / totalVotes) * 100);
            const isVotedOption = votedOptionIds.includes(opt.id);

            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.pollOption,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                  isVotedOption && styles.pollOptionVoted
                ]}
                onPress={() => onVote(item.id, opt.id)}
                disabled={isVoted}
                activeOpacity={0.8}
              >
                {isVoted && (
                  <View 
                    style={[
                      styles.pollBar, 
                      { width: `${percent}%`, backgroundColor: theme.backgroundSelected }, 
                      isVotedOption && styles.pollBarVotedFill
                    ]} 
                  />
                )}
                <Text style={[styles.pollOptionLabel, { color: theme.text }, isVotedOption && styles.pollOptionLabelVoted]}>
                  {opt.label}
                </Text>
                {isVoted && (
                  <Text style={[styles.pollVotes, { color: theme.textSecondary }]}>
                    {optionVotes} ({percent}%)
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
          <Text style={[styles.pollTotalVotes, { color: theme.textSecondary }]}>
            📊 {item.totalVotes || 0} total votes • {isVoted ? 'Thanks for voting!' : 'Select an option to vote'}
          </Text>
        </View>
      )}

      {/* 6. Action Bar Footer */}
      <View style={[styles.cardActions, { borderColor: theme.background }]}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onClap(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={(user && user.role !== 'Guest' && item.isClapped) ? 'heart' : 'heart-outline'}
            size={18}
            color={(user && user.role !== 'Guest' && item.isClapped) ? '#EF4444' : theme.textSecondary}
          />
          {item.claps > 0 && (
            <Text style={[styles.actionText, { color: theme.textSecondary }, (user && user.role !== 'Guest' && item.isClapped) && styles.clappedText]}>
              {item.claps}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onCommentPress(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={18} color={theme.textSecondary} />
          {item.commentsCount > 0 && (
            <Text style={[styles.actionText, { color: theme.textSecondary }]}>{item.commentsCount}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onSharePress ? onSharePress() : alert('Link copied to clipboard!')}
          activeOpacity={0.7}
        >
          <Ionicons name="share-social-outline" size={18} color={theme.textSecondary} />

        </TouchableOpacity>

        {/* Forward button */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onForwardPress?.()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-redo-outline" size={18} color={theme.textSecondary} />

        </TouchableOpacity>
      </View>

      {/* ─── WEB & MOBILE UNIFIED ACTION SHEET MODAL ─── */}
      <Modal
        visible={isOptionsVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsOptionsVisible(false)}
      >
        <TouchableOpacity 
          style={styles.actionSheetBackdrop} 
          activeOpacity={1} 
          onPress={() => setIsOptionsVisible(false)}
        >
          <View style={[styles.actionSheetCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={styles.actionSheetHeader}>
              <Text style={[styles.actionSheetTitle, { color: theme.text }]}>Post Options</Text>
              <Text style={[styles.actionSheetSub, { color: theme.textSecondary }]}>Choose an action for this post</Text>
            </View>

            <View style={styles.actionSheetOptions}>
              {/* Save / Unsave Option */}
              <TouchableOpacity
                style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                onPress={() => {
                  setIsOptionsVisible(false);
                  onToggleBookmark?.(item.id);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={18} color="#F97316" style={{ marginRight: 6 }} />
                <Text style={[styles.actionSheetBtnText, { color: theme.text }]}>
                  {isBookmarked ? 'Unsave Post' : 'Save Post'}
                </Text>
              </TouchableOpacity>

              {/* Edit Option (if own post & not poll) */}
              {isOwnPost && !(item.pollOptions && item.pollOptions.length > 0) && (
                <TouchableOpacity
                  style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                  onPress={() => {
                    setIsOptionsVisible(false);
                    setEditText(item.content);
                    setIsEditing(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color="#3B82F6" style={{ marginRight: 6 }} />
                  <Text style={[styles.actionSheetBtnText, { color: theme.text }]}>Edit Post</Text>
                </TouchableOpacity>
              )}

              {/* Turn Off/On Comments Option (if own post) */}
              {isOwnPost && (
                <TouchableOpacity
                  style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                  onPress={async () => {
                    setIsOptionsVisible(false);
                    try {
                      await useAppStore.getState().togglePostCommentsDisabled(item.id, !item.commentsDisabled);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={item.commentsDisabled ? "chatbubble-outline" : "chatbubble-ellipses-outline"} 
                    size={18} 
                    color={theme.text} 
                    style={{ marginRight: 6 }} 
                  />
                  <Text style={[styles.actionSheetBtnText, { color: theme.text }]}>
                    {item.commentsDisabled ? 'Turn On Comments' : 'Turn Off Comments'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Delete Option (if own post) */}
              {isOwnerOrAdmin && (
                <TouchableOpacity
                  style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                  onPress={() => {
                    setIsOptionsVisible(false);
                    setTimeout(() => {
                      if (Platform.OS === 'web') {
                        const confirmed = window.confirm("Are you sure you want to permanently delete this post?");
                        if (confirmed) onDeletePost?.(item.id);
                      } else {
                        Alert.alert(
                          'Delete Post',
                          'Are you sure you want to permanently delete this post?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => onDeletePost?.(item.id) }
                          ]
                        );
                      }
                    }, 100);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={[styles.actionSheetBtnText, { color: '#EF4444' }]}>Delete Post</Text>
                </TouchableOpacity>
              )}

              {/* Report Option (if allowed) */}
              {!isOwnPost && canReportContent(user?.uid, item.authorUid, user?.name, displayAuthorName) && (
                <TouchableOpacity
                  style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                  onPress={() => {
                    setIsOptionsVisible(false);
                    setTimeout(() => {
                      if (Platform.OS === 'web') {
                        const confirmed = window.confirm("Are you sure you want to report this post for violating community guidelines?");
                        if (confirmed) {
                          useAppStore.getState().reportPost(item.id, 'Violating community guidelines');
                        }
                      } else {
                        Alert.alert(
                          'Report Post',
                          'Are you sure you want to report this post for violating community guidelines?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Report',
                              style: 'destructive',
                              onPress: () => {
                                useAppStore.getState().reportPost(item.id, 'Violating community guidelines');
                              }
                            }
                          ]
                        );
                      }
                    }, 100);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flag-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={[styles.actionSheetBtnText, { color: '#EF4444' }]}>Report Post</Text>
                </TouchableOpacity>
              )}

              {/* Block User Option (if not own post, not anonymous, and user is logged in) */}
              {!isOwnPost && user && item.authorUid && !item.isAnonymous && (
                <TouchableOpacity
                  style={[styles.actionSheetBtn, { borderBottomColor: theme.cardBorder }]}
                  onPress={() => {
                    setIsOptionsVisible(false);
                    setTimeout(() => {
                      if (Platform.OS === 'web') {
                        const confirmed = window.confirm(`Kya aap @${displayAuthorName} ko block karna chahte hain? Block karne par unka koi bhi post aapke feed me nahi dikhega.`);
                        if (confirmed) onBlockAuthor?.(item.authorUid!);
                      } else {
                        Alert.alert(
                          'Block User 🚫',
                          `Kya aap @${displayAuthorName} ko block karna chahte hain? Block karne par unka koi bhi post aapke feed me nahi dikhega.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Block', style: 'destructive', onPress: () => onBlockAuthor?.(item.authorUid!) }
                          ]
                        );
                      }
                    }, 100);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="ban" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={[styles.actionSheetBtnText, { color: '#EF4444' }]}>Block User</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.actionSheetCancelBtn, { backgroundColor: theme.background }]}
              onPress={() => setIsOptionsVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.actionSheetCancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Premium Dedicated Fullscreen Image Viewer (Facebook / LinkedIn / Instagram Style) */}
      {item.imageUrl && isLightboxVisible && (
        <Modal
          visible={isLightboxVisible}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setIsLightboxVisible(false)}
        >
          <View style={styles.customViewerContainer}>
            {/* 1. FIXED TOP HEADER BAR (Respects SafeAreaInsets) */}
            <View style={[styles.customViewerHeader, { paddingTop: Math.max(insets.top, 16) }]}>
              <TouchableOpacity 
                style={styles.customViewerHeaderBtn} 
                onPress={() => setIsLightboxVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* 2. IMAGE SECTION (Centered ScrollView for Pinch-to-Zoom & Double-Tap Scale) */}
            <ScrollView
              maximumZoomScale={5}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.customViewerZoomScroll}
              style={{ flex: 1 }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={handleImageDoubleTap}
                style={styles.customViewerImageWrapper}
              >
                <Image
                  source={{ uri: getOptimizedImageUrl(item.imageUrl, 1200) }}
                  style={[styles.customViewerImage, { transform: [{ scale: zoomScale }] }]}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </ScrollView>

            {/* 3. FLOATING BOTTOM OVERLAY (Respects Safe Area) */}
            <View style={[styles.customViewerBottomOverlay, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
              {/* Profile details row */}
              <View style={styles.customViewerProfileRow}>
                {item.isAnonymous ? (
                  <View style={styles.customViewerAvatarAnonymous}>
                    <Ionicons name="eye-off-outline" size={18} color="#CCCCCC" />
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setIsLightboxVisible(false);
                      onAuthorPress?.({ name: displayAuthorName, role: displayAuthorRole, photoUrl: displayAuthorPhoto, uid: item.authorUid, username: item.authorUid });
                    }}
                  >
                    <Image
                      source={{ uri: getOptimizedImageUrl(displayAuthorPhoto || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix', 100) }}
                      style={styles.customViewerAvatar}
                    />
                  </TouchableOpacity>
                )}

                <View style={styles.customViewerAuthorMeta}>
                  <Text style={styles.customViewerAuthorName} numberOfLines={1}>
                    {item.isAnonymous ? 'Anonymous Student' : displayAuthorName}
                  </Text>
                  <Text style={styles.customViewerAuthorRole} numberOfLines={1}>
                    {item.isAnonymous 
                      ? `Shared Anonymously • ${getFormattedPostTime(item.createdAt, item.timestamp)}`
                      : ['Student', 'Alumni', 'Faculty', 'Admin'].includes(displayAuthorRole)
                      ? `${displayAuthorRole} • ${getFormattedPostTime(item.createdAt, item.timestamp)}`
                      : `${displayAuthorRole || 'Member'} • ${getFormattedPostTime(item.createdAt, item.timestamp)}`
                    }
                  </Text>
                </View>

                {/* Connection button */}
                {!item.isAnonymous && user && displayAuthorName !== user?.name && onConnectToggle && (
                  <TouchableOpacity
                    style={[
                      styles.customViewerConnectBtn,
                      connectionStatus === 'Connect' && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                      connectionStatus === 'Sent' && { backgroundColor: 'rgba(234, 88, 12, 0.25)', borderColor: '#EA580C' },
                      connectionStatus === 'Connected' && { backgroundColor: 'rgba(22, 163, 74, 0.25)', borderColor: '#16A34A' }
                    ]}
                    onPress={() => onConnectToggle(displayAuthorName, item.authorUid, displayAuthorRole, displayAuthorPhoto)}
                    disabled={connectionStatus === 'Connected' || connectionStatus === 'Sent'}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={connectionStatus === 'Connected' ? 'checkmark-circle' : connectionStatus === 'Sent' ? 'time' : 'person-add'}
                      size={11}
                      color={connectionStatus === 'Connect' ? '#FFFFFF' : connectionStatus === 'Sent' ? '#EA580C' : '#16A34A'}
                    />
                    <Text
                      style={[
                        styles.customViewerConnectBtnText,
                        connectionStatus === 'Connect' && { color: '#FFFFFF' },
                        connectionStatus === 'Sent' && { color: '#EA580C' },
                        connectionStatus === 'Connected' && { color: '#16A34A' }
                      ]}
                    >
                      {connectionStatus === 'Connect' ? 'Connect' : connectionStatus === 'Sent' ? 'Request Sent' : 'Connected'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Short Caption */}
              {item.content ? (
                <View style={styles.customViewerCaptionContainer}>
                  <Text style={styles.customViewerCaption}>
                    {isCaptionExpanded ? item.content : (item.content.length > 120 ? `${item.content.slice(0, 120)}...` : item.content)}
                  </Text>
                  
                  {item.content.length > 120 && (
                    <TouchableOpacity 
                      style={styles.customViewerSeeMoreBtn}
                      onPress={() => setIsCaptionExpanded(!isCaptionExpanded)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.customViewerSeeMoreText}>
                        {isCaptionExpanded ? 'See Less' : 'See More'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {/* Engagement counts and Actions */}
              <View style={styles.customViewerActionRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    style={styles.customViewerActionBtn}
                    onPress={() => onClap(item.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={(user && user.role !== 'Guest' && item.isClapped) ? 'heart' : 'heart-outline'}
                      size={20}
                      color={(user && user.role !== 'Guest' && item.isClapped) ? '#EF4444' : '#FFFFFF'}
                    />
                    {item.claps > 0 && (
                      <Text style={[styles.customViewerActionText, (user && user.role !== 'Guest' && item.isClapped) && { color: '#EF4444', fontWeight: 'bold' }]}>
                        {item.claps}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.customViewerActionBtn, { marginLeft: 18 }]}
                    onPress={() => {
                      setIsLightboxVisible(false);
                      onCommentPress(item);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
                    {item.commentsCount > 0 && (
                      <Text style={styles.customViewerActionText}>
                        {item.commentsCount}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.customViewerActionBtn}
                  onPress={onSharePress}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />

                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    boxShadow: Platform.OS === 'web' ? `${0}px ${2}px ${4}px #000` : undefined,

    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  anonymousAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postMeta: {
    flex: 1,
    marginLeft: 12,
  },
  authorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  postTime: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cardConnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFE3E3',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardConnectBtnPending: {
    backgroundColor: '#FFEDD5',
    borderColor: '#FED7AA',
  },
  cardConnectBtnActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  cardConnectBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#F97316',
  },
  postTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  postContentContainer: {
    marginBottom: 10,
  },
  contentLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  bulletDot: {
    fontSize: 13,
    color: '#475569',
    marginRight: 6,
    marginTop: 1,
  },
  postContentText: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 18.5,
  },
  bulletText: {
    flex: 1,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  italicText: {
    fontStyle: 'italic',
  },
  readMoreBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  linkMeta: {
    flex: 1,
    marginRight: 10,
  },
  linkDomain: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#F97316',
    letterSpacing: 0.5,
  },
  linkTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 2,
  },
  linkDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  linkIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Poll Styling
  pollContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  pollOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  pollOptionVoted: {
    borderColor: '#FFE3E3',
  },
  pollBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFF7ED',
  },
  pollBarVotedFill: {
    backgroundColor: '#FFE3E3',
  },
  pollOptionLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    zIndex: 1,
  },
  pollOptionLabelVoted: {
    color: '#F97316',
    fontWeight: 'bold',
  },
  pollVotes: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    zIndex: 1,
  },
  pollTotalVotes: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },

  // Action Bar Footer
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  clappedText: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  moreOptionsBtn: {
    padding: 6,
    marginLeft: 6,
  },
  editContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    marginTop: 4,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13.5,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtn: {
    backgroundColor: 'transparent',
  },
  saveBtn: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionSheetCard: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  actionSheetHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionSheetSub: {
    fontSize: 11,
    marginTop: 4,
  },
  actionSheetOptions: {
    gap: 2,
    marginBottom: 16,
  },
  actionSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  actionSheetBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    marginLeft: 12,
  },
  actionSheetCancelBtn: {
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  actionSheetCancelText: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 0.5,
    marginTop: 4,
    alignSelf: 'flex-start',
    gap: 4,
  },
  channelBadgeText: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#F97316',
  },
  customViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  customViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  customViewerHeaderBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customViewerZoomScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  customViewerImageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customViewerImage: {
    width: '100%',
    height: '100%',
  },
  customViewerBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  customViewerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customViewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  customViewerAvatarAnonymous: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  customViewerAuthorMeta: {
    flex: 1,
    marginLeft: 12,
  },
  customViewerAuthorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  customViewerAuthorRole: {
    fontSize: 11,
    color: '#CCCCCC',
    marginTop: 1,
  },
  customViewerConnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  customViewerConnectBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  customViewerCaptionContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  customViewerCaption: {
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
  },
  customViewerSeeMoreBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  customViewerSeeMoreText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  customViewerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  customViewerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  customViewerActionText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  hiddenWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  hiddenWarningText: {
    fontSize: 12,
    fontWeight: '600',
  }
});

const areEqual = (prevProps: PostCardProps, nextProps: PostCardProps) => {
  // 1. Core structural comparison
  if (prevProps.item.id !== nextProps.item.id) return false;
  if (prevProps.item.claps !== nextProps.item.claps) return false;
  if (prevProps.item.isClapped !== nextProps.item.isClapped) return false;
  if (prevProps.item.commentsCount !== nextProps.item.commentsCount) return false;
  if (prevProps.item.content !== nextProps.item.content) return false;
  if (prevProps.item.title !== nextProps.item.title) return false;
  if (prevProps.item.imageUrl !== nextProps.item.imageUrl) return false;
  if (prevProps.item.totalVotes !== nextProps.item.totalVotes) return false;
  if (prevProps.item.isHidden !== nextProps.item.isHidden) return false;

  // 2. Poll options comparison
  if (prevProps.item.pollOptions !== nextProps.item.pollOptions) {
    if (JSON.stringify(prevProps.item.pollOptions) !== JSON.stringify(nextProps.item.pollOptions)) {
      return false;
    }
  }
  if (JSON.stringify(prevProps.item.userVotedOptionIds) !== JSON.stringify(nextProps.item.userVotedOptionIds)) return false;
  if (prevProps.item.userVotedOptionId !== nextProps.item.userVotedOptionId) return false;

  // 3. User comparisons
  if (prevProps.user?.name !== nextProps.user?.name) return false;
  if (prevProps.user?.id !== nextProps.user?.id) return false;

  // 4. Connection status comparisons
  if (prevProps.connectionStatus !== nextProps.connectionStatus) return false;

  // 5. Bookmark state comparison
  if (prevProps.isBookmarked !== nextProps.isBookmarked) return false;

  // 6. Callback Handlers Explanation:
  // We explicitly ignore handlers (onClap, onCommentPress, onVote, onConnectToggle, etc.)
  // because the parent component often defines them as inline arrow functions, which change
  // references on every parent render. Since these handlers are stable/bound correctly,
  // re-rendering PostCard purely due to handler reference shifts is wasteful.

  // Skip re-render if true
  return true;
};

export const PostCard = React.memo(PostCardInternal, areEqual);
