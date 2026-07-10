import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar, Linking, Image, Alert, Share } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { STARTUPS_DATA } from '../startups';

export default function StartupDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();

  const startup = STARTUPS_DATA.find(s => s.id === id);

  const paddingTop = Math.max(insets.top, 16);

  if (!startup) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Startup not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#8B5CF6' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      let message = `Check out ${startup.name}, a startup founded by ${startup.founder}!\nDomain: ${startup.domain}`;
      if (startup.website) {
        message += `\nWebsite: ${startup.website}`;
      }
      await Share.share({
        message,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]} 
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={20} color={theme.text} />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 16 }}>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{startup.name}</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{startup.domain}</Text>
      </View>
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9', marginLeft: 10 }]} 
        onPress={handleShare}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="share-social-outline" size={20} color={theme.text} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop }]}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            {startup.logo ? (
              <Image source={startup.logo} style={styles.logo} />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: theme.isDark ? '#334155' : '#E2E8F0' }]}>
                <Ionicons name="business" size={32} color="#8B5CF6" />
              </View>
            )}
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.startupName, { color: theme.text }]}>{startup.name}</Text>
              <Text style={[styles.founderName, { color: theme.textSecondary }]}>Founded by {startup.founder}</Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            {startup.fundraised && (
              <View style={[styles.statBox, { backgroundColor: theme.isDark ? '#064E3B' : '#D1FAE5' }]}>
                <Ionicons name="trending-up" size={16} color="#10B981" />
                <Text style={[styles.statValue, { color: '#10B981' }]}>{startup.fundraised}</Text>
                <Text style={[styles.statLabel, { color: '#10B981', opacity: 0.8 }]}>Fundraised</Text>
              </View>
            )}
            {startup.valuation && (
              <View style={[styles.statBox, { backgroundColor: theme.isDark ? '#4C1D95' : '#EDE9FE' }]}>
                <Ionicons name="diamond" size={16} color="#8B5CF6" />
                <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{startup.valuation}</Text>
                <Text style={[styles.statLabel, { color: '#8B5CF6', opacity: 0.8 }]}>Valuation</Text>
              </View>
            )}
          </View>
        </View>

        {startup.id === '2' ? (
          <View style={styles.storySection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>About deWall Ads</Text>
            <Text style={[styles.storyText, { color: theme.textSecondary }]}>
              Founded by <Text 
                style={{ color: '#3B82F6', textDecorationLine: 'underline' }}
                suppressHighlighting={false}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    if (window.confirm("Do you want to open raushank.com in external browser?")) {
                      Linking.openURL('https://raushank.com');
                    }
                  } else {
                    Alert.alert(
                      "External Link",
                      "Do you want to open raushank.com in external browser?",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Open", onPress: () => Linking.openURL('https://raushank.com') }
                      ]
                    );
                  }
                }}
              >Er. Raushan Kumar</Text>, a civil engineer from Bihar, at the young age of 21, deWall Ads™ (Swami deWall Ads Private Limited) is an innovative Indian AdTech startup. The platform's mission is to make offline, outdoor advertising accessible, transparent, and highly cost-effective for both local businesses and national brands.
            </Text>
            
            <View style={[styles.highlightBox, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9', borderColor: theme.cardBorder }]}>
              <Ionicons name="earth" size={20} color="#3B82F6" style={{ marginBottom: 8 }} />
              <Text style={[styles.highlightText, { color: theme.text }]}>
                <Text style={{ fontFamily: 'Inter-Bold' }}>2 Lakh+ Users</Text> across the globe (3+ countries) and covering 25+ states in India.
              </Text>
            </View>

            <Text style={[styles.storyText, { color: theme.textSecondary, marginTop: 16 }]}>
              deWall Ads achieved a major international milestone by representing India under the Startup India (DPIIT) delegation at Expand North Star – GITEX 2025 in Dubai, showcasing its innovative marketplace at this globally acclaimed startup and investor event.
            </Text>

            <Text style={[styles.storyText, { color: theme.textSecondary }]}>
              <Text style={{ fontFamily: 'Inter-Bold', color: theme.text }}>Incubation & Recognition:</Text> Supported by the Department of Industry (Govt. of Bihar), iHUB DivyaSampark (IIT Roorkee), FIST & Incubation Center (IIT Patna).
            </Text>

            <Text style={[styles.storyText, { color: theme.textSecondary }]}>
              <Text style={{ fontFamily: 'Inter-Bold', color: theme.text }}>Address:</Text>
              {'\n'}Office Address: 77, Sector-116, Noida, UP-201301 (India).
            </Text>
            
            <View style={[styles.contactBox, { backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC', borderColor: theme.cardBorder }]}>
              <Ionicons name="briefcase" size={24} color="#8B5CF6" style={{ marginBottom: 12 }} />
              <Text style={[styles.contactText, { color: theme.text }]}>
                If you are interested to join or work in the Advertising industry, please email your CV to:
              </Text>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:hr@dewallads.com')} style={styles.emailButton}>
                <Ionicons name="mail" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.emailButtonText}>hr@dewallads.com</Text>
              </TouchableOpacity>
            </View>

            {startup.website && (
              <TouchableOpacity onPress={() => Linking.openURL(startup.website!)} style={[styles.websiteLink, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
                <Ionicons name="globe-outline" size={20} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text style={[styles.websiteText, { color: '#3B82F6' }]}>Visit {startup.website.replace(/^https?:\/\//, '')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : startup.id === '11' ? (
          <View style={styles.storySection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>About Shiv Kheltantra</Text>
            <Text style={[styles.storyText, { color: theme.textSecondary }]}>
              Discover, train, and grow through one sports platform.
            </Text>
            <Text style={[styles.storyText, { color: theme.textSecondary }]}>
              Built for athletes, families, coaches, schools, and academies across Bihar.
            </Text>
            {startup.email && (
              <View style={[styles.contactBox, { backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC', borderColor: theme.cardBorder }]}>
                <Ionicons name="mail-outline" size={24} color="#8B5CF6" style={{ marginBottom: 12 }} />
                <Text style={[styles.contactText, { color: theme.text }]}>
                  Contact {startup.name} at:
                </Text>
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${startup.email}`)} style={styles.emailButton}>
                  <Ionicons name="mail" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.emailButtonText}>{startup.email}</Text>
                </TouchableOpacity>
              </View>
            )}
            {startup.website && (
              <TouchableOpacity onPress={() => Linking.openURL(startup.website!)} style={[styles.websiteLink, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
                <Ionicons name="globe-outline" size={20} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text style={[styles.websiteText, { color: '#3B82F6' }]}>Visit {startup.website.replace(/^https?:\/\//, '')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.storySection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>About {startup.name}</Text>
            <Text style={[styles.storyText, { color: theme.textSecondary }]}>
              More information about this startup will be updated soon. Stay tuned!
            </Text>
            {startup.email && (
              <View style={[styles.contactBox, { backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC', borderColor: theme.cardBorder }]}>
                <Ionicons name="mail-outline" size={24} color="#8B5CF6" style={{ marginBottom: 12 }} />
                <Text style={[styles.contactText, { color: theme.text }]}>
                  Contact {startup.name} at:
                </Text>
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${startup.email}`)} style={styles.emailButton}>
                  <Ionicons name="mail" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.emailButtonText}>{startup.email}</Text>
                </TouchableOpacity>
              </View>
            )}
            {startup.website && (
              <TouchableOpacity onPress={() => Linking.openURL(startup.website!)} style={[styles.websiteLink, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
                <Ionicons name="globe-outline" size={20} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text style={[styles.websiteText, { color: '#3B82F6' }]}>Visit {startup.website.replace(/^https?:\/\//, '')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    resizeMode: 'contain',
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  startupName: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  founderName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    textTransform: 'uppercase',
  },
  storySection: {
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  storyText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
    marginBottom: 16,
  },
  contactBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  contactText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  emailButton: {
    backgroundColor: '#8B5CF6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emailButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  websiteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  websiteText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  highlightBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginVertical: 4,
  },
  highlightText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    lineHeight: 22,
  }
});
