const fs = require('fs');

async function setAdminRole(uid, role) {
  try {
    const configPath = '/Users/raushanisonline/.config/configstore/firebase-tools.json';
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = config.tokens.access_token;
    
    const url = `https://firestore.googleapis.com/v1/projects/mcemotihari-app/databases/(default)/documents/publicProfiles/${uid}?updateMask.fieldPaths=adminRole`;
    
    console.log(`Setting adminRole for ${uid} to ${role}...`);
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          adminRole: {
            stringValue: role
          }
        }
      })
    });
    
    const data = await res.json();
    if (data.error) {
      console.error(`Error updating ${uid}:`, JSON.stringify(data.error, null, 2));
    } else {
      console.log(`Successfully updated ${uid}!`);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

async function run() {
  // Update both potential admin accounts to SUPER_ADMIN so they pass the Firestore rules
  await setAdminRole('Zdxi8kTc2kcs1cOPxWS81PTVmco2', 'SUPER_ADMIN');
  await setAdminRole('DdP2c855PSRUJwhmN9rvbkYBraP2', 'SUPER_ADMIN');
  await setAdminRole('C6eVR9pBl4Rr81LMn0Y1SFOXVxt2', 'SUPER_ADMIN');
}

run();
