const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// Manually parse functions/.env to load credentials
const envPath = path.join(__dirname, '..', 'functions', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) {
      const key = parts[0].trim();
      const val = parts[1].trim().replace(/['"]/g, '');
      process.env[key] = val;
    }
  });
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function test() {
  try {
    console.log("Testing Cloudinary configuration with user credentials...");
    console.log("Cloud Name:", cloudinary.config().cloud_name);
    console.log("API Key:", cloudinary.config().api_key);
    
    const result = await cloudinary.api.ping();
    console.log("Ping result:", result);
    console.log("SUCCESS! Credentials are 100% valid.");
  } catch (error) {
    console.error("Cloudinary test failed:", error);
  }
}

test();
