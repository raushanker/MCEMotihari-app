import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions, Image, Modal } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ImageCropModalProps {
  visible: boolean;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  aspectRatio?: number; // e.g., 16/9 or 1
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
  title = 'Free Crop Image',
  subtitle = 'Drag to pan and reposition'
}: ImageCropModalProps) {
  const theme = useThemeColors();
  const { width, height } = useWindowDimensions();
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [zoomScale, setZoomScale] = useState(1);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (visible) {
      setCropOffset({ x: 0, y: 0 });
      setZoomScale(1);
      setProcessing(false);
    }
  }, [visible]);

  const handleApplyCrop = async () => {
    try {
      setProcessing(true);
      
      const containerW = Math.min(width - 40, 600);
      const containerH = aspectRatio ? containerW / aspectRatio : Math.min(height * 0.5, 600);

      // Determine initial scale mapping the image to the container
      const baseScale = Math.max(containerW / imageWidth, containerH / imageHeight);
      
      // Actual rendered image size inside scroll views
      const renderedWidth = imageWidth * baseScale * zoomScale;
      const renderedHeight = imageHeight * baseScale * zoomScale;

      // The real ratio to map screen pixels back to original image pixels
      const screenToImageRatio = 1 / (baseScale * zoomScale);

      const cropX = Math.max(0, cropOffset.x * screenToImageRatio);
      const cropY = Math.max(0, cropOffset.y * screenToImageRatio);
      const targetW = containerW * screenToImageRatio;
      const targetH = containerH * screenToImageRatio;

      const manipResult = await manipulateAsync(
        imageUri,
        [{ crop: { originX: cropX, originY: cropY, width: targetW, height: targetH } }],
        { format: SaveFormat.JPEG, compress: 0.8 }
      );

      onCropApply(manipResult.uri);
    } catch (err) {
      console.error('Crop failed:', err);
      onCropApply(imageUri);
    } finally {
      setProcessing(false);
    }
  };

  if (!visible) return null;

  const containerW = Math.min(width - 40, 600);
  const containerH = aspectRatio ? containerW / aspectRatio : Math.min(height * 0.5, 600);

  // We make the image slightly larger so it's fully pannable in all directions
  // baseScale fills the container covering it completely
  const baseScale = Math.max(containerW / imageWidth, containerH / imageHeight);
  // Add 1.5x zoom to base scale to allow plenty of panning room
  const initialZoom = 1.35;
  const renderedWidth = imageWidth * baseScale * initialZoom;
  const renderedHeight = imageHeight * baseScale * initialZoom;

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.cropModalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cropTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.cropSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>

          <View style={[styles.cropContainer, { width: containerW, height: containerH }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              onScrollEndDrag={(e) => {
                const y = e.nativeEvent.contentOffset.y;
                setCropOffset(prev => ({ ...prev, y }));
              }}
              onMomentumScrollEnd={(e) => {
                const y = e.nativeEvent.contentOffset.y;
                setCropOffset(prev => ({ ...prev, y }));
              }}
              scrollEventThrottle={16}
              contentOffset={{ x: 0, y: (renderedHeight - containerH) / 2 }} // center vertically initially
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onScrollEndDrag={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  setCropOffset(prev => ({ ...prev, x }));
                }}
                onMomentumScrollEnd={(e) => {
                  const x = e.nativeEvent.contentOffset.x;
                  setCropOffset(prev => ({ ...prev, x }));
                }}
                scrollEventThrottle={16}
                contentOffset={{ x: (renderedWidth - containerW) / 2, y: 0 }} // center horizontally initially
              >
                <Image 
                  source={{ uri: imageUri }} 
                  style={{ width: renderedWidth, height: renderedHeight }} 
                  resizeMode="cover" 
                  onLoad={() => {
                     setZoomScale(initialZoom);
                     setCropOffset({
                       x: (renderedWidth - containerW) / 2,
                       y: (renderedHeight - containerH) / 2
                     });
                  }}
                />
              </ScrollView>
            </ScrollView>
            <View style={styles.gridOverlay} pointerEvents="none">
              <View style={styles.gridLineV1} />
              <View style={styles.gridLineV2} />
              <View style={styles.gridLineH1} />
              <View style={styles.gridLineH2} />
            </View>
          </View>

          <View style={styles.cropActions}>
            <TouchableOpacity style={[styles.cropCancelBtn, { borderColor: theme.cardBorder }]} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} disabled={processing}>
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
    backgroundColor: 'rgba(0,0,0,0.85)',
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
    elevation: 5,
  },
  cropTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  cropSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  cropContainer: {
    alignSelf: 'center',
    borderRadius: 12,
    backgroundColor: '#111',
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative'
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)'
  },
  gridLineV1: { position: 'absolute', top: 0, bottom: 0, left: '33.33%', width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  gridLineV2: { position: 'absolute', top: 0, bottom: 0, left: '66.66%', width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  gridLineH1: { position: 'absolute', left: 0, right: 0, top: '33.33%', height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  gridLineH2: { position: 'absolute', left: 0, right: 0, top: '66.66%', height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
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
