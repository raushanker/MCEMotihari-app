const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, 'src', 'store', 'useOlxStore.ts');
let storeContent = fs.readFileSync(storePath, 'utf8');

// 1. Add imports to useOlxStore
if (!storeContent.includes("import { auth }")) {
  storeContent = storeContent.replace("import { db }", "import { db, auth }");
}
if (!storeContent.includes("setDoc")) {
  storeContent = storeContent.replace("import { collection,", "import { collection, setDoc,");
}

// 2. Add functions to OlxState interface
if (!storeContent.includes("reportItem:")) {
  storeContent = storeContent.replace("deleteReply: (itemId: string, commentId: string) => Promise<void>;", 
`  deleteReply: (itemId: string, commentId: string) => Promise<void>;
  reportItem: (itemId: string, reason: string) => Promise<void>;
  reportComment: (itemId: string, commentId: string, reason: string) => Promise<void>;`);
}

// 3. Add report implementation to useOlxStore
const reportImpl = `
  reportItem: async (itemId: string, reason: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not authenticated");
      const { items } = get();
      const itemState = items.find(i => i.id === itemId);
      const reportRef = doc(db, 'reports', \`report_\${currentUser.uid}_olx_\${itemId}\`);
      await setDoc(reportRef, {
        targetId: itemId,
        targetType: 'olx_item',
        reason,
        reportedAt: serverTimestamp(),
        reportedByCount: 1,
        status: 'pending',
        targetContent: itemState?.title || 'Unknown OLX Item',
        authorUid: itemState?.authorUid || null,
        reporterId: currentUser.uid,
        reporterName: currentUser.displayName || currentUser.email || 'Anonymous'
      });
    } catch (error) {
      console.error("Error reporting item:", error);
      throw error;
    }
  },

  reportComment: async (itemId, commentId, reason) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not authenticated");
      const { comments } = get();
      const itemComments = comments[itemId] || [];
      const commentState = itemComments.find(c => c.id === commentId);
      const reportRef = doc(db, 'reports', \`report_\${currentUser.uid}_olx_comment_\${commentId}\`);
      await setDoc(reportRef, {
        targetId: commentId,
        targetType: 'olx_comment',
        reason,
        reportedAt: serverTimestamp(),
        reportedByCount: 1,
        status: 'pending',
        targetContent: commentState?.message || 'Unknown Comment',
        authorUid: commentState?.applicantUid || null,
        reporterId: currentUser.uid,
        reporterName: currentUser.displayName || currentUser.email || 'Anonymous',
        parentId: itemId
      });
    } catch (error) {
      console.error("Error reporting comment:", error);
      throw error;
    }
  },
`;

if (!storeContent.includes("reportItem: async")) {
  storeContent = storeContent.replace("deleteReply: async (itemId, commentId) => {", reportImpl + "\n  deleteReply: async (itemId, commentId) => {");
}

fs.writeFileSync(storePath, storeContent, 'utf8');
console.log('Successfully patched useOlxStore.ts');
