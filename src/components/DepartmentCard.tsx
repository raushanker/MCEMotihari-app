import React from 'react';
import {Platform, StyleSheet, View, Text, TouchableOpacity} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Department } from '@/data/departments';
import { getFacultyForDepartment } from '@/data/faculty';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';

interface DepartmentCardProps {
  department: Department;
  onPress: () => void;
}

const DEPT_CONFIGS: Record<string, { desc: string; color: string; bgLight: string; bgDark: string }> = {
  cse: {
    desc: 'High-end computer labs & active coding cell CodeQuest',
    color: '#8B5CF6', // Purple
    bgLight: '#FAF5FF',
    bgDark: 'rgba(139, 92, 246, 0.08)',
  },
  cse_ai: {
    desc: 'Advanced B.Tech program in Machine Learning & Analytics',
    color: '#3B82F6', // Blue
    bgLight: '#F0F9FF',
    bgDark: 'rgba(59, 130, 246, 0.08)',
  },
  civil: {
    desc: 'Concrete testing, structural labs & annual survey camps',
    color: '#EF4444', // Red
    bgLight: '#FFF1F2',
    bgDark: 'rgba(239, 68, 68, 0.08)',
  },
  civil_ca: {
    desc: 'Civil engineering specialization with software design',
    color: '#EC4899', // Pink
    bgLight: '#FDF2F8',
    bgDark: 'rgba(236, 72, 153, 0.08)',
  },
  eee: {
    desc: 'Electrical power systems, analog circuits & embedded labs',
    color: '#10B981', // Green
    bgLight: '#F0FDF4',
    bgDark: 'rgba(16, 185, 129, 0.08)',
  },
  mechanical: {
    desc: 'CAD/CAM solidworks modeling & automobile workshops',
    color: '#F59E0B', // Amber
    bgLight: '#FFF7ED',
    bgDark: 'rgba(245, 158, 11, 0.08)',
  },
  humanities: {
    desc: 'B.Tech foundational sciences, physics, and management',
    color: '#64748B', // Slate
    bgLight: '#F8FAFC',
    bgDark: 'rgba(100, 116, 139, 0.08)',
  },
};

export const DepartmentCard: React.FC<DepartmentCardProps> = React.memo(({ department, onPress }) => {
  const facultyCount = getFacultyForDepartment(department.id).length;
  const theme = useThemeColors();
  const deptNoticeStats = useAppStore(state => state.deptNoticeStats);
  const readDeptNoticeStates = useAppStore(state => state.readDeptNoticeStates);
  
  const config = DEPT_CONFIGS[department.id] || DEPT_CONFIGS['humanities'];
  const cardBg = theme.isDark ? config.bgDark : config.bgLight;
  
  const latestNotice = deptNoticeStats[department.id] || 0;
  const currentRead = readDeptNoticeStates[department.id] || 0;
  const hasNewNotice = latestNotice > currentRead;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor: theme.isDark ? theme.cardBorder : 'transparent' }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`View faculty directory for ${department.name}`}
    >
      {/* Dynamic gradient-themed left border/accent indicator */}
      <View style={[styles.accentBorder, { backgroundColor: config.color }]} />

      <View style={styles.contentContainer}>
        {/* Department Icon Frame */}
        <View style={{ position: 'relative' }}>
          <View style={[styles.iconContainer, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)' }]}>
            <Ionicons name={department.icon as any} size={22} color={config.color} />
          </View>
          {hasNewNotice && (
            <View style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#EF4444',
              borderWidth: 2,
              borderColor: cardBg
            }} />
          )}
        </View>

        {/* Text Details Area */}
        <View style={styles.textDetails}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
            {department.name}
          </Text>
          
          <Text style={[styles.specialtyDesc, { color: theme.textSecondary }]} numberOfLines={2}>
            {config.desc}
          </Text>
          
          <View style={styles.metaRow}>
            {/* Intake Badge */}
            <View style={[styles.intakeBadge, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <Ionicons name="people-outline" size={11} color={theme.textSecondary} style={styles.badgeIcon} />
              <Text style={[styles.intakeText, { color: theme.textSecondary }]}>{department.intake}</Text>
            </View>

            {/* Faculty Count Badge */}
            <View style={[styles.facultyBadge, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.03)', borderColor: 'transparent' }]}>
              <Ionicons name="school-outline" size={11} color={config.color} style={styles.badgeIcon} />
              <Text style={[styles.facultyBadgeText, { color: config.color }]}>{facultyCount} Faculty</Text>
            </View>
          </View>
        </View>

        {/* Navigation Arrow */}
        <View style={[styles.arrowContainer, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF', borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Ionicons name="chevron-forward-outline" size={14} color="#94A3B8" />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${8}px #0F172A` : undefined,

    elevation: 2,
    overflow: 'hidden',
  },
  accentBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingLeft: 18,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  textDetails: {
    flex: 1,
    paddingRight: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 4,
  },
  specialtyDesc: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  intakeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeIcon: {
    marginRight: 4,
  },
  intakeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  facultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  facultyBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  arrowContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
