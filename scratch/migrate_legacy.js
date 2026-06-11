const fs = require('fs');

async function run() {
  try {
    const configPath = '/Users/raushanisonline/.config/configstore/firebase-tools.json';
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = config.tokens.access_token;
    
    // 1. Fetch documents from legacy users collection
    const legacyUrl = 'https://firestore.googleapis.com/v1/projects/mcemotihari-app/databases/(default)/documents/users?pageSize=100';
    console.log('Fetching legacy users...');
    const legacyRes = await fetch(legacyUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const legacyData = await legacyRes.json();
    if (legacyData.error) {
      console.error('Error fetching legacy users:', JSON.stringify(legacyData.error, null, 2));
      return;
    }
    
    if (!legacyData.documents || legacyData.documents.length === 0) {
      console.log('No legacy users found in /users collection.');
      return;
    }
    
    console.log(`Found ${legacyData.documents.length} legacy user documents. Checking if they need migration...`);
    
    for (const doc of legacyData.documents) {
      const parts = doc.name.split('/');
      const uid = parts[parts.length - 1];
      const fields = doc.fields || {};
      
      const email = fields.email ? fields.email.stringValue : null;
      const phone = fields.phone ? fields.phone.stringValue : null;
      const rollNo = fields.rollNo ? fields.rollNo.stringValue : null;
      const regNo = fields.regNo ? fields.regNo.stringValue : null;
      const hasPassword = fields.hasPassword ? fields.hasPassword.booleanValue : false;
      
      if (!email) {
        console.log(`User ${uid} has no email in legacy doc. Skipping.`);
        continue;
      }
      
      // Check if privateUsers doc already exists
      const privateUrl = `https://firestore.googleapis.com/v1/projects/mcemotihari-app/databases/(default)/documents/privateUsers/${uid}`;
      const privateRes = await fetch(privateUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const privateData = await privateRes.json();
      const exists = !privateData.error;
      
      if (exists) {
        console.log(`privateUsers/${uid} already exists. Skipping.`);
      } else {
        console.log(`Migrating legacy user ${uid} (${email}) to privateUsers...`);
        
        // Write to privateUsers
        const writeUrl = `https://firestore.googleapis.com/v1/projects/mcemotihari-app/databases/(default)/documents/privateUsers/${uid}`;
        const writeRes = await fetch(writeUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              email: { stringValue: email },
              phone: { stringValue: phone || '' },
              rollNo: { stringValue: rollNo || '' },
              regNo: { stringValue: regNo || '' },
              hasPassword: { booleanValue: hasPassword }
            }
          })
        });
        
        const writeData = await writeRes.json();
        if (writeData.error) {
          console.error(`Failed to migrate ${uid}:`, JSON.stringify(writeData.error, null, 2));
        } else {
          console.log(`Successfully migrated ${uid}!`);
        }
      }
    }
    
    console.log('Migration check complete.');
  } catch (err) {
    console.error('Error during migration:', err);
  }
}

run();
