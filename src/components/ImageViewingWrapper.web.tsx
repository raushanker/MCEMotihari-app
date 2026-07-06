import React from 'react';
import { Modal, View, Text, TouchableOpacity, Image } from 'react-native';

export default function ImageViewing({ images, imageIndex, visible, onRequestClose }: any) {
  if (!visible) return null;
  const currentImage = images[imageIndex || 0];

  return (
    <Modal visible={visible} transparent={true} onRequestClose={onRequestClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity 
          style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }} 
          onPress={onRequestClose}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Close</Text>
        </TouchableOpacity>
        {currentImage && (
          <Image 
            source={currentImage} 
            style={{ width: '90%', height: '80%', resizeMode: 'contain' }} 
          />
        )}
      </View>
    </Modal>
  );
}
