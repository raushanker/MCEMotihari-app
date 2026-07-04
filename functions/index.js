const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

admin.initializeApp();

exports.dynamicPreview = functions.https.onRequest(async (req, res) => {
  const cleanPath = req.path.replace(/^\//, ''); // Remove leading slash
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  const defaultHtml = () => {
    try {
      return fs.readFileSync(indexPath, 'utf8');
    } catch (e) {
      return '<html><head></head><body>App Loading...</body></html>';
    }
  };

  try {
    let title = 'MCE Motihari Connect';
    let description = 'The official digital campus for MCE Motihari alumni and students.';
    let photoUrl = 'https://mcemotihari-app.web.app/assets/images/icon.png';
    let url = 'https://mcemotihari-app.web.app';

    if (cleanPath.startsWith('@')) {
      // Profile Preview
      const username = cleanPath.substring(1).trim().toLowerCase();
      const usernameDoc = await admin.firestore().collection('usernames').doc(username).get();
      
      if (usernameDoc.exists) {
        const { uid } = usernameDoc.data();
        if (uid) {
          // Fetch from publicProfiles to adhere to the secure architecture
          const userDoc = await admin.firestore().collection('publicProfiles').doc(uid).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            const name = userData.name || 'Campus Member';
            const role = userData.role || 'Student';
            const branch = userData.department || 'General';
            photoUrl = userData.photoUrl || photoUrl;
            
            title = `${name} | MCE Motihari`;
            description = `${branch} • ${role} • MCE Motihari`;
            url = `https://mcemotihari-app.web.app/@${username}`;
          }
        }
      }
    } else if (cleanPath.startsWith('post/')) {
      // Post Preview
      const postId = cleanPath.replace('post/', '').split('?')[0].trim();
      const postDoc = await admin.firestore().collection('posts').doc(postId).get();
      
      if (postDoc.exists) {
        const postData = postDoc.data();
        let fallbackTitle = 'Post on MCE Connect app';
        if (postData.authorRole) {
          // e.g. [Student] Post on MCE Connect app
          fallbackTitle = `[${postData.authorRole}] Post on MCE Connect app`;
        }
        title = postData.title || fallbackTitle;
        
        if (postData.content) {
          // Trim description to 150 chars
          description = postData.content.length > 150 
            ? postData.content.substring(0, 147) + '...' 
            : postData.content;
        }

        if (postData.imageUrl) {
          photoUrl = postData.imageUrl;
        } else if (postData.authorPhoto) {
          photoUrl = postData.authorPhoto;
        }
        
        url = `https://mcemotihari-app.web.app/post/${postId}`;
      }
    } else {
      return res.status(200).send(defaultHtml());
    }
    // Inject Meta Tags
    let html = defaultHtml();
    
    const setMetaTag = (htmlText, key, value, isProperty = true) => {
      const attr = isProperty ? 'property' : 'name';
      const regex1 = new RegExp(`(<meta[^>]*${attr}="${key}"[^>]*content=")[^"]*("[^>]*>)`, 'gi');
      const regex2 = new RegExp(`(<meta[^>]*content=")[^"]*("[^>]*${attr}="${key}"[^>]*>)`, 'gi');
      
      let res = htmlText;
      if (regex1.test(res)) {
        res = res.replace(regex1, `$1${value}$2`);
      } else if (regex2.test(res)) {
        res = res.replace(regex2, `$1${value}$2`);
      } else {
        res = res.replace('<head>', `<head><meta ${attr}="${key}" content="${value}" />`);
      }
      return res;
    };
    
    // Standard Meta
    html = html.replace(/<title>[^<]*<\/title>/gi, `<title>${title}</title>`);
    html = setMetaTag(html, 'og:title', title, true);
    html = setMetaTag(html, 'og:image', photoUrl, true);
    html = setMetaTag(html, 'og:description', description, true);
    html = setMetaTag(html, 'og:url', url, true);
    
    // Twitter Cards
    html = setMetaTag(html, 'twitter:title', title, false);
    html = setMetaTag(html, 'twitter:image', photoUrl, false);
    html = setMetaTag(html, 'twitter:description', description, false);
    
    res.status(200).send(html);
  } catch (error) {
    console.error('Error rewriting dynamic meta tags:', error);
    res.status(200).send(defaultHtml());
  }
});

exports.lookupEmail = functions.https.onCall(async (data, context) => {
  const { identifier } = data;
  if (!identifier) {
    throw new functions.https.HttpsError('invalid-argument', 'Kripya email, username ya phone number darj karein.');
  }

  const cleanIdentifier = identifier.trim();

  // If phone number
  if (cleanIdentifier.length === 10 && !isNaN(Number(cleanIdentifier))) {
    const snap = await admin.firestore().collection('privateUsers').where('phone', '==', cleanIdentifier).limit(1).get();
    if (!snap.empty) {
      return { email: snap.docs[0].data().email };
    }
    throw new functions.https.HttpsError('not-found', 'Is mobile number ke saath koi account nahi mila.');
  }

  // Otherwise check if username
  const username = cleanIdentifier.toLowerCase();
  const usernameDoc = await admin.firestore().collection('usernames').doc(username).get();
  
  if (usernameDoc.exists) {
    const uid = usernameDoc.data().uid;
    if (uid) {
      const privateDoc = await admin.firestore().collection('privateUsers').doc(uid).get();
      if (privateDoc.exists && privateDoc.data().email) {
        return { email: privateDoc.data().email };
      }
    }
  }

  throw new functions.https.HttpsError('not-found', 'Is username ke saath koi account nahi mila.');
});

const cloudinary = require('cloudinary').v2;

exports.generateCloudinarySignature = functions.https.onCall(async (data, context) => {
  // Enforce Authenticated Uploads Only
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Signed uploads ke liye authentication required hai.');
  }

  const legacyConfig = functions.config().cloudinary || {};
  const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || legacyConfig.cloud_name,
    api_key: process.env.CLOUDINARY_API_KEY || legacyConfig.api_key,
    api_secret: process.env.CLOUDINARY_API_SECRET || legacyConfig.api_secret,
    upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || legacyConfig.upload_preset
  };

  if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret || !cloudinaryConfig.upload_preset) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Cloudinary upload configuration is missing on the server.'
    );
  }

  // Set Cloudinary configuration from server-only environment/config values.
  cloudinary.config({
    cloud_name: cloudinaryConfig.cloud_name,
    api_key: cloudinaryConfig.api_key,
    api_secret: cloudinaryConfig.api_secret
  });

  const timestamp = Math.round(new Date().getTime() / 1000);
  const uploadPreset = cloudinaryConfig.upload_preset;

  // Generate signature securely on the server side using the Cloudinary administrative SDK!
  const signature = cloudinary.utils.api_sign_request(
    { timestamp: timestamp, upload_preset: uploadPreset },
    cloudinary.config().api_secret
  );

  return {
    signature: signature,
    timestamp: timestamp,
    api_key: cloudinary.config().api_key,
    cloud_name: cloudinary.config().cloud_name,
    upload_preset: uploadPreset
  };
});

exports.syncAllUsersProfileData = functions.https.onRequest(async (req, res) => {
  const secret = req.query.secret;
  if (secret !== 'mce_connect_sync_2026') {
    return res.status(403).send('Unauthorized');
  }

  const db = admin.firestore();
  try {
    console.log("Fetching all public profiles...");
    const profilesSnap = await db.collection('publicProfiles').get();
    
    let totalPostsUpdated = 0;
    let totalCommentsUpdated = 0;
    let totalRepliesUpdated = 0;
    let totalUsersSynced = 0;

    for (const profileDoc of profilesSnap.docs) {
      const p = profileDoc.data();
      const userUid = profileDoc.id;
      const currentName = p.name;
      const currentPhoto = p.photoUrl;
      const currentRole = p.adminRole ? 'Admin' : p.role;

      if (!currentName) continue;
      totalUsersSynced++;

      // 1. Sync posts authored by this user
      const postsSnap = await db.collection('posts').where('authorUid', '==', userUid).get();
      let postsBatch = db.batch();
      let postsBatchCount = 0;
      
      for (const postDoc of postsSnap.docs) {
        const postData = postDoc.data();
        if (
          postData.authorName !== currentName ||
          postData.authorRole !== currentRole ||
          (currentPhoto && postData.authorPhoto !== currentPhoto)
        ) {
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
      }

      // 2. Sync comments authored by this user
      const commentsSnap = await db.collectionGroup('comments').where('userId', '==', userUid).get();
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

        // Check nested replies
        if (commentData.replies && Array.isArray(commentData.replies)) {
          let repliesUpdated = false;
          const updatedReplies = commentData.replies.map(reply => {
            if (reply.userId === userUid) {
              repliesUpdated = true;
              totalRepliesUpdated++;
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

            if (c.replies && Array.isArray(c.replies)) {
              let repliesUpdated = false;
              const newReplies = c.replies.map(r => {
                if (r.userId === userUid) {
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
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      totalPostsUpdated,
      totalCommentsUpdated,
      totalRepliesUpdated,
      totalUsersSynced
    });
  } catch (error) {
    console.error("Migration error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


exports.adminChangePassword = functions.https.onCall(async (data, context) => {
  // 1. Verify Authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to perform this action.');
  }

  // 2. Verify Admin Privileges
  const callerUid = context.auth.uid;
  const callerProfileDoc = await admin.firestore().collection('publicProfiles').doc(callerUid).get();
  
  if (!callerProfileDoc.exists || callerProfileDoc.data().role !== 'Admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can change user passwords.');
  }

  // 3. Extract and Validate Input
  const { targetUid, newPassword } = data;
  
  if (!targetUid || typeof targetUid !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'The targetUid parameter is required and must be a string.');
  }
  
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'The newPassword parameter is required and must be a string of at least 6 characters.');
  }

  try {
    // 4. Update the User's Password via Admin SDK
    await admin.auth().updateUser(targetUid, {
      password: newPassword
    });

    // 5. Update the User's privateUsers document so the app knows they have a password
    await admin.firestore().collection('privateUsers').doc(targetUid).set({
      hasPassword: true
    }, { merge: true });

    return { success: true, message: 'Password updated successfully.' };
  } catch (error) {
    console.error(`Error changing password for user ${targetUid}:`, error);
    throw new functions.https.HttpsError('internal', `Failed to update password: ${error.message}`);
  }
});

