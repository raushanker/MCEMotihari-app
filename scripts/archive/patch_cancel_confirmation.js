const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'olx', 'create.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const handlePostFn = `  const handlePost = async () => {`;
const handleCloseFn = `  const handleClose = () => {
    const hasUnsavedChanges = title.trim().length > 0 || description.trim().length > 0 || price.trim().length > 0 || imageUrl.length > 0 || localImageUri.length > 0;
    
    if (hasUnsavedChanges) {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm('Are you sure you want to cancel item listing? Any unsaved changes will be lost.');
        if (confirmed) router.back();
      } else {
        Alert.alert(
          'Cancel Listing? 🛑',
          'Are you sure you want to cancel this listing? All details will be lost.',
          [
            { text: 'Keep Editing', style: 'cancel' },
            { 
              text: 'Discard', 
              style: 'destructive',
              onPress: () => router.back() 
            }
          ]
        );
      }
    } else {
      router.back();
    }
  };

  const handlePost = async () => {`;

if (content.includes(handlePostFn)) {
  content = content.replace(handlePostFn, handleCloseFn);
} else {
  console.log('Failed to find handlePost');
  process.exit(1);
}

const backButtonCode = `<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>`;
const newBackButtonCode = `<TouchableOpacity onPress={handleClose} style={styles.backButton}>`;

if (content.includes(backButtonCode)) {
  content = content.replace(backButtonCode, newBackButtonCode);
} else {
  console.log('Failed to find backButtonCode');
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully added cancellation confirmation');
