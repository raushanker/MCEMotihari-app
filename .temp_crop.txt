import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions, Image, Modal } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ImageCropModalProps {
  visible: boolean;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  aspectRatio: number; // e.g., 16/9 or 1
  onClose: () => void;
  onCropApply: (croppedUri: string) => void;
  title?: string;
  subtitle?: string;
}

export function ImageCropModal({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  aspectRatio,
  onClose,
  onCropApply,
  title = 'Position Image',
  subtitle = 'Drag to reposition image'
}: ImageCropModalProps) {
  const theme = useThemeColors();
  const { width } = useWindowDimensions();
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (visible) {
      setCropOffset({ x: 0, y: 0 });
      setProcessing(false);
    }
  }, [visible]);

  const handleApplyCrop = async () => {
    try {
      setProcessing(true);
      
      const isWider = (imageWidth / imageHeight) > aspectRatio;
      const containerW = Math.min(width - 40, 600);
      const containerH = containerW / aspectRatio;

      const scale = isWider ? (imageHeight / containerH) : (imageWidth / containerW);

      const cropX = Math.max(0, cropOffset.x * scale);
      const cropY = Math.max(0, cropOffset.y * scale);
      
      const targetW = isWider ? imageHeight * aspectRatio : imageWidth;
      const targetH = isWider ? imageHeight : imageWidth / aspectRatio;

      const manipResult = await manipulateAsync(
        imageUri,
        [{ crop: { originX: cropX, originY: cropY, width: targetW, height: targetH } }],
        { format: SaveFormat.JPEG, compress: 0.8 }
      );

      onCropApply(manipResult.uri);
    } catch (err) {
      console.error('Crop failed:', err);
      // Give fallback
      onCropApply(imageUri);
    } finally {
      setProcessing(false);
    }
  };

  if (!visible) return null;

  const isWider = (imageWidth / imageHeight) > aspectRatio;
  const containerW = Math.min(width - 40, 600);
  const containerH = containerW / aspectRatio;

  const renderedImageWidth = isWider ? imageWidth * (containerH / imageHeight) : containerW;
  const renderedImageHeight = isWider ? containerH : imageHeight * (containerW / imageWidth);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.cropModalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cropTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.cropSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>

          <View style={[styles.cropContainer, { width: containerW, height: containerH }]}>
            <ScrollView
              horizontal={isWider}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              onScrollEndDrag={(e) => setCropOffset({ x: e.nativeEvent.contentOffset.x, y: e.nativeEvent.contentOffset.y })}
              onMomentumScrollEnd={(e) => setCropOffset({ x: e.nativeEvent.contentOffset.x, y: e.nativeEvent.contentOffset.y })}
              bounces={false}
            >
              <Image 
                source={{ uri: imageUri }} 
                style={{ width: renderedImageWidth, height: renderedImageHeight }} 
                resizeMode="contain" 
              />
            </ScrollView>
          </View>

          <View style={styles.cropActions}>
            <TouchableOpacity style={[styles.cropCancelBtn, { borderColor: theme.cardBorder }]} onPress={onClose} disabled={processing}>
              <Text style={[styles.cropCancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cropApplyBtn} onPress={handleApplyCrop} disabled={processing}>
              {processing ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.cropApplyText}>Apply Crop</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
