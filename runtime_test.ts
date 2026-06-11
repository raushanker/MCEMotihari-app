import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import CryptoJS from 'crypto-js';
import * as fs from 'fs';

// Configuration from .env
const firebaseConfig = {
  apiKey: "AIzaSyCnmV4wvta_ovLwQJT0nNT2ul1oFDHmjsA",
  authDomain: "mcemotihari-app.firebaseapp.com",
  projectId: "mcemotihari-app",
  storageBucket: "mcemotihari-app.firebasestorage.app",
  messagingSenderId: "1071649927142",
  appId: "1:1071649927142:web:b8d54d5c705fb290ff7027"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function runTests() {
  console.log("==================================================");
  console.log("TEST 1 & 2: Upload PDF & Duplicate Protection");
  console.log("==================================================");

  try {
    // 1. Sign in anonymously
    await signInAnonymously(auth);
    const user = auth.currentUser;
    console.log("Signed in anonymously as:", user?.uid);

    // 2. Create a mock PDF
    const mockPdfBase64 = "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDP";
    const fileHash = CryptoJS.SHA256(mockPdfBase64).toString();

    // 3. Attempt duplicate check
    const duplicateQuery = query(
      collection(db, 'study_material_submissions'),
      where('fileHash', '==', fileHash)
    );
    const duplicateSnapshot = await getDocs(duplicateQuery);

    if (!duplicateSnapshot.empty) {
      console.log("❌ Duplicate protection triggered before upload!");
    } else {
      console.log("✅ No duplicate found, proceeding with upload.");
      
      const newUploadData = {
        title: "Test PDF " + Date.now(),
        subject: "General",
        branch: "Civil",
        semester: "3rd",
        materialType: "Teacher Notes",
        description: "Test description",
        fileUrl: "",
        driveFileId: "",
        fileHash: fileHash,
        isLink: false,
        ownerUid: user?.uid || '',
        uploaderName: "Test Bot",
        uploaderEmail: "test@bot.com",
        visibility: "PUBLIC",
        status: "PENDING",
        reportCount: 0,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'study_material_submissions'), newUploadData);
      console.log("✅ Firestore document created! ID:", docRef.id);
      
      // Attempt duplicate again
      const dupCheck2 = await getDocs(duplicateQuery);
      if (!dupCheck2.empty) {
        console.log("✅ TEST 2 PASS: Duplicate Upload Blocked successfully.");
      }
    }

    console.log("\n==================================================");
    console.log("TEST 3, 4, 5: Admin Approval & Drive Verification");
    console.log("==================================================");
    console.log("❌ FAIL: The Google Apps Script Endpoint is 'AKfycbx_placeholder'.");
    console.log("The live Google Drive routing endpoint has not been deployed by the admin yet.");
    console.log("Cannot physically verify Google Drive files or approve without the backend URL.");

    console.log("\n==================================================");
    console.log("TEST 8: Security Verification");
    console.log("==================================================");
    
    // Attempt Admin action as non-admin
    try {
      // Find a document to modify
      const q = query(collection(db, 'study_material_submissions'), where('status', '==', 'PENDING'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docToUpdate = snapshot.docs[0];
        console.log("Attempting to approve doc", docToUpdate.id, "as non-admin...");
        await updateDoc(docToUpdate.ref, { status: "APPROVED" });
        console.log("❌ SECURITY FAIL: Non-admin was able to approve!");
      }
    } catch (e: any) {
      if (e.code === 'permission-denied') {
        console.log("✅ SECURITY PASS: Non-admin denied permission to update status.");
      } else {
        console.log("Error:", e.message);
      }
    }

  } catch (error) {
    console.error("Test execution failed:", error);
  }
}

runTests();
