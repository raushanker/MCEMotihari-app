const { initializeApp } = require('firebase/app');
const { getFirestore, doc, runTransaction, serverTimestamp } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyCnmV4wvta_ovLwQJT0nNT2ul1oFDHmjsA",
  authDomain: "mcemotihari-app.firebaseapp.com",
  projectId: "mcemotihari-app",
  storageBucket: "mcemotihari-app.firebasestorage.app",
  messagingSenderId: "1071649927142",
  appId: "1:1071649927142:web:b8d54d5c705fb290ff7027"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const TEST_EMAIL = 'test_voter_mce_2@mce.ac.in';
const TEST_PASSWORD = 'password123';
const POST_ID = 'BQlADJSXZ4lx1R8qJQRA';
const OPTION_ID = 'opt-0-1780148809276'; // Option label: "yes"

async function run() {
  let userUid;
  try {
    console.log(`Attempting to sign in with ${TEST_EMAIL}...`);
    const result = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    userUid = result.user.uid;
    console.log('Signed in successfully! Uid:', userUid);
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      console.log('User not found. Creating test user...');
      const result = await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
      userUid = result.user.uid;
      console.log('Created test user successfully! Uid:', userUid);
    } else {
      console.error('Sign-in / registration error:', err);
      return;
    }
  }

  console.log(`Starting transaction: voting for post ${POST_ID}, option ${OPTION_ID}...`);
  try {
    const postRef = doc(db, 'posts', POST_ID);
    await runTransaction(db, async (transaction) => {
      console.log('Reading postDoc...');
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists()) {
        throw new Error('Post does not exist');
      }
      
      const postData = postDoc.data();
      console.log('PostData loaded: totalVotes =', postData.totalVotes);
      
      if (!postData.pollOptions) throw new Error('Not a poll');
      const allowMultiple = !!postData.allowMultipleVotes;
      
      const voteDocId = allowMultiple ? `${POST_ID}_${userUid}_${OPTION_ID}` : `${POST_ID}_${userUid}`;
      const voteRef = doc(db, 'pollVotes', voteDocId);
      
      console.log('Reading voteDoc...');
      const voteDoc = await transaction.get(voteRef);
      console.log('voteDoc exists:', voteDoc.exists());
      
      if (voteDoc.exists() && !allowMultiple) {
        throw new Error('Already voted');
      }

      const newOptions = postData.pollOptions.map((opt) => {
        if (opt.id === OPTION_ID) return { ...opt, votes: (opt.votes || 0) + 1 };
        return opt;
      });

      const updates = {
        pollOptions: newOptions,
        totalVotes: (postData.totalVotes || 0) + 1,
      };

      console.log('Queueing update to posts...');
      transaction.update(postRef, updates);
      
      console.log('Queueing set to pollVotes...');
      transaction.set(voteRef, {
        postId: POST_ID,
        userId: userUid,
        selectedOption: OPTION_ID,
        votedAt: serverTimestamp()
      });
    });
    console.log('TRANSACTION SUCCESSFUL! Vote recorded successfully!');
  } catch (e) {
    console.error('TRANSACTION EXCEPTION:', e);
  }
}

run();
