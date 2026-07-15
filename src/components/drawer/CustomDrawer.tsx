import React, { forwardRef, useImperativeHandle, useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Dimensions, TouchableOpacity, Pressable, Platform, Animated, PanResponder, ScrollView, Share } from 'react-native';
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
  onLogoutPress?: () => void;
  
  // Custom navigation targets
  onNavigate: (screen: string) => void;
  activeScreen?: string;
}

export const CustomDrawer = forwardRef<CustomDrawerRef, CustomDrawerProps>(({
  children,
  user,
  onLoginPress,
  onProfilePress,
  onLogoutPress,
  onNavigate,
  activeScreen = 'Home Feed'
}, ref) => {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const [isOpenJS, setIsOpenJS] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Decoupled animations to avoid Safari rendering bottlenecks/flickers
  const progressAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  
  const progressVal = useRef(0);
  const overlayVal = useRef(0);
  const safeguardTimer = useRef<any>(null);

  // Monitor animated values in JS for state triggers and logs
  useEffect(() => {
    const pId = progressAnim.addListener(({ value }) => {
      progressVal.current = value;
    });
    const oId = overlayAnim.addListener(({ value }) => {
      overlayVal.current = value;
    });
    return () => {
      progressAnim.removeListener(pId);
      overlayAnim.removeListener(oId);
    };
  }, [progressAnim, overlayAnim]);

  // Prevent global body horizontal overflow on Web standalone/PWA
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.body.style.overflowX = 'hidden';
    }
    return () => {
      if (Platform.OS === 'web') {
        document.body.style.overflowX = '';
      }
    };
  }, []);

  // Platform-agnostic overlay visibility telemetry log
  useEffect(() => {
    if (__DEV__) {
    }
  }, [isOpenJS]);

  const clearSafeguardTimer = () => {
    if (safeguardTimer.current) {
      clearTimeout(safeguardTimer.current);
      safeguardTimer.current = null;
    }
  };

  // Memoize drawer actions to optimize performance and prevent re-render loops
  const openDrawer = useCallback(() => {
    clearSafeguardTimer();
    setIsOpenJS(true);
    setIsAnimating(true);
    
    if (__DEV__) {
    }

    // Defensive safeguard timeout: Force states if animation callback gets dropped by WebKit/Safari
    safeguardTimer.current = setTimeout(() => {
      if (progressVal.current < 1) {
        if (__DEV__) {
          console.warn('[Telemetry] Safeguard triggered: open timing callback failed, forcing drawer layout.');
        }
        progressAnim.setValue(1);
        overlayAnim.setValue(1);
        setIsAnimating(false);
      }
    }, 500);

    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(({ finished }) => {
      clearSafeguardTimer();
      setIsAnimating(false);
      if (__DEV__) {
      }
    });
  }, [progressAnim, overlayAnim]);

  const closeDrawer = useCallback(() => {
    clearSafeguardTimer();
    setIsAnimating(true);
    
    if (__DEV__) {
    }

    // Defensive safeguard timeout: Force states if animation callback gets dropped by WebKit/Safari
    safeguardTimer.current = setTimeout(() => {
      if (progressVal.current > 0) {
        if (__DEV__) {
          console.warn('[Telemetry] Safeguard triggered: close timing callback failed, forcing drawer layout reset.');
        }
        progressAnim.setValue(0);
        overlayAnim.setValue(0);
        setIsOpenJS(false);
        setIsAnimating(false);
      }
    }, 500);

    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      })
    ]).start(({ finished }) => {
      clearSafeguardTimer();
      progressAnim.setValue(0);
      overlayAnim.setValue(0);
      setIsOpenJS(false);
      setIsAnimating(false);
      if (__DEV__) {
      }
    });
  }, [progressAnim, overlayAnim]);

  const toggleDrawer = useCallback(() => {
    if (progressVal.current > 0.5) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }, [closeDrawer, openDrawer]);

  useImperativeHandle(ref, () => ({
    open: openDrawer,
    close: closeDrawer,
    toggle: toggleDrawer,
  }), [openDrawer, closeDrawer, toggleDrawer]);

  // Prevent background body scroll bleed on Web/Safari standalone PWA when drawer is open
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (isOpenJS) {
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
      } else {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
    }
    return () => {
      if (Platform.OS === 'web') {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
    };
  }, [isOpenJS]);

  // Touch gesture handler using native PanResponder
  const panStartX = useRef(0);
  const startProgress = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const startX = evt.nativeEvent.pageX;
        if (progressVal.current === 0) {
          if (startX > 45) return false;
          // Edge swipe gesture direction: Horizontal drag must exceed vertical drag
          return gestureState.dx > 10 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
        }
        // Swipe to close: track leftward horizontal drags only
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderGrant: (evt) => {
        panStartX.current = evt.nativeEvent.pageX;
        startProgress.current = progressVal.current;
        setIsAnimating(true);
        if (__DEV__) {
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const deltaX = gestureState.dx;
        const deltaProgress = deltaX / DRAWER_WIDTH;
        let newProgress = startProgress.current + deltaProgress;
        
        // Clamp progress
        newProgress = Math.max(0, Math.min(1, newProgress));
        progressAnim.setValue(newProgress);
        overlayAnim.setValue(newProgress);
        
        // Make sure background opens overlay immediately when swiped
        if (newProgress > 0.05 && !isOpenJS) {
          setIsOpenJS(true);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const velocity = gestureState.vx;
        const currentProgress = progressVal.current;
        
        setIsAnimating(true);
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
      onPanResponderTerminate: () => {
        // Safe recovery snapping on system gesture cancellation
        const currentProgress = progressVal.current;
        setIsAnimating(true);
        if (__DEV__) {
          console.warn('[Telemetry] Telemetry warning: Interrupted gesture termination triggered.');
        }
        if (currentProgress > 0.5) {
          openDrawer();
        } else {
          closeDrawer();
        }
      },
      onPanResponderTerminationRequest: () => true,
    })
  ).current;

  // Animated styles for background content screen (scaling and translation removed for stability)
  const mainScreenStyle = isOpenJS ? {
    // No transform to keep UI stable
    transform: [],
    borderRadius: 0,
    overflow: 'hidden' as const,
    zIndex: 5,
    pointerEvents: 'auto' as const,
    boxShadow: 'none',
    elevation: 0,
  } : {
    transform: [],
    borderRadius: 0,
    overflow: undefined,
    zIndex: undefined,
    pointerEvents: 'auto' as const,
    boxShadow: Platform.OS === 'web' ? 'none' : undefined,
    elevation: 0,
    ...(Platform.OS === 'web' ? { willChange: 'auto' } : {}),
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
    opacity: overlayAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.45],
    }),
  };

  const handleMenuClick = useCallback((label: string) => {
    closeDrawer();
    onNavigate(label);
  }, [closeDrawer, onNavigate]);

  const handleShareApp = useCallback(async () => {
    closeDrawer();
    try {
      await Share.share({
        message: 'Hey MCEians! 👋\nMotihari College of Engineering (MCE) Connect app is finally here! 🚀\nRead official notices, download academic syllabus & study materials, view calendars, and network with students & alumni. 🎓\n\nDownload App: MCE Motihari connect
https://play.google.com/store/apps/details?id=mcemotihari.app',
      });
    } catch (error) {
      // Ignore abort errors from share cancellation
    }
  }, [closeDrawer]);

  return (
    <View style={[styles.root, { backgroundColor: theme.isDark ? '#080C14' : '#0F172A' }]}>
      <View style={styles.container} {...panResponder.panHandlers}>
        {/* Main Background Screen Content wrapped in transition */}
        <Animated.View style={[styles.mainScreenContainer, { backgroundColor: theme.background }, mainScreenStyle]}>
          {children}
          
          {/* Transparent backdrop overlay shade placed inside mainScreenContainer to resolve CSS stacking context and block background interactions */}
          {isOpenJS && (
            <Animated.View style={[styles.overlayShadow, overlayStyle]}>
              <Pressable style={styles.overlayPressable} onPress={closeDrawer} />
            </Animated.View>
          )}
        </Animated.View>

        {/* Drawer Panel Surface rendered AFTER mainScreenContainer so it is ALWAYS on top in the DOM stacking hierarchy */}
        <Animated.View 
          pointerEvents={isOpenJS ? "box-none" : "none"}
          style={[styles.drawerPanel, { 
            backgroundColor: theme.isDark ? '#0B0F19' : '#FFFFFF', 
            borderColor: theme.cardBorder,
            paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 10,
            ...(Platform.OS === 'web' && isAnimating ? { willChange: 'transform' } : {}),
          }, drawerPanelStyle]}
        >
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
              <DrawerMenuItem 
                icon="users" 
                label="Community Rooms" 
                isActive={activeScreen === 'Community Rooms'}
                onPress={() => handleMenuClick('Community Rooms')}
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
                icon="smartphone" 
                label="About App" 
                isActive={activeScreen === 'About App'}
                onPress={() => handleMenuClick('About App')}
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
                icon="share-2" 
                label="Share App" 
                isActive={activeScreen === 'Share App'}
                onPress={() => handleShareApp()}
              />

              {user && (
                <DrawerMenuItem 
                  icon="log-out" 
                  label="Log Out" 
                  color="#EF4444"
                  onPress={() => {
                    closeDrawer();
                    if (onLogoutPress) onLogoutPress();
                  }}
                />
              )}

              {(user && (user.uid === process.env.EXPO_PUBLIC_ADMIN_UID || user.adminRole)) && (
                <DrawerMenuItem 
                  icon="shield" 
                  label="Open Admin Portal" 
                  color="#DC2626"
                  onPress={() => {
                    closeDrawer();
                    const { router } = require('expo-router');
                    router.push('/notanadmin/dashboard');
                  }}
                />
              )}
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
    boxShadow: Platform.OS === 'web' ? `${4}px ${0}px ${16}px #000` : undefined,
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
  },
  overlayShadow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 9999,
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
