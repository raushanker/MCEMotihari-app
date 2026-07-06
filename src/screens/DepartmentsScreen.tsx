import { DepartmentCard } from '@/components/DepartmentCard';
import { DEPARTMENTS } from '@/data/departments';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text,  TouchableOpacity, View } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';

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
             autoCapitalize="sentences" />
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
        {/* Academic Introduction Card — Premium Redesign */}
        <View style={[styles.introCard, { 
          backgroundColor: theme.isDark ? '#1E293B' : '#FFFFFF',
          borderColor: theme.isDark ? '#334155' : '#E2E8F0',
          borderWidth: 1,
          shadowColor: theme.isDark ? '#000' : '#CBD5E1',
        }]}>
          {/* Subtle accent line */}
          <View style={[styles.introAccentLine, { backgroundColor: '#F97316' }]} />
          
          <View style={styles.introHeader}>
            <View style={[styles.introBadge, { backgroundColor: 'rgba(249, 115, 22, 0.12)' }]}>
              <Ionicons name="school" size={11} color="#F97316" style={{ marginRight: 4 }} />
              <Text style={styles.introBadgeText}>MCE MOTIHARI</Text>
            </View>
            <TouchableOpacity onPress={onOpenFacultyDirectory} style={styles.fullDirLink} activeOpacity={0.6}>
              <Text style={[styles.fullDirLinkText, { color: '#F97316' }]}>Faculty Directory</Text>
              <Ionicons name="arrow-forward-outline" size={11} color="#F97316" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.intorTitleRow}>
            <View style={[styles.introTitleIconBox, { backgroundColor: 'rgba(249, 115, 22, 0.12)' }]}>
              <Ionicons name="business" size={18} color="#F97316" />
            </View>
            <Text style={[styles.introTitle, { color: theme.isDark ? '#FFFFFF' : '#0F172A' }]}>Academic Departments</Text>
          </View>
          
          <Text style={[styles.introDesc, { color: theme.isDark ? '#94A3B8' : '#475569' }]}>
            Explore our B.Tech engineering branches, curriculum, labs, and dedicated faculty members driving innovation at Motihari College of Engineering.
          </Text>
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
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 0,
    marginBottom: 20,
    overflow: 'hidden',
    boxShadow: Platform.OS === 'web' ? `${0}px ${8}px ${24}px rgba(15, 23, 42, 0.2)` : undefined,
    elevation: 6,
  },
  introAccentLine: {
    height: 4,
    width: '100%',
  },
  introHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  introBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  introBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: 1.2,
  },
  fullDirLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  fullDirLinkText: {
    fontSize: 11,
    fontWeight: '700',
  },
  intorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  introTitleIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  introDesc: {
    fontSize: 12.5,
    lineHeight: 20,
    fontWeight: '400',
    paddingHorizontal: 20,
    paddingBottom: 22,
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
