import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity,  FlatList, Linking, Platform, StatusBar, Image , KeyboardAvoidingView } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { Ionicons } from '@expo/vector-icons';

interface Startup {
  id: string;
  name: string;
  founder: string;
  domain: string;
  fundraised: string;
  valuation?: string;
  email?: string;
  website?: string;
  status?: string;
  logo?: any;
}

export const STARTUPS_DATA: Startup[] = [
  {
    id: '1',
    name: 'AYUPATHYA AAHAR Pvt. Ltd.',
    founder: 'Hariom Kumar',
    domain: 'HealthTech',
    fundraised: '₹10 Lakhs',
    email: 'hariomsinghuit3@gmail.com',
  },
  {
    id: '2',
    name: 'deWall Ads™️ (Pvt. Ltd.)',
    founder: 'Raushan Kumar',
    domain: 'Advertising Technology (AdTech)',
    fundraised: '₹26.6 Lakhs',
    valuation: '3.25 Cr',
    website: 'https://www.dewallads.com',
    logo: require('@/assets/images/dewall ads logo.jpg'),
  },
  {
    id: '3',
    name: 'GangaKoshi Agritech Pvt. Ltd.',
    founder: 'Amarjit, Amit, Ravi Shankar, Vikash',
    domain: 'Agritech',
    fundraised: '₹10 Lakhs',
    website: 'https://www.gangakoshi.com',
  },
  {
    id: '4',
    name: 'Sanskar Kits',
    founder: 'Aditya Kumar Shrivastav',
    domain: 'E-Commerce',
    fundraised: '₹10 Lakhs',
    email: 'Shrivastawaaditya0@gmail.com',
  },
  {
    id: '5',
    name: 'Puffpine',
    founder: 'Arvind Kumar',
    domain: 'FoodTech',
    fundraised: '₹10 Lakhs',
    email: 'Tileshaman7@gmail.com',
  },
  {
    id: '6',
    name: 'APNASARTHI SOLUTION Pvt. Ltd.',
    founder: 'Abhiram Kumar',
    domain: 'TravelTech',
    fundraised: '₹10 Lakhs',
    email: 'Abhiram.mce@gmail.com',
  },
  {
    id: '7',
    name: 'Ur-Planner',
    founder: 'Rahul Kumar',
    domain: 'Event Management',
    fundraised: '₹10 Lakhs',
    email: 'Rahulsaha26012000@gmail.com',
  },
  {
    id: '8',
    name: 'BhartiyaStay',
    founder: 'Amit Kumar',
    domain: 'Room Rental Platform',
    fundraised: '₹10 Lakhs',
    email: 'ay6666273@gmail.com',
  },
  {
    id: '9',
    name: 'One Day Bazaar',
    founder: 'Amit Kumar',
    domain: 'E-Commerce',
    fundraised: '₹10 Lakhs',
    email: 'amitmce2019@gmail.com',
  },
  {
    id: '10',
    name: 'DroneSarthi',
    founder: 'Shivam Kumar',
    domain: 'Drone Technology',
    fundraised: '₹10 Lakhs',
    email: 'shivamkumarsk5869@gmail.com',
  },
  {
    id: '11',
    name: 'Shiv Kheltantra',
    founder: 'Shivam Kumar Ishwar',
    domain: 'Sports Technology',
    fundraised: '₹10 Lakhs',
    email: 'ishwarshivam7@gmail.com',
    website: 'https://www.sktsports.in',
  },
  {
    id: '12',
    name: 'Skill Sphere',
    founder: 'Aman Roy',
    domain: 'EdTech',
    fundraised: '₹10 Lakhs',
    email: 'amanrosera44@gmail.com',
  },
  {
    id: '13',
    name: 'AgriDoctor',
    founder: 'Nikhil Kumar',
    domain: 'Agritech',
    fundraised: '₹10 Lakhs',
    email: 'pathaknikil1412@gmail.com',
  },
  {
    id: '14',
    name: 'FreshLens',
    founder: 'Akash Kumar',
    domain: 'Agritech',
    fundraised: '₹10 Lakhs',
    email: 'alpinoakash1975@gmail.com',
  },
  {
    id: '15',
    name: 'Nexneer Pvt. Ltd.',
    founder: 'Shristi Kumari',
    domain: 'Agritech',
    fundraised: '₹10 Lakhs',
  },
  {
    id: '16',
    name: 'AgriNutra',
    founder: 'Krishnandan Kumar',
    domain: 'FoodTech',
    fundraised: '₹10 Lakhs',
    email: 'krishnakr03612@gmail.com',
  },
  {
    id: '17',
    name: 'Arvind Herbo Organo',
    founder: 'Aadity Kumari',
    domain: 'FoodTech',
    fundraised: '₹10 Lakhs',
    email: 'aaditykumari96@gmail.com',
  },
  {
    id: '18',
    name: '(Name not available)',
    founder: 'Naya Kamal',
    domain: 'Startup',
    fundraised: '₹10 Lakhs',
    email: 'mahtonyaykama105@gmail.com',
  },
];

export const StartupCard = ({ item, index }: { item: Startup, index: number }) => {
  const router = useRouter();
  const theme = useThemeColors();
  return (
    <TouchableOpacity 
      style={[styles.simpleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
      onPress={() => router.push(`/ecell/startup/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {item.logo ? (
          <Image 
            source={item.logo} 
            style={{ width: 24, height: 24, borderRadius: 4, marginRight: 10, resizeMode: 'contain' }} 
          />
        ) : (
          <Ionicons name="business" size={20} color="#8B5CF6" style={{ marginTop: 2, marginRight: 12 }} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.startupName, { color: theme.text, marginBottom: 4 }]}>
            {item.name}
          </Text>
          <Text style={[styles.founderName, { color: theme.textSecondary, marginBottom: 2 }]}>Founder: {item.founder}</Text>
          <Text style={[styles.founderName, { color: theme.textSecondary, marginBottom: 4 }]}>Domain: {item.domain}</Text>
          
          {item.fundraised ? (
            <Text style={{ color: '#10B981', fontSize: 13, fontWeight: '500', marginBottom: 2 }}>
              Fundraised: {item.fundraised}
            </Text>
          ) : null}
          
          {item.valuation && (
            <Text style={{ color: '#8B5CF6', fontSize: 13, fontWeight: '500', marginBottom: 4 }}>
              Valuation: {item.valuation}
            </Text>
          )}
          {item.website && (
            <TouchableOpacity onPress={() => Linking.openURL(item.website!)} style={{ marginTop: 2 }}>
              <Text style={[styles.founderName, { color: theme.textSecondary }]}>
                Website: {item.website.replace(/^https?:\/\//, '')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={{ position: 'absolute', bottom: 16, right: 16, alignItems: 'flex-end' }} 
          onPress={() => item.id === '2' ? router.push('/@raushan') : null}
          activeOpacity={item.id === '2' ? 0.7 : 1}
        >
          <Text style={{ fontSize: 9, color: theme.textSecondary, marginBottom: 4, fontWeight: '600', textTransform: 'uppercase', marginRight: 4 }}>TEAM</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {item.id === '2' ? (
              <Image 
                source={{ uri: 'https://res.cloudinary.com/dxtuq3zd6/image/upload/f_webp,q_auto/v1782915795/nkprcxs5wrfrmmgrflcv.png' }} 
                style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: theme.backgroundElement, zIndex: 3 }} 
              />
            ) : (
              <Image 
                source={{ uri: `https://api.dicebear.com/7.x/notionists/png?seed=${item.id}team1&backgroundColor=f1f5f9` }} 
                style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: theme.backgroundElement, zIndex: 3 }} 
              />
            )}
            <Image 
              source={{ uri: `https://api.dicebear.com/7.x/notionists/png?seed=${item.id}team2&backgroundColor=f8fafc` }} 
              style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: theme.backgroundElement, marginLeft: -12, zIndex: 2 }} 
            />
            <Image 
              source={{ uri: `https://api.dicebear.com/7.x/notionists/png?seed=${item.id}team3&backgroundColor=e2e8f0` }} 
              style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: theme.backgroundElement, marginLeft: -12, zIndex: 1 }} 
            />
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function StartupsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const paddingTop = Math.max(insets.top, 16);

  const filteredStartups = useMemo(() => {
    if (!searchQuery.trim()) return STARTUPS_DATA;
    const lowerQuery = searchQuery.toLowerCase();
    return STARTUPS_DATA.filter(
      (startup) =>
        startup.name.toLowerCase().includes(lowerQuery) ||
        startup.founder.toLowerCase().includes(lowerQuery) ||
        startup.domain.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={[styles.backButton, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]} 
        onPress={() => router.replace('/ecell')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={20} color={theme.text} />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: 16 }}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>MCE Startups</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Supported by E-cell under Bihar Startup scheme</Text>
      </View>
    </View>
  );

  const renderSearchBar = () => (
    <View style={[styles.searchContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
      <Ionicons name="search" size={20} color={theme.textSecondary} style={{ marginRight: 10 }} />
      <TextInput
        style={[styles.searchInput, { color: theme.text, outlineStyle: 'none' } as any]}
        placeholder="Search startups, founders, or domains..."
        placeholderTextColor={theme.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCorrect={false}
       autoCapitalize="sentences" />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
          <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );



  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop }]}>
      {renderHeader()}
      <View style={{ paddingHorizontal: 16 }}>
        {renderSearchBar()}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <FlatList
          data={filteredStartups}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <StartupCard item={item} index={index} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={48} color={theme.textSecondary} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No startups found matching "{searchQuery}"</Text>
            </View>
          }
          ListFooterComponent={
            filteredStartups.length > 0 ? (
              <View style={{ marginTop: 24, alignItems: 'center', paddingHorizontal: 16 }}>
                <Text style={{ textAlign: 'center', color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>
                  Data sourced from MCE Startup Cell and college website.
                </Text>
                <Text style={{ textAlign: 'center', color: theme.textSecondary, fontSize: 12, lineHeight: 18 }}>
                  This data is as per June 2026.
                </Text>
                <TouchableOpacity onPress={() => router.push('/support')} style={{ marginTop: 8 }}>
                  <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }}>
                    For any updates, you can contact us here.
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      </KeyboardAvoidingView>
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
    paddingVertical: 16,
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    marginBottom: 20,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  simpleCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  startupName: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  founderName: {
    fontSize: 13,
  },
  simpleActionsContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  simpleActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  simpleActionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    textAlign: 'center',
  },
});
