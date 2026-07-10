import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';

interface CGPACalculatorScreenProps {
  onBack: () => void;
}

interface SemesterData {
  id: number;
  sgpa: string;
  credit: string;
}

export const CGPA_CONVERSION_FACTOR = {
  subtract: 0.75,
  multiplier: 10,
};

export const CGPACalculatorScreen: React.FC<CGPACalculatorScreenProps> = ({ onBack }) => {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  
  // Initialize with 8 semesters empty
  const [semesters, setSemesters] = useState<SemesterData[]>(
    Array.from({ length: 8 }).map((_, i) => ({
      id: i + 1,
      sgpa: '',
      credit: ''
    }))
  );

  const updateSemester = (id: number, field: keyof SemesterData, value: string) => {
    // Only allow numbers and decimals
    const cleanValue = value.replace(/[^0-9.]/g, '');
    setSemesters(prev => prev.map(s => s.id === id ? { ...s, [field]: cleanValue } : s));
  };

  const clearAll = () => {
    setSemesters(Array.from({ length: 8 }).map((_, i) => ({
      id: i + 1,
      sgpa: '',
      credit: ''
    })));
  };

  // Calculations
  const results = useMemo(() => {
    let totalSgp = 0;
    let totalCredit = 0;
    
    semesters.forEach(sem => {
      const sgpa = parseFloat(sem.sgpa) || 0;
      const credit = parseFloat(sem.credit) || 0;
      
      // SGP = SGPA * Credit
      totalSgp += (sgpa * credit);
      totalCredit += credit;
    });

    const cgpa = totalCredit > 0 ? (totalSgp / totalCredit) : 0;
    
    // Calculate estimated percentage using configurable formula
    const approximatePercentage = cgpa > 0 
      ? (cgpa - CGPA_CONVERSION_FACTOR.subtract) * CGPA_CONVERSION_FACTOR.multiplier 
      : 0;

    return {
      totalSgp,
      totalCredit,
      cgpa,
      approximatePercentage: Math.max(0, approximatePercentage)
    };
  }, [semesters]);

  const renderSemesterCard = (sem: SemesterData) => {
    const hasData = sem.sgpa !== '' || sem.credit !== '';
    
    return (
      <View key={sem.id} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: hasData ? '#3B82F6' : theme.cardBorder, borderWidth: hasData ? 2 : 1 }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.semBadge, { backgroundColor: hasData ? '#3B82F6' : theme.backgroundSelected }]}>
            <Text style={[styles.semBadgeText, { color: hasData ? '#FFF' : theme.textSecondary }]}>
              Semester {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][sem.id - 1]}
            </Text>
          </View>
        </View>

        <View style={styles.inputGrid}>
          <View style={styles.inputCol}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>SGPA</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background }]}
              keyboardType="numeric"
              value={sem.sgpa}
              onChangeText={(t) => updateSemester(sem.id, 'sgpa', t)}
              placeholder="e.g. 7.6"
              placeholderTextColor={theme.textSecondary}
             autoCapitalize="sentences" />
          </View>
          <View style={styles.inputCol}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Total Credit</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background }]}
              keyboardType="numeric"
              value={sem.credit}
              onChangeText={(t) => updateSemester(sem.id, 'credit', t)}
              placeholder="e.g. 17.5"
              placeholderTextColor={theme.textSecondary}
             autoCapitalize="sentences" />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Overall CGPA</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          {/* Main Results Dashboard */}
          <View style={[styles.resultsDashboard, { backgroundColor: '#3B82F6' }]}>
            <View style={styles.mainResultRow}>
              <View style={styles.mainResultBox}>
                <Text style={styles.mainResultLabel}>Overall CGPA</Text>
                <Text style={styles.mainResultValue}>{results.cgpa.toFixed(2)}</Text>
              </View>
              <View style={styles.mainResultDivider} />
              <View style={styles.mainResultBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={[styles.mainResultLabel, { marginBottom: 0 }]}>Estimated %</Text>
                </View>
                <Text style={styles.mainResultValue}>{results.approximatePercentage.toFixed(1)}%</Text>
              </View>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total SGP</Text>
                <Text style={styles.statValue}>{results.totalSgp.toFixed(1)}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total Credits</Text>
                <Text style={styles.statValue}>{results.totalCredit}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                This percentage is an estimated value calculated from CGPA. Official percentage may vary according to Bihar Engineering University (BEU) regulations.
              </Text>
              <Text style={[styles.formulaText, { color: theme.textSecondary }]}>
                Formula: (CGPA - {CGPA_CONVERSION_FACTOR.subtract}) × {CGPA_CONVERSION_FACTOR.multiplier}
              </Text>
            </View>
          </View>

          {semesters.map(renderSemesterCard)}
          
          <View style={{ height: Math.max(insets.bottom, 40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  clearBtn: { padding: 8 },
  clearBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
  scrollContent: {
    padding: 16,
  },
  resultsDashboard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  mainResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  mainResultBox: {
    flex: 1,
    alignItems: 'center',
  },
  mainResultDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  mainResultLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainResultValue: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12,
    padding: 12,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  formulaText: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.8,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  semBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  semBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  }
});
