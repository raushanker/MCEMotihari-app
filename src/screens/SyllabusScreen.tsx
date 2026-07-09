import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, View, Text, ScrollView,  TouchableOpacity, 
  Alert, Share, Modal, Platform, Dimensions, BackHandler, Linking
} from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { 
  BRANCHES_SYLLABUS, BEU_PORTAL_URL, BranchSyllabus, 
  CIVIL_SYLLABUS_DETAILED, CSE_SYLLABUS_DETAILED, SubjectDetail, SemesterDetail 
} from '@/data/syllabus';
import { useAppStore } from '@/store/useAppStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

const { width, height } = Dimensions.get('window');

interface SyllabusScreenProps {
  onBack?: () => void;
  initialBranchId?: string;
}

export const SyllabusScreen: React.FC<SyllabusScreenProps> = ({ onBack, initialBranchId }) => {
  const theme = useThemeColors();
  const router = useRouter();
  
  // GATE States
  const [isGateExpanded, setIsGateExpanded] = useState(false);

  // Navigation states
  const [activeBranchId, setActiveBranchId] = useState<string | null>(initialBranchId || null);

  // Helper to identify detailed syllabus branches
  const isDetailedBranch = (id: string | null) => id === 'civil' || id === 'civil_ca' || id === 'cse';

  // Dynamic detailed syllabus selection based on active branch
  const activeSyllabusDetailed = useMemo(() => {
    if (activeBranchId === 'cse') return CSE_SYLLABUS_DETAILED;
    return CIVIL_SYLLABUS_DETAILED;
  }, [activeBranchId]);

  // --- HUB VIEW STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);
  const [expandedSemesterKey, setExpandedSemesterKey] = useState<string | null>(null);

  // --- CIVIL/CSE EXPLORER STATES ---
  const [selectedSemTab, setSelectedSemTab] = useState('Sem 1');

  // Reset active tab to first available semester in the branch when activeBranchId changes
  React.useEffect(() => {
    if (activeBranchId) {
      const detailedData = activeBranchId === 'cse' ? CSE_SYLLABUS_DETAILED : CIVIL_SYLLABUS_DETAILED;
      if (detailedData.length > 0) {
        setSelectedSemTab(detailedData[0].semester);
      }
    }
  }, [activeBranchId]);

  // Hardware back press handler for Syllabus screen states
  React.useEffect(() => {
    if (Platform.OS === 'web') return;

    const onBackPress = () => {
      if (activeBranchId && !initialBranchId) {
        setActiveBranchId(null);
        setCivilSearchQuery('');
        return true; // handled, don't bubble
      }
      return false; // bubble up to explore.tsx BackHandler
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [activeBranchId, initialBranchId]);
  const [civilSearchQuery, setCivilSearchQuery] = useState('');
  const [expandedSubjectNames, setExpandedSubjectNames] = useState<Record<string, boolean>>({});
  
  // Zustand Store logic
  const storeBookmarks = useAppStore(state => state.bookmarkedSubjects);
  const toggleSubjectBookmark = useAppStore(state => state.toggleSubjectBookmark);
  
  const [activeDetailSubject, setActiveDetailSubject] = useState<SubjectDetail | null>(null);
  
  // Highlighting helper for searches
  const highlightText = (text: string, search: string, baseStyle: any, highlightStyle: any) => {
    if (!search) {
      return <Text style={baseStyle}>{text}</Text>;
    }
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return (
      <Text style={baseStyle}>
        {parts.map((part, i) => 
          part.toLowerCase() === search.toLowerCase() ? (
            <Text key={i} style={highlightStyle}>{part}</Text>
          ) : (
            part
          )
        )}
      </Text>
    );
  };

  // --- 1. BRANCHES HUB VIEWER ---
  const query = searchQuery.trim().toLowerCase();

  const filteredBranches = useMemo(() => {
    if (!query) return BRANCHES_SYLLABUS;
    return BRANCHES_SYLLABUS.filter(branch => {
      const matchesBranchName = branch.branchName.toLowerCase().includes(query);
      const matchesAnySubject = branch.semesters.some(sem => 
        sem.semester.toLowerCase().includes(query) ||
        sem.subjects.some(sub => sub.toLowerCase().includes(query))
      );
      return matchesBranchName || matchesAnySubject;
    });
  }, [query]);

  const toggleBranch = (branchId: string) => {
    setExpandedBranchId(prev => (prev === branchId ? null : branchId));
    setExpandedSemesterKey(null);
  };

  const toggleSemester = (semesterKey: string) => {
    setExpandedSemesterKey(prev => (prev === semesterKey ? null : semesterKey));
  };

  const isBranchExpanded = (branchId: string) => {
    if (query) return true;
    return expandedBranchId === branchId;
  };

  const isSemesterExpanded = (branchId: string, semesterName: string) => {
    if (query) return true;
    return expandedSemesterKey === `${branchId}-${semesterName}`;
  };

  // --- 2. CIVIL COURSEWORK EXPLORER ---
  const civilQuery = civilSearchQuery.trim().toLowerCase();

  // Filtered subjects based on search
  const filteredCivilSubjects = useMemo(() => {
    if (!civilQuery) {
      // If no query, return only subjects for the active semester tab
      const semData = activeSyllabusDetailed.find(s => s.semester === selectedSemTab);
      return semData ? semData.subjects.map(sub => ({ ...sub, semester: selectedSemTab })) : [];
    }

    // If query exists, search across all semesters
    const results: (SubjectDetail & { semester: string })[] = [];
    activeSyllabusDetailed.forEach(semData => {
      semData.subjects.forEach(subject => {
        const matchesName = subject.name.toLowerCase().includes(civilQuery);
        const matchesCode = subject.code.toLowerCase().includes(civilQuery);
        const matchesModule = subject.modules.some(mod => mod.toLowerCase().includes(civilQuery));
        
        if (matchesName || matchesCode || matchesModule) {
          results.push({ ...subject, semester: semData.semester });
        }
      });
    });
    return results;
  }, [civilQuery, selectedSemTab]);

  const toggleSubjectExpand = (subjectName: string) => {
    setExpandedSubjectNames(prev => ({
      ...prev,
      [subjectName]: !prev[subjectName]
    }));
  };

  const toggleBookmark = (subjectName: string) => {
    const isStarred = !storeBookmarks.includes(subjectName);
    toggleSubjectBookmark(subjectName);
    Alert.alert(
      isStarred ? 'Subject Saved ⭐' : 'Bookmark Removed',
      isStarred 
        ? `"${subjectName}" has been bookmarked offline for quick access.` 
        : `"${subjectName}" has been removed from bookmarks.`
    );
  };

  const handleShareSyllabus = async (subject: SubjectDetail) => {
    try {
      await Share.share({
        message: `MCE Motihari Syllabus - ${subject.name} (Code: ${subject.code}, Credits: ${subject.credits})\nModules:\n${subject.modules.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n\nShared from MCE Connect app.\nDownload here: https://play.google.com/store/apps/details?id=mcemotihari.app`,
        title: `${subject.name} Coursework Syllabus`,
      });
    } catch (error) {
      Alert.alert('Share failed', 'Unable to execute share action.');
    }
  };

  const handleDownloadPDFPlaceholder = (subjectName: string) => {
    Alert.alert(
      'Syllabus Download',
      `Downloading BEU official syllabus PDF for "${subjectName}"...\n(This is a verified academic placeholder.)`
    );
  };

  // Web portal redirect
  const handleOpenPortal = async () => {
    try {
      await WebBrowser.openBrowserAsync(BEU_PORTAL_URL, {
        toolbarColor: '#0F172A',
        enableBarCollapsing: true,
        showTitle: true,
      });
    } catch (error) {
      Alert.alert('Portal Unreachable', 'Please navigate to beu-bih.ac.in manually.');
    }
  };

  // Navigate back handling
  const handleBackPress = () => {
    if (activeBranchId && !initialBranchId) {
      setActiveBranchId(null);
      setCivilSearchQuery('');
    } else if (onBack) {
      onBack();
    }
  };  // State for Web-specific GATE PDF Prompt
  const [webGatePdfPrompt, setWebGatePdfPrompt] = useState<{title: string, url: string} | null>(null);

  // --- RENDER DUAL-VIEWS CONTROLLER ---
  if (isDetailedBranch(activeBranchId)) {
    // ─────────────── PREMIUM CIVIL/CSE SYLLABUS EXPLORER VIEW ───────────────
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]} onPress={handleBackPress} activeOpacity={0.6}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {activeBranchId === 'cse' ? 'Computer Science & Engineering' : 
               activeBranchId === 'civil' ? 'Civil Engineering' : 'Civil with Comp. App.'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
              Semester-wise academic structure (BEU Affiliated)
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 1. Academic Search Bar */}
          <View style={[styles.searchBarContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search subjects, codes, modules..."
              placeholderTextColor="#94A3B8"
              value={civilSearchQuery}
              onChangeText={setCivilSearchQuery}
              clearButtonMode="while-editing"
              returnKeyType="search"
             autoCapitalize="sentences" />
            {civilSearchQuery ? (
              <TouchableOpacity onPress={() => setCivilSearchQuery('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={16} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* 2. Semester Selector Tabs (Shows only when not searching) */}
          {!civilQuery ? (
            <View style={styles.tabsSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                {activeSyllabusDetailed.map(sem => {
                  const active = selectedSemTab === sem.semester;
                  return (
                    <TouchableOpacity
                      key={sem.semester}
                      style={[styles.semTab, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }, active && [styles.semTabActive, { backgroundColor: theme.primary, borderColor: theme.primary }]]}
                      onPress={() => setSelectedSemTab(sem.semester)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.semTabText, { color: theme.textSecondary }, active && [styles.semTabTextActive, { color: '#FFFFFF' }]]}>
                        {sem.semester}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.searchResultsHeaderRow}>
              <Text style={[styles.searchResultsTitle, { color: theme.text }]}>Search Results</Text>
              <Text style={[styles.searchResultsCount, { color: theme.textSecondary }]}>({filteredCivilSubjects.length} found)</Text>
            </View>
          )}

          {/* 3. Subjects list */}
          {filteredCivilSubjects.length > 0 ? (
            <View style={styles.subjectCardsContainer}>
              {filteredCivilSubjects.map((item, idx) => {
                const isExpanded = !!expandedSubjectNames[item.name];
                const isStarred = storeBookmarks.includes(item.name);
                const itemSem = (item as any).semester;

                return (
                  <View key={idx} style={[styles.subjectCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }, isExpanded && [styles.subjectCardExpanded, { borderColor: theme.isDark ? 'rgba(249, 115, 22, 0.4)' : '#FED7AA' }]]}>
                    
                    {/* Subject Primary Details */}
                    <TouchableOpacity 
                      style={styles.subjectCardHeader}
                      onPress={() => toggleSubjectExpand(item.name)}
                      activeOpacity={0.9}
                    >
                      <View style={styles.subjectCardHeaderLeft}>
                        {highlightText(item.name, civilQuery, [styles.subjectNameText, { color: theme.text }], styles.highlightText)}
                        
                        <View style={styles.subjectMetaRow}>
                          <View style={[styles.metaBadge, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                            <Text style={[styles.metaBadgeText, { color: theme.textSecondary }]}>CODE: {item.code}</Text>
                          </View>
                          <View style={[styles.metaBadge, { backgroundColor: theme.isDark ? 'rgba(22, 163, 74, 0.15)' : '#F0FDF4', borderColor: theme.isDark ? 'rgba(22, 163, 74, 0.3)' : '#E2E8F0' }]}>
                            <Text style={[styles.metaBadgeText, { color: '#16A34A' }]}>{item.credits} Credits</Text>
                          </View>
                          {civilQuery && (
                            <View style={[styles.metaBadge, { backgroundColor: theme.isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF', borderColor: theme.isDark ? 'rgba(37, 99, 235, 0.3)' : '#E2E8F0' }]}>
                              <Text style={[styles.metaBadgeText, { color: '#2563EB' }]}>{itemSem}</Text>
                            </View>
                          )}
                        </View>

                        <Text style={[styles.subjectDescText, { color: theme.textSecondary }]} numberOfLines={isExpanded ? undefined : 2}>
                          {item.description}
                        </Text>
                      </View>
                      
                      <View style={styles.subjectCardHeaderRight}>
                        <Ionicons 
                          name={isExpanded ? "chevron-up" : "chevron-down"} 
                          size={18} 
                          color={theme.textSecondary} 
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Bookmark / Share Action Row */}
                    <View style={[styles.subjectActionButtonsRow, { borderTopColor: theme.cardBorder }]}>
                      <TouchableOpacity 
                        style={styles.actionIconButton} 
                        onPress={() => toggleBookmark(item.name)}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={isStarred ? "star" : "star-outline"} 
                          size={16} 
                          color={isStarred ? "#F97316" : theme.textSecondary} 
                        />
                        <Text style={[styles.actionButtonLabel, { color: theme.textSecondary }, isStarred && { color: '#F97316', fontWeight: 'bold' }]}>
                          {isStarred ? 'Saved' : 'Save'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.actionIconButton} 
                        onPress={() => handleShareSyllabus(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="share-social-outline" size={16} color={theme.textSecondary} />
                        <Text style={[styles.actionButtonLabel, { color: theme.textSecondary }]}>Share</Text>
                      </TouchableOpacity>


                      <TouchableOpacity 
                        style={[styles.actionIconButton, { marginLeft: 'auto', backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED' }]} 
                        onPress={() => setActiveDetailSubject(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.actionButtonLabel, { color: '#F97316', fontWeight: 'bold' }]}>
                          Details
                        </Text>
                        <Ionicons name="arrow-forward" size={12} color="#F97316" />
                      </TouchableOpacity>
                    </View>

                    {/* Expanded Modules list Accordion */}
                    {isExpanded && (
                      <View style={[styles.modulesAccordionList, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                        <Text style={[styles.modulesHeaderTitle, { color: theme.textSecondary }]}>COURSE MODULES</Text>
                        {item.modules.map((mod, mIdx) => {
                          const matchesMod = civilQuery && mod.toLowerCase().includes(civilQuery);
                          return (
                            <View key={mIdx} style={[styles.moduleItemRow, matchesMod && [styles.moduleItemRowMatched, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFE3D3' }]]}>
                              <View style={[styles.moduleItemDot, matchesMod && styles.moduleItemDotMatched]} />
                              {highlightText(mod, civilQuery, [styles.moduleItemText, { color: theme.textSecondary }], styles.highlightText)}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            /* Search empty state */
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconFrame, { backgroundColor: theme.background }]}>
                <Ionicons name="search-outline" size={40} color={theme.isDark ? '#475569' : '#CBD5E1'} />
              </View>
              <Text style={[styles.emptyText, { color: theme.text }]}>No subjects matched</Text>
              <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
                No course or module matched your query &quot;{civilSearchQuery}&quot;.
              </Text>
            </View>
          )}

          {/* 4. BEU Syllabus Redirect Button */}
          <View style={[styles.portalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={styles.portalHeaderRow}>
              <View style={[styles.portalIconContainer, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED' }]}>
                <Ionicons name="globe-outline" size={20} color="#F97316" />
              </View>
              <Text style={[styles.portalTitle, { color: theme.text }]}>Official BEU Syllabus</Text>
            </View>
            <Text style={[styles.portalBody, { color: theme.textSecondary }]}>
              For official academic codes, structural credit details, or checking older syllabus codes, visit the Bihar Engineering University portal.
            </Text>
            <TouchableOpacity 
              style={styles.portalButton} 
              onPress={handleOpenPortal}
              activeOpacity={0.85}
            >
              <Text style={styles.portalButtonText}>Visit Official BEU Website</Text>
              <Ionicons name="open-outline" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* 5. Contributions Card (Upload & Share) */}
          <View style={[styles.contributeCard, { borderColor: theme.cardBorder }]}>
            <View style={styles.contributeCardOverlay} />
            <View style={styles.contributeCardContent}>
              <View style={styles.contributeIconBg}>
                <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.contributeTitle}>
                Want to contribute syllabus PDFs or updated academic resources?
              </Text>
              <Text style={styles.contributeSubtitle}>
                You can upload syllabus PDFs to Google Drive and share the folder link with us, or directly email PDFs for future updates.
              </Text>
              <View style={styles.contributeDivider} />
              <View style={styles.contributeEmailRow}>
                <Ionicons name="mail" size={16} color="#FFE3D3" />
                <Text style={styles.contributeEmailText}>mcemotihari.tech@gmail.com</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* 6. Subject Detail Popup Modal Overlay */}
        <Modal
          visible={activeDetailSubject !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveDetailSubject(null)}
        >
          <View style={[styles.modalBackdrop, { backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.45)' }]}>
            <View style={[styles.subjectDetailsModal, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={[styles.modalHeaderRow, { backgroundColor: theme.isDark ? theme.background : '#FAFCFE', borderBottomColor: theme.cardBorder }]}>
                <View style={[styles.modalIconContainer, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED' }]}>
                  <Ionicons name="book-sharp" size={18} color="#F97316" />
                </View>
                <Text style={[styles.modalTitleText, { color: theme.text }]} numberOfLines={1}>
                  Subject Details
                </Text>
                <TouchableOpacity onPress={() => setActiveDetailSubject(null)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {activeDetailSubject && (
                <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.modalSubjectName, { color: theme.text }]}>{activeDetailSubject.name}</Text>
                  
                  <View style={styles.modalMetaRow}>
                    <View style={[styles.modalBadge, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                      <Text style={[styles.modalBadgeText, { color: theme.textSecondary }]}>CODE: {activeDetailSubject.code}</Text>
                    </View>
                    <View style={[styles.modalBadge, { backgroundColor: theme.isDark ? 'rgba(22, 163, 74, 0.15)' : '#F0FDF4', borderColor: theme.isDark ? 'rgba(22, 163, 74, 0.3)' : '#E2E8F0' }]}>
                      <Text style={[styles.modalBadgeText, { color: '#16A34A' }]}>{activeDetailSubject.credits} Credits</Text>
                    </View>
                  </View>

                  <Text style={[styles.modalSectionLabel, { color: theme.textSecondary }]}>COURSE DESCRIPTION</Text>
                  <Text style={[styles.modalDescriptionText, { color: theme.textSecondary }]}>{activeDetailSubject.description}</Text>

                  <Text style={[styles.modalSectionLabel, { color: theme.textSecondary }]}>SYLLABUS MODULES ({activeDetailSubject.modules.length})</Text>
                  <View style={[styles.modalModulesList, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                    {activeDetailSubject.modules.map((mod, mIdx) => (
                      <View key={mIdx} style={styles.modalModuleItemRow}>
                        <View style={styles.modalModuleItemDot} />
                        <Text style={[styles.modalModuleItemText, { color: theme.text }]}>{mod}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={[styles.modalDivider, { backgroundColor: theme.cardBorder }]} />

                  {/* Actions Grid */}
                  <View style={styles.modalActionsGrid}>
                    <TouchableOpacity 
                      style={[styles.modalActionBtn, styles.modalPrimaryBtn, theme.isDark && { backgroundColor: theme.primary }]}
                      onPress={() => {
                        handleShareSyllabus(activeDetailSubject);
                        setActiveDetailSubject(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.modalPrimaryText}>Share Course Details</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ─────────────── STANDARD BRANCHE LEVEL HIGH VIEW ───────────────
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Bar */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        {onBack && (
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]} onPress={onBack} activeOpacity={0.6}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Syllabus Hub</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Official MCE & BEU Academic Coursework</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={[styles.searchBarContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search syllabus by department..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            returnKeyType="search"
           autoCapitalize="sentences" />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Interactive Accordion List */}
        {filteredBranches.length > 0 ? (
          <View style={styles.accordionContainer}>
            {filteredBranches.map(branch => {
              const branchExpanded = isBranchExpanded(branch.id);
              return (
                <View key={branch.id} style={[styles.branchCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                  {/* Branch Accordion Header */}
                  <TouchableOpacity
                    style={[styles.branchHeaderRow, { backgroundColor: theme.backgroundElement }, branchExpanded && [styles.branchHeaderRowActive, { backgroundColor: theme.isDark ? theme.background : '#F8FAFC', borderBottomColor: theme.cardBorder }]]}
                    onPress={() => {
                      if (isDetailedBranch(branch.id)) {
                        // Launch premium coursework explorer
                        setActiveBranchId(branch.id);
                      } else {
                        // Fallback to simple accordion toggle
                        toggleBranch(branch.id);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.branchHeaderLeft}>
                      <View style={[styles.branchIconContainer, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED' }, branchExpanded && [styles.branchIconContainerActive, { backgroundColor: theme.primary }]]}>
                        <Ionicons 
                          name={branch.icon as any} 
                          size={20} 
                          color={branchExpanded ? '#FFFFFF' : '#F97316'} 
                        />
                      </View>
                      <Text style={[styles.branchTitle, { color: theme.textSecondary }, branchExpanded && [styles.branchTitleActive, { color: theme.text }]]}>
                        {branch.branchName}
                      </Text>

                    </View>
                    <Ionicons 
                      name={isDetailedBranch(branch.id) ? "arrow-forward" : (branchExpanded ? "chevron-up" : "chevron-down")} 
                      size={18} 
                      color={branchExpanded ? theme.text : theme.textSecondary} 
                    />
                  </TouchableOpacity>

                  {/* Semesters list (Displays only if expanded) */}
                  {branchExpanded && !isDetailedBranch(branch.id) && (
                    <View style={[styles.semestersList, { backgroundColor: theme.backgroundElement }]}>
                      {branch.semesters.map(sem => {
                        const semKey = `${branch.id}-${sem.semester}`;
                        const semExpanded = isSemesterExpanded(branch.id, sem.semester);
                        
                        // Check if search query matches any subjects in this semester
                        const hasMatchingSubject = sem.subjects.some(sub => 
                          sub.toLowerCase().includes(query)
                        );
                        const shouldHighlightSem = query && (sem.semester.toLowerCase().includes(query) || hasMatchingSubject);

                        return (
                          <View key={sem.semester} style={[styles.semesterContainer, { borderColor: theme.cardBorder }]}>
                            <TouchableOpacity
                              style={[styles.semesterHeaderRow, { backgroundColor: theme.isDark ? theme.background : '#FAFCFE' }, semExpanded && [styles.semesterHeaderRowActive, { borderBottomColor: theme.cardBorder }]]}
                              onPress={() => toggleSemester(semKey)}
                              activeOpacity={0.8}
                            >
                              <Text style={[
                                styles.semesterTitle, 
                                { color: theme.textSecondary },
                                semExpanded && [styles.semesterTitleActive, { color: theme.primary }],
                                shouldHighlightSem && [styles.semesterHighlightText, { color: '#EA580C' }]
                              ]}>
                                {sem.semester}
                              </Text>
                              <Ionicons 
                                name={semExpanded ? "chevron-up-circle-outline" : "chevron-down-circle-outline"} 
                                size={16} 
                                color={semExpanded ? "#F97316" : theme.isDark ? "#475569" : "#94A3B8"} 
                              />
                            </TouchableOpacity>

                            {/* Subjects List */}
                            {semExpanded && (
                              <View style={[styles.subjectsList, { backgroundColor: theme.backgroundElement }]}>
                                {sem.subjects.map((subject, idx) => {
                                  const matchesSubject = query && subject.toLowerCase().includes(query);
                                  return (
                                    <View key={idx} style={[styles.subjectRow, { backgroundColor: theme.backgroundElement }, matchesSubject && [styles.subjectRowMatched, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED' }]]}>
                                      <View style={[styles.subjectDot, { backgroundColor: theme.cardBorder }, matchesSubject && [styles.subjectDotMatched, { backgroundColor: theme.primary }]]} />
                                      {highlightText(subject, query, [styles.subjectText, { color: theme.text }], styles.highlightedSubjectText)}
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}

            {/* GATE 2026 Syllabus Accordion Card */}
            {(!query || "gate syllabus".includes(query)) && (
              <View style={[styles.branchCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                <TouchableOpacity
                  style={[styles.branchHeaderRow, { backgroundColor: theme.backgroundElement }, isGateExpanded && [styles.branchHeaderRowActive, { backgroundColor: theme.isDark ? theme.background : '#F8FAFC', borderBottomColor: theme.cardBorder }]]}
                  onPress={() => setIsGateExpanded(!isGateExpanded)}
                  activeOpacity={0.8}
                >
                  <View style={styles.branchHeaderLeft}>
                    <View style={[styles.branchIconContainer, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }, isGateExpanded && [styles.branchIconContainerActive, { backgroundColor: '#3B82F6' }]]}>
                      <Ionicons name="school-outline" size={20} color={isGateExpanded ? '#FFFFFF' : '#3B82F6'} />
                    </View>
                    <Text style={[styles.branchTitle, { color: theme.textSecondary }, isGateExpanded && [styles.branchTitleActive, { color: theme.text }]]}>
                      GATE 2026 Syllabus
                    </Text>
                  </View>
                  <Ionicons name={isGateExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
                </TouchableOpacity>

                {isGateExpanded && (
                  <View style={[styles.semestersList, { backgroundColor: theme.background }]}>
                    <Text style={[styles.portalBody, { color: theme.textSecondary, marginBottom: 12, marginTop: 12 }]}>
                      The test papers will be in English. Each GATE 2026 paper is for a total of 100 marks, General Aptitude (GA) is common for all papers (15 marks), and the rest of the paper covers the respective test paper syllabus (85 marks).
                    </Text>

                    <View style={{ gap: 8, marginBottom: 16 }}>
                      {[
                        { title: 'Civil Engineering (CE)', url: 'https://gate2026.iitg.ac.in/doc/GATE2026_Syllabus/CE_2026_Syllabus.pdf' },
                        { title: 'Computer Science & IT (CS)', url: 'https://gate2026.iitg.ac.in/doc/GATE2026_Syllabus/CS_2026_Syllabus.pdf' },
                        { title: 'Electronics & Communication (EC)', url: 'https://gate2026.iitg.ac.in/doc/GATE2026_Syllabus/EC_2026_Syllabus.pdf' },
                        { title: 'Electrical Engineering (EE)', url: 'https://gate2026.iitg.ac.in/doc/GATE2026_Syllabus/EE_2026_Syllabus.pdf' },
                        { title: 'Environmental Science (ES)', url: 'https://gate2026.iitg.ac.in/doc/GATE2026_Syllabus/ES_2026_Syllabus.pdf' },
                        { title: 'Mechanical Engineering (ME)', url: 'https://gate2026.iitg.ac.in/doc/GATE2026_Syllabus/ME_2026_Syllabus.pdf' },
                        { title: 'Engineering Sciences (XE)', url: 'https://gate2026.iitg.ac.in/doc/GATE2026_Syllabus/XE-2026_Combined_Syllabus.pdf' },
                        { title: 'General Aptitude (GA)', url: 'https://gate2026.iitg.ac.in/doc/GATE2026_Syllabus/GA_2026_Syllabus.pdf' },
                      ].map((item, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.backgroundElement, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.cardBorder }}
                          onPress={async () => {
                            if (Platform.OS === 'web') {
                              setWebGatePdfPrompt({ title: item.title, url: item.url });
                            } else {
                              try {
                                await WebBrowser.openBrowserAsync(item.url, {
                                  toolbarColor: theme.background,
                                  controlsColor: '#3B82F6',
                                });
                              } catch (e) {
                                Alert.alert('Error', 'Unable to open the PDF.');
                              }
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="document-text-outline" size={16} color="#3B82F6" style={{ marginRight: 8 }} />
                          <Text style={{ flex: 1, color: theme.text, fontSize: 14, fontWeight: '500' }}>{item.title}</Text>
                          <Ionicons name="open-outline" size={16} color={theme.textSecondary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity 
                        style={[styles.portalButton, { flex: 1, backgroundColor: '#3B82F6', marginBottom: 4 }]} 
                        onPress={async () => {
                          await WebBrowser.openBrowserAsync('https://gate2026.iitg.ac.in/exam-papers-and-syllabus.html', {
                            toolbarColor: theme.background,
                            controlsColor: '#3B82F6',
                          });
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.portalButtonText}>Official Site</Text>
                        <Ionicons name="open-outline" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>

                  </View>
                )}
              </View>
            )}

          </View>
        ) : (
          /* Search Empty State */
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconFrame, { backgroundColor: theme.background }]}>
              <Ionicons name="search-outline" size={40} color={theme.isDark ? '#475569' : '#CBD5E1'} />
            </View>
            <Text style={[styles.emptyText, { color: theme.text }]}>No syllabus found</Text>
            <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
              Try typing a different branch keyword like &quot;AI&quot; or &quot;Civil&quot;
            </Text>
          </View>
        )}

        {/* BEU Official Portal Card */}
        <View style={[styles.portalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.portalHeaderRow}>
            <View style={[styles.portalIconContainer, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED' }]}>
              <Ionicons name="globe-outline" size={20} color="#F97316" />
            </View>
            <Text style={[styles.portalTitle, { color: theme.text }]}>Official BEU Portal</Text>
          </View>
          <Text style={[styles.portalBody, { color: theme.textSecondary }]}>
            For verified university circular regulations, structural credit details, or checking older syllabus codes, visit the Bihar Engineering University portal.
          </Text>
          <TouchableOpacity 
            style={styles.portalButton} 
            onPress={handleOpenPortal}
            activeOpacity={0.85}
          >
            <Text style={styles.portalButtonText}>Visit Official BEU Website</Text>
            <Ionicons name="open-outline" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* WEB GATE PDF Prompt Modal */}
      {Platform.OS === 'web' && webGatePdfPrompt && (
        <Modal
          visible={!!webGatePdfPrompt}
          transparent
          animationType="fade"
          onRequestClose={() => setWebGatePdfPrompt(null)}
        >
          <View style={[styles.modalBackdrop, { backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(15, 23, 42, 0.7)' }]}>
            <View style={[styles.webPromptCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              
              <View style={[styles.webPromptIconFrame, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                <Ionicons name="logo-google-playstore" size={28} color="#3B82F6" />
              </View>

              <Text style={[styles.webPromptTitle, { color: theme.text }]}>Get the Full App Experience</Text>
              
              <Text style={[styles.webPromptSubtitle, { color: theme.textSecondary }]}>
                You can only open this PDF in our official app or using an external browser.
              </Text>

              <TouchableOpacity 
                style={[styles.webPromptDownloadBtn, { backgroundColor: '#3B82F6' }]}
                onPress={() => {
                  window.open('https://play.google.com/store/apps/details?id=mcemotihari.app', '_blank');
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.webPromptDownloadText}>Download on Google Play</Text>
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.webPromptDivider}>
                <View style={[styles.webPromptLine, { backgroundColor: theme.cardBorder }]} />
                <Text style={[styles.webPromptOr, { color: theme.textSecondary, backgroundColor: theme.backgroundElement }]}>OR</Text>
                <View style={[styles.webPromptLine, { backgroundColor: theme.cardBorder }]} />
              </View>

              <TouchableOpacity 
                style={[styles.webPromptBrowserBtn, { borderColor: theme.cardBorder }]}
                onPress={() => {
                  window.open(webGatePdfPrompt.url, '_blank');
                  setWebGatePdfPrompt(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={18} color={theme.text} />
                <Text style={[styles.webPromptBrowserText, { color: theme.text }]}>
                  Open in External Browser
                </Text>
              </TouchableOpacity>
              
              {/* Close Button overlay */}
              <TouchableOpacity 
                style={styles.webPromptCloseIcon}
                onPress={() => setWebGatePdfPrompt(null)}
              >
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>

            </View>
          </View>
        </Modal>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  header: {
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 150,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    boxShadow: Platform.OS === 'web' ? `${0}px ${2}px ${6}px #0F172A` : undefined,

    elevation: 1,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  accordionContainer: {
    gap: 12,
  },
  branchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    boxShadow: Platform.OS === 'web' ? `${0}px ${3}px ${8}px #0F172A` : undefined,

    elevation: 2,
  },
  branchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  branchHeaderRowActive: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  branchHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  branchIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchIconContainerActive: {
    backgroundColor: '#F97316',
  },
  branchTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  branchTitleActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  premiumIndicator: {
    backgroundColor: '#FFE3D3',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumIndicatorText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#F97316',
  },
  semestersList: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  semesterContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  semesterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#FAFCFE',
  },
  semesterHeaderRowActive: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  semesterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  semesterTitleActive: {
    color: '#F97316',
    fontWeight: '800',
  },
  semesterHighlightText: {
    color: '#EA580C',
    fontWeight: '800',
  },
  subjectsList: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 8,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  subjectRowMatched: {
    backgroundColor: '#FFF7ED',
  },
  subjectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    marginRight: 10,
  },
  subjectDotMatched: {
    backgroundColor: '#F97316',
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  highlightedSubjectText: {
    color: '#F97316',
    fontWeight: '800',
    backgroundColor: '#FFE3D3',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  emptyIconFrame: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  emptySubText: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  portalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginTop: 20,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${10}px #0F172A` : undefined,

    elevation: 2,
  },
  portalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  portalIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  portalTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  portalBody: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 14,
    fontWeight: '500',
  },
  portalButton: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${8}px #F97316` : undefined,

    elevation: 2,
  },
  portalButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // --- PREMIUM EXPLORER SCREEN DETAILS ---
  tabsSection: {
    marginBottom: 16,
  },
  tabsScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  semTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
  },
  semTabActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  semTabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  semTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  searchResultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  searchResultsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  subjectCardsContainer: {
    gap: 14,
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    boxShadow: Platform.OS === 'web' ? `${0}px ${3}px ${8}px #0F172A` : undefined,

    elevation: 2,
  },
  subjectCardExpanded: {
    borderColor: '#FED7AA',
  },
  subjectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subjectCardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  subjectCardHeaderRight: {
    padding: 4,
  },
  subjectNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 19,
  },
  subjectMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 8,
  },
  metaBadge: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  metaBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.2,
  },
  subjectDescText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    fontWeight: '500',
  },
  subjectActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 12,
  },
  actionIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  actionButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  modulesAccordionList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 12,
    gap: 6,
  },
  modulesHeaderTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  moduleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  moduleItemRowMatched: {
    backgroundColor: '#FFE3D3',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  moduleItemDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: '#94A3B8',
    marginRight: 8,
  },
  moduleItemDotMatched: {
    backgroundColor: '#F97316',
  },
  moduleItemText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#475569',
    flex: 1,
  },
  highlightText: {
    color: '#F97316',
    fontWeight: '800',
  },

  // --- PREMIUM UPLOAD CONTRIBUTIONS CARD ---
  contributeCard: {
    marginTop: 20,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFE3D3',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${12}px #F97316` : undefined,

    elevation: 3,
  },
  contributeCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    opacity: 0.96,
  },
  contributeCardContent: {
    padding: 20,
    alignItems: 'center',
  },
  contributeIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${6}px #F97316` : undefined,

    elevation: 3,
  },
  contributeTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  contributeSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '500',
    marginBottom: 14,
  },
  contributeDivider: {
    height: 1,
    width: '100%',
    backgroundColor: '#334155',
    marginVertical: 10,
  },
  contributeEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  contributeEmailText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F97316',
  },

  // --- DETAILED POPUP MODAL ---
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFCFE',
  },
  modalIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  subjectDetailsModal: {
    width: width * 0.88,
    maxHeight: height * 0.76,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    boxShadow: Platform.OS === 'web' ? `${0}px ${10}px ${20}px #0F172A` : undefined,

    elevation: 10,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  modalScrollBody: {
    padding: 20,
    paddingTop: 14,
  },
  modalSubjectName: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 10,
  },
  modalMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modalBadge: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  modalBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
  },
  modalSectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 8,
  },
  modalDescriptionText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 10,
  },
  modalModulesList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  modalModuleItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  modalModuleItemDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F97316',
    marginRight: 10,
    marginTop: 6,
  },
  modalModuleItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    lineHeight: 17,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  modalActionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  modalPrimaryBtn: {
    backgroundColor: '#0F172A',
  },
  modalSecondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
});
