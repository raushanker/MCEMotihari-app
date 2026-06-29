const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc, collectionGroup, getDoc, writeBatch } = require('firebase/firestore');

// Load environment variables from .env
const envPath = path.join(__dirname, '..', '.env');
const processEnv = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim().replace(/^export\s+/, '');
      const val = parts.slice(1).join('=').trim().replace(/['"]/g, '');
      processEnv[key] = val;
    }
  });
}

const firebaseConfig = {
  apiKey: processEnv.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: processEnv.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: processEnv.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: processEnv.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: processEnv.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: processEnv.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    console.log("Fetching all public profiles...");
    const profilesSnap = await getDocs(collection(db, 'publicProfiles'));
    console.log(`Found ${profilesSnap.size} profiles.`);

    let totalPostsUpdated = 0;
    let totalCommentsUpdated = 0;

    for (const profileDoc of profilesSnap.docs) {
      const p = profileDoc.data();
      const uid = profileDoc.id;
      const currentName = p.name;
      const currentPhoto = p.photoUrl;
      const currentRole = p.adminRole ? 'Admin' : p.role;

      if (!currentName) continue;

      console.log(`Syncing profile: UID=${uid}, Name="${currentName}", Role="${currentRole}"`);

      // 1. Sync posts authored by this user
      const postsQuery = query(collection(db, 'posts'), where('authorUid', '==', uid));
      const postsSnap = await getDocs(postsQuery);
      
      let postsBatch = writeBatch(db);
      let postsBatchCount = 0;
      
      for (const postDoc of postsSnap.docs) {
        const postData = postDoc.data();
        if (
          postData.authorName !== currentName ||
          postData.authorRole !== currentRole ||
          (currentPhoto && postData.authorPhoto !== currentPhoto)
        ) {
          console.log(`  Updating post ${postDoc.id}: "${postData.title}"`);
          const updateData = {
            authorName: currentName,
            authorRole: currentRole
          };
          if (currentPhoto) {
            updateData.authorPhoto = currentPhoto;
          }
          postsBatch.update(postDoc.ref, updateData);
          postsBatchCount++;
          totalPostsUpdated++;
        }
      }
      
      if (postsBatchCount > 0) {
        await postsBatch.commit();
        console.log(`  Committed ${postsBatchCount} posts updates.`);
      }

      // 2. Sync comments authored by this user
      const commentsQuery = query(collectionGroup(db, 'comments'), where('userId', '==', uid));
      const commentsSnap = await getDocs(commentsQuery);
      
      let commentsBatch = writeBatch(db);
      let commentsBatchCount = 0;
      const parentPostRefs = {};

      for (const commentDoc of commentsSnap.docs) {
        const commentData = commentDoc.data();
        let needsUpdate = false;
        const patch = {};

        if (commentData.userName !== currentName || commentData.userRole !== currentRole || (currentPhoto && commentData.userPhoto !== currentPhoto)) {
          patch.userName = currentName;
          patch.userRole = currentRole;
          if (currentPhoto) {
            patch.userPhoto = currentPhoto;
          }
          needsUpdate = true;
        }

        // Check nested replies inside this comment authored by this user
        if (commentData.replies && Array.isArray(commentData.replies)) {
          let repliesUpdated = false;
          const updatedReplies = commentData.replies.map(reply => {
            if (reply.userId === uid) {
              repliesUpdated = true;
              const repPatch = {
                ...reply,
                userName: currentName,
                userRole: currentRole
              };
              if (currentPhoto) {
                repPatch.userPhoto = currentPhoto;
              }
              return repPatch;
            }
            return reply;
          });
          if (repliesUpdated) {
            patch.replies = updatedReplies;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          commentsBatch.update(commentDoc.ref, patch);
          commentsBatchCount++;
          totalCommentsUpdated++;

          const parentPostRef = commentDoc.ref.parent.parent;
          if (parentPostRef) {
            const postId = parentPostRef.id;
            if (!parentPostRefs[postId]) {
              parentPostRefs[postId] = {
                ref: parentPostRef,
                commentsToUpdate: []
              };
            }
            parentPostRefs[postId].commentsToUpdate.push({
              id: commentDoc.id,
              patch
            });
          }
        }
      }

      if (commentsBatchCount > 0) {
        await commentsBatch.commit();
        console.log(`  Committed ${commentsBatchCount} comment updates.`);
      }

      // 3. Sync comments array inside parent posts
      for (const postId of Object.keys(parentPostRefs)) {
        const postGroup = parentPostRefs[postId];
        const postSnap = await getDoc(postGroup.ref);
        if (postSnap.exists()) {
          const postData = postSnap.data();
          const currentComments = postData.comments || [];
          let postUpdated = false;

          const newComments = currentComments.map(c => {
            const match = postGroup.commentsToUpdate.find(up => up.id === c.id);
            if (match) {
              postUpdated = true;
              return { ...c, ...match.patch };
            }

            // Also check nested replies inside the parent comments array
            if (c.replies && Array.isArray(c.replies)) {
              let repliesUpdated = false;
              const newReplies = c.replies.map(r => {
                // If the reply has userId === uid
                if (r.userId === uid) {
                  repliesUpdated = true;
                  const repPatch = {
                    ...r,
                    userName: currentName,
                    userRole: currentRole
                  };
                  if (currentPhoto) repPatch.userPhoto = currentPhoto;
                  return repPatch;
                }
                return r;
              });

              if (repliesUpdated) {
                postUpdated = true;
                return { ...c, replies: newReplies };
              }
            }
            return c;
          });

          if (postUpdated) {
            await updateDoc(postGroup.ref, { comments: newComments });
            console.log(`  Updated comments field for post ${postId}`);
          }
        }
      }
    }

    console.log(`\nMigration completed successfully!`);
    console.log(`Total posts updated: ${totalPostsUpdated}`);
    console.log(`Total comments updated: ${totalCommentsUpdated}`);

  } catch (err) {
    console.error("Migration error:", err);
  }
}

run();
