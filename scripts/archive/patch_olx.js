const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'olx', '[id].tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Modal to imports
if (!content.includes('Modal,')) {
  content = content.replace('KeyboardAvoidingView,', 'KeyboardAvoidingView, Modal,');
}
if (!content.includes('Menu,') && !content.includes('import { Menu, MenuOptions')) {
  content = content.replace("import { Image } from 'expo-image';", "import { Image } from 'expo-image';\nimport { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';");
}

// 2. Add state and handlers
const stateSearch = `const [submittingOwnerReply, setSubmittingOwnerReply] = useState(false);`;
const stateReplacement = `const [submittingOwnerReply, setSubmittingOwnerReply] = useState(false);

  // Edit item state
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Edit comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [isSubmittingCommentEdit, setIsSubmittingCommentEdit] = useState(false);

  // Edit reply state
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [isSubmittingReplyEdit, setIsSubmittingReplyEdit] = useState(false);`;

if (!content.includes('isEditModalVisible')) {
  content = content.replace(stateSearch, stateReplacement);
}

const handlersSearch = `const handleDelete = () => {`;
const handlersReplacement = `const openEditModal = () => {
    if (!item) return;
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditPrice(item.price || '');
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!item || !editTitle.trim() || !editPrice.trim()) return;
    setIsSavingEdit(true);
    try {
      const { editItem } = useOlxStore.getState();
      await editItem(item.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        price: editPrice.trim()
      });
      setItem({
        ...item,
        title: editTitle.trim(),
        description: editDescription.trim(),
        price: editPrice.trim()
      });
      setIsEditModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!item || !editCommentText.trim()) return;
    setIsSubmittingCommentEdit(true);
    try {
      const { editComment } = useOlxStore.getState();
      await editComment(item.id, commentId, editCommentText.trim());
      setEditingCommentId(null);
      setEditCommentText('');
    } catch (e) {
      Alert.alert('Error', 'Failed to save edits.');
    } finally {
      setIsSubmittingCommentEdit(false);
    }
  };

  const handleSaveReplyEdit = async (commentId: string) => {
    if (!item || !editReplyText.trim()) return;
    setIsSubmittingReplyEdit(true);
    try {
      const { editReply } = useOlxStore.getState();
      await editReply(item.id, commentId, editReplyText.trim());
      setEditingReplyId(null);
      setEditReplyText('');
    } catch (e) {
      Alert.alert('Error', 'Failed to save edits.');
    } finally {
      setIsSubmittingReplyEdit(false);
    }
  };

  const handleDelete = () => {`;

if (!content.includes('openEditModal')) {
  content = content.replace(handlersSearch, handlersReplacement);
}

// 3. Add Edit Icon to Author Header
const manageSearch = `{canManage && (
              <TouchableOpacity onPress={handleDelete} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={20} color={theme.danger} />
              </TouchableOpacity>
            )}`;
const manageReplacement = `{canManage && (
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
if (!content.includes('pencil-outline') && content.includes(manageSearch)) {
  content = content.replace(manageSearch, manageReplacement);
}

// 4. Update my comment to allow editing
const myCommentSearch = `            <Text style={[styles.myAppMessage, { color: theme.textSecondary }]}>{myComment.message}</Text>`;
const myCommentReplacement = `            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {editingCommentId === myComment.id ? (
                <View style={{ flex: 1, marginTop: 8 }}>
                  <TextInput
                    style={[styles.replyInput, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}
                    value={editCommentText}
                    onChangeText={setEditCommentText}
                    multiline
                  />
                  <View style={styles.replyActions}>
                    <TouchableOpacity onPress={() => { setEditingCommentId(null); setEditCommentText(''); }} style={{ padding: 8 }}>
                      <Text style={{ color: theme.textSecondary }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.smallSendBtn, { backgroundColor: theme.primary }, (!editCommentText.trim() || isSubmittingCommentEdit) && { opacity: 0.6 }]}
                      onPress={() => handleSaveCommentEdit(myComment.id)}
                      disabled={!editCommentText.trim() || isSubmittingCommentEdit}
                    >
                      {isSubmittingCommentEdit ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.smallSendBtnText}>Save</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <Text style={[styles.myAppMessage, { color: theme.textSecondary }]}>{myComment.message}</Text>
                  {!myComment.ownerReply && !isSold && (
                    <TouchableOpacity 
                      style={{ alignSelf: 'flex-start', marginTop: 4 }}
                      onPress={() => {
                        const wantsEdit = window.confirm("Do you want to edit your message? (Cancel to ignore)");
                        if (wantsEdit) {
                          setEditingCommentId(myComment.id);
                          setEditCommentText(myComment.message);
                        }
                      }}
                    >
                      <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '500' }}>Edit Message</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>`;
if (content.includes(myCommentSearch) && !content.includes('setEditingCommentId')) {
  content = content.replace(myCommentSearch, myCommentReplacement);
}

// 5. Update owner reply in my comment to allow editing
const ownerReplySearchInMyComment = `                <Text style={[styles.ownerReplyLabel, { color: theme.text }]}>Reply from {item.authorName}</Text>
                <Text style={[styles.ownerReplyText, { color: theme.textSecondary }]}>{myComment.ownerReply}</Text>
              </View>`;
// Owner cannot edit from the buyer view anyway, so this one is just displaying the reply.

// 6. Update owner reply in the author's view of all comments to allow editing
const ownerReplySearch = `            {comment.ownerReply ? (
              <View style={[styles.myReplyBox, { backgroundColor: theme.primary + '10', borderLeftColor: theme.primary }]}>
                <Text style={[styles.myReplyLabel, { color: theme.primary }]}>Your Reply</Text>
                <Text style={[styles.myReplyText, { color: theme.textSecondary }]}>{comment.ownerReply}</Text>
              </View>
            ) : (`;
const ownerReplyReplacement = `            {comment.ownerReply ? (
              <View style={[styles.myReplyBox, { backgroundColor: theme.primary + '10', borderLeftColor: theme.primary }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[styles.myReplyLabel, { color: theme.primary, marginBottom: 0 }]}>Your Reply</Text>
                  <TouchableOpacity onPress={() => {
                    const wantsEdit = window.confirm("Do you want to edit your reply?");
                    if (wantsEdit) {
                      setEditingReplyId(comment.id);
                      setEditReplyText(comment.ownerReply!);
                    }
                  }}>
                    <Ionicons name="pencil" size={14} color={theme.primary} />
                  </TouchableOpacity>
                </View>
                {editingReplyId === comment.id ? (
                  <View style={{ marginTop: 4 }}>
                    <TextInput
                      style={[styles.replyInput, { color: theme.text, borderColor: theme.primary, backgroundColor: theme.backgroundElement }]}
                      value={editReplyText}
                      onChangeText={setEditReplyText}
                      multiline
                    />
                    <View style={styles.replyActions}>
                      <TouchableOpacity onPress={() => { setEditingReplyId(null); setEditReplyText(''); }} style={{ padding: 8 }}>
                        <Text style={{ color: theme.textSecondary }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.smallSendBtn, { backgroundColor: theme.primary }, (!editReplyText.trim() || isSubmittingReplyEdit) && { opacity: 0.6 }]}
                        onPress={() => handleSaveReplyEdit(comment.id)}
                        disabled={!editReplyText.trim() || isSubmittingReplyEdit}
                      >
                        {isSubmittingReplyEdit ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.smallSendBtnText}>Save</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.myReplyText, { color: theme.textSecondary }]}>{comment.ownerReply}</Text>
                )}
              </View>
            ) : (`;
if (content.includes(ownerReplySearch) && !content.includes('setEditingReplyId')) {
  content = content.replace(ownerReplySearch, ownerReplyReplacement);
}

// 7. Add Edit Item Modal at the bottom
const modalTemplate = `
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={[styles.container, { backgroundColor: theme.background }]} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
            <View style={styles.headerTop}>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.backButton}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Post</Text>
              <TouchableOpacity 
                style={[styles.postBtn, (!editTitle.trim() || !editPrice.trim()) && { opacity: 0.5 }]}
                onPress={handleSaveEdit}
                disabled={isSavingEdit || !editTitle.trim() || !editPrice.trim()}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={[styles.postBtnText, { color: theme.primary }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Item Title *</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}
              value={editTitle}
              onChangeText={setEditTitle}
              maxLength={60}
            />
            
            <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Price (₹) *</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="default"
              maxLength={20}
            />
            
            <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Description</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement, minHeight: 100 }]}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
`;

if (!content.includes('isEditModalVisible}')) {
  content = content.replace('</KeyboardAvoidingView>', `</KeyboardAvoidingView>${modalTemplate}`);
}

// 8. Add some small styles
const stylesToAdd = `
  smallSendBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  smallSendBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 4 },
  postBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(96, 165, 250, 0.1)' },
  postBtnText: { fontSize: 15, fontWeight: '600' },
`;
if (!content.includes('smallSendBtn:')) {
  content = content.replace('const styles = StyleSheet.create({', `const styles = StyleSheet.create({${stylesToAdd}`);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched olx/[id].tsx');
