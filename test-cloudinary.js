const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'jmd0mhdy',
  api_key: '462872616117718',
  api_secret: '1ZpZwzXjNXzdpoJHBQZTjhFyNFg'
});

const timestamp = Math.round(new Date().getTime() / 1000);
const uploadPreset = 'mce_preset';

const signature = cloudinary.utils.api_sign_request(
  { timestamp: timestamp, upload_preset: uploadPreset },
  '1ZpZwzXjNXzdpoJHBQZTjhFyNFg'
);

console.log("Signature generated:", signature);

// Try uploading a small 1x1 pixel base64 image
const base64Img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

cloudinary.uploader.upload(base64Img, {
  upload_preset: uploadPreset,
  timestamp: timestamp,
  signature: signature,
  api_key: '462872616117718'
}, function(error, result) {
  if (error) {
    console.error("Cloudinary Upload Error:", error);
  } else {
    console.log("Cloudinary Upload Success:", result.secure_url);
  }
});
