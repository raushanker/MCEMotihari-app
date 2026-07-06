import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {Platform, StyleSheet, View, Text, ScrollView,  TouchableOpacity, Linking, Share, Alert, Dimensions, Image, BackHandler} from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { HOSTELS_DATA, FACILITIES_DICTIONARY, Hostel, FacilityInfo } from '@/data/hostels';
import { useAppStore } from '@/store/useAppStore';

import { useThemeColors } from '@/hooks/useThemeColors';
import { FastLoginModal } from '@/components/modals/FastLoginModal';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
const TypedFlashList = FlashList as any;

interface HostelsScreenProps {
  onBack?: () => void;
}

export const HostelsScreen: React.FC<HostelsScreenProps> = ({ onBack }) => {
  const router = useRouter();
  const { user } = useAppStore();
  const theme = useThemeColors();
  const [isFastLoginVisible, setIsFastLoginVisible] = useState(false);  
  // Navigation & Search State
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Boys' | 'Girls'>('All');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Intercept hardware back press when a hostel is selected
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (selectedHostel) {
          setSelectedHostel(null);
          return true; // prevent default behavior
        }
        if (onBack) {
          onBack();
          return true; // prevent default behavior (exiting app)
        }
        return false;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }, [selectedHostel])
  );

  // Toggles for Filter Tags
  const filterOptions = [
    { label: 'Wi-Fi Enabled', value: 'wifi' },
    { label: 'Separate Gym', value: 'gym' },
    { label: 'Sports Arena', value: 'volleyball' },
    { label: 'Large Capacity (300+)', value: 'large_capacity' },
  ];

  // Helper to toggle filter chips
  const toggleFilter = (filterVal: string) => {
    if (activeFilters.includes(filterVal)) {
      setActiveFilters(prev => prev.filter(f => f !== filterVal));
    } else {
      setActiveFilters(prev => [...prev, filterVal]);
    }
  };

  // Performant listing search & tab filters
  const filteredHostels = useMemo(() => {
    return HOSTELS_DATA.filter(hostel => {
      // 1. Text Search matching
      const matchesSearch = searchQuery.trim() === '' ? true : (
        hostel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hostel.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hostel.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase())) ||
        hostel.facilities.some(fKey => {
          const fac = FACILITIES_DICTIONARY[fKey];
          return fac && (
            fac.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            fac.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
          );
        })
      );

      // 2. Gender Tab segment matching
      const matchesTab = activeTab === 'All' ? true : hostel.type === activeTab;

      // 3. Optional Tag Filters matching
      const matchesFilters = activeFilters.every(fVal => {
        if (fVal === 'large_capacity') {
          const capacityVal = parseInt(hostel.capacity);
          return !isNaN(capacityVal) && capacityVal >= 300;
        }
        return hostel.facilities.includes(fVal);
      });

      return matchesSearch && matchesTab && matchesFilters;
    });
  }, [searchQuery, activeTab, activeFilters]);

  // Handle Hostel Share action
  const handleShareHostel = async (hostel: Hostel) => {
    try {
      await Share.share({
        message: `MCE Motihari Hostel Accommodation Details:\n🏡 ${hostel.name}\nCapacity: ${hostel.capacity}\n\nShared from MCE Connect app.\nDownload here: https://play.google.com/store/apps/details?id=mcemotihari.app`,
        title: hostel.name,
      });
    } catch (err) {
      Alert.alert('Share Failed', 'Unable to broadcast hostel details.');
    }
  };

  // Dial warden support line
  const handleCallWarden = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Calling Failed', 'Could not open your native dialer app.');
    });
  };

  // List card presenter component
  const renderHostelCard = ({ item }: { item: Hostel }) => {
    return (
      <TouchableOpacity
        style={[styles.hostelCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
        onPress={() => {
          if (!user || user?.role === 'Guest') {
            setIsFastLoginVisible(true);
            return;
          }
          setSelectedHostel(item);
        }}
        activeOpacity={0.9}
      >
        {/* Banner image preview with tags */}
        <View style={styles.cardBannerContainer}>
          {item.image ? (
            <Image source={item.image} style={styles.cardBannerImage} />
          ) : (
            <View style={[styles.cardImagePlaceholder, { backgroundColor: item.type === 'Boys' ? (theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF') : (theme.isDark ? 'rgba(219, 39, 119, 0.15)' : '#FDF2F8') }]}>
              {/* Soft backdrop overlay text as beautiful placeholder banner */}
              <Text style={[styles.cardPlaceholderLabel, { color: item.type === 'Boys' ? '#3B82F6' : '#DB2777' }]}>
                {item.name.split(' ')[0]}
              </Text>
            </View>
          )}
          <View style={styles.bannerImageOverlay} />



          {/* Type Tag Overlay */}
          <View style={[
            styles.typeBadge,
            item.type === 'Boys' ? styles.typeBoys : styles.typeGirls
          ]}>
            <Ionicons 
              name={item.type === 'Boys' ? 'male' : 'female'} 
              size={10} 
              color="#FFFFFF" 
              style={{ marginRight: 3 }} 
            />
            <Text style={styles.typeBadgeText}>{item.type} Hostel</Text>
          </View>
        </View>

        {/* Card Body content */}
        <View style={[styles.cardContent, { borderBottomColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Capacity: <Text style={{ color: theme.text, fontWeight: 'bold' }}>{item.capacity}</Text> • Campus Living
          </Text>
          
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Highlight feature tags */}
          <View style={styles.cardTagsRow}>
            {item.features.slice(0, 3).map((feat, idx) => (
              <View key={idx} style={[styles.cardTagPill, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
                <Text style={[styles.cardTagText, { color: theme.textSecondary }]}>{feat}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Card Actions Footer */}
        <View style={[styles.cardFooter, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC' }]}>
          <View style={styles.cardMetaRow}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={[styles.cardMetaText, { color: theme.textSecondary }]}>College Monitored</Text>
          </View>

          <View style={styles.viewDetailsTrigger}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons name="arrow-forward" size={14} color="#F97316" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render main listing view
  const renderListingView = () => (
    <View style={styles.listContainer}>
      {/* 1. Sticky Navigation Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        {onBack && (
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} onPress={onBack} activeOpacity={0.6}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Campus Hostels</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Safe & modern student accommodation at MCE Motihari</Text>
        </View>
      </View>

      <ScrollView key="listing-scroll" contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Modern Rounded Search Bar */}
        <View style={[styles.searchBarContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search hostels, rooms, gym, wi-fi..."
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

        {/* 3. Category tabs */}
        <View style={[styles.tabsWrapper, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }]}>
          {(['All', 'Boys', 'Girls'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && [styles.tabButtonActive, { backgroundColor: theme.backgroundElement }]]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab ? [styles.tabTextActive, { color: theme.text }] : { color: theme.textSecondary }]}>
                {tab === 'All' ? 'All Hostels' : tab === 'Boys' ? 'Boys Hostels' : 'Girls Hostels'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. Modern Filter Tag Chips scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={{ gap: 6, paddingRight: 10 }}>
          {filterOptions.map(opt => {
            const active = activeFilters.includes(opt.value);
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterChip, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }, active && [styles.filterChipActive, { backgroundColor: theme.isDark ? 'rgba(249,115,22,0.15)' : '#FFF7ED', borderColor: '#F97316' }]]}
                onPress={() => toggleFilter(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, { color: theme.textSecondary }, active && [styles.filterChipTextActive, { color: '#F97316' }]]}>{opt.label}</Text>
                {active && <Ionicons name="checkmark" size={12} color="#F97316" style={{ marginLeft: 4 }} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 5. Hostels list */}
        {filteredHostels.length > 0 ? (
          <View style={styles.listWrapper}>
            {filteredHostels.map((hostel) => (
              <React.Fragment key={hostel.id}>
                {renderHostelCard({ item: hostel })}
              </React.Fragment>
            ))}
          </View>
        ) : (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconFrame, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0' }]}>
              <Ionicons name="home-outline" size={42} color={theme.isDark ? '#475569' : '#CBD5E1'} />
            </View>
            <Text style={[styles.emptyText, { color: theme.text }]}>No hostel found</Text>
            <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>Try clearing search text or resetting selected filter chips.</Text>
            <TouchableOpacity 
              style={[styles.resetBtn, { backgroundColor: theme.isDark ? '#F97316' : '#0F172A' }]} 
              onPress={() => { setSearchQuery(''); setActiveTab('All'); setActiveFilters([]); }}
              activeOpacity={0.7}
            >
              <Text style={styles.resetBtnText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Administrative Policy guidelines banner */}
        <View style={[styles.adminInfoCard, { backgroundColor: theme.isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF', borderColor: theme.isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE' }]}>
          <Ionicons name="information-circle" size={18} color="#2563EB" style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={[styles.adminInfoText, { color: theme.isDark ? '#93C5FD' : '#1E40AF' }]}>
            Hostel allotment and room vacancies are strictly managed by Motihari College of Engineering hostel committees under administration rules. Contact wardens for semester bookings.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );

  // Render Hostels Detailed state view
  const renderDetailView = (hostel: Hostel) => {
    return (
      <View style={[styles.detailContainer, { backgroundColor: theme.background }]}>
        {/* Header toolbar */}
        <View style={[styles.detailHeader, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
          <TouchableOpacity style={styles.detailBackBtn} onPress={() => setSelectedHostel(null)} activeOpacity={0.6}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
            <Text style={[styles.detailBackText, { color: theme.text }]}>Back to List</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.detailShareBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} onPress={() => handleShareHostel(hostel)} activeOpacity={0.6}>
            <Ionicons name="share-social-outline" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView key={`detail-scroll-${hostel.id}`} contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
          {/* Cover/banner image */}
          <View style={styles.detailCoverContainer}>
            {hostel.image ? (
              <Image source={hostel.image} style={styles.detailCoverImage} resizeMode="cover" />
            ) : (
              <View style={[styles.detailCoverPlaceholder, { backgroundColor: hostel.type === 'Boys' ? (theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF') : (theme.isDark ? 'rgba(219, 39, 119, 0.15)' : '#FDF2F8') }]}>
                <Ionicons 
                  name={hostel.type === 'Boys' ? 'male-outline' : 'female-outline'} 
                  size={48} 
                  color={hostel.type === 'Boys' ? '#3B82F6' : '#DB2777'} 
                />
                <Text style={[styles.detailCoverText, { color: hostel.type === 'Boys' ? '#2563EB' : '#C084FC' }]}>
                  {hostel.name.toUpperCase()}
                </Text>
              </View>
            )}
            
            {/* Info badge overlays */}
            <View style={styles.detailBadgeRow}>
              <View style={[styles.detailBadge, hostel.type === 'Boys' ? styles.typeBoys : styles.typeGirls]}>
                <Text style={styles.detailBadgeText}>{hostel.type} Accommodation</Text>
              </View>
              <View style={[styles.detailBadge, styles.badgeCapacity, { backgroundColor: theme.isDark ? '#F97316' : '#0F172A' }]}>
                <Text style={styles.detailBadgeTextCapacity}>{hostel.capacity}</Text>
              </View>
            </View>
          </View>

          {/* Primary details card */}
          <View style={[styles.detailCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <Text style={[styles.detailTitle, { color: theme.text }]}>{hostel.name}</Text>

            
            <Text style={[styles.detailDesc, { color: theme.textSecondary, borderTopColor: theme.cardBorder }]}>{hostel.description}</Text>

            {/* highlight features chips row */}
            <View style={styles.detailFeaturesRow}>
              {hostel.features.map((feat, idx) => (
                <View key={idx} style={[styles.detailFeatureChip, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : '#FFF7ED', borderColor: theme.isDark ? 'rgba(255,255,255,0.05)' : '#FFEDD5' }]}>
                  <Ionicons name="checkmark-circle" size={13} color="#F97316" style={{ marginRight: 4 }} />
                  <Text style={styles.detailFeatureText}>{feat}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Facilities Grid */}
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionHeader, { color: theme.text }]}>Facilities & Amenities</Text>
            <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>All features included for student lifestyle support</Text>
            
            <View style={styles.facilitiesGrid}>
              {hostel.facilities.map(fKey => {
                const fac = FACILITIES_DICTIONARY[fKey];
                if (!fac) return null;
                return (
                  <View key={fac.id} style={[styles.facilityCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                    <View style={[styles.facilityIconFrame, { backgroundColor: theme.isDark ? 'rgba(249,115,22,0.08)' : '#FFF7ED' }]}>
                      <Ionicons name={fac.icon as any} size={20} color="#F97316" />
                    </View>
                    <View style={styles.facilityTextCol}>
                      <Text style={[styles.facilityCardTitle, { color: theme.text }]}>{fac.title}</Text>
                      <Text style={[styles.facilityCardSub, { color: theme.textSecondary }]} numberOfLines={2}>{fac.subtitle}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Guidelines / Mess Timings Rules Box */}
          <View style={[styles.detailCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={[styles.rulesHeader, { borderBottomColor: theme.cardBorder }]}>
              <Ionicons name="document-text" size={18} color="#F97316" style={{ marginRight: 6 }} />
              <Text style={[styles.rulesTitle, { color: theme.text }]}>Hostel Allocation Guidelines</Text>
            </View>

            {/* Mess Routine pills */}
            <Text style={[styles.rulesLabel, { color: theme.textSecondary }]}>DAILY MESS TIMINGS</Text>
            <View style={[styles.messRoutineBox, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }]}>
              <Ionicons name="restaurant" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.messRoutineText, { color: theme.textSecondary }]}>{hostel.messTimings}</Text>
            </View>

            {/* Rules list bullet points */}
            <Text style={[styles.rulesLabel, { color: theme.textSecondary }]}>CAMPUS LIVING RULES</Text>
            <View style={{ gap: 6, marginTop: 4 }}>
              {hostel.rules.map((rule, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={styles.bulletSymbol}>•</Text>
                  <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>



          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {selectedHostel ? renderDetailView(selectedHostel) : renderListingView()}

      <FastLoginModal 
        visible={isFastLoginVisible} 
        onClose={() => setIsFastLoginVisible(false)} 
        title="Login Required 🔐" 
        subtitle="Hostel details dekhne ke liye pehle Google se login karein." 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  listContainer: {
    flex: 1,
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
    marginBottom: 14,
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
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    gap: 4,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: Platform.OS === 'web' ? `${0}px ${1}px ${3}px #0F172A` : undefined,

    elevation: 1,
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: 'bold',
  },
  filtersScroll: {
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#F97316',
    fontWeight: '700',
  },
  listWrapper: {
    gap: 12,
  },
  hostelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${10}px #0F172A` : undefined,

    elevation: 2,
    overflow: 'hidden',
  },
  cardBannerContainer: {
    height: 160,
    position: 'relative',
    overflow: 'hidden',
  },
  cardImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardPlaceholderLabel: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    opacity: 0.35,
  },
  bannerImageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.03)',
  },
  availabilityBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeYellow: {
    backgroundColor: '#FEF3C7',
  },
  badgeGreen: {
    backgroundColor: '#D1FAE5',
  },
  availabilityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  textYellow: {
    color: '#D97706',
  },
  textGreen: {
    color: '#059669',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBoys: {
    backgroundColor: '#2563EB',
  },
  typeGirls: {
    backgroundColor: '#C084FC',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardContent: {
    padding: 14,
    borderBottomWidth: 0.8,
    borderBottomColor: '#F1F5F9',
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 3,
  },
  cardDesc: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 6,
    lineHeight: 16,
  },
  cardTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 10,
  },
  cardTagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardTagText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#475569',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  viewDetailsTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
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
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14.5,
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
  resetBtn: {
    marginTop: 12,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  adminInfoText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
    flex: 1,
    fontWeight: '500',
  },

  // ─── Hostels Detailed View specific styles ──────────────────
  detailContainer: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  detailHeader: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailBackText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailShareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailScroll: {
    padding: 16,
    paddingBottom: 150,
  },
  detailCoverContainer: {
    height: 220,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  detailCoverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  detailCoverText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    opacity: 0.45,
  },
  detailBadgeRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  detailBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeCapacity: {
    backgroundColor: '#0F172A',
  },
  detailBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  detailBadgeTextCapacity: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${10}px #0F172A` : undefined,

    elevation: 1,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailCapacityInfo: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
    marginBottom: 10,
  },
  detailDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '400',
    borderTopWidth: 0.8,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  detailFeaturesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  detailFeatureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  detailFeatureText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  sectionWrapper: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  facilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  facilityCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  facilityIconFrame: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  facilityTextCol: {
    flex: 1,
  },
  facilityCardTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  facilityCardSub: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.8,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  rulesLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
  },
  messRoutineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 2,
    marginBottom: 6,
  },
  messRoutineText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    flex: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  bulletSymbol: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: 'bold',
    lineHeight: 16,
  },
  bulletText: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
    flex: 1,
  },
  wardenContactCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wardenDetailsCol: {
    flex: 1,
    marginRight: 10,
  },
  wardenLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  wardenNameText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 3,
  },
  wardenSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  wardenCallBtn: {
    backgroundColor: '#F97316',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wardenCallText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardBannerImage: {
    width: '100%',
    height: '100%',
  },
  detailCoverImage: {
    width: '100%',
    height: '100%',
  },
});
