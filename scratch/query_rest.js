const fs = require('fs');
const path = require('path');

const projectId = "mcemotihari-app";

// Search for firebase-tools config
const homeDir = process.env.HOME || process.env.USERPROFILE || "/Users/raushanisonline";
const configPath = path.join(homeDir, '.config', 'configstore', 'firebase-tools.json');

console.log("Looking for Firebase credentials at:", configPath);

if (!fs.existsSync(configPath)) {
  console.error("Firebase CLI config not found at expected path!");
  process.exit(1);
}

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const tokens = config.tokens || {};
  
  const token = tokens.access_token;
  if (!token) {
    console.error("Access token not found in config.");
    process.exit(1);
  }

  console.log("Access token found. Current Date.now():", Date.now());
  console.log("Token expires_at:", tokens.expires_at);
  console.log("Difference (sec):", (tokens.expires_at - Date.now()) / 1000);
  
  async function queryFirestore() {
    try {
      console.log("Querying Firestore REST API...");
      // Query study_material_submissions, ordered by createdAt desc
      const queryPayload = {
        structuredQuery: {
          from: [{ collectionId: "study_material_submissions" }],
          orderBy: [{
            field: { fieldPath: "createdAt" },
            direction: "DESCENDING"
          }],
          limit: 10
        }
      };

      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
      
      const response = await fetch(firestoreUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(queryPayload)
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }
      
      console.log(`\nFound ${data.length || 0} query results:`);
      data.forEach((result, idx) => {
        const doc = result.document;
        if (!doc) return;
        const fields = doc.fields || {};
        const nameParts = doc.name.split('/');
        const id = nameParts[nameParts.length - 1];
        console.log(`[Result ${idx + 1}] Document ID: ${id}`);
        console.log(`  Title: ${fields.title?.stringValue}`);
        console.log(`  Status: ${fields.status?.stringValue}`);
        console.log(`  FileUrl: ${fields.fileUrl?.stringValue}`);
        console.log(`  StoragePath: ${fields.storagePath?.stringValue}`);
        console.log(`  CreatedAt: ${fields.createdAt?.stringValue}`);
        console.log('--------------------------------------------------');
      });
      
    } catch (err) {
      console.error("REST query failed:", err.message);
    }
  }
  
  queryFirestore();
  
} catch (e) {
  console.error("Failed to parse config file:", e.message);
}
