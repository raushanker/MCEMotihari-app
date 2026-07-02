import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  TextInput,
  Image,
  Linking,
  LayoutAnimation,
  Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { DEPARTMENTS } from '@/data/departments';
import { FACULTY_DATA } from '@/data/faculty';
import { DSTTE_RATES, ConsultancyLaboratory, ConsultancyCategory, ConsultancyTest } from '@/data/dstteRates';
import Animated, { useAnimatedStyle, withSequence, withTiming, withDelay, runOnJS } from 'react-native-reanimated';
import PdfViewerModal from '@/components/modals/PdfViewerModal';
import { Share } from 'react-native';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const OFFICIAL_RATE_LIST_URL = 'https://drive.google.com/file/d/1xI71Zku-PFnYHLx0FTYFtrQuHKnFNecS/view';
const APP_LINK = 'https://play.google.com/store/apps/details?id=mcemotihari.app';

// ─── Highlighted Row Component ───────────────────────────────────────────────
function TestRow({
  test,
  isLast,
  theme,
  isHighlighted,
  onLayout
}: {
  test: ConsultancyTest;
  isLast: boolean;
  theme: any;
  isHighlighted: boolean;
  onLayout: (y: number) => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: isHighlighted
        ? withSequence(
            withTiming(theme.isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.2)', { duration: 300 }),
            withDelay(2000, withTiming('transparent', { duration: 500 }))
          )
        : 'transparent',
    };
  }, [isHighlighted]);

  return (
    <Animated.View
      style={[
        styles.tableRow,
        { borderBottomColor: theme.cardBorder, borderBottomWidth: isLast ? 0 : 1 },
        animatedStyle
      ]}
      onLayout={(e) => onLayout(e.nativeEvent.layout.y)}
    >
      <Text style={[styles.tdText, { color: theme.text, flex: 3 }]}>{test.name}</Text>
      <Text style={[styles.tdText, { color: theme.text, flex: 1, textAlign: 'right', fontWeight: '600' }]}>
        {test.charge}
      </Text>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ConsultancyScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from: string }>();
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const paddingTop = Platform.OS === 'android' ? (statusBarHeight || 24) : (insets.top || 44);

  const sushantData = FACULTY_DATA.find(f => f.id === 'civil-sushant');

  // Accordion State
  const [expandedLab, setExpandedLab] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedTest, setHighlightedTest] = useState<string | null>(null);
  
  // PDF Viewer State
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const categoryPositions = useRef<Record<string, number>>({});
  const testPositions = useRef<Record<string, number>>({});

  // ─── Search Logic ──────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase().trim();
    const results: {
      lab: ConsultancyLaboratory;
      cat: ConsultancyCategory;
      test: ConsultancyTest;
    }[] = [];

    DSTTE_RATES.forEach(lab => {
      lab.categories.forEach(cat => {
        cat.tests.forEach(test => {
          if (
            test.name.toLowerCase().includes(query) ||
            cat.name.toLowerCase().includes(query) ||
            lab.name.toLowerCase().includes(query)
          ) {
            results.push({ lab, cat, test });
          }
        });
      });
    });
    
    return results;
  }, [searchQuery]);

  const handleSelectSearchResult = (labId: string, catId: string, testId: string) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setIsSearchFocused(false);

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedLab(labId);
    setExpandedCategory(catId);
    setHighlightedTest(testId);

    // Give layout time to measure expanded accordions, then scroll
    setTimeout(() => {
      const catY = categoryPositions.current[`${labId}-${catId}`] || 0;
      const testY = testPositions.current[`${catId}-${testId}`] || 0;
      // Scroll offset = category's Y position + test's relative Y position + some padding
      const scrollY = catY + testY - 100;
      scrollViewRef.current?.scrollTo({ y: Math.max(0, scrollY), animated: true });
    }, 400);

    // Remove highlight after animation finishes
    setTimeout(() => {
      setHighlightedTest(null);
    }, 3000);
  };

  // ─── PDF Sharing ───────────────────────────────────────────────────────────
  const handleSharePdf = async () => {
    try {
      await Share.share({
        title: 'DSTTE Rate List',
        message: `📄 Document: DSTTE Rate List\nℹ️ About: Official DSTTE Standard Rate List for Industrial Consultancy.\n\nShared via MCE Motihari App:\n${APP_LINK}`,
      });
    } catch (error) {
      console.log('Share dismissed or failed', error);
    }
  };

  // ─── Renderers ─────────────────────────────────────────────────────────────
  const renderCategory = (labId: string, cat: ConsultancyCategory) => {
    const isCatExpanded = expandedCategory === cat.id;

    return (
      <View 
        key={cat.id} 
        style={styles.categoryContainer}
        onLayout={(e) => {
          // Accumulate position for scrolling
          categoryPositions.current[`${labId}-${cat.id}`] = e.nativeEvent.layout.y;
        }}
      >
        <TouchableOpacity 
          style={[styles.categoryHeader, { backgroundColor: theme.isDark ? '#374151' : '#F3F4F6' }]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpandedCategory(isCatExpanded ? null : cat.id);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.categoryTitleText, { color: theme.text }]}>{cat.name}</Text>
          <Ionicons name={isCatExpanded ? "chevron-up" : "chevron-down"} size={18} color={theme.textSecondary} />
        </TouchableOpacity>

        {isCatExpanded && (
          <View style={[styles.tableContainer, { borderColor: theme.cardBorder, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }]}>
            <View style={[styles.tableHeader, { backgroundColor: theme.isDark ? '#1F2937' : '#E5E7EB', borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.thText, { color: theme.textSecondary, flex: 3 }]}>Name of the Lab Test</Text>
              <Text style={[styles.thText, { color: theme.textSecondary, flex: 1, textAlign: 'right' }]}>Charge (Rs.)</Text>
            </View>
            
            {cat.tests.map((test, index) => (
              <TestRow
                key={test.id}
                test={test}
                isLast={index === cat.tests.length - 1}
                theme={theme}
                isHighlighted={highlightedTest === test.id}
                onLayout={(y) => {
                  testPositions.current[`${cat.id}-${test.id}`] = y;
                }}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderLabSection = (lab: ConsultancyLaboratory) => {
    const isExpanded = expandedLab === lab.id;
    return (
      <View key={lab.id} style={[styles.sectionContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpandedLab(isExpanded ? null : lab.id);
            // Close category if lab is closed
            if (isExpanded) setExpandedCategory(null);
          }}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="flask" size={20} color="#10B981" style={{ marginRight: 10 }} />
            <Text style={[styles.sectionTitleText, { color: theme.text }]}>{lab.name}</Text>
          </View>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.categoriesWrapper}>
            {lab.categories.map(cat => renderCategory(lab.id, cat))}
            
            <View style={{ padding: 12, backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF', marginTop: 12, borderRadius: 8 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                Remarks: G.S.T. will be charged as per Govt. order with additional office contingency charged.
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop }]}>
      {/* ─── Header ─── */}
      <View style={[styles.header, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity 
          style={[styles.headerBackBtn, { backgroundColor: theme.isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]} 
          onPress={() => {
            if (from === 'hub' && id) {
              router.replace(`/department/${encodeURIComponent(id as string)}?deptId=${encodeURIComponent(id as string)}`);
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }} 
          activeOpacity={0.6}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text, flex: 1 }]}>Industrial Consultancy</Text>
      </View>

      {/* ─── Sticky Search Bar ─── */}
      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search Laboratory or Test Name..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── Search Results Dropdown ─── */}
      {(searchQuery.length > 0 && isSearchFocused) && (
        <View style={[styles.searchResultsContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, shadowColor: theme.text }]}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 300 }}>
            {searchResults.length === 0 ? (
              <Text style={[styles.noResultText, { color: theme.textSecondary }]}>No tests found matching "{searchQuery}"</Text>
            ) : (
              searchResults.map((res, idx) => (
                <TouchableOpacity 
                  key={`${res.lab.id}-${res.cat.id}-${res.test.id}-${idx}`}
                  style={[styles.searchResultItem, { borderBottomColor: theme.cardBorder, borderBottomWidth: idx === searchResults.length - 1 ? 0 : 1 }]}
                  onPress={() => handleSelectSearchResult(res.lab.id, res.cat.id, res.test.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.searchResultTest, { color: theme.text }]}>{res.test.name}</Text>
                    <Text style={[styles.searchResultPath, { color: theme.textSecondary }]}>{res.lab.name} • {res.cat.name}</Text>
                  </View>
                  <Text style={[styles.searchResultPrice, { color: theme.text }]}>{res.test.charge}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* ─── Main Content ─── */}
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Industrial Consultancy and Research</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>Department of Civil Engineering</Text>
        </View>

        {/* Dynamic JSON Laboratories */}
        {DSTTE_RATES.map(lab => renderLabSection(lab))}

        {/* ─── Contact Info ─── */}
        <Text style={[styles.sectionTitleText, { color: theme.textSecondary, marginTop: 12, marginBottom: 12, marginLeft: 4, textTransform: 'uppercase', fontSize: 13, letterSpacing: 0.5 }]}>Contact Person</Text>
        
        <View style={[styles.contactCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, padding: 0, overflow: 'hidden' }]}>
          <TouchableOpacity 
            style={[styles.profileSection, { borderBottomColor: theme.cardBorder, borderBottomWidth: 1 }]}
            activeOpacity={0.7}
            onPress={() => router.push('/faculty?facultyId=civil-sushant&from=consultancy&deptId=civil')}
          >
            {sushantData ? (
              <Image source={{ uri: sushantData.imageUrl }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="person" size={32} color="#3B82F6" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactName, { color: theme.text }]}>Mr. Sushant Kumar</Text>
              <Text style={[styles.contactRole, { color: theme.textSecondary }]}>Prof. In-charge (Consultancy)</Text>
              <Text style={[styles.contactRole, { color: theme.textSecondary, fontSize: 12 }]}>Assistant Professor, Civil Engineering</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={styles.actionsSection}>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.1)', flex: 1, marginRight: 8 }]}
              activeOpacity={0.7}
              onPress={() => Linking.openURL('tel:8210116757')}
            >
              <Ionicons name="call" size={18} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Call Now</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', flex: 1, marginLeft: 8 }]}
              activeOpacity={0.7}
              onPress={() => Linking.openURL('mailto:sushantkumar0007@gmail.com')}
            >
              <Ionicons name="mail" size={18} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Send Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Disclaimer & PDF Link ─── */}
        <View style={[styles.disclaimerBox, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF', borderColor: 'rgba(59, 130, 246, 0.3)', marginTop: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="ribbon" size={24} color="#3B82F6" style={{ marginRight: 8 }} />
            <Text style={[styles.badgeText, { color: theme.text }]}>DSTTE Standard Rates</Text>
          </View>
          <Text style={[styles.disclaimerText, { color: theme.text }]}>
            These consultancy testing charges are based on the Standard Rate List issued by the Department of Science, Technology & Technical Education (DSTTE), Government of Bihar.
          </Text>
          <Text style={[styles.disclaimerPoints, { color: theme.textSecondary }]}>
            • Rates apply to laboratory testing only.{'\n'}
            • Field contingency charges, if applicable, will be estimated separately by the institute.{'\n'}
            • GST will be charged as per Government rules.{'\n'}
            • Rates are subject to revision by DSTTE.{'\n'}
            • Please contact the Industrial Consultancy Cell for the latest rates and special testing requirements.
          </Text>
          
          <View style={styles.pdfActions}>
            <TouchableOpacity 
              style={[styles.pdfBtn, { backgroundColor: '#3B82F6', flex: 1, marginRight: 8 }]}
              onPress={() => setPdfViewerOpen(true)}
            >
              <Ionicons name="document-text" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.pdfBtnText}>View Official Rate List</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.pdfShareBtn, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]}
              onPress={handleSharePdf}
            >
              <Ionicons name="share-social" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* PDF Viewer Modal */}
      {pdfViewerOpen && (
        <PdfViewerModal
          visible={pdfViewerOpen}
          url={OFFICIAL_RATE_LIST_URL}
          title="DSTTE Rate List"
          onClose={() => setPdfViewerOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  clearIcon: { padding: 4 },
  searchResultsContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 128 + (StatusBar.currentHeight ?? 0) : 152, // Approximate height of header + search
    left: 12,
    right: 12,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchResultTest: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  searchResultPath: { fontSize: 12 },
  searchResultPrice: { fontSize: 14, fontWeight: '700' },
  noResultText: { padding: 16, textAlign: 'center', fontSize: 14 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  pageSubtitle: { fontSize: 15 },
  sectionContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  sectionTitleText: { fontSize: 16, fontWeight: '700' },
  categoriesWrapper: { paddingHorizontal: 12, paddingBottom: 12 },
  categoryContainer: { marginBottom: 8 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  categoryTitleText: { fontSize: 14, fontWeight: '600' },
  tableContainer: {
    padding: 0,
    marginTop: 0,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  thText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tdText: { fontSize: 14, lineHeight: 20 },
  contactCard: { borderRadius: 16, borderWidth: 1, marginTop: 4 },
  profileSection: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  profileImage: { width: 60, height: 60, borderRadius: 30, marginRight: 16 },
  profileImagePlaceholder: {
    width: 60, height: 60, borderRadius: 30, marginRight: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  contactName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  contactRole: { fontSize: 13, marginBottom: 2 },
  actionsSection: { flexDirection: 'row', padding: 16 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  disclaimerBox: { padding: 16, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontSize: 16, fontWeight: 'bold' },
  disclaimerText: { fontSize: 14, lineHeight: 20, marginBottom: 8, fontWeight: '600' },
  disclaimerPoints: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  pdfActions: { flexDirection: 'row', alignItems: 'center' },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 8,
  },
  pdfBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  pdfShareBtn: {
    width: 44, height: 44, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
});
