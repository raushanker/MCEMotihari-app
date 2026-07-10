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
          <Text style={[styles.expandedTitle, { color: theme.text }]}>Last Updated: 10 July 2026</Text>
          <Text style={[styles.expandedText, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: 'bold', color: theme.text }}>1. Introduction & Scope:</Text> Welcome to the MCE Connect platform. We are deeply committed to safeguarding your personal data while providing a seamless networking and academic experience. This policy governs all features including Community Rooms, Department Hubs, and the E-Cell ecosystem.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>2. Data Collection & Cloud Storage:</Text> We collect essential verifiable data (Name, Roll No, Branch, Batch) strictly for campus authentication. Your real-time chat messages, posts, and profile avatars are securely processed via Firebase. Media files (such as images shared in chat or posts) are securely hosted on Cloudinary. We never sell your data to third parties.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>3. Data Control & Deletion:</Text> You retain full control over your data. With our "Delete for Everyone" feature in chat rooms, your messages are permanently scrubbed from our active servers. Complete account deletion will irreversibly erase your profile, posts, and cloud data.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>4. Local Device Storage:</Text> To ensure blazing fast performance and privacy, specific data such as notepad entries, bookmarks, UI preferences, and read-receipts for chat rooms are stored locally on your device memory.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>5. Public Community Content:</Text> Content shared in the global feed, Community Lobbies, Department Notice Boards, and E-Cell showcases is visible to verified members. Please exercise discretion and refrain from sharing sensitive personal information publicly.
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
          <Text style={[styles.expandedTitle, { color: theme.text }]}>Last Updated: 10 July 2026</Text>
          <Text style={[styles.expandedText, { color: theme.textSecondary }]}>
            <Text style={{ fontWeight: 'bold', color: theme.text }}>1. Automated Moderation & Etiquette:</Text> We enforce a strictly professional and respectful environment. Our automated AI Spam & Profanity Filters actively monitor the global feeds and real-time chat rooms. Bullying, harassment, or offensive language will lead to immediate account suspension.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>2. Community & Department Rooms:</Text> The Community Lobbies (e.g., Sports, Coding, Alumni) and Department Notice Boards are dedicated spaces for constructive discussions and official updates. Please ensure your contributions remain relevant to the respective room's topic.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>3. Academic Integrity & Copyright:</Text> When sharing study materials, notes, or resources in the app, ensure you are not violating copyright laws. You must possess the right to distribute the intellectual property you share.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>4. Administrative Rights & Verification:</Text> Access to the platform is strictly authenticated against campus records. The administrative team retains the ultimate right to silently remove violative content, block users, or terminate accounts to maintain community standards.
            {"\n\n"}
            <Text style={{ fontWeight: 'bold', color: theme.text }}>5. Independent Platform Disclaimer:</Text> MCE Connect is an independent, student and alumni-led digital initiative. Features such as the E-Cell Startup Showcase are intended for networking and visibility purposes only. The platform does not officially represent the college administration.
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
