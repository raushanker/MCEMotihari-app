const fs = require('fs');
const file = 'src/components/modals/ForwardedMessageCard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Change layout in JSX
content = content.replace(
  /<View style=\{styles.content\}>\s*\{\/\* Thumbnail \*\/\}\s*\{forwardPreview\.imageUrl && \(\s*<Image\s*source=\{\{ uri: forwardPreview\.imageUrl \}\}\s*style=\{styles\.thumbnail\}\s*contentFit="cover"\s*\/>\s*\)\}\s*<View style=\{styles\.textContent\}>/m,
  `<View style={styles.content}>
        {/* Thumbnail (YouTube Style) */}
        {forwardPreview.imageUrl && (
          <Image
            source={{ uri: forwardPreview.imageUrl }}
            style={styles.thumbnail}
            contentFit="cover"
          />
        )}

        <View style={styles.textContent}>`
);

// Update styles
content = content.replace(
  /content: \{\s*flexDirection: 'row',\s*paddingHorizontal: 12,\s*paddingBottom: 10,\s*gap: 12,\s*\}/,
  `content: {
    flexDirection: 'column',
    paddingBottom: 10,
  }`
);

content = content.replace(
  /thumbnail: \{\s*width: 60,\s*height: 60,\s*borderRadius: 10,\s*flexShrink: 0,\s*backgroundColor: 'rgba\(0,0,0,0\.05\)',\s*\}/,
  `thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'rgba(0,0,0,0.05)',
  }`
);

content = content.replace(
  /textContent: \{\s*flex: 1,\s*gap: 4,\s*justifyContent: 'center',\s*\}/,
  `textContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 4,
  }`
);

fs.writeFileSync(file, content);
console.log("Fixed ForwardedMessageCard layout");
