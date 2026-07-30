const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');

async function runTests() {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  let testEnv;
  try {
    testEnv = await initializeTestEnvironment({
      projectId: 'mcemotihari-test',
      firestore: { rules }
    });
  } catch (e) {
    console.error("Failed to initialize test environment. Make sure Firebase Emulators are running if required:", e);
    return;
  }

  const authContext = testEnv.authenticatedContext('user123', {
    email: 'test@gmail.com'
  });

  const db = authContext.firestore();

  console.log("=========================================");
  console.log("🔥 RUNNING FIRESTORE RULES VERIFICATION 🔥");
  console.log("=========================================\n");

  try {
    // 1. Test failing name (Numbers)
    console.log("[TEST 1] Attempting to create profile with Google Name 'Rahul123 User'");
    await assertSucceeds(
      db.collection('publicProfiles').doc('user123').set({
        uid: 'user123',
        name: 'Rahul123 User',
        role: 'Student',
        createdAt: new Date().toISOString()
      })
    );
    console.log("✅ [PASS] Profile created successfully with numbers. (This previously FAILED with permission-denied)");
  } catch (e) {
    console.error("❌ [FAIL] Test 1 failed:", e.message);
  }

  try {
    // 2. Test single name
    console.log("\n[TEST 2] Attempting to create profile with single Name 'Rahul'");
    await assertSucceeds(
      db.collection('publicProfiles').doc('user123').update({
        name: 'Rahul'
      })
    );
    console.log("✅ [PASS] Profile updated successfully with single name. (This previously FAILED)");
  } catch (e) {
    console.error("❌ [FAIL] Test 2 failed:", e.message);
  }

  try {
    // 3. Ensure security isn't weakened (Try to inject adminRole)
    console.log("\n[TEST 3] Attempting privilege escalation (injecting adminRole)");
    await assertFails(
      db.collection('publicProfiles').doc('user123').update({
        adminRole: 'SUPER_ADMIN'
      })
    );
    console.log("✅ [PASS] Privilege escalation blocked. Security remains intact.");
  } catch (e) {
    console.error("❌ [FAIL] Privilege escalation succeeded! Security is broken.");
  }

  console.log("\n=========================================");
  console.log("Tests Complete.");
  
  await testEnv.cleanup();
  process.exit(0);
}

runTests();
