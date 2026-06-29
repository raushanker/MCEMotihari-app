const admin = require('firebase-admin');

// Initialize the app with default credentials (uses local CLI configuration)
admin.initializeApp({
  projectId: 'mcemotihari-app'
});

const db = admin.firestore();

async function run() {
  try {
    console.log("Fetching all public profiles...");
    const profilesSnap = await db.collection('publicProfiles').get();
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
      const postsSnap = await db.collection('posts').where('authorUid', '==', uid).get();
      
      let postsBatch = db.batch();
      let postsBatchCount = 0;
      
      for (const postDoc of postsSnap.docs) {
        const postData = postDoc.data();
        if (
          postData.authorName !== currentName ||
          postData.authorRole !== currentRole ||
          (currentPhoto && postData.authorPhoto !== currentPhoto)
        ) {
          console.log(`  Updating post ${postDoc.id}: "${postData.title || postData.content?.substring(0, 30)}"`);
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
      const commentsSnap = await db.collectionGroup('comments').where('userId', '==', uid).get();
      
      let commentsBatch = db.batch();
      let commentsBatchCount = 0;
      const parentPostRefs = {};

      for (const commentDoc of commentsSnap.docs) {
        const commentData = commentDoc.data();
        let needsUpdate = false;
        const patch = {};

        if (
          commentData.userName !== currentName || 
          commentData.userRole !== currentRole || 
          (currentPhoto && commentData.userPhoto !== currentPhoto)
        ) {
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
        const postSnap = await postGroup.ref.get();
        if (postSnap.exists) {
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
            await postGroup.ref.update({ comments: newComments });
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
