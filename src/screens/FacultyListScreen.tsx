import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Faculty, FACULTY_DATA, getFacultyForDepartment } from '@/data/faculty';
import { FacultyCard } from '@/components/FacultyCard';
import { DEPARTMENTS } from '@/data/departments';
import { useThemeColors } from '@/hooks/useThemeColors';

// Cast FlashList to avoid TSX issues in React 19 compiler
const TypedFlashList = FlashList as any;

interface FacultyListScreenProps {
  initialDepartmentId?: string | null;
  onBack: () => void;
  onSelectFaculty: (faculty: Faculty) => void;
}

const getShortName = (id: string, fullName: string) => {
  if (id === 'cse') return 'CSE';
  if (id === 'cse_ai') return 'CSE (AI)';
  if (id === 'civil') return 'Civil';
  if (id === 'civil_ca') return 'Civil (CA)';
  if (id === 'eee') return 'Electrical';
  if (id === 'mechanical') return 'Mechanical';
  if (id === 'humanities') return 'Humanities';
  return fullName;
};

export const FacultyListScreen: React.FC<FacultyListScreenProps> = ({
  initialDepartmentId,
  onBack,
  onSelectFaculty,
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(initialDepartmentId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyHods, setShowOnlyHods] = useState(false);
  const theme = useThemeColors();

  // Select department display name
  const departmentInfo = useMemo(() => {
    if (!selectedDeptId) return { name: 'Full Faculty Directory', icon: 'people-circle-outline' };
    const dept = DEPARTMENTS.find(d => d.id === selectedDeptId);
    return dept ? { name: dept.name, icon: dept.icon } : { name: 'Faculty List', icon: 'people-outline' };
  }, [selectedDeptId]);

  // Dynamic search and filter processing
  const filteredFaculty = useMemo(() => {
    // 1. Get initial set (all or specific department with shared system)
    let list = selectedDeptId ? getFacultyForDepartment(selectedDeptId) : FACULTY_DATA;

    // 2. Apply search queries (name, department name, or designation)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter((fac) => {
        const deptName = DEPARTMENTS.find(d => d.id === fac.department)?.name || '';
        return (
          fac.name.toLowerCase().includes(query) ||
          fac.designation.toLowerCase().includes(query) ||
          deptName.toLowerCase().includes(query)
        );
      });
    }

    // 3. Apply HODs filter
    if (showOnlyHods) {
      list = list.filter((fac) => fac.isHod === true || fac.name.toLowerCase().includes('navneet kumar') || fac.name.toLowerCase().includes('principal'));
    }

    // Sort: Principal first, Abhay Kumar Jha next, HODs third, then alphabetically
    return [...list].sort((a, b) => {
      const isAPrincipal = a.name.toLowerCase().includes('navneet kumar') || a.name.toLowerCase().includes('principal');
      const isBPrincipal = b.name.toLowerCase().includes('navneet kumar') || b.name.toLowerCase().includes('principal');
      if (isAPrincipal && !isBPrincipal) return -1;
      if (!isAPrincipal && isBPrincipal) return 1;

      const isAAbhay = a.id === 'hum-abhay';
      const isBAbhay = b.id === 'hum-abhay';
      if (isAAbhay && !isBAbhay) return -1;
      if (!isAAbhay && isBAbhay) return 1;

      // For Civil (CA) department, prioritize HOD Dr. Md Arman Ali above HOD Dr. ANIL KUMAR CHHOTU
      if (selectedDeptId === 'civil_ca') {
        if (a.id === 'civil-arman' && b.id === 'civil-anil-chhotu') return -1;
        if (a.id === 'civil-anil-chhotu' && b.id === 'civil-arman') return 1;
      }

      if (a.isHod && !b.isHod) return -1;
      if (!a.isHod && b.isHod) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [selectedDeptId, searchQuery, showOnlyHods]);

  const renderItem = useCallback(({ item }: { item: Faculty }) => (
    <FacultyCard
      faculty={item}
      onPressProfile={() => onSelectFaculty(item)}
    />
  ), [onSelectFaculty]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Dynamic Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.background, borderColor: theme.cardBorder }]} onPress={onBack} activeOpacity={0.6}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <View style={[styles.iconTag, { backgroundColor: theme.isDark ? 'rgba(249,115,22,0.12)' : '#FFF7ED' }]}>
            <Ionicons name={departmentInfo.icon as any} size={15} color="#F97316" />
          </View>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {departmentInfo.name}
          </Text>
        </View>

        {selectedDeptId && (
          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={() => setSelectedDeptId(null)}
            activeOpacity={0.6}
          >
            <Text style={styles.resetButtonText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Input Bar with HODs toggle next to it */}
      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
            <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search by name, post, designation..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Premium "👑 HODs" Toggle Button */}
          {!initialDepartmentId && (
            <TouchableOpacity
              style={[
                styles.hodToggle,
                showOnlyHods && styles.hodToggleActive,
                { borderColor: theme.cardBorder, backgroundColor: showOnlyHods ? (theme.isDark ? 'rgba(249,115,22,0.15)' : '#FFF7ED') : theme.background }
              ]}
              onPress={() => setShowOnlyHods(!showOnlyHods)}
              activeOpacity={0.7}
            >
              <Text style={[styles.hodToggleText, { color: showOnlyHods ? '#F97316' : theme.textSecondary }]}>
                👑 HODs
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Department Tabs Selector */}
      {!initialDepartmentId && (
        <View style={{ backgroundColor: theme.backgroundElement }}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            <TouchableOpacity
              onPress={() => setSelectedDeptId(null)}
              style={[
                styles.tabPill,
                { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                selectedDeptId === null && [styles.tabPillActive, { backgroundColor: theme.isDark ? '#F97316' : '#0F172A', borderColor: theme.isDark ? '#F97316' : '#0F172A' }]
              ]}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="people-outline" 
                size={13} 
                color={selectedDeptId === null ? '#FFFFFF' : theme.textSecondary} 
                style={styles.tabPillIcon}
              />
              <Text style={[
                styles.tabPillText,
                { color: theme.textSecondary },
                selectedDeptId === null && [styles.tabPillTextActive, { color: '#FFFFFF' }]
              ]}>
                All Departments
              </Text>
            </TouchableOpacity>

            {DEPARTMENTS.map(dept => {
              const isSelected = selectedDeptId === dept.id;
              const shortName = getShortName(dept.id, dept.name);
              return (
                <TouchableOpacity
                  key={dept.id}
                  onPress={() => setSelectedDeptId(dept.id)}
                  style={[
                    styles.tabPill,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                    isSelected && [styles.tabPillActive, { backgroundColor: theme.isDark ? '#F97316' : '#0F172A', borderColor: theme.isDark ? '#F97316' : '#0F172A' }]
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={dept.icon as any} 
                    size={13} 
                    color={isSelected ? '#FFFFFF' : theme.textSecondary} 
                    style={styles.tabPillIcon}
                  />
                  <Text style={[
                    styles.tabPillText,
                    { color: theme.textSecondary },
                    isSelected && [styles.tabPillTextActive, { color: '#FFFFFF' }]
                  ]}>
                    {shortName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Redundant designation scrollbar removed as HOD toggle is placed adjacent to the search input */}

      {/* Active Faculty Counter Indicator */}
      <View style={[styles.countContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="school-outline" size={14} color={theme.textSecondary} />
        <Text style={[styles.countText, { color: theme.textSecondary }]}>
          Showing {filteredFaculty.length} {filteredFaculty.length === 1 ? 'Faculty Member' : 'Faculty Members'}
        </Text>
      </View>

      {/* Performant directory listing */}
      <View style={styles.listContainer}>
        <TypedFlashList
          data={filteredFaculty}
          renderItem={renderItem}
          keyExtractor={(item: Faculty) => item.id}
          estimatedItemSize={150}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="sad-outline" size={44} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.text }]}>No faculty members found</Text>
              <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
                Try adjusting your search criteria or clearing active filters
              </Text>
              {(searchQuery || showOnlyHods) && (
                <TouchableOpacity
                  style={[styles.clearBtn, { backgroundColor: theme.isDark ? '#F97316' : '#0F172A' }]}
                  onPress={() => {
                    setSearchQuery('');
                    setShowOnlyHods(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.clearBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  header: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  iconTag: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  resetButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
  },
  resetButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
  },
  hodToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  hodToggleActive: {
    borderColor: '#F97316',
  },
  hodToggleText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tabPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabPillIcon: {
    marginRight: 4,
  },
  tabPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7FB',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 140,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0F172A',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
