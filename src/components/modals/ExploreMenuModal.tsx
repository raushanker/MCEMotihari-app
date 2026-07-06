import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Alert, Animated, BackHandler, Dimensions, Image, Linking, PanResponder, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';

// Sub-screens
import { Faculty, FACULTY_DATA } from '@/data/faculty';
import { CalculatorScreen } from '@/screens/CalculatorScreen';
import { CGPACalculatorScreen } from '@/screens/CGPACalculatorScreen';
import { DepartmentsScreen } from '@/screens/DepartmentsScreen';
import { DocScannerScreen } from '@/screens/DocScannerScreen';
import { FacultyListScreen } from '@/screens/FacultyListScreen';
import { FacultyProfileScreen } from '@/screens/FacultyProfileScreen';
import { HostelsScreen } from '@/screens/HostelsScreen';
import { MCEAAScreen } from '@/screens/MCEAAScreen';
import { SyllabusScreen } from '@/screens/SyllabusScreen';
import { ECellScreen } from '@/screens/ECellScreen';
import { TnPScreen } from '@/screens/TnPScreen';
import { TnPNOcScreen } from '@/screens/TnPNOcScreen';
import { NssScreen } from '@/screens/NssScreen';
import { ClubsScreen } from '@/screens/ClubsScreen';
import CanteenScreen from '@/app/canteen';
import StationaryScreen from '@/app/stationary';
import SportsScreen from '@/app/sports';
import LibraryScreen from '@/app/library';
import OlxScreen from '@/app/olx/index';
import GigsScreen from '@/app/gigs/index';

// Independent Modals
import { safeRouter as router } from '@/utils/safeRouter';
import { AboutModal } from './AboutModal';
import { CampusMapModal } from './CampusMapModal';
import { EventsModal } from './EventsModal';
import { HolidaysModal } from './HolidaysModal';
import { NotepadModal } from './NotepadModal';

import { StudyMaterialsModal } from './StudyMaterialsModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ExploreMenuModalProps {}

type ExploreView = 'menu' | 'hub' | 'departments' | 'faculty-list' | 'profile-webview' | 'syllabus' | 'hostels' | 'calculator' | 'cgpa-calculator' | 'mceaa' | 'doc-scanner' | 'clubs' | 'tnp' | 'tnp-noc' | 'ecell' | 'nss' | 'canteen' | 'stationary' | 'sports' | 'library' | 'campus-map' | 'notepad' | 'events' | 'holidays' | 'study-materials' | 'about' | 'results' | 'olx' | 'gigs';

let savedShowFacilities = false;
let savedScrollY = 0;

export const ExploreMenuModal: React.FC<ExploreMenuModalProps> = () => {
  const { 
    isExploreMenuVisible, 
    setExploreMenuVisible,
    exploreActiveView,
    setExploreActiveView,
    skipExploreAnimation
  } = useAppStore();
  const { logout } = useAuth();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const isDark = theme.isDark;
  const isFocused = useIsFocused();

  // Internal routing state for the modal
  const [activeView, setActiveView] = useState<ExploreView>('menu');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [profileOrigin, setProfileOrigin] = useState<'tnp' | 'faculty' | null>(null);
  const [olxOrigin, setOlxOrigin] = useState<'stationary' | null>(null);

  // Independent Modals
              
  const [showFacilities, setShowFacilities] = useState(savedShowFacilities);

  useEffect(() => {
    savedShowFacilities = showFacilities;
  }, [showFacilities]);

  // Web Toast for Ambulance
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Animation values
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isExploreMenuVisible) {
      // Restore scroll position after a slight delay for layout
      setTimeout(() => {
        if (scrollRef.current && savedScrollY > 0 && activeView === 'menu') {
          scrollRef.current.scrollTo({ y: savedScrollY, animated: false });
        }
      }, 150);
    }
  }, [isExploreMenuVisible, activeView, showFacilities]);

  useEffect(() => {
    if (isExploreMenuVisible) {
      // Initialize view from the Zustand store's exploreActiveView
      const initialView = exploreActiveView === 'hub' ? 'menu' : exploreActiveView;
      setActiveView(initialView as ExploreView);
      if (skipExploreAnimation) {
        slideAnim.setValue(0);
        fadeAnim.setValue(1);
      } else {
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
      }
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
    if (!isExploreMenuVisible || !isFocused) return;
    const onHardwareBack = () => {
                                          
      
      if (activeView === 'profile-webview') {
        if (profileOrigin === 'tnp') {
          setActiveView('tnp');
          setExploreActiveView('tnp');
          setProfileOrigin(null);
        } else {
          setActiveView('faculty-list');
          setExploreActiveView('faculty-list');
        }
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
      if (activeView === 'tnp-noc') {
        setActiveView('tnp');
        setExploreActiveView('tnp');
        return true;
      }
      if (activeView === 'olx') {
        if (olxOrigin === 'stationary') {
          setOlxOrigin(null);
          setActiveView('stationary');
          setExploreActiveView('stationary');
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
  }, [isExploreMenuVisible, activeView, selectedDeptId]);

  const closeMenu = () => {
    setExploreMenuVisible(false);
    setExploreActiveView('hub');
  };

  const handleSubScreenOpen = (view: ExploreView) => {
    setActiveView(view);
    setExploreActiveView(view === 'menu' ? 'hub' : view);
  };

  const handleExternalNav = (route: any) => {
    // DO NOT CLOSE MENU - As per user request, it stays open in the background!
    setTimeout(() => {
      const routeStr = String(route);
      const separator = routeStr.includes('?') ? '&' : '?';
      router.push(`${routeStr}${separator}from=explore&exploreView=${activeView}` as any);
    }, 150);
  };

  const handleBack = () => {
    if (activeView === 'profile-webview') {
      if (profileOrigin === 'tnp') {
        setActiveView('tnp');
        setExploreActiveView('tnp');
        setProfileOrigin(null);
      } else {
        setActiveView('faculty-list');
        setExploreActiveView('faculty-list');
      }
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
    if (activeView === 'tnp-noc') {
      setActiveView('tnp');
      setExploreActiveView('tnp');
      return;
    }
    if (activeView === 'olx') {
      if (olxOrigin === 'stationary') {
        setOlxOrigin(null);
        setActiveView('stationary');
        setExploreActiveView('stationary');
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

  const handleRateApp = () => {
    const androidPackageName = 'mcemotihari.app';
    if (Platform.OS === 'android') {
      Linking.openURL(`market://details?id=${androidPackageName}`).catch(() => {
        Linking.openURL(`https://play.google.com/store/apps/details?id=${androidPackageName}`);
      });
    } else {
      Linking.openURL(`https://play.google.com/store/apps/details?id=${androidPackageName}`);
    }
  };

  if (!isExploreMenuVisible) return null;

  const isMenu = activeView === 'menu';
  const modalHeight = isMenu 
    ? (Platform.OS === 'web' ? '74%' : SCREEN_HEIGHT * 0.73) 
    : '100%';
  const borderRadius = isMenu ? 32 : 0; // Seamless rounded sheet for menu, flush full screen for sub-screens
  const subScreenPaddingTop = Math.max(insets.top, 16);

  // Apply padding only to screens that don't handle their own Safe Area padding
  const screensRequiringPadding: ExploreView[] = [
    'departments', 'faculty-list', 'profile-webview', 
    'syllabus', 'clubs', 'tnp', 'tnp-noc', 'ecell', 'nss', 'hostels'
  ];
  const activeViewPaddingTop = screensRequiringPadding.includes(activeView) ? subScreenPaddingTop : 0;
  
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
    },
    Platform.OS === 'web' && {
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
    }
  ].filter(Boolean);

  return (
    <Animated.View 
    style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}
    pointerEvents={isExploreMenuVisible ? 'auto' : 'none'}
  >
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

          <ScrollView 
            ref={scrollRef}
            style={{ display: isMenu ? 'flex' : 'none' }}
            showsVerticalScrollIndicator={false} 
            scrollEventThrottle={100}
            onScroll={(e) => {
              if (isMenu) savedScrollY = e.nativeEvent.contentOffset.y;
            }}
            contentContainerStyle={[styles.scrollContent, Platform.OS === 'web' && { paddingTop: 20 }]}
          >
              
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
                      if (c.id === 'campus-map') handleSubScreenOpen('campus-map');
                      else if (c.id === 'notepad') handleSubScreenOpen('notepad');
                      else if (c.id === 'departments') handleSubScreenOpen('departments');
                      else if (c.id === 'events') handleSubScreenOpen('events');
                      else if (c.id === 'holidays') handleSubScreenOpen('holidays');
                      else if (c.id === 'study-materials') handleSubScreenOpen('study-materials');
                      else if (c.id === 'community') handleExternalNav('/community?from=explore');
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
                  { label: 'T&P Cell', icon: 'business-outline', color: '#0EA5E9', action: () => handleSubScreenOpen('tnp') },
                  { label: 'E-Cell', isImage: true, imageSource: require('../../../assets/images/ecell logo.png'), color: '#EAB308', action: () => handleSubScreenOpen('ecell') },
                  { label: 'Alumni Association', isImage: true, imageSource: require('../../../assets/images/mceaa logo.png'), color: '#8B5CF6', action: () => handleSubScreenOpen('mceaa') },
                  { label: 'NSS', isImage: true, imageSource: require('../../../assets/images/nss mce logo.png'), color: '#22C55E', action: () => handleSubScreenOpen('nss') },
                  { label: 'Clubs/Society', icon: 'planet-outline', color: '#EAB308', action: () => handleSubScreenOpen('clubs') },
                  { label: 'Hostels', icon: 'home-outline', color: '#8B5CF6', action: () => handleSubScreenOpen('hostels') },
                  { label: showFacilities ? 'View Less' : 'View All Facilities', icon: showFacilities ? 'chevron-up-outline' : 'grid-outline', color: '#06B6D4', action: () => setShowFacilities(!showFacilities) },
                  ...(showFacilities ? [
                    { label: 'Work/Earn', icon: 'briefcase-outline', color: '#10B981', action: () => handleSubScreenOpen('gigs'), isSubItem: true },
                    { label: 'Sports', icon: 'football-outline', color: '#10B981', action: () => handleSubScreenOpen('sports'), isSubItem: true },
                    { label: 'Library', icon: 'library-outline', color: '#6366F1', action: () => handleSubScreenOpen('library'), isSubItem: true },
                    { label: 'Canteen', icon: 'fast-food-outline', color: '#F59E0B', action: () => handleSubScreenOpen('canteen'), isSubItem: true },
                    { label: 'Stationary', icon: 'color-palette-outline', color: '#10B981', action: () => handleSubScreenOpen('stationary'), isSubItem: true },
                  ] : []),
                  { label: 'Results portal BEU', icon: 'document-text-outline', color: '#10B981', action: () => handleExternalNav('/results?from=explore') },
                  { label: 'CGPA Calculator', icon: 'stats-chart', color: '#F43F5E', action: () => handleSubScreenOpen('cgpa-calculator') },
                  { label: 'Share App', icon: 'share-social-outline', color: '#8B5CF6', action: handleShareApp },
                  { label: 'Rate/Review App', icon: 'star-outline', color: '#EAB308', action: handleRateApp },
                ].map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.listItem, (item as any).isSubItem && { paddingLeft: 24, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }]}
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
                    {!(item as any).isSubItem && <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />}
                  </TouchableOpacity>
                ))}
              </View>
          </ScrollView>

          {/* Sub-Screens rendered inline inside Modal */}
          <View 
            {...swipeBackResponder.panHandlers}
            style={{ display: !isMenu ? 'flex' : 'none', flex: 1, backgroundColor: theme.background, paddingTop: activeViewPaddingTop }}
          >
              {activeView === 'departments' && (
                <DepartmentsScreen
                  onSelectDepartment={(id) => {
                    handleExternalNav(`/department/${encodeURIComponent(id)}?deptId=${encodeURIComponent(id)}&from=explore`);
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

              {activeView === 'tnp' && (
                <TnPScreen 
                  onBack={handleBack} 
                  onNavigateNoc={() => handleSubScreenOpen('tnp-noc')} 
                  onNavigateFacultyProfile={(facultyId) => {
                    const foundFaculty = FACULTY_DATA.find(f => f.id === facultyId);
                    if (foundFaculty) {
                      setSelectedFaculty(foundFaculty);
                      setProfileOrigin('tnp');
                      setActiveView('profile-webview');
                    }
                  }}
                  onNavigateSupport={() => {
                    closeMenu();
                    setTimeout(() => {
                      router.push('/support?from=tnp' as any);
                    }, 150);
                  }}
                  onOpenNoticeBoard={() => handleExternalNav('/dept-room?deptId=tnp&from=explore')}
                />
              )}

              {activeView === 'tnp-noc' && (
                <TnPNOcScreen onBack={handleBack} />
              )}

              {activeView === 'ecell' && (
                <ECellScreen 
                  onBack={handleBack} 
                  onNavigateAway={closeMenu} 
                  onOpenNoticeBoard={() => handleExternalNav('/dept-room?deptId=ecell&from=explore')}
                />
              )}

              {activeView === 'nss' && (
                <NssScreen onBack={handleBack} onNavigateAway={closeMenu} />
              )}

              {activeView === 'clubs' && (
                <ClubsScreen 
                  onBack={handleBack} 
                  onSelectDepartment={(id) => handleExternalNav(`/department/${id}/society?from=explore`)}
                />
              )}

              {activeView === 'hostels' && (
                <HostelsScreen onBack={handleBack} />
              )}

              {activeView === 'canteen' && (
                <CanteenScreen onBack={handleBack} />
              )}

              {activeView === 'stationary' && (
                <StationaryScreen 
                  onBack={handleBack} 
                  onOpenOlx={() => {
                    setOlxOrigin('stationary');
                    setActiveView('olx');
                    setExploreActiveView('olx');
                  }}
                />
              )}

              {activeView === 'sports' && (
                <SportsScreen onBack={handleBack} />
              )}

              {activeView === 'library' && (
                <LibraryScreen onBack={handleBack} />
              )}
          
              {activeView === 'campus-map' && (
                <CampusMapModal visible={true} onClose={handleBack} isEmbedded={true} />
              )}
              {activeView === 'notepad' && (
                <NotepadModal visible={true} onClose={handleBack} isEmbedded={true} />
              )}
              {activeView === 'about' && (
                <AboutModal visible={true} onClose={handleBack} isEmbedded={true} />
              )}
              {activeView === 'events' && (
                <EventsModal visible={true} onClose={handleBack} isEmbedded={true} />
              )}
              {activeView === 'holidays' && (
                <HolidaysModal visible={true} onClose={handleBack} isEmbedded={true} />
              )}
              {activeView === 'study-materials' && (
                <StudyMaterialsModal visible={true} onClose={handleBack} isEmbedded={true} />
              )}
              {activeView === 'olx' && (
                <OlxScreen 
                  onBack={handleBack} 
                  onItemClick={(id) => handleExternalNav(`/olx/${id}?from=explore`)}
                  onCreateClick={() => handleExternalNav('/olx/create?from=explore')}
                />
              )}
              {activeView === 'gigs' && (
                <GigsScreen 
                  onBack={handleBack} 
                  onItemClick={(id) => handleExternalNav(`/gigs/${id}?from=explore`)}
                  onCreateClick={() => handleExternalNav('/gigs/create?from=explore')}
                />
              )}
</View>

        </Animated.View>

        {/* Web Toast for Ambulance */}
        {toastMessage && (
          <View style={styles.toastContainer}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        </View>
    </Animated.View>
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
