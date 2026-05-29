import React, { useState, useMemo } from 'react';
import {Platform, StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEPARTMENTS, Department } from '@/data/departments';
import { DepartmentCard } from '@/components/DepartmentCard';
import { useThemeColors } from '@/hooks/useThemeColors';

interface DepartmentsScreenProps {
  onSelectDepartment: (deptId: string) => void;
  onOpenFacultyDirectory: () => void;
  onBack?: () => void;
}

export const DepartmentsScreen: React.FC<DepartmentsScreenProps> = ({
  onSelectDepartment,
  onOpenFacultyDirectory,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useThemeColors();

  // Search departments
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return DEPARTMENTS;
    return DEPARTMENTS.filter((dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Header Area */}
      <View style={[styles.searchHeader, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <View style={styles.headerTopRow}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </TouchableOpacity>
          )}
          <View style={[styles.searchBarContainer, { flex: 1, backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search academic departments..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={16} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Academic Introduction Card */}
        <View style={[styles.introCard, { backgroundColor: theme.isDark ? theme.backgroundElement : '#0F172A', borderColor: theme.cardBorder, borderWidth: theme.isDark ? 1 : 0 }]}>
          <View style={styles.introHeader}>
            <View style={styles.introBadge}>
              <Text style={styles.introBadgeText}>MCE CAMPUS</Text>
            </View>
            <TouchableOpacity onPress={onOpenFacultyDirectory} style={styles.fullDirLink} activeOpacity={0.6}>
              <Text style={styles.fullDirLinkText}>Full Directory</Text>
              <Ionicons name="arrow-forward-outline" size={12} color="#F97316" />
            </TouchableOpacity>
          </View>
          <Text style={styles.introTitle}>Academic Directory</Text>
          <Text style={[styles.introDesc, { color: theme.isDark ? theme.textSecondary : '#94A3B8' }]}>
            Discover elite technical departments, structural streams, B.Tech enrollment caps, and direct professional contact listings of Motihari College of Engineering faculty.
          </Text>
        </View>

        {/* Quick Overview Stats Panel */}
        <View style={styles.statsContainer}>
          {/* Intake Stat */}
          <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
              <Ionicons name="people-outline" size={16} color="#F97316" />
            </View>
            <View>
              <Text style={[styles.statNumber, { color: theme.text }]}>360+</Text>
              <Text style={styles.statLabel}>Seats</Text>
            </View>
          </View>

          {/* Faculty Stat */}
          <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
              <Ionicons name="school-outline" size={16} color="#4F46E5" />
            </View>
            <View>
              <Text style={[styles.statNumber, { color: theme.text }]}>40+</Text>
              <Text style={styles.statLabel}>Faculty</Text>
            </View>
          </View>

          {/* Labs Stat */}
          <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="flask-outline" size={16} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.statNumber, { color: theme.text }]}>15+</Text>
              <Text style={styles.statLabel}>Labs</Text>
            </View>
          </View>
        </View>

        {/* Section Heading */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Engineering Departments</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            {filteredDepartments.length} {filteredDepartments.length === 1 ? 'stream' : 'streams'} active
          </Text>
        </View>

        {/* Department List */}
        {filteredDepartments.length > 0 ? (
          filteredDepartments.map((dept) => (
            <DepartmentCard
              key={dept.id}
              department={dept}
              onPress={() => onSelectDepartment(dept.id)}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No departments match your query</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50
  },
  searchHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 150,
  },
  introCard: {
    backgroundColor: '#0F172A', // Slate-900 (Navy Theme)
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    boxShadow: Platform.OS === 'web' ? `${0}px ${6}px ${16}px #0F172A` : undefined,

    elevation: 4,
  },
  introHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  introBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)', // transparent orange
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  introBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: 1,
  },
  fullDirLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fullDirLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  introDesc: {
    fontSize: 11.5,
    color: '#94A3B8', // slate-400
    lineHeight: 18,
    fontWeight: '400',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 12,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
