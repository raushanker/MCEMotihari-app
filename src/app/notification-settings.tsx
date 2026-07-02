import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@mce_notification_prefs';

// ── Types ───────────────────────────────────────────────────────────────────
interface NotificationPrefs {
  // Social
  comments: boolean;
  likes: boolean;
  mentions: boolean;
  connectionRequests: boolean;
  connectionAccepted: boolean;

  // Community & Department
  communityPosts: boolean;            // All posts in community feed
  myDepartmentPosts: boolean;         // Posts from my department students/alumni
  facultyPosts: boolean;              // Posts by Faculty role
  adminAnnouncements: boolean;        // ADMIN / system messages

  // Department Chat Rooms
  myDeptChatRoom: boolean;            // My own dept chat room activity
  allDeptChatRooms: boolean;          // Activity in any dept room

  // Academic
  newStudyMaterial: boolean;          // New PDF / notes uploaded
  examAlerts: boolean;                // Exam schedule / results
  noticeBoard: boolean;               // College notice board updates
  eventAlerts: boolean;               // Events / fests / seminars

  // Push behaviour
  sound: boolean;
  vibration: boolean;
  badge: boolean;
}

const DEFAULTS: NotificationPrefs = {
  comments: true,
  likes: true,
  mentions: true,
  connectionRequests: true,
  connectionAccepted: true,
  communityPosts: true,
  myDepartmentPosts: true,
  facultyPosts: true,
  adminAnnouncements: true,
  myDeptChatRoom: true,
  allDeptChatRooms: false,
  newStudyMaterial: true,
  examAlerts: true,
  noticeBoard: true,
  eventAlerts: true,
  sound: true,
  vibration: true,
  badge: true,
};

// ── Dept info ───────────────────────────────────────────────────────────────
const DEPT_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  CSE:                  { label: 'CSE',          emoji: '💻', color: '#7C3AED' },
  'CSE AI':             { label: 'CSE (AI)',      emoji: '🤖', color: '#6D28D9' },
  EEE:                  { label: 'EEE',           emoji: '⚡', color: '#D97706' },
  CIVIL:                { label: 'Civil',          emoji: '🏗️', color: '#059669' },
  'CIVIL CA':           { label: 'Civil (CA)',     emoji: '🖥️', color: '#0891B2' },
  MECH:                 { label: 'Mechanical',     emoji: '⚙️', color: '#DC2626' },
  'Humanities and Science': { label: 'H&S',        emoji: '📚', color: '#9333EA' },
};

// ── Component ───────────────────────────────────────────────────────────────
export default function NotificationSettingsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const user = useAppStore(s => s.user);

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const deptInfo = user?.department ? DEPT_LABELS[user.department] : null;

  // ── Load saved prefs ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
      } catch {}
      setLoading(false);
    })();
  }, []);

  // ── Save prefs ───────────────────────────────────────────────────────────
  const save = async (next: NotificationPrefs) => {
    setPrefs(next);
    setSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
    setSaving(false);
  };

  const toggle = (key: keyof NotificationPrefs) => {
    save({ ...prefs, [key]: !prefs[key] });
  };

  // ── Helper components ────────────────────────────────────────────────────
  const SectionHeader = ({ icon, label, color }: { icon: string; label: string; color: string }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={15} color={color} />
      </View>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{label}</Text>
    </View>
  );

  const Row = ({
    label, sub, value, onToggle, accent = '#F97316', disabled = false,
  }: {
    label: string; sub?: string; value: boolean; onToggle: () => void; accent?: string; disabled?: boolean;
  }) => (
    <View style={[styles.row, { borderBottomColor: theme.cardBorder }, disabled && { opacity: 0.45 }]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={disabled ? undefined : onToggle}
        trackColor={{ false: theme.isDark ? '#374151' : '#E5E7EB', true: `${accent}60` }}
        thumbColor={value ? accent : (theme.isDark ? '#6B7280' : '#D1D5DB')}
        ios_backgroundColor={theme.isDark ? '#374151' : '#E5E7EB'}
        disabled={disabled}
      />
    </View>
  );

  const Card = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
      {children}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color="#F97316" size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={[
        styles.header,
        {
          backgroundColor: theme.backgroundElement,
          borderBottomColor: theme.cardBorder,
          paddingTop: insets.top,
          height: 56 + insets.top,
        }
      ]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/notifications')}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notification Settings</Text>
        <View style={{ width: 36 }}>
          {saving && <ActivityIndicator size="small" color="#F97316" />}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >

        {/* ── My Department Banner ──────────────────────────────────────── */}
        {deptInfo && (
          <View style={[styles.deptBanner, { backgroundColor: `${deptInfo.color}12`, borderColor: `${deptInfo.color}30` }]}>
            <Text style={styles.deptBannerEmoji}>{deptInfo.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.deptBannerLabel, { color: deptInfo.color }]}>Your Department: {deptInfo.label}</Text>
              <Text style={[styles.deptBannerSub, { color: theme.textSecondary }]}>
                Department-specific toggles below are pre-configured for you.
              </Text>
            </View>
          </View>
        )}

        {/* ── Social ────────────────────────────────────────────────────── */}
        <SectionHeader icon="heart-circle" label="Social Interactions" color="#EF4444" />
        <Card>
          <Row label="💬 Comments on my posts" sub="Jab koi aapke post par comment kare" value={prefs.comments} onToggle={() => toggle('comments')} accent="#3B82F6" />
          <Row label="❤️ Likes" sub="Jab koi aapka post ya comment like kare" value={prefs.likes} onToggle={() => toggle('likes')} accent="#EF4444" />
          <Row label="🔔 Mentions & Tags" sub="Jab koi aapko @mention kare" value={prefs.mentions} onToggle={() => toggle('mentions')} accent="#8B5CF6" />
          <Row label="🤝 Connection Requests" sub="Naye connection request aane par" value={prefs.connectionRequests} onToggle={() => toggle('connectionRequests')} accent="#22C55E" />
          <Row label="✅ Connection Accepted" sub="Jab koi aapka request accept kare" value={prefs.connectionAccepted} onToggle={() => toggle('connectionAccepted')} accent="#22C55E" />
        </Card>

        {/* ── Community & Posts ─────────────────────────────────────────── */}
        <SectionHeader icon="people-circle" label="Community & Posts" color="#F97316" />
        <Card>
          <Row
            label="📢 All Community Posts"
            sub="Har naye post ki notification"
            value={prefs.communityPosts}
            onToggle={() => toggle('communityPosts')}
            accent="#F97316"
          />
          <Row
            label={`🏛️ My Dept Posts${deptInfo ? ` (${deptInfo.label})` : ''}`}
            sub="Sirf mere department ke students/alumni ke posts"
            value={prefs.myDepartmentPosts}
            onToggle={() => toggle('myDepartmentPosts')}
            accent={deptInfo?.color || '#F97316'}
          />
          <Row
            label="👨‍🏫 Faculty Posts"
            sub="Faculty members dwara kiye gaye posts"
            value={prefs.facultyPosts}
            onToggle={() => toggle('facultyPosts')}
            accent="#7C3AED"
          />
          <Row
            label="📣 Admin Announcements"
            sub="College admin aur system messages"
            value={prefs.adminAnnouncements}
            onToggle={() => toggle('adminAnnouncements')}
            accent="#DC2626"
          />
        </Card>

        {/* ── Department Chat Rooms ─────────────────────────────────────── */}
        <SectionHeader icon="chatbubbles" label="Department Chat Rooms" color="#0EA5E9" />
        <Card>
          <Row
            label={`${deptInfo?.emoji ?? '🏛️'} My Dept Chat Room${deptInfo ? ` (${deptInfo.label})` : ''}`}
            sub={`${deptInfo?.label ?? 'My department'} room mein koi faculty ya student kuch post kare`}
            value={prefs.myDeptChatRoom}
            onToggle={() => toggle('myDeptChatRoom')}
            accent="#0EA5E9"
          />
          <Row
            label="🌐 All Department Rooms"
            sub="Kisi bhi dept room mein activity hone par (recommended: off)"
            value={prefs.allDeptChatRooms}
            onToggle={() => toggle('allDeptChatRooms')}
            accent="#64748B"
          />
        </Card>

        {/* ── Academic ──────────────────────────────────────────────────── */}
        <SectionHeader icon="school" label="Academic Updates" color="#059669" />
        <Card>
          <Row
            label="📄 New Study Material"
            sub="Jab koi notes, PDF ya textbook upload ho"
            value={prefs.newStudyMaterial}
            onToggle={() => toggle('newStudyMaterial')}
            accent="#059669"
          />
          <Row
            label="📝 Exam Alerts"
            sub="Exam schedule, result, date sheet"
            value={prefs.examAlerts}
            onToggle={() => toggle('examAlerts')}
            accent="#D97706"
          />
          <Row
            label="📋 Notice Board"
            sub="College notice board par naye updates"
            value={prefs.noticeBoard}
            onToggle={() => toggle('noticeBoard')}
            accent="#2563EB"
          />
          <Row
            label="🎪 Events & Fests"
            sub="Events, seminars, workshops ki alerts"
            value={prefs.eventAlerts}
            onToggle={() => toggle('eventAlerts')}
            accent="#9333EA"
          />
        </Card>

        {/* ── Delivery Behaviour ────────────────────────────────────────── */}
        <SectionHeader icon="settings" label="Delivery Behaviour" color="#6B7280" />
        <Card>
          <Row label="🔊 Sound" sub="Notification aane par sound bajaye" value={prefs.sound} onToggle={() => toggle('sound')} accent="#F97316" />
          <Row label="📳 Vibration" sub="Notification aane par phone vibrate kare" value={prefs.vibration} onToggle={() => toggle('vibration')} accent="#F97316" />
          <Row label="🔢 Badge Count" sub="App icon par unread count dikhaye" value={prefs.badge} onToggle={() => toggle('badge')} accent="#EF4444" />
        </Card>

        {/* ── Quick presets ──────────────────────────────────────────────── */}
        <SectionHeader icon="flash" label="Quick Presets" color="#FBBF24" />
        <View style={styles.presetsRow}>
          {/* All ON */}
          <TouchableOpacity
            style={[styles.presetBtn, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}
            onPress={() => save({ ...Object.keys(DEFAULTS).reduce((a, k) => ({ ...a, [k]: true }), {}) as NotificationPrefs })}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications" size={16} color="#22C55E" />
            <Text style={[styles.presetLabel, { color: '#15803D' }]}>Enable All</Text>
          </TouchableOpacity>

          {/* Essential only */}
          <TouchableOpacity
            style={[styles.presetBtn, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}
            onPress={() => save({
              ...DEFAULTS,
              likes: false,
              communityPosts: false,
              allDeptChatRooms: false,
            })}
            activeOpacity={0.8}
          >
            <Ionicons name="star" size={16} color="#F97316" />
            <Text style={[styles.presetLabel, { color: '#C2410C' }]}>Essential</Text>
          </TouchableOpacity>

          {/* Academic only */}
          <TouchableOpacity
            style={[styles.presetBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
            onPress={() => save({
              comments: false, likes: false, mentions: false,
              connectionRequests: false, connectionAccepted: false,
              communityPosts: false, myDepartmentPosts: false,
              facultyPosts: false, adminAnnouncements: true,
              myDeptChatRoom: false, allDeptChatRooms: false,
              newStudyMaterial: true, examAlerts: true,
              noticeBoard: true, eventAlerts: true,
              sound: true, vibration: true, badge: true,
            })}
            activeOpacity={0.8}
          >
            <Ionicons name="school" size={16} color="#2563EB" />
            <Text style={[styles.presetLabel, { color: '#1D4ED8' }]}>Academic</Text>
          </TouchableOpacity>

          {/* All OFF */}
          <TouchableOpacity
            style={[styles.presetBtn, { backgroundColor: theme.isDark ? 'rgba(239,68,68,0.08)' : '#FEF2F2', borderColor: '#FECACA' }]}
            onPress={() => save({ ...Object.keys(DEFAULTS).reduce((a, k) => ({ ...a, [k]: false }), {}) as NotificationPrefs })}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-off" size={16} color="#EF4444" />
            <Text style={[styles.presetLabel, { color: '#B91C1C' }]}>Mute All</Text>
          </TouchableOpacity>
        </View>

        {/* ── Info box ──────────────────────────────────────────────────── */}
        <View style={[styles.infoBox, { backgroundColor: theme.isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF', borderColor: theme.isDark ? 'rgba(59,130,246,0.25)' : '#BFDBFE' }]}>
          <Ionicons name="information-circle" size={16} color="#3B82F6" style={{ marginTop: 1 }} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Ye settings aapke phone par locally save hoti hain. Push notifications ke liye system-level permissions bhi on honi chahiye (device Settings → MCE App → Notifications).
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Scroll
  scrollContent: { padding: 16, gap: 0 },

  // Dept banner
  deptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  deptBannerEmoji: { fontSize: 26 },
  deptBannerLabel: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  deptBannerSub: { fontSize: 11.5, lineHeight: 16 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.1 },

  // Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, marginRight: 10 },
  rowLabel: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  rowSub: { fontSize: 11, lineHeight: 15, marginTop: 1 },

  // Presets
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minWidth: '44%',
    justifyContent: 'center',
  },
  presetLabel: { fontSize: 12.5, fontWeight: '800' },

  // Info
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 24,
  },
  infoText: { flex: 1, fontSize: 11.5, lineHeight: 17 },
});
