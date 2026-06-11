const fs = require('fs');

async function run() {
  try {
    const configPath = '/Users/raushanisonline/.config/configstore/firebase-tools.json';
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const token = config.tokens.access_token;
    
    let nextPageToken = null;
    let totalProfiles = 0;
    let migratedCount = 0;

    console.log('Starting migration to map lowercase UIDs in Firestore...');

    do {
      let url = 'https://firestore.googleapis.com/v1/projects/mcemotihari-app/databases/(default)/documents/publicProfiles?pageSize=300';
      if (nextPageToken) {
        url += `&pageToken=${nextPageToken}`;
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (data.error) {
        console.error('Error fetching public profiles:', JSON.stringify(data.error, null, 2));
        break;
      }

      const documents = data.documents || [];
      totalProfiles += documents.length;

      for (const doc of documents) {
        // Document path is: projects/mcemotihari-app/databases/(default)/documents/publicProfiles/UID
        const parts = doc.name.split('/');
        const caseSensitiveUid = parts[parts.length - 1];
        const lowercaseUid = caseSensitiveUid.toLowerCase();

        // Write usernames/lowercaseUid -> { uid: caseSensitiveUid }
        const usernameUrl = `https://firestore.googleapis.com/v1/projects/mcemotihari-app/databases/(default)/documents/usernames/${lowercaseUid}`;
        
        // Write the document
        const writeRes = await fetch(usernameUrl, {
          method: 'PATCH', // PATCH with no query params acts as a create/update (set)
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              uid: {
                stringValue: caseSensitiveUid
              }
            }
          })
        });

        const writeData = await writeRes.json();
        if (writeData.error) {
          console.error(`Failed to map ${lowercaseUid} to ${caseSensitiveUid}:`, writeData.error.message);
        } else {
          migratedCount++;
          console.log(`Mapped lowercase UID: ${lowercaseUid} -> ${caseSensitiveUid}`);
        }
      }

      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    console.log(`\nMigration completed successfully!`);
    console.log(`Total publicProfiles fetched: ${totalProfiles}`);
    console.log(`Total lowercase mappings written to usernames collection: ${migratedCount}`);

  } catch (err) {
    console.error('Error in migration script:', err);
  }
}

run();
