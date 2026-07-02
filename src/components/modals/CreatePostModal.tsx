import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

import { uploadToCloudinary } from '@/utils/cloudinary';
import { launchMediaPicker } from '@/utils/mediaPicker';
import * as ImagePicker from 'expo-image-picker';
import { ImageCropModal } from './ImageCropModal';
import * as FileSystem from 'expo-file-system';

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
  const insets = useSafeAreaInsets();
  const { user, createPost, showToast } = useAppStore();
  const router = useRouter();

  // Core Composer States
  const [category, setCategory] = useState<typeof CATEGORIES[number]['id']>('General');
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // Media Attachments
  const [localImageUri, setLocalImageUri] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);

  // Polls
  const [showPollFields, setShowPollFields] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);

  // Anonymity
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Spam states
  const [showSpamWarning, setShowSpamWarning] = useState(false);
  const [spamKeywords, setSpamKeywords] = useState<string[]>([]);
  const [understandRisk, setUnderstandRisk] = useState(false);

  // Crop states
  const [localImageSize, setLocalImageSize] = useState<{ width: number, height: number } | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  // Submit and loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);

  const textInputRef = useRef<TextInput>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);

  // Background secure upload pipeline
  const startImageUpload = async (uri: string) => {
    if (!uri) return;
    
    setIsUploadingImage(true);
    setUploadFailed(false);
    setUploadedImageUrl('');

    const controller = new AbortController();
    uploadControllerRef.current = controller;
    
    try {
      const uploadedUrl = await uploadToCloudinary(uri, controller.signal);
      if (uploadedUrl) {
        setUploadedImageUrl(uploadedUrl);
        setUploadFailed(false);
        // Clear local image file from cache immediately after successful upload
        if (uri.startsWith('file://')) {
          FileSystem.deleteAsync(uri, { idempotent: true }).catch(e => console.warn('Clean temp file failed:', e));
        }
      } else {
        setUploadFailed(true);
        showToast('Image upload failed ❌', 'error');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[Upload] Active upload aborted by user request.');
        return;
      }
      console.error('Cloudinary background upload error:', err);
      setUploadFailed(true);
      showToast('Image upload failed ❌', 'error');
    } finally {
      if (uploadControllerRef.current === controller) {
        uploadControllerRef.current = null;
        setIsUploadingImage(false);
      }
    }
  };

  const cancelImageUpload = () => {
    if (uploadControllerRef.current) {
      uploadControllerRef.current.abort();
      uploadControllerRef.current = null;
    }
    if (localImageUri && localImageUri.startsWith('file://')) {
      FileSystem.deleteAsync(localImageUri, { idempotent: true }).catch(e => console.warn(e));
    }
    setLocalImageUri('');
    setLocalImageSize(null);
    setUploadedImageUrl('');
    setIsUploadingImage(false);
    setUploadFailed(false);
    showToast('Image upload cancelled ⛔', 'info');
  };

  const retryImageUpload = () => {
    if (localImageUri) {
      startImageUpload(localImageUri);
    }
  };

  // Sync initial preset configurations & Draft loading prompt
  useEffect(() => {
    const checkDraft = async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      try {
        const storedDraft = await AsyncStorage.getItem('@mce_post_draft');
        if (storedDraft) {
          const draft = JSON.parse(storedDraft);
          
          const restore = () => {
            setTitle(draft.title || '');
            setContent(draft.content || '');
            setCategory(draft.category || 'General');
            setLocalImageUri(draft.localImageUri || '');
            if (draft.localImageSize) setLocalImageSize(draft.localImageSize);
            setUploadedImageUrl(draft.uploadedImageUrl || '');
            setShowPollFields(draft.showPollFields || false);
            setPollOptions(draft.pollOptions || ['', '']);
            setIsAnonymous(draft.isAnonymous || false);
            
            // Delete draft from cache once restored to prevent loop on next open
            AsyncStorage.removeItem('@mce_post_draft').catch(() => {});
            showToast('Draft restored! 📝', 'success');
          };

          const deleteDraft = () => {
            AsyncStorage.removeItem('@mce_post_draft').catch(() => {});
            resetFresh();
          };

          if (Platform.OS === 'web') {
            const res = window.confirm(
              'Restore Draft?\n\nAapke paas pehle se ek unsaved post draft hai. Kya aap use restore karna chahte hain?'
            );
            if (res) {
              restore();
            } else {
              deleteDraft();
            }
          } else {
            Alert.alert(
              'Restore Draft? 📝',
              'Aapke paas pehle se ek unsaved post draft hai. Kya aap use restore karna chahte hain?',
              [
                { text: 'Discard Draft', style: 'destructive', onPress: deleteDraft },
                { text: 'Restore', style: 'default', onPress: restore },
              ],
              { cancelable: false }
            );
          }
        } else {
          resetFresh();
        }
      } catch (err) {
        resetFresh();
      }
    };

    const resetFresh = () => {
      setTitle('');
      setContent('');
      setLocalImageUri('');
      setLocalImageSize(null);
      setUploadedImageUrl('');
      setCategory('General');
      setShowChannelPicker(false);
      setIsSubmitting(false);
      setIsUploadingImage(false);
      setUploadFailed(false);

      if (presetType === 'photo') {
        setShowPollFields(false);
        setIsAnonymous(false);
        requestAnimationFrame(() => pickImageFromGallery());
      } else if (presetType === 'poll') {
        setShowPollFields(true);
        setIsAnonymous(false);
        setPollOptions(['', '']);
      } else if (presetType === 'anonymous') {
        setIsAnonymous(true);
        setShowPollFields(false);
      } else {
        setShowPollFields(false);
        setIsAnonymous(false);
      }

      requestAnimationFrame(() => textInputRef.current?.focus());
    };

    if (visible) {
      checkDraft();
    }
  }, [visible, presetType]);

  const pickImageFromGallery = async () => {
    try {
      const result = await launchMediaPicker({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // We use our custom free-crop modal instead
        quality: 1.0, // Select original high quality without initial double-compression
      });

      if (result.uri) {
        // Enforce 10MB size validation check
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        if (fileInfo.exists && fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
          Alert.alert(
            'File Too Large ❌',
            'Image exceeds the maximum allowed limit of 10MB. Please select a smaller file.'
          );
          if (result.uri.startsWith('file://')) {
            FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(e => console.warn(e));
          }
          return;
        }

        setLocalImageUri(result.uri);
        if (result.width && result.height) {
          setLocalImageSize({ width: result.width, height: result.height });
        } else {
          try {
            Image.getSize(result.uri, (w, h) => {
              setLocalImageSize({ width: w, height: h });
            });
          } catch (e) {
            // Fallback: use a default aspect ratio if getSize fails
            setLocalImageSize({ width: 400, height: 300 });
          }
        }
        // Start background upload process automatically and immediately
        startImageUpload(result.uri);
      }
    } catch (err) {
      console.error('Gallery pick error in modal:', err);
    }
  };

  const handleAddPollOption = () => {
    if (pollOptions.length >= 4) {
      Alert.alert('Limit Reached', 'Polls require a maximum of 4 choice options.');
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

  const removeSelectedImage = () => {
    cancelImageUpload();
  };

  const hasChanges = () => {
    return (
      title.trim() !== '' ||
      content.trim() !== '' ||
      localImageUri !== '' ||
      (showPollFields && pollOptions.some(opt => opt.trim() !== ''))
    );
  };

  const handleSaveDraft = async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    try {
      const draft = {
        title,
        content,
        category,
        localImageUri,
        localImageSize,
        uploadedImageUrl,
        showPollFields,
        pollOptions,
        isAnonymous,
      };
      await AsyncStorage.setItem('@mce_post_draft', JSON.stringify(draft));
      showToast('Draft saved successfully! 📝', 'success');
    } catch (err) {
      console.warn('Failed to save draft:', err);
    }
    setShowCloseConfirmModal(false);
    onClose();
  };

  const handleDiscardDraft = async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    try {
      await AsyncStorage.removeItem('@mce_post_draft');
    } catch (err) {}
    cancelImageUpload();
    setShowCloseConfirmModal(false);
    onClose();
  };

  const handleCloseAttempt = () => {
    if (isUploadingImage) {
      Alert.alert(
        'Upload in Progress ⏳',
        'Your attachment is still uploading to the server. If you close this screen now, the upload will be cancelled. Please wait a few seconds or let the upload complete.',
        [
          { text: 'Wait', style: 'cancel' },
          { 
            text: 'Cancel Upload & Close', 
            style: 'destructive', 
            onPress: () => {
              cancelImageUpload();
              onClose();
            } 
          }
        ]
      );
      return;
    }

    if (!hasChanges()) {
      cancelImageUpload();
      onClose();
      return;
    }
    setShowCloseConfirmModal(true);
  };

  const handleSubmit = async () => {
    // Premium validation: Allow image-only posts (content empty, but image present) or standard text-only posts
    if (!content.trim() && !localImageUri) {
      Alert.alert('Required Field', 'Kripya post content type karein ya ek photo attach karein.');
      return;
    }

    if (content.length > 1000) {
      Alert.alert('Limit Reached ⚠️', 'Post limit 1000 characters hai.');
      return;
    }

    if (localImageUri && isUploadingImage) {
      Alert.alert('Uploading Photo', 'Kripya photo upload hone ka wait karein.');
      return;
    }

    if (localImageUri && uploadFailed) {
      Alert.alert('Upload Failed ❌', 'Photo upload failed. Kripya retry karein ya photo remove karein.');
      return;
    }

    if (localImageUri && !uploadedImageUrl) {
      Alert.alert('Photo Not Ready ❌', 'Photo upload process handle nahi ho paya. Kripya retry button tap karein.');
      return;
    }

    if (showPollFields) {
      const activeOptions = pollOptions.filter(opt => opt.trim() !== '');
      if (activeOptions.length < 2) {
        Alert.alert('Required Options', 'Kripya poll ke liye kam se kam 2 choices fill karein.');
        return;
      }
    }

    if (!user) {
      Alert.alert('Sign In Required', 'Post submit karne ke liye sign in required hai.');
      return;
    }

    const RESTRICTED_WORDS = [
      'porn', 'pornographic', 'sex', 'sexual', 'nude', 'nudity', 'xxx', 'escort', 'adult service',
      'kill', 'murder', 'rape', 'violence', 'assault',
      'suicide', 'suicidal', 'self harm', 'kill myself',
      'child abuse', 'minor abuse', 'child exploitation',
      'animal abuse', 'animal torture',
      'abusive language', 'severe insults', 'targeted hate'
    ];
    
    const allText = [title, content, ...(showPollFields ? pollOptions : [])].join(' ').toLowerCase();
    const matchedKeywords: string[] = [];
    
    RESTRICTED_WORDS.forEach(word => {
      // Create word boundary regex to prevent partial matches like "sex" in "essex"
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(allText)) {
        matchedKeywords.push(word);
      }
    });

    if (matchedKeywords.length > 0) {
      setSpamKeywords(matchedKeywords);
      setUnderstandRisk(false);
      setShowSpamWarning(true);
      return;
    }

    executeSubmission(false, []);
  };

  const executeSubmission = async (isSpam: boolean, flaggedKeywords: string[]) => {
    setIsSubmitting(true);

    try {
      // 2. Submit post transaction to Firestore safely with double-submit protection
      await createPost({
        authorName: user?.name || user?.email || 'Anonymous Student',
        authorRole: user?.role || 'Student',
        category,
        title: title.trim(),
        content: content.trim(),
        imageUrl: localImageUri ? uploadedImageUrl : undefined,
        isAnonymous,
        pollOptions: showPollFields ? pollOptions.filter(opt => opt.trim() !== '') : undefined,
        allowMultipleVotes: showPollFields ? allowMultipleVotes : undefined,
        isSpamCandidate: isSpam,
        flaggedReason: isSpam ? 'Contains restricted or sensitive content' : undefined,
        flaggedKeywords: isSpam ? flaggedKeywords : undefined
      });

      // Clear draft since it is successfully posted!
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.removeItem('@mce_post_draft').catch(() => {});

      showToast('Post published successfully! 🎉', 'success');
      onClose();

      // Navigate to Home Feed tab and trigger a refresh to show the new post immediately
      try {
        router.replace('/');
        useAppStore.getState().fetchPosts({ refresh: true, quiet: true }).catch(() => {});
      } catch (err) {
        console.warn('Navigation redirect after posting failed:', err);
      }
    } catch (err) {
      console.error('Failed to submit post:', err);
      Alert.alert('Error', 'An error occurred while uploading your post. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleCloseAttempt}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1, backgroundColor: theme.background }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingTop: insets.top + 4,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.cardBorder,
          backgroundColor: theme.backgroundElement
        }}>
          <TouchableOpacity onPress={handleCloseAttempt} activeOpacity={0.8} style={{ padding: 8, marginRight: 4 }}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: theme.text, textAlign: 'center' }} numberOfLines={1}>Share Post</Text>
          <TouchableOpacity
            style={[styles.postSubmitBtn, (isSubmitting || isUploadingImage || (!content.trim() && !localImageUri)) && styles.postSubmitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || isUploadingImage || (!content.trim() && !localImageUri)}
            activeOpacity={0.85}
          >
            {isSubmitting || isUploadingImage ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.postSubmitText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View style={styles.composerWrapper}>
        
        {/* 1. Header Identity & Pill Row */}
        <View style={styles.identityHeader}>
          <Image 
            source={{ 
              uri: isAnonymous 
                ? 'https://api.dicebear.com/7.x/bottts/png?seed=anon' 
                : (user?.photoUrl || 'https://api.dicebear.com/7.x/avataaars/png?seed=Felix') 
            }} 
            style={styles.composerAvatar} 
          />
          
          <View style={styles.pillsRow}>
            {/* 1.1 Profile / Anonymous Selector Pill */}
            <TouchableOpacity
              style={[styles.identityPill, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
              onPress={() => setIsAnonymous(!isAnonymous)}
              activeOpacity={0.75}
              disabled={isSubmitting || isUploadingImage}
            >
              <Ionicons name={isAnonymous ? "eye-off" : "person"} size={13} color="#F97316" style={{ marginRight: 4 }} />
              <Text style={[styles.identityPillText, { color: theme.text }]}>
                {isAnonymous ? 'Anonymous' : (user?.name || 'Profile')}
              </Text>
              <Ionicons name="chevron-down" size={11} color={theme.textSecondary} style={{ marginLeft: 3 }} />
            </TouchableOpacity>

            {/* 1.2 Channel Selector Pill */}
            <TouchableOpacity
              style={[styles.identityPill, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
              onPress={() => setShowChannelPicker(!showChannelPicker)}
              activeOpacity={0.75}
              disabled={isSubmitting || isUploadingImage}
            >
              <Ionicons name="chatbubbles" size={13} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={[styles.identityPillText, { color: theme.text }]}>
                {CATEGORIES.find(c => c.id === category)?.label || 'General Feed'}
              </Text>
              <Ionicons name={showChannelPicker ? "chevron-up" : "chevron-down"} size={11} color={theme.textSecondary} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Expandable Channel Selector Scroller */}
        {showChannelPicker && (
          <View style={[styles.inlineChannelContainer, { borderBottomColor: theme.cardBorder }]}>
            <Text style={[styles.inlineChannelLabel, { color: theme.textSecondary }]}>Select channel to publish:</Text>
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
                    onPress={() => {
                      setCategory(cat.id);
                      setShowChannelPicker(false);
                    }}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={cat.icon as any} size={13} color={isSelected ? '#FFF' : theme.textSecondary} style={{ marginRight: 5 }} />
                    <Text style={[styles.catText, { color: theme.textSecondary }, isSelected && { color: '#FFF', fontWeight: 'bold' }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Optional Title input */}
        <View style={[styles.composerTitleWrapper, { borderColor: theme.cardBorder }]}>
          <TextInput
            style={[styles.composerTitleInput, { color: theme.text, borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0, flex: 1 }]}
            placeholder="Title / Headline (optional)..."
            placeholderTextColor="#64748B"
            value={title}
            onChangeText={setTitle}
            editable={!isSubmitting && !isUploadingImage}
            maxLength={100}
          />
          <Text style={{ fontSize: 10, color: theme.textSecondary, marginLeft: 8, fontWeight: '600' }}>
            {title.length}/100
          </Text>
        </View>

        {/* 3. Text Composer Input Area */}
        <View style={styles.textContainer}>
          <TextInput
            ref={textInputRef}
            style={[styles.composerTextInput, { color: theme.text }]}
            placeholder="share you thoughts..."
            placeholderTextColor="#94A3B8"
            value={content}
            onChangeText={setContent}
            multiline
            editable={!isSubmitting && !isUploadingImage}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={{ fontSize: 10, color: theme.textSecondary, alignSelf: 'flex-end', marginTop: 4, fontWeight: '600' }}>
            {content.length}/1000
          </Text>
        </View>

        {/* 4. Instant Selected Image Preview Thumbnail */}
        {localImageUri ? (
          <View style={styles.previewCard}>
            <ExpoImage source={{ uri: localImageUri }} style={styles.previewImage} contentFit="cover" />
            
            {isUploadingImage && (
              <View style={[StyleSheet.absoluteFill, styles.uploadingOverlay]}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.uploadingOverlayText}>Uploading secure image...</Text>
                
                <TouchableOpacity
                  style={{
                    marginTop: 12,
                    backgroundColor: 'rgba(239, 68, 68, 0.85)',
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#EF4444',
                  }}
                  onPress={cancelImageUpload}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                    Cancel Upload
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {uploadFailed && (
              <View style={[StyleSheet.absoluteFill, styles.uploadFailedOverlay]}>
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
                <Text style={styles.uploadFailedOverlayText}>Upload failed</Text>
                <TouchableOpacity 
                  style={styles.retryBtn} 
                  onPress={retryImageUpload}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.previewCloseBtn}
              onPress={removeSelectedImage}
              disabled={isSubmitting || isUploadingImage}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.previewCloseBtn, { right: 40, backgroundColor: 'rgba(15, 23, 42, 0.8)' }]}
              onPress={() => setShowCropModal(true)}
              disabled={isSubmitting || isUploadingImage}
              activeOpacity={0.7}
            >
              <Ionicons name="crop" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* 5. Inline Interactive Poll Builder */}
        {showPollFields && (
          <View style={[styles.inlinePollBuilder, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
            <View style={styles.pollHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="stats-chart" size={14} color="#F97316" />
                <Text style={[styles.pollSectionTitle, { color: theme.text }]}>Launch Campus Poll</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPollFields(false)} disabled={isSubmitting}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
            
            {pollOptions.map((opt, index) => (
              <View key={index} style={styles.pollOptionRow}>
                <TextInput
                  style={[styles.pollOptionInput, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, color: theme.text }]}
                  placeholder={`Choice Option ${index + 1}`}
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

            <View style={styles.pollBuilderFooter}>
              {pollOptions.length < 4 ? (
                <TouchableOpacity
                  style={[styles.addOptionBtn, { borderColor: theme.cardBorder }]}
                  onPress={handleAddPollOption}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={14} color="#F97316" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#F97316' }}>Add Option</Text>
                </TouchableOpacity>
              ) : <View />}

              <View style={styles.pollMultipleToggleRow}>
                <Text style={[styles.toggleLabelMini, { color: theme.textSecondary }]}>Allow Multi-vote</Text>
                <Switch
                  value={allowMultipleVotes}
                  onValueChange={setAllowMultipleVotes}
                  disabled={isSubmitting}
                  trackColor={{ false: '#767577', true: '#FED7AA' }}
                  thumbColor={allowMultipleVotes ? '#F97316' : '#f4f3f4'}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
            </View>
          </View>
        )}

        {/* 6. Composer Toolbar Bottom Row */}
        <View style={[styles.toolbarRow, { borderTopColor: theme.cardBorder }]}>
          <View style={styles.toolbarLeftActions}>
            {/* Directly pick image from photo library */}
            <TouchableOpacity
              style={[styles.toolbarActionBtn, { backgroundColor: theme.backgroundElement }]}
              onPress={pickImageFromGallery}
              disabled={isSubmitting || isUploadingImage}
              activeOpacity={0.7}
            >
              <Ionicons name="image" size={18} color="#F97316" />
              <Text style={[styles.toolbarActionText, { color: theme.text }]}>Photo</Text>
            </TouchableOpacity>

            {/* Toggle inline poll builder */}
            <TouchableOpacity
              style={[styles.toolbarActionBtn, { backgroundColor: theme.backgroundElement }, showPollFields && styles.toolbarActionBtnActive]}
              onPress={() => setShowPollFields(!showPollFields)}
              disabled={isSubmitting || isUploadingImage}
              activeOpacity={0.7}
            >
              <Ionicons name="stats-chart" size={18} color={showPollFields ? '#F97316' : '#10B981'} />
              <Text style={[styles.toolbarActionText, { color: theme.text }]}>Poll</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Premium Close Confirmation Modal */}
        <Modal
          visible={showCloseConfirmModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCloseConfirmModal(false)}
        >
          <View style={styles.confirmModalOverlay}>
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={() => setShowCloseConfirmModal(false)} 
            />
            <View style={[styles.confirmModalContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              
              <View style={styles.confirmModalHeader}>
                <View style={styles.confirmIconContainer}>
                  <Ionicons name="document-text" size={26} color="#F97316" />
                </View>
                <Text style={[styles.confirmTitle, { color: theme.text }]}>Save draft? 📝</Text>
                <Text style={[styles.confirmSubtitle, { color: theme.textSecondary }]}>
                  Aapne post me changes kiye hain. Kya aap is content ko save karna chahte hain?
                </Text>
              </View>

              <View style={styles.confirmActionsContainer}>
                {/* Option 1: Save Draft */}
                <TouchableOpacity
                  style={styles.confirmSaveBtn}
                  onPress={handleSaveDraft}
                  activeOpacity={0.85}
                >
                  <Ionicons name="save" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmSaveBtnText}>Save Draft</Text>
                </TouchableOpacity>

                {/* Option 2: Discard Draft / Back to Feed */}
                <TouchableOpacity
                  style={[styles.confirmDiscardBtn, { borderColor: theme.cardBorder }]}
                  onPress={handleDiscardDraft}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmDiscardBtnText}>Discard & Exit</Text>
                </TouchableOpacity>

                {/* Option 3: Keep Editing / Cancel */}
                <TouchableOpacity
                  style={[styles.confirmKeepEditingBtn, { borderColor: theme.cardBorder }]}
                  onPress={() => setShowCloseConfirmModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.confirmKeepEditingText, { color: theme.textSecondary }]}>Keep Editing</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </Modal>

      </View>
      </ScrollView>

      {/* Strict Custom Spam Warning Modal */}
      <Modal visible={showSpamWarning} animationType="fade" transparent={true} onRequestClose={() => setShowSpamWarning(false)}>
        <View style={styles.confirmModalOverlay}>
          <View style={[styles.confirmModalContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, maxWidth: 340 }]}>
            <View style={styles.confirmModalHeader}>
              <View style={[styles.confirmIconContainer, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="warning" size={28} color="#EF4444" />
              </View>
              <Text style={[styles.confirmTitle, { color: theme.text }]}>Content Warning</Text>
              <Text style={[styles.confirmSubtitle, { color: theme.textSecondary, marginTop: 8 }]}>
                This post may contain restricted or sensitive content. It may be reviewed by administrators and could be removed if it violates community guidelines.
              </Text>
              <Text style={[styles.confirmSubtitle, { color: theme.textSecondary, marginTop: 12, fontWeight: 'bold' }]}>
                Do you still want to publish this post?
              </Text>
            </View>

            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, padding: 12, backgroundColor: theme.background, borderRadius: 8, borderWidth: 1, borderColor: theme.cardBorder }} 
              activeOpacity={0.8}
              onPress={() => setUnderstandRisk(!understandRisk)}
            >
              <Ionicons name={understandRisk ? "checkbox" : "square-outline"} size={22} color={understandRisk ? "#F97316" : theme.textSecondary} />
              <Text style={{ marginLeft: 10, fontSize: 13, color: theme.text, flex: 1 }}>
                I understand this content may be reviewed by administrators.
              </Text>
            </TouchableOpacity>

            <View style={styles.confirmActionsContainer}>
              <TouchableOpacity 
                style={[styles.confirmSaveBtn, { backgroundColor: understandRisk ? '#EF4444' : '#CBD5E1' }]} 
                onPress={() => {
                  setShowSpamWarning(false);
                  executeSubmission(true, spamKeywords);
                }}
                disabled={!understandRisk}
              >
                <Text style={styles.confirmSaveBtnText}>Post Anyway</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmDiscardBtn, { borderColor: theme.cardBorder }]} 
                onPress={() => setShowSpamWarning(false)}
              >
                <Text style={[styles.confirmDiscardBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Interactive Free Crop Modal */}
      {localImageSize && (
        <ImageCropModal
          visible={showCropModal}
          imageUri={localImageUri}
          imageWidth={localImageSize.width}
          imageHeight={localImageSize.height}
          onClose={() => setShowCropModal(false)}
          onCropApply={(croppedUri) => {
            setShowCropModal(false);
            setLocalImageUri(croppedUri);
            startImageUpload(croppedUri);
          }}
        />
      )}

      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  composerWrapper: {
    paddingBottom: 10,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  composerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    backgroundColor: '#E2E8F0',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  identityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  identityPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inlineChannelContainer: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  inlineChannelLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  catScroller: {
    flexDirection: 'row',
  },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    marginRight: 6,
  },
  catText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  composerTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 0.5,
  },
  composerTitleInput: {
    fontSize: 15,
    fontWeight: 'bold',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  textContainer: {
    minHeight: 110,
    marginBottom: 10,
  },
  composerTextInput: {
    fontSize: 15.5,
    lineHeight: 21,
    fontWeight: '500',
    flex: 1,
  },
  previewCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    marginBottom: 14,
  },
  previewImage: {
    width: '100%',
    height: 180,
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  previewFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  previewFilename: {
    fontSize: 11,
    maxWidth: '85%',
  },
  inlinePollBuilder: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  pollHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pollSectionTitle: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  pollOptionInput: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '500',
  },
  pollOptionRemove: {
    padding: 5,
  },
  pollBuilderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  pollMultipleToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleLabelMini: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 10,
  },
  toolbarLeftActions: {
    flexDirection: 'row',
    gap: 8,
  },
  toolbarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 5,
  },
  toolbarActionBtnActive: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  toolbarActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  postSubmitBtn: {
    backgroundColor: '#F97316',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: Platform.OS === 'web' ? `${0}px ${4}px ${6}px #FED7AA` : undefined,
    elevation: 2,
  },
  postSubmitBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  postSubmitText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  uploadingOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadingOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  uploadFailedOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  uploadFailedOverlayText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: 'bold',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 4,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContainer: {
    width: '90%',
    maxWidth: 320,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    alignItems: 'center',
  },
  confirmModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  confirmActionsContainer: {
    width: '100%',
    gap: 8,
  },
  confirmSaveBtn: {
    flexDirection: 'row',
    height: 44,
    backgroundColor: '#F97316',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  confirmDiscardBtn: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDiscardBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  confirmKeepEditingBtn: {
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmKeepEditingText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
});

export default CreatePostModal;
