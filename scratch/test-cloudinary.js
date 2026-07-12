const cloudinary = require('cloudinary').v2;
require('dotenv').config({path: 'functions/.env'});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const timestamp = Math.round(new Date().getTime() / 1000);
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

const signature = cloudinary.utils.api_sign_request(
  { timestamp: timestamp, upload_preset: uploadPreset },
  cloudinary.config().api_secret
);

console.log({
  signature: signature,
  timestamp: timestamp,
  api_key: cloudinary.config().api_key,
  cloud_name: cloudinary.config().cloud_name,
  upload_preset: uploadPreset
});
