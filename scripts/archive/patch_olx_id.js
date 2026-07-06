const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'olx', '[id].tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import if not present
if (!content.includes('import ImageViewing from')) {
    content = content.replace(
        "import { Image } from 'expo-image';",
        "import { Image } from 'expo-image';\nimport ImageViewing from 'react-native-image-viewing';"
    );
}

// 2. Add state for image viewer
if (!content.includes('isImageViewVisible')) {
    content = content.replace(
        "const [isSubmittingReplyEdit, setIsSubmittingReplyEdit] = useState(false);",
        "const [isSubmittingReplyEdit, setIsSubmittingReplyEdit] = useState(false);\n  const [isImageViewVisible, setIsImageViewVisible] = useState(false);"
    );
}

// 3. Wrap Image with TouchableOpacity
const imageBlock = `{item.imageUrl && (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.mainImage} 
              contentFit="cover"
            />
          )}`;

const newImageBlock = `{item.imageUrl && (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setIsImageViewVisible(true)}>
              <Image 
                source={{ uri: item.imageUrl }} 
                style={styles.mainImage} 
                contentFit="cover"
              />
            </TouchableOpacity>
          )}`;

if (content.includes(imageBlock)) {
    content = content.replace(imageBlock, newImageBlock);
}

// 4. Add ImageViewing component near the end
const finalBlock = `
      {item?.imageUrl && (
        <ImageViewing
          images={[{ uri: item.imageUrl }]}
          imageIndex={0}
          visible={isImageViewVisible}
          onRequestClose={() => setIsImageViewVisible(false)}
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
        />
      )}
    </KeyboardAvoidingView>
  );
}
`;

content = content.replace('    </KeyboardAvoidingView>\n  );\n}', finalBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched olx id.tsx');
