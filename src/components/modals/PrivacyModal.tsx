import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { DetailModal } from './DetailModal';
import { useThemeColors } from '@/hooks/useThemeColors';

interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PrivacyModal({ visible, onClose }: PrivacyModalProps) {
  const theme = useThemeColors();

  return (
    <DetailModal visible={visible} title="Privacy & Community Policy" onClose={onClose}>
      <Text style={[styles.richTextHeader, { color: theme.text }]}>Community Guidelines</Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        1. Strictly professional discussions only. No inappropriate language, harassment, or offensive posts.
      </Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        2. Academic resources must not violate copyright rules. Share only open notes, syllabus documents, and exam guides.
      </Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        3. Verified student batch roll numbers are checked by departmental leads. False verification profiles will be terminated.
      </Text>

      <Text style={[styles.richTextHeader, { color: theme.text }]}>Profile Data & Public Visibility</Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        When you configure your academic account on MCE Connect, you can set up your profile photo, display name, engineering branch, and batch year. Please note that this information will be public and visible to other verified campus students, alumni mentors, and faculty members in the campus network directory to foster authentic networking.
      </Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        🔒 <Text style={{ fontWeight: 'bold', color: theme.text }}>Privacy Options:</Text> If you prefer not to display your real face photo, you are welcome to use any of the creative custom preset Avatars (or paste any third-party character graphic URL) to keep your face identity shielded.
      </Text>

      <Text style={[styles.richTextHeader, { color: theme.text }]}>Local Data Storage & Privacy Policy</Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        To protect your absolute academic privacy, all notes entered in the personal Notepad and bookmarked subjects from the Syllabus Explorer reside strictly on your device's local memory (using secure AsyncStorage).
      </Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        ⚠️ <Text style={{ fontWeight: 'bold', color: theme.text }}>Important Data Notice:</Text> We do not provide any cloud synchronization or remote backups for this data. All notepad and coursework bookmarks are completely and permanently deleted if you uninstall the MCE Connect app from your phone, clear your phone's storage cache, or reset your device.
      </Text>

      <Text style={[styles.richTextHeader, { color: theme.text }]}>Complaints & Suggestions</Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        We value your security and experience. If you have any complaints regarding content, user behavior, or want to share general suggestions to make the platform better, please email us at:
      </Text>
      <Text style={styles.emailText}>
        mcemotihari.tech@gmail.com
      </Text>

      <Text style={[styles.richTextHeader, { color: theme.text }]}>Tech Help & Content Contribution</Text>
      <Text style={[styles.richTextParagraph, { color: theme.textSecondary }]}>
        Want to help improve this app? If you are a developer looking for tech-related help or want to contribute learning notes, syllabus PDFs, and study materials, please reach out to the tech team at:
      </Text>
      <Text style={[styles.emailText, { marginBottom: 20 }]}>
        mcemotihari.tech@gmail.com
      </Text>
    </DetailModal>
  );
}

const styles = StyleSheet.create({
  richTextHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 6,
  },
  richTextParagraph: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  emailText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F97316',
    marginVertical: 4,
  },
});
export default PrivacyModal;
