import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { DEPARTMENTS } from '@/data/departments';
import { useAppStore } from '@/store/useAppStore';

export const ClubsScreen = ({ onBack, onSelectDepartment }: { onBack: () => void, onSelectDepartment: (id: string) => void }) => {
  const theme = useThemeColors();

  const getDeptColor = (id: string) => {
    switch (id) {
      case 'cse': return '#3B82F6';
      case 'cse_ai': return '#8B5CF6';
      case 'civil': return '#10B981';
      case 'civil_ca': return '#14B8A6';
      case 'eee': return '#F59E0B';
      case 'mechanical': return '#EF4444';
      default: return '#F97316';
    }
  };

  const departments = DEPARTMENTS.filter(d => d.id !== 'humanities' && d.id !== 'cse_ai' && d.id !== 'civil_ca');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.headerBackBtn, { backgroundColor: theme.isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]} 
          onPress={onBack} 
          activeOpacity={0.6}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Clubs & Society</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
          Select a department to view its technical and cultural clubs.
        </Text>

        <View style={styles.grid}>
          {departments.map((dept) => {
            const color = getDeptColor(dept.id);
            return (
              <TouchableOpacity
                key={dept.id}
                style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
                activeOpacity={0.7}
                onPress={() => {
                  onSelectDepartment(dept.id);
                }}
              >
                <View style={[styles.iconBox, { backgroundColor: theme.isDark ? `${color}15` : `${color}10` }]}>
                  <Ionicons name="planet" size={24} color={color} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{dept.name}</Text>
                  <Text style={[styles.cardSub, { color: theme.textSecondary }]}>Tap to view clubs</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    height: 60, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    borderBottomWidth: 1 
  },
  headerBackBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12, 
    borderWidth: 1 
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  pageSubtitle: {
    fontSize: 15,
    marginBottom: 20,
    lineHeight: 22,
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
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
  },
});
