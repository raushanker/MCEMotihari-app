import { PdfViewerModal } from '@/components/modals/PdfViewerModal';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ECellScreenProps {
  onBack: () => void;
}

const AccordionItem = ({ title, children, icon, isOpen, onToggle }: any) => {
  const theme = useThemeColors();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, padding: 0, overflow: 'hidden' }]}>
      <TouchableOpacity 
        style={[styles.accordionHeader, isOpen && { borderBottomWidth: 1, borderBottomColor: theme.cardBorder }]} 
        activeOpacity={0.7} 
        onPress={onToggle}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name={icon} size={22} color="#EAB308" style={{ marginRight: 12 }} />
          <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]}>{title}</Text>
        </View>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
      </TouchableOpacity>
      {isOpen && (
        <View style={{ padding: 16 }}>
          {children}
        </View>
      )}
    </View>
  );
};

export const ECellScreen: React.FC<ECellScreenProps> = ({ onBack }) => {
  const theme = useThemeColors();
  const isDark = theme.isDark;
  const router = useRouter();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [isPdfVisible, setIsPdfVisible] = useState(false);

  const toggleSection = (section: string) => {
    setOpenSection(prev => prev === section ? null : section);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={[styles.headerBackBtn, { backgroundColor: isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]} 
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Start-up Cell: E-Cell</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Banner Section */}
        <View style={styles.bannerContainer}>
          <View style={[styles.bannerBg, { backgroundColor: '#0F172A' }]} />
          <View style={[styles.abstractCircle1, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]} />
          <View style={[styles.abstractCircle2, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]} />
          
          <View style={[styles.logoContainer, { 
            backgroundColor: '#FFFFFF', width: 84, height: 84, marginBottom: 12, 
            borderRadius: 42, elevation: 8, 
            shadowColor: '#EAB308', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 8 
          }]}>
            <Image 
              source={require('../../assets/images/ecell logo.png')} 
              style={{ width: '70%', height: '70%', resizeMode: 'contain' }} 
            />
          </View>
          <Text style={styles.bannerTitle}>E-CELL</Text>
          <Text style={styles.bannerSubtitle}>MCE MOTIHARI</Text>
        </View>

        {/* Nodal Office Mention */}
        <View style={[styles.alertBox, { backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
          <View style={styles.alertIconBox}>
            <Ionicons name="location" size={20} color="#3B82F6" />
          </View>
          <Text style={[styles.alertText, { color: theme.text }]}>
            <Text style={{ fontWeight: '700' }}>District Nodal Office, </Text>East Champaran of Bihar Startup (Under Department of Industries, Govt. of Bihar).
          </Text>
        </View>

        {/* Highlighted Policy Button */}
        <TouchableOpacity 
          style={[styles.policyBtn, { backgroundColor: '#3B82F6', marginBottom: 16 }]}
          activeOpacity={0.8}
          onPress={() => setIsPdfVisible(true)}
        >
          <Ionicons name="document-text" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>Read Full Bihar Startup Policy</Text>
        </TouchableOpacity>

        {/* Introduction */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, padding: 16 }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>About E-Cell</Text>
          <Text style={[styles.cardBody, { color: theme.textSecondary }]}>
            The Start-up Cell of MCE, Motihari with its team of mentors, coordinators and student volunteers nurtures potential start-up ideas catering to both tech and non-tech solutions for various social, economic and industrial problems. We aim to coordinate and renovate student club activities with the vision of the flagship scheme “Start-up India”.
          </Text>
        </View>

        <AccordionItem title="Vision & Mission" icon="eye" isOpen={openSection === 'vision'} onToggle={() => toggleSection('vision')}>
          <Text style={[styles.cardTitle, { color: theme.text, fontSize: 16 }]}>Vision</Text>
          <Text style={[styles.cardBody, { color: theme.textSecondary, marginBottom: 16 }]}>
            Creating a vibrant and dynamic Startup Ecosystem in Technical Institutions by playing the role of a pre-incubator to promote & facilitate the support system to innovative and entrepreneurial students and faculties.
          </Text>
          <Text style={[styles.cardTitle, { color: theme.text, fontSize: 16 }]}>Mission</Text>
          <Text style={[styles.cardBody, { color: theme.textSecondary }]}>
            Handholding student start-ups through connecting various student entrepreneurial activity clubs to come up with tech solutions, generate Proof of Concepts (POCs), and develop business models ready for the incubator industry.
          </Text>
        </AccordionItem>

        <AccordionItem title="Activities" icon="construct" isOpen={openSection === 'activities'} onToggle={() => toggleSection('activities')}>
          <Text style={[styles.cardBody, { color: theme.textSecondary, marginBottom: 12 }]}>
            In order to meet our vision and mission, we organize the following activities:
          </Text>
          {[
            "Identifying students of Entrepreneurial tendency through GETT and competitions.",
            "Entrepreneurial awareness through panel discussions, talk shows, and workshops.",
            "Hackathons and boot camps to sensitise students for innovation.",
            "FDP for faculties to sensitise them as mentors for student startups.",
            "Incubator visits for students as well as faculty members."
          ].map((text, i) => (
            <View key={i} style={styles.objectiveItem}>
              <Ionicons name="checkmark-circle" size={18} color="#EAB308" style={styles.bullet} />
              <Text style={[styles.cardBody, { color: theme.textSecondary, flex: 1 }]}>{text}</Text>
            </View>
          ))}
        </AccordionItem>

        <AccordionItem title="Facilities & Supports" icon="business" isOpen={openSection === 'facilities'} onToggle={() => toggleSection('facilities')}>
          {[
            { title: "Bihar Startup Funds Assistance", desc: "Complete guidance and support in securing funds through the Bihar Startup Policy." },
            { title: "Idea to Startup Journey", desc: "Step-by-step mentorship from the initial idea phase to launching a fully functional startup." },
            { title: "Funding Guidance", desc: "Assistance with securing seed capital and funding from angel investors and other sources." },
            { title: "Seed Capital for Eligible Start-ups", desc: "Financing R&D support up to the stage of prototyping and commercialization." },
            { title: "E-Library (24*7)", desc: "Access to online business, tech, and entrepreneurial e-resources." },
            { title: "Centre for Innovation Design and Incubation", desc: "Planning, designing, and prototyping of products (CIDI)." },
            { title: "Industry Institute Partnership Cell (IIPC)", desc: "MOU's with external incubators and accelerators for mentoring and internships." },
            { title: "Academic Mentors & Lab Access", desc: "In-house mentoring support and full access to departmental laboratories for R&D." },
          ].map((item, i) => (
            <View key={i} style={[styles.facilityItem, i === 7 && { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>
              <Text style={[styles.facilityTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.cardBody, { color: theme.textSecondary }]}>
                {item.desc}
              </Text>
            </View>
          ))}
        </AccordionItem>

        <AccordionItem title="Startups" icon="rocket" isOpen={openSection === 'startups'} onToggle={() => toggleSection('startups')}>
          <View style={{ gap: 12 }}>
            <View style={styles.objectiveItem}>
              <Ionicons name="business" size={20} color="#8B5CF6" style={styles.bullet} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.text, fontSize: 15, marginBottom: 2 }]}>Ayupathya Pvt Ltd</Text>
                <Text style={[styles.cardBody, { color: theme.textSecondary }]}>Founder: Hariom Kumar</Text>
              </View>
            </View>
            
            <View style={styles.objectiveItem}>
              <Ionicons name="business" size={20} color="#8B5CF6" style={styles.bullet} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.text, fontSize: 15, marginBottom: 2 }]}>deWall Ads™️ (Pvt Ltd)</Text>
                <Text style={[styles.cardBody, { color: theme.textSecondary }]}>Founder: Raushan Kumar</Text>
              </View>
            </View>
            
            <View style={styles.objectiveItem}>
              <Ionicons name="business" size={20} color="#8B5CF6" style={styles.bullet} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.text, fontSize: 15, marginBottom: 2 }]}>Kosi Ganga</Text>
                <Text style={[styles.cardBody, { color: theme.textSecondary }]}>Founders: Vikash, Amit, Amarjeet and others</Text>
              </View>
            </View>
            
            <View style={{ alignItems: 'center', marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>More.....</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>Others will be updated soon!</Text>
            </View>
          </View>
        </AccordionItem>

        {/* ── Startup Chat Room Banner ─────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/community?room=startup' as any)}
          style={[styles.startupChatBanner, {
            backgroundColor: isDark ? 'rgba(236,72,153,0.12)' : '#FDF2F8',
            borderColor: isDark ? 'rgba(236,72,153,0.35)' : '#F9A8D4',
          }]}
        >
          {/* gradient accent bar */}
          <View style={styles.startupChatBarLeft} />

          <View style={[styles.startupChatIconWrap, { backgroundColor: isDark ? 'rgba(236,72,153,0.2)' : '#FCE7F3' }]}>
            <Ionicons name="rocket" size={24} color="#EC4899" />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <Text style={[styles.startupChatTitle, { color: theme.text }]}>Startup / Idea Discussion Room</Text>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <Text style={[styles.startupChatSub, { color: theme.textSecondary }]}>
              Apna idea pitch karein, co-founders dhundein, aur students se connect karein
            </Text>
          </View>

          <View style={[styles.startupChatBtn, { backgroundColor: '#EC4899' }]}>
            <Ionicons name="arrow-forward" size={15} color="#FFF" />
          </View>
        </TouchableOpacity>

        {/* Coordinator */}

        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, padding: 16 }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Start-up Cell Coordinator</Text>
          <TouchableOpacity 
            style={styles.coordinatorCard} 
            activeOpacity={0.7}
            onPress={() => router.push('/faculty?facultyId=mech-ravi&from=ecell')}
          >
            <View style={styles.coordinatorIconBox}>
              <Ionicons name="person" size={24} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.coordinatorName, { color: theme.text }]}>Dr. Ravi Kumar</Text>
              <Text style={[styles.coordinatorRole, { color: theme.textSecondary }]}>HOD (ME) & Assistant Professor</Text>
              <View style={styles.contactRow}>
                <Ionicons name="mail" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.contactText, { color: theme.textSecondary }]}>rirtravi@gmail.com</Text>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="call" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.contactText, { color: theme.textSecondary }]}>7979098267</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {isPdfVisible && (
        <PdfViewerModal
          visible={isPdfVisible}
          onClose={() => setIsPdfVisible(false)}
          url="https://drive.google.com/file/d/1Kso2QdPs8276PCR7COTaycEQV8dMBiXW/view?usp=sharing"
          title="Bihar Startup Policy"
        />
      )}
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 140 },
  bannerContainer: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  policyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bannerBg: {
    ...StyleSheet.absoluteFillObject,
  },
  abstractCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -50,
    right: -50,
  },
  abstractCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    bottom: -40,
    left: -40,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
    zIndex: 2,
  },
  bannerSubtitle: {
    color: '#EAB308',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 4,
    zIndex: 2,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  alertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  cardBody: { fontSize: 14, lineHeight: 22 },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  objectiveItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bullet: { marginRight: 8, marginTop: 2 },
  facilityItem: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 12,
  },
  facilityTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  placeholderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  placeholderTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  placeholderText: { fontSize: 13, textAlign: 'center', paddingHorizontal: 16 },
  coordinatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  coordinatorIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  coordinatorName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  coordinatorRole: {
    fontSize: 13,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 13,
  },

  // ── Startup Chat Room Banner ──────────────────────────────────────────────
  startupChatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 16,
    paddingRight: 14,
    paddingLeft: 0,
    gap: 12,
    marginBottom: 16,
  },
  startupChatBarLeft: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: '#EC4899',
  },
  startupChatIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startupChatTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  startupChatSub: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  startupChatBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(236,72,153,0.15)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#EC4899',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EC4899',
    letterSpacing: 0.5,
  },
});
