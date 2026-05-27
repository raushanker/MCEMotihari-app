import React, { forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions, TouchableOpacity, Pressable, StatusBar, Platform, Animated, PanResponder, ScrollView, Share } from 'react-native';
import { DrawerHeader } from './DrawerHeader';
import { DrawerMenuSection } from './DrawerMenuSection';
import { DrawerMenuItem } from './DrawerMenuItem';
import { DrawerFooter } from './DrawerFooter';
import { UserProfile } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.78, 310); // Clamped width for responsive tablet/large screen scaling

export interface CustomDrawerRef {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

interface CustomDrawerProps {
  children: React.ReactNode;
  user: UserProfile | null;
  onLoginPress: () => void;
  onProfilePress?: () => void;
  
  // Custom navigation targets
  onNavigate: (screen: string) => void;
  activeScreen?: string;
}

export const CustomDrawer = forwardRef<CustomDrawerRef, CustomDrawerProps>(({
  children,
  user,
  onLoginPress,
  onProfilePress,
  onNavigate,
  activeScreen = 'Home Feed'
}, ref) => {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const [isOpenJS, setIsOpenJS] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressVal = useRef(0);

  // Monitor animated values in JS for state triggers
  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      progressVal.current = value;
    });
    return () => progressAnim.removeListener(listenerId);
  }, []);

  const openDrawer = () => {
    setIsOpenJS(true);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setIsOpenJS(false);
    });
  };

  const toggleDrawer = () => {
    if (progressVal.current > 0.5) {
      closeDrawer();
    } else {
      openDrawer();
    }
  };

  useImperativeHandle(ref, () => ({
    open: () => {
      openDrawer();
    },
    close: () => {
      closeDrawer();
    },
    toggle: () => {
      toggleDrawer();
    }
  }));

  // Touch gesture handler using native PanResponder
  const panStartX = useRef(0);
  const startProgress = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const startX = evt.nativeEvent.pageX;
        if (progressVal.current === 0 && startX > 45) {
          return false;
        }
        // Filter out accidental small taps
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: (evt) => {
        panStartX.current = evt.nativeEvent.pageX;
        startProgress.current = progressVal.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        const deltaX = gestureState.dx;
        const deltaProgress = deltaX / DRAWER_WIDTH;
        let newProgress = startProgress.current + deltaProgress;
        
        // Clamp progress
        newProgress = Math.max(0, Math.min(1, newProgress));
        progressAnim.setValue(newProgress);
        
        // Make sure background opens overlay immediately when swiped
        if (newProgress > 0.05 && !isOpenJS) {
          setIsOpenJS(true);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const velocity = gestureState.vx;
        const currentProgress = progressVal.current;
        
        if (velocity > 0.5) {
          openDrawer();
        } else if (velocity < -0.5) {
          closeDrawer();
        } else if (currentProgress > 0.5) {
          openDrawer();
        } else {
          closeDrawer();
        }
      },
    })
  ).current;

  // Animated styles for background content screen (scaling and translation)
  const mainScreenStyle = {
    transform: [
      {
        scale: progressAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.92],
        }),
      },
      {
        translateX: progressAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, DRAWER_WIDTH * 0.15],
        }),
      },
    ],
    borderRadius: isOpenJS ? 24 : 0,
    overflow: 'hidden' as const,
  };

  // Animated styles for drawer panel translation
  const drawerPanelStyle = {
    transform: [
      {
        translateX: progressAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-DRAWER_WIDTH, 0],
        }),
      },
    ],
  };

  // Animated style for back shading overlay
  const overlayStyle = {
    opacity: progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.45],
    }),
  };

  const handleMenuClick = (label: string) => {
    closeDrawer();
    onNavigate(label);
  };

  const handleShareApp = async () => {
    closeDrawer();
    try {
      await Share.share({
        message: 'Hey MCEians! 👋\nMotihari College of Engineering (MCE) Connect app is finally here! 🚀\nRead official notices, download academic syllabus & study materials, view calendars, and network with students & alumni. 🎓\n\nDownload now on Play Store:\n🔗 https://play.google.com/store/apps/details?id=com.mcemotihari.app',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.isDark ? '#080C14' : '#0F172A' }]}>
      <View style={styles.container} {...panResponder.panHandlers}>
        {/* Status Bar configurations */}
        {isOpenJS && Platform.OS === 'android' && (
          <StatusBar 
            backgroundColor={theme.isDark ? '#0B0F19' : '#F8FAFC'} 
            barStyle={theme.isDark ? 'light-content' : 'dark-content'} 
          />
        )}
        
        {/* Drawer Panel Surface */}
        <Animated.View style={[styles.drawerPanel, { 
          backgroundColor: theme.isDark ? '#0B0F19' : '#FFFFFF', 
          borderColor: theme.cardBorder,
          paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 10,
        }, drawerPanelStyle]}>
          <DrawerHeader 
            user={user} 
            onLoginPress={() => handleMenuClick('Sign In')}
            onProfilePress={() => handleMenuClick('Profile tab')}
          />
          
          <ScrollView 
            style={[styles.drawerScrollView, { backgroundColor: theme.isDark ? '#0B0F19' : '#FFFFFF' }]} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.drawerScrollContent, { paddingBottom: insets.bottom + 40 }]}
          >
            <DrawerMenuSection heading="CAMPUS CONNECT">
              <DrawerMenuItem 
                icon="home" 
                label="Home Feed" 
                isActive={activeScreen === 'Home Feed'}
                onPress={() => handleMenuClick('Home Feed')}
              />
              <DrawerMenuItem 
                icon="zap" 
                label="Events & Fests" 
                isActive={activeScreen === 'Events & Fests'}
                onPress={() => handleMenuClick('Events & Fests')}
              />
              <DrawerMenuItem 
                icon="calendar" 
                label="Academic Holidays" 
                isActive={activeScreen === 'Academic Holidays'}
                onPress={() => handleMenuClick('Academic Holidays')}
              />
              <DrawerMenuItem 
                icon="folder" 
                label="Study Materials" 
                isActive={activeScreen === 'Study Materials'}
                onPress={() => handleMenuClick('Study Materials')}
              />
              <DrawerMenuItem 
                icon="file-text" 
                label="Syllabus" 
                isActive={activeScreen === 'Syllabus'}
                onPress={() => handleMenuClick('Syllabus')}
              />
              <DrawerMenuItem 
                icon="bell" 
                label="College Notices" 
                isActive={activeScreen === 'College Notices'}
                onPress={() => handleMenuClick('College Notices')}
              />
            </DrawerMenuSection>

            <DrawerMenuSection heading="EXPLORE ACADEMICS">
              <DrawerMenuItem 
                icon="book-open" 
                label="Academic Departments" 
                isActive={activeScreen === 'Academic Departments'}
                onPress={() => handleMenuClick('Academic Departments')}
              />
              <DrawerMenuItem 
                icon="users" 
                label="Faculty Directory" 
                isActive={activeScreen === 'Faculty Directory'}
                onPress={() => handleMenuClick('Faculty Directory')}
              />
              <DrawerMenuItem 
                icon="map" 
                label="Interactive Campus Map" 
                isActive={activeScreen === 'Interactive Campus Map'}
                onPress={() => handleMenuClick('Interactive Campus Map')}
              />
              <DrawerMenuItem 
                icon="key" 
                label="Hostels & Campus Living" 
                isActive={activeScreen === 'Hostels & Campus Living'}
                onPress={() => handleMenuClick('Hostels & Campus Living')}
              />
            </DrawerMenuSection>

            <DrawerMenuSection heading="SUPPORT & SETTINGS">
              <DrawerMenuItem 
                icon="info" 
                label="About MCE Motihari" 
                isActive={activeScreen === 'About MCE Motihari'}
                onPress={() => handleMenuClick('About MCE Motihari')}
              />
              <DrawerMenuItem 
                icon="settings" 
                label="Settings" 
                isActive={activeScreen === 'Settings'}
                onPress={() => handleMenuClick('Settings')}
              />
              <DrawerMenuItem 
                icon="shield" 
                label="Privacy Policy" 
                isActive={activeScreen === 'Privacy Policy'}
                onPress={() => handleMenuClick('Privacy Policy')}
              />
              <DrawerMenuItem 
                icon="mail" 
                label="Contact Support" 
                isActive={activeScreen === 'Contact Support'}
                onPress={() => handleMenuClick('Contact Support')}
              />
              <DrawerMenuItem 
                icon="share-2" 
                label="Share App" 
                isActive={activeScreen === 'Share App'}
                onPress={() => handleShareApp()}
              />
            </DrawerMenuSection>
            
            {/* Mini Campus Statistics Row */}
            <View style={[styles.statsContainer, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderColor: theme.cardBorder }]}>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: theme.text }]}>1.4K+</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Students</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.cardBorder }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: theme.text }]}>6</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Departments</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.cardBorder }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: theme.text }]}>25K+</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Alumni</Text>
              </View>
            </View>

            <DrawerFooter />
          </ScrollView>
        </Animated.View>

        {/* Main Background Screen Content wrapped in transition */}
        <Animated.View style={[styles.mainScreenContainer, { backgroundColor: theme.background }, mainScreenStyle]}>
          {children}
          
          {/* Transparent fade overlay */}
          {isOpenJS && (
            <Animated.View style={[styles.overlayShadow, overlayStyle]}>
              <Pressable style={styles.overlayPressable} onPress={closeDrawer} />
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A', // Navy backdrop
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  drawerPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    boxShadow: `${4}px ${0}px ${16}px #000`,

    elevation: 24,
    borderTopRightRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  drawerScrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  drawerScrollContent: {
    paddingVertical: 10,
  },
  mainScreenContainer: {
    flex: 1,
    height: '100%',
    backgroundColor: '#F8FAFC',
    zIndex: 5,
    boxShadow: `${-4}px ${0}px ${16}px #000`,

    elevation: 20,
  },
  overlayShadow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 99,
  },
  overlayPressable: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
});
