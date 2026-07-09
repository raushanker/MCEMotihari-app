import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, BackHandler, Dimensions, Image, Linking, Modal,
  PanResponder, Platform, ScrollView, Share, StyleSheet, Text,
  TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.92;

export const ExploreMenuModal: React.FC = () => {
  const router = useSafeRouter();
  const { logout } = useAuth();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const isDark = theme.isDark;

  // ─── Store ────────────────────────────────────────────────────────────────
  const isVisible = useAppStore(s => s.isExploreMenuVisible);
  const setExploreMenuVisible = useAppStore(s => s.setExploreMenuVisible);

  // ─── Animation refs ───────────────────────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(SHEET_MAX_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = useState(false);

  const [showFacilities, setShowFacilities] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // ─── Show / Hide animation driven by store state ───────────────────────
  useEffect(() => {
    if (isVisible) {
      setShowFacilities(false);
      setModalVisible(true);
      slideAnim.setValue(SHEET_MAX_HEIGHT);
      fadeAnim.setValue(0);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 280,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_MAX_HEIGHT,
          duration: 260,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(({ finished }) => {
        if (finished) setModalVisible(false);
      });
    }
  }, [isVisible]);

  const pathname = require('expo-router').usePathname();

  // ─── Android hardware back ─────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!isVisible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const rootRoutes = ["/", "/network", "/notice", "/profile", "/explore"];
      // If we are currently on a pushed screen (e.g. /departments), DO NOT intercept back!
      // Let the Stack navigator pop the screen.
      // We only intercept if we are on a root tab route.
      if (rootRoutes.includes(pathname)) {
        closeMenu();
        return true;
      }
      return false; // let React Navigation pop the stack
    });
    return () => sub.remove();
  }, [isVisible, pathname]);

  // ─── Swipe-down gesture on handle ─────────────────────────────────────────
  const closeGesture = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 12 && Math.abs(gs.dx) < 20,
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) slideAnim.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          closeMenu();
        } else {
          Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 300, useNativeDriver: Platform.OS !== 'web' }).start();
        }
      },
    })
  ).current;

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const closeMenu = useCallback(() => {
    setExploreMenuVisible(false);
  }, [setExploreMenuVisible]);

  // Navigate to a full-screen route FROM explore.
  // We do NOT close the menu. The root stack will push the new screen ON TOP of this layout.
  // When the user goes back, this menu will still be here!
  const goFullScreen = useCallback((route: string) => {
    router.push((route + '?from=explore') as any);
  }, [router]);

  const handleAmbulance = () => {
    if (Platform.OS === 'web') {
      setToastMessage('Emergency calling is not supported on web. Please dial 108 manually.');
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      Alert.alert('Call Ambulance', 'Do you want to call 108 now?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', style: 'destructive', onPress: () => Linking.openURL('tel:108') },
      ]);
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Hey MCEians! 👋\nMotihari College of Engineering (MCE) Connect app is finally here! 🚀\nRead official notices, download academic syllabus & study materials, view calendars, and network with students & alumni. 🎓\n\nDownload now on Play Store:\n🔗 https://play.google.com/store/apps/details?id=mcemotihari.app',
      });
    } catch {}
  };

  const handleRateApp = () => {
    const pkg = 'mcemotihari.app';
    if (Platform.OS === 'android') {
      Linking.openURL(`market://details?id=${pkg}`).catch(() =>
        Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`)
      );
    } else {
      Linking.openURL(`https://play.google.com/store/apps/details?id=${pkg}`);
    }
  };

  if (!modalVisible && !isVisible) return null;

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { zIndex: 9999, elevation: 9999 },
        !modalVisible && { display: 'none' }
      ]}
      pointerEvents={modalVisible ? 'auto' : 'none'}
    >
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: fadeAnim }]}
        pointerEvents={modalVisible ? 'auto' : 'none'}
      />
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeMenu} />

      {/* ── Bottom Sheet ── */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            maxHeight: SHEET_MAX_HEIGHT,
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom + 8,
          },
        ]}
        pointerEvents="auto"
      >
        {/* Drag Handle */}
        <View {...closeGesture.panHandlers} style={styles.handleArea}>
          <View style={[styles.handle, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]} />
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={true}
        >
          {/* Emergency Ambulance */}
          <TouchableOpacity style={styles.ambulanceBtn} activeOpacity={0.85} onPress={handleAmbulance}>
            <Image source={require('../../../assets/images/ambulance_3d.png')} style={styles.ambulanceImg} resizeMode="contain" />
            <View style={styles.ambulanceTextCol}>
              <Text style={styles.ambulanceTitle}>Call Ambulance</Text>
              <Text style={styles.ambulanceSub}>Dial 108 immediately</Text>
            </View>
            <View style={styles.callIconBox}>
              <Ionicons name="call" size={20} color="#EF4444" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>Explore App</Text>

          {/* Top Grid — each opens as full-screen route */}
          <View style={styles.gridContainer}>
            {[
              { route: '/departments', title: 'Departments', icon: 'school', color: '#F97316' },
              { route: '/syllabus', title: 'Syllabus', icon: 'book', color: '#10B981' },
              { route: '/campus-map', title: 'Map', icon: 'map', color: '#06B6D4' },
              { route: '/doc-scanner', title: 'DOC Scanner', icon: 'scan', color: '#3B82F6' },
              { route: '/notepad', title: 'Notepad', icon: 'document-text', color: '#F59E0B' },
              { route: '/calculator', title: 'Calculator', icon: 'calculator', color: '#10B981' },
              { route: '/events', title: 'Events & Fests', icon: 'color-palette', color: '#D946EF' },
              { route: '/holidays', title: 'Holidays', icon: 'calendar', color: '#F59E0B' },
              { route: '/study-materials', title: 'Study Materials', icon: 'library', color: '#6366F1' },
            ].map((c) => (
              <TouchableOpacity
                key={c.route}
                style={[styles.gridItem, { backgroundColor: isDark ? '#1E293B' : '#FAFAFA', borderColor: theme.cardBorder }]}
                activeOpacity={0.7}
                onPress={() => goFullScreen(c.route)}
              >
                <View style={[styles.iconCircle, { backgroundColor: isDark ? `${c.color}22` : `${c.color}18` }]}>
                  <Ionicons name={(c as any).icon} size={26} color={c.color} />
                </View>
                <Text style={[styles.gridText, { color: theme.text }]}>{c.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Links</Text>

          {/* List Options */}
          <View style={styles.listContainer}>
            {[
              { label: 'T&P Cell', icon: 'business-outline', color: '#0EA5E9', action: () => goFullScreen('/tnp') },
              { label: 'E-Cell', isImage: true, imageSource: require('../../../assets/images/ecell logo.png'), color: '#EAB308', action: () => goFullScreen('/ecell') },
              { label: 'Alumni Association', isImage: true, imageSource: require('../../../assets/images/mceaa logo.png'), color: '#8B5CF6', action: () => goFullScreen('/mceaa') },
              { label: 'NSS', isImage: true, imageSource: require('../../../assets/images/nss mce logo.png'), color: '#22C55E', action: () => goFullScreen('/nss') },
              { label: 'Clubs/Society', icon: 'planet-outline', color: '#EAB308', action: () => goFullScreen('/clubs') },
              { label: 'Hostels', icon: 'home-outline', color: '#8B5CF6', action: () => goFullScreen('/hostels') },
              {
                label: showFacilities ? 'View Less' : 'View All Facilities',
                icon: showFacilities ? 'chevron-up-outline' : 'grid-outline',
                color: '#06B6D4',
                action: () => setShowFacilities(v => !v),
              },
              ...(showFacilities ? [
                { label: 'Work/Earn', icon: 'briefcase-outline', color: '#10B981', action: () => goFullScreen('/gigs'), isSubItem: true },
                { label: 'Sports', icon: 'football-outline', color: '#10B981', action: () => goFullScreen('/sports'), isSubItem: true },
                { label: 'Library', icon: 'library-outline', color: '#6366F1', action: () => goFullScreen('/library'), isSubItem: true },
                { label: 'Canteen', icon: 'fast-food-outline', color: '#F59E0B', action: () => goFullScreen('/canteen'), isSubItem: true },
                { label: 'Stationary', icon: 'color-palette-outline', color: '#10B981', action: () => goFullScreen('/stationary'), isSubItem: true },
              ] : []),
              { label: 'Results portal BEU', icon: 'document-text-outline', color: '#10B981', action: () => goFullScreen('/results') },
              { label: 'CGPA Calculator', icon: 'stats-chart', color: '#F43F5E', action: () => goFullScreen('/cgpa-calculator') },
              { label: 'Share App', icon: 'share-social-outline', color: '#8B5CF6', action: handleShareApp },
              { label: 'Rate/Review App', icon: 'star-outline', color: '#EAB308', action: handleRateApp },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.listItem,
                  { borderColor: theme.cardBorder },
                  (item as any).isSubItem && {
                    paddingLeft: 24,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  },
                ]}
                activeOpacity={0.7}
                onPress={item.action}
              >
                <View style={[styles.listIconBox, { backgroundColor: isDark ? `${item.color}22` : `${item.color}18` }]}>
                  {(item as any).isImage ? (
                    <Image source={(item as any).imageSource} style={{ width: 24, height: 24, resizeMode: 'contain' }} />
                  ) : (
                    <Ionicons name={(item as any).icon} size={20} color={item.color} />
                  )}
                </View>
                <Text style={[styles.listLabel, { color: theme.text }]}>{item.label}</Text>
                {!(item as any).isSubItem && (
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Ambulance toast (web only) */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 24,
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },
  ambulanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ambulanceImg: {
    width: 50,
    height: 50,
    marginRight: 14,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
  },
  ambulanceTextCol: { flex: 1 },
  ambulanceTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  ambulanceSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  callIconBox: {
    backgroundColor: '#FFFFFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    marginTop: 12,
    letterSpacing: -0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  gridItem: {
    width: '31.3%',
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  divider: { height: 1, width: '100%', marginVertical: 20, opacity: 0.6 },
  listContainer: { gap: 4 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  listIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  listLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  toastContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  toastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500', textAlign: 'center' },
});
