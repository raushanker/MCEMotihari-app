import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, BackHandler, Dimensions, Image, Linking, Modal, PanResponder, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';

// Sub-screens
import { Faculty } from '@/data/faculty';
import { CalculatorScreen } from '@/screens/CalculatorScreen';
import { CGPACalculatorScreen } from '@/screens/CGPACalculatorScreen';
import { DepartmentsScreen } from '@/screens/DepartmentsScreen';
import { DocScannerScreen } from '@/screens/DocScannerScreen';
import { FacultyListScreen } from '@/screens/FacultyListScreen';
import { FacultyProfileScreen } from '@/screens/FacultyProfileScreen';
import { HostelsScreen } from '@/screens/HostelsScreen';
import { MCEAAScreen } from '@/screens/MCEAAScreen';
import { SyllabusScreen } from '@/screens/SyllabusScreen';

// Independent Modals
import { safeRouter as router } from '@/utils/safeRouter';
import { AboutModal } from './AboutModal';
import { CampusMapModal } from './CampusMapModal';
import { EventsModal } from './EventsModal';
import { HolidaysModal } from './HolidaysModal';
import { NotepadModal } from './NotepadModal';
import { PrivacyModal } from './PrivacyModal';
import { ResultsWebModal } from './ResultsWebModal';
import { SettingsModal } from './SettingsModal';
import { StudyMaterialsModal } from './StudyMaterialsModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ExploreMenuModalProps {}

type ExploreView = 'menu' | 'departments' | 'faculty-list' | 'profile-webview' | 'syllabus' | 'hostels' | 'calculator' | 'cgpa-calculator' | 'mceaa' | 'doc-scanner' | 'clubs';

export const ExploreMenuModal: React.FC<ExploreMenuModalProps> = () => {
  const { 
    isExploreMenuVisible, 
    setExploreMenuVisible,
    exploreActiveView,
    setExploreActiveView
  } = useAppStore();
  const { logout } = useAuth();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const isDark = theme.isDark;

  // Internal routing state for the modal
  const [activeView, setActiveView] = useState<ExploreView>('menu');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);

  // Independent Modals
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isNotepadVisible, setIsNotepadVisible] = useState(false);
  const [isAboutVisible, setIsAboutVisible] = useState(false);
  const [isEventsVisible, setIsEventsVisible] = useState(false);
  const [isHolidaysVisible, setIsHolidaysVisible] = useState(false);
  const [isPrivacyVisible, setIsPrivacyVisible] = useState(false);
  const [isResultsVisible, setIsResultsVisible] = useState(false);
  const [isMaterialsVisible, setIsMaterialsVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  // Web Toast for Ambulance
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Animation values
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isExploreMenuVisible) {
      // Initialize view from the Zustand store's exploreActiveView
      const initialView = exploreActiveView === 'hub' ? 'menu' : exploreActiveView;
      setActiveView(initialView as ExploreView);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isExploreMenuVisible]);

  // Handle hardware back press inside modal
  useEffect(() => {
    if (!isExploreMenuVisible) return;
    const onHardwareBack = () => {
      if (isMapVisible) { setIsMapVisible(false); return true; }
      if (isNotepadVisible) { setIsNotepadVisible(false); return true; }
      if (isAboutVisible) { setIsAboutVisible(false); return true; }
      if (isEventsVisible) { setIsEventsVisible(false); return true; }
      if (isHolidaysVisible) { setIsHolidaysVisible(false); return true; }
      if (isPrivacyVisible) { setIsPrivacyVisible(false); return true; }
      if (isResultsVisible) { setIsResultsVisible(false); return true; }
      if (isMaterialsVisible) { setIsMaterialsVisible(false); return true; }
      if (isSettingsVisible) { setIsSettingsVisible(false); return true; }
      
      if (activeView === 'profile-webview') {
        setActiveView('faculty-list');
        setExploreActiveView('faculty-list');
        return true;
      }
      if (activeView === 'faculty-list') {
        if (selectedDeptId) {
          setSelectedDeptId(null);
          setActiveView('departments');
          setExploreActiveView('departments');
          return true;
        } else {
          setActiveView('menu');
          setExploreActiveView('hub');
          return true;
        }
      }
      if (activeView !== 'menu') {
        setActiveView('menu');
        setExploreActiveView('hub');
        return true;
      }
      closeMenu();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [isExploreMenuVisible, activeView, selectedDeptId, isMapVisible, isNotepadVisible, isAboutVisible, isEventsVisible, isHolidaysVisible, isPrivacyVisible, isResultsVisible, isSettingsVisible, isMaterialsVisible]);

  const closeMenu = () => {
    setExploreMenuVisible(false);
    setExploreActiveView('hub');
  };

  const handleSubScreenOpen = (view: ExploreView) => {
    setActiveView(view);
    setExploreActiveView(view === 'menu' ? 'hub' : view);
  };

  const handleExternalNav = (route: any) => {
    const routeStr = String(route);
    const separator = routeStr.includes('?') ? '&' : '?';
    router.push(`${routeStr}${separator}from=explore` as any);
    setTimeout(() => {
      closeMenu();
    }, 50);
  };

  const handleBack = () => {
    if (activeView === 'profile-webview') {
      setActiveView('faculty-list');
      setExploreActiveView('faculty-list');
      return;
    }
    if (activeView === 'faculty-list') {
      if (selectedDeptId) {
        setSelectedDeptId(null);
        setActiveView('departments');
        setExploreActiveView('departments');
      } else {
        setActiveView('menu');
        setExploreActiveView('hub');
      }
      return;
    }
    if (activeView !== 'menu') {
      setActiveView('menu');
      setExploreActiveView('hub');
      return;
    }
  };

  // iOS-style Swipe to go back for sub-screens
  const swipeBackResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only trigger from the very left edge, swiping right (like iOS)
        const isLeftEdge = gestureState.x0 < 45;
        const isSwipingRight = gestureState.dx > 15 && Math.abs(gestureState.dy) < 30;
        return activeView !== 'menu' && isLeftEdge && isSwipingRight;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 40 && gestureState.vx > 0.3) {
          handleBack();
        }
      },
    })
  ).current;

  const handleAmbulance = () => {
    if (Platform.OS === 'web') {
      setToastMessage('Emergency calling is not supported directly from the website. Please dial 108 manually.');
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      Alert.alert(
        "Call Ambulance",
        "Do you want to call 108 now?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Call", style: 'destructive', onPress: () => Linking.openURL('tel:108') }
        ]
      );
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Hey MCEians! 👋\nMotihari College of Engineering (MCE) Connect app is finally here! 🚀\nRead official notices, download academic syllabus & study materials, view calendars, and network with students & alumni. 🎓\n\nDownload now on Play Store:\n🔗 https://play.google.com/store/apps/details?id=mcemotihari.app',
      });
    } catch (error) {}
  };

  if (!isExploreMenuVisible) return null;

  const isMenu = activeView === 'menu';
  const modalHeight = isMenu 
    ? (Platform.OS === 'web' ? '74%' : SCREEN_HEIGHT * 0.73) 
    : '100%';
  const borderRadius = isMenu ? 32 : 0; // Seamless rounded sheet for menu, flush full screen for sub-screens
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const subScreenPaddingTop = Platform.OS === 'android' ? (statusBarHeight || 24) : (insets.top || 44);
  
  // Make web layout centered and max-width 500 for better responsiveness
  const sheetStyles: any = [
    styles.sheetContainer, 
    { 
      backgroundColor: theme.backgroundElement,
      borderColor: theme.cardBorder,
      height: modalHeight,
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
      borderWidth: isMenu ? 1 : 0,
      borderBottomWidth: 0,
      paddingBottom: isMenu ? Math.max(20, insets.bottom + 10) : 0,
      transform: [{ translateY: slideAnim }]
    }
  ];
  
  if (Platform.OS === 'web') {
    sheetStyles.push({
      maxWidth: 500,
      alignSelf: 'center',
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      marginBottom: 0,
      maxHeight: isMenu ? 800 : '100%',
      borderWidth: 1,
      overflow: 'hidden',
    });
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => {
      if (isMenu) closeMenu();
      else handleBack();
    }}>
      <View style={[styles.overlay, Platform.OS === 'web' && isMenu && { justifyContent: 'center' }]}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={closeMenu} />
        </Animated.View>

        <Animated.View style={sheetStyles}>
          {/* Drag Handle (Only in Menu mode) */}
          {isMenu && Platform.OS !== 'web' && (
            <View style={styles.handleContainer}>
              <View style={[styles.handleBar, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]} />
            </View>
          )}

          {isMenu && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, Platform.OS === 'web' && { paddingTop: 20 }]}>
              
              {/* Emergency Ambulance Button */}
              <TouchableOpacity 
                style={[styles.ambulanceBtn, { backgroundColor: '#EF4444' }]} 
                activeOpacity={0.85}
                onPress={handleAmbulance}
              >
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
              
              {/* Top Grid */}
              <View style={styles.gridContainer}>
                {[
                  { id: 'departments', title: 'Departments', icon: 'school', color: '#F97316' },
                  { id: 'syllabus', title: 'Syllabus', icon: 'book', color: '#10B981' },
                  { id: 'campus-map', title: 'Map', icon: 'map', color: '#06B6D4' },
                  { id: 'doc-scanner', title: 'DOC Scanner', icon: 'scan', color: '#3B82F6' },
                  { id: 'notepad', title: 'Notepad', icon: 'document-text', color: '#F59E0B' },
                  { id: 'calculator', title: 'Calculator', icon: 'calculator', color: '#10B981' },
                  { id: 'events', title: 'Events & Fests', icon: 'color-palette', color: '#D946EF' },
                  { id: 'holidays', title: 'Holidays', icon: 'calendar', color: '#F59E0B' },
                  { id: 'study-materials', title: 'Study Materials', icon: 'library', color: '#6366F1' },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.gridItem, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: theme.cardBorder }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (c.id === 'campus-map') setIsMapVisible(true);
                      else if (c.id === 'notepad') setIsNotepadVisible(true);
                      else if (c.id === 'departments') handleExternalNav('/departments');
                      else if (c.id === 'events') setIsEventsVisible(true);
                      else if (c.id === 'holidays') setIsHolidaysVisible(true);
                      else if (c.id === 'study-materials') setIsMaterialsVisible(true);
                      else if (c.id === 'community') handleExternalNav('/community');
                      else handleSubScreenOpen(c.id as ExploreView);
                    }}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: isDark ? `${c.color}20` : `${c.color}15` }]}>
                      <Ionicons name={(c as any).icon} size={26} color={c.color} />
                    </View>
                    <Text style={[styles.gridText, { color: theme.text }]}>{c.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Links</Text>

              {/* Bottom List Options (Restored Drawer Links) */}
              <View style={styles.listContainer}>
                {[
                  { label: 'E-Cell', isImage: true, imageSource: require('../../../assets/images/ecell logo.png'), color: '#EAB308', action: () => handleExternalNav('/ecell') },
                  { label: 'Alumni Association', isImage: true, imageSource: require('../../../assets/images/mceaa logo.png'), color: '#8B5CF6', action: () => handleSubScreenOpen('mceaa') },
                  { label: 'NSS', isImage: true, imageSource: require('../../../assets/images/nss mce logo.png'), color: '#22C55E', action: () => handleExternalNav('/nss') },
                  { label: 'Clubs/Society', icon: 'planet-outline', color: '#EAB308', action: () => handleExternalNav('/clubs') },
                  { label: 'Hostels', icon: 'home-outline', color: '#8B5CF6', action: () => handleExternalNav('/hostels') },
                  { label: 'Results portal BEU', icon: 'document-text-outline', color: '#10B981', action: () => setIsResultsVisible(true) },
                  { label: 'CGPA Calculator', icon: 'stats-chart', color: '#F43F5E', action: () => handleSubScreenOpen('cgpa-calculator') },
                  { label: 'Settings', icon: 'settings-outline', color: '#64748B', action: () => setIsSettingsVisible(true) },
                  { label: 'Privacy Policy', icon: 'shield-checkmark-outline', color: '#3B82F6', action: () => setIsPrivacyVisible(true) },
                  { label: 'Share App', icon: 'share-social-outline', color: '#8B5CF6', action: handleShareApp },
                ].map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.listItem}
                    activeOpacity={0.7}
                    onPress={item.action}
                  >
                    <View style={[styles.listIconBox, { backgroundColor: isDark ? `${item.color}20` : `${item.color}15` }]}>
                      {item.isImage ? (
                        <Image source={(item as any).imageSource} style={{ width: 24, height: 24, resizeMode: 'contain' }} />
                      ) : (
                        <Ionicons name={(item as any).icon} size={20} color={item.color} />
                      )}
                    </View>
                    <Text style={[styles.listLabel, { color: theme.text }]}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Sub-Screens rendered inline inside Modal */}
          {!isMenu && (
            <View 
              {...swipeBackResponder.panHandlers}
              style={{ flex: 1, backgroundColor: theme.background, paddingTop: subScreenPaddingTop }}
            >
              {activeView === 'departments' && (
                <DepartmentsScreen
                  onSelectDepartment={(id) => {
                    handleExternalNav(`/department/${encodeURIComponent(id)}?deptId=${encodeURIComponent(id)}`);
                  }}
                  onOpenFacultyDirectory={() => {
                    setSelectedDeptId(null);
                    setActiveView('faculty-list');
                  }}
                  onBack={handleBack}
                />
              )}

              {activeView === 'faculty-list' && (
                <FacultyListScreen
                  initialDepartmentId={selectedDeptId}
                  onBack={handleBack}
                  onSelectFaculty={(faculty) => {
                    setSelectedFaculty(faculty);
                    setActiveView('profile-webview');
                  }}
                />
              )}

              {activeView === 'profile-webview' && selectedFaculty && (
                <FacultyProfileScreen
                  faculty={selectedFaculty}
                  onBack={handleBack}
                />
              )}

              {activeView === 'syllabus' && (
                <SyllabusScreen onBack={handleBack} />
              )}

              {activeView === 'calculator' && (
                <CalculatorScreen onBack={handleBack} />
              )}

              {activeView === 'cgpa-calculator' && (
                <CGPACalculatorScreen onBack={handleBack} />
              )}

              {activeView === 'mceaa' && (
                <MCEAAScreen onBack={handleBack} />
              )}

              {activeView === 'doc-scanner' && (
                <DocScannerScreen onBack={handleBack} />
              )}
            </View>
          )}

        </Animated.View>

        {/* Web Toast for Ambulance */}
        {toastMessage && (
          <View style={styles.toastContainer}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        {/* Floating Modals for Map & Notepad */}
        {isMapVisible && <CampusMapModal visible={isMapVisible} onClose={() => setIsMapVisible(false)} />}
        {isNotepadVisible && <NotepadModal visible={isNotepadVisible} onClose={() => setIsNotepadVisible(false)} />}
        
        {/* Additional Campus Modals */}
        {isAboutVisible && <AboutModal visible={isAboutVisible} onClose={() => setIsAboutVisible(false)} />}
        {isEventsVisible && <EventsModal visible={isEventsVisible} onClose={() => setIsEventsVisible(false)} />}
        {isHolidaysVisible && <HolidaysModal visible={isHolidaysVisible} onClose={() => setIsHolidaysVisible(false)} />}
        {isPrivacyVisible && <PrivacyModal visible={isPrivacyVisible} onClose={() => setIsPrivacyVisible(false)} onNavigateOut={closeMenu} />}
        {isResultsVisible && <ResultsWebModal visible={isResultsVisible} onClose={() => setIsResultsVisible(false)} />}
        {isMaterialsVisible && <StudyMaterialsModal visible={isMaterialsVisible} onClose={() => setIsMaterialsVisible(false)} />}
        {isSettingsVisible && (
          <SettingsModal 
            visible={isSettingsVisible} 
            onClose={() => setIsSettingsVisible(false)} 
            onTriggerLogout={async () => {
              setIsSettingsVisible(false);
              closeMenu();
              await logout();
              router.replace('/login');
            }}
            onTriggerDeleteProfile={async () => {
              setIsSettingsVisible(false);
              closeMenu();
              // Trigger same delete profile alert/redirect as index
              const userProfile = useAppStore.getState().user;
              if (!userProfile) return;

              if (Platform.OS === 'web') {
                const confirm = window.confirm(
                  'Account Deletion Request 🚨\n\n' +
                  'Kya aap MCE Connect account permanently delete karna chahte hain? Tapping "OK" will generate an official email draft to the MCE tech support team with your profile details for permanent database removal.'
                );
                if (confirm) {
                  try {
                    const email = 'mcemotihari.tech@gmail.com';
                    const subject = encodeURIComponent('Account delete request');
                    const body = encodeURIComponent(
                      `Hi MCE Connect Support Team,\n\nI would like to request the permanent deletion of my MCE Connect profile card and associated account data. Please find my account details below:\n\n` +
                      `Name: ${userProfile.name || ''}\n` +
                      `Email: ${userProfile.email || ''}\n` +
                      `Phone: ${userProfile.phone || ''}\n` +
                      `Username: @${userProfile.username || ''}\n\n` +
                      `Reason for deletion (optional):\n`
                    );
                    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
                    window.location.href = mailtoUrl;
                  } catch (e: any) {
                    console.error('Mail redirect failed:', e);
                    alert('Default email app open karne me error aaya. Kripya mcemotihari.tech@gmail.com par direct mail karein!');
                  }
                }
                return;
              }

              Alert.alert(
                'Account Deletion Request 🚨',
                'Kya aap MCE Connect account permanently delete karna chahte hain? Tapping "Continue" will generate an official email draft to the MCE tech support team with your profile details for permanent database removal.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Continue',
                    onPress: async () => {
                      try {
                        const { Linking } = require('react-native');
                        const email = 'mcemotihari.tech@gmail.com';
                        const subject = encodeURIComponent('Account delete request');
                        const body = encodeURIComponent(
                          `Hi MCE Connect Support Team,\n\nI would like to request the permanent deletion of my MCE Connect profile card and associated account data. Please find my account details below:\n\n` +
                          `Name: ${userProfile.name || ''}\n` +
                          `Email: ${userProfile.email || ''}\n` +
                          `Phone: ${userProfile.phone || ''}\n` +
                          `Username: @${userProfile.username || ''}\n\n` +
                          `Reason for deletion (optional):\n`
                        );
                        const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
                        await Linking.openURL(mailtoUrl);
                      } catch (e: any) {
                        console.error('Mail redirect failed:', e);
                        Alert.alert('Mail Error', 'Default email app open karne me error aaya. Kripya mcemotihari.tech@gmail.com par direct mail karein!');
                      }
                    }
                  }
                ]
              );
            }}
            onOpenAbout={() => {
              setIsSettingsVisible(false);
              setTimeout(() => setIsAboutVisible(true), 280);
            }}
            onOpenPrivacy={() => {
              setIsSettingsVisible(false);
              setTimeout(() => setIsPrivacyVisible(true), 280);
            }}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
    borderWidth: 1,
    borderBottomWidth: 0,
    boxShadow: Platform.OS === 'web' ? '#000 0px -10px 20px' : undefined,
    elevation: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 48,
    height: 5,
    borderRadius: 3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100, // Extra padding so it doesn't get cut off at the bottom
    paddingTop: Platform.OS === 'web' ? 20 : 10,
  },
  ambulanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
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
    borderRadius: 25, // Make the white background image look circular
    backgroundColor: '#FFFFFF',
  },
  ambulanceTextCol: {
    flex: 1,
  },
  ambulanceTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  ambulanceSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
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
    gap: 8,
  },
  gridItem: {
    width: '31.3%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  gridText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 20,
    opacity: 0.6,
  },
  listContainer: {
    gap: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
  listLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
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
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  }
});
