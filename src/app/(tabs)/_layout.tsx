import { ErrorBoundary, triggerGlobalCrash } from "@/components/ErrorBoundary";
import { ExploreMenuModal } from "@/components/modals/ExploreMenuModal";
import { NotificationPermissionModal } from "@/components/modals/NotificationPermissionModal";
import { SmartAppBanner } from "@/components/SmartAppBanner";
import { useSafeRouter as useRouter } from "@/hooks/useSafeRouter";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useAppStore } from "@/store/useAppStore";
import { registerAndSavePushToken } from "@/utils/notifications";
import "@/utils/polyfill";
import { clampedScrollY } from "@/utils/scrollState";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { useFonts } from "expo-font";
let Notifications: any = null;
try {
  Notifications = require("expo-notifications");
} catch (e) {
  console.warn("Notifications disabled", e);
}
import { Tabs, useLocalSearchParams, usePathname } from "expo-router";
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
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";



function RootLayoutComponent() {
  const { isDark } = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();


  // Android back button exit confirmation at root screens & custom back stack navigation
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const rootRoutes = ["/", "/network", "/notice", "/profile", "/explore"];

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



  return (
    <View style={{ flex: 1 }}>
      <ExpoStatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor="transparent"
      />
      <Tabs
        tabBar={(props) => (
          <CustomTabBar {...props} tabBarTranslateY={tabBarTranslateY} />
        )}
        screenOptions={{
          sceneStyle: { backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDark
              ? "rgba(15, 23, 42, 0.75)"
              : "rgba(255, 255, 255, 0.75)",
            position: "absolute",
            bottom:
              Platform.OS === "ios"
                ? Math.max(24, insets.bottom + 8)
                : Math.max(24, insets.bottom + 16),
            left: 16,
            right: 16,
            borderRadius: 36,
            borderTopWidth: 0,
            elevation: 15,
            boxShadow:
              Platform.OS === "web" ? `${0}px ${8}px ${16}px #000` : undefined,

            height: 64,
            paddingBottom: 0,
            paddingTop: 0,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: 4,
          },
          tabBarActiveTintColor: "#D95A1D", // Orange from the image
          tabBarInactiveTintColor: isDark ? "#64748B" : "#94A3B8",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            href: "/",
            tabBarLabel: () => {
              const isActive = pathname === "/";
              return (
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? "bold" : "600",
                    marginTop: 4,
                    color: isActive ? "#D95A1D" : "#94A3B8",
                  }}
                >
                  Home
                </Text>
              );
            },
            tabBarIcon: () => {
              const isActive = pathname === "/";
              return (
                <Ionicons
                  name="home"
                  size={24}
                  color={isActive ? "#D95A1D" : "#94A3B8"}
                />
              );
            },
          }}
          listeners={() => ({
            tabPress: (e) => {
              if (pathname === "/") {
                import("react-native").then(({ DeviceEventEmitter }) => {
                  DeviceEventEmitter.emit("homeTabDoubleTap");
                });
              }
            },
          })}
        />
        <Tabs.Screen
          name="network"
          options={{
            title: "Network",
            href: "/network",
            tabBarLabel: () => {
              const isActive = pathname === "/network";
              return (
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? "bold" : "600",
                    marginTop: 4,
                    color: isActive ? "#D95A1D" : "#94A3B8",
                  }}
                >
                  Network
                </Text>
              );
            },
            tabBarIcon: () => {
              const isActive = pathname === "/network";
              return (
                <Ionicons
                  name="people"
                  size={24}
                  color={isActive ? "#D95A1D" : "#94A3B8"}
                />
              );
            },
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
        />

        <Tabs.Screen
          name="notice"
          options={{
            title: "Notice",
            href: "/notice",
            tabBarLabel: () => {
              const isActive = pathname === "/notice";
              return (
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? "bold" : "600",
                    marginTop: 4,
                    color: isActive ? "#D95A1D" : "#94A3B8",
                  }}
                >
                  Notice
                </Text>
              );
            },
            tabBarIcon: () => {
              const isActive = pathname === "/notice";
              return (
                <Ionicons
                  name="document-text"
                  size={24}
                  color={isActive ? "#D95A1D" : "#94A3B8"}
                />
              );
            },
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Community",
            href: "/community",
            tabBarLabel: () => {
              const isActive = pathname === "/community";
              return (
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? "bold" : "600",
                    marginTop: 4,
                    color: isActive ? "#D95A1D" : "#94A3B8",
                  }}
                >
                  Community
                </Text>
              );
            },
            tabBarIcon: () => {
              const isActive = pathname === "/community";
              return (
                <View style={{ position: 'relative' }}>
                  <Ionicons
                    name="chatbubbles"
                    size={24}
                    color={isActive ? "#D95A1D" : "#94A3B8"}
                  />
                  <View style={{
                    position: 'absolute',
                    top: 0,
                    right: -2,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#22C55E',
                    borderWidth: 2,
                    borderColor: isDark ? '#0F172A' : '#FFFFFF'
                  }} />
                </View>
              );
            },
          }}
        />

      </Tabs>

      <ExploreMenuModal />
      <NotificationPermissionModal />
      <SmartAppBanner />
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
  const { state, descriptors, navigation } = props;
  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;
  const tabBarStyle = focusedOptions?.tabBarStyle as any;
  const isDark = useThemeColors().isDark;
  const insets = useSafeAreaInsets();

  if (isInChatRoom || (tabBarStyle && tabBarStyle.display === "none")) {
    return null;
  }

  // Only show these real tabs — exclude explore (handled as custom floating button)
  const realTabNames = ["index", "network", "notice", "community"];
  const visibleRoutes = state.routes.filter((r: any) => realTabNames.includes(r.name));

  const tabIconMap: Record<string, { active: any; inactive: any; label: string }> = {
    index:     { active: "home",        inactive: "home-outline",        label: "Home" },
    network:   { active: "people",      inactive: "people-outline",      label: "Network" },
    notice:    { active: "document-text", inactive: "document-text-outline", label: "Notice" },
    community: { active: "chatbubbles", inactive: "chatbubbles-outline", label: "Community" },
  };

  const bottom = Platform.OS === "ios"
    ? Math.max(24, insets.bottom + 8)
    : Math.max(24, insets.bottom + 16);

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom,
        left: 16,
        right: 16,
        transform: [{ translateY: Platform.OS === "web" ? 0 : props.tabBarTranslateY }],
        elevation: 15,
        zIndex: 100,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        height: 64,
        borderRadius: 36,
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.97)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        borderWidth: Platform.OS === "ios" ? 0.5 : 0,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        paddingHorizontal: 8,
      }}
    >
      {/* Left two tabs */}
      {visibleRoutes.slice(0, 2).map((route: any) => {
        const isFocused = focusedRoute.key === route.key;
        const icon = tabIconMap[route.name];
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.75}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name={isFocused ? icon.active : icon.inactive} size={24} color={isFocused ? "#D95A1D" : "#94A3B8"} />
            <Text style={{ fontSize: 11, fontWeight: isFocused ? "700" : "600", marginTop: 4, color: isFocused ? "#D95A1D" : "#94A3B8" }}>
              {icon.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Center floating Explore button — purely calls setExploreMenuVisible, never navigates */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => useAppStore.getState().setExploreMenuVisible(true)}
        style={{ width: 68, alignItems: "center", justifyContent: "center" }}
      >
        <View
          style={{
            top: -18,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "#D95A1D",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 3,
            borderColor: isDark ? "#0F172A" : "#F3F4F6",
            shadowColor: "#D95A1D",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.45,
            shadowRadius: 10,
            elevation: 12,
          }}
        >
          <Ionicons name="compass-outline" size={30} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Right two tabs */}
      {visibleRoutes.slice(2, 4).map((route: any) => {
        const isFocused = focusedRoute.key === route.key;
        const icon = tabIconMap[route.name];
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            activeOpacity={0.75}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <View style={{ position: 'relative' }}>
              <Ionicons name={isFocused ? icon.active : icon.inactive} size={24} color={isFocused ? "#D95A1D" : "#94A3B8"} />
              {route.name === 'community' && (
                <View style={{
                  position: 'absolute',
                  top: 0,
                  right: -2,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#22C55E',
                  borderWidth: 2,
                  borderColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)'
                }} />
              )}
            </View>
            <Text style={{ fontSize: 11, fontWeight: isFocused ? "700" : "600", marginTop: 4, color: isFocused ? "#D95A1D" : "#94A3B8" }}>
              {icon.label}
            </Text>
          </TouchableOpacity>
        );
      })}
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

