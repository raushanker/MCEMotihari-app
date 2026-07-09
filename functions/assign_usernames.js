const admin = require('firebase-admin');

// Initialize the app with default credentials (uses local CLI configuration)
admin.initializeApp({
  projectId: 'mcemotihari-app'
});

const db = admin.firestore();

function generateRandomDigits(length = 2) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

function getCandidateUsername(name, attempt = 1) {
  const cleanName = (name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nameParts = (name || 'user').toLowerCase().trim().split(/\s+/);
  const firstName = nameParts[0].replace(/[^a-z0-9]/g, '');

  if (attempt === 1) {
    return firstName + generateRandomDigits(2);
  } else if (attempt === 2) {
    return cleanName + generateRandomDigits(2);
  } else {
    return cleanName + generateRandomDigits(4);
  }
}

async function run() {
  try {
    console.log("Fetching all public profiles...");
    const profilesSnap = await db.collection('publicProfiles').get();
    console.log(`Found ${profilesSnap.size} profiles.`);

    let usersUpdatedCount = 0;

    for (const profileDoc of profilesSnap.docs) {
      const p = profileDoc.data();
      const uid = profileDoc.id;
      
      // If they already have a username in publicProfiles, skip
      if (p.username) {
        continue;
      }

      console.log(`User ${p.name} (UID: ${uid}) has no username. Generating...`);

      let assignedUsername = null;
      let attempt = 1;

      while (!assignedUsername) {
        const candidate = getCandidateUsername(p.name, attempt);
        const usernameDoc = await db.collection('usernames').doc(candidate).get();

        if (!usernameDoc.exists) {
          assignedUsername = candidate;
        } else {
          attempt++;
          if (attempt > 10) {
            console.error(`Could not generate unique username for ${uid}`);
            break;
          }
        }
      }

      if (assignedUsername) {
        console.log(`Assigning username "${assignedUsername}" to ${uid}...`);

        const batch = db.batch();

        // 1. Update publicProfiles
        batch.update(db.collection('publicProfiles').doc(uid), {
          username: assignedUsername
        });

        // 2. Update users
        batch.update(db.collection('users').doc(uid), {
          username: assignedUsername
        });

        // 3. Create usernames document
        batch.set(db.collection('usernames').doc(assignedUsername), {
          uid: uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
        console.log(`Success: ${assignedUsername}`);
        usersUpdatedCount++;
      }
    }

    console.log(`\nOperation Complete. Total users updated: ${usersUpdatedCount}`);

  } catch (error) {
    console.error("Error executing script:", error);
  }
}

run();
