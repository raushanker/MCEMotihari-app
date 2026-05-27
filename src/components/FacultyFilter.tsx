import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export type FacultyFilterType =
  | 'All'
  | 'HODs'
  | 'CSE'
  | 'CSE (AI)'
  | 'Civil'
  | 'Civil (CA)'
  | 'EEE'
  | 'Mechanical'
  | 'Humanities';

interface FacultyFilterProps {
  activeFilter: FacultyFilterType;
  onChangeFilter: (filter: FacultyFilterType) => void;
}

const FILTERS: FacultyFilterType[] = [
  'All',
  'HODs',
  'CSE',
  'CSE (AI)',
  'Civil',
  'Civil (CA)',
  'EEE',
  'Mechanical',
  'Humanities',
];

export const FacultyFilter: React.FC<FacultyFilterProps> = React.memo(
  ({ activeFilter, onChangeFilter }) => {
    return (
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.chip,
                  isActive && styles.activeChip,
                ]}
                onPress={() => onChangeFilter(filter)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.chipText,
                    isActive && styles.activeChipText,
                  ]}
                  numberOfLines={1}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    paddingTop: 10,
    paddingBottom: 12,
  },

  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
  },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: '#CBD5E1',

    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },

  activeChip: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',

    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },

  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.2,
  },

  activeChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});