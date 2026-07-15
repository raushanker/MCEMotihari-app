import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { DetailModal } from './DetailModal';
import { useThemeColors } from '@/hooks/useThemeColors';

interface AboutModalProps {
  isEmbedded?: boolean;
  visible: boolean;
  onClose: () => void;
}

export function AboutModal({ visible, onClose, isEmbedded }: AboutModalProps) {
  const theme = useThemeColors();

  return (
    <DetailModal isEmbedded={isEmbedded} visible={visible} title="About MCE Motihari" onClose={onClose}>
      <View style={[styles.richCard, { backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC', borderColor: theme.cardBorder }]}>
        <Image
          source={require('../../../assets/images/mce-logo.png')}
          style={styles.aboutLogo}
        />
        <Text style={[styles.aboutCollegeTitle, { color: theme.text }]}>Motihari College of Engineering</Text>
        <Text style={[styles.aboutCollegeLoc, { color: theme.textSecondary }]}>Motihari, East Champaran, Bihar - 845401</Text>
        <View style={styles.aboutBadgeRow}>
          <View style={[styles.aboutBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}><Text style={[styles.aboutBadgeText, { color: theme.textSecondary }]}>Govt. of Bihar</Text></View>
          <View style={[styles.aboutBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}><Text style={[styles.aboutBadgeText, { color: theme.textSecondary }]}>AICTE Approved</Text></View>
          <View style={[styles.aboutBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}><Text style={[styles.aboutBadgeText, { color: theme.textSecondary }]}>BEU Affiliated</Text></View>
        </View>
      </View>

      <Text style={[styles.richTextHeader, { color: theme.text }]}>Historical Outline</Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        Motihari College of Engineering (MCE), Motihari is a state government engineering college, fully funded by the Government of Bihar under the Department of Science, Technology & Technical Education.
      </Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        Previously, the institute was known as the <Text style={{ fontWeight: 'bold', color: theme.text }}>Indian College of Engineering</Text> and was established on <Text style={{ fontWeight: 'bold', color: theme.text }}>24 November 1980</Text>. In 1986, the college was formally taken over by the Bihar government.
      </Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        Later, in November 2008, the Government reopened the institute and changed the name to Motihari College of Engineering, introducing modern branches and fully-funded state infrastructures.
      </Text>

      <Text style={[styles.richTextHeader, { color: theme.text }]}>Academic Affiliation</Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        The institute is academically governed by Bihar Engineering University (BEU), Patna (previously Aryabhatta Knowledge University), which awards the official Bachelor of Technology (B.Tech) degrees.
      </Text>

      <Text style={[styles.richTextHeader, { color: theme.text }]}>Official Resources</Text>
      <TouchableOpacity style={[styles.linkCard, { backgroundColor: theme.isDark ? 'rgba(249, 115, 22, 0.08)' : '#FFF7ED', borderColor: theme.isDark ? 'rgba(249, 115, 22, 0.2)' : '#FFE3D3' }]} onPress={() => alert('Opening official website: mcemotihari.ac.in')}>
        <Ionicons name="globe-outline" size={18} color="#F97316" />
        <Text style={styles.linkCardText}>Official Website: mcemotihari.ac.in</Text>
      </TouchableOpacity>
    </DetailModal>
  );
}

const styles = StyleSheet.create({
  richCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  aboutLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#F97316',
  },
  aboutCollegeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  aboutCollegeLoc: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
  },
  aboutBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  aboutBadge: {
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: '#E2E8F0',
  },
  aboutBadgeText: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#475569',
  },
  richTextHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 6,
  },
  richTextParagraph: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFE3E3',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
    width: '100%',
  },
  linkCardText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#F97316',
  },
});
export default AboutModal;
