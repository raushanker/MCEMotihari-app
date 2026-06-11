import React from 'react';
import { Platform, StyleSheet, View, Text, TouchableOpacity, Share, Linking, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Faculty } from '@/data/faculty';
import { DEPARTMENTS } from '@/data/departments';
import { useThemeColors } from '@/hooks/useThemeColors';

interface FacultyProfileScreenProps {
  faculty: Faculty;
  onBack: () => void;
}

export const FacultyProfileScreen: React.FC<FacultyProfileScreenProps> = ({ faculty, onBack }) => {
  const theme = useThemeColors();

  const departmentName = DEPARTMENTS.find(d => d.id === faculty.department)?.name || faculty.department;

  const handleShare = async () => {
    try {
      await Share.share({
        title: faculty.name,
        message: `Read about ${faculty.name} (${faculty.designation}, ${departmentName}) on the official college portal:\n${faculty.profileUrl}\n\nShared from MCE Connect app.\nDownload here: https://play.google.com/store/apps/details?id=mcemotihari.app`,
      });
    } catch (error) {
      console.warn('Failed to share profile link:', error);
    }
  };

  const handleOpenBrowser = () => {
    Linking.openURL(faculty.profileUrl);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.isDark ? theme.background : '#F1F5F9' }]} onPress={onBack} activeOpacity={0.6}>
          <Ionicons name="close" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{faculty.name}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>Native Profile View</Text>
        </View>
        <TouchableOpacity style={[styles.shareButton, { backgroundColor: theme.isDark ? theme.background : '#F1F5F9' }]} onPress={handleShare} activeOpacity={0.6}>
          <Ionicons name="share-social" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* paddingBottom: 100 added here to prevent bottom bar overlap */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Main Info Card */}
        <View style={[styles.nativeCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={[styles.nativeAvatar, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF', borderColor: theme.isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE' }]}>
            {faculty.imageUrl ? (
              <Image source={faculty.imageUrl} style={styles.profileImage} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <Ionicons name="person" size={40} color="#3B82F6" />
            )}
          </View>
          <Text style={[styles.nativeName, { color: theme.text }]}>{faculty.name}</Text>
          <Text style={[styles.nativeDesignation, { color: theme.primary }]}>{faculty.designation}</Text>
          <Text style={[styles.nativeDepartment, { color: theme.textSecondary }]}>{departmentName}</Text>
          
          <View style={[styles.nativeDivider, { backgroundColor: theme.cardBorder }]} />



          <View style={styles.nativeInfoRow}>
            <View style={[styles.nativeIconBox, { backgroundColor: theme.isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5' }]}>
              <Ionicons name="briefcase-outline" size={18} color="#10B981" />
            </View>
            <View style={styles.nativeInfoText}>
              <Text style={[styles.nativeInfoLabel, { color: theme.textSecondary }]}>Nature Of Association</Text>
              <Text style={[styles.nativeInfoValue, { color: theme.text }]}>Regular</Text>
            </View>
          </View>

          <View style={styles.nativeInfoRow}>
            <View style={[styles.nativeIconBox, { backgroundColor: theme.isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB' }]}>
              <Ionicons name="call-outline" size={18} color="#F59E0B" />
            </View>
            <View style={styles.nativeInfoText}>
              <Text style={[styles.nativeInfoLabel, { color: theme.textSecondary }]}>Phone Number</Text>
              <Text style={[styles.nativeInfoValue, { color: theme.text }]}>{faculty.phone || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Details Section */}
        {(faculty.qualifications || faculty.subjectExpertise || faculty.areaOfResearch || faculty.publications) && (
          <View style={[styles.detailsContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            {faculty.qualifications && (
              <View style={styles.detailSection}>
                <Text style={[styles.detailHeader, { color: theme.text }]}>Qualifications</Text>
                <Text style={[styles.detailBody, { color: theme.textSecondary }]}>{faculty.qualifications}</Text>
              </View>
            )}
            {faculty.subjectExpertise && (
              <>
                {faculty.qualifications && <View style={[styles.detailDivider, { backgroundColor: theme.cardBorder }]} />}
                <View style={styles.detailSection}>
                  <Text style={[styles.detailHeader, { color: theme.text }]}>Subject Expertise</Text>
                  <Text style={[styles.detailBody, { color: theme.textSecondary }]}>{faculty.subjectExpertise}</Text>
                </View>
              </>
            )}
            {faculty.areaOfResearch ? (
              <>
                {(faculty.qualifications || faculty.subjectExpertise) && <View style={[styles.detailDivider, { backgroundColor: theme.cardBorder }]} />}
                <View style={styles.detailSection}>
                  <Text style={[styles.detailHeader, { color: theme.text }]}>Area Of Research</Text>
                  <View style={[styles.listContainer, { backgroundColor: theme.isDark ? theme.background : '#FAFAFA', borderColor: theme.cardBorder }]}>
                    {(() => {
                      const items = faculty.areaOfResearch!.split('\n').map(i => i.trim()).filter(Boolean);
                      return items.map((item, index) => (
                        <View key={index} style={[styles.listItem, { borderBottomColor: theme.cardBorder, borderBottomWidth: index === items.length - 1 ? 0 : 1 }]}>
                          {items.length > 1 && <Text style={[styles.listIndex, { color: theme.primary }]}>{index + 1}.</Text>}
                          <Text style={[styles.listText, { color: theme.textSecondary }]}>{item}</Text>
                        </View>
                      ));
                    })()}
                  </View>
                </View>
              </>
            ) : null}
            {faculty.publications ? (
              <>
                {(faculty.qualifications || faculty.subjectExpertise || faculty.areaOfResearch) && <View style={[styles.detailDivider, { backgroundColor: theme.cardBorder }]} />}
                <View style={styles.detailSection}>
                  <Text style={[styles.detailHeader, { color: theme.text }]}>Some Publications</Text>
                  <View style={[styles.listContainer, { backgroundColor: theme.isDark ? theme.background : '#FAFAFA', borderColor: theme.cardBorder }]}>
                    {(() => {
                      const items = faculty.publications!.split('\n').map(i => i.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
                      return items.map((item, index) => (
                        <View key={index} style={[styles.listItem, { borderBottomColor: theme.cardBorder, borderBottomWidth: index === items.length - 1 ? 0 : 1 }]}>
                          {items.length > 1 && <Text style={[styles.listIndex, { color: theme.primary }]}>{index + 1}.</Text>}
                          <Text style={[styles.listText, { color: theme.textSecondary }]}>{item}</Text>
                        </View>
                      ));
                    })()}
                  </View>
                  <TouchableOpacity onPress={handleOpenBrowser} style={[styles.viewAllPublicationsBtn, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)' }]}>
                    <Text style={[styles.viewAllPublicationsText, { color: theme.primary }]}>View all on official website ↗</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        )}

        <View style={[styles.disclaimerContainer, { backgroundColor: theme.isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 193, 7, 0.1)', borderColor: theme.isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 193, 7, 0.3)' }]}>
          <Text style={[styles.disclaimerText, { color: theme.isDark ? '#FCD34D' : '#B45309' }]}>
            Disclaimer: The details shown above are fetched from the official college website. Information may change over time, so please visit the official website for the most accurate and latest information.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.nativeWebsiteBtn, { backgroundColor: theme.primary }]}
          onPress={handleOpenBrowser}
          activeOpacity={0.8}
        >
          <Ionicons name="globe-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.nativeWebsiteBtnText}>View Full Profile in Browser</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    zIndex: 10,
    ...Platform.select({
      android: { elevation: 4 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
      web: { zIndex: 10 }
    })
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitleCol: { flex: 1, justifyContent: 'center' },
  headerTitle: { fontSize: 14.5, fontWeight: '700' },
  headerSubtitle: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nativeCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0px 4px 16px rgba(15, 23, 42, 0.04)' },
      default: { elevation: 2 }
    })
  },
  nativeAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#DBEAFE',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  nativeName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  nativeDesignation: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  nativeDepartment: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  nativeDivider: {
    height: 1,
    width: '100%',
    marginBottom: 20,
  },
  nativeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  nativeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  nativeInfoText: {
    flex: 1,
  },
  nativeInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nativeInfoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailsContainer: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0px 4px 16px rgba(15, 23, 42, 0.04)' },
      default: { elevation: 2 }
    })
  },
  detailSection: {
    width: '100%',
  },
  detailHeader: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  detailBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailDivider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  listContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  listItem: {
    flexDirection: 'row',
    padding: 12,
  },
  listIndex: {
    fontWeight: '700',
    marginRight: 8,
    fontSize: 14,
    minWidth: 18,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  nativeWebsiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
  },
  nativeWebsiteBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disclaimerContainer: {
    padding: 12,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#B45309', // Dark amber/orange for readability
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  viewAllPublicationsBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  viewAllPublicationsText: {
    fontSize: 13,
    fontWeight: '600',
  }
});
