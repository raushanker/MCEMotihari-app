import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Switch, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DetailModal } from './DetailModal';
import { useAppStore } from '@/store/useAppStore';
import { useThemeColors } from '@/hooks/useThemeColors';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  presetType?: 'text' | 'photo' | 'poll' | 'anonymous' | null;
}

const CATEGORIES = [
  { id: 'General', label: 'General Feed', icon: 'chatbubbles' },
  { id: 'Placement', label: 'Career & Placement', icon: 'briefcase' },
  { id: 'Clubs', label: 'Campus Clubs', icon: 'trophy' },
  { id: 'Hostels', label: 'Hostel Feeds', icon: 'home' },
  { id: 'Departments', label: 'Departments', icon: 'school' },
  { id: 'Sports', label: 'Sports & Fests', icon: 'football' },
  { id: 'Alumni', label: 'Alumni Network', icon: 'ribbon' },
] as const;

export function CreatePostModal({ visible, onClose, presetType = null }: CreatePostModalProps) {
  const theme = useThemeColors();
  const { user, createPost, showToast } = useAppStore();

  const [category, setCategory] = useState<typeof CATEGORIES[number]['id']>('General');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // Attachments
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);

  // Polls
  const [showPollFields, setShowPollFields] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);

  // Anonymity
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Submit lockout state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initial preset
  useEffect(() => {
    if (visible) {
      // Reset state
      setTitle('');
      setContent('');
      setImageUrl('');
      setLinkUrl('');
      setShowImageInput(false);
      setShowLinkInput(false);
      setIsSubmitting(false);

      if (presetType === 'photo') {
        setShowImageInput(true);
        setShowPollFields(false);
        setIsAnonymous(false);
      } else if (presetType === 'poll') {
        setShowPollFields(true);
        setShowImageInput(false);
        setIsAnonymous(false);
        setPollOptions(['', '']);
      } else if (presetType === 'anonymous') {
        setIsAnonymous(true);
        setShowPollFields(false);
        setShowImageInput(false);
      } else {
        setShowPollFields(false);
        setShowImageInput(false);
        setIsAnonymous(false);
      }
    }
  }, [visible, presetType]);

  const handleAddPollOption = () => {
    if (pollOptions.length >= 4) {
      Alert.alert('Limit Reached', 'You can launch a poll with up to 4 options.');
      return;
    }
    setPollOptions([...pollOptions, '']);
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length <= 2) {
      Alert.alert('Required Options', 'Polls require at least 2 options.');
      return;
    }
    setPollOptions(pollOptions.filter((_, idx) => idx !== index));
  };

  const handlePollOptionChange = (text: string, index: number) => {
    const updated = [...pollOptions];
    updated[index] = text;
    setPollOptions(updated);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Required Field', 'Please write something in your post content.');
      return;
    }

    if (showPollFields) {
      const activeOptions = pollOptions.filter(opt => opt.trim() !== '');
      if (activeOptions.length < 2) {
        Alert.alert('Required Options', 'Please fill in at least 2 poll options to publish a poll.');
        return;
      }
    }

    if (!user) {
      Alert.alert('Sign In Required', 'You must be signed in to submit a post.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createPost({
        authorName: user.name || user.email || 'Anonymous Student',
        authorRole: user.role || 'Student',
        category,
        title: title.trim(),
        content: content.trim(),
        imageUrl: showImageInput && imageUrl.trim() ? imageUrl.trim() : undefined,
        linkUrl: showLinkInput && linkUrl.trim() ? linkUrl.trim() : undefined,
        isAnonymous,
        pollOptions: showPollFields ? pollOptions.filter(opt => opt.trim() !== '') : undefined,
        allowMultipleVotes: showPollFields ? allowMultipleVotes : undefined,
      });

      showToast('Post published successfully! 🎉', 'success');
      onClose();
    } catch (err) {
      console.error('Failed to submit post:', err);
      Alert.alert('Error', 'An error occurred while uploading your post. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DetailModal visible={visible} title="Create Post" onClose={onClose}>
      <View style={styles.container}>
        {/* 1. Category Selector */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Choose Channel</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroller}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.catCard,
                  { backgroundColor: theme.background, borderColor: theme.cardBorder },
                  isSelected && { backgroundColor: '#F97316', borderColor: '#F97316' }
                ]}
                onPress={() => setCategory(cat.id)}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Ionicons name={cat.icon as any} size={15} color={isSelected ? '#FFF' : theme.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.catText, { color: theme.textSecondary }, isSelected && { color: '#FFF', fontWeight: 'bold' }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 2. Anonymity Toggle */}
        <View style={[styles.toggleRow, { borderColor: theme.cardBorder }]}>
          <View style={styles.toggleTextCol}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>Post Anonymously</Text>
            <Text style={[styles.toggleDesc, { color: theme.textSecondary }]}>
              Hide your identity from students & teachers. Real name remains secure.
            </Text>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            disabled={isSubmitting}
            trackColor={{ false: '#767577', true: '#FED7AA' }}
            thumbColor={isAnonymous ? '#F97316' : '#f4f3f4'}
          />
        </View>

        {/* 3. Title Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>Title (Optional)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
            placeholder="Give your update a clear headline..."
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
            editable={!isSubmitting}
            maxLength={100}
          />
        </View>

        {/* 4. Body Content Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>What is on your mind? *</Text>
          <TextInput
            style={[styles.contentInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
            placeholder="Share syllabus, exam schedules, campus tips, placement guides, or general community highlights... Use Markdown (*italic* or **bold**) for emphasis!"
            placeholderTextColor="#94A3B8"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={5}
            editable={!isSubmitting}
            textAlignVertical="top"
          />
        </View>

        {/* 5. Attachments Buttons */}
        <View style={styles.attachmentsRow}>
          <TouchableOpacity
            style={[styles.attachBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }, showImageInput && styles.attachBtnActive]}
            onPress={() => setShowImageInput(!showImageInput)}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Ionicons name="image" size={16} color={showImageInput ? '#F97316' : theme.textSecondary} />
            <Text style={[styles.attachText, { color: theme.textSecondary }, showImageInput && { color: '#F97316' }]}>
              {showImageInput ? 'Has Image' : 'Add Image'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.attachBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }, showLinkInput && styles.attachBtnActive]}
            onPress={() => setShowLinkInput(!showLinkInput)}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Ionicons name="link" size={16} color={showLinkInput ? '#F97316' : theme.textSecondary} />
            <Text style={[styles.attachText, { color: theme.textSecondary }, showLinkInput && { color: '#F97316' }]}>
              {showLinkInput ? 'Has Link' : 'Add Link'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.attachBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }, showPollFields && styles.attachBtnActive]}
            onPress={() => setShowPollFields(!showPollFields)}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Ionicons name="stats-chart" size={16} color={showPollFields ? '#F97316' : theme.textSecondary} />
            <Text style={[styles.attachText, { color: theme.textSecondary }, showPollFields && { color: '#F97316' }]}>
              {showPollFields ? 'Has Poll' : 'Add Poll'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 5.1 Image URL Input Field */}
        {showImageInput && (
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Image URL Attachment</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
              placeholder="Paste direct Unsplash or image URL (https://...)"
              placeholderTextColor="#94A3B8"
              value={imageUrl}
              onChangeText={setImageUrl}
              editable={!isSubmitting}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        )}

        {/* 5.2 External Link URL Input Field */}
        {showLinkInput && (
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>External Reference Link</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.cardBorder, color: theme.text }]}
              placeholder="Paste article, drive or syllabus URL (https://...)"
              placeholderTextColor="#94A3B8"
              value={linkUrl}
              onChangeText={setLinkUrl}
              editable={!isSubmitting}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        )}

        {/* 5.3 Poll Option Fields */}
        {showPollFields && (
          <View style={[styles.pollSection, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
            <Text style={[styles.pollSectionTitle, { color: theme.text }]}>Configure Interactive Poll</Text>
            
            {pollOptions.map((opt, index) => (
              <View key={index} style={styles.pollOptionRow}>
                <TextInput
                  style={[styles.pollOptionInput, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, color: theme.text }]}
                  placeholder={`Option ${index + 1} label...`}
                  placeholderTextColor="#94A3B8"
                  value={opt}
                  onChangeText={(text) => handlePollOptionChange(text, index)}
                  editable={!isSubmitting}
                  maxLength={50}
                />
                {pollOptions.length > 2 && (
                  <TouchableOpacity
                    style={styles.pollOptionRemove}
                    onPress={() => handleRemovePollOption(index)}
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {pollOptions.length < 4 && (
              <TouchableOpacity
                style={[styles.addOptionBtn, { borderColor: theme.cardBorder }]}
                onPress={handleAddPollOption}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={14} color={theme.textSecondary} style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.textSecondary }}>Add Choice</Text>
              </TouchableOpacity>
            )}

            <View style={[styles.toggleRow, { borderBottomWidth: 0, paddingHorizontal: 0, marginTop: 10, paddingTop: 10 }]}>
              <View style={styles.toggleTextCol}>
                <Text style={[styles.toggleLabel, { color: theme.text, fontSize: 12.5 }]}>Allow Multiple Selections</Text>
                <Text style={[styles.toggleDesc, { color: theme.textSecondary, fontSize: 10 }]}>
                  Voters can choose more than one option.
                </Text>
              </View>
              <Switch
                value={allowMultipleVotes}
                onValueChange={setAllowMultipleVotes}
                disabled={isSubmitting}
                trackColor={{ false: '#767577', true: '#FED7AA' }}
                thumbColor={allowMultipleVotes ? '#F97316' : '#f4f3f4'}
              />
            </View>
          </View>
        )}

        {/* Submit Buttons */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>Publish Post to Feed</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </DetailModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  catScroller: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  catText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  toggleTextCol: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  toggleDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13.5,
    fontWeight: '500',
  },
  contentInput: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
    lineHeight: 18.5,
    fontWeight: '500',
  },
  attachmentsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  attachBtnActive: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  attachText: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#F97316',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
    boxShadow: `${0}px ${4}px ${6}px #F97316`,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Poll configurations
  pollSection: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  pollSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  pollOptionInput: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12.5,
    fontWeight: '500',
  },
  pollOptionRemove: {
    padding: 6,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  privateNotice: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
});

export default CreatePostModal;
