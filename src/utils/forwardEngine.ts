/**
 * Universal Forward Engine — MCE App
 *
 * A single reusable engine for forwarding any content type to community chat rooms.
 *
 * Architecture:
 * - Only a lightweight reference (contentId + contentType) is stored in Firestore.
 * - No content duplication (no images, PDFs, descriptions copied).
 * - ForwardedMessageCard fetches latest data live from Firestore on render.
 * - Deep linking resolves contentType → detail screen route.
 * - Future modules only need to register contentType + route here.
 *
 * Future-ready for:
 * - Admin Broadcast (forwardToAllRooms utility)
 * - Forward Analytics (forwardCount field)
 * - Copy Internal Link (resolveDeepLink already provides the path)
 * - External Share (pass resolved route to Share API)
 */

import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  setDoc,
  increment,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// ─── Content Types ──────────────────────────────────────────────────────────

/**
 * All supported content types.
 * To add a new module: add a new string literal here + add its route in resolveDeepLink().
 */
export type ContentType =
  | 'post'              // Feed Post → /post/[id]
  | 'notice'            // College Notice (Firestore) → /notice/[id]
  | 'university_notice' // University Notice (RSS) → opens via externalUrl
  | 'study'             // Study Material → /study/[id]
  | 'event'             // Campus Event → /event/[id]
  | 'olx'               // Marketplace Item → /olx/[id]
  | 'gig'               // Requirement/Work Post → /gigs/[id]
  | 'workshop'          // Workshop → /workshop/[id]
  | string;             // Extensible for future types

// ─── Forwardable Content Interface ──────────────────────────────────────────

/**
 * The minimal data needed to forward any content item.
 * Build this object at the card level and pass to ForwardSheet.
 *
 * Preview fields (title, subtitle, etc.) are cached in the Firestore message
 * for fast rendering — but the tap always deep-links to live original content.
 */
export interface ForwardableContent {
  contentId: string;       // Firestore document ID (or unique identifier)
  contentType: ContentType;

  // ── Preview metadata (shown on the forwarded card) ──
  title: string;           // e.g. "Engineering Mechanics Notes"
  subtitle?: string;       // e.g. "Civil Engineering • Semester 2"
  senderName?: string;     // e.g. "Raushan Kumar" (original author)
  emoji: string;           // Category icon: "📚", "📢", "🛒", "📅", etc.
  imageUrl?: string;       // Optional thumbnail
  price?: string;          // For OLX: "₹650"

  // ── For RSS-based notices without a Firestore ID ──
  externalUrl?: string;    // Opens in browser instead of deep link
}

// ─── Deep Link Resolver ──────────────────────────────────────────────────────

/**
 * Resolves a contentType + contentId to an in-app router path.
 * Returns null for external URLs (handled via Linking.openURL).
 *
 * To add a new module: add one line here.
 */
export function resolveDeepLink(
  contentType: ContentType,
  contentId: string
): string | null {
  const routes: Record<string, string> = {
    post:    `/post/${contentId}`,
    notice:  `/notice/${contentId}`,
    study:   `/study/${contentId}`,
    event:   `/event/${contentId}`,
    olx:     `/olx/${contentId}`,
    gig:     `/gigs/${contentId}`,
    workshop: `/workshop/${contentId}`,
    dept_notice: `/dept-notice/${contentId}`,
    // university_notice uses externalUrl — handled separately
  };

  return routes[contentType] ?? null;
}

// ─── Emoji Map Helper ────────────────────────────────────────────────────────

/**
 * Returns the default emoji for a content type.
 * Cards can override this with a custom emoji.
 */
export function getContentEmoji(contentType: ContentType): string {
  const emojiMap: Record<string, string> = {
    post:               '💬',
    notice:             '📢',
    university_notice:  '🏛️',
    study:              '📚',
    event:              '📅',
    olx:                '🛒',
    gig:                '💼',
    workshop:           '🛠️',
  };
  return emojiMap[contentType] ?? '📌';
}

// ─── Content Type Labels ─────────────────────────────────────────────────────

export function getContentLabel(contentType: ContentType): string {
  const labelMap: Record<string, string> = {
    post:               'Feed Post',
    notice:             'College Notice',
    university_notice:  'University Notice',
    study:              'Study Material',
    event:              'Campus Event',
    olx:                'Marketplace',
    gig:                'Requirement Post',
    workshop:           'Workshop',
  };
  return labelMap[contentType] ?? 'Content';
}

// ─── Firestore Message Writer ────────────────────────────────────────────────

/**
 * Sends a forwarded message to one or multiple community chat rooms.
 *
 * Stores ONLY:
 *   - contentId
 *   - contentType
 *   - senderUid (forwardedBy)
 *   - forwardedAt (timestamp)
 *   - preview fields (cached for fast rendering — not duplicated content)
 *
 * The message.type = 'forward' distinguishes it from regular text/image messages.
 */
export async function forwardToRooms(
  roomIds: string[],
  content: ForwardableContent,
  user: {
    uid: string;
    name: string;
    photoUrl?: string;
    role?: string;
    adminRole?: string;
    username?: string;
  }
): Promise<void> {
  if (!roomIds.length || roomIds.length > 5) {
    throw new Error('Select between 1 and 5 rooms to forward.');
  }

  const forwardPayload = {
    // Message type flag — tells community.tsx to render ForwardedMessageCard
    type: 'forward' as const,

    // ── Lightweight reference (the ONLY source of truth) ──
    contentId: content.contentId,
    contentType: content.contentType,

    // ── Cached preview for instant rendering ──
    forwardPreview: {
      title: content.title,
      subtitle: content.subtitle ?? null,
      senderName: content.senderName ?? null,
      emoji: content.emoji,
      imageUrl: content.imageUrl ?? null,
      price: content.price ?? null,
      externalUrl: content.externalUrl ?? null,
    },

    // ── Sender metadata ──
    forwardedBy: user.uid,
    forwardedByName: user.name,
    forwardedByPhoto: user.photoUrl ?? '',

    // Fields matching ChatMessage interface (for compatibility)
    senderUid: user.uid,
    senderName: user.name,
    senderPhoto: user.photoUrl ?? '',
    senderRole: user.role ?? 'Student',
    senderAdminRole: user.adminRole ?? '',
    senderUsername: user.username ?? '',

    text: '',         // Empty text — content is in forwardPreview
    isPinned: false,
    timestamp: serverTimestamp(),
  };

  // Send to all selected rooms in parallel
  await Promise.all(
    roomIds.map((roomId) =>
      addDoc(
        collection(db, 'communities', roomId, 'messages'),
        forwardPayload
      )
    )
  );

  // Increment unread counters for all target rooms
  // This triggers real-time unread badges for all other users
  const statsRef = doc(db, 'globals', 'roomStats');
  const statsUpdate: Record<string, any> = {};
  roomIds.forEach((roomId) => {
    statsUpdate[roomId] = increment(1);
  });
  setDoc(statsRef, statsUpdate, { merge: true }).catch(() => {});
}
