import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { PdfViewerModal } from '@/components/modals/PdfViewerModal';

interface NssScreenProps {
  onBack: () => void;
  onOpenMagazine?: () => void;
  onOpenChatRoom?: () => void;
  onNavigateAway?: () => void;
}

export const NssScreen: React.FC<NssScreenProps> = ({ onBack, onOpenMagazine, onOpenChatRoom, onNavigateAway }) => {
  const theme = useThemeColors();
  const isDark = theme.isDark;
  const router = useRouter();
  const [isPdfVisible, setIsPdfVisible] = useState(false);

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>National Service Scheme (NSS)</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Banner Section */}
        <View style={styles.bannerContainer}>
          <View style={[styles.bannerBg, { backgroundColor: '#22C55E' }]} />
          <View style={[styles.logoContainer, { backgroundColor: 'transparent', width: 90, height: 90, marginBottom: 4 }]}>
            <Image 
              source={require('../../assets/images/nss mce logo.png')} 
              style={{ width: '100%', height: '100%', resizeMode: 'contain' }} 
            />
          </View>
          <Text style={styles.mottoText}>"Not Me But You"</Text>
        </View>

        {/* Chat Room Button */}
        <TouchableOpacity 
          style={[styles.magazineCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
          activeOpacity={0.8}
          onPress={() => {
            if (onNavigateAway) onNavigateAway();
            if (onOpenChatRoom) onOpenChatRoom();
            else router.push('/community?room=humanities&from=/nss' as any);
          }}
        >
          <View style={[styles.magazineIconBox, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}>
            <Ionicons name="chatbubbles" size={28} color="#F43F5E" />
          </View>
          <View style={styles.magazineInfo}>
            <Text style={[styles.magazineTitle, { color: theme.text }]}>NSS Chat Room</Text>
            <Text style={[styles.magazineDesc, { color: theme.textSecondary }]}>Connect and discuss on well-being and extra-curriculars.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Magazine Button */}
        <TouchableOpacity 
          style={[styles.magazineCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
          activeOpacity={0.8}
          onPress={() => {
            if (onOpenMagazine) onOpenMagazine();
            else setIsPdfVisible(true);
          }}
        >
          <View style={[styles.magazineIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <Ionicons name="book" size={28} color="#3B82F6" />
          </View>
          <View style={styles.magazineInfo}>
            <Text style={[styles.magazineTitle, { color: theme.text }]}>NSS Magazine</Text>
            <Text style={[styles.magazineDesc, { color: theme.textSecondary }]}>Read the latest edition, events, and stories.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Introduction */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>About NSS</Text>
          <Text style={[styles.cardBody, { color: theme.textSecondary }]}>
            The National Service Scheme (NSS) is an Indian government-sponsored public service program conducted by the Ministry of Youth Affairs and Sports. It provides an opportunity to the students of MCE Motihari to take part in various government-led community service activities and programs.
          </Text>
        </View>

        {/* Objectives */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Our Objectives</Text>
          <View style={styles.objectiveItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" style={styles.bullet} />
            <Text style={[styles.cardBody, { color: theme.textSecondary, flex: 1 }]}>Understand the community in which they work.</Text>
          </View>
          <View style={styles.objectiveItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" style={styles.bullet} />
            <Text style={[styles.cardBody, { color: theme.textSecondary, flex: 1 }]}>Understand themselves in relation to their community.</Text>
          </View>
          <View style={styles.objectiveItem}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" style={styles.bullet} />
            <Text style={[styles.cardBody, { color: theme.textSecondary, flex: 1 }]}>Identify the needs and problems of the community and involve them in problem-solving.</Text>
          </View>
        </View>

        {/* Volunteer Activities - Coming Soon Placeholder */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Volunteer Activities</Text>
          <View style={styles.placeholderBox}>
            <Ionicons name="time-outline" size={32} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
            <Text style={[styles.placeholderTitle, { color: theme.text }]}>Updates Soon</Text>
            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>We are currently gathering details for past volunteer activities.</Text>
          </View>
        </View>

        {/* Events - Coming Soon Placeholder */}
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Events</Text>
          <View style={styles.placeholderBox}>
            <Ionicons name="calendar-outline" size={32} color={theme.textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
            <Text style={[styles.placeholderTitle, { color: theme.text }]}>Currently We Are Working</Text>
            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>All events will be updated here shortly, sorted by date with recent ones at the top.</Text>
          </View>
        </View>

      </ScrollView>

      {isPdfVisible && (
        <PdfViewerModal
          visible={isPdfVisible}
          onClose={() => setIsPdfVisible(false)}
          url="https://drive.google.com/file/d/122-BPiVCHlUJKoJ2fqXnunZe1viCEvzj/view?usp=sharing"
          title="NSS Magazine"
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
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bannerBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  mottoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  magazineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' }
    })
  },
  magazineIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  magazineInfo: { flex: 1 },
  magazineTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  magazineDesc: { fontSize: 13, lineHeight: 18 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  cardBody: { fontSize: 14, lineHeight: 22 },
  objectiveItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bullet: { marginRight: 8, marginTop: 2 },
  placeholderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  placeholderTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  placeholderText: { fontSize: 13, textAlign: 'center' }
});
