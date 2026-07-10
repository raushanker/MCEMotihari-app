import re

with open('/Users/raushanisonline/Documents/GitHub/MCEMotihari app/src/app/dept-notice/[id].tsx', 'r') as f:
    content = f.read()

# 1. Add states and hooks
state_hooks = """
  // Image viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const user = useAuthStore(state => state.user);
  const toggleNoticeBookmark = useAppStore(state => state.toggleNoticeBookmark);
  const setForwardData = useAppStore(state => state.setForwardData);
  const [menuOpen, setMenuOpen] = useState(false);
"""
content = re.sub(r'// Image viewer state\n\s*const \[viewerVisible, setViewerVisible\] = useState\(false\);\n\s*const \[viewerIndex, setViewerIndex\] = useState\(0\);', state_hooks.strip(), content)

# 2. Add handlers
handlers = """
  const openImageViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      const shortText = post.text ? (post.text.length > 60 ? post.text.substring(0, 60) + '...' : post.text) : 'Image attached';
      await Share.share({ message: `📢 ${deptName} Notice\n\n"${shortText}"\n\nhttps://play.google.com/store/apps/details?id=com.mcemotihari.app` });
    } catch {}
  };

  const handleForward = () => {
    if (!post) return;
    setForwardData({
      id: post.id,
      text: post.text,
      images: post.images || [],
      contentType: 'dept_notice',
      authorName: post.authorName,
      authorRole: post.authorRole,
      createdAt: post.createdAt,
    });
    router.push('/forward');
  };

  const handleSave = () => {
    if (!post) return;
    toggleNoticeBookmark(post);
  };

  const handlePin = async () => {
    if (!post) return;
    try {
      await updateDoc(doc(db, 'deptNoticeBoard', post.deptId, 'posts', post.id), {
        isPinned: !post.isPinned
      });
      setPost({ ...post, isPinned: !post.isPinned });
      useAppStore.getState().showToast(post.isPinned ? 'Notice unpinned' : 'Notice pinned', 'success');
    } catch (err) {
      console.warn(err);
      useAppStore.getState().showToast('Failed to pin/unpin', 'error');
    }
  };

  const handleDelete = () => {
    if (!post) return;
    setTimeout(() => {
      Alert.alert(
        "Delete Notice",
        "Are you sure you want to delete this notice?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteDoc(doc(db, 'deptNoticeBoard', post.deptId, 'posts', post.id));
                useAppStore.getState().showToast("Notice deleted", "success");
                router.canGoBack() ? router.back() : router.replace('/');
              } catch (e) {
                console.warn(e);
                useAppStore.getState().showToast('Failed to delete', 'error');
              }
            }
          }
        ]
      );
    }, 300);
  };

  const handleReport = () => {
    setTimeout(() => {
      Alert.alert(
        "Report Notice",
        "Is this notice inappropriate or spam?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Report",
            style: "destructive",
            onPress: () => {
              useAppStore.getState().showToast("Report submitted", "success");
            }
          }
        ]
      );
    }, 300);
  };
"""
content = re.sub(r'const openImageViewer = \(index: number\) => {\n\s*setViewerIndex\(index\);\n\s*setViewerVisible\(true\);\n\s*};', handlers.strip(), content)

# 3. Fix VerifiedBadge and Add 3-dot Menu
author_header = """          {/* Author Header */}
          <View style={styles.authorHeader}>
            <Image
              source={{ uri: post.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'User')}&background=random` }}
              style={styles.avatar}
              cachePolicy="memory-disk"
            />
            <View style={styles.authorInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <Text style={[styles.authorName, { color: theme.text, marginBottom: 0 }]}>{post.authorName}</Text>
                {(post.authorId === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || post.authorId === 'DdP2c855PSRUJwhmN9rvbkYBraP2' || post.authorRole === 'SUPER_ADMIN' || post.authorRole === 'Admin') && (
                  <MaterialIcons name="verified" size={15} color="#1D9BF0" />
                )}
              </View>
              <Text style={[styles.authorRole, { color: theme.textSecondary }]}>
                {post.authorRole} • {post.createdAt ? getFormattedPostTime(post.createdAt) : 'Just now'}
              </Text>
            </View>
            {post.isPinned && (
              <View style={styles.pinnedBadge}>
                <Ionicons name="pin" size={12} color="#EAB308" />
                <Text style={styles.pinnedText}>Pinned</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => setMenuOpen(true)} style={{ padding: 8, marginLeft: 'auto' }}>
              <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>"""
content = re.sub(r'\{\/\* Author Header \*\/\}.*?\<\/View\>\n\s*\<\/View\>', author_header, content, flags=re.DOTALL)

# 4. Add Modal right before last </View>
modal = """
      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menuBox, { backgroundColor: theme.backgroundElement }]}>
            <MenuItem icon="share-outline" label="Share Notice" onPress={() => { setMenuOpen(false); handleShare(); }} color={theme.text} />
            <MenuItem icon="arrow-forward-circle-outline" label="Forward Notice" onPress={() => { setMenuOpen(false); handleForward(); }} color={theme.text} />
            <MenuDivider theme={theme} />
            <MenuItem icon="bookmark-outline" label="Save Notice" onPress={() => { setMenuOpen(false); handleSave(); }} color={theme.text} />
            
            {(user?.role === 'SUPER_ADMIN' || user?.role === 'Admin' || user?.uid === post?.authorId) && (
              <>
                <MenuDivider theme={theme} />
                {(user?.role === 'SUPER_ADMIN' || user?.role === 'Admin') && (
                  <MenuItem
                    icon={post.isPinned ? 'pin' : 'pin-outline'}
                    label={post.isPinned ? 'Unpin Post' : 'Pin to Top'}
                    onPress={() => { setMenuOpen(false); handlePin(); }}
                    color="#3B82F6"
                  />
                )}
                {((user?.role === 'SUPER_ADMIN' || user?.role === 'Admin') && post?.isPinned) ? null : null} 
                <MenuItem icon="trash-outline" label="Remove Notice" onPress={() => { setMenuOpen(false); handleDelete(); }} color="#EF4444" />
              </>
            )}
            
            {(user?.uid !== post?.authorId) && (
              <>
                <MenuDivider theme={theme} />
                <MenuItem icon="flag-outline" label="Report Notice" onPress={() => { setMenuOpen(false); handleReport(); }} color="#EF4444" />
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      <ImageViewing
"""
content = re.sub(r'\<ImageViewing', modal, content)

# 5. Add styles and subcomponents
components_and_styles = """
  image: { width: '100%', height: '100%' },
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  menuBox: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 8, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  menuLabel: { fontSize: 15, fontWeight: '600' },
  menuDivider: { height: 1, marginHorizontal: 16 },
});

function MenuItem({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MenuDivider({ theme }: { theme: any }) {
  return <View style={[styles.menuDivider, { backgroundColor: theme.cardBorder }]} />;
}
"""
content = re.sub(r'image: \{ width: \'100%\', height: \'100%\' \},\n\}\);', components_and_styles, content)

with open('/Users/raushanisonline/Documents/GitHub/MCEMotihari app/src/app/dept-notice/[id].tsx', 'w') as f:
    f.write(content)
