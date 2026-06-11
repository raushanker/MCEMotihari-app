import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  Image,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import * as WebBrowser from 'expo-web-browser';

interface MCEAAScreenProps {
  onBack: () => void;
}

const LINKS = {
  cell: 'https://www.mcemotihari.ac.in/alumni/alumni-cell/',
  registration: 'https://www.mcemotihari.ac.in/alumni/alumni-registration/',
  principal: 'https://www.mcemotihari.ac.in/alumni/principals-message-to-alumni/',
  whatsapp: 'https://whatsapp.com/channel/0029VaEjXQLG8l56UotFmB16',
  instagram: 'https://www.instagram.com/alumnimce/',
  facebook: 'https://www.facebook.com/groups/alumnimce/',
  linkedin: 'https://www.linkedin.com/company/alumnimce/'
};

export const MCEAAScreen: React.FC<MCEAAScreenProps> = ({ onBack }) => {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const isDark = theme.isDark;

  const openLink = async (url: string) => {
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        await WebBrowser.openBrowserAsync(url, {
          toolbarColor: theme.backgroundElement,
          controlsColor: '#F97316',
          enableBarCollapsing: true,
          showTitle: true
        });
      }
    } catch (error) {
      console.warn("Failed to open browser:", error);
    }
  };

  const renderCard = (title: string, icon: any, url: string, color: string, description: string) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
      activeOpacity={0.7}
      onPress={() => openLink(url)}
    >
      <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
          {description}
        </Text>
      </View>
      <Ionicons name="open-outline" size={20} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>MCEAA Hub</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Banner Section */}
        <View style={styles.banner}>
          <View style={[styles.bannerIcon, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }]}>
            <Image 
              source={require('../../assets/images/mceaa logo.png')} 
              style={{ width: 120, height: 120, resizeMode: 'contain' }} 
            />
          </View>
          <Text style={[styles.bannerTitle, { color: theme.text }]}>Motihari College of Engineering</Text>
          <Text style={[styles.bannerSubtitle, { color: '#8B5CF6' }]}>Alumni Association</Text>
          <Text style={[styles.bannerDesc, { color: theme.textSecondary }]}>
            The official community for MCE graduates. Connect, collaborate, and contribute back to your alma mater.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Official Portal</Text>
        
        {renderCard(
          "Alumni Cell", 
          "business", 
          LINKS.cell, 
          "#3B82F6",
          "Meet the core committee and learn about MCEAA's vision and initiatives."
        )}
        
        {renderCard(
          "Alumni Registration", 
          "person-add", 
          LINKS.registration, 
          "#10B981",
          "Join the official database to receive invites for alumni meets and networking events."
        )}
        
        {renderCard(
          "Principal's Message", 
          "mail", 
          LINKS.principal, 
          "#F59E0B",
          "Read the official address from the Principal regarding the alumni network."
        )}

        <View style={styles.divider} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Social Communities</Text>

        <View style={styles.socialGrid}>
          <TouchableOpacity style={[styles.socialCard, { backgroundColor: '#25D366' }]} onPress={() => openLink(LINKS.whatsapp)} activeOpacity={0.8}>
            <Ionicons name="logo-whatsapp" size={32} color="#FFF" />
            <Text style={styles.socialText}>WhatsApp</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.socialCard, { backgroundColor: '#E1306C' }]} onPress={() => openLink(LINKS.instagram)} activeOpacity={0.8}>
            <Ionicons name="logo-instagram" size={32} color="#FFF" />
            <Text style={styles.socialText}>Instagram</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.socialCard, { backgroundColor: '#1877F2' }]} onPress={() => openLink(LINKS.facebook)} activeOpacity={0.8}>
            <Ionicons name="logo-facebook" size={32} color="#FFF" />
            <Text style={styles.socialText}>Facebook</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.socialCard, { backgroundColor: '#0A66C2' }]} onPress={() => openLink(LINKS.linkedin)} activeOpacity={0.8}>
            <Ionicons name="logo-linkedin" size={32} color="#FFF" />
            <Text style={styles.socialText}>LinkedIn</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: Math.max(insets.bottom, 40) }} />
      </ScrollView>
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
  scrollContent: {
    padding: 16,
  },
  banner: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  bannerIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  bannerDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    opacity: 0.2,
    marginVertical: 12,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  socialCard: {
    width: '48%',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  socialText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  }
});
