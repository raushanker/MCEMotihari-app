import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { Image } from 'expo-image';

export default function SportsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const paddingTop = Platform.OS === 'android' ? (statusBarHeight || 24) : (insets.top || 44);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop }]}>
      {Platform.OS === 'web' && (
        <title>Sports Facilities - MCE Connect</title>
      )}

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Sports Facilities</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroContainer}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Ionicons name="football" size={48} color="#10B981" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Healthy Mind in Healthy Body</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Facilities for other outdoor and indoor games like Volleyball, Football, Cricket, Basketball, Badminton, Table Tennis, etc. are available on campus to promote physical well-being and active lifestyles among students.
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary, marginTop: 12 }]}>
            Regular sports tournaments, annual athletics meets, and inter-departmental competitions are organized to nurture team spirit and competitive excellence.
          </Text>
        </View>

        <View style={styles.linkContainer}>
          <TouchableOpacity 
            style={[styles.linkBtn, { backgroundColor: '#10B981' }]}
            onPress={() => Linking.openURL('https://www.mcemotihari.ac.in/facilities-and-services/sports-facilities/')}
          >
            <Ionicons name="globe-outline" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.linkBtnText}>Read More on Official Website</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'left',
    marginLeft: 12,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  heroContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  linkContainer: {
    alignItems: 'center',
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  linkBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
