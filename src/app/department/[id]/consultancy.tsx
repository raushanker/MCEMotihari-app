import { DEPARTMENTS } from '@/data/departments';
import { FACULTY_DATA } from '@/data/faculty';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Image, LayoutAnimation, Linking, Platform, StatusBar, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SOIL_LAB = [
  { test: 'Moisture Content', charge: '285.00' },
  { test: 'Sieve Analysis', charge: '420.00' },
  { test: 'Atterberg’s Limits', charge: '425.00' },
  { test: 'Proctor Compaction Test', charge: '550.00' },
  { test: 'Specific Gravity Test/F.S.I.', charge: '820.00' },
  { test: 'Shrinkage Limit Test', charge: '290.00' },
  { test: 'CBR Test\n(i) Un-soaked\n(ii) Soaked', charge: 'As follows\n550.00\n850.00' },
  { test: 'Field Density Test', charge: '1140.00' },
  { test: 'Unconfined Compression Test\n(i) Undisturbed\n(ⅱ) Disturbed', charge: 'As follows\n1420.00\n2760.00' },
  { test: 'Tri-axial Test\n(i) Undisturbed\n(ⅱ) Disturbed', charge: 'As follows\n1900.00\n2450.00' },
  { test: 'Direct Shear Test', charge: '1660.00' },
  { test: 'Consolidation Test', charge: '11340.00' },
  { test: 'Hydrometer Test', charge: '1300.00' },
  { test: 'Plate Bearing Test without Field', charge: '28740.00' },
  { test: 'Standard Penetration Test (SPT)', charge: 'As follows:\nBoring Charge Rs. 350/- per m upto 15 m;\nRs. 400/- per m above 15 m ( Excluding labour charge ).\n10% overhead on per m boring is included.' },
];

const ENV_LAB = [
  { test: 'Turbidity', charge: '300.00' },
  { test: 'Colour', charge: '250.00' },
  { test: 'Odour', charge: '250.00' },
  { test: 'pH', charge: '150.00' },
  { test: 'Conductivity', charge: '250.00' },
  { test: 'Suspended Solids', charge: '250.00' },
  { test: 'Dissolved Solids', charge: '250.00' },
  { test: 'Oil and Grease', charge: '400.00' },
  { test: 'Volatile Suspended Solid', charge: '250.00' },
  { test: 'B.O.D', charge: '750.00' },
  { test: 'C.O.D (Permanganate)', charge: '500.00' },
  { test: 'C.O.D (Dichromate)', charge: '750.00' },
  { test: 'Dissolved Oxygen', charge: '300.00' },
  { test: 'Volatile Solids', charge: '300.00' },
  { test: 'Chloride', charge: '300.00' },
  { test: 'Sulphide', charge: '300.00' },
  { test: 'Sulphate', charge: '300.00' },
  { test: 'Sulphite', charge: '300.00' },
  { test: 'Phosphate', charge: '300.00' },
  { test: 'Sodium', charge: '300.00' },
  { test: 'Potassium', charge: '300.00' },
  { test: 'Alkalinity', charge: '750.00' },
  { test: 'Total Hardness', charge: '750.00' },
  { test: 'Calcium', charge: '300.00' },
  { test: 'Carbonate', charge: '300.00' },
  { test: 'Bicarbonate', charge: '300.00' },
  { test: 'Iron', charge: '400.00' },
];

const CEMENT_LAB = [
  { test: 'Compressive strength of Concrete Cubes (per set 3)', charge: '380.00' },
  // Bricks
  { test: 'BRICKS: Water Absorption Test', charge: '530.00' },
  { test: 'BRICKS: Compressive Strength Test', charge: '1470.00' },
  { test: 'BRICKS: Dimension and Shape Test', charge: '200.00' },
  { test: 'BRICKS: Efflorescence Test', charge: '460.00' },
  // Sand
  { test: 'SAND: Sieve Analysis', charge: '400.00' },
  { test: 'SAND: Fineness Modulus', charge: '200.00' },
  { test: 'SAND: Zone (Sieve Analysis)', charge: '400.00' },
  { test: 'SAND: Bulking Test', charge: '200.00' },
  { test: 'SAND: Silt Content Test', charge: '200.00' },
  { test: 'SAND: Deleterious Material Test', charge: '200.00' },
  { test: 'SAND: Water Absorption Test', charge: '200.00' },
  { test: 'SAND: Moisture Content Test', charge: '200.00' },
  { test: 'SAND: Specific Gravity Test', charge: '510.00' },
  // Coarse Aggregate
  { test: 'COARSE AGGREGATE: Sieve Analysis', charge: '400.00' },
  { test: 'COARSE AGGREGATE: Fineness Modulus Test', charge: '200.00' },
  { test: 'COARSE AGGREGATE: Water Absorption Test', charge: '300.00' },
  { test: 'COARSE AGGREGATE: Moisture Absorption Test', charge: '200.00' },
  { test: 'COARSE AGGREGATE: Aggregate Impact Test', charge: '1080.00' },
  { test: 'COARSE AGGREGATE: Crushing Strength Test', charge: '1550.00' },
  { test: 'COARSE AGGREGATE: Los Angeles Abrasion Test', charge: '1250.00' },
  { test: 'COARSE AGGREGATE: Specific Gravity Test', charge: '510.00' },
  // Paver Block
  { test: 'PAVER BLOCK: Water Absorption Test', charge: '250.00' },
  { test: 'PAVER BLOCK: Compressive strength Test', charge: '500.00' },
  // Cement
  { test: 'CEMENT: Specific Gravity Test', charge: '200.00' },
  { test: 'CEMENT: Fineness of Cement test', charge: '200.00' },
  { test: 'CEMENT: Initial and Final Setting Time Test', charge: '570.00' },
  { test: 'CEMENT: Compressive Strength Tests (3, 7, and 28 days)', charge: '1290.00' },
  { test: 'CEMENT: Normal Consistency Test', charge: '460.00' },
  { test: 'CEMENT: Soundness Test', charge: '790.00' },
  // Concrete Mix
  { test: 'CONCRETE MIX DESIGN: Grade M15', charge: '10000.00' },
  { test: 'CONCRETE MIX DESIGN: Grade M20', charge: '12000.00' },
  { test: 'CONCRETE MIX DESIGN: Grade M25', charge: '12000.00' },
  { test: 'CONCRETE MIX DESIGN: Grade M30', charge: '15000.00' },
  { test: 'CONCRETE MIX DESIGN: Grade M35', charge: '15000.00' },
  { test: 'CONCRETE MIX DESIGN: Grade M40 and above', charge: '15000.00' },
];

const HIGHWAY_LAB = [
  { test: 'Aggregate Flakiness & Elongation Index', charge: '400.00' },
  { test: 'Penetration Test of Bitumen', charge: '1000.00' },
  { test: 'Specific Gravity Test of Bitumen', charge: '940.00' },
  { test: 'Softening Point Test of Bitumen', charge: '1000.00' },
  { test: 'Ductility Test of Bitumen', charge: '1310.00' },
  { test: 'Viscosity Test of Bitumen', charge: '1500.00' },
  { test: 'Water Content Test of Bitumen', charge: '1510.00' },
  { test: 'Solubility test of Bitumen', charge: '1360.00' },
  { test: 'PMC Seal Coated', charge: '1230.00' },
  { test: 'BM Seal Coated', charge: '1230.00' },
  { test: 'Stripping Test', charge: '1570.00' },
  { test: 'Marshal Stability Test', charge: '5450.00' },
];

export default function ConsultancyScreen() {
  const { id, from } = useLocalSearchParams<{ id: string, from: string }>();
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const paddingTop = Platform.OS === 'android' ? (statusBarHeight || 24) : (insets.top || 44);

  const [expandedLab, setExpandedLab] = useState<string | null>(null);

  const dept = DEPARTMENTS.find(d => d.id === id);

  const toggleLab = (labId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedLab(expandedLab === labId ? null : labId);
  };

  const sushantData = FACULTY_DATA.find(f => f.id === 'civil-sushant');

  const renderLabSection = (title: string, data: any[], labId: string) => {
    const isExpanded = expandedLab === labId;
    return (
      <View style={[styles.sectionContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={styles.sectionHeader} 
          onPress={() => toggleLab(labId)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="flask" size={20} color="#10B981" style={{ marginRight: 10 }} />
            <Text style={[styles.sectionTitleText, { color: theme.text }]}>{title}</Text>
          </View>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.tableContainer}>
            <View style={[styles.tableHeader, { backgroundColor: theme.isDark ? '#1F2937' : '#F3F4F6', borderBottomColor: theme.cardBorder }]}>
              <Text style={[styles.thText, { color: theme.textSecondary, flex: 3 }]}>Name of the Lab Test</Text>
              <Text style={[styles.thText, { color: theme.textSecondary, flex: 1, textAlign: 'right' }]}>Existing Charge (Rs.)</Text>
            </View>
            {data.map((item, index) => (
              <View key={index} style={[styles.tableRow, { borderBottomColor: theme.cardBorder, borderBottomWidth: index === data.length - 1 ? 0 : 1 }]}>
                <Text style={[styles.tdText, { color: theme.text, flex: 3 }]}>{item.test}</Text>
                <Text style={[styles.tdText, { color: theme.text, flex: 1, textAlign: 'right', fontWeight: '600' }]}>{item.charge}</Text>
              </View>
            ))}
            <View style={{ padding: 12, backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF', marginTop: 12, borderRadius: 8 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                Remarks: G.S.T. will be charged as per Govt. order with additional office contingency charged.
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop }]}>
      <View style={[styles.header, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity 
          style={[styles.headerBackBtn, { backgroundColor: theme.isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]} 
          onPress={() => {
            if (from === 'hub' && id) {
              router.replace(`/department/${encodeURIComponent(id as string)}?deptId=${encodeURIComponent(id as string)}`);
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }} 
          activeOpacity={0.6}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text, flex: 1 }]}>Industrial Consultancy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Industrial Consultancy and Research</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>Department of Civil Engineering</Text>
        </View>

        {renderLabSection('SOIL MECHANICS LABORATORY', SOIL_LAB, 'soil')}
        {renderLabSection('ENVIRONMENTAL ENGINEERING LABORATORY', ENV_LAB, 'env')}
        {renderLabSection('CEMENT CONCRETE LABORATORY', CEMENT_LAB, 'cement')}
        {renderLabSection('HIGHWAY ENGINEERING LABORATORY', HIGHWAY_LAB, 'highway')}

        <Text style={[styles.sectionTitleText, { color: theme.textSecondary, marginTop: 12, marginBottom: 12, marginLeft: 4, textTransform: 'uppercase', fontSize: 13, letterSpacing: 0.5 }]}>Contact Person</Text>

        <View style={[styles.contactCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, padding: 0, overflow: 'hidden' }]}>
          <TouchableOpacity 
            style={[styles.profileSection, { borderBottomColor: theme.cardBorder, borderBottomWidth: 1 }]}
            activeOpacity={0.7}
            onPress={() => router.push('/faculty?facultyId=civil-sushant&from=consultancy&deptId=civil')}
          >
            {sushantData ? (
              <Image source={{ uri: sushantData.imageUrl }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="person" size={32} color="#3B82F6" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactName, { color: theme.text }]}>Mr. Sushant Kumar</Text>
              <Text style={[styles.contactRole, { color: theme.textSecondary }]}>Prof. In-charge (Consultancy)</Text>
              <Text style={[styles.contactRole, { color: theme.textSecondary, fontSize: 12 }]}>Assistant Professor, Civil Engineering</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={styles.actionsSection}>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.1)', flex: 1, marginRight: 8 }]}
              activeOpacity={0.7}
              onPress={() => Linking.openURL('tel:8210116757')}
            >
              <Ionicons name="call" size={18} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Call Now</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', flex: 1, marginLeft: 8 }]}
              activeOpacity={0.7}
              onPress={() => Linking.openURL('mailto:sushantkumar0007@gmail.com')}
            >
              <Ionicons name="mail" size={18} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Send Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={[styles.disclaimerBox, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderColor: 'rgba(239, 68, 68, 0.3)', marginTop: 24 }]}>
          <Ionicons name="information-circle" size={20} color="#EF4444" style={{ marginBottom: 8 }} />
          <Text style={[styles.disclaimerText, { color: theme.text }]}>
            <Text style={{ fontWeight: 'bold' }}>Disclaimer:</Text> The testing charges and details provided here are for reference only and may vary over time. For the most accurate and up-to-date information, please verify with the official sources.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.mcemotihari.ac.in/department/civil-engineering/industrial-consultancy-and-research/')}>
            <Text style={[styles.disclaimerLink, { color: '#3B82F6' }]}>Source: Official College Website</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 15,
  },
  sectionContainer: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  tableContainer: {
    padding: 16,
    paddingTop: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
  },
  thText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tdText: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  contactRole: {
    fontSize: 13,
    marginBottom: 2,
  },
  actionsSection: {
    flexDirection: 'row',
    padding: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  disclaimerBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  disclaimerText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  disclaimerLink: {
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
