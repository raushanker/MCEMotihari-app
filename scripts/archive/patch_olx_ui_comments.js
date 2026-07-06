const fs = require('fs');
const path = require('path');

const uiPath = path.join(__dirname, 'src', 'app', 'olx', '[id].tsx');
let uiContent = fs.readFileSync(uiPath, 'utf8');

// 1. Add Report functionality for Comment
const reportCommentFunc = `
  const handleReportComment = (commentId: string) => {
    Alert.alert(
      'Report Message',
      'Why are you reporting this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Spam or Misleading', onPress: () => submitCommentReport(commentId, 'Spam or Misleading') },
        { text: 'Inappropriate Content', onPress: () => submitCommentReport(commentId, 'Inappropriate Content') },
        { text: 'Harassment or Scam', onPress: () => submitCommentReport(commentId, 'Harassment or Scam') }
      ]
    );
  };

  const submitCommentReport = async (commentId: string, reason: string) => {
    if (!item) return;
    try {
      const { reportComment } = useOlxStore.getState();
      await reportComment(item.id, commentId, reason);
      Alert.alert('Reported', 'Thank you. This message has been reported to the admins.');
    } catch (e) {
      Alert.alert('Error', 'Failed to submit report.');
    }
  };
`;
if (!uiContent.includes("const handleReportComment = (commentId")) {
  uiContent = uiContent.replace("const handleReport = () => {", reportCommentFunc + "\n  const handleReport = () => {");
}

// 2. Change the map condition for comments
if (uiContent.includes("{isAuthor && itemComments.map((comment) => (")) {
  uiContent = uiContent.replace(
    "{isAuthor && itemComments.map((comment) => (",
    "{(isAuthor || isAdmin) && itemComments.map((comment) => ("
  );
}

// 3. Update section title
if (uiContent.includes("{isAuthor ? \`Messages (\${itemComments.length})\` : 'Private Messages'}")) {
  uiContent = uiContent.replace(
    "{isAuthor ? \`Messages (\${itemComments.length})\` : 'Private Messages'}",
    "{(isAuthor || isAdmin) ? \`Messages (\${itemComments.length})\` : 'Private Messages'}"
  );
  uiContent = uiContent.replace(
    "{isAuthor ? 'Only you can see these messages' : 'Only the seller can see your messages'}",
    "{(isAuthor || isAdmin) ? (isAdmin ? 'Admin View: All Messages' : 'Only you can see these messages') : 'Only the seller can see your messages'}"
  );
}

// 4. Add Report / Delete to the Comment header
const commentHeaderSearch = `              <View style={{ flex: 1 }}>
                <Text style={[styles.appName, { color: theme.text }]}>{comment.applicantName}</Text>
                <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>{timeAgo(comment.createdAt)}</Text>
              </View>
            </View>`;
const commentHeaderReplacement = `              <View style={{ flex: 1 }}>
                <Text style={[styles.appName, { color: theme.text }]}>{comment.applicantName}</Text>
                <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>{timeAgo(comment.createdAt)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {canManage ? (
                  <TouchableOpacity onPress={() => handleDeleteComment(comment.id, comment.applicantUid, comment.message)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => handleReportComment(comment.id)} style={{ padding: 4 }}>
                    <Ionicons name="flag-outline" size={18} color={theme.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>`;
if (uiContent.includes(commentHeaderSearch) && !uiContent.includes("handleDeleteComment(comment.id")) {
  uiContent = uiContent.replace(commentHeaderSearch, commentHeaderReplacement);
}

// Fix myComment to also have a flag icon, but myComment can only be deleted if the user is the author of the comment
const myCommentHeaderSearch = `            <View style={styles.myAppHeader}>
              <Text style={[styles.myAppTitle, { color: theme.text }]}>Your Message</Text>
              <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>{timeAgo(myComment.createdAt)}</Text>
            </View>`;
const myCommentHeaderReplacement = `            <View style={styles.myAppHeader}>
              <View>
                <Text style={[styles.myAppTitle, { color: theme.text }]}>Your Message</Text>
                <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>{timeAgo(myComment.createdAt)}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteComment(myComment.id, myComment.applicantUid, myComment.message)} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
              </TouchableOpacity>
            </View>`;
if (uiContent.includes(myCommentHeaderSearch) && !uiContent.includes("handleDeleteComment(myComment.id")) {
  uiContent = uiContent.replace(myCommentHeaderSearch, myCommentHeaderReplacement);
}

fs.writeFileSync(uiPath, uiContent, 'utf8');
console.log('Successfully patched olx/[id].tsx comments view');
