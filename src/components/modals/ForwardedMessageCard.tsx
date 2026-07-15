/**
 * ForwardedMessageCard — Rich Preview Card
 *
 * Rendered inside community chat when a message has type === 'forward'.
 *
 * Architecture:
 * - Uses cached forwardPreview fields for instant rendering (no extra Firestore read)
 * - On tap: deep-links to original detail screen via resolveDeepLink()
 * - If original is deleted: shows graceful "content unavailable" state (no crash)
 * - For RSS-based content (university_notice): opens externalUrl in browser
 *
 * Future-ready: adding new contentType only requires updating resolveDeepLink() in forwardEngine.ts
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.75, 300);
import { Image } from 'expo-image';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import {
  resolveDeepLink,
  getContentLabel,
  ContentType,
} from '@/utils/forwardEngine';

interface ForwardPreview {
  title: string;
  subtitle?: string | null;
  senderName?: string | null;
  emoji: string;
  imageUrl?: string | null;
  price?: string | null;
  externalUrl?: string | null;
}

interface ForwardedMessageCardProps {
  contentId: string;
  contentType: ContentType;
  forwardPreview: ForwardPreview | null;
  forwardedByName?: string;
  timestamp?: Date | null;
  // Style overrides for positioning in chat bubble
  isSelf?: boolean;
  onLongPress?: () => void;
}

export function ForwardedMessageCard({
  contentId,
  contentType,
  forwardPreview,
  forwardedByName,
  timestamp,
  isSelf = false,
  onLongPress,
}: ForwardedMessageCardProps) {
  const theme = useThemeColors();
  const router = useRouter();

  const handleTap = async () => {
    // For RSS-based content with external URL
    if (contentType === 'university_notice' && forwardPreview?.externalUrl) {
      try {
        await Linking.openURL(forwardPreview.externalUrl);
      } catch {
        // silently fail
      }
      return;
    }

    // For Firestore-backed content: deep link
    if (contentType === 'dept_notice') {
      let targetDeptId = 'civil'; // fallback
      let postId = contentId;
      
      const deptName = forwardPreview?.subtitle?.replace(' Notice Board', '')?.trim() || '';
      if (deptName.includes('Computer') || deptName.includes('CSE')) targetDeptId = 'cse';
      else if (deptName.includes('Civil')) targetDeptId = 'civil';
      else if (deptName.includes('Electrical') || deptName.includes('EEE')) targetDeptId = 'eee';
      else if (deptName.includes('Mechanical')) targetDeptId = 'mechanical';
      else if (deptName.includes('Humanities')) targetDeptId = 'humanities';
      else if (deptName.includes('AI') || deptName.includes('ML')) targetDeptId = 'cse_ai';
      
      router.push({ pathname: '/dept-room', params: { deptId: targetDeptId, highlightPost: postId } });
      return;
    }

    const route = resolveDeepLink(contentType, contentId);
    if (route) {
      router.push(route as any);
    }
  };

  // ── Color palette: adapts to isSelf (blue bubble) vs received (dark/light bg) ──
  // isSelf=true  → card is inside blue (#3B82F6) bubble
  // isSelf=false → card is inside dark (#1E293B) or light (#F1F5F9) bubble
  const cardBg = isSelf
    ? 'rgba(255,255,255,0.18)'                              // white glassy on blue
    : theme.isDark
      ? 'rgba(255,255,255,0.07)'                            // subtle white on dark
      : '#FFFFFF';                                           // clean white on light

  const cardBorder = isSelf
    ? 'rgba(255,255,255,0.25)'
    : theme.isDark
      ? 'rgba(255,255,255,0.12)'
      : '#E2E8F0';

  const textPrimary   = isSelf ? '#FFFFFF'          : theme.text;
  const textSecondary = isSelf ? 'rgba(255,255,255,0.75)' : theme.textSecondary;
  const forwardedColor = isSelf ? 'rgba(255,255,255,0.65)' : theme.textSecondary;
  const footerBorder  = isSelf ? 'rgba(255,255,255,0.2)'  : theme.isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0';
  const tapToOpenColor = isSelf ? 'rgba(255,255,255,0.9)'  : getAccentColor(contentType);

  // Content unavailable state
  if (!forwardPreview) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isSelf ? 'rgba(239,68,68,0.25)' : theme.isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
            borderColor: isSelf ? 'rgba(239,68,68,0.4)' : theme.isDark ? 'rgba(239,68,68,0.25)' : '#FECACA',
            borderLeftColor: '#EF4444',
          },
        ]}
      >
        <View style={styles.unavailableRow}>
          <Ionicons name="alert-circle-outline" size={16} color={isSelf ? '#FCA5A5' : '#EF4444'} style={{ marginRight: 8 }} />
          <Text style={[styles.unavailableText, { color: isSelf ? '#FCA5A5' : '#EF4444' }]}>
            This content is no longer available.
          </Text>
        </View>
      </View>
    );
  }

  const contentLabel = getContentLabel(contentType);
  const accentColor  = getAccentColor(contentType);

  // Badge colors inside isSelf bubble should also be white-tinted
  const badgeBg     = isSelf ? 'rgba(255,255,255,0.2)'  : accentColor + '18';
  const badgeBorder = isSelf ? 'rgba(255,255,255,0.3)'  : accentColor + '30';
  const badgeText   = isSelf ? '#FFFFFF'                 : accentColor;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
          borderLeftColor: isSelf ? 'rgba(255,255,255,0.5)' : accentColor,
        },
      ]}
      onPress={handleTap}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {/* Forwarded Header */}
      <View style={styles.forwardedBadge}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Ionicons name="arrow-redo" size={11} color={forwardedColor} style={{ marginRight: 4 }} />
          <Text style={[styles.forwardedText, { color: forwardedColor }]}>
            Forwarded
          </Text>
        </View>
        <Ionicons name="open-outline" size={14} color={forwardedColor} />
      </View>

      {/* Main content area */}
      <View style={styles.content}>
        {/* Thumbnail (YouTube Style) */}
        {forwardPreview.imageUrl && (
          <Image
            source={{ uri: forwardPreview.imageUrl }}
            style={styles.thumbnail}
            contentFit="cover"
          />
        )}

        <View style={styles.textContent}>
          {/* Category row */}
          <View style={styles.categoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
              <Text style={styles.categoryEmoji}>{forwardPreview.emoji}</Text>
              <Text style={[styles.categoryLabel, { color: badgeText }]}>
                {contentLabel}
              </Text>
            </View>
            {forwardPreview.price && (
              <View style={[styles.priceBadge, {
                backgroundColor: isSelf ? 'rgba(255,255,255,0.2)' : theme.isDark ? 'rgba(249,115,22,0.15)' : '#FFF7ED',
                borderColor: isSelf ? 'rgba(255,255,255,0.3)' : '#FED7AA',
              }]}>
                <Text style={[styles.priceText, { color: isSelf ? '#FFF' : '#EA580C' }]}>
                  {forwardPreview.price}
                </Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text
            style={[styles.title, { color: textPrimary }]}
            numberOfLines={2}
          >
            {forwardPreview.title}
          </Text>

          {/* Subtitle */}
          {forwardPreview.subtitle && (
            <Text
              style={[styles.subtitle, { color: textSecondary }]}
              numberOfLines={1}
            >
              {forwardPreview.subtitle}
            </Text>
          )}

          {/* Sender */}
          {forwardPreview.senderName && (
            <Text style={[styles.sender, { color: textSecondary }]}>
              By {forwardPreview.senderName}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Maps content type to a brand color for the card accent
function getAccentColor(contentType: ContentType): string {
  const colors: Record<string, string> = {
    post:               '#F97316',
    notice:             '#3B82F6',
    university_notice:  '#8B5CF6',
    study:              '#10B981',
    event:              '#EC4899',
    olx:                '#F59E0B',
    gig:                '#06B6D4',
    workshop:           '#6366F1',
  };
  return colors[contentType] ?? '#64748B';
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    overflow: 'hidden',
    width: MAX_CARD_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginVertical: 2,
  },
  unavailableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  unavailableText: {
    fontSize: 13,
    color: '#EF4444',
    fontStyle: 'italic',
    flex: 1,
  },
  forwardedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  forwardedText: {
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  content: {
    flexDirection: 'column',
    paddingBottom: 8,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  textContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  categoryEmoji: {
    fontSize: 11,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  priceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  priceText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    opacity: 0.9,
  },
  sender: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
    opacity: 0.8,
  }
});
