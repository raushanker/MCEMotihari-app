import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import { TextInput } from "@/components/ui/TextInput";
import { useLocalSearchParams } from "expo-router";
import { useSafeRouter as useRouter } from "@/hooks/useSafeRouter";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/hooks/useThemeColors";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useOlxStore, OlxItem, OlxComment } from "@/store/useOlxStore";
import { useAppStore } from "@/store/useAppStore";
import { useExploreBack } from "@/hooks/useExploreBack";
import { Image } from "expo-image";
import ImageViewing from "@/components/ImageViewingWrapper";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";
import { getFormattedPostTime as timeAgo } from "@/utils/timeFormat";
import { db } from "@/config/firebase";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { ForwardSheet } from "@/components/modals/ForwardSheet";
import { getContentEmoji } from "@/utils/forwardEngine";

export default function OlxDetailsScreen() {
  const { id, from } = useLocalSearchParams();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const handleExploreBack = useExploreBack();

  const {
    items,
    comments,
    fetchComments,
    addComment,
    updateItemStatus,
    deleteItem,
    replyToComment,
  } = useOlxStore();

  const [item, setItem] = useState<OlxItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [replyingToAppId, setReplyingToAppId] = useState<string | null>(null);
  const [ownerReplyText, setOwnerReplyText] = useState("");
  const [submittingOwnerReply, setSubmittingOwnerReply] = useState(false);

  // Edit item state
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Edit comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [isSubmittingCommentEdit, setIsSubmittingCommentEdit] = useState(false);

  // Edit reply state
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState("");
  const [isSubmittingReplyEdit, setIsSubmittingReplyEdit] = useState(false);

  // Forward state
  const [isForwardVisible, setIsForwardVisible] = useState(false);
  const [forwardContent, setForwardContent] = useState<any>(null);

  const handleForwardItem = () => {
    if (!item) return;
    setForwardContent({
      contentId: item.id,
      contentType: 'olx',
      title: item.title,
      subtitle: item.price,
      senderName: item.authorName,
      emoji: getContentEmoji('olx'),
      imageUrl: item.imageUrl || undefined,
      price: item.price,
    });
    setIsForwardVisible(true);
  };
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);

  useEffect(() => {
    const loadItem = async () => {
      let foundItem = items.find((i) => i.id === id);
      if (!foundItem) {
        try {
          const docRef = await getDoc(doc(db, "campusOlx", id as string));
          if (docRef.exists()) {
            const data = docRef.data();
            foundItem = {
              id: docRef.id,
              ...data,
              createdAt: data.createdAt?.toDate
                ? data.createdAt.toDate().toISOString()
                : data.createdAt,
            } as OlxItem;
          }
        } catch (e) {
          console.error("Error fetching single item", e);
        }
      }
      setItem(foundItem || null);

      if (foundItem) {
        await fetchComments(id as string);
      }

      setLoading(false);
    };

    if (id) {
      loadItem();
    }
  }, [id, items]);

  const itemComments = comments[id as string] || [];
  const isAuthor = user?.uid === item?.authorUid;
  const isAdmin =
    user?.adminRole === "SUPER_ADMIN" || user?.adminRole === "Admin";
  const canManage = isAuthor || isAdmin;

  const myComment = !isAuthor
    ? itemComments.find((c) => c.applicantUid === user?.uid)
    : null;
  const isSold = item?.status === "sold";

  const handleApply = async () => {
    if (!replyMessage.trim()) return;
    if (!user) {
      Alert.alert("Error", "You must be logged in to comment.");
      return;
    }

    setIsSubmitting(true);
    Keyboard.dismiss();
    try {
      await addComment(item!.id, {
        message: replyMessage.trim(),
      });
      setReplyMessage("");
      Alert.alert("Success", "Your message was sent privately to the seller.");
    } catch (e) {
      Alert.alert("Error", "Failed to send message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = (
    commentId: string,
    applicantUid: string,
    message: string
  ) => {
    const doDelete = async () => {
      if (item) {
        const { deleteComment } = useOlxStore.getState();
        await deleteComment(item.id, commentId);
        if (isAdmin && !isAuthor) {
          await sendAdminDeleteNotification(
            applicantUid,
            "message",
            message
          );
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this message?")) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Delete Message",
        "Are you sure you want to delete this message?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: doDelete,
          },
        ]
      );
    }
  };

  const toggleStatus = async () => {
    if (!item) return;
    const newStatus = isSold ? "open" : "sold";
    try {
      await updateItemStatus(item.id, newStatus);
      setItem({ ...item, status: newStatus });
    } catch (e) {
      Alert.alert("Error", "Failed to update status.");
    }
  };

  const handleOwnerReply = async (commentId: string) => {
    if (!ownerReplyText.trim() || !item) return;
    setSubmittingOwnerReply(true);
    try {
      await replyToComment(item.id, commentId, ownerReplyText.trim());
      setReplyingToAppId(null);
      setOwnerReplyText("");
    } catch (e) {
      Alert.alert("Error", "Failed to send reply.");
    } finally {
      setSubmittingOwnerReply(false);
    }
  };

  const openEditModal = () => {
    if (!item) return;
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditPrice(item.price || "");
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
        price: editPrice.trim(),
      });
      setItem({
        ...item,
        title: editTitle.trim(),
        description: editDescription.trim(),
        price: editPrice.trim(),
      });
      setIsEditModalVisible(false);
    } catch (e) {
      Alert.alert("Error", "Failed to save changes.");
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
      setEditCommentText("");
    } catch (e) {
      Alert.alert("Error", "Failed to save edits.");
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
      setEditReplyText("");
    } catch (e) {
      Alert.alert("Error", "Failed to save edits.");
    } finally {
      setIsSubmittingReplyEdit(false);
    }
  };

  const sendAdminDeleteNotification = async (
    targetUid: string,
    type: string,
    detail: string
  ) => {
    try {
      const notifRef = doc(collection(db, "users", targetUid, "notifications"));
      await setDoc(notifRef, {
        id: notifRef.id,
        type: "system",
        title: "Content Removed",
        body: `Your ${type} "${detail.substring(
          0,
          30
        )}..." was removed by an admin.`,
        timestamp: serverTimestamp(),
        read: false,
      });
    } catch (e) {
      console.error("Failed to send delete notif", e);
    }
  };

  const handleReportComment = (commentId: string) => {
    Alert.alert("Report Message", "Why are you reporting this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Spam or Misleading",
        onPress: () => submitCommentReport(commentId, "Spam or Misleading"),
      },
      {
        text: "Inappropriate Content",
        onPress: () => submitCommentReport(commentId, "Inappropriate Content"),
      },
      {
        text: "Harassment or Scam",
        onPress: () => submitCommentReport(commentId, "Harassment or Scam"),
      },
    ]);
  };

  const submitCommentReport = async (commentId: string, reason: string) => {
    if (!item) return;
    try {
      const { reportComment } = useOlxStore.getState();
      await reportComment(item.id, commentId, reason);
      Alert.alert(
        "Reported",
        "Thank you. This message has been reported to the admins."
      );
    } catch (e) {
      Alert.alert("Error", "Failed to submit report.");
    }
  };

  const handleReport = () => {
    if (Platform.OS === 'web') {
      if (window.confirm("Is this post inappropriate or spam? Report it?")) {
        submitReport("Inappropriate Content (Web)");
      }
    } else {
      Alert.alert("Report Post", "Why are you reporting this post?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Spam or Misleading",
          onPress: () => submitReport("Spam or Misleading"),
        },
        {
          text: "Inappropriate Content",
          onPress: () => submitReport("Inappropriate Content"),
        },
        {
          text: "Harassment or Scam",
          onPress: () => submitReport("Harassment or Scam"),
        },
      ]);
    }
  };

  const submitReport = async (reason: string) => {
    if (!item) return;
    try {
      const { reportItem } = useOlxStore.getState();
      await reportItem(item.id, reason);
      Alert.alert(
        "Reported",
        "Thank you. This post has been reported to the admins."
      );
    } catch (e) {
      Alert.alert("Error", "Failed to submit report.");
    }
  };

  const handleDelete = () => {
    const doDelete = async () => {
      if (item) {
        await deleteItem(item.id);
        if (isAdmin && !isAuthor) {
          await sendAdminDeleteNotification(
            item.authorUid,
            "OLX Post",
            item.title
          );
        }
        handleBack();
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this listing?")) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Delete Listing",
        "Are you sure you want to delete this listing?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: doDelete,
          },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      if (from === 'explore') {
        handleExploreBack(from as string);
      } else {
        router.back();
      }
    } else {
      router.replace('/');
    }
  };

  if (!item) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Text style={{ color: theme.text }}>Item not found.</Text>
        <TouchableOpacity
          onPress={handleBack}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: theme.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }



  return (
    <>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.headerContainer,
            {
              paddingTop: insets.top + 10,
              backgroundColor: theme.backgroundElement,
              borderBottomColor: theme.cardBorder,
            },
          ]}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text
              style={[
                styles.headerTitle,
                { color: theme.text, flex: 1, marginLeft: 12 },
              ]}
            >
              Item Details
            </Text>
            {item && (
              <TouchableOpacity
                onPress={handleForwardItem}
                style={{ padding: 4 }}
              >
                <Ionicons name="arrow-redo-outline" size={24} color={theme.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <View style={styles.authorHeader}>
              <Image
                source={{
                  uri:
                    (isAuthor && user ? user.photoUrl : item.authorPhoto) ||
                    "https://ui-avatars.com/api/?name=" +
                      encodeURIComponent(
                        isAuthor && user ? user.name || "" : item.authorName
                      ),
                }}
                style={styles.avatar}
              />
              <View style={styles.authorInfo}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={[styles.authorName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {isAuthor && user ? user.name : item.authorName}
                  </Text>
                  {["SUPER_ADMIN", "Admin"].includes(
                    (isAuthor && user
                      ? user.adminRole
                      : item.authorAdminRole) as string
                  ) && (
                    <MaterialIcons
                      name="verified"
                      size={15}
                      color="#1D9BF0"
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </View>
                <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>
                  {(() => {
                    const role = isAuthor && user ? user.role : item.authorRole;
                    const branch =
                      isAuthor && user ? user.branch : item.authorBranch;
                    const semester =
                      isAuthor && user ? user.semester : item.authorSemester;
                    const adminRole =
                      isAuthor && user ? user.adminRole : item.authorAdminRole;

                    if (["SUPER_ADMIN", "Admin"].includes(adminRole as string))
                      return "Admin";
                    if (role === "Student") {
                      return `${branch || "Student"}${
                        semester ? ` • ${semester}` : ""
                      }`;
                    }
                    return role || "User";
                  })()}{" "}
                  • {timeAgo(item.createdAt)}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {isAuthor && (
                  <TouchableOpacity
                    onPress={openEditModal}
                    style={{ padding: 4, marginRight: 12 }}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={20}
                      color={theme.primary}
                    />
                  </TouchableOpacity>
                )}
                {canManage ? (
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={{ padding: 4 }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={theme.danger}
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleReport}
                    style={{ padding: 4 }}
                  >
                    <Ionicons
                      name="flag-outline"
                      size={20}
                      color={theme.danger}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text style={[styles.title, { color: theme.text }]}>
              {item.title}
            </Text>

            <View
              style={[
                styles.rewardBadge,
                {
                  backgroundColor: theme.primary + "15",
                  alignSelf: "flex-start",
                  marginBottom: 16,
                },
              ]}
            >
              <Ionicons
                name="pricetag-outline"
                size={16}
                color={theme.primary}
              />
              <Text style={[styles.rewardText, { color: theme.primary }]}>
                {item.price}
              </Text>
            </View>

            {item.imageUrl && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setIsImageViewVisible(true)}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.mainImage}
                  contentFit="cover"
                />
              </TouchableOpacity>
            )}

            <Text style={[styles.description, { color: theme.textSecondary }]}>
              {item.description}
            </Text>

            {canManage && (
              <View
                style={[
                  styles.manageControls,
                  { borderTopColor: theme.cardBorder },
                ]}
              >
                <Text style={[styles.manageLabel, { color: theme.text }]}>
                  Status: {isSold ? "Sold" : "Available"}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.statusToggleBtn,
                    { backgroundColor: isSold ? theme.primary : theme.danger },
                  ]}
                  onPress={toggleStatus}
                >
                  <Text style={styles.statusToggleText}>
                    Mark as {isSold ? "Available" : "Sold"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {isAuthor || isAdmin
                ? `Messages (${itemComments.length})`
                : "Private Messages"}
            </Text>
            <Text
              style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
            >
              {isAuthor || isAdmin
                ? isAdmin
                  ? "Admin View: All Messages"
                  : "Only you can see these messages"
                : "Only the seller can see your messages"}
            </Text>
          </View>

          {!isAuthor &&
            !myComment &&
            !isSold &&
            user &&
            user.role !== "Guest" && (
              <View
                style={[
                  styles.applyCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.applyTitle, { color: theme.text }]}>
                  Send a Message
                </Text>
                <Text
                  style={[styles.applySubtitle, { color: theme.textSecondary }]}
                >
                  Ask about the item, negotiate price, or arrange a meetup.
                </Text>
                <TextInput
                  style={[
                    styles.applyInput,
                    {
                      color: theme.text,
                      borderColor: theme.cardBorder,
                      backgroundColor: theme.background,
                    },
                  ]}
                  placeholder="Hi, I'm interested..."
                  placeholderTextColor={theme.textSecondary + "80"}
                  value={replyMessage}
                  onChangeText={setReplyMessage}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={200}
                  autoCapitalize="sentences"
                />
                <Text
                  style={[styles.charCount, { color: theme.textSecondary }]}
                >
                  {replyMessage.length}/200
                </Text>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { backgroundColor: theme.primary },
                    (!replyMessage.trim() || isSubmitting) && { opacity: 0.6 },
                  ]}
                  onPress={handleApply}
                  disabled={!replyMessage.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Send Message</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

          {isSold && !isAuthor && (
            <View
              style={[
                styles.closedNotice,
                { backgroundColor: theme.danger + "15" },
              ]}
            >
              <Ionicons
                name="lock-closed"
                size={20}
                color={theme.danger}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.closedText, { color: theme.danger }]}>
                This item has been sold.
              </Text>
            </View>
          )}

          {!isAuthor && myComment && (
            <View
              style={[
                styles.myApplicationCard,
                {
                  backgroundColor: theme.primary + "10",
                  borderColor: theme.primary + "30",
                },
              ]}
            >
              <View style={styles.myAppHeader}>
                <View>
                  <Text style={[styles.myAppTitle, { color: theme.text }]}>
                    Your Message
                  </Text>
                  <Text
                    style={[styles.timeAgo, { color: theme.textSecondary }]}
                  >
                    {timeAgo(myComment.createdAt)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    handleDeleteComment(
                      myComment.id,
                      myComment.applicantUid,
                      myComment.message
                    )
                  }
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={theme.danger}
                  />
                </TouchableOpacity>
              </View>
              <Text
                style={[styles.myAppMessage, { color: theme.textSecondary }]}
              >
                {myComment.message}
              </Text>

              {myComment.ownerReply && (
                <View
                  style={[
                    styles.ownerReplyBox,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderLeftColor: theme.primary,
                    },
                  ]}
                >
                  <Text style={[styles.ownerReplyLabel, { color: theme.text }]}>
                    Reply from {item.authorName}
                  </Text>
                  <Text
                    style={[
                      styles.ownerReplyText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {myComment.ownerReply}
                  </Text>
                </View>
              )}
            </View>
          )}

          {(isAuthor || isAdmin) &&
            itemComments.map((comment) => (
              <View
                key={comment.id}
                style={[
                  styles.applicationCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.cardBorder,
                  },
                ]}
              >
                <View style={styles.appHeaderRow}>
                  <Image
                    source={{
                      uri:
                        comment.applicantPhoto ||
                        "https://ui-avatars.com/api/?name=" +
                          encodeURIComponent(comment.applicantName),
                    }}
                    style={styles.appAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.appName, { color: theme.text }]}>
                      {comment.applicantName}
                    </Text>
                    <Text
                      style={[styles.timeAgo, { color: theme.textSecondary }]}
                    >
                      {timeAgo(comment.createdAt)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {canManage ? (
                      <TouchableOpacity
                        onPress={() =>
                          handleDeleteComment(
                            comment.id,
                            comment.applicantUid,
                            comment.message
                          )
                        }
                        style={{ padding: 4 }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={theme.danger}
                        />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleReportComment(comment.id)}
                        style={{ padding: 4 }}
                      >
                        <Ionicons
                          name="flag-outline"
                          size={18}
                          color={theme.danger}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <Text
                  style={[styles.appMessage, { color: theme.textSecondary }]}
                >
                  {comment.message}
                </Text>

                {comment.ownerReply ? (
                  <View
                    style={[
                      styles.myReplyBox,
                      {
                        backgroundColor: theme.primary + "10",
                        borderLeftColor: theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.myReplyLabel, { color: theme.primary }]}
                    >
                      Your Reply
                    </Text>
                    <Text
                      style={[
                        styles.myReplyText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {comment.ownerReply}
                    </Text>
                  </View>
                ) : replyingToAppId === comment.id ? (
                  <View style={styles.replyInputContainer}>
                    <TextInput
                      style={[
                        styles.replyInput,
                        {
                          color: theme.text,
                          borderColor: theme.cardBorder,
                          backgroundColor: theme.background,
                        },
                      ]}
                      placeholder="Write a reply..."
                      placeholderTextColor={theme.textSecondary + "80"}
                      value={ownerReplyText}
                      onChangeText={setOwnerReplyText}
                      multiline
                      maxLength={150}
                      autoCapitalize="sentences"
                    />
                    <View style={styles.replyActions}>
                      <TouchableOpacity
                        onPress={() => setReplyingToAppId(null)}
                        style={{ padding: 8 }}
                      >
                        <Text style={{ color: theme.textSecondary }}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleOwnerReply(comment.id)}
                        style={[
                          styles.replySendBtn,
                          { backgroundColor: theme.primary },
                          (!ownerReplyText.trim() || submittingOwnerReply) && {
                            opacity: 0.6,
                          },
                        ]}
                        disabled={
                          !ownerReplyText.trim() || submittingOwnerReply
                        }
                      >
                        {submittingOwnerReply ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={{ color: "#FFF", fontWeight: "600" }}>
                            Send
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.replyBtn, { borderColor: theme.primary }]}
                    onPress={() => {
                      setReplyingToAppId(comment.id);
                      setOwnerReplyText("");
                    }}
                  >
                    <Ionicons
                      name="arrow-undo-outline"
                      size={16}
                      color={theme.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[styles.replyBtnText, { color: theme.primary }]}
                    >
                      Reply
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.container, { backgroundColor: theme.background }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              styles.headerContainer,
              {
                paddingTop: insets.top + 10,
                backgroundColor: theme.backgroundElement,
                borderBottomColor: theme.cardBorder,
              },
            ]}
          >
            <View style={styles.headerTop}>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                style={styles.backButton}
              >
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
              <Text
                style={[
                  styles.headerTitle,
                  { color: theme.text, flex: 1, marginLeft: 12 },
                ]}
              >
                Edit Post
              </Text>
              <TouchableOpacity
                style={[
                  styles.postBtn,
                  (!editTitle.trim() || !editPrice.trim()) && { opacity: 0.5 },
                ]}
                onPress={handleSaveEdit}
                disabled={
                  isSavingEdit || !editTitle.trim() || !editPrice.trim()
                }
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Text style={[styles.postBtnText, { color: theme.primary }]}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>
              Item Title *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.cardBorder,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
              value={editTitle}
              onChangeText={setEditTitle}
              maxLength={60}
            />

            <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>
              Price (₹) *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.cardBorder,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="default"
              maxLength={20}
            />

            <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.cardBorder,
                  backgroundColor: theme.backgroundElement,
                  minHeight: 100,
                },
              ]}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <ImageViewing
        images={item?.imageUrl ? [{ uri: item.imageUrl }] : []}
        imageIndex={0}
        visible={isImageViewVisible}
        onRequestClose={() => setIsImageViewVisible(false)}
        animationType="fade"
      />

      <ForwardSheet
        visible={isForwardVisible}
        content={forwardContent}
        onClose={() => { setIsForwardVisible(false); setForwardContent(null); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  smallSendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  smallSendBtnText: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  label: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 4,
  },
  postBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(96, 165, 250, 0.1)",
  },
  postBtnText: { fontSize: 15, fontWeight: "600" },

  container: { flex: 1 },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  card: { borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1 },
  authorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "#E2E8F0",
  },
  authorInfo: { flex: 1 },
  authorName: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  timeAgo: { fontSize: 13 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12, lineHeight: 28 },
  mainImage: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#E2E8F0",
  },
  description: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  rewardText: { fontSize: 14, fontWeight: "600", marginLeft: 6 },
  manageControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  manageLabel: { fontSize: 14, fontWeight: "600" },
  statusToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusToggleText: { color: "#FFF", fontSize: 13, fontWeight: "600" },
  sectionHeader: { marginBottom: 16, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  sectionSubtitle: { fontSize: 14 },
  applyCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  applyTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  applySubtitle: { fontSize: 14, marginBottom: 16 },
  applyInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    fontSize: 15,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 6,
    marginBottom: 16,
  },
  submitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  closedNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  closedText: { fontSize: 15, fontWeight: "600" },
  myApplicationCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  myAppHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  myAppTitle: { fontSize: 16, fontWeight: "600" },
  myAppMessage: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  ownerReplyBox: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginTop: 8,
  },
  ownerReplyLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  ownerReplyText: { fontSize: 14, lineHeight: 20 },
  applicationCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  appHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  appAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: "#E2E8F0",
  },
  appName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  appMessage: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  replyBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  replyBtnText: { fontSize: 14, fontWeight: "500" },
  myReplyBox: { padding: 12, borderRadius: 8, borderLeftWidth: 4 },
  myReplyLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  myReplyText: { fontSize: 14, lineHeight: 20 },
  replyInputContainer: { marginTop: 8 },
  replyInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    marginBottom: 12,
  },
  replyActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  replySendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 12,
  },
});
