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
    
    // Standard Meta
    html = html.replace(/<title>[^<]*<\/title>/g, `<title>${title}</title>`);
    html = html.replace(/<meta[^>]*property="og:title"[^>]*content="[^"]*"[^>]*>/gi, `<meta property="og:title" content="${title}" />`);
    html = html.replace(/<meta[^>]*property="og:image"[^>]*content="[^"]*"[^>]*>/gi, `<meta property="og:image" content="${photoUrl}" />`);
    html = html.replace(/<meta[^>]*property="og:description"[^>]*content="[^"]*"[^>]*>/gi, `<meta property="og:description" content="${description}" />`);
    html = html.replace(/<meta[^>]*property="og:url"[^>]*content="[^"]*"[^>]*>/gi, `<meta property="og:url" content="${url}" />`);
    
    // Twitter Cards
    html = html.replace(/<meta[^>]*name="twitter:title"[^>]*content="[^"]*"[^>]*>/gi, `<meta name="twitter:title" content="${title}" />`);
    html = html.replace(/<meta[^>]*name="twitter:image"[^>]*content="[^"]*"[^>]*>/gi, `<meta name="twitter:image" content="${photoUrl}" />`);
    html = html.replace(/<meta[^>]*name="twitter:description"[^>]*content="[^"]*"[^>]*>/gi, `<meta name="twitter:description" content="${description}" />`);
    
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
