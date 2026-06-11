const fs = require('fs');
const path = require('path');

const cloudName = "dxtuq3zd6";
const uploadPreset = "mce_preset";

async function testUpload() {
  try {
    console.log("Preparing mock PDF...");
    const pdfContent = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000114 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF";
    const tempPdfPath = path.join(__dirname, 'temp_test.pdf');
    fs.writeFileSync(tempPdfPath, pdfContent);

    // Read file as buffer
    const fileBuffer = fs.readFileSync(tempPdfPath);
    const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
    
    console.log("Uploading to Cloudinary /raw/upload...");
    const formData = new FormData();
    formData.append('file', fileBlob, 'temp_test.pdf');
    formData.append('upload_preset', uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
      method: 'POST',
      body: formData
    });

    const resText = await response.text();
    console.log("\n--- Cloudinary Upload Response ---");
    console.log("Status:", response.status);
    console.log("Body:", resText);

    if (response.ok) {
      const resJson = JSON.parse(resText);
      const secureUrl = resJson.secure_url;
      console.log("\nSecure URL:", secureUrl);
      console.log("Resource Type:", resJson.resource_type);

      console.log("\nFetching the uploaded URL...");
      const headResponse = await fetch(secureUrl, { method: 'GET' });
      const text = await headResponse.text();
      console.log("Status:", headResponse.status);
      console.log("Content-Type:", headResponse.headers.get('content-type'));
      console.log("Content-Length:", headResponse.headers.get('content-length'));
      console.log("Response Body (first 500 chars):", text.substring(0, 500));
    }

    // Clean up
    fs.unlinkSync(tempPdfPath);

  } catch (error) {
    console.error("Test failed:", error);
  }
}

testUpload();
