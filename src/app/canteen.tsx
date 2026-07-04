import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, StatusBar, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

export default function CanteenScreen({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const paddingTop = Platform.OS === 'android' ? (statusBarHeight || 24) : (insets.top || 44);

  const handleOrderPress = () => {
    const msg = "This feature is under development. In future updates, you will be able to order food directly from the app!";
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert("Coming Soon", msg);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop }]}>
      {Platform.OS === 'web' && (
        <title>Canteen - MCE Connect</title>
      )}

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => onBack ? onBack() : router.canGoBack() ? router.back() : router.replace('/')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>College Canteen</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroContainer}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Ionicons name="fast-food" size={48} color="#F59E0B" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>College Canteen</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            Welcome to the digital canteen! Through this app, you will soon be able to easily browse the menu, place orders, and pay directly without waiting in long queues.
          </Text>
          <Text style={[styles.description, { color: '#F59E0B', marginTop: 12, fontWeight: '600' }]}>
            Note: This feature is currently under development.
          </Text>
        </View>

        <View style={styles.linkContainer}>
          <TouchableOpacity 
            style={[styles.linkBtn, { backgroundColor: '#F59E0B' }]}
            onPress={handleOrderPress}
          >
            <Ionicons name="cart-outline" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.linkBtnText}>Order Food Online</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 50, alignItems: 'center' }}>
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 12 }}>
            Interested in running the canteen or a partnership?
          </Text>
          <TouchableOpacity 
            style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: theme.cardBorder, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => Linking.openURL('mailto:mcemotihari.tech@gmail.com')}
          >
            <Ionicons name="mail-outline" size={16} color={theme.text} style={{ marginRight: 6 }} />
            <Text style={{ color: theme.text, fontSize: 13, fontWeight: '500' }}>Apply for Partnership</Text>
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
    paddingBottom: 40,
  },
  heroContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  linkContainer: {
    width: '100%',
    alignItems: 'center',
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
  },
  linkBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  }
});
