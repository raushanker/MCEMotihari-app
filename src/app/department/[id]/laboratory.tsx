import { DEPARTMENTS } from '@/data/departments';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Linking, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const civilLabs = [
  {
    name: 'Surveying & Geomatics Lab',
    coordinator: 'Sushant Kumar',
    description: 'Surveying is a very important activity in civil engineering. It is performed before starting any construction to collect data of actual site condition of field and during the construction process to achieve a desired level of accuracy on site. Surveying lab of our Department has a large number of conventional instruments and latest surveying instrument also (like Chain, Prismatic Compass, Vernier Theodolite, Cross staff, Digital theodolite, Auto level & Total station).'
  },
  {
    name: 'Transportation Lab',
    coordinator: 'Anil Kumar Chhotu',
    description: 'Equipment for testing suitability of different pavement material (Aggregate & Bitumen) for highway are available in this lab. Major equipment are AIV Test, Los Angeles Abrasion Test, Bitumen Mixer, Penetration test, Softening Point test, Ductility test, Marshall stability test, MERLIN, Benkhelman Beam etc. Wooden Models are also available for illustration purpose.'
  },
  {
    name: 'Geotech Lab',
    coordinator: 'Ashish Pathak',
    description: 'Geotechnical Lab of the department has various apparatus to test physical properties as well as engineering properties of soil. (Like plastic limit, liquid limit, Specific gravity, direct shear test, unconfined compressive test, Triaxial test, Permeability test, Vane shear Test etc.)'
  },
  {
    name: 'Geology Lab',
    coordinator: 'Ghausul Azam Ansari',
    description: 'Stability of any civil engineering structure depends upon its foundation and underneath rock and soil foundation. To understand the properties of rocks and its formation, in engineering geology lab of the department has a number of rock samples and different type of models showing the different geological formation.'
  },
  {
    name: 'Concrete Lab',
    coordinator: 'Anil Kumar',
    description: 'Concrete is extensively used in civil engineering as a building material, due to its strength and easily moulding properties. In this lab of the department, different equipment for concrete casting, compacting, workability test and strength test are available. For ex- Concrete mixer, Concrete mould (Cube, beam, cylinder), Slump Apparatus, Compaction Factor test apparatus Compression Testing Machine, Flexural Testing Machine etc.'
  },
  {
    name: 'Material Testing Lab',
    coordinator: 'Anil Kumar',
    description: 'Quality control on civil engineering site is an essential activity for achieving goal of a desired strengthen, safe, durable structure. It is achieved by performing different material test on building material. Material testing lab consists of various instruments for testing building materials like compression testing machine, Vicat apparatus, Flexural strength testing machine etc.'
  },
  {
    name: 'Environmental Lab',
    coordinator: 'Niraj Kumar',
    description: 'Environmental engineering lab is equipped with a number of various water testing kits, and apparatus like -pH meter, conductivity meter, BOD Incubator, Turbidity meter etc. to analyze quality of drinking water and waste water also.'
  },
  {
    name: 'Hydrology & Hydraulics Lab',
    coordinator: 'Md. Arman Ali',
    description: 'Equipment are under procurement process.'
  }
];

const cseLabs = [
  { name: 'Programming for Problem Solving', description: 'Focuses on building a strong foundation in logic development and problem-solving using C programming language. Students learn about control structures, functions, arrays, and pointers.' },
  { name: 'Data Structure & Algorithm', description: 'Hands-on experience with fundamental data structures like stacks, queues, linked lists, trees, and graphs. Covers sorting, searching, and algorithm complexity analysis.' },
  { name: 'Object Oriented Programming Using C++', description: 'Practical implementation of OOP concepts such as classes, objects, inheritance, polymorphism, encapsulation, and abstraction using C++.' },
  { name: 'Computer Organization & Architecture', description: 'Experiments related to logic gates, multiplexers, decoders, ALU design, and basic microprocessor instructions to understand the internal working of a computer.' },
  { name: 'Operating System', description: 'Exploration of OS concepts including process management, scheduling algorithms, memory management, and file systems using Linux/Unix environments.' },
  { name: 'Design & Analysis of Algorithm', description: 'Advanced algorithm design techniques like Divide and Conquer, Dynamic Programming, and Greedy methods applied to real-world computational problems.' },
  { name: 'Data Base Management System', description: 'Practical training in designing schemas, writing complex SQL queries, understanding normal forms, and implementing database transactions using RDBMS tools.' },
  { name: 'Compiler Design', description: 'Implementation of lexical analyzers, parsers, and code generators. Students use tools like LEX and YACC to understand the compilation process.' },
  { name: 'Computer Network', description: 'Simulation and analysis of network protocols, routing algorithms, socket programming, and packet analysis using tools like Wireshark and Cisco Packet Tracer.' },
  { name: 'Python Programming', description: 'Application development using Python, covering core syntax, data structures, file handling, and libraries for data analysis and visualization.' },
  { name: 'CISCO Networking Lab', description: 'Dedicated CISCO Networking Academy lab providing hands-on practice with routers, switches, and network configuration for CCNA certification training.' }
];

const eeeLabs = [
  { 
    name: 'Basic Electrical Engg. & Network Analysis', 
    coordinator: 'Mr. Saket Kumar Singh',
    experiments: ['Verification of Kirchhoff’s Laws (KVL, KCL)', 'Verification of Network Theorems (Superposition, Thevenin, Norton)', 'Resonance condition of RLC series/parallel circuit', 'Power measurement using 2-wattmeter method', 'Operation of DC/AC motors & Energy Meter calibration'],
    equipments: ['Analog Electronics Development Platform', 'Theorems Trainer', 'Kirchhoff’s Laws Trainer', 'Single Phase Energy Meter Training Platform', '50 MHz Digital Storage Oscilloscope']
  },
  { 
    name: 'Linear Control Theory Lab', 
    coordinator: 'Ms. Rashmi Priya',
    experiments: ['MATLAB/Simulink simulations for control systems', 'Step & impulse response with unity feedback', 'Root locus, Bode plot, Nyquist plot analysis', 'Torque-speed characteristics of stepper motor', 'Effect of PID Controller on system performance']
  },
  { 
    name: 'Power Electronics Lab', 
    coordinator: 'Dr. Dilip Kumar',
    experiments: ['V-I characteristics of SCR', 'Firing methods of SCR using R & RC Triggering', 'Performance of controlled Rectifiers (Single/Three phase)', 'DC-to-DC converter performance', 'Speed control of universal motor using SCR'],
    equipments: ['Power Electronics Lab Training Platform', 'Characteristics of MOSFET, FET & UJT Trainer', 'High Voltage Power Electronics Workbench', 'Step Down Chopper Module']
  },
  { 
    name: 'Microprocessor & Digital Electronics', 
    coordinator: 'Mr. Deobarat Kumar Chandan',
    experiments: ['Logic gates, Multiplexers, and Decoders design', 'Adder/Subtractor and Flip-Flops verification', '8085/8086 Assembly Language Programming (Addition, Subtraction, Multiplication)', 'Hexadecimal to Binary conversion'],
    equipments: ['Digital logic trainer', '4-Bit Synchronous & Asynchronous Counter', '8085 Microprocessor Kit', '8086 Microprocessor Kit']
  },
  { 
    name: 'Switchgear & Protection / Power System', 
    coordinator: 'Dr. Kanhaiya Kumar',
    experiments: ['DC Distribution system in radial and ring main', 'ABCD parameters & Ferranti effect of transmission line', 'Performance of over-voltage relay & directional relay', 'AC load flow (Gauss-Seidel, Newton-Raphson)', 'Simulation of reactive power by STATCOM']
  },
  { 
    name: 'Electrical Machine Lab', 
    coordinator: 'Mr. Chandra Shekhar Singh Chandal',
    experiments: ['Load characteristics of DC shunt/compound generator', 'Hopkinson’s test & Ward Leonard speed control', 'OC/SC and Sumpner’s tests on transformers', 'Slip test & synchronization of 3-phase alternator', 'V-curve of synchronous motor'],
    equipments: ['D.C. Shunt Motor / Generator setups', '3-Phase Transformer (Scott Connection)', 'A.C. to D.C. Power Supply Rectifier', 'Induction Motor testing rigs']
  },
  { 
    name: 'Analog Electronics & Communication', 
    coordinator: 'Dr. Surya Deo Chaudhary',
    experiments: ['Frequency response of RC coupled amplifiers', 'Wein Bridge & Colpitts Oscillators', 'Amplitude/Frequency Modulation & Demodulation', 'Pulse Amplitude/Position Modulation (PAM, PPM)', 'Sampling & reconstruction'],
    equipments: ['OP Amp Application trainer', 'AM/FM Transmitter & Receiver Training Platform', 'Spectrum Analyzer (9KHz-3.2 GHz)', '25 MHz Arbitrary Function generator']
  },
  { 
    name: 'Basic Electronics Lab', 
    coordinator: 'Mr. Ranjeet Kumar',
    experiments: ['Study of basic electronic components and multimeters', 'Characteristics of PN Junction Diode and Zener Diode', 'BJT characteristics in CE, CB, CC configurations', 'Half wave and Full wave rectifiers'],
    equipments: ['Component Tester', 'Dual Trace Oscilloscopes', 'Breadboard Trainer Kits']
  },
  { 
    name: 'Instrumentation & Measurement', 
    coordinator: 'Dr. Md. Tabrez',
    experiments: ['Calibration and Testing of single-phase energy Meter', 'Crompton D.C. Potentiometer calibration', 'Measurement of resistance (Kelvin’s double Bridge)', 'Measurement of displacement using LVDT', 'Resistance strain gauge calibration']
  }
];

const mechLabs = [
  {
    name: 'Workshop Manufacturing Practice',
    profIncharge: 'Dr. Birendra Kumar',
    labIncharge: 'Mr. Dinesh Kumar Bharti',
    equipments: ['Lathe Machines', 'Milling Machines', 'Drilling Machines']
  },
  {
    name: 'Engineering Mechanics',
    profIncharge: 'Asst. Prof. Azeem Alam',
    labIncharge: 'Mr. Abhishek Surya',
    equipments: ['Universal force table', 'Parallel forces Apparatus', 'Pendulum Systems']
  },
  {
    name: 'Fluid Mechanics',
    profIncharge: 'Asst. Prof. Ashutosh Kumar',
    labIncharge: 'Mr. Seraj Alam',
    equipments: ['Venturi Meter', 'Reynolds Apparatus', 'Bernoulli’s Theorem Apparatus']
  },
  {
    name: 'Strength of Materials',
    profIncharge: 'Dr. Birendra Kumar',
    labIncharge: 'Mr. Abhishek Surya',
    equipments: ['Fatigue testing machines', 'Universal Testing Machine', 'Impact testing machine (Izod and Charpy)']
  },
  {
    name: 'Heat Transfer',
    profIncharge: 'Asst. Prof. Ashfaque Ahmad',
    labIncharge: 'Mr. Seraj Alam',
    equipments: ['Thermal conductivity of metal rod', 'Pin Fin Apparatus', 'Overall heat transfer coefficient apparatus']
  },
  {
    name: 'Fluid Machinery',
    profIncharge: 'Asst. Prof. Ashutosh Kumar',
    labIncharge: 'Mr. Seraj Alam',
    equipments: ['Pelton Turbine Test Rig', 'Reciprocating Pump Test Rig', 'Francis Turbine Test Rig']
  },
  {
    name: 'Manufacturing Process',
    profIncharge: 'Dr. Ravi Kumar',
    labIncharge: 'Mr. Abhishek Surya',
    equipments: ['Electric Arc Welding', 'Stir Casting Machine', 'Hydraulic Press Machine']
  },
  {
    name: 'CAD-CAM / Auto-CAD Lab',
    profIncharge: 'Asst. Prof. Amit Kumar',
    labIncharge: 'Mr. Abhishek Surya',
    equipments: ['Ansys', 'SolidWorks', 'CNC Simulation']
  },
  {
    name: 'Refrigeration & Air-Conditioning',
    profIncharge: 'Asst. Prof. Shailesh Ranjan Kumar',
    labIncharge: 'Mr. Seraj Alam',
    equipments: ['Vapour Compression Refrigeration Test Rig', 'Vapour Absorption Refrigeration System', 'Ice Plant Trainer/Test Rig']
  },
  {
    name: 'Elements of Mechanical Engineering',
    profIncharge: 'Asst. Prof. Shailesh Ranjan Kumar',
    labIncharge: 'Mr. Abhishek Surya',
    equipments: ['Steam Power Plant Models', 'Gas Turbine Model', 'IC Engine Model']
  },
  {
    name: 'Internal Combustion Engine',
    profIncharge: 'Assoc. Prof. Satish Kumar Jha',
    labIncharge: 'Mr. Abhishek Surya',
    equipments: ['4-Stroke Diesel Engine', 'Morse Test', 'Bomb Calorimeter']
  },
  {
    name: 'Automation in Manufacturing',
    profIncharge: 'Asst. Prof. Azeem Alam',
    labIncharge: 'Mr. Abhishek Surya',
    equipments: ['CNC Lathe Machines', 'CNC Milling Machines', 'Rapid Prototyping Machines (3D Printers)']
  },
  {
    name: 'Design of Machine Elements',
    profIncharge: 'Asst. Prof. Amit Kumar',
    labIncharge: 'Mr. Seraj Alam',
    equipments: ['Journal Bearing Test Rig', 'knuckle Joint', 'Shaft Design']
  },
  {
    name: 'Manufacturing Technology',
    profIncharge: 'Dr. Ravi Kumar',
    labIncharge: 'Mr. Abhishek Surya',
    equipments: ['Auto Collimator', 'Electro-Pneumatic Comparators', 'Tally Surf/Mechanical Comparator']
  },
  {
    name: 'Dynamics of Machinery',
    profIncharge: 'Asst. Prof. Ashfaque Ahmad',
    labIncharge: 'Mr. Seraj Alam',
    equipments: ['Balancing Apparatus', 'Whirling of a shaft', 'Gyroscope']
  },
  {
    name: 'Project & Research Lab',
    profIncharge: 'Prof (Dr.) Navneet Kumar',
    equipments: ['3D Printer', 'Universal Testing Machine', 'Ansys and SolidWorks']
  },
  {
    name: 'Virtual Lab',
    profIncharge: 'Dr. Ravi Kumar'
  }
];

export default function LaboratoryScreen() {
  const { id, from } = useLocalSearchParams();
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const paddingTop = Math.max(insets.top, 16);

  const dept = DEPARTMENTS.find(d => d.id === id);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity style={[styles.headerBackBtn, { backgroundColor: theme.isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }} activeOpacity={0.6}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Laboratories</Text>
          {dept && <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{dept.name}</Text>}
        </View>
      </View>

      {(id === 'civil' || id === 'civil_ca') ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Laboratory Facility</Text>
          <Text style={[styles.pageDesc, { color: theme.textSecondary }]}>
            Civil Engineering Department has following well-equipped laboratory to fulfill the requirement of Undergraduate program and support student B.Tech student Projects.
          </Text>

          {civilLabs.map((lab, index) => (
            <View key={index} style={[styles.labCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={styles.labHeader}>
                <View style={[styles.labIconBox, { backgroundColor: theme.isDark ? 'rgba(236, 72, 153, 0.15)' : '#FDF2F8' }]}>
                  <Ionicons name="flask" size={20} color="#EC4899" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.labName, { color: theme.text }]}>{lab.name}</Text>
                  <Text style={[styles.labCoordinator, { color: theme.textSecondary }]}>Coordinator: <Text style={{ fontWeight: '600', color: theme.text }}>{lab.coordinator}</Text></Text>
                </View>
              </View>
              <Text style={[styles.labDescription, { color: theme.textSecondary }]}>{lab.description}</Text>
            </View>
          ))}

          <TouchableOpacity 
            style={[styles.infoCard, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF', borderColor: 'rgba(59, 130, 246, 0.3)' }]}
            onPress={() => Linking.openURL('https://www.mcemotihari.ac.in/department/civil-engineering/labs-infrastructure/')}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle" size={24} color="#3B82F6" style={{ marginRight: 12 }} />
            <Text style={[styles.infoText, { color: theme.text }]}>View More Information on Official Website</Text>
            <Ionicons name="open-outline" size={16} color="#3B82F6" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </ScrollView>
      ) : (id === 'cse' || id === 'cse_ai') ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Laboratory Facility</Text>
          <Text style={[styles.pageDesc, { color: theme.textSecondary }]}>
            List of well-equipped laboratories available in the Computer Science & Engineering department to fulfill the requirements of the Undergraduate program.
          </Text>

          {cseLabs.map((lab, index) => (
            <View key={index} style={[styles.labCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={[styles.labHeader, { marginBottom: 8 }]}>
                <View style={[styles.labIconBox, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF', marginRight: 16 }]}>
                  <Ionicons name="hardware-chip" size={20} color="#3B82F6" />
                </View>
                <Text style={[styles.labName, { color: theme.text, flex: 1 }]}>{lab.name}</Text>
              </View>
              {lab.description && (
                <Text style={[styles.labDescription, { color: theme.textSecondary, marginLeft: 56 }]}>{lab.description}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      ) : id === 'eee' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Laboratory Facility</Text>
          <Text style={[styles.pageDesc, { color: theme.textSecondary }]}>
            Electrical and Electronics Engineering Department has the following well-equipped laboratories to fulfill the requirements of the Undergraduate program.
          </Text>

          {eeeLabs.map((lab, index) => (
            <View key={index} style={[styles.labCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={[styles.labHeader, { marginBottom: (lab.experiments || lab.equipments) ? 12 : 0 }]}>
                <View style={[styles.labIconBox, { backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}>
                  <Ionicons name="flash" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={[styles.labName, { color: theme.text, marginBottom: lab.coordinator !== 'N/A' ? 4 : 0 }]}>{lab.name}</Text>
                  {lab.coordinator !== 'N/A' && (
                    <Text style={[styles.labCoordinator, { color: theme.textSecondary }]}>Coordinator: <Text style={{ fontWeight: '600', color: theme.text }}>{lab.coordinator}</Text></Text>
                  )}
                </View>
              </View>

              {lab.experiments && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 6 }}>Key Experiments:</Text>
                  {lab.experiments.map((exp, i) => (
                    <View key={`exp-${i}`} style={{ flexDirection: 'row', marginBottom: 4, paddingRight: 8 }}>
                      <Text style={{ color: theme.textSecondary, marginRight: 6 }}>•</Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18, flex: 1 }}>{exp}</Text>
                    </View>
                  ))}
                </View>
              )}

              {lab.equipments && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 6 }}>Major Equipments:</Text>
                  {lab.equipments.map((eq, i) => (
                    <View key={`eq-${i}`} style={{ flexDirection: 'row', marginBottom: 4, paddingRight: 8 }}>
                      <Text style={{ color: '#F59E0B', marginRight: 6 }}>•</Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18, flex: 1 }}>{eq}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      ) : id === 'mechanical' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Laboratory Facility</Text>
          <Text style={[styles.pageDesc, { color: theme.textSecondary }]}>
            Mechanical Engineering Department offers state-of-the-art infrastructure for hands-on learning across various specialized laboratories.
          </Text>

          {mechLabs.map((lab, index) => (
            <View key={index} style={[styles.labCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={[styles.labHeader, { marginBottom: lab.equipments ? 12 : 0 }]}>
                <View style={[styles.labIconBox, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
                  <Ionicons name="cog" size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={[styles.labName, { color: theme.text, marginBottom: 4 }]}>{lab.name}</Text>
                  {lab.profIncharge && (
                    <Text style={[styles.labCoordinator, { color: theme.textSecondary }]}>Prof In-charge: <Text style={{ fontWeight: '600', color: theme.text }}>{lab.profIncharge}</Text></Text>
                  )}
                  {lab.labIncharge && (
                    <Text style={[styles.labCoordinator, { color: theme.textSecondary, marginTop: 2 }]}>Lab In-charge: <Text style={{ fontWeight: '600', color: theme.text }}>{lab.labIncharge}</Text></Text>
                  )}
                </View>
              </View>

              {lab.equipments && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 6 }}>Major Infrastructure / Equipments:</Text>
                  {lab.equipments.map((eq, i) => (
                    <View key={`eq-${i}`} style={{ flexDirection: 'row', marginBottom: 4, paddingRight: 8 }}>
                      <Text style={{ color: '#EF4444', marginRight: 6 }}>•</Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 18, flex: 1 }}>{eq}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity 
            style={[styles.infoCard, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF', borderColor: 'rgba(59, 130, 246, 0.3)' }]}
            onPress={() => Linking.openURL('https://www.mcemotihari.ac.in/department/mechanical-engineering/labs-infrastructure/')}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle" size={24} color="#3B82F6" style={{ marginRight: 12 }} />
            <Text style={[styles.infoText, { color: theme.text }]}>View More Information on Official Website</Text>
            <Ionicons name="open-outline" size={16} color="#3B82F6" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.placeholderContent}>
          <View style={[styles.iconBox, { backgroundColor: theme.isDark ? 'rgba(236, 72, 153, 0.15)' : '#FDF2F8' }]}>
            <Ionicons name="flask-outline" size={64} color="#EC4899" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Updates Soon</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            We are currently working on this section. Check back later for detailed laboratory information and resources.
          </Text>
        </View>
      )}
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
  headerSubtitle: {
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  pageDesc: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  labCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  labHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  labIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  labName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  labCoordinator: {
    fontSize: 13,
  },
  labDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
});
