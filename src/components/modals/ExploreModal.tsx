import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, Dimensions, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';

// Sub-Modals
import { AboutModal } from './AboutModal';
import { CampusMapModal } from './CampusMapModal';
import { EventsModal } from './EventsModal';
import { HolidaysModal } from './HolidaysModal';
import { NotepadModal } from './NotepadModal';
import { PrivacyModal } from './PrivacyModal';
import { StudyMaterialsModal } from './StudyMaterialsModal';

const { height } = Dimensions.get('window');

interface ExploreModalProps {
  visible: boolean;
  onClose: () => void;
  onWritePostPress: () => void;
}

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Civil Engineering',
  'Mechanical Engineering',
  'Electrical & Electronics Engineering',
  'Humanities and Sciences'
];

export function ExploreModal({ visible, onClose, onWritePostPress }: ExploreModalProps) {
  const router = useRouter();
  const theme = useThemeColors();
  const [searchQuery, setSearchQuery] = useState('');

  // Sub-modal visibility states
  const [isAboutVisible, setIsAboutVisible] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [isHolidaysVisible, setIsHolidaysVisible] = useState(false);
  const [isEventsListVisible, setIsEventsListVisible] = useState(false);
  const [isPrivacyVisible, setIsPrivacyVisible] = useState(false);
  const [isNotepadVisible, setIsNotepadVisible] = useState(false);

  const EXPLORE_CARDS = [
    {
      id: 'syllabus',
      title: 'Syllabus',
      sub: 'BEU coursework',
      icon: 'book',
      iconColor: '#8B5CF6',
      bg: theme.isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF',
      action: 'route',
      path: '/explore?view=syllabus'
    },
    {
      id: 'hostels',
      title: 'Hostels',
      sub: 'Campus living',
      icon: 'bed',
      iconColor: '#10B981',
      bg: theme.isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
      action: 'route',
      path: '/explore?view=hostels'
    },
    {
      id: 'departments',
      title: 'Departments',
      sub: 'Academic wings',
      icon: 'school',
      iconColor: '#3B82F6',
      bg: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
      action: 'route',
      path: '/explore?view=departments'
    },
    {
      id: 'faculty',
      title: 'Faculty',
      sub: 'Teacher directories',
      icon: 'people',
      iconColor: '#F97316',
      bg: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED',
      action: 'route',
      path: '/explore?view=faculty'
    },
    {
      id: 'holidays',
      title: 'Holidays',
      sub: 'Academic calendar',
      icon: 'calendar',
      iconColor: '#F43F5E',
      bg: theme.isDark ? 'rgba(244, 63, 94, 0.15)' : '#FFF1F2',
      action: 'modal',
      modalId: 'holidays'
    },
    {
      id: 'notepad',
      title: 'Notepad',
      sub: 'Local saved notes',
      icon: 'document-text',
      iconColor: '#D97706',
      bg: theme.isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7',
      action: 'modal',
      modalId: 'notepad'
    }
  ];

  const UTILITY_CARDS = [
    {
      id: 'map',
      title: 'Interactive Campus Map',
      sub: 'Map rooms, laboratories, and green spots',
      icon: 'map',
      iconColor: theme.isDark ? '#94A3B8' : '#475569',
      bg: theme.isDark ? 'rgba(148, 163, 184, 0.12)' : '#F1F5F9',
      action: 'modal',
      modalId: 'map'
    },
    {
      id: 'events',
      title: 'Events & College Fests',
      sub: 'Technical quests and athletic schedules',
      icon: 'trophy',
      iconColor: '#EA580C',
      bg: theme.isDark ? 'rgba(234, 88, 12, 0.15)' : '#FFF7ED',
      action: 'modal',
      modalId: 'events'
    },
    {
      id: 'gallery',
      title: 'Study Materials',
      sub: 'Verified engineering notes and BEU PYQ solutions',
      icon: 'library',
      iconColor: '#06B6D4',
      bg: theme.isDark ? 'rgba(6, 182, 212, 0.15)' : '#ECFEFF',
      action: 'modal',
      modalId: 'gallery'
    },
    {
      id: 'about',
      title: 'About MCE Motihari',
      sub: 'Accreditations, history, and official vision',
      icon: 'information-circle',
      iconColor: '#4F46E5',
      bg: theme.isDark ? 'rgba(79, 70, 229, 0.15)' : '#EEF2FF',
      action: 'modal',
      modalId: 'about'
    },
    {
      id: 'privacy',
      title: 'Privacy & Platform Policies',
      sub: 'Terms of usage, anonymous posting guidelines',
      icon: 'shield',
      iconColor: theme.isDark ? '#94A3B8' : '#64748B',
      bg: theme.isDark ? 'rgba(148, 163, 184, 0.08)' : '#F8FAFC',
      action: 'modal',
      modalId: 'privacy'
    }
  ];

  // Performant Search filtering for Explore Hub Cards
  const filteredExploreCards = useMemo(() => {
    if (!searchQuery.trim()) return EXPLORE_CARDS;
    const q = searchQuery.toLowerCase().trim();
    return EXPLORE_CARDS.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.sub.toLowerCase().includes(q)
    );
  }, [searchQuery, theme.isDark]);

  const filteredUtilityCards = useMemo(() => {
    if (!searchQuery.trim()) return UTILITY_CARDS;
    const q = searchQuery.toLowerCase().trim();
    return UTILITY_CARDS.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.sub.toLowerCase().includes(q)
    );
  }, [searchQuery, theme.isDark]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFillObject} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <View style={[styles.bottomSheet, { maxHeight: height * 0.88, flex: 1, backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.cardBorder }]} />
          
          <View style={[styles.sheetHeader, { borderBottomColor: theme.cardBorder }]}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="compass" size={24} color="#F97316" style={{ marginRight: 8 }} />
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Explore Campus Hub</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
          >
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Quick Action: Create Post Capsule */}
              <TouchableOpacity 
                style={styles.createPostCapsule}
                onPress={() => {
                  onClose();
                  onWritePostPress();
                }}
                activeOpacity={0.9}
              >
                <View style={styles.createPostLeft}>
                  <View style={styles.createPostIconBg}>
                    <Ionicons name="create" size={18} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.createPostTitle}>Share something on the feed</Text>
                    <Text style={styles.createPostSubtitle}>Post academic updates or launch a poll</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              {/* LinkedIn-style Global Search Bar */}
              <View style={[styles.searchBarContainer, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
                <Ionicons
                  name="search-outline"
                  size={18}
                  color="#94A3B8"
                  style={styles.searchIcon}
                />
                <TextInput
                  placeholder="Search syllabus, map, fests, fyc..."
                  placeholderTextColor="#94A3B8"
                  style={[styles.searchInput, { color: theme.text }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                  returnKeyType="search"
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Primary Grid Cards */}
              {filteredExploreCards.length > 0 && (
                <View style={styles.actionsGrid}>
                  {filteredExploreCards.map((card) => (
                    <TouchableOpacity
                      key={card.id}
                      style={[styles.gridCard, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF', borderColor: theme.cardBorder }]}
                      onPress={() => {
                        if (card.action === 'route' && card.path) {
                          onClose();
                          router.push(card.path as any);
                        } else if (card.action === 'modal') {
                          if (card.modalId === 'holidays') setIsHolidaysVisible(true);
                          else if (card.modalId === 'notepad') setIsNotepadVisible(true);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.gridIconFrame, { backgroundColor: card.bg }]}>
                        <Ionicons name={card.icon as any} size={20} color={card.iconColor} />
                      </View>
                      <Text style={[styles.gridCardTitle, { color: theme.text }]}>{card.title}</Text>
                      <Text style={styles.gridCardSub}>{card.sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Directories & Utilities list */}
              {filteredUtilityCards.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.sectionTitleHeader, { color: theme.text }]}>Directories & Utilities</Text>
                  <View style={[styles.utilityList, { borderColor: theme.cardBorder }]}>
                    {filteredUtilityCards.map((util, index) => (
                      <TouchableOpacity
                        key={util.id}
                        style={[
                          styles.utilityRow,
                          { borderBottomColor: theme.cardBorder },
                          index === filteredUtilityCards.length - 1 && { borderBottomWidth: 0 }
                        ]}
                        onPress={() => {
                          if (util.modalId === 'map') setIsMapVisible(true);
                          else if (util.modalId === 'events') setIsEventsListVisible(true);
                          else if (util.modalId === 'gallery') setIsGalleryVisible(true);
                          else if (util.modalId === 'about') setIsAboutVisible(true);
                          else if (util.modalId === 'privacy') setIsPrivacyVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.utilityIconFrame, { backgroundColor: util.bg }]}>
                          <Ionicons name={util.icon as any} size={16} color={util.iconColor} />
                        </View>
                        <View style={styles.utilityTextCol}>
                          <Text style={[styles.utilityTitle, { color: theme.text }]}>{util.title}</Text>
                          <Text style={styles.utilitySub}>{util.sub}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {filteredExploreCards.length === 0 && filteredUtilityCards.length === 0 && (
                <View style={styles.emptySearchContainer}>
                  <Ionicons name="search" size={48} color={theme.isDark ? '#334155' : '#CBD5E1'} />
                  <Text style={[styles.emptySearchText, { color: theme.text }]}>No campus resources found</Text>
                  <Text style={styles.emptySearchSubtext}>
                    No syllabus, directory, or utility matches "{searchQuery}".
                  </Text>
                </View>
              )}

              <View style={{ height: 60 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>

      {/* Sub-Modals */}
      <AboutModal visible={isAboutVisible} onClose={() => setIsAboutVisible(false)} />
      <CampusMapModal visible={isMapVisible} onClose={() => setIsMapVisible(false)} />
      <EventsModal visible={isEventsListVisible} onClose={() => setIsEventsListVisible(false)} />
      <HolidaysModal visible={isHolidaysVisible} onClose={() => setIsHolidaysVisible(false)} />
      <PrivacyModal visible={isPrivacyVisible} onClose={() => setIsPrivacyVisible(false)} />
      <StudyMaterialsModal visible={isGalleryVisible} onClose={() => setIsGalleryVisible(false)} />
      <NotepadModal visible={isNotepadVisible} onClose={() => setIsNotepadVisible(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  createPostCapsule: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F97316',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    boxShadow: Platform.OS === 'web' ? `${0}px ${6}px ${10}px #F97316` : undefined,

    elevation: 4,
  },
  createPostLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createPostIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPostTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  createPostSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10.5,
    marginTop: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 10,
  },
  gridCard: {
    width: '48.5%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-start',
  },
  gridIconFrame: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridCardTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  gridCardSub: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  sectionTitleHeader: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  utilityList: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  utilityIconFrame: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  utilityTextCol: {
    flex: 1,
  },
  utilityTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  utilitySub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptySearchText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptySearchSubtext: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
});
