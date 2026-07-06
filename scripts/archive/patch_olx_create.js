const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'olx', 'create.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update import
content = content.replace(
  "import { launchMediaPicker } from '@/utils/mediaPicker';",
  "import { pickMediaWithOptions } from '@/utils/mediaPicker';"
);

// 2. Update handlePickImage & handleCropApply
const oldHandlePickImage = `  const handlePickImage = async () => {
    try {
      const result = await launchMediaPicker({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Custom crop modal instead
        quality: 1.0,
      });

      if (result.uri) {
        setLocalImageUri(result.uri);
        setLocalImageSize({ width: result.width || 1000, height: result.height || 1000 });
        setShowCropModal(true);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not pick image.');
    }
  };

  const handleCropApply = async (croppedUri: string) => {
    setShowCropModal(false);
    setIsUploadingImage(true);
    const uploadedUrl = await uploadToCloudinary(croppedUri);
    if (uploadedUrl) {
      setImageUrl(uploadedUrl);
    } else {
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    }
    setIsUploadingImage(false);
  };`;

const newHandlePickImage = `  const handlePickImage = async () => {
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
  };`;

if (content.includes(oldHandlePickImage)) {
  content = content.replace(oldHandlePickImage, newHandlePickImage);
}

// 3. Add Crop Icon next to Remove icon
const oldImagePreview = `<TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUrl('')}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>`;
const newImagePreview = `<View style={styles.imageActionButtons}>
                <TouchableOpacity style={styles.imageActionBtn} onPress={() => setShowCropModal(true)}>
                  <Ionicons name="crop" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.imageActionBtn, { backgroundColor: '#EF4444' }]} onPress={() => { setImageUrl(''); setLocalImageUri(''); }}>
                  <Ionicons name="close" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>`;

if (content.includes(oldImagePreview)) {
  content = content.replace(oldImagePreview, newImagePreview);
}

// 4. Update Styles
const oldStyles = `  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 12,
  },`;
const newStyles = `  imageActionButtons: {
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
  },`;

if (content.includes(oldStyles)) {
  content = content.replace(oldStyles, newStyles);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched olx/create.tsx');
