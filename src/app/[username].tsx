import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

const { width } = Dimensions.get('window');

interface ResolvedProfile {
  name: string;
  role: 'Student' | 'Alumni' | 'Faculty' | 'Other' | 'Guest';
  photoUrl?: string;
  department?: string;
  batch?: string;
  vibeStatus?: string;
  skills?: string[];
  links?: { github?: string; linkedin?: string; instagram?: string };
  experiences?: Array<{
    id: string;
    role: string;
    company: string;
    employmentType: string;
    startMonth: string;
    startYear: string;
    endMonth?: string;
    endYear?: string;
    isCurrent: boolean;
    description?: string;
  }>;
  username?: string;
  uid?: string;
  rollNo?: string;
  regNo?: string;
}

export default function PublicProfileScreen() {
  const { username: rawUsername } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const theme = useThemeColors();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ResolvedProfile | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showAppPrompt, setShowAppPrompt] = useState(Platform.OS === 'web');
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'desktop'>('desktop');

  useEffect(() => {
    if (Platform.OS === 'web') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('android')) {
        setDeviceType('android');
      } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
        setDeviceType('ios');
      }
    }
  }, []);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      if (!rawUsername) return;
      
      // Clean leading @ if present
      let cleanUsername = rawUsername.trim().toLowerCase();
      if (cleanUsername.startsWith('@')) {
        cleanUsername = cleanUsername.substring(1);
      }

      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. Resolve username to uid
        const usernameDocRef = doc(db, 'usernames', cleanUsername);
        const usernameDoc = await getDoc(usernameDocRef);

        if (!usernameDoc.exists()) {
          setErrorMsg(`@${cleanUsername} is not registered yet. Build your profile card on MCE Connect today!`);
          setLoading(false);
          return;
        }

        const { uid } = usernameDoc.data();
        if (!uid) {
          setErrorMsg('Oops! This profile cannot be resolved right now.');
          setLoading(false);
          return;
        }

        // 2. Fetch actual user details
        const userDocRef = doc(db, 'publicProfiles', uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          setErrorMsg('Profile document not found in community database.');
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        const resolvedName = userData.name || 'Campus Member';
        const resolvedRole = userData.role || 'Student';
        
        if (Platform.OS === 'web') {
          document.title = `${resolvedName} ${resolvedRole} - MCE MOTIHARI`;
        }

        setProfile({
          name: resolvedName,
          role: resolvedRole,
          photoUrl: userData.photoUrl,
          department: userData.department,
          batch: userData.batch,
          vibeStatus: userData.vibeStatus,
          skills: userData.skills || [],
          links: userData.links || {},
          experiences: userData.experiences || [],
          username: cleanUsername,
          uid
        });
      } catch (err) {
        console.error('Error fetching public profile:', err);
        setErrorMsg('Unable to connect to database. Please check your network connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [rawUsername]);

  const handleAndroidRedirect = () => {
    if (Platform.OS === 'web' && profile) {
      // 1. Try launching native app deep link first
      const deepLink = `mcemotihari://@${profile.username}`;
      const playStoreUrl = `https://play.google.com/store/apps/details?id=mcemotihari.app`;
      
      window.location.href = deepLink;
      
      // 2. Fallback to Play Store details page if app is not installed
      setTimeout(() => {
        window.location.href = playStoreUrl;
      }, 1500);
    }
  };

  const handleShare = async () => {
    if (!profile) return;
    try {
      const profileUrl = `https://mcemotihari-app.web.app/@${profile.username}`;
      const rolePrefix = profile.role === 'Student' ? 'B.Tech Student' : profile.role === 'Alumni' ? 'MCE Alumni' : profile.role === 'Faculty' ? 'MCE Faculty' : 'MCE Member';
      const departmentLabel = profile.department ? ` | ${profile.department}` : '';

      let shareMessage = `Hey MCEians! 👋\n`;
      shareMessage += `Let's sync up on MCE Connect—our community space developed by Alumni & Students for college notices, alumni connections, and study resources.\n\n`;
      shareMessage += `${profile.name.toUpperCase()}\n`;
      shareMessage += `${rolePrefix}${departmentLabel}\n\n`;
      shareMessage += `Check out my profile card:\n`;
      shareMessage += `🔗 ${profileUrl}\n\n`;
      shareMessage += `📲 Build your verified profile card today!`;

      await Share.share({
        title: `${profile.name}'s Profile`,
        message: shareMessage,
      });
    } catch (error) {
      console.warn('Share error:', error);
    }
  };

  const getRoleColor = (role: string) => {
    if (role === 'Student') return '#A855F7';
    if (role === 'Alumni') return '#3B82F6';
    return '#F97316';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading verified profile card...</Text>
      </SafeAreaView>
    );
  }

  if (errorMsg || !profile) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={styles.errorEmoji}>🔍</Text>
        <Text style={[styles.errorTitle, { color: theme.text }]}>Profile Not Found</Text>
        <Text style={[styles.errorSubtitle, { color: theme.textSecondary }]}>{errorMsg || 'Unable to resolve username.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.backBtnText}>Back to Home Feed</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header Row */}
      <View style={[styles.headerRow, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity style={styles.actionIconBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Verified Profile</Text>
        <TouchableOpacity style={styles.actionIconBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {/* Cover banner */}
        <View style={styles.coverSection}>
          <Image 
            source={require('../../assets/images/NAB.jpg')} 
            style={StyleSheet.absoluteFillObject} 
            resizeMode="cover" 
          />
          <View style={styles.coverOverlay} />
        </View>

        {/* Profile Card Header */}
        <View style={[styles.profileHeaderCard, styles.profileHeaderCardShift, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, alignItems: 'center' }]}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatarRing, { borderColor: getRoleColor(profile.role) }]}>
              <Image
                source={{ uri: profile.photoUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix' }}
                style={styles.avatarImage}
              />
            </View>
          </View>
          
          <Text style={[styles.profileName, { color: theme.text, marginTop: 12 }]}>{profile.name}</Text>
          <Text style={[styles.profileRoleLabel, { color: theme.textSecondary, marginTop: 4 }]}>
            {profile.role} • {(profile.department && profile.department !== 'MCE') ? profile.department : 'MCE Motihari'}
          </Text>

          <View style={styles.badgeRow}>
            <VerifiedBadge role={profile.role} size="medium" />
          </View>

          {profile.vibeStatus ? (
            <View style={[styles.vibeCard, { backgroundColor: theme.background, borderColor: theme.cardBorder, marginTop: 12 }]}>
              <Text style={[styles.vibeText, { color: theme.text }]}>
                "{profile.vibeStatus}"
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bento Grid */}
        <View style={styles.bentoGrid}>
          {/* Card 1: Academic Standing */}
          {!(profile.role === 'Other' && !profile.rollNo && !profile.regNo && (!profile.department || profile.department === 'MCE') && !profile.batch) && (
            <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="school" size={16} color={getRoleColor(profile.role)} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Campus Credentials</Text>
                <View style={styles.verifiedLabelBadge}>
                  <Ionicons name="checkmark-circle" size={11} color="#22C55E" />
                  <Text style={styles.verifiedLabelText}>Verified</Text>
                </View>
              </View>
              
              <View style={styles.credentialsGrid}>
                <View style={styles.credentialItem}>
                  <Text style={styles.credentialLabel}>Branch / Major</Text>
                  <Text style={[styles.credentialVal, { color: theme.text }]}>{(profile.department && profile.department !== 'MCE') ? profile.department : 'N/A'}</Text>
                </View>

                <View style={styles.credentialRow}>
                  <View style={styles.credentialHalf}>
                    <Text style={styles.credentialLabel}>Academic Batch</Text>
                    <Text style={[styles.credentialVal, { color: theme.text }]}>{profile.batch || 'N/A'}</Text>
                  </View>
                  <View style={styles.credentialHalf}>
                    <Text style={styles.credentialLabel}>Roll Number</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.textSecondary, letterSpacing: 2 }}>•••••</Text>
                      <Ionicons name="lock-closed" size={11} color={theme.text} style={{ opacity: 0.6 }} />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Card 2: Interactive Skills Tag Cloud */}
          {profile.skills && profile.skills.length > 0 ? (
            <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="sparkles" size={16} color="#A855F7" />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Tech Skills</Text>
              </View>
              <View style={styles.tagGrid}>
                {profile.skills.map((skill, index) => (
                  <View key={index} style={[styles.skillTag, { backgroundColor: theme.isDark ? 'rgba(168, 85, 247, 0.08)' : '#F3E8FF', borderColor: theme.isDark ? 'rgba(168, 85, 247, 0.2)' : '#E9D5FF' }]}>
                    <Text style={[styles.skillTagText, { color: '#9333EA' }]}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Card 3: Social link capsules */}
          {((profile.links?.github && profile.links.github.trim()) || (profile.links?.linkedin && profile.links.linkedin.trim()) || (profile.links?.instagram && profile.links.instagram.trim())) ? (
            <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="link" size={16} color="#06B6D4" />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Portfolios & Social Links</Text>
              </View>
              <View style={styles.linksContainer}>
                {profile.links?.github && (
                  <TouchableOpacity style={[styles.linkCapsule, { backgroundColor: '#181717' }]}>
                    <Ionicons name="logo-github" size={14} color="#FFFFFF" />
                    <Text style={styles.linkCapsuleText}>GitHub Codebase</Text>
                  </TouchableOpacity>
                )}
                {profile.links?.linkedin && (
                  <TouchableOpacity style={[styles.linkCapsule, { backgroundColor: '#0A66C2' }]}>
                    <Ionicons name="logo-linkedin" size={14} color="#FFFFFF" />
                    <Text style={styles.linkCapsuleText}>LinkedIn Profile</Text>
                  </TouchableOpacity>
                )}
                {profile.links?.instagram && (
                  <TouchableOpacity style={[styles.linkCapsule, { backgroundColor: '#E1306C' }]}>
                    <Ionicons name="logo-instagram" size={14} color="#FFFFFF" />
                    <Text style={styles.linkCapsuleText}>Instagram Vibe</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : null}

          {/* Card 4: Professional Experiences */}
          {profile.experiences && profile.experiences.length > 0 ? (
            <View style={[styles.bentoCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="briefcase" size={16} color="#3B82F6" />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Experiences</Text>
              </View>
              <View style={styles.experienceList}>
                {profile.experiences.map((exp, index) => (
                  <View key={exp.id || index} style={[styles.experienceItem, { borderBottomColor: theme.cardBorder }]}>
                    <View style={styles.experienceIconFrame}>
                      <Ionicons name="briefcase-outline" size={18} color="#3B82F6" />
                    </View>
                    <View style={styles.experienceDetails}>
                      <Text style={[styles.experienceRole, { color: theme.text }]}>{exp.role}</Text>
                      <Text style={[styles.experienceCompany, { color: theme.textSecondary }]}>
                        {exp.company} • <Text style={styles.experienceTypeTag}>{exp.employmentType}</Text>
                      </Text>
                      <Text style={styles.experienceDates}>
                        {exp.startMonth} {exp.startYear} - {exp.isCurrent ? 'Present' : `${exp.endMonth} ${exp.endYear}`}
                      </Text>
                      {exp.description ? (
                        <Text style={[styles.experienceDesc, { color: theme.textSecondary }]}>{exp.description}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── PREMIUM PWA & MOBILE INSTALLATION PROMPT ─── */}
      {Platform.OS === 'web' && showAppPrompt && (
        <View style={styles.promptOverlay}>
          <View style={[styles.promptCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            {/* Close Button */}
            <TouchableOpacity style={styles.promptCloseBtn} onPress={() => setShowAppPrompt(false)}>
              <Ionicons name="close" size={18} color={theme.text} />
            </TouchableOpacity>

            {deviceType === 'android' ? (
              <View style={styles.promptContent}>
                <Text style={styles.promptEmoji}>🚀</Text>
                <Text style={[styles.promptTitle, { color: theme.text }]}>Open in MCE Connect App?</Text>
                <Text style={[styles.promptDesc, { color: theme.textSecondary }]}>
                  Get real-time notices, chat feeds, offline materials, and a faster experience inside our Android App.
                </Text>
                <TouchableOpacity style={styles.promptMainBtn} onPress={handleAndroidRedirect}>
                  <Text style={styles.promptMainBtnText}>Open / Install App</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.promptSecBtn} onPress={() => setShowAppPrompt(false)}>
                  <Text style={[styles.promptSecBtnText, { color: theme.textSecondary }]}>Continue in Browser</Text>
                </TouchableOpacity>
              </View>
            ) : deviceType === 'ios' ? (
              <View style={styles.promptContent}>
                <Text style={styles.promptEmoji}>📲</Text>
                <Text style={[styles.promptTitle, { color: theme.text }]}>Install App on iPhone</Text>
                <Text style={[styles.promptDesc, { color: theme.textSecondary }]}>
                  Add this verified card to your iPhone Home Screen for easy access:
                </Text>
                <View style={styles.iosInstructionBox}>
                  <Text style={[styles.instructionStep, { color: theme.text }]}>
                    1. Tap Share <Ionicons name="share-outline" size={14} color={theme.text} /> at Safari's bottom.
                  </Text>
                  <Text style={[styles.instructionStep, { color: theme.text }]}>
                    2. Select <Text style={{ fontWeight: 'bold' }}>"Add to Home Screen"</Text> <Ionicons name="add-circle-outline" size={14} color={theme.text} />.
                  </Text>
                </View>
                <TouchableOpacity style={styles.promptMainBtn} onPress={() => setShowAppPrompt(false)}>
                  <Text style={styles.promptMainBtnText}>Got it, Thanks!</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.promptContent}>
                <Text style={styles.promptEmoji}>💻</Text>
                <Text style={[styles.promptTitle, { color: theme.text }]}>MCE Connect on Android</Text>
                <Text style={[styles.promptDesc, { color: theme.textSecondary }]}>
                  Download our official app for automated notices, alumni logs, and course modules.
                </Text>
                <TouchableOpacity style={styles.promptMainBtn} onPress={() => window.open('https://play.google.com/store/apps/details?id=mcemotihari.app', '_blank')}>
                  <Text style={styles.promptMainBtnText}>Download Android App</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.promptSecBtn} onPress={() => setShowAppPrompt(false)}>
                  <Text style={[styles.promptSecBtnText, { color: theme.textSecondary }]}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13.5,
    fontWeight: '600',
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: '#F97316',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 680 : undefined,
    alignSelf: 'center',
    ...(Platform.OS === 'web' && {
      borderLeftWidth: 1.5,
      borderRightWidth: 1.5,
      borderColor: 'rgba(226, 232, 240, 0.8)',
      shadowColor: '#0F172A',
      shadowOpacity: 0.05,
      shadowRadius: 20,
    })
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
    paddingBottom: 40,
  },
  coverSection: {
    height: 140,
    backgroundColor: '#0F172A',
    position: 'relative',
    overflow: 'hidden',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  profileHeaderCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  profileHeaderCardShift: {
    marginTop: -30,
    marginBottom: 16,
  },
  avatarRow: {
    alignItems: 'center',
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    padding: 2,
    backgroundColor: '#FFFFFF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  profileRoleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  vibeCard: {
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  vibeText: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bentoGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  bentoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  verifiedLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#22C55E',
  },
  credentialsGrid: {
    gap: 10,
  },
  credentialItem: {
    gap: 2,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  credentialHalf: {
    flex: 1,
    gap: 2,
  },
  credentialLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  credentialVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  skillTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  linksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  linkCapsuleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  privateBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  experienceList: {
    gap: 12,
  },
  experienceItem: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  experienceIconFrame: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  experienceDetails: {
    flex: 1,
  },
  experienceRole: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  experienceCompany: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  experienceTypeTag: {
    fontSize: 10.5,
    color: '#3B82F6',
    fontWeight: '700',
  },
  experienceDates: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  experienceDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 6,
  },
  promptOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  promptCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    position: 'relative',
  },
  promptCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    borderRadius: 12,
    zIndex: 10,
  },
  promptContent: {
    alignItems: 'center',
    textAlign: 'center',
  },
  promptEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  promptDesc: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  promptMainBtn: {
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  promptMainBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  promptSecBtn: {
    marginTop: 10,
    paddingVertical: 6,
  },
  promptSecBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iosInstructionBox: {
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.15)',
    borderRadius: 14,
    padding: 12,
    alignSelf: 'stretch',
    gap: 8,
    marginBottom: 16,
  },
  instructionStep: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18,
  },
});
