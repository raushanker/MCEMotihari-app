const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'olx', 'create.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add ImageCropModal import
if (!content.includes('ImageCropModal')) {
    content = content.replace(
        "import { TextInput } from '@/components/ui/TextInput';",
        "import { TextInput } from '@/components/ui/TextInput';\nimport { ImageCropModal } from '@/components/modals/ImageCropModal';"
    );
}

// 2. Add states for crop modal
if (!content.includes('showCropModal')) {
    content = content.replace(
        "const [isSubmitting, setIsSubmitting] = useState(false);",
        "const [isSubmitting, setIsSubmitting] = useState(false);\n  const [showCropModal, setShowCropModal] = useState(false);\n  const [localImageUri, setLocalImageUri] = useState('');\n  const [localImageSize, setLocalImageSize] = useState({ width: 1000, height: 1000 });"
    );
}

// 3. Update handlePickImage
const oldHandlePickImage = `  const handlePickImage = async () => {
    try {
      const result = await launchMediaPicker({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.uri) {
        setIsUploadingImage(true);
        const uploadedUrl = await uploadToCloudinary(result.uri);
        if (uploadedUrl) {
          setImageUrl(uploadedUrl);
        } else {
          Alert.alert('Error', 'Failed to upload image. Please try again.');
        }
        setIsUploadingImage(false);
      }
    } catch (error) {
      console.error(error);
      setIsUploadingImage(false);
      Alert.alert('Error', 'Could not pick image.');
    }
  };`;

const newHandlePickImage = `  const handlePickImage = async () => {
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

if (content.includes(oldHandlePickImage)) {
    content = content.replace(oldHandlePickImage, newHandlePickImage);
}

// 4. Add ImageCropModal component at the end
const cropModalBlock = `      <ImageCropModal
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
}`;

content = content.replace('    </KeyboardAvoidingView>\n  );\n}', cropModalBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully added custom crop modal to create.tsx');
