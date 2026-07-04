import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post, ContactConnection } from '@/store/useAppStore';

const SEEN_CACHE_KEY = '@mce_seen_post_ids_v2';
const MAX_SEEN_HISTORY = 100;
const RECENT_EXCLUSION_THRESHOLD = 20;

/**
 * 1. Recently Seen Manager
 * Manages the local cache of seen posts. Ensures that we don't repeat posts
 * that were seen recently (within the last 20 posts).
 */
export class RecentlySeenManager {
  private seenIds: string[] = [];
  
  async init() {
    try {
      const stored = await AsyncStorage.getItem(SEEN_CACHE_KEY);
      if (stored) {
        this.seenIds = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to init RecentlySeenManager', e);
    }
  }

  getRecentExclusions(): Set<string> {
    // Return the last RECENT_EXCLUSION_THRESHOLD posts
    return new Set(this.seenIds.slice(-RECENT_EXCLUSION_THRESHOLD));
  }

  getAllSeen(): Set<string> {
    return new Set(this.seenIds);
  }

  async markAsSeen(postIds: string[]) {
    // Append new ids, filtering out duplicates
    const newIds = postIds.filter(id => !this.seenIds.includes(id));
    if (newIds.length === 0) return;

    this.seenIds = [...this.seenIds, ...newIds];
    
    if (this.seenIds.length > MAX_SEEN_HISTORY) {
      this.seenIds = this.seenIds.slice(-MAX_SEEN_HISTORY);
    }

    try {
      await AsyncStorage.setItem(SEEN_CACHE_KEY, JSON.stringify(this.seenIds));
    } catch (e) {
      console.warn('Failed to save RecentlySeenManager state', e);
    }
  }
}

/**
 * 2. Ranking Engine
 * Calculates a composite score for each post based on freshness, engagement, and randomization.
 */
export class RankingEngine {
  // Deterministic pseudo-random hash based on user UID and post ID
  public getDeterministicJitter(uid: string, postId: string, seed: number) {
    let hash = 0;
    const str = uid + ':' + postId + ':' + seed;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 100) / 100; // Returns 0.0 to 0.99
  }

  scorePost(
    post: Post, 
    userUid: string, 
    userBranch: string | undefined,
    connectedNames: Set<string>, 
    heartedSet: Set<string>,
    sessionSeed: number
  ): number {
    const now = Date.now();
    const timeStr = post.createdAt || post.timestamp || 0;
    const timeMs = typeof timeStr === 'number' ? timeStr : new Date(timeStr).getTime();
    const ageHours = Math.max(0, (now - (isNaN(timeMs) ? 0 : timeMs)) / (1000 * 60 * 60));

    // Base Engagement
    const claps = post.claps || 0;
    const commentsCount = post.commentsCount || 0;
    const isConn = connectedNames.has(post.authorName) || (post.authorRealName && connectedNames.has(post.authorRealName));
    const isInteracted = heartedSet.has(post.id);

    // Score Components
    // Freshness (40%) -> Decays over time
    const freshnessScore = Math.max(0, 100 - (ageHours * 1.5)); 
    
    // Likes (25%) -> Up to 50 points
    const likesScore = Math.min(claps * 5, 50);

    // Comments (15%) -> Up to 30 points
    const commentsScore = Math.min(commentsCount * 10, 30);

    // Saves/Media/Connections (10%)
    let bonusScore = 0;
    if (isConn) bonusScore += 10;
    if (post.imageUrl || post.linkUrl) bonusScore += 5;
    
    // Personalization (Branch Match)
    if (userBranch && (
      post.content?.toLowerCase().includes(userBranch.toLowerCase()) || 
      post.title?.toLowerCase().includes(userBranch.toLowerCase())
    )) {
      bonusScore += 15;
    }

    // Random Exploration (10%)
    const jitterVal = this.getDeterministicJitter(userUid, post.id, sessionSeed) * 20;

    // Total Score
    let totalScore = freshnessScore + likesScore + commentsScore + bonusScore + jitterVal;

    // Penalty for interacted posts
    if (isInteracted) {
      totalScore *= 0.2; // 80% penalty
    }

    // Huge boost for own fresh posts (< 5 mins)
    const isOwnFreshPost = post.authorUid === userUid && ageHours < (5 / 60);
    if (isOwnFreshPost) {
      totalScore += 10000;
    }

    return totalScore;
  }
}

/**
 * 3. Feed Manager
 * Orchestrates the ranking, deduplication, and mixing of posts.
 */
export class FeedManager {
  private recentlySeen = new RecentlySeenManager();
  private rankingEngine = new RankingEngine();
  private isInitialized = false;

  async init() {
    if (!this.isInitialized) {
      await this.recentlySeen.init();
      this.isInitialized = true;
    }
  }

  markPostsAsSeen(postIds: string[]) {
    this.recentlySeen.markAsSeen(postIds);
  }

  getHybridFeed(
    allPosts: Post[], 
    connectionsList: ContactConnection[],
    currentUserUid: string,
    currentUserBranch: string | undefined,
    heartedPostIds: string[],
    reportedPostIds: string[],
    sessionSeed: number
  ): Post[] {
    const safePosts = Array.isArray(allPosts) ? allPosts : [];
    const safeConns = Array.isArray(connectionsList) ? connectionsList : [];
    
    const connectedNames = new Set(
      safeConns.filter(c => c && c.status === 'Connected').map(c => c.name)
    );
    const heartedSet = new Set(heartedPostIds);
    const reportedSet = new Set(reportedPostIds);
    const recentExclusions = this.recentlySeen.getRecentExclusions();

    // 1. Filter out reported posts and calculate scores
    let eligiblePosts = safePosts
      .filter(p => p && !reportedSet.has(p.id) && (p.isHidden !== true || p.authorUid === currentUserUid))
      .map(post => ({
        post,
        score: this.rankingEngine.scorePost(post, currentUserUid, currentUserBranch, connectedNames, heartedSet, sessionSeed)
      }));

    // 2. Low Volume Mode (< 50 posts)
    if (eligiblePosts.length < 50) {
      // Smart Shuffle Mode
      return this.smartShuffle(eligiblePosts.map(p => p.post), recentExclusions, sessionSeed);
    }

    // 3. High Volume Hybrid Mode
    
    // Sort by score
    eligiblePosts.sort((a, b) => b.score - a.score);

    // Apply strict exclusion for the top 20 recently seen
    let feed = eligiblePosts
      .filter(p => !recentExclusions.has(p.post.id))
      .map(p => p.post);

    // If excluding recent drops us too low, fallback to shuffling everything
    if (feed.length < 10) {
      feed = this.smartShuffle(eligiblePosts.map(p => p.post), new Set(), sessionSeed);
    }

    // 4. Inject Discovery Posts
    // Every 5th-8th post, intentionally surface an older high-quality post
    return this.applyDiscoveryStrategy(feed);
  }

  private smartShuffle(posts: Post[], exclusions: Set<string>, seed: number): Post[] {
    const filtered = posts.filter(p => !exclusions.has(p.id));
    
    // If filtering leaves us with nothing, ignore exclusions (prevent empty feed)
    const pool = filtered.length > 5 ? filtered : posts;
    
    // Deterministic shuffle based on seed
    return pool.sort((a, b) => {
      const hashA = this.rankingEngine.getDeterministicJitter('shuffle', a.id, seed);
      const hashB = this.rankingEngine.getDeterministicJitter('shuffle', b.id, seed);
      return hashB - hashA;
    });
  }

  private applyDiscoveryStrategy(posts: Post[]): Post[] {
    const result: Post[] = [];
    const now = Date.now();
    
    // Separate into newer (< 3 days) and older (>= 3 days)
    const newer = [];
    const older = [];
    
    for (const post of posts) {
      const timeStr = post.createdAt || post.timestamp || 0;
      const timeMs = typeof timeStr === 'number' ? timeStr : new Date(timeStr).getTime();
      const ageHours = Math.max(0, (now - (isNaN(timeMs) ? 0 : timeMs)) / (1000 * 60 * 60));
      
      if (ageHours > 72 && (post.claps || 0) > 2) {
        older.push(post);
      } else {
        newer.push(post);
      }
    }

    // Reconstruct feed: Every 6th post is an older high-quality one
    let newIdx = 0;
    let oldIdx = 0;
    
    while (newIdx < newer.length) {
      result.push(newer[newIdx++]);
      
      if (result.length % 6 === 0 && oldIdx < older.length) {
        result.push(older[oldIdx++]);
      }
    }
    
    // Append remaining
    while (oldIdx < older.length) result.push(older[oldIdx++]);
    
    return result;
  }
}

export const globalFeedManager = new FeedManager();
