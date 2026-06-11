import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';

const equipments = [
  {
    name: 'Universal Testing Machine — 50 kN',
    model: 'Tinius Olsen H50KL UTM',
    icon: 'hammer-outline' as const,
    details: [
      { label: 'Max Capacity', value: '50 kN' },
      { label: 'Tests', value: 'Tensile, Compression, Flexural' },
      { label: 'Materials', value: 'Metals, Polymers, Composites, Ceramics' },
      { label: 'Standards', value: 'ASTM / IS Compliant' }
    ],
    tags: ['Tensile', 'Compression', '3-pt Bend']
  },
  {
    name: 'Stir Casting Machine',
    model: 'Metal Matrix Composite Fabrication',
    icon: 'flame-outline' as const,
    details: [
      { label: 'Max Temperature', value: 'Up to 1200°C' },
      { label: 'Application', value: 'Al, Mg, Cu-based MMC fabrication' },
      { label: 'Reinforcement', value: 'SiC, Al₂O₃, Fly Ash, Graphene' },
      { label: 'Batch Size', value: 'Up to 5 kg per batch' }
    ],
    tags: ['MMC', 'Alloy Casting', 'Research Grade']
  },
  {
    name: 'Hydraulic Press',
    model: 'Industrial Grade Pressing & Forming',
    icon: 'barbell-outline' as const,
    details: [
      { label: 'Applications', value: 'Forming, Compaction, Powder Metallurgy' },
      { label: 'Material', value: 'Metallic, Ceramic, Polymer Powder' },
      { label: 'Use Cases', value: 'Pellet making, Sheet forming, Pressing' }
    ],
    tags: ['Powder Compaction', 'Metal Forming', 'Pellets']
  },
  {
    name: 'CNC Lathe — CADMECH VLM-IA-100',
    model: 'Computer Numeric Control Turning Centre',
    icon: 'hardware-chip-outline' as const,
    details: [
      { label: 'Operations', value: 'Turning, Facing, Threading, Grooving' },
      { label: 'Material', value: 'MS, Aluminium, Brass, Copper' },
      { label: 'Accuracy', value: '±0.01 mm' },
      { label: 'Max Dia', value: '200 mm' }
    ],
    tags: ['Sample Prep', 'Custom Parts', 'Prototyping']
  },
  {
    name: 'SLA Resin 3D Printer',
    model: 'Phrozen Sonic Mighty 4K',
    icon: 'print-outline' as const,
    details: [
      { label: 'Resolution', value: '4K Mono LCD (52 µm XY)' },
      { label: 'Build Volume', value: '200 × 125 × 220 mm' },
      { label: 'Layer Thickness', value: '10–300 µm' },
      { label: 'Best For', value: 'Fine detail models, dental, miniatures' }
    ],
    tags: ['High Detail', 'Resin SLA', 'Rapid Proto']
  },
  {
    name: 'FDM 3D Printer',
    model: 'Fused Deposition Modelling',
    icon: 'cube-outline' as const,
    details: [
      { label: 'Materials', value: 'PLA, ABS, PETG, TPU, Nylon' },
      { label: 'Layer Thickness', value: '0.1–0.4 mm' },
      { label: 'Build Volume', value: '300 × 300 × 400 mm' },
      { label: 'Best For', value: 'Functional prototypes, jigs, fixtures' }
    ],
    tags: ['FDM', 'PLA/ABS', 'Functional Parts']
  }
];

const softwares = [
  {
    name: 'ANSYS Workbench',
    model: 'Finite Element Analysis & Simulation',
    icon: 'bar-chart-outline' as const,
    details: [
      { label: 'Structural FEA', value: 'Static, Dynamic, Fatigue, Buckling' },
      { label: 'Thermal Analysis', value: 'Steady-state & Transient Heat Transfer' },
      { label: 'Fluid Dynamics', value: 'CFD — Fluent & CFX' },
      { label: 'Deliverable', value: 'Full simulation report with plots' }
    ],
    tags: ['FEA', 'CFD', 'Thermal', 'Modal']
  },
  {
    name: 'SolidWorks',
    model: '3D CAD Design & Engineering Drawings',
    icon: 'shapes-outline' as const,
    details: [
      { label: 'Part Modelling', value: '3D solid and surface modelling' },
      { label: 'Assembly Design', value: 'Multi-part assemblies with constraints' },
      { label: 'Drawings', value: 'GD&T, 2D engineering drawings, BOM' },
      { label: 'Deliverable', value: 'STEP / IGES / DXF / PDF files' }
    ],
    tags: ['3D Modelling', 'GD&T', 'Assembly', 'Rendering']
  }
];

const charges = [
  { service: 'Tensile / Compression / Flexural', beu: '₹200/spl', other: '₹300', ind: '₹500', rem: 'ASTM standard' },
  { service: 'Hardness Test (Vickers / Brinell)', beu: '₹100/spl', other: '₹200', ind: '₹500', rem: '5 indents/spl' },
  { service: 'CNC Lathe — Part / Sample Prep', beu: '₹100/hr', other: '₹200', ind: '₹500', rem: '1st hr free(int)' },
  { service: 'Stir Casting — MMC Fabrication', beu: '₹1000/bch', other: '₹1500', ind: '₹3000', rem: 'Material extra' },
  { service: 'Hydraulic Press — Forming', beu: '₹200/ses', other: '₹500', ind: '₹1000', rem: 'Up to 2 hrs' },
  { service: 'FDM 3D Printing', beu: '₹50/hr', other: '₹150', ind: '₹200', rem: 'Filament extra' },
  { service: 'SLA Resin Printing', beu: '₹100/hr', other: '₹200', ind: '₹300', rem: 'Resin extra' },
  { service: 'ANSYS FEA Simulation', beu: '₹200/ana', other: '₹500', ind: '₹2000', rem: 'Report included' },
  { service: 'SolidWorks CAD Design', beu: '₹200/des', other: '₹500', ind: '₹1000', rem: 'Files included' },
];

const workflow = [
  { title: 'Submit Request', desc: 'Email or visit the department with your requirement and sample details.' },
  { title: 'Get Quotation', desc: 'Official quotation issued within 2 working days.' },
  { title: 'Fee Deposit', desc: 'Pay at college accounts or online. Submit receipt to lab in-charge.' },
  { title: 'Testing / Work', desc: 'Carried out by trained staff under faculty supervision.' },
  { title: 'Report & Delivery', desc: 'Certified report / fabricated sample / design files delivered.' },
];

export default function TestingFabricationScreen() {
  const { id, from } = useLocalSearchParams<{ id: string, from: string }>();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const router = useRouter();

  const paddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (insets.top || 44);

  const handleBack = () => {
    if (from === 'hub') {
      router.replace(`/department/${id}`);
    } else {
      router.back();
    }
  };

  const renderEquipmentCard = (item: any, idx: number) => (
    <View key={idx} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
          <Ionicons name={item.icon} size={22} color="#EF4444" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.cardModel, { color: theme.textSecondary }]}>{item.model}</Text>
        </View>
      </View>
      
      <View style={styles.detailsContainer}>
        {item.details.map((det: any, dIdx: number) => (
          <View key={dIdx} style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{det.label}:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{det.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tagsContainer}>
        {item.tags.map((tag: string, tIdx: number) => (
          <View key={tIdx} style={[styles.tag, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2' }]}>
            <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '600' }}>{tag}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Testing & Fabrication</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.pageDesc, { color: theme.textSecondary }]}>
          All equipment is operated by trained technical staff under faculty supervision to ensure accurate and reliable results.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 10 }]}>OUR EQUIPMENT</Text>
        {equipments.map(renderEquipmentCard)}

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>SIMULATION & DESIGN</Text>
        <Text style={[styles.pageDesc, { color: theme.textSecondary, marginBottom: 16 }]}>
          Licensed software suite for professional-grade simulation, analysis, and design.
        </Text>
        {softwares.map(renderEquipmentCard)}

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>USER CHARGES</Text>
        <Text style={[styles.pageDesc, { color: theme.textSecondary, marginBottom: 16 }]}>
          Nominal charges cover maintenance and operational costs. MCE students are exempt from most charges.
        </Text>

        <View style={[styles.tableContainer, { borderColor: theme.cardBorder }]}>
          <View style={[styles.tableHeader, { backgroundColor: theme.isDark ? '#1F2937' : '#F3F4F6', borderBottomColor: theme.cardBorder }]}>
            <Text style={[styles.tableHeaderCell, { color: theme.text, flex: 2.5 }]}>Service / Test</Text>
            <Text style={[styles.tableHeaderCell, { color: theme.text, flex: 1.2, textAlign: 'center' }]}>BEU Affil.</Text>
            <Text style={[styles.tableHeaderCell, { color: theme.text, flex: 1, textAlign: 'center' }]}>Indst.</Text>
          </View>
          {charges.map((ch, idx) => (
            <View key={idx} style={[styles.tableRow, { borderBottomColor: theme.cardBorder }]}>
              <View style={{ flex: 2.5, paddingRight: 8 }}>
                <Text style={[styles.tableCell, { color: theme.text, fontWeight: '600' }]}>{ch.service}</Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>{ch.rem}</Text>
              </View>
              <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 1.2, textAlign: 'center' }]}>{ch.beu}</Text>
              <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 1, textAlign: 'center' }]}>{ch.ind}</Text>
            </View>
          ))}
          <View style={{ padding: 12, backgroundColor: theme.isDark ? 'rgba(234, 179, 8, 0.1)' : '#FEFCE8' }}>
            <Text style={{ fontSize: 11, color: theme.textSecondary, fontStyle: 'italic' }}>
              * GST applicable on industry charges. Subject to revision.{'\n'}
              * Note for Startups: Registered Startup Bihar / DPIIT startups receive a 30% concession on industry rates.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>SERVICE WORKFLOW</Text>
        <View style={[styles.workflowContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          {workflow.map((step, index) => (
            <View key={index} style={styles.workflowStep}>
              <View style={[styles.stepNumberBox, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>{step.title}</Text>
                <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>REACH US</Text>
        <View style={[styles.contactCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Text style={[styles.contactName, { color: theme.text }]}>Dr. Ravi Kumar</Text>
          <Text style={[styles.contactRole, { color: theme.textSecondary }]}>Head of Department — Mechanical Engg.</Text>
          
          <View style={styles.contactRow}>
            <Ionicons name="mail" size={16} color="#EF4444" style={{ width: 20 }} />
            <Text style={[styles.contactDetail, { color: theme.text }]} selectable>hodmech.2k25@gmail.com</Text>
          </View>
          
          <View style={styles.contactRow}>
            <Ionicons name="location" size={16} color="#EF4444" style={{ width: 20 }} />
            <Text style={[styles.contactDetail, { color: theme.text }]}>Motihari, East Champaran, Bihar — 845401</Text>
          </View>

          <View style={[styles.contactRow, { marginBottom: 0 }]}>
            <Ionicons name="time" size={16} color="#EF4444" style={{ width: 20 }} />
            <Text style={[styles.contactDetail, { color: theme.text }]}>Mon – Sat | 10:00 AM – 4:00 PM</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.infoCard, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
          onPress={() => Linking.openURL('https://www.mcemotihari.ac.in/department/mechanical-engineering/attendance/')}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle" size={24} color="#EF4444" style={{ marginRight: 12 }} />
          <Text style={[styles.infoText, { color: theme.text }]}>View Full Details on Official Website</Text>
          <Ionicons name="open-outline" size={16} color="#EF4444" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  pageDesc: { fontSize: 14, lineHeight: 22, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16, letterSpacing: 0.5 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  cardModel: { fontSize: 13, fontStyle: 'italic' },
  detailsContainer: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', marginBottom: 6 },
  detailLabel: { fontSize: 13, width: 100, fontWeight: '500' },
  detailValue: { fontSize: 13, flex: 1, fontWeight: '600' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tableContainer: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1 },
  tableHeaderCell: { fontSize: 12, fontWeight: '700' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, alignItems: 'center' },
  tableCell: { fontSize: 13 },
  workflowContainer: { padding: 16, borderRadius: 16, borderWidth: 1 },
  workflowStep: { flexDirection: 'row', marginBottom: 16 },
  stepNumberBox: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepNumberText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  stepDesc: { fontSize: 13, lineHeight: 20 },
  contactCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  contactName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  contactRole: { fontSize: 14, marginBottom: 16 },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  contactDetail: { fontSize: 14, fontWeight: '500' },
  infoCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  infoText: { flex: 1, fontSize: 14, fontWeight: '600' },
});
