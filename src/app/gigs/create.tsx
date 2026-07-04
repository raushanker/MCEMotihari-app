import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGigsStore } from '@/store/useGigsStore';
import { useAppStore } from '@/store/useAppStore';

const REWARD_OPTIONS = [
  { id: 'Paid work', icon: 'cash-outline' },
  { id: 'Party/Treat', icon: 'pizza-outline' },
  { id: 'Chai+Samosa treat', icon: 'cafe-outline' },
  { id: 'Trip sponsored', icon: 'airplane-outline' },
  { id: 'Certificate', icon: 'ribbon-outline' },
  { id: 'Recommendations', icon: 'star-outline' },
  { id: 'Any other', icon: 'options-outline' }
];

const TITLE_SUGGESTIONS = [
  'Research Assistant',
  'Volunteer for Campaign',
  'Assignment Help',
  'Project Work Help',
];


export default function CreateGigScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAppStore(state => state.user);
  const { createGig } = useGigsStore();
  const showToast = useAppStore(state => state.showToast);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardType, setRewardType] = useState('Paid work');
  const [customReward, setCustomReward] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePost = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Incomplete', 'Please provide a title and description.');
      return;
    }
    if (rewardType === 'Any other' && !customReward.trim()) {
      Alert.alert('Incomplete', 'Please specify the custom reward.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to post.');
      return;
    }

    setIsSubmitting(true);
    try {
      const gigData: any = {
        title: title.trim(),
        description: description.trim(),
        rewardType,
        authorUid: user.uid,
        authorName: user.name || 'Anonymous',
        authorPhoto: user.photoUrl || null,
        authorRole: user.role || 'student',
        authorAdminRole: user.adminRole || null,
        status: 'open',
      };
      
      if (rewardType === 'Any other') {
        gigData.customReward = customReward.trim();
      }

      await createGig(gigData);
      showToast('Requirement posted successfully!', 'success');
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to post requirement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: theme.headerBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Post Requirement</Text>
        <TouchableOpacity 
          style={[styles.postBtn, (!title.trim() || !description.trim()) && { opacity: 0.5 }]}
          onPress={handlePost}
          disabled={isSubmitting || !title.trim() || !description.trim()}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={theme.isDark ? '#60A5FA' : theme.primary} />
          ) : (
            <Text style={[styles.postBtnText, { color: theme.isDark ? '#60A5FA' : theme.primary }]}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Title / Requirement</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {TITLE_SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.rewardChip,
                    {
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: title === s ? (theme.isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(15, 23, 42, 0.08)') : theme.cardBackground,
                      borderColor: title === s ? (theme.isDark ? '#60A5FA' : theme.primary) : theme.border,
                    }
                  ]}
                  onPress={() => setTitle(s)}
                >
                  <Text style={[
                    styles.rewardChipText,
                    {
                      marginLeft: 0,
                      fontSize: 13,
                      color: title === s ? (theme.isDark ? '#60A5FA' : theme.primary) : theme.textSecondary,
                      fontFamily: title === s ? 'Inter-SemiBold' : 'Inter-Medium'
                    }
                  ]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.cardBackground }]}
            placeholder="e.g., Need a Research Assistant for ML Project"
            placeholderTextColor={theme.textSecondary + '80'}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={{ textAlign: 'right', fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
            {title.length}/100
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Detailed Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.cardBackground }]}
            placeholder="Explain what help you need, the timeline, and expected skills..."
            placeholderTextColor={theme.textSecondary + '80'}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={{ textAlign: 'right', fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
            {description.length}/1000
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Reward / Offering</Text>
          <Text style={[styles.subLabel, { color: theme.textSecondary }]}>What will the person get in return?</Text>
          
          <View style={styles.rewardGrid}>
            {REWARD_OPTIONS.map((option) => {
              const isSelected = rewardType === option.id;
              const selectedColor = theme.isDark ? '#60A5FA' : theme.primary;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.rewardChip,
                    { 
                      backgroundColor: isSelected ? (theme.isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(15, 23, 42, 0.08)') : theme.cardBackground,
                      borderColor: isSelected ? selectedColor : theme.border 
                    }
                  ]}
                  onPress={() => setRewardType(option.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={option.icon as any} 
                    size={16} 
                    color={isSelected ? selectedColor : theme.textSecondary} 
                  />
                  <Text style={[
                    styles.rewardChipText, 
                    { color: isSelected ? selectedColor : theme.textSecondary, fontFamily: isSelected ? 'Inter-SemiBold' : 'Inter-Medium' }
                  ]}>
                    {option.id}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {rewardType === 'Any other' && (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Specify Reward</Text>
            <View style={{ marginTop: 4 }}>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.cardBackground }]}
                placeholder="E.g., Books, Coffee, Movie ticket"
                placeholderTextColor={theme.textSecondary + '80'}
                value={customReward}
                onChangeText={setCustomReward}
                maxLength={50}
              />
              <Text style={{ textAlign: 'right', fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                {customReward.length}/50
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  postBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  postBtnText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  scrollContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginTop: -4,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  textArea: {
    height: 120,
    paddingTop: 14,
  },
  rewardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  rewardChipText: {
    fontSize: 14,
    marginLeft: 6,
  }
});
