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
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
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
}

export function ForwardedMessageCard({
  contentId,
  contentType,
  forwardPreview,
  forwardedByName,
  timestamp,
  isSelf = false,
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
    const route = resolveDeepLink(contentType, contentId);
    if (route) {
      router.push(route as any);
    }
  };

  // Format timestamp
  const timeString = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  // Content unavailable state (preview missing or explicitly deleted)
  if (!forwardPreview) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.isDark ? 'rgba(239,68,68,0.08)' : '#FEF2F2',
            borderColor: theme.isDark ? 'rgba(239,68,68,0.2)' : '#FECACA',
          },
        ]}
      >
        <View style={styles.unavailableRow}>
          <Ionicons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.unavailableText}>This content is no longer available.</Text>
        </View>
      </View>
    );
  }

  const contentLabel = getContentLabel(contentType);
  const accentColor = getAccentColor(contentType);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
          borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
          borderLeftColor: accentColor,
        },
      ]}
      onPress={handleTap}
      activeOpacity={0.82}
    >
      {/* Forwarded indicator */}
      <View style={styles.forwardedBadge}>
        <Ionicons name="arrow-redo" size={11} color={theme.textSecondary} style={{ marginRight: 4 }} />
        <Text style={[styles.forwardedText, { color: theme.textSecondary }]}>
          Forwarded
        </Text>
      </View>

      {/* Main content area */}
      <View style={styles.content}>
        {/* Thumbnail (if available) */}
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
            <View style={[styles.categoryBadge, { backgroundColor: accentColor + '18', borderColor: accentColor + '30' }]}>
              <Text style={styles.categoryEmoji}>{forwardPreview.emoji}</Text>
              <Text style={[styles.categoryLabel, { color: accentColor }]}>
                {contentLabel}
              </Text>
            </View>
            {forwardPreview.price && (
              <View style={[styles.priceBadge, { backgroundColor: theme.isDark ? 'rgba(249,115,22,0.15)' : '#FFF7ED', borderColor: '#FED7AA' }]}>
                <Text style={styles.priceText}>{forwardPreview.price}</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text
            style={[styles.title, { color: theme.text }]}
            numberOfLines={2}
          >
            {forwardPreview.title}
          </Text>

          {/* Subtitle */}
          {forwardPreview.subtitle && (
            <Text
              style={[styles.subtitle, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {forwardPreview.subtitle}
            </Text>
          )}

          {/* Sender */}
          {forwardPreview.senderName && (
            <Text style={[styles.sender, { color: theme.textSecondary }]}>
              By {forwardPreview.senderName}
            </Text>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: theme.isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0' }]}>
        <Text style={[styles.openHint, { color: accentColor }]}>
          Tap to open →
        </Text>
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
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    overflow: 'hidden',
    maxWidth: 280,
  },
  unavailableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  forwardedText: {
    fontSize: 10,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  content: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 10,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    flexShrink: 0,
  },
  textContent: {
    flex: 1,
    gap: 3,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  categoryEmoji: {
    fontSize: 10,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  priceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  priceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EA580C',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  sender: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  openHint: {
    fontSize: 11,
    fontWeight: '600',
  },
});
