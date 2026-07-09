const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { deleteField } = require('firebase/firestore');
const fs = require('fs');

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "mcemotihari-app",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Setup baseline data
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    
    // Normal Student
    await db.collection("publicProfiles").doc("student1").set({ role: "Student", name: "Student One" });
    await db.collection("privateUsers").doc("student1").set({ role: "Student" });
    
    // Normal Faculty
    await db.collection("publicProfiles").doc("faculty1").set({ role: "Faculty", name: "Faculty One" });
    
    // Admin (Moderator)
    await db.collection("publicProfiles").doc("admin1").set({ role: "Student", adminRole: "MODERATOR", name: "Admin One" });
    
    // Super Admin
    await db.collection("publicProfiles").doc("superadmin1").set({ role: "Faculty", adminRole: "SUPER_ADMIN", name: "Super Admin One" });

    // Dummy Post
    await db.collection("posts").doc("post1").set({ authorUid: "student1", text: "Hello", title: "My Post" });

    // Dummy Study Material
    await db.collection("study_material_submissions").doc("mat1").set({ ownerUid: "student1", title: "Notes", status: "PENDING" });
    
    // Dummy Event
    await db.collection("events").doc("event1").set({ authorUid: "student1", title: "My Event" });
  });
});

after(async () => {
  await testEnv.cleanup();
});

function getAuthedDb(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

describe("Firestore Rules Strict Verification", () => {
  it("1. Student changes profile type (Student -> Alumni)", async () => {
    const db = getAuthedDb("student1");
    await assertSucceeds(db.collection("publicProfiles").doc("student1").update({ role: "Alumni" }));
  });

  it("2. Faculty -> Other", async () => {
    const db = getAuthedDb("faculty1");
    await assertSucceeds(db.collection("publicProfiles").doc("faculty1").update({ role: "Other" }));
  });

  it("3. Student tries to set role = Admin (Must FAIL)", async () => {
    const db = getAuthedDb("student1");
    await assertFails(db.collection("publicProfiles").doc("student1").update({ role: "Admin" }));
  });

  it("4. Student tries to set adminRole (Must FAIL)", async () => {
    const db = getAuthedDb("student1");
    await assertFails(db.collection("publicProfiles").doc("student1").update({ adminRole: "MODERATOR" }));
  });

  it("5. Student edits own name", async () => {
    const db = getAuthedDb("student1");
    await assertSucceeds(db.collection("publicProfiles").doc("student1").update({ name: "Student Edited" }));
  });

  it("6. Student edits own bio", async () => {
    const db = getAuthedDb("student1");
    await assertSucceeds(db.collection("publicProfiles").doc("student1").update({ bio: "My new bio" }));
  });

  it("7. Student edits own department", async () => {
    const db = getAuthedDb("student1");
    await assertSucceeds(db.collection("publicProfiles").doc("student1").update({ department: "CSE" }));
  });

  it("8. Student edits own username", async () => {
    const db = getAuthedDb("student1");
    await assertSucceeds(db.collection("publicProfiles").doc("student1").update({ username: "student1_new" }));
  });

  it("9. Student edits own phone", async () => {
    const db = getAuthedDb("student1");
    await assertSucceeds(db.collection("privateUsers").doc("student1").update({ phone: "1234567890" }));
  });

  it("10. Student edits another user's profile (Must FAIL)", async () => {
    const db = getAuthedDb("student1");
    await assertFails(db.collection("publicProfiles").doc("faculty1").update({ name: "Hacked Name" }));
  });

  it("11. Student edits authorUid of own post (Must FAIL)", async () => {
    const db = getAuthedDb("student1");
    await assertFails(db.collection("posts").doc("post1").update({ authorUid: "hacker1" }));
  });

  it("12. Student edits createdBy (Must FAIL)", async () => {
    const db = getAuthedDb("student1");
    await assertFails(db.collection("posts").doc("post1").update({ createdBy: "hacker1" }));
  });

  it("13. Student edits status (Must FAIL)", async () => {
    const db = getAuthedDb("student1");
    await assertFails(db.collection("posts").doc("post1").update({ status: "APPROVED" }));
  });

  it("14. Super Admin promotes Admin", async () => {
    const db = getAuthedDb("superadmin1");
    await assertSucceeds(db.collection("publicProfiles").doc("student1").update({ adminRole: "MODERATOR" }));
  });

  it("15. Admin promotes another Admin (Must FAIL)", async () => {
    const db = getAuthedDb("admin1");
    await assertFails(db.collection("publicProfiles").doc("faculty1").update({ adminRole: "MODERATOR" }));
  });

  it("16. Super Admin demotes Admin", async () => {
    const db = getAuthedDb("superadmin1");
    await assertSucceeds(db.collection("publicProfiles").doc("admin1").update({ adminRole: "NONE" }));
  });

  it("17. Existing posts (Safe edit)", async () => {
    const db = getAuthedDb("student1");
    await assertSucceeds(db.collection("posts").doc("post1").update({ text: "Updated text" }));
  });

  it("18. Existing comments (Create)", async () => {
    const db = getAuthedDb("student1");
    await assertSucceeds(db.collection("posts").doc("post1").collection("comments").doc("comment1").set({ userId: "student1", text: "Comment" }));
  });

  it("19. Existing events (Safe edit)", async () => {
    const db = getAuthedDb("student1");
    await assertSucceeds(db.collection("events").doc("event1").update({ title: "Updated Event" }));
  });

  it("20. Existing study materials (Safe edit)", async () => {
    const db = getAuthedDb("student1");
    await assertSucceeds(db.collection("study_material_submissions").doc("mat1").update({ title: "Updated Notes" }));
  });
});
