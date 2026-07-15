import React, { useRef, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useSafeRouter as useRouter } from "@/hooks/useSafeRouter";
import { useAppStore } from "@/store/useAppStore";
import { useLocalSearchParams } from "expo-router";
import { useExploreBack } from "@/hooks/useExploreBack";

const { width, height } = Dimensions.get("window");

export default function ResultsScreen() {
  const router = useRouter();


  const webViewRef = useRef<InstanceType<typeof WebView> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleExploreBack = useExploreBack();
  const [currentUrl, setCurrentUrl] = useState(
    "https://beu-bih.ac.in/result-one"
  );

  const insets = useSafeAreaInsets();
  const theme = useThemeColors();

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    // Hard limit the loading spinner to 3.5 seconds max for better UX
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const handleBackPress = () => {
    if (canGoBack && !hasError) {
      webViewRef.current?.goBack();
      return;
    }
    if (from === 'explore') {
      handleExploreBack(from);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  // Custom Javascript to hide headers, footers, M.Tech/MBA rows, and auto-scroll to B.Tech section
  const filterScript = `
    (function() {
      // 1. Inject CSS immediately to hide page structure elements from rendering
      var style = document.createElement('style');
      style.innerHTML = 'header, footer, .header, .footer, #header, #footer, .navigation, .nav, nav, .sidebar, #sidebar, .breadcrumb, .site-header, .site-footer, .widget-area, #right-sidebar, #left-sidebar, .navbar, #navbar, .top-bar, .bottom-bar, .footer-widgets, .student-grievance, [href*="tel:"], .back-to-top, .float, img, iframe[title*="accessibility"], iframe[title*="Accessibility"], [aria-label*="Accessibility"], .userway, #userway, .acsb, .acsb-trigger, a[href*="erp"], a[href*="ERP"], a[href*="tel:"], #back-to-top, .student-grievance, .sticky-btn, .fixed-btn { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; z-index: -9999 !important; }';
      document.documentElement.appendChild(style);

      var hasScrolled = false;
      var runFilter = function() {
        // 2. Hide rows/items of M.Tech and MBA results
        var rows = document.querySelectorAll('tr, li, .list-item, div.row, div.card, .card-header');
        rows.forEach(function(row) {
          var text = row.textContent || '';
          var hasMTech = text.indexOf('M.Tech') > -1 || text.indexOf('M. Tech') > -1 || text.indexOf('M.Tech.') > -1 || text.indexOf('M.TECH') > -1;
          var hasMBA = text.indexOf('MBA') > -1 || text.indexOf('M.B.A.') > -1 || text.indexOf('M.B.A') > -1 || text.indexOf('MBA.') > -1;
          var hasBTech = text.indexOf('B.Tech') > -1 || text.indexOf('B. Tech') > -1 || text.indexOf('B.Tech.') > -1 || text.indexOf('B.TECH') > -1;
          
          // Hide only if it contains MTech/MBA and is not related to BTech
          if ((hasMTech || hasMBA) && !hasBTech) {
            row.style.display = 'none';
          }
        });

        // 3. Hide specific heading elements for M.Tech and MBA
        var elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, p');
        elements.forEach(function(el) {
          var t = (el.textContent || '').trim();
          if (t === 'M.Tech' || t === 'M. Tech' || t === 'M.TECH' || t === 'M.Tech.' || 
              t === 'MBA' || t === 'M.B.A.' || t === 'M.B.A' || t === 'MBA.') {
            el.style.display = 'none';
          }
        });

        // 4. Scroll directly to B.Tech section header if visible (only once)
        if (!hasScrolled) {
          var headings = document.querySelectorAll('*');
          var btechHeader = null;
          for (var i = 0; i < headings.length; i++) {
            var t = (headings[i].textContent || '').trim();
            if (t === 'B.Tech' || t === 'B. Tech' || t === 'B.TECH' || t === 'B.Tech (Old)') {
              btechHeader = headings[i];
              break;
            }
          }

          // Hide all fixed and sticky elements (floating buttons, chat widgets, accessibility, etc.) on every tick
          var allElems = document.querySelectorAll('body *');
          for (var j = 0; j < allElems.length; j++) {
            var el = allElems[j];
            var computedStyle = window.getComputedStyle(el);
            if (computedStyle.position === 'fixed' || computedStyle.position === 'sticky') {
              el.style.display = 'none';
            }
            // Aggressive text matching for known floating junk
            var txt = (el.textContent || '').trim().toLowerCase();
            if (txt === 'beu erp' || txt.includes("student's grievance") || txt === 'back to top') {
              el.style.display = 'none';
            }
          }

          if (btechHeader) {
            // Hide elements that appear vertically above B.Tech
            var btechRect = btechHeader.getBoundingClientRect();
            var btechY = btechRect.top + window.scrollY;
            
            for (var k = 0; k < allElems.length; k++) {
               var el2 = allElems[k];
               if (el2.contains(btechHeader)) continue; // skip parents
               var rect = el2.getBoundingClientRect();
               if (rect.height > 0 && rect.top + window.scrollY + rect.height < btechY - 50) {
                  el2.style.display = 'none';
               }
            }

            btechHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
            hasScrolled = true;
          }
        }
      };

      // Run immediately
      runFilter();

      // Run on interval to handle dynamic content loading in Angular
      var intervalId = setInterval(runFilter, 200);

      // Clear interval after 12 seconds to release resources
      setTimeout(function() {
        clearInterval(intervalId);
      }, 12000);
    })();
    true;
  `;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(12, insets.top),
            paddingBottom: 12,
            backgroundColor: theme.backgroundElement,
            borderBottomColor: theme.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.headerBackBtn,
            {
              backgroundColor: theme.isDark ? theme.background : "#F8FAFC",
              borderColor: theme.cardBorder,
            },
          ]}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: theme.text }]}
          numberOfLines={1}
        >
          BEU Result portal
        </Text>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => Linking.openURL(currentUrl)}
            style={[
              styles.headerActionBtn,
              { backgroundColor: theme.isDark ? "#334155" : "#F1F5F9" },
            ]}
          >
            <Ionicons name="open-outline" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Web Browser WebView Content */}
      <View style={styles.webContainer}>
        {Platform.OS === "web" ? (
          <iframe
            src="https://beu-bih.ac.in/result-one"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              display: hasError ? "none" : "block",
            }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        ) : (
          <WebView
            ref={webViewRef as any}
            source={{ uri: "https://beu-bih.ac.in/result-one" }}
            style={hasError ? { display: "none" } : styles.webView}
            onLoadStart={() => {
              setIsLoading(true);
              setHasError(false);
            }}
            onLoadProgress={({ nativeEvent }: { nativeEvent: any }) => {
              // If the main document has loaded more than 60%, hide the spinner early to improve UX
              if (nativeEvent.progress > 0.6) {
                setIsLoading(false);
              }
            }}
            onLoadEnd={() => {
              setIsLoading(false);
              if (!hasError) {
                webViewRef.current?.injectJavaScript(filterScript);
              }
            }}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
            onHttpError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
            onShouldStartLoadWithRequest={(request: WebViewNavigation) => {
              const { url } = request;
              if (url.toLowerCase().endsWith(".pdf")) {
                if (Platform.OS === "android") {
                  Linking.openURL(url).catch(() => {
                    Alert.alert("Error", "Unable to open PDF.");
                  });
                  return false;
                } else if (Platform.OS === "web") {
                  window.location.href = url;
                  return false;
                }
                return true;
              }
              return true;
            }}
            injectedJavaScriptBeforeContentLoaded={filterScript}
            injectedJavaScript={filterScript}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            setSupportMultipleWindows={false}
          />
        )}

        {/* Fallback Screen when Server is Down / Offline */}
        {hasError && (
          <View
            style={[
              styles.errorContainer,
              { backgroundColor: theme.background },
            ]}
          >
            <View
              style={[
                styles.errorCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.errorIconCircle,
                  { backgroundColor: theme.isDark ? "#451a1a" : "#FEE2E2" },
                ]}
              >
                <Ionicons
                  name="cloud-offline-outline"
                  size={44}
                  color="#EF4444"
                />
              </View>
              <Text style={[styles.errorTitle, { color: theme.text }]}>
                Portal Unreachable
              </Text>
              <Text style={[styles.errorText, { color: theme.textSecondary }]}>
                BEU Results server unresponsive ho sakta hai ya down hai. Aap
                direct link par tap karke manual site open kar sakte hain:
              </Text>

              {/* Clickable link box */}
              <TouchableOpacity
                style={[
                  styles.linkBox,
                  {
                    backgroundColor: theme.isDark ? "#1E293B" : "#F8FAFC",
                    borderColor: theme.cardBorder,
                  },
                ]}
                onPress={() =>
                  Linking.openURL("https://beu-bih.ac.in/result-one")
                }
                activeOpacity={0.75}
              >
                <Ionicons name="link-outline" size={16} color="#10B981" />
                <Text style={styles.linkText} numberOfLines={1}>
                  https://beu-bih.ac.in/result-one
                </Text>
                <Ionicons
                  name="open-outline"
                  size={14}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>

              <View style={styles.errorActionsRow}>
                <TouchableOpacity
                  style={[styles.errorBtn, styles.retryBtn]}
                  onPress={() => { setHasError(false); webViewRef.current?.reload(); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.errorBtnText}>Retry Load</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.errorBtn,
                    styles.browserBtn,
                    { borderColor: theme.cardBorder },
                  ]}
                  onPress={() =>
                    Linking.openURL("https://beu-bih.ac.in/result-one")
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons name="globe-outline" size={16} color={theme.text} />
                  <Text style={[styles.browserBtnText, { color: theme.text }]}>
                    Open Browser
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Spinner Overlay */}
        {isLoading && !hasError && (
          <View
            style={[
              styles.loadingOverlay,
              { backgroundColor: theme.background },
            ]}
          >
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Syncing B.Tech results portal...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  webContainer: {
    flex: 1,
    position: "relative",
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  webFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  footerNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  footerNavBtnDisabled: {
    opacity: 0.5,
  },
  secureConnectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  secureConnectionText: {
    fontSize: 10.5,
    color: "#16A34A",
    fontWeight: "700",
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  errorIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  linkBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 20,
    width: "100%",
  },
  linkText: {
    fontSize: 12.5,
    color: "#10B981",
    fontWeight: "600",
    flex: 1,
  },
  errorActionsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  errorBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  retryBtn: {
    backgroundColor: "#10B981",
  },
  browserBtn: {
    backgroundColor: "transparent",
  },
  errorBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  browserBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
