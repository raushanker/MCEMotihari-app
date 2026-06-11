import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar, ScrollView, Linking } from 'react-native';
import { PdfViewerModal } from '@/components/modals/PdfViewerModal';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DEPARTMENTS } from '@/data/departments';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

const eeeClubs = [
  {
    name: 'AVISKAR : The Robotics & Innovation Club',
    faculty: ['DR. MD. TABREZ', 'DEOBARAT KUMAR CHANDAN'],
    head: 'Suryadev Prasad (2k23)',
    deputy: 'Astha Prakash (2k23)',
    icon: 'hardware-chip'
  },
  {
    name: 'PRARABDH : The Civil Services Society',
    faculty: ['DR. SURYADEO CHAUDHARY', 'MR. CHANDRA SHEKHAR SINGH'],
    head: 'Ranjan Verma (2k23)',
    deputy: 'Aparajita (2k23)',
    icon: 'library'
  },
  {
    name: 'ACHIEVERS : The Gate Preparation Club',
    faculty: ['MD. EKRAMA ARSHAD', 'DR. DILIP KUMAR'],
    head: 'Nikhil Kumar (2k23)',
    deputy: 'Tanu Kumari (2k23)',
    icon: 'school'
  },
  {
    name: 'HEIGHERS : The Sports & Gaming Club',
    faculty: ['DR. KANHAIYA KUMAR', 'MR. SAKET KUMAR SINGH'],
    head: 'Vikash Kumar (2k23)',
    deputy: 'Rimi Kumari (2k23)',
    icon: 'football'
  },
  {
    name: 'VIDYUT : The Cultural Society',
    faculty: ['MS. RASHMI PRIYA', 'MR. RANJEET KUMAR'],
    head: 'Swati Bharti (2k22)',
    deputy: 'Abhishek Anand (2k23)',
    icon: 'color-palette'
  }
];

export default function SocietyScreen() {
  const { id, from } = useLocalSearchParams();
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const paddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : (insets.top || 44);

  const dept = DEPARTMENTS.find(d => d.id === id);

  const isCivil = id === 'civil' || id === 'civil_ca';
  const isCse = id === 'cse' || id === 'cse_ai';
  const [isPdfVisible, setIsPdfVisible] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity style={[styles.headerBackBtn, { backgroundColor: theme.isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]} onPress={() => {
          if (from === 'explore') {
            router.replace('/clubs');
          } else if (from === 'hub' && id) {
            router.replace(`/department/${id}`);
          } else if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }} activeOpacity={0.6}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Society & Clubs</Text>
          {dept && <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{dept.name}</Text>}
        </View>
      </View>

      {id === 'eee' ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {eeeClubs.map((club, idx) => (
            <View key={idx} style={[styles.clubCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={[styles.clubHeader, { borderBottomColor: theme.cardBorder }]}>
                <View style={[styles.iconBoxSmall, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                  <Ionicons name={club.icon as any} size={24} color="#3B82F6" />
                </View>
                <Text style={[styles.clubName, { color: theme.text, flex: 1 }]}>{club.name}</Text>
              </View>

              <View style={styles.clubBody}>
                <View style={styles.roleSection}>
                  <Text style={[styles.roleLabel, { color: theme.textSecondary }]}>Faculty Coordinator(s)</Text>
                  {club.faculty.map((fac, i) => (
                    <Text key={i} style={[styles.roleValue, { color: theme.text }]}>• {fac}</Text>
                  ))}
                </View>
                
                <View style={styles.roleSection}>
                  <Text style={[styles.roleLabel, { color: theme.textSecondary }]}>Student Coordinators</Text>
                  <View style={styles.studentRow}>
                    <Ionicons name="person" size={14} color="#10B981" style={{ marginRight: 6 }} />
                    <Text style={[styles.roleValue, { color: theme.text }]}><Text style={{ fontWeight: '600' }}>Head:</Text> {club.head}</Text>
                  </View>
                  <View style={styles.studentRow}>
                    <Ionicons name="people" size={14} color="#8B5CF6" style={{ marginRight: 6 }} />
                    <Text style={[styles.roleValue, { color: theme.text }]}><Text style={{ fontWeight: '600' }}>Deputy:</Text> {club.deputy}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}

          {/* Contact Info */}
          <View style={[styles.contactBox, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9', borderColor: theme.cardBorder }]}>
            <Text style={[styles.contactTitle, { color: theme.text }]}>Get in touch</Text>
            <Text style={[styles.contactText, { color: theme.textSecondary }]}>DEPARTMENT OF ELECTRICAL & ELECTRONICS ENGINEERING</Text>
            <Text style={[styles.contactText, { color: theme.textSecondary }]}>MOTIHARI COLLEGE OF ENGINEERING</Text>
            <Text style={[styles.contactText, { color: theme.textSecondary }]}>NH 28A, FURSHATPUR, BARIYARPUR, MOTIHARI, EAST CHAMPARAN, BIHAR - 845401</Text>
            <Text style={[styles.contactText, { color: '#3B82F6', fontWeight: 'bold', marginTop: 8 }]} onPress={() => Linking.openURL('mailto:eeehodmce@gmail.com')}>eeehodmce@gmail.com</Text>
          </View>

          {/* Disclaimer */}
          <View style={[styles.disclaimerBox, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
            <Ionicons name="information-circle" size={20} color="#EF4444" style={{ marginBottom: 8 }} />
            <Text style={[styles.disclaimerText, { color: theme.text }]}>
              <Text style={{ fontWeight: 'bold' }}>Disclaimer:</Text> This data has been collected from students, the internet, and the college's official sources. 
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://sites.google.com/view/eee-mcemotihari/executive-council/clubsociety-head-deputy-head')}>
              <Text style={[styles.disclaimerLink, { color: '#3B82F6' }]}>Source: EEE Official Website</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      ) : isCivil ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.clubCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={[styles.clubHeader, { borderBottomColor: theme.cardBorder, flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={[styles.iconBoxSmall, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                  <Ionicons name="business" size={24} color="#3B82F6" />
                </View>
                <Text style={[styles.clubName, { color: theme.text, flex: 1, fontSize: 18 }]}>CIVIC</Text>
              </View>
              <Text style={[styles.roleLabel, { color: theme.textSecondary, marginBottom: 8 }]}>Civil Infrastructure and Visionary Innovators Club</Text>
              <Text style={[{ color: theme.textSecondary, fontSize: 14, lineHeight: 22 }]}>
                Formed on 24th January 2024 with a primary objective to provide a platform to the students of Civil Engineering and its allied branch Civil Engineering with Computer Application to enhance their knowledge, share ideas and engage in co-curricular and extra-curricular activities related to Civil Engineering. CIVIC club provide a platform to the students of the department to organize technical events, expert lectures, quizzes and other related activities in the department.
              </Text>
            </View>

            <View style={styles.clubBody}>
              <View style={styles.roleSection}>
                <Text style={[styles.roleLabel, { color: theme.textSecondary }]}>Professor In-charge</Text>
                <TouchableOpacity 
                  style={styles.studentRow} 
                  onPress={() => router.push('/faculty?facultyId=civil-niraj&from=hub&deptId=civil')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person" size={14} color="#3B82F6" style={{ marginRight: 6 }} />
                  <Text style={[styles.roleValue, { color: '#3B82F6', fontWeight: '700', textDecorationLine: 'underline' }]}>Dr. Niraj Kumar</Text>
                </TouchableOpacity>
                <Text style={[{ color: theme.textSecondary, fontSize: 13, marginLeft: 20 }]}>Assistant Professor, Department of Civil Engineering</Text>
              </View>
              
              <View style={styles.roleSection}>
                <Text style={[styles.roleLabel, { color: theme.textSecondary, marginBottom: 10 }]}>Student Coordinators (2025-2026)</Text>
                {[
                  'BINISHT KUMAR', 'JAY PRAKASH', 'PREM KUMAR', 
                  'SMRITI RANI', 'SIDDHARTHA GAURAV', 'NITIN KUMAR', 
                  'DEB RAJ SINGH', 'SHRIMANT BHARDWAJ', 'ADITYA RAJ'
                ].map((student, i) => (
                  <Text key={i} style={[styles.roleValue, { color: theme.text, marginLeft: 4, marginBottom: 6 }]}>• {student}</Text>
                ))}
              </View>
            </View>
          </View>

          {/* Events */}
          <View style={[styles.clubCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={[styles.clubHeader, { borderBottomColor: theme.cardBorder }]}>
              <Ionicons name="calendar" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={[styles.clubName, { color: theme.text }]}>Major Events</Text>
            </View>
            <View style={styles.clubBody}>
              <Text style={[styles.roleLabel, { color: '#F59E0B', marginBottom: 10 }]}>Recent Events</Text>
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.roleValue, { color: theme.text, fontWeight: '700' }]}>Two-week Earthquake Awareness Program (15.01.2026 – 28.01.2026)</Text>
                <Text style={[{ color: theme.textSecondary, fontSize: 13, marginTop: 4 }]}>Social awareness through posters/banners, seminar, mock drills, and marches.</Text>
              </View>

              <Text style={[styles.roleLabel, { color: theme.textSecondary, marginBottom: 10 }]}>Past Events</Text>
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.roleValue, { color: theme.text, fontWeight: '600' }]}>National Science Day 2024 (28.02.2024)</Text>
                <Text style={[{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }]}>Model Exhibition, Poster Presentation, Speech, Quiz, Paintings</Text>
              </View>
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.roleValue, { color: theme.text, fontWeight: '600' }]}>Total Station Training Camp (06.08.2024-17.08.2024)</Text>
                <Text style={[{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }]}>Preparing site plan using total station, practical application, data processing</Text>
              </View>
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.roleValue, { color: theme.text, fontWeight: '600' }]}>Earthquake Awareness Program (15.01.2025-21.01.2025)</Text>
                <Text style={[{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }]}>Social awareness through posters/banners, seminar, mock drills, and marches</Text>
              </View>
            </View>
          </View>

          {/* Conference */}
          <View style={[styles.clubCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={[styles.clubHeader, { borderBottomColor: theme.cardBorder, flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="megaphone" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={[styles.clubName, { color: theme.text, flex: 1 }]}>NCACE-2026</Text>
              </View>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', lineHeight: 22, marginBottom: 4 }}>
                1st National Conference on Advances in Civil Engineering
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: '600' }}>
                13–14 March 2026
              </Text>
            </View>

            <View style={styles.clubBody}>
              <View style={styles.roleSection}>
                <Text style={[styles.roleLabel, { color: theme.textSecondary }]}>Organized By</Text>
                <Text style={[styles.roleValue, { color: theme.text, fontWeight: '600' }]}>Department of Civil Engineering</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 20 }}>
                  Motihari College of Engineering, Motihari{'\n'}East Champaran-845401, Bihar (India)
                </Text>
              </View>

              <View style={styles.roleSection}>
                <Text style={[styles.roleLabel, { color: theme.textSecondary }]}>Chief Patron</Text>
                <Text style={[styles.roleValue, { color: theme.text, fontWeight: '600' }]}>Dr. Pratima, IAS</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 20 }}>
                  Secretary, Department of Science, Technology and Technical Education (DSTTE), Patna, Govt. of Bihar
                </Text>
              </View>

              <View style={styles.roleSection}>
                <Text style={[styles.roleLabel, { color: theme.textSecondary }]}>Patron</Text>
                <Text style={[styles.roleValue, { color: theme.text, fontWeight: '600' }]}>Prof. (Dr.) Navneet Kumar</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 20 }}>
                  Principal, Motihari College of Engineering, Motihari
                </Text>
              </View>

              <View style={styles.roleSection}>
                <Text style={[styles.roleLabel, { color: theme.textSecondary, marginBottom: 10 }]}>Organising Chairmen</Text>
                <Text style={[styles.roleValue, { color: theme.text, fontWeight: '600' }]}>• Dr. Niraj Kumar (Assistant Professor)</Text>
                <Text style={[styles.roleValue, { color: theme.text, fontWeight: '600', marginTop: 4 }]}>• Dr. Anil Kumar Chhotu (Assistant Professor & Head)</Text>
              </View>

              <View style={styles.roleSection}>
                <Text style={[styles.roleLabel, { color: theme.textSecondary, marginBottom: 10 }]}>Organising Secretaries</Text>
                {[
                  'Dr. Anil Kumar, AP, CED', 'Dr. Md. Arman Ali, AP, CED', 'Ghausul Azam Ansari, AP, CED',
                  'Ashish Kumar Pathak, AP, CED', 'Sushant Kumar, AP, CED', 'Amit Kumar, AP, MED'
                ].map((sec, i) => (
                  <Text key={i} style={[styles.roleValue, { color: theme.text, marginLeft: 4, marginBottom: 6 }]}>• {sec}</Text>
                ))}
              </View>

              <View style={{ marginTop: 8, gap: 12 }}>
                <TouchableOpacity 
                  style={[styles.socialCard, { backgroundColor: '#3B82F6', borderColor: 'transparent', marginBottom: 0, paddingVertical: 12 }]}
                  activeOpacity={0.8}
                  onPress={() => setIsPdfVisible(true)}
                >
                  <Ionicons name="document-text" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700', textAlign: 'center', flex: 1 }}>
                    PROCEEDINGS OF 1ST NATIONAL CONFERENCE (NCACE-2026)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.socialCard, { backgroundColor: 'transparent', borderColor: '#3B82F6', borderWidth: 1, marginBottom: 0, paddingVertical: 12 }]}
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL('https://ncace2026.wixsite.com/ncace')}
                >
                  <Ionicons name="globe-outline" size={20} color="#3B82F6" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#3B82F6', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
                    Visit Conference Website
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Social Media */}
          <TouchableOpacity 
            style={[styles.socialCard, { backgroundColor: '#0A66C2', borderColor: 'transparent' }]}
            activeOpacity={0.8}
            onPress={() => Linking.openURL('https://www.linkedin.com/company/civicmce/')}
          >
            <Ionicons name="logo-linkedin" size={24} color="#FFF" style={{ marginRight: 12 }} />
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Follow CIVIC on LinkedIn</Text>
          </TouchableOpacity>

          {/* Disclaimer */}
          <View style={[styles.disclaimerBox, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
            <Ionicons name="information-circle" size={20} color="#EF4444" style={{ marginBottom: 8 }} />
            <Text style={[styles.disclaimerText, { color: theme.text }]}>
              <Text style={{ fontWeight: 'bold' }}>Disclaimer:</Text> This data has been collected from students, the internet, and the college's official sources. 
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.mcemotihari.ac.in/department/civil-engineering/civic/')}>
              <Text style={[styles.disclaimerLink, { color: '#3B82F6' }]}>Source: Official College Website</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      ) : isCse ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.clubCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <View style={[styles.clubHeader, { borderBottomColor: theme.cardBorder, flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={[styles.iconBoxSmall, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
                  <Ionicons name="code-slash" size={24} color="#3B82F6" />
                </View>
                <Text style={[styles.clubName, { color: theme.text, flex: 1, fontSize: 18 }]}>ZERO ONE</Text>
              </View>
              <Text style={[styles.roleLabel, { color: theme.textSecondary, marginBottom: 8 }]}>Create. Code. Conquer.</Text>
              <Text style={[{ color: theme.textSecondary, fontSize: 14, lineHeight: 22 }]}>
                Zero-one club is an initiative to bring together students interested in coding and associated skills in a peer-to-peer learning environment. We believe that a peer-to-peer learning environment is the best way to hone our skills and achieve our goals. Each member of the club brings their own unique vision and perspective, and we encourage everyone to share their ideas and experiences. Whether you're a seasoned developer or just starting out, we welcome you to join us and be a part of our community. The club is open to all students. The only prerequisite to join us is enthusiasm for coding and development, or at least curiosity towards it.
              </Text>
            </View>

            <View style={styles.clubBody}>
              <Text style={[styles.roleLabel, { color: theme.textSecondary, marginBottom: 10 }]}>Our Activities</Text>
              {[
                'We organize hackathons and coding contests often. Checkout more at ZERO ONE.',
                'We organize sessions related to various technology stacks such as Development, Open Source etc.',
                'Host competitions related to coding and other tech domains throughout the year.',
                'Develop real world projects and solve real world problems. Checkout our GitHub account at GitHub.',
                'We manage the official CodeChef Chapter of MCE, Motihari.',
                'See more about our coding culture at our official site ZERO ONE.'
              ].map((act, i) => (
                <Text key={i} style={[styles.roleValue, { color: theme.text, marginLeft: 4, marginBottom: 8 }]}><Text style={{ color: '#3B82F6' }}>•</Text> {act}</Text>
              ))}
            </View>
          </View>

          {/* Social / Contact Info */}
          <Text style={[{ color: theme.text, marginTop: 8, marginBottom: 16, fontSize: 16, fontWeight: '700' }]}>Connect With Us</Text>
          <TouchableOpacity style={[styles.socialCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} onPress={() => Linking.openURL('https://zeroonemce.com')}>
            <Ionicons name="globe" size={24} color="#3B82F6" style={{ marginRight: 12 }} />
            <Text style={{ color: theme.text, fontWeight: '600', fontSize: 16, flex: 1 }}>zeroonemce.com</Text>
            <Ionicons name="open-outline" size={16} color="#3B82F6" />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.socialCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} onPress={() => Linking.openURL('mailto:info@zeroonemce.com')}>
            <Ionicons name="mail" size={24} color="#EF4444" style={{ marginRight: 12 }} />
            <Text style={{ color: theme.text, fontWeight: '600', fontSize: 16, flex: 1 }}>info@zeroonemce.com</Text>
            <Ionicons name="open-outline" size={16} color="#EF4444" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.socialCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} onPress={() => Linking.openURL('https://www.linkedin.com/company/zero-one-coding-club-mce')}>
            <Ionicons name="logo-linkedin" size={24} color="#0A66C2" style={{ marginRight: 12 }} />
            <Text style={{ color: theme.text, fontWeight: '600', fontSize: 16, flex: 1 }}>LinkedIn</Text>
            <Ionicons name="open-outline" size={16} color="#0A66C2" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.socialCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} onPress={() => Linking.openURL('https://github.com/zerO-One-Official')}>
            <Ionicons name="logo-github" size={24} color={theme.text} style={{ marginRight: 12 }} />
            <Text style={{ color: theme.text, fontWeight: '600', fontSize: 16, flex: 1 }}>GitHub</Text>
            <Ionicons name="open-outline" size={16} color={theme.text} />
          </TouchableOpacity>

          {/* Disclaimer */}
          <View style={[styles.disclaimerBox, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" style={{ marginBottom: 8 }} />
            <Text style={[styles.disclaimerText, { color: theme.text }]}>
              <Text style={{ fontWeight: 'bold' }}>Disclaimer:</Text> This data has been collected from the college's official sources. 
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.mcemotihari.ac.in/department/computer-engineering/program-activities/')}>
              <Text style={[styles.disclaimerLink, { color: '#3B82F6' }]}>Source: Official College Website</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      ) : (
        <View style={styles.emptyContent}>
          <View style={[styles.iconBox, { backgroundColor: theme.isDark ? 'rgba(234, 179, 8, 0.15)' : '#FEFCE8' }]}>
            <Ionicons name="planet-outline" size={64} color="#EAB308" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Updates Soon</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            We are currently working on this section. Check back later to discover technical and cultural clubs for this department.
          </Text>
        </View>
      )}

      {isPdfVisible && (
        <PdfViewerModal
          visible={isPdfVisible}
          onClose={() => setIsPdfVisible(false)}
          url="https://drive.google.com/file/d/15jszkTQwtnW1cjPib2wfex-GeOQ4otWb/view?usp=sharing"
          title="NCACE-2026 Proceedings"
        />
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
  emptyContent: {
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
  clubCard: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  iconBoxSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  clubBody: {
    padding: 16,
  },
  roleSection: {
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  roleValue: {
    fontSize: 14,
    marginBottom: 4,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  socialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#0A66C2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  contactBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 16,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 13,
    lineHeight: 20,
  },
  disclaimerBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 24,
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
  }
});
