import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useTnPStore } from '@/store/useTnPStore';
import { useAppStore } from '@/store/useAppStore';
import { PdfViewerModal } from '@/components/modals/PdfViewerModal';
import { FACULTY_DATA } from '@/data/faculty';

interface TnPScreenProps {
  onBack: () => void;
  onNavigateNoc?: () => void;
  onNavigateFacultyProfile?: (facultyId: string) => void;
  onNavigateSupport?: () => void;
  onOpenNoticeBoard?: () => void;
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
          <Ionicons name={icon} size={22} color="#0EA5E9" style={{ marginRight: 12 }} />
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

export const TnPScreen: React.FC<TnPScreenProps> = ({ onBack, onNavigateNoc, onNavigateFacultyProfile, onNavigateSupport, onOpenNoticeBoard }) => {
  const theme = useThemeColors();
  const isDark = theme.isDark;
  const router = useRouter();
  
  const { user, roomStats, readStates } = useAppStore();
  const { brochures, placementLists, fetchData, isFetching } = useTnPStore();
  const [openSection, setOpenSection] = useState<string | null>(null); // All closed by default
  const [isPdfVisible, setIsPdfVisible] = useState(false);
  const [currentPdfUrl, setCurrentPdfUrl] = useState('');
  const [currentPdfTitle, setCurrentPdfTitle] = useState('');

  const tpoData = FACULTY_DATA.find(f => f.id === 'mech-ashutosh');

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSection = (section: string) => {
    setOpenSection(prev => prev === section ? null : section);
  };

  const handleOpenPdf = (url: string, title: string) => {
    setCurrentPdfUrl(url);
    setCurrentPdfTitle(title);
    setIsPdfVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder, justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            style={[styles.headerBackBtn, { backgroundColor: isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]} 
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Training & Placement Cell</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Banner Section */}
        <View style={styles.bannerContainer}>
          <View style={[styles.bannerBg, { backgroundColor: '#0F172A' }]} />
          <View style={[styles.abstractCircle1, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]} />
          <View style={[styles.abstractCircle2, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]} />
          
          <View style={[styles.logoContainer, { 
            backgroundColor: '#FFFFFF', width: 84, height: 84, marginBottom: 12, 
            borderRadius: 42, elevation: 8, 
            shadowColor: '#0EA5E9', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 8 
          }]}>
            <Ionicons name="business" size={42} color="#0EA5E9" />
          </View>
          
          <Text style={styles.bannerTitle}>T&P Cell, MCE Motihari</Text>
          <Text style={styles.bannerSubtitle}>Empowering students for a brighter future</Text>
        </View>

        <View style={styles.contentContainer}>
          
          {/* Quick Access Notice Board */}
          {onOpenNoticeBoard && (
            <View style={{ marginBottom: 16 }}>
              <Text style={[{ color: theme.textSecondary, marginBottom: 8, fontSize: 12, fontWeight: '700', letterSpacing: 1 }]}>QUICK ACCESS</Text>
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 0 }]}
                activeOpacity={0.7}
                onPress={onOpenNoticeBoard}
              >
                <View style={[{ width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 }, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#F0F9FF' }]}>
                  <Ionicons name="megaphone" size={24} color="#0EA5E9" />
                </View>
                <Text style={[styles.cardTitle, { color: theme.text, flex: 1, marginBottom: 0 }]}>
                  T&P Cell Notice Board
                </Text>
                {(() => {
                  const total = roomStats['tnp'] || 0;
                  const read = readStates['tnp'] || 0;
                  const unread = Math.max(0, total - read);
                  if (unread > 0) {
                    return (
                      <View style={{ backgroundColor: '#EF4444', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, minWidth: 24, alignItems: 'center' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{unread > 99 ? '99+' : unread}</Text>
                      </View>
                    );
                  }
                  return <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />;
                })()}
              </TouchableOpacity>
            </View>
          )}

          {/* NOC Application Button */}
          <TouchableOpacity 
            style={[styles.nocButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
            activeOpacity={0.8}
            onPress={() => {
              if (onNavigateNoc) onNavigateNoc();
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="document-text" size={24} color="#FFF" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.nocButtonTitle}>Apply for NOC</Text>
                <Text style={styles.nocButtonSubtitle}>For Internship & Industrial Training</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFF" />
          </TouchableOpacity>

          {/* About Section */}
          <AccordionItem 
            title="About Placement" 
            icon="information-circle" 
            isOpen={openSection === 'about'} 
            onToggle={() => toggleSection('about')}
          >
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              We at MCE, Motihari believe in combining the three facets that together spell success: <Text style={{ color: theme.text, fontWeight: 'bold' }}>Ability, Motivation and Attitude</Text>.
            </Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              To carve their own unique niche in today's ever growing technical world, engineers require exemplary technical prowess combined with effective inter personal skills.
            </Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              Today's dynamic corporate scenarios seek recruits who have both these skills in equal measure. Increasingly recognized by recruiters for its abundant talent pool and excellent facilities, MCE's placement process aims to match the requirements of recruiters and the aspirations of students.
            </Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              Motihari College of Engineering, Motihari (MCE) was started in 1980. The Placement Officer who is assisted by student representatives from all the departments heads this unit. The Principal of the institution and all other faculty members have extended their wholehearted support to the functioning of the unit.
            </Text>
            
            <View style={[styles.quoteBox, { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.1)' : '#F0F9FF', borderLeftColor: '#0EA5E9' }]}>
              <Ionicons name="chatbubbles-outline" size={24} color="#0EA5E9" style={{ position: 'absolute', top: 12, left: 12, opacity: 0.2 }} />
              <Text style={[styles.quoteText, { color: theme.text }]}>
                “Ability is what you’re capable of doing. Motivation determines what you do. Attitude determines how well you do it.”
              </Text>
              <Text style={[styles.quoteAuthor, { color: theme.textSecondary }]}>– Lou Holtz</Text>
            </View>
          </AccordionItem>

          {/* Brochures Section */}
          <AccordionItem 
            title="Placement Brochure" 
            icon="book" 
            isOpen={openSection === 'brochure'} 
            onToggle={() => toggleSection('brochure')}
          >
            {brochures.map((brochure, index) => (
              <View 
                key={brochure.id}
                style={[styles.listItem, { borderBottomColor: theme.cardBorder, borderBottomWidth: index === brochures.length - 1 ? 0 : 1, paddingVertical: 12 }]}
              >
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 }}
                  onPress={() => handleOpenPdf(brochure.url, brochure.title)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.listNumber, { color: theme.textSecondary }]}>{index + 1}.</Text>
                  <Text style={[styles.listText, { color: theme.text, flex: 1 }]} numberOfLines={2}>
                    {brochure.title}
                  </Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#F0F9FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
                    onPress={() => handleOpenPdf(brochure.url, brochure.title)}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="eye-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#0EA5E9', fontSize: 13, fontWeight: '600' }}>View</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{ padding: 6, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9', borderRadius: 16, marginLeft: 8 }}
                    onPress={() => Linking.openURL(brochure.url)}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="open-outline" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </AccordionItem>

          {/* Placement Lists Section */}
          <AccordionItem 
            title="Placement List" 
            icon="list" 
            isOpen={openSection === 'lists'} 
            onToggle={() => toggleSection('lists')}
          >
            {placementLists.map((list, index) => (
              <View 
                key={list.id}
                style={[styles.listItem, { borderBottomColor: theme.cardBorder, borderBottomWidth: index === placementLists.length - 1 ? 0 : 1, paddingVertical: 12 }]}
              >
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 }}
                  onPress={() => handleOpenPdf(list.url, list.title)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.listNumber, { color: theme.textSecondary }]}>{index + 1}.</Text>
                  <Text style={[styles.listText, { color: theme.text, flex: 1 }]} numberOfLines={2}>
                    {list.title}
                  </Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#F0F9FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
                    onPress={() => handleOpenPdf(list.url, list.title)}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="eye-outline" size={16} color="#0EA5E9" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#0EA5E9', fontSize: 13, fontWeight: '600' }}>View</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{ padding: 6, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9', borderRadius: 16, marginLeft: 8 }}
                    onPress={() => Linking.openURL(list.url)}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="open-outline" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </AccordionItem>

          {/* Contact Section */}
          <AccordionItem 
            title="Contact TPO" 
            icon="call" 
            isOpen={openSection === 'contact'} 
            onToggle={() => toggleSection('contact')}
          >
            <View style={[styles.contactCard, { backgroundColor: isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]}>
              <TouchableOpacity 
                style={{ alignItems: 'center', width: '100%' }}
                activeOpacity={0.7}
                onPress={() => onNavigateFacultyProfile && tpoData && onNavigateFacultyProfile(tpoData.id)}
              >
                {tpoData?.imageUrl ? (
                  <Image 
                    source={{ uri: tpoData.imageUrl }} 
                    style={[styles.contactAvatar, { resizeMode: 'cover', borderWidth: 1, borderColor: theme.cardBorder }]} 
                  />
                ) : (
                  <View style={[styles.contactAvatar, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
                    <Ionicons name="person" size={32} color="#0EA5E9" />
                  </View>
                )}
                
                <Text style={[styles.contactName, { color: '#0EA5E9' }]}>{tpoData ? (tpoData.name.includes('Prof.') || tpoData.name.includes('Dr.') ? tpoData.name : `Prof. ${tpoData.name}`) : 'Prof. Ashutosh Kumar'}</Text>
                <Text style={[styles.contactRole, { color: theme.textSecondary }]}>Training & Placement Officer</Text>
              </TouchableOpacity>
              
              <View style={styles.contactDivider} />
              
              <View style={[styles.contactRow, { alignItems: 'flex-start' }]}>
                <Ionicons name="location-outline" size={20} color={theme.textSecondary} style={[styles.contactIcon, { marginTop: 2 }]} />
                <Text style={[styles.contactDetail, { color: theme.text, flex: 1, lineHeight: 20 }]}>Office address: 04, Ground Floor, New Academic Building (NAB)</Text>
              </View>
              
              <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('tel:6201451158')}>
                <Ionicons name="call-outline" size={20} color={theme.textSecondary} style={styles.contactIcon} />
                <Text style={[styles.contactDetail, { color: theme.text }]}>Call Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('https://wa.me/918758618504')}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" style={styles.contactIcon} />
                <Text style={[styles.contactDetail, { color: theme.text }]}>WhatsApp Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('mailto:tnp.mce@gmail.com')}>
                <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.contactIcon} />
                <Text style={[styles.contactDetail, { color: theme.text }]}>Email Now</Text>
              </TouchableOpacity>
            </View>
          </AccordionItem>
          
          <TouchableOpacity 
            style={styles.referenceLink} 
            onPress={() => Linking.openURL('https://www.mcemotihari.ac.in/training-and-placement/')}
          >
            <Text style={{ color: '#0EA5E9', fontSize: 14, textAlign: 'center' }}>
              For more info: mcemotihari.ac.in/training-and-placement/
            </Text>
          </TouchableOpacity>
          
          <View style={{ marginTop: 24, padding: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 18, flex: 1 }}>
                All details collected from Students or Website as per data available. For contact <Text style={{ color: '#0EA5E9', fontWeight: '500' }} onPress={onNavigateSupport}>click here</Text>.
              </Text>
            </View>
          </View>
          
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* PDF Modal */}
      {isPdfVisible && (
        <PdfViewerModal
          visible={isPdfVisible}
          onClose={() => setIsPdfVisible(false)}
          url={currentPdfUrl}
          title={currentPdfTitle}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  bannerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
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
    left: -50,
  },
  abstractCircle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    bottom: -80,
    right: -50,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  bannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  nocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  nocButtonTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  nocButtonSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  quoteBox: {
    padding: 16,
    paddingLeft: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginTop: 8,
    position: 'relative',
  },
  quoteText: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 8,
    zIndex: 1,
  },
  quoteAuthor: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  listNumber: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  listText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contactCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  contactAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  contactRole: {
    fontSize: 14,
    marginBottom: 16,
  },
  contactDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  contactIcon: {
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  contactDetail: {
    fontSize: 15,
    fontWeight: '500',
  },
  referenceLink: {
    paddingVertical: 16,
    alignItems: 'center',
  }
});
