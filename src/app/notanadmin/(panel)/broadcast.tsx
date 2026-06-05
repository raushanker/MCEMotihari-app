import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, useWindowDimensions, Image, Platform, Modal } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { logAdminAction } from '@/utils/auditLogger';
import { useRouter } from 'expo-router';
import { sendPushNotifications } from '@/utils/notifications';
import { launchMediaPicker } from '@/utils/mediaPicker';
import { uploadToCloudinary } from '@/utils/cloudinary';
import { useAppStore } from '@/store/useAppStore';

export default function BroadcastScreen() {
  const { user: currentUser } = useAuth();
  const showToast = useAppStore(state => state.showToast);
  const router = useRouter();
  const theme = useThemeColors();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [progressText, setProgressText] = useState('');

  const [showCropModal, setShowCropModal] = useState(false);
  const [originalImage, setOriginalImage] = useState<{ uri: string, width: number, height: number } | null>(null);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });

  const handlePickImage = async () => {
    const result = await launchMediaPicker({
      allowsEditing: false, // Fast attachment
      quality: 1, // Max quality for initial pick to allow good cropping
    });
    if (result.uri) {
      if (result.width && result.height) {
        setOriginalImage({ uri: result.uri, width: result.width, height: result.height });
        setImageUri(result.uri);
        setCropOffset({ x: 0, y: 0 });
      } else {
        Image.getSize(result.uri, (w, h) => {
          setOriginalImage({ uri: result.uri!, width: w, height: h });
          setImageUri(result.uri!);
          setCropOffset({ x: 0, y: 0 });
        });
      }
    } else if (result.error) {
      showToast(result.error, 'error');
    }
  };

  const handleApplyCrop = async () => {
    if (!originalImage) return;
    
    try {
      setSending(true);
      setProgressText('Cropping image...');
      
      const isWider = (originalImage.width / originalImage.height) > (16 / 9);
      const containerW = Math.min(width - 40, 600);
      const containerH = containerW * (9 / 16);

      const scale = isWider ? (originalImage.height / containerH) : (originalImage.width / containerW);

      const cropX = Math.max(0, cropOffset.x * scale);
      const cropY = Math.max(0, cropOffset.y * scale);
      
      const targetW = isWider ? originalImage.height * (16/9) : originalImage.width;
      const targetH = isWider ? originalImage.height : originalImage.width * (9/16);

      const manipResult = await manipulateAsync(
        originalImage.uri,
        [{ crop: { originX: cropX, originY: cropY, width: targetW, height: targetH } }],
        { format: SaveFormat.JPEG, compress: 0.8 }
      );

      setImageUri(manipResult.uri);
      setShowCropModal(false);
    } catch (err) {
      console.error('Crop failed:', err);
      showToast('Failed to crop image', 'error');
    } finally {
      setSending(false);
      setProgressText('');
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
    setOriginalImage(null);
  };

  const handleSendBroadcast = async () => {
    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (!cleanTitle) {
      showToast('Kripya alert title darj karein.', 'error');
      return;
    }
    if (!cleanBody) {
      showToast('Kripya alert message darj karein.', 'error');
      return;
    }

    if (Platform.OS === 'web') {
      const confirm = window.confirm(`Kya aap sach mein sabhi users ko ye notification bhejna chahte hain?\n\nTitle: ${cleanTitle}`);
      if (confirm) executeBroadcast(cleanTitle, cleanBody);
    } else {
      Alert.alert(
        'Confirm Broadcast 📢',
        `Kya aap sach mein sabhi users ko ye notification bhejna chahte hain?\n\nTitle: ${cleanTitle}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send to All', style: 'destructive', onPress: () => executeBroadcast(cleanTitle, cleanBody) }
        ]
      );
    }
  };

  const executeBroadcast = async (cleanTitle: string, cleanBody: string) => {
    setSending(true);
    let uploadedImageUrl = '';
    
    try {
      if (imageUri) {
        setProgressText('Optimizing & uploading image...');
        const uploadUrl = await uploadToCloudinary(imageUri);
        if (!uploadUrl) {
          showToast('Image upload karne me dikkat aayi. Kripya bina image ke try karein ya network check karein.', 'error');
          setSending(false);
          setProgressText('');
          return;
        }
        uploadedImageUrl = uploadUrl;
      }

      setProgressText('Fetching user directory...');
      // 1. Fetch all public profiles and gather push tokens
      const querySnapshot = await getDocs(collection(db, 'publicProfiles'));
      const uids: string[] = [];
      const pushTokens: string[] = [];

      querySnapshot.forEach(docSnap => {
        uids.push(docSnap.id);
        const data = docSnap.data();
        if (data.pushToken) {
          pushTokens.push(data.pushToken);
        }
      });
      
      const totalUsers = uids.length;
      if (totalUsers === 0) {
        showToast('Koi bhi user nahi mila notification bhejne ke liye.', 'error');
        setSending(false);
        return;
      }

      console.log(`Starting high-performance broadcast to ${totalUsers} users... (${pushTokens.length} push tokens found)`);
      setProgressText(`Starting transmission to ${totalUsers} users...`);

      // 2. Write notifications in batches of 500 (Firestore transaction limits)
      const batchLimit = 500;
      let sentCount = 0;

      for (let i = 0; i < totalUsers; i += batchLimit) {
        const chunk = uids.slice(i, i + batchLimit);
        const batch = writeBatch(db);

        chunk.forEach(userId => {
          const notifRef = doc(collection(db, 'users', userId, 'notifications'));
          const notifData: any = {
            type: 'system',
            title: cleanTitle,
            body: cleanBody,
            timestamp: new Date().toLocaleString(),
            read: false,
            category: 'System Announcement',
            senderName: 'MCE Connect Admin'
          };
          if (uploadedImageUrl) {
            notifData.imageUrl = uploadedImageUrl;
          }
          batch.set(notifRef, notifData);
        });

        setProgressText(`Sending notification: ${sentCount + chunk.length} / ${totalUsers} users...`);
        await batch.commit();
        sentCount += chunk.length;
      }

      // Send native push notifications in parallel chunks
      if (pushTokens.length > 0) {
        setProgressText(`Delivering push notifications to ${pushTokens.length} devices...`);
        await sendPushNotifications(pushTokens, cleanTitle, cleanBody, '/notifications', uploadedImageUrl || undefined);
      }

      // 3. Log administrative action
      if (currentUser) {
        await logAdminAction({
          adminUid: currentUser.uid,
          adminName: currentUser.name || 'Admin',
          adminEmail: currentUser.email || '',
          action: 'Broadcasted System Announcement',
          targetId: 'ALL_USERS',
          targetType: 'System Announcement',
          details: `Title: ${cleanTitle}`
        });
      }

      showToast(`Successfully sent to all ${totalUsers} users! 🎉`, 'success');
      setTitle('');
      setBody('');
      setImageUri(null);
      setOriginalImage(null);
    } catch (error) {
      console.error('Failed to broadcast announcement:', error);
      showToast('Announcement broadcast failed. Please check your network and try again.', 'error');
    } finally {
      setSending(false);
      setProgressText('');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.scrollContent}>
      {/* Header Info */}
      <View style={[styles.header, { borderBottomColor: theme.cardBorder }]}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity 
            style={[styles.backBtn, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]} 
            onPress={() => router.replace('/notanadmin/dashboard')}
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.title, { color: theme.text }]}>📢 Broadcast Alert</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Send announcements to all registered campus profiles</Text>
          </View>
        </View>
      </View>

      {/* Main Form */}
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Announcement Title</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : '#FAFBFD' }]}
          placeholder="e.g., 📌 Important Notice: Odd Semester Examination Forms"
          placeholderTextColor="#94A3B8"
          value={title}
          onChangeText={setTitle}
          editable={!sending}
        />

        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Announcement Message</Text>
        <TextInput
          style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : '#FAFBFD' }]}
          placeholder="Type the message body here. Keep it professional and clear..."
          placeholderTextColor="#94A3B8"
          value={body}
          onChangeText={setBody}
          multiline={true}
          numberOfLines={8}
          editable={!sending}
          textAlignVertical="top"
        />

        {/* Image Attachment Section */}
        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Image Attachment (Optional)</Text>
        {imageUri ? (
          <View style={[styles.imagePreviewContainer, { borderColor: theme.cardBorder }]}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
            <TouchableOpacity 
              style={styles.cropImageBtn} 
              onPress={() => setShowCropModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="crop" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.removeImageBtn} 
              onPress={handleRemoveImage}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.uploadBtn, { borderColor: theme.cardBorder, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.01)' : '#F8FAFC' }]} 
            onPress={handlePickImage}
            disabled={sending}
            activeOpacity={0.7}
          >
            <Ionicons name="image-outline" size={20} color="#EA580C" style={{ marginRight: 8 }} />
            <Text style={[styles.uploadBtnText, { color: theme.textSecondary }]}>Add Image Banner (Recommended 16:9)</Text>
          </TouchableOpacity>
        )}

        {sending && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color="#EA580C" style={{ marginRight: 8 }} />
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>{progressText}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, sending && { opacity: 0.6 }]}
          onPress={handleSendBroadcast}
          disabled={sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Broadcast to All Users</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Custom Crop Modal */}
      <Modal visible={showCropModal} animationType="slide" transparent={true} onRequestClose={() => setShowCropModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.cropModalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <Text style={[styles.cropTitle, { color: theme.text }]}>Position Image</Text>
            <Text style={[styles.cropSubtitle, { color: theme.textSecondary }]}>Drag to reposition for the 16:9 banner format</Text>

            <View style={[styles.cropContainer, { width: Math.min(width - 40, 600), height: Math.min(width - 40, 600) * (9 / 16) }]}>
              {originalImage && (
                <ScrollView
                  horizontal={(originalImage.width / originalImage.height) > (16 / 9)}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  onScrollEndDrag={(e) => setCropOffset({ x: e.nativeEvent.contentOffset.x, y: e.nativeEvent.contentOffset.y })}
                  onMomentumScrollEnd={(e) => setCropOffset({ x: e.nativeEvent.contentOffset.x, y: e.nativeEvent.contentOffset.y })}
                  bounces={false}
                >
                  <Image 
                    source={{ uri: originalImage.uri }} 
                    style={{ 
                      width: (originalImage.width / originalImage.height) > (16 / 9) ? originalImage.width * ( (Math.min(width - 40, 600) * (9 / 16)) / originalImage.height) : Math.min(width - 40, 600), 
                      height: (originalImage.width / originalImage.height) > (16 / 9) ? Math.min(width - 40, 600) * (9 / 16) : originalImage.height * (Math.min(width - 40, 600) / originalImage.width)
                    }} 
                    resizeMode="contain" 
                  />
                </ScrollView>
              )}
            </View>

            <View style={styles.cropActions}>
              <TouchableOpacity style={[styles.cropCancelBtn, { borderColor: theme.cardBorder }]} onPress={() => setShowCropModal(false)}>
                <Text style={[styles.cropCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cropApplyBtn} onPress={handleApplyCrop} disabled={sending}>
                {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.cropApplyText}>Apply Crop</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  header: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14.5,
    marginBottom: 20,
  },
  textArea: {
    height: 160,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(234, 88, 12, 0.05)',
    padding: 12,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    height: 180,
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cropImageBtn: {
    position: 'absolute',
    top: 8,
    right: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cropModalCard: {
    width: '100%',
    maxWidth: 640,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  cropTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  cropSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  cropContainer: {
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: '#000',
    overflow: 'hidden',
    marginBottom: 24,
  },
  cropActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cropCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  cropCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cropApplyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  cropApplyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});
