import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { DetailModal } from './DetailModal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';


interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateOut?: () => void;
}

export function PrivacyModal({ visible, onClose, onNavigateOut }: PrivacyModalProps) {
  const theme = useThemeColors();
  const router = useRouter();
  
  // State for Accordion: stores the ID of the currently expanded section
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleNavigate = (path: any) => {
    onClose();
    if (onNavigateOut) onNavigateOut();
    setTimeout(() => {
      router.push(path);
    }, 300);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const ACCORDION_DATA = [
    {
      id: 'support',
      title: 'Contact Tech Support',
      subtitle: 'Report technical issues or copyright claims',
      icon: 'headset-outline',
      iconBg: 'rgba(59, 130, 246, 0.1)',
      iconColor: '#3B82F6',
      content: (
        <>
          <Text style={[styles.expandedText, { color: theme.textSecondary }]}>
            If you encounter login errors, crash freezes, failed picture attachments, or want to report copyright complaints, please reach out to our tech team.
          </Text>
          <Text style={[styles.emailText, { color: '#3B82F6' }]}>mcemotihari.tech@gmail.com</Text>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]} onPress={() => handleNavigate('/support')}>
            <Text style={styles.actionBtnText}>Open Support Desk</Text>
          </TouchableOpacity>
        </>
      )
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      subtitle: 'Review data collection and security',
      icon: 'shield-checkmark-outline',
      iconBg: 'rgba(249, 115, 22, 0.1)',
      iconColor: '#F97316',
      content: (
        <>
          <Text style={[styles.expandedTitle, { color: theme.text }]}>Last Updated: 12 June 2026</Text>
          <Text style={[styles.expandedText, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: 'bold', color: theme.text }}>1. Introduction:</Text> Welcome to the MCE Connect platform. We respect the privacy of our community members and are committed to safeguarding your personal data.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>2. Local Storage:</Text> All your notepad entries and bookmarks reside strictly on your device's local memory.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>3. Profile Visibility:</Text> Your profile details are public to other verified campus students. You may use a custom Avatar if you prefer to hide your real face.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>4. Data Collection:</Text> We collect minimal necessary data (Name, Roll No, Branch, Batch) solely for campus verification and peer networking. We do not sell your data to third parties.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>5. Community Content:</Text> Posts, comments, and study materials you upload are visible to the community. Please avoid uploading sensitive personal information.
          </Text>
        </>
      )
    },
    {
      id: 'terms',
      title: 'Terms & Guidelines',
      subtitle: 'Read community behavior rules',
      icon: 'document-text-outline',
      iconBg: 'rgba(16, 185, 129, 0.1)',
      iconColor: '#10B981',
      content: (
        <>
          <Text style={[styles.expandedTitle, { color: theme.text }]}>Last Updated: 12 June 2026</Text>
          <Text style={[styles.expandedText, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: 'bold', color: theme.text }}>1. Respectful Behavior:</Text> Strictly professional discussions only. No inappropriate language, bullying, or offensive posts.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>2. Academic & Copyright:</Text> Academic resources must not violate copyright rules. Only share materials you have the right to distribute.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>3. Identity Verification:</Text> Verified student roll numbers are checked. False profiles will be terminated immediately.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>4. Moderation Rights:</Text> The admin team reserves the right to remove any post, comment, or user profile that violates community standards without prior notice.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>5. Disclaimer & Liability:</Text> MCE Connect is an independent student/alumni-led initiative. We do not represent the official college administration.
          </Text>
        </>
      )
    },
    {
      id: 'delete',
      title: 'Delete Account',
      subtitle: 'Permanently remove your data',
      icon: 'trash-outline',
      iconBg: 'rgba(239, 68, 68, 0.1)',
      iconColor: '#EF4444',
      content: (
        <>
          <Text style={[styles.expandedText, { color: theme.textSecondary }]}>
            Account deletion is irreversible. It will permanently remove your profile, posts, comments, and all associated cloud data from MCE Connect.
          </Text>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleNavigate('/delete-account')}>
            <Text style={styles.actionBtnText}>Proceed to Account Deletion</Text>
          </TouchableOpacity>
        </>
      )
    }
  ];

  return (
    <DetailModal visible={visible} title="Help & Legal Hub" onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Support Intro */}
        <Text style={[styles.richTextParagraph, { color: theme.textSecondary, marginTop: 10, marginBottom: 20 }]}>
          Welcome to the MCE Connect Help Center. If you need assistance or want to review our policies, please choose an option below.
        </Text>

        {ACCORDION_DATA.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <View 
              key={item.id} 
              style={[
                styles.accordionContainer, 
                { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder },
                isExpanded && { borderColor: item.iconColor, backgroundColor: theme.background }
              ]}
            >
              <TouchableOpacity 
                style={styles.accordionHeader}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBg, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
                </View>
                <Ionicons 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color={isExpanded ? item.iconColor : theme.textSecondary} 
                />
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={[styles.accordionContent, { borderTopColor: theme.cardBorder }]}>
                  {item.content}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </DetailModal>
  );
}

const styles = StyleSheet.create({
  richTextParagraph: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  accordionContainer: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  accordionContent: {
    padding: 14,
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 14,
  },
  expandedTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  expandedText: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 12,
  },
  emailText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardText: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 10,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
  },
});
export default PrivacyModal;
