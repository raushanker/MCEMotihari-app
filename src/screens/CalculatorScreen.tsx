import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Dimensions, 
  Platform,
  ScrollView 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from '@/hooks/useThemeColors';

interface CalculatorScreenProps {
  onBack: () => void;
}

export const CalculatorScreen: React.FC<CalculatorScreenProps> = ({ onBack }) => {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isDegree, setIsDegree] = useState(true);
  const [isScientific, setIsScientificMode] = useState(false);
  const [memory, setMemory] = useState(0);

  const handlePress = (val: string) => {
    if (display === '0' && !['.', '+', '-', '*', '/', '%'].includes(val)) {
      setDisplay(val);
      setEquation(val);
    } else {
      setDisplay(prev => prev + val);
      setEquation(prev => prev + val);
    }
  };

  const calculate = () => {
    try {
      // Safely evaluate simple math expression. Replacing functions with Math.
      let safeEq = equation
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/sin\(/g, isDegree ? 'Math.sin((Math.PI/180)*' : 'Math.sin(')
        .replace(/cos\(/g, isDegree ? 'Math.cos((Math.PI/180)*' : 'Math.cos(')
        .replace(/tan\(/g, isDegree ? 'Math.tan((Math.PI/180)*' : 'Math.tan(')
        .replace(/asin\(/g, isDegree ? '(180/Math.PI)*Math.asin(' : 'Math.asin(')
        .replace(/acos\(/g, isDegree ? '(180/Math.PI)*Math.acos(' : 'Math.acos(')
        .replace(/atan\(/g, isDegree ? '(180/Math.PI)*Math.atan(' : 'Math.atan(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/√\(/g, 'Math.sqrt(')
        .replace(/\^/g, '**')
        .replace(/π/g, 'Math.PI')
        .replace(/e/g, 'Math.E');

      // Add missing closing brackets for evaluation safety
      const openBrackets = (safeEq.match(/\(/g) || []).length;
      const closeBrackets = (safeEq.match(/\)/g) || []).length;
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        safeEq += ')';
      }

      // Handle factorial
      safeEq = safeEq.replace(/(\d+)!/g, (match, n) => {
        let res = 1;
        for (let i = 2; i <= parseInt(n); i++) res *= i;
        return res.toString();
      });

      // Avoid eval in production React Native safely, use Function
      const result = new Function('return ' + safeEq)();
      if (!isFinite(result) || isNaN(result)) {
        setDisplay('Error');
      } else {
        const finalRes = Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(8)).toString();
        setDisplay(finalRes);
        setEquation(finalRes);
      }
    } catch (e) {
      setDisplay('Error');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const handleDelete = () => {
    if (display.length > 1) {
      setDisplay(prev => prev.slice(0, -1));
      setEquation(prev => prev.slice(0, -1));
    } else {
      setDisplay('0');
      setEquation('');
    }
  };

  const handleMemory = (type: 'MC' | 'MR' | 'M+' | 'M-') => {
    const val = parseFloat(display);
    if (isNaN(val)) return;
    
    switch (type) {
      case 'MC': setMemory(0); break;
      case 'MR': setDisplay(memory.toString()); setEquation(memory.toString()); break;
      case 'M+': setMemory(prev => prev + val); break;
      case 'M-': setMemory(prev => prev - val); break;
    }
  };

  const renderBtn = (label: string, action: () => void, color?: string, flex?: number) => (
    <TouchableOpacity
      style={[
        styles.btn,
        { 
          backgroundColor: color || theme.backgroundElement, 
          flex: flex || 1,
          margin: isScientific ? 2 : 4,
          borderRadius: isScientific ? 10 : 16,
        },
      ]}
      activeOpacity={0.7}
      onPress={action}
    >
      <Text style={[
        styles.btnText, 
        { 
          color: color ? '#FFF' : theme.text,
          fontSize: isScientific ? 16 : 22,
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Calculator</Text>
        <TouchableOpacity 
          style={[
            styles.modeBtn, 
            { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(15, 23, 42, 0.08)' }
          ]} 
          onPress={() => setIsScientificMode(!isScientific)}
        >
          <Ionicons 
            name={isScientific ? "apps-outline" : "flask-outline"} 
            size={16} 
            color={theme.isDark ? '#F97316' : '#0F172A'} 
            style={{ marginRight: 4 }} 
          />
          <Text style={[styles.modeBtnText, { color: theme.isDark ? '#F97316' : '#0F172A' }]}>
            {isScientific ? 'Standard' : 'Scientific'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.displayContainer, { flex: 1 }]}>
        <Text style={[styles.equation, { color: theme.textSecondary }]} numberOfLines={2}>
          {equation || ' '}
        </Text>
        <Text style={[styles.display, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {display}
        </Text>
      </View>

      <View style={[styles.keypad, { flex: isScientific ? 2.5 : 1.8, paddingBottom: Math.max(insets.bottom, 16) }]}>
        {isScientific && (
          <>
            <View style={styles.row}>
              {renderBtn(isDegree ? 'DEG' : 'RAD', () => setIsDegree(!isDegree), theme.primary)}
              {renderBtn('MC', () => handleMemory('MC'))}
              {renderBtn('MR', () => handleMemory('MR'))}
              {renderBtn('M+', () => handleMemory('M+'))}
              {renderBtn('M-', () => handleMemory('M-'))}
            </View>
            <View style={styles.row}>
              {renderBtn('sin', () => handlePress('sin('))}
              {renderBtn('cos', () => handlePress('cos('))}
              {renderBtn('tan', () => handlePress('tan('))}
              {renderBtn('(', () => handlePress('('))}
              {renderBtn(')', () => handlePress(')'))}
            </View>
            <View style={styles.row}>
              {renderBtn('asin', () => handlePress('asin('))}
              {renderBtn('acos', () => handlePress('acos('))}
              {renderBtn('atan', () => handlePress('atan('))}
              {renderBtn('x²', () => handlePress('^2'))}
              {renderBtn('√', () => handlePress('√('))}
            </View>
            <View style={styles.row}>
              {renderBtn('log', () => handlePress('log('))}
              {renderBtn('ln', () => handlePress('ln('))}
              {renderBtn('π', () => handlePress('π'))}
              {renderBtn('e', () => handlePress('e'))}
              {renderBtn('x!', () => handlePress('!'))}
            </View>
          </>
        )}

        {/* Common Number Pad */}
        <View style={styles.row}>
          {renderBtn('C', handleClear, '#EF4444')}
          {renderBtn('⌫', handleDelete, '#F59E0B')}
          {renderBtn('%', () => handlePress('%'), theme.cardBorder)}
          {renderBtn('÷', () => handlePress('÷'), '#3B82F6')}
        </View>
        <View style={styles.row}>
          {renderBtn('7', () => handlePress('7'))}
          {renderBtn('8', () => handlePress('8'))}
          {renderBtn('9', () => handlePress('9'))}
          {renderBtn('×', () => handlePress('×'), '#3B82F6')}
        </View>
        <View style={styles.row}>
          {renderBtn('4', () => handlePress('4'))}
          {renderBtn('5', () => handlePress('5'))}
          {renderBtn('6', () => handlePress('6'))}
          {renderBtn('-', () => handlePress('-'), '#3B82F6')}
        </View>
        <View style={styles.row}>
          {renderBtn('1', () => handlePress('1'))}
          {renderBtn('2', () => handlePress('2'))}
          {renderBtn('3', () => handlePress('3'))}
          {renderBtn('+', () => handlePress('+'), '#3B82F6')}
        </View>
        <View style={styles.row}>
          {isScientific ? renderBtn('^', () => handlePress('^')) : null}
          {renderBtn('0', () => handlePress('0'), undefined, isScientific ? 1 : 2)}
          {renderBtn('.', () => handlePress('.'))}
          {renderBtn('=', calculate, '#10B981')}
        </View>
      </View>
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
  displayContainer: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  equation: { fontSize: 28, marginBottom: 8, opacity: 0.7 },
  display: { fontSize: 64, fontWeight: '300' },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  keypad: {
    paddingHorizontal: 8,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  btn: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.1)',
  },
  btnText: { fontWeight: '600' },
});
