import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity,  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { ImageCropModal } from '@/components/modals/ImageCropModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOlxStore } from '@/store/useOlxStore';
import { useAppStore } from '@/store/useAppStore';
import { Image } from 'expo-image';
import { pickMediaWithOptions } from '@/utils/mediaPicker';
import { uploadToCloudinary } from '@/utils/cloudinary';
import { useExploreBack } from '@/hooks/useExploreBack';
import * as ImagePicker from 'expo-image-picker';

export default function CreateOlxScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAppStore(state => state.user);
  const { createItem } = useOlxStore();
  const showToast = useAppStore(state => state.showToast);
  const { from } = useLocalSearchParams<{ from?: string }>();
  const handleExploreBack = useExploreBack();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  
  const SUGGESTIONS = ["EGD Book", "Learn C Book", "Minidrafter", "Study Table", "Table Lamp", "Headphone", "Bicycle", "Lab Coat", "Calculator"];
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [localImageUri, setLocalImageUri] = useState('');
  const [localImageSize, setLocalImageSize] = useState({ width: 1000, height: 1000 });

  const handlePickImage = async () => {
    try {
      const result = await pickMediaWithOptions({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, 
        quality: 1.0,
      });

      if (result.uri) {
        setLocalImageUri(result.uri);
        setLocalImageSize({ width: result.width || 1000, height: result.height || 1000 });
        
        // Upload immediately, do not show crop modal yet
        setIsUploadingImage(true);
        const uploadedUrl = await uploadToCloudinary(result.uri, 'high');
        if (uploadedUrl) {
          setImageUrl(uploadedUrl);
        } else {
          Alert.alert('Error', 'Failed to upload image.');
        }
        setIsUploadingImage(false);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not pick image.');
    }
  };

  const handleCropApply = async (croppedUri: string) => {
    setShowCropModal(false);
    
    // Save cropped locally so they can crop again if needed
    setLocalImageUri(croppedUri);
    
    setIsUploadingImage(true);
    const uploadedUrl = await uploadToCloudinary(croppedUri, 'high');
    if (uploadedUrl) {
      setImageUrl(uploadedUrl);
    } else {
      Alert.alert('Error', 'Failed to upload image.');
    }
    setIsUploadingImage(false);
  };

  const handleBackNavigation = () => {
    if (from === 'explore') {
      handleExploreBack(from);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleClose = () => {
    const hasUnsavedChanges = title.trim().length > 0 || description.trim().length > 0 || price.trim().length > 0 || imageUrl.length > 0 || localImageUri.length > 0;
    
    if (hasUnsavedChanges) {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm('Are you sure you want to cancel item listing? Any unsaved changes will be lost.');
        if (confirmed) handleBackNavigation();
      } else {
        Alert.alert(
          'Cancel Listing? 🛑',
          'Are you sure you want to cancel this listing? All details will be lost.',
          [
            { text: 'Keep Editing', style: 'cancel' },
            { 
              text: 'Discard', 
              style: 'destructive',
              onPress: handleBackNavigation
            }
          ]
        );
      }
    } else {
      handleBackNavigation();
    }
  };

  const handlePost = async () => {
    if (!title.trim() || !price.trim()) {
      Alert.alert('Incomplete', 'Please provide a title and price.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to post.');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemData: any = {
        title: title.trim(),
        description: description.trim(),
        price: price.trim(),
        status: 'open',
      };
      
      if (imageUrl) {
        itemData.imageUrl = imageUrl;
      }

      await createItem(itemData);
      showToast('Item posted successfully!', 'success');
      router.replace('/olx');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to post item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <Ionicons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text, flex: 1, marginLeft: 12 }]}>Sell Item</Text>
          <TouchableOpacity 
            style={[styles.postBtn, (!title.trim() || !price.trim() || isUploadingImage) && { opacity: 0.5 }]}
            onPress={handlePost}
            disabled={isSubmitting || !title.trim() || !price.trim() || isUploadingImage}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.isDark ? '#3B82F6' : theme.primary} />
            ) : (
              <Text style={[styles.postBtnText, { color: theme.isDark ? '#3B82F6' : theme.primary }]}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>
            Item Title <Text style={{ color: theme.error || '#EF4444' }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}
            placeholder="e.g., Engineering Mathematics II Book"
            placeholderTextColor={theme.textSecondary + '80'}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            autoCapitalize="sentences"
          />
          <Text style={[styles.charCount, { color: theme.textSecondary }]}>{title.length}/60</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsContainer}>
            {SUGGESTIONS.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionPill, { backgroundColor: theme.isDark ? '#374151' : '#F3F4F6', borderColor: theme.cardBorder }]}
                onPress={() => setTitle(item)}
              >
                <Text style={[styles.suggestionText, { color: theme.text }]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>
            Price (₹) <Text style={{ color: theme.error || '#EF4444' }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}
            placeholder="e.g., 250 or Free"
            placeholderTextColor={theme.textSecondary + '80'}
            value={price}
            onChangeText={setPrice}
            maxLength={15}
            autoCapitalize="sentences"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsContainer}>
            {["50", "100", "150", "250", "Free"].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionPill, { backgroundColor: theme.isDark ? '#374151' : '#F3F4F6', borderColor: theme.cardBorder }]}
                onPress={() => setPrice(item)}
              >
                <Text style={[styles.suggestionText, { color: theme.text }]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Description & Condition (Optional)</Text>
          <TextInput
            style={[styles.textArea, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}
            placeholder="Describe the condition, edition, or any other details..."
            placeholderTextColor={theme.textSecondary + '80'}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={300}
            autoCapitalize="sentences"
          />
          <Text style={[styles.charCount, { color: theme.textSecondary }]}>{description.length}/300</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Item Image (Max 1) (Optional)</Text>
          {imageUrl ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUrl }} style={styles.imagePreview} contentFit="cover" />
              <View style={styles.imageActionButtons}>
                <TouchableOpacity style={styles.imageActionBtn} onPress={() => setShowCropModal(true)}>
                  <Ionicons name="crop" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.imageActionBtn, { backgroundColor: '#EF4444' }]} onPress={() => { setImageUrl(''); setLocalImageUri(''); }}>
                  <Ionicons name="close" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.imageUploadBtn, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}
              onPress={handlePickImage}
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={32} color={theme.textSecondary} />
                  <Text style={[styles.uploadText, { color: theme.textSecondary }]}>Tap to upload image</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.guidelinesContainer}>
          <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.guidelinesText, { color: theme.textSecondary }]}>
            Listings must be for physical study materials or campus-related items only. Keep descriptions accurate.
          </Text>
        </View>
      </ScrollView>
      <ImageCropModal
        visible={showCropModal}
        imageUri={localImageUri}
        imageWidth={localImageSize.width}
        imageHeight={localImageSize.height}
        onClose={() => setShowCropModal(false)}
        onCropApply={handleCropApply}
        title="Crop Item Image"
        subtitle="Adjust image to show your item clearly"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    maxWidth: 768,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  postBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  postBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    maxWidth: 768,
    width: '100%',
    alignSelf: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
    marginRight: 4,
  },
  suggestionsContainer: {
    marginTop: 8,
    paddingBottom: 4,
  },
  suggestionPill: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  imageUploadBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageActionButtons: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  imageActionBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  guidelinesContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(150,150,150,0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  guidelinesText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    lineHeight: 18,
  },
});
