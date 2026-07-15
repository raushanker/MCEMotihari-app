import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from '@/hooks/useThemeColors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const HUMANITIES_SYLLABUS = [
  {
    id: 'cse',
    branchName: 'Computer Science and Engineering',
    icon: 'laptop-outline',
    topics: [
      { title: 'Ethics of Computing', desc: 'Coding standards, open-source licensing ethics, and algorithmic fairness.' },
      { title: 'IPR in Software', desc: 'Software patents, copyrights, and open-source software licenses (MIT, GPL).' },
      { title: 'Societal Impact', desc: 'Digital divide (technological inequality) aur digital literacy.' }
    ]
  },
  {
    id: 'cse-ai',
    branchName: 'Computer Science & Engineering (AI)',
    icon: 'hardware-chip-outline',
    topics: [
      { title: 'AI Ethics & Bias', desc: 'Machine Learning datasets me gender/racial bias aur fairness.' },
      { title: 'Privacy & Surveillance', desc: 'Data privacy laws (GDPR), facial recognition ethics, aur mass surveillance.' },
      { title: 'Future of Work', desc: 'AI automation ke chalte job displacement aur Universal Basic Income (UBI) ka concept.' }
    ]
  },
  {
    id: 'civil',
    branchName: 'Civil Engineering',
    icon: 'business-outline',
    topics: [
      { title: 'Urban Sociology', desc: 'Smart city planning, public housing policies, aur sustainable infrastructure.' },
      { title: 'Disaster Management', desc: 'Rehabilitation policies aur community-level safety planning.' },
      { title: 'Environmental Humanities', desc: 'EIA (Environmental Impact Assessment) laws aur carbon footprint reduction.' }
    ]
  },
  {
    id: 'civil-ca',
    branchName: 'Civil Engineering with Computer Application',
    icon: 'desktop-outline',
    topics: [
      { title: 'Smart Infrastructure Policy', desc: 'Smart grids aur Automated Traffic Management Systems ke administrative rules.' },
      { title: 'BIM Ethics', desc: 'Building Information Modeling (BIM) me data sharing, transparency, aur digital intellectual property.' },
      { title: 'Socio-Economic Planning', desc: 'Cost-benefit analysis of tech-driven public infrastructure.' }
    ]
  },
  {
    id: 'eee',
    branchName: 'Electrical and Electronics Engineering',
    icon: 'flash-outline',
    topics: [
      { title: 'Energy Policy & Economics', desc: 'Renewable energy subsidies, carbon credit trading, aur smart grid economics.' },
      { title: 'E-Waste Management', desc: 'Electronic items ke disposal ki global policies aur recycling supply chain ethics.' },
      { title: 'Automation Sociology', desc: 'Industrial automation ka factory workers aur labor unions par asar.' }
    ]
  },
  {
    id: 'mech',
    branchName: 'Mechanical Engineering',
    icon: 'settings-outline',
    topics: [
      { title: 'Industrial History', desc: 'Industrial Revolution se lekar modern Automation tak ki social history.' },
      { title: 'Ergonomics & Human Factors', desc: 'Human-machine interface design aur workplace ergonomics.' },
      { title: 'Labor Economics & Safety', desc: 'Factory safety laws (OSHA) aur workers\' welfare regulations.' }
    ]
  }
];

export const HumanitiesSyllabusScreen = ({ onBack }: { onBack: () => void }) => {
  const theme = useThemeColors();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.isDark ? theme.background : '#F8FAFC', borderColor: theme.cardBorder }]} onPress={onBack} activeOpacity={0.6}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Engineering Humanities</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Branch-wise social and ethical frameworks</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Ionicons name="library-outline" size={32} color="#10B981" style={{ marginBottom: 10 }} />
          <Text style={[styles.introTitle, { color: theme.text }]}>Humanities in Engineering</Text>
          <Text style={[styles.introText, { color: theme.textSecondary }]}>Explore how societal, ethical, and environmental aspects integrate with core engineering principles across different branches.</Text>
        </View>

        <View style={styles.accordionContainer}>
          {HUMANITIES_SYLLABUS.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <View key={item.id} style={[styles.branchCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                <TouchableOpacity
                  style={[styles.branchHeaderRow, { backgroundColor: theme.backgroundElement }, isExpanded && [styles.branchHeaderRowActive, { backgroundColor: theme.isDark ? theme.background : '#F8FAFC', borderBottomColor: theme.cardBorder }]]}
                  onPress={() => toggleAccordion(item.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.branchHeaderLeft}>
                    <View style={[styles.branchIconContainer, { backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }, isExpanded && [styles.branchIconContainerActive, { backgroundColor: '#10B981' }]]}>
                      <Ionicons name={item.icon as any} size={20} color={isExpanded ? '#FFFFFF' : '#10B981'} />
                    </View>
                    <Text style={[styles.branchTitle, { color: theme.textSecondary }, isExpanded && [styles.branchTitleActive, { color: theme.text }]]}>
                      {item.branchName}
                    </Text>
                  </View>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={isExpanded ? theme.text : theme.textSecondary} />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.topicsList, { backgroundColor: theme.backgroundElement }]}>
                    {item.topics.map((topic, idx) => (
                      <View key={idx} style={[styles.topicRow, { borderBottomColor: theme.cardBorder, borderBottomWidth: idx < item.topics.length - 1 ? 1 : 0 }]}>
                        <Text style={[styles.topicTitle, { color: theme.primary }]}>{topic.title}</Text>
                        <Text style={[styles.topicDesc, { color: theme.textSecondary }]}>{topic.desc}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
        <View style={{ height: 40 }} />
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  headerTitleCol: { flex: 1, justifyContent: 'center' },
  headerTitle: { fontSize: 16.5, fontWeight: '800', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  scrollContent: { padding: 16, paddingBottom: 140 },
  introCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  introTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  introText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  accordionContainer: { gap: 12 },
  branchCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 3px 8px rgba(15, 23, 42, 0.05)' },
      default: { elevation: 2 }
    })
  },
  branchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  branchHeaderRowActive: { borderBottomWidth: 1 },
  branchHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  branchIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchIconContainerActive: {},
  branchTitle: { fontSize: 14.5, fontWeight: '600', flexShrink: 1 },
  branchTitleActive: { fontWeight: '800' },
  topicsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topicRow: {
    paddingVertical: 12,
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  topicDesc: {
    fontSize: 13,
    lineHeight: 20,
  }
});
