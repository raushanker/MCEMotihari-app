const fs = require('fs');
const path = require('path');

const uiPath = path.join(__dirname, 'src', 'app', 'olx', '[id].tsx');
let uiContent = fs.readFileSync(uiPath, 'utf8');

// Ensure firebase imports exist for the notification
if (!uiContent.includes("serverTimestamp")) {
  uiContent = uiContent.replace("import { db } from '@/config/firebase';", "import { db } from '@/config/firebase';\nimport { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';");
} else if (!uiContent.includes("setDoc")) {
  uiContent = uiContent.replace("import { collection,", "import { collection, setDoc,");
}

// 1. Add sendAdminDeleteNotification inside the component, before handleDelete
const notifFunc = `
  const sendAdminDeleteNotification = async (targetUid: string, type: string, detail: string) => {
    try {
      const notifRef = doc(collection(db, 'users', targetUid, 'notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        type: 'system',
        title: 'Content Removed',
        body: \`Your \${type} "\${detail.substring(0, 30)}..." was removed by an admin.\`,
        timestamp: serverTimestamp(),
        read: false,
      });
    } catch (e) {
      console.error("Failed to send delete notif", e);
    }
  };
`;
if (!uiContent.includes("sendAdminDeleteNotification")) {
  uiContent = uiContent.replace("const handleDelete = () => {", notifFunc + "\n  const handleDelete = () => {");
}

// 2. Modify handleDelete for the post to send notification if admin
if (uiContent.includes("await deleteItem(item.id);") && !uiContent.includes("sendAdminDeleteNotification(item.authorUid, 'OLX Post', item.title)")) {
  uiContent = uiContent.replace(
    "await deleteItem(item.id);", 
    `await deleteItem(item.id);
              if (isAdmin && !isAuthor) {
                await sendAdminDeleteNotification(item.authorUid, 'OLX Post', item.title);
              }`
  );
}

// 3. Add handleDeleteComment
const deleteCommentFunc = `
  const handleDeleteComment = (commentId: string, applicantUid: string, message: string) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            if (item) {
              const { deleteComment } = useOlxStore.getState();
              await deleteComment(item.id, commentId);
              if (isAdmin && !isAuthor) {
                await sendAdminDeleteNotification(applicantUid, 'message', message);
              }
            }
          }
        }
      ]
    );
  };
`;
if (!uiContent.includes("handleDeleteComment = (commentId")) {
  uiContent = uiContent.replace("const toggleStatus = async () => {", deleteCommentFunc + "\n  const toggleStatus = async () => {");
}

// 4. Add Report functionality for Post
const reportPostFunc = `
  const handleReport = () => {
    Alert.alert(
      'Report Post',
      'Why are you reporting this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Spam or Misleading', onPress: () => submitReport('Spam or Misleading') },
        { text: 'Inappropriate Content', onPress: () => submitReport('Inappropriate Content') },
        { text: 'Harassment or Scam', onPress: () => submitReport('Harassment or Scam') }
      ]
    );
  };

  const submitReport = async (reason: string) => {
    if (!item) return;
    try {
      const { reportItem } = useOlxStore.getState();
      await reportItem(item.id, reason);
      Alert.alert('Reported', 'Thank you. This post has been reported to the admins.');
    } catch (e) {
      Alert.alert('Error', 'Failed to submit report.');
    }
  };
`;
if (!uiContent.includes("const handleReport = () => {")) {
  uiContent = uiContent.replace("const handleDelete = () => {", reportPostFunc + "\n  const handleDelete = () => {");
}

// 5. Change post buttons to show Report for non-authors, and Trash for authors/admins
// Search for the view that contains the edit and delete buttons for the post
const postButtonsSearch = `            {canManage && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isAuthor && (
                  <TouchableOpacity onPress={openEditModal} style={{ padding: 4, marginRight: 8 }}>
                    <Ionicons name="pencil-outline" size={20} color={theme.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleDelete} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={20} color={theme.danger} />
                </TouchableOpacity>
              </View>
            )}`;
const postButtonsReplacement = `            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isAuthor && (
                <TouchableOpacity onPress={openEditModal} style={{ padding: 4, marginRight: 12 }}>
                  <Ionicons name="pencil-outline" size={20} color={theme.primary} />
                </TouchableOpacity>
              )}
              {canManage ? (
                <TouchableOpacity onPress={handleDelete} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={20} color={theme.danger} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleReport} style={{ padding: 4 }}>
                  <Ionicons name="flag-outline" size={20} color={theme.danger} />
                </TouchableOpacity>
              )}
            </View>`;
if (uiContent.includes(postButtonsSearch)) {
  uiContent = uiContent.replace(postButtonsSearch, postButtonsReplacement);
}

fs.writeFileSync(uiPath, uiContent, 'utf8');
console.log('Successfully patched olx/[id].tsx part 1');
