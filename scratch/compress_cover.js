const Jimp = require('jimp-compact');
const path = require('path');

const inputPath = path.join(__dirname, '../assets/images/NAB.jpg');
const outputPath = path.join(__dirname, '../assets/images/NAB.jpg'); // Overwrite original

console.log('Starting image compression using jimp-compact...');
console.log('Input:', inputPath);

Jimp.read(inputPath)
  .then(image => {
    return image
      .resize(800, Jimp.AUTO) // Resize width to 800px, auto height
      .quality(70)           // Moderate compression for extreme speed but good quality
      .write(outputPath, (err) => {
        if (err) {
          console.error('Error writing compressed image:', err);
        } else {
          console.log('Image compressed and overwritten successfully!');
        }
      });
  })
  .catch(err => {
    console.error('Error processing image:', err);
  });
