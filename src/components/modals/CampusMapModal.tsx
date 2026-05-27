import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { Ionicons } from '@expo/vector-icons';
import { DetailModal } from './DetailModal';
import { useThemeColors } from '@/hooks/useThemeColors';

const { width } = Dimensions.get('window');

interface CampusMapModalProps {
  visible: boolean;
  onClose: () => void;
}

const CAMPUS_MAP_SECTORS = [
  { num: '1', name: 'New Academic Building', category: 'Academic', icon: 'school' },
  { num: '2', name: 'Academic Building / Workshop', category: 'Academic', icon: 'hammer' },
  { num: '3', name: 'Sports Ground', category: 'Sports', icon: 'football', mapsLink: 'https://maps.app.goo.gl/XtXVykMYQAkgUkS49' },
  { num: '4', name: 'Post-Office', category: 'Amenity', icon: 'mail' },
  { num: '5', name: 'ATM & Stationary Shop', category: 'Amenity', icon: 'cash', mapsLink: 'https://maps.app.goo.gl/HJQ8zTSruKpkonPf7' },
  { num: '6', name: 'Main Parking Area', category: 'Utility', icon: 'car' },
  { num: '7', name: 'Campus Canteen', category: 'Dining', icon: 'restaurant' },
  { num: '8, 9', name: "Assistant Professor's Quarters", category: 'Residence', icon: 'people' },
  { num: '10', name: "Professor's Quarters", category: 'Residence', icon: 'person' },
  { num: '11', name: 'Principal Residence', category: 'Residence', icon: 'home' },
  { num: '12, 13', name: 'Girls Hostel Wing', category: 'Residence', icon: 'female' },
  { num: '14', name: 'Classrooms No. 8-16 Block', category: 'Academic', icon: 'easel' },
  { num: '15', name: 'Health Centre & Dispensary', category: 'Medical', icon: 'medkit' },
  { num: '16', name: 'Civil Engineering Department', category: 'Academic', icon: 'construct' },
  { num: '17', name: 'Campus Temple', category: 'Spiritual', icon: 'heart', mapsLink: 'https://maps.app.goo.gl/81NgrKpUNrAB66rx6' },
  { num: '17A', name: 'Shiv Temple (Near Academic Block 1)', category: 'Spiritual', icon: 'heart', mapsLink: 'https://maps.app.goo.gl/LH47gFsTwVqke1qy5' },
  { num: '18', name: 'Old Boys Hostel', category: 'Residence', icon: 'male', mapsLink: 'https://maps.app.goo.gl/F7AvLHs3WbTASDFYA' },
  { num: '19, 20', name: 'Staff Quarters', category: 'Residence', icon: 'business' },
  { num: '21, 22', name: 'New Boys Hostel Wing', category: 'Residence', icon: 'ribbon', mapsLink: 'https://maps.app.goo.gl/F7AvLHs3WbTASDFYA' },
  { num: '23', name: 'Open Development Land', category: 'Utility', icon: 'leaf' }
];

const OFF_CAMPUS_LANDMARKS = [
  { name: 'Bypass Chowk', desc: 'Major highway transit junction (3.0 km away)', category: 'Transit', icon: 'bus', mapsLink: 'https://maps.app.goo.gl/GQfLL3Z4g6F6CNtX7' },
  { name: 'Motihari Railway Station', desc: 'Main railway connectivity hub (6.0 km away)', category: 'Transit', icon: 'train', mapsLink: 'https://maps.app.goo.gl/e9ezXNRrMwZp2jas5' },
  { name: 'Gandhi Maidan, Motihari', desc: 'Public playground & gathering hub (6.0 km away)', category: 'Recreation', icon: 'football', mapsLink: 'https://maps.app.goo.gl/noNq455SqdkJo4As7' },
  { name: 'Sadar Hospital Motihari', desc: 'Primary government medical center (7.5 km away)', category: 'Medical', icon: 'medkit', mapsLink: 'https://maps.app.goo.gl/cByC3RxiqzQA5qaU9' },
  { name: 'Satyagrah Smarak Park', desc: 'Historic memorial park & garden (8.0 km away)', category: 'Recreation', icon: 'leaf', mapsLink: 'https://maps.app.goo.gl/HZrQnRBqH4KvDktg8' }
];

export function CampusMapModal({ visible, onClose }: CampusMapModalProps) {
  const theme = useThemeColors();
  const [isFullScreenVisible, setIsFullScreenVisible] = React.useState(false);

  // Prevent screenshots and screen recording when the confidential blueprint is open
  React.useEffect(() => {
    let subscription: any;
    if (isFullScreenVisible) {
      ScreenCapture.preventScreenCaptureAsync().catch(err => {
        console.warn('Failed to enable screenshot block:', err);
      });

      // Trigger native popup dialog when screenshot action is taken
      subscription = ScreenCapture.addScreenshotListener(() => {
        Alert.alert(
          "🔒 Screenshot Blocked",
          "Confidential MCE Motihari campus blueprint data is protected. Sharing or capturing the site plan is not allowed.",
          [{ text: "I Understand", style: "default" }]
        );
      });
    } else {
      ScreenCapture.allowScreenCaptureAsync().catch(err => {
        console.warn('Failed to disable screenshot block:', err);
      });
    }
    return () => {
      if (subscription) subscription.remove();
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, [isFullScreenVisible]);

  const handleOpenGoogleMaps = () => {
    Linking.openURL('https://maps.app.goo.gl/QqfUoUAaDgjRuKPm6').catch(err => {
      console.warn('Failed to open Google Maps link:', err);
      alert('Could not open map link.');
    });
  };

  const getCategoryColor = (category: string) => {
    if (category === 'Academic') return '#3B82F6'; // Blue
    if (category === 'Residence') return '#A855F7'; // Purple
    if (category === 'Sports') return '#10B981'; // Green
    if (category === 'Amenity') return '#F59E0B'; // Yellow/Amber
    if (category === 'Utility') return '#64748B'; // Slate
    if (category === 'Dining') return '#EF4444'; // Red
    return '#F97316'; // Orange
  };

  const getOffCampusColor = (category: string) => {
    if (category === 'Transit') return '#EC4899'; // Pink
    if (category === 'Medical') return '#EF4444'; // Red
    if (category === 'Recreation') return '#10B981'; // Green
    return '#F97316'; // Orange
  };

  return (
    <DetailModal visible={visible} title="Interactive Campus Map" onClose={onClose}>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        View the official site layout and facilities map of Motihari College of Engineering. Navigate to different sectors or track real-world GPS coordinates on Google Maps.
      </Text>
      
      {/* Official Map Image Container */}
      <TouchableOpacity
        style={[styles.mapContainer, { borderColor: theme.cardBorder, backgroundColor: theme.background }]}
        onPress={() => setIsFullScreenVisible(true)}
        activeOpacity={0.9}
      >
        <Image
          source={require('../../../assets/images/mce plan.jpg')}
          style={styles.mapImage}
          resizeMode="contain"
        />
        <View style={styles.imageOverlayBadge}>
          <Text style={styles.imageOverlayBadgeText}>🔍 Tap to Zoom</Text>
        </View>
      </TouchableOpacity>

      {/* Google Maps Redirect Card */}
      <TouchableOpacity
        style={[styles.mapsBtn, { shadowColor: theme.isDark ? '#000000' : '#0F172A' }]}
        onPress={handleOpenGoogleMaps}
        activeOpacity={0.85}
      >
        <Ionicons name="location" size={18} color="#FFFFFF" />
        <View style={styles.mapsBtnTextCol}>
          <Text style={styles.mapsBtnTitle}>Navigate on Google Maps</Text>
          <Text style={styles.mapsBtnSub}>Open real-world GPS satellite coordinates</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Aligned Particulars Title */}
      <Text style={[styles.sectionHeader, { color: theme.text }]}>Campus Locations & Particulars</Text>

      {/* Correct particulars list from Site Plan */}
      {CAMPUS_MAP_SECTORS.map((sector) => (
        <View
          key={sector.num}
          style={[styles.sectorCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
        >
          <View style={[styles.numberBadge, { backgroundColor: getCategoryColor(sector.category) }]}>
            <Text style={styles.numberBadgeText}>{sector.num}</Text>
          </View>
          <View style={styles.sectorMeta}>
            <Text style={[styles.sectorName, { color: theme.text }]}>{sector.name}</Text>
            <View style={styles.categoryRow}>
              <Ionicons name={sector.icon as any} size={10} color={getCategoryColor(sector.category)} />
              <Text style={[styles.sectorDesc, { color: theme.textSecondary }]}>
                {sector.category} Sector
              </Text>
            </View>
          </View>

          {/* Dynamic Map Icon Link */}
          {sector.mapsLink && (
            <TouchableOpacity
              style={[styles.miniMapLinkBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
              onPress={() => {
                Linking.openURL(sector.mapsLink!).catch(err => {
                  console.warn('Failed to open specific map link:', err);
                });
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="map-outline" size={12} color="#3B82F6" />
              <Text style={styles.miniMapLinkText}>NAV</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {/* Off-Campus Essentials Title */}
      <Text style={[styles.sectionHeader, { color: theme.text, marginTop: 24 }]}>Off-Campus Travel & Essentials</Text>

      {/* Off-campus list */}
      {OFF_CAMPUS_LANDMARKS.map((landmark) => (
        <View
          key={landmark.name}
          style={[styles.sectorCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}
        >
          <View style={[styles.numberBadge, { backgroundColor: getOffCampusColor(landmark.category) }]}>
            <Ionicons name={landmark.icon as any} size={14} color="#FFFFFF" />
          </View>
          <View style={styles.sectorMeta}>
            <Text style={[styles.sectorName, { color: theme.text }]}>{landmark.name}</Text>
            <View style={styles.categoryRow}>
              <Text style={[styles.sectorDesc, { color: theme.textSecondary }]}>
                {landmark.desc}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.miniMapLinkBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
            onPress={() => {
              Linking.openURL(landmark.mapsLink).catch(err => {
                console.warn('Failed to open specific map link:', err);
              });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="map-outline" size={12} color="#3B82F6" />
            <Text style={styles.miniMapLinkText}>NAV</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Full-Screen Image Viewer Modal */}
      <Modal visible={isFullScreenVisible} transparent animationType="fade" onRequestClose={() => setIsFullScreenVisible(false)}>
        <View style={styles.fullScreenBackdrop}>
          {/* Header Close Trigger */}
          <TouchableOpacity
            style={styles.fullScreenCloseBtn}
            onPress={() => setIsFullScreenVisible(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={34} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Centered ScrollView for Pinch-to-Zoom */}
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.fullScreenZoomScroll}
          >
            <Image
              source={require('../../../assets/images/mce plan.jpg')}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          </ScrollView>

          {/* Footer Copyright Branding */}
          <View style={styles.fullScreenFooter}>
            <Text style={styles.copyrightText}>
              Copyright © Motihari College of Engineering
            </Text>
            <Text style={styles.websiteText}>
              www.mcemotihari.ac.in
            </Text>
          </View>
        </View>
      </Modal>
    </DetailModal>
  );
}

const styles = StyleSheet.create({
  richTextParagraph: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  mapContainer: {
    width: '100%',
    height: 220,
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  imageOverlayBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mapsBtnTextCol: {
    flex: 1,
  },
  mapsBtnTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  mapsBtnSub: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  sectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    width: '100%',
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  numberBadgeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
  },
  sectorMeta: {
    flex: 1,
    gap: 3,
  },
  sectorName: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectorDesc: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  miniMapLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 8,
  },
  miniMapLinkText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3B82F6',
    letterSpacing: 0.2,
  },
  fullScreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 99,
  },
  fullScreenImage: {
    width: width,
    height: '100%',
  },
  fullScreenZoomScroll: {
    flex: 1,
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenFooter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    alignItems: 'center',
    width: '100%',
  },
  copyrightText: {
    color: '#94A3B8',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  websiteText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
});

export default CampusMapModal;
