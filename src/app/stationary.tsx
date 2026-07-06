import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, StatusBar, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

export default function StationaryScreen({ onBack, onOpenOlx }: { onBack?: () => void, onOpenOlx?: () => void }) {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const paddingTop = Math.max(insets.top, 16);

  const itemsList = [
    "Scientific calci",
    "Minidrafter",
    "Engineering books",
    "Notebook",
    "A4 Pages",
    "Scale",
    "Pen drive",
    "Pencil",
    "Colours",
    "Chartpapers"
  ];

  const handleOrderPress = () => {
    const msg = "This feature is under development. In future updates, you will be able to order these stationary items directly from the app!";
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert("Coming Soon", msg);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop }]}>
      {Platform.OS === 'web' && (
        <title>Stationary - MCE Connect</title>
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Stationary Store</Text>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => {
            const msg = "Order engineering and stationary items directly through the app. Campus OLX allows you to buy and sell second-hand study materials with other students.";
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert('Stationary Store', msg);
          }}
        >
          <Ionicons name="information-circle-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroContainer}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="pricetags" size={48} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Campus OLX</Text>
        </View>


        <View style={{ marginBottom: 32, marginHorizontal: 0 }}>
          <TouchableOpacity 
            style={[styles.linkBtn, { backgroundColor: theme.primary }]}
            onPress={() => {
              if (onOpenOlx) {
                onOpenOlx();
              } else {
                router.push('/olx' as any);
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="pricetags-outline" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.linkBtnText}>Buy/Sell 2nd Hand Items</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, { color: theme.text, fontSize: 18, marginTop: 40, marginBottom: 16, textAlign: 'center' }]}>Stationary Ordering (Coming Soon)</Text>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Text style={[styles.description, { color: theme.textSecondary, marginBottom: 16 }]}>
            Order engineering and stationary items directly through the app. The following items will be available for purchase:
          </Text>
          
          <View style={styles.itemsGrid}>
            {itemsList.map((item, index) => (
              <View key={index} style={[styles.itemPill, { backgroundColor: theme.isDark ? '#1F2937' : '#F3F4F6' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={[styles.itemText, { color: theme.text }]}>{item}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.description, { color: '#10B981', marginTop: 20, fontWeight: '600' }]}>
            Note: The ordering feature is currently under development.
          </Text>
        </View>

        <View style={styles.linkContainer}>
          <TouchableOpacity 
            style={[styles.linkBtn, { backgroundColor: '#10B981' }]}
            onPress={handleOrderPress}
          >
            <Ionicons name="cart-outline" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.linkBtnText}>Order Items Online</Text>
          </TouchableOpacity>
        </View>


        <View style={{ marginTop: 50, alignItems: 'center' }}>
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 12 }}>
            Interested in providing stationary or a partnership?
          </Text>
          <TouchableOpacity 
            style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: theme.cardBorder, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => Linking.openURL('mailto:mcemotihari.tech@gmail.com')}
          >
            <Ionicons name="mail-outline" size={16} color={theme.text} style={{ marginRight: 6 }} />
            <Text style={{ color: theme.text, fontSize: 13, fontWeight: '500' }}>Apply for Partnership</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 8, textAlign: 'center', opacity: 0.8 }}>
            * College Alumni ko jaida preference diya jaayega.
          </Text>
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
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  itemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '500',
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
