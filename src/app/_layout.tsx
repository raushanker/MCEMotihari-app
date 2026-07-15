import { ErrorBoundary, triggerGlobalCrash } from "@/components/ErrorBoundary";
import { useSafeRouter as useRouter } from "@/hooks/useSafeRouter";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useAppStore } from "@/store/useAppStore";
import { registerAndSavePushToken } from "@/utils/notifications";
import "@/utils/polyfill";
import { clampedScrollY } from "@/utils/scrollState";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, useLocalSearchParams, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  BackHandler,
  InteractionManager,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Register global JS exception handler
const globalObj = typeof global !== "undefined" ? global : window;
const ErrorUtils = (globalObj as any).ErrorUtils;
if (ErrorUtils) {
  const defaultHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    if (__DEV__) {
      console.error("[Global JS Exception]", error, isFatal);
    }
    // Only trigger the local crash screen if the error is actually fatal
    if (isFatal && triggerGlobalCrash) {
      triggerGlobalCrash(
        error instanceof Error ? error : new Error(String(error))
      );
      return;
    }
    if (defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });
}

// Register unhandled promise rejection handler
try {
  const tracking = require("promise/setimmediate/rejection-tracking");
  tracking.enable({
    all: true,
    onUnhandled: (id: any, error: any) => {
      if (__DEV__) {
        console.warn("[Unhandled Promise Rejection]", error);
      }
      // Note: Do NOT trigger global crash screen for unhandled promise rejections
      // as they are typically non-fatal background network operations (e.g. sync failures)
    },
  });
} catch (e) {
  if (__DEV__) {
    console.warn("Could not register promise rejection tracker:", e);
  }
}

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function ToastNotification() {
  const toast = useAppStore((state) => state.toast);
  const hideToast = useAppStore((state) => state.hideToast);
  const { isDark } = useThemeColors();
  const insets = useSafeAreaInsets();

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (toast) {
      // Entry animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
    } else {
      // Exit animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 200,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
    }
  }, [toast]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";

  // Premium curated Hinglish color palette mapping
  let bgColor, borderColor, textColor, statusColor, iconName: any, closeColor;

  if (isSuccess) {
    statusColor = "#22C55E";
    iconName = "checkmark-circle";
    bgColor = isDark ? "#14532D" : "#F0FDF4";
    borderColor = isDark ? "#22C55E" : "#86EFAC";
    textColor = isDark ? "#DCFCE7" : "#166534";
    closeColor = isDark ? "#86EFAC" : "#15803D";
  } else if (isError) {
    statusColor = "#EF4444";
    iconName = "alert-circle";
    bgColor = isDark ? "#7F1D1D" : "#FEF2F2";
    borderColor = isDark ? "#EF4444" : "#FCA5A5";
    textColor = isDark ? "#FEE2E2" : "#991B1B";
    closeColor = isDark ? "#FCA5A5" : "#B91C1C";
  } else {
    statusColor = "#3B82F6";
    iconName = "information-circle";
    bgColor = isDark ? "#1E3A8A" : "#EFF6FF";
    borderColor = isDark ? "#3B82F6" : "#93C5FD";
    textColor = isDark ? "#DBEAFE" : "#1E40AF";
    closeColor = isDark ? "#93C5FD" : "#1D4ED8";
  }

  // Position toast beautifully above bottom navigation (tab bar height + margin + inset)
  const bottomPosition = insets.bottom + 140;

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
          bottom: bottomPosition,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Ionicons
        name={iconName}
        size={22}
        color={statusColor}
        style={styles.toastIcon}
      />
      <Text style={[styles.toastText, { color: textColor }]}>
        {isError && !toast.message.includes("⚠️")
          ? "⚠️ " + toast.message
          : toast.message}
      </Text>
      <TouchableOpacity
        onPress={hideToast}
        style={styles.toastClose}
        activeOpacity={0.75}
      >
        <Ionicons name="close" size={18} color={closeColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function RootLayoutComponent() {
  const { isDark } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const user = useAppStore((state) => state.user);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);
  
  // Mandatory Login Route Guard
  useEffect(() => {
    if (!storeHydrated) return;
    
    const inAuthGroup = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password') || pathname.startsWith('/privacy-policy') || pathname.startsWith('/terms');
    const isAuthenticated = user && user.role !== 'Guest' && user.uid;
    
    if (!isAuthenticated && !inAuthGroup) {
      // Force redirect to login if unauthenticated
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Force redirect to app if already authenticated
      router.replace('/');
    }
  }, [user, storeHydrated, pathname]);

  
  const splashOpacity = React.useRef(new Animated.Value(1)).current;
  const logoScale = React.useRef(new Animated.Value(1)).current;
  const logoOpacity = React.useRef(new Animated.Value(1)).current;

  // PanResponder for native left‑to‑right swipe back (iPhone‑like back gesture).
  // Uses capture phase & termination refusal so ScrollViews can't steal it.
  const edgeSwipePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (evt, gs) => {
          // Only respond when touch starts on the leftmost 40 px of the screen
          if (gs.x0 > 40) return false;
          // Require a clear rightward horizontal drag (ratio >2:1)
          if (gs.dx > 15 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2) return true;
          return false;
        },
        onPanResponderRelease: (evt, gs) => {
          if (gs.dx > 55 || gs.vx > 0.5) router.back();
        },
        onPanResponderTerminationRequest: () => false, // Don't let ScrollViews steal the gesture
      }),
    [router]
  );

  // Track global navigation history to handle back button correctly on tab views and child screens
  useEffect(() => {
    const { historyStack } = require("@/hooks/useSafeRouter");

    // Construct the full path with search query parameters to preserve context
    const searchString = Object.entries(params)
      .map(([key, val]) => `${key}=${encodeURIComponent(String(val))}`)
      .join("&");
    const fullPath = searchString ? `${pathname}?${searchString}` : pathname;

    const rootRoutes = ["/", "/network", "/notice", "/profile", "/explore"];
    const isRoot = rootRoutes.includes(pathname);

    if (isRoot) {
      // Reset history stack at root tab routes to prevent root tabs popping each other
      historyStack.length = 0;
      historyStack.push(fullPath);
    } else {
      const stackLen = historyStack.length;
      if (stackLen > 1 && historyStack[stackLen - 2] === fullPath) {
        // User went back, pop the current route
        historyStack.pop();
      } else if (historyStack[stackLen - 1] !== fullPath) {
        // Prevent duplicate route entries when expo-router updates pathname before params
        const prevPathWithoutQuery = historyStack[stackLen - 1]?.split("?")[0];
        const newPathWithoutQuery = fullPath.split("?")[0];

        if (prevPathWithoutQuery === newPathWithoutQuery) {
          // Just update the query parameters of the current route
          historyStack[stackLen - 1] = fullPath;
        } else {
          // User went forward to a new route, push to stack
          if (historyStack.length > 50) {
            historyStack.shift();
          }
          historyStack.push(fullPath);
        }
      }
    }
  }, [pathname, params]);

  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    ...MaterialIcons.font,
  });

  // Register push notifications (deferred to run when UI is idle)
  useEffect(() => {
    if (storeHydrated) {
      InteractionManager.runAfterInteractions(() => {
        if (user && user.uid && user.role !== "Guest") {
          registerAndSavePushToken(user.uid);
        } else {
          registerAndSavePushToken("guest");
        }
      });
    }
  }, [user, storeHydrated]);

  // Process pending notification URL when app is ready
  useEffect(() => {
    if (fontsLoaded && storeHydrated && pendingUrl) {
      const timer = setTimeout(() => {
        router.push(pendingUrl as any);
        setPendingUrl(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, storeHydrated, pendingUrl, router]);

  // Listen for push notifications clicked in background/closed state
  useEffect(() => {
    if (Platform.OS === "web") return;

    // Check if app was opened from a notification while killed
    const checkKilledStateNotification = async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response && response.notification.request.content.data) {
          const data = response.notification.request.content.data;
          if (data.url) {
            setPendingUrl(data.url as string);
          }
        }
      } catch (err) {
        console.warn("Error checking killed state notification:", err);
      }
    };

    checkKilledStateNotification();

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data && data.url) {
          if (fontsLoaded && storeHydrated) {
            router.push(data.url as any);
          } else {
            setPendingUrl(data.url as string);
          }
        }
      }
    );

    const foregroundSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        // Handle foreground notifications here if needed (e.g., updating badge counts or local state)
        if (__DEV__) {
          console.log(
            "Received foreground push notification:",
            notification.request.content.title
          );
        }
      });

    return () => {
      subscription.remove();
      foregroundSubscription.remove();
    };
  }, [router, fontsLoaded, storeHydrated]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && storeHydrated) {
      // Hide native splash screen immediately
      SplashScreen.hideAsync().catch(() => {});

      // Start premium fast rubber-band bounce logo animation
      Animated.sequence([
        Animated.parallel([
          Animated.timing(logoScale, {
            toValue: 1.1,
            duration: 320,
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 320,
            useNativeDriver: Platform.OS !== "web",
          }),
        ]),
        Animated.timing(logoScale, {
          toValue: 1.0,
          duration: 90,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.delay(180),
        Animated.parallel([
          Animated.timing(splashOpacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(logoScale, {
            toValue: 1.35,
            duration: 180,
            useNativeDriver: Platform.OS !== "web",
          }),
        ]),
      ]).start(() => {
        setSplashAnimationDone(true);
      });
    }
  }, [fontsLoaded, fontError, storeHydrated]);

  // Fallback: hide splash screen after 15 seconds in case something hangs
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    useAppStore
      .getState()
      .initStore()
      .then(() => {
        setStoreHydrated(true);
        // Start global room unread counter listener
        useAppStore.getState().listenToRoomStats();
      })
      .catch((err) => {
        console.warn("Global store hydration failed:", err);
        setStoreHydrated(true);
      });
  }, []);

  // Globally keep status bar perfectly synchronized with isDark theme changes!
  useEffect(() => {
    const barStyle = isDark ? "light-content" : "dark-content";
    StatusBar.setBarStyle(barStyle, true);
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
    }
  }, [isDark]);

  // Android back button exit confirmation at root screens & custom back stack navigation
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const rootRoutes = ["/", "/network", "/notice", "/profile", "/explore", "/login"];

    const onBackPress = () => {
      // If we have custom history entries, use them to go back first!
      const { historyStack } = require("@/hooks/useSafeRouter");
      if (historyStack && historyStack.length > 1) {
        router.back(); // Our custom back handles pop/replace
        return true; // Prevent default back behavior
      }

      const isRoot = rootRoutes.includes(pathname) || pathname === "";
      if (isRoot) {
        if (pathname !== "/" && pathname !== "") {
          router.replace("/");
          return true; // Prevent default back behavior
        }
        Alert.alert("Exit App", "Are you sure you want to exit the app?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Exit",
            style: "destructive",
            onPress: () => BackHandler.exitApp(),
          },
        ]);
        return true; // Prevent default back behavior
      }
      return false; // Allow default back navigation
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => subscription.remove();
  }, [pathname]);

  // MUST be before any conditional return to satisfy React Rules of Hooks
  const tabBarTranslateY = React.useMemo(() => {
    return Animated.diffClamp(clampedScrollY, 0, 150).interpolate({
      inputRange: [0, 150],
      outputRange: [0, 150],
      extrapolate: "clamp",
    });
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const isSuspended = user?.status === "suspended";
  const isBanned = user?.status === "banned";

  if (user && (isSuspended || isBanned)) {
    return (
      <SafeAreaView
        style={[
          styles.suspendedContainer,
          { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
        ]}
        edges={["top", "bottom"]}
      >
        <ExpoStatusBar style={isDark ? "light" : "dark"} />
        <View
          style={[
            styles.suspendedCard,
            {
              backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
              borderColor: isDark ? "#334155" : "#E2E8F0",
            },
          ]}
        >
          <View
            style={[
              styles.suspendedIconBg,
              { backgroundColor: isSuspended ? "#FEF3C7" : "#FEE2E2" },
            ]}
          >
            <Ionicons
              name={isSuspended ? "warning-outline" : "ban-outline"}
              size={44}
              color={isSuspended ? "#D97706" : "#DC2626"}
            />
          </View>
          <Text
            style={[
              styles.suspendedTitle,
              { color: isDark ? "#FFFFFF" : "#0F172A" },
            ]}
          >
            {isSuspended ? "Account Suspended" : "Account Banned"}
          </Text>
          <Text
            style={[
              styles.suspendedBody,
              { color: isDark ? "#94A3B8" : "#475569" },
            ]}
          >
            {isSuspended
              ? `Hello ${user.name},\n\nYour account has been temporarily suspended by the MCE Connect Moderation Team for violating our Community Guidelines and Terms of Service.\n\nIf you believe this is a mistake, please reach out to Support at mcemotihari.tech@gmail.com.`
              : `Hello ${user.name},\n\nYour account has been permanently banned from MCE Connect due to severe or repeated violations of our Community Guidelines and safety policies.\n\nAccess to all platform features has been revoked.`}
          </Text>
          <TouchableOpacity
            style={styles.suspendedLogoutBtn}
            onPress={async () => {
              const { signOut } = require("firebase/auth");
              const { auth } = require("@/config/firebase");
              try {
                await signOut(auth);
              } catch (e) {}
              useAppStore.getState().logout();
              router.replace("/login");
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.suspendedLogoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, width: "100%" }} {...edgeSwipePanResponder.panHandlers}>
      <ExpoStatusBar
        style={isDark ? "light" : "dark"}
        translucent={true}
        backgroundColor="transparent"
      />
      <Stack screenOptions={{ headerShown: false, contentStyle: { flex: 1, width: "100%", backgroundColor: isDark ? "#0F172A" : "#F8FAFC" } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>

      
      <Modal transparent={true} visible={!splashAnimationDone} animationType="none">
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
              justifyContent: "center",
              alignItems: "center",
              opacity: splashOpacity,
              zIndex: 9999999,
            },
          ]}
        >
          <Animated.Image
            source={require("../../assets/images/icon.png")}
            style={{
              width: 120,
              height: 120,
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
              borderRadius: 24,
            }}
            resizeMode="contain"
          />
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 999999,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    maxWidth: 440,
    alignSelf: "center",
    width: "92%",
  },
  toastIcon: {
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  toastClose: {
    marginLeft: 10,
    padding: 4,
  },
  suspendedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  suspendedCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  suspendedIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  suspendedTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  suspendedBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  suspendedLogoutBtn: {
    backgroundColor: "#EA580C",
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  suspendedLogoutText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

// Proper React component so hooks (useAppStore) work reactively
function CustomTabBar(props: any) {
  const isInChatRoom = useAppStore((state) => state.isInChatRoom);
  const { state, descriptors } = props;
  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;
  const tabBarStyle = focusedOptions?.tabBarStyle as any;

  if (isInChatRoom || (tabBarStyle && tabBarStyle.display === "none")) {
    return null;
  }

  // Hardcode the allowed main tabs to guarantee no unwanted tabs appear.
  // Expo Router sometimes strips custom properties from options, making them unreliable for filtering.
  const allowedRoutes = ["index", "network", "explore", "notice", "community"];
  const visibleRoutes = state.routes.filter((route: any) => {
    return allowedRoutes.includes(route.name);
  });
  
  // Find the new index of the active route in the filtered array
  const newIndex = visibleRoutes.findIndex((r: any) => r.key === focusedRoute.key);
  
  const filteredState = {
    ...state,
    routes: visibleRoutes,
    index: newIndex !== -1 ? newIndex : 0,
  };

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        transform: [
          { translateY: Platform.OS === "web" ? 0 : props.tabBarTranslateY },
        ],
        elevation: 15,
        zIndex: 100,
      }}
    >
      <BottomTabBar {...props} state={filteredState} />
    </Animated.View>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <RootLayoutComponent />
    </ErrorBoundary>
  );
}
