import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEPARTMENTS } from '@/data/departments';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';

interface DepartmentHubScreenProps {
  departmentId: string;
  onBack: () => void;
  onOpenFaculty: () => void;
  onOpenSyllabus: () => void;
  onOpenMaterials: () => void;
  onOpenLaboratory: () => void;
  onOpenSociety: () => void;
  onOpenMagazine: () => void;
  onOpenConsultancy?: () => void;
  onOpenTestingFacilities?: () => void;
}

export const DepartmentHubScreen: React.FC<DepartmentHubScreenProps> = ({
  departmentId,
  onBack,
  onOpenFaculty,
  onOpenSyllabus,
  onOpenMaterials,
  onOpenLaboratory,
  onOpenSociety,
  onOpenMagazine,
  onOpenConsultancy,
  onOpenTestingFacilities,
}) => {
  const theme = useThemeColors();
  const { user } = useAppStore();

  const dept = DEPARTMENTS.find(d => d.id === departmentId);

  if (!dept) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Department not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={{ color: theme.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isDeptAdmin = user?.role === 'Admin' || user?.departmentAdminRoles?.includes(dept.id);

  const getDeptTheme = (id: string) => {
    switch (id) {
      case 'cse': return '#3B82F6'; // Blue
      case 'cse_ai': return '#8B5CF6'; // Violet
      case 'civil': return '#10B981'; // Emerald
      case 'civil_ca': return '#14B8A6'; // Teal
      case 'eee': return '#F59E0B'; // Amber
      case 'mechanical': return '#EF4444'; // Red
      case 'humanities': return '#64748B'; // Slate
      default: return '#F97316'; // Orange
    }
  };

  const deptColor = getDeptTheme(dept.id);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity style={[styles.headerBackBtn, { backgroundColor: theme.isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]} onPress={onBack} activeOpacity={0.6}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text, flex: 1 }]}>Department Hub</Text>
        {isDeptAdmin && (
          <TouchableOpacity style={[styles.manageBtn, { backgroundColor: theme.primary + '15' }]} onPress={() => alert('Department Admin Panel: Coming Soon!')}>
            <Ionicons name="settings-outline" size={16} color={theme.primary} />
            <Text style={[styles.manageBtnText, { color: theme.primary }]}>Manage</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro Card */}
        <View style={[styles.introCard, { 
          backgroundColor: theme.isDark ? `${deptColor}15` : `${deptColor}10`, 
          borderColor: theme.isDark ? `${deptColor}30` : `${deptColor}20`, 
          borderWidth: 1 
        }]}>
          <View style={[styles.introIconContainer, { backgroundColor: `${deptColor}20` }]}>
            <Ionicons name={dept.icon as any} size={32} color={deptColor} />
          </View>
          <Text style={[styles.introTitle, { color: theme.isDark ? '#FFFFFF' : '#1E293B' }]}>{dept.name}</Text>
          <Text style={[styles.introDesc, { color: theme.isDark ? theme.textSecondary : '#475569' }]}>
            {dept.description || 'Welcome to the department portal for ' + dept.name + '.'}
          </Text>

          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: `${deptColor}15`, borderColor: `${deptColor}30` }]}>
              <Ionicons name="people-outline" size={14} color={deptColor} />
              <Text style={[styles.badgeText, { color: deptColor }]}>{dept.intake}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>QUICK ACCESS</Text>

        <View style={styles.grid}>
          {/* Faculty Card */}
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
            activeOpacity={0.7}
            onPress={onOpenFaculty}
          >
            <View style={[styles.cardIconBox, { backgroundColor: theme.isDark ? 'rgba(79, 70, 229, 0.15)' : '#EEF2FF' }]}>
              <Ionicons name="school" size={24} color="#4F46E5" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>Faculty Directory</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={styles.cardArrow} />
          </TouchableOpacity>

          {/* Syllabus Card */}
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
            activeOpacity={0.7}
            onPress={onOpenSyllabus}
          >
            <View style={[styles.cardIconBox, { backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
              <Ionicons name="book" size={24} color="#10B981" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>Syllabus</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={styles.cardArrow} />
          </TouchableOpacity>

          {/* Study Materials Card */}
          {departmentId !== 'humanities' && (
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
              activeOpacity={0.7}
              onPress={onOpenMaterials}
            >
              <View style={[styles.cardIconBox, { backgroundColor: theme.isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' }]}>
                <Ionicons name="library" size={24} color="#6366F1" />
              </View>
              <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>Study Materials</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={styles.cardArrow} />
            </TouchableOpacity>
          )}

          {/* Consultancy Card (Civil Only) */}
          {(departmentId === 'civil' || departmentId === 'civil_ca') && onOpenConsultancy && (
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
              activeOpacity={0.7}
              onPress={onOpenConsultancy}
            >
              <View style={[styles.cardIconBox, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
                <Ionicons name="business" size={24} color="#EF4444" />
              </View>
              <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>Industrial Consultancy and Research</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={styles.cardArrow} />
            </TouchableOpacity>
          )}

          {/* Testing & Fabrication Facilities Card (Mechanical) */}
          {departmentId === 'mechanical' && (
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
              activeOpacity={0.7}
              onPress={onOpenTestingFacilities}
            >
              <View style={[styles.cardIconBox, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}>
                <Ionicons name="construct" size={24} color="#EF4444" />
              </View>
              <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>Testing & Fabrication Facilities</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={styles.cardArrow} />
            </TouchableOpacity>
          )}

          {/* Society/Club Card */}
          {departmentId !== 'humanities' && (
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
              activeOpacity={0.7}
              onPress={onOpenSociety}
            >
              <View style={[styles.cardIconBox, { backgroundColor: theme.isDark ? 'rgba(234, 179, 8, 0.15)' : '#FEFCE8' }]}>
                <Ionicons name="planet" size={24} color="#EAB308" />
              </View>
              <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>Society & Clubs</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={styles.cardArrow} />
            </TouchableOpacity>
          )}

          {/* Laboratory Card */}
          {departmentId !== 'humanities' && (
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
              activeOpacity={0.7}
              onPress={onOpenLaboratory}
            >
              <View style={[styles.cardIconBox, { backgroundColor: theme.isDark ? 'rgba(236, 72, 153, 0.15)' : '#FDF2F8' }]}>
                <Ionicons name="flask" size={24} color="#EC4899" />
              </View>
              <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>Laboratories</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={styles.cardArrow} />
            </TouchableOpacity>
          )}

          {/* Magazine Card */}
          {departmentId !== 'humanities' && (
            <TouchableOpacity 
              style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
              activeOpacity={0.7}
              onPress={onOpenMagazine}
            >
              <View style={[styles.cardIconBox, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                <Ionicons name="journal" size={24} color="#3B82F6" />
              </View>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0, marginRight: 8 }]}>Department Magazine</Text>
                  {!['civil', 'civil_ca', 'mechanical', 'eee'].includes(departmentId) && (
                    <View style={{ backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF7ED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: theme.isDark ? 'rgba(249, 115, 22, 0.3)' : '#FED7AA' }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#F97316' }}>Updated soon</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} style={styles.cardArrow} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: {
    padding: 10,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  introCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  introIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  introDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
    gap: 6,
  },
  badgeText: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  grid: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
  },
  cardArrow: {
    marginLeft: 'auto',
  },
});
