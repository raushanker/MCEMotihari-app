import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView,  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Keyboard, Modal, AlertButton } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { useLocalSearchParams } from 'expo-router';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useGigsStore, Gig, GigApplication } from '@/store/useGigsStore';
import { useAppStore } from '@/store/useAppStore';
import { useExploreBack } from '@/hooks/useExploreBack';
import { Image } from 'expo-image';
import { getFormattedPostTime as timeAgo } from '@/utils/timeFormat';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function GigDetailsScreen() {
  const { id, from } = useLocalSearchParams();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAppStore(state => state.user);
  const handleExploreBack = useExploreBack();
  
  const { gigs, applications, fetchApplications, applyToGig, updateGigStatus, deleteGig, reportGig } = useGigsStore();
  
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [replyingToAppId, setReplyingToAppId] = useState<string | null>(null);
  const [ownerReplyText, setOwnerReplyText] = useState('');
  const [submittingOwnerReply, setSubmittingOwnerReply] = useState(false);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRewardType, setEditRewardType] = useState('Paid work');
  const [editCustomReward, setEditCustomReward] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [publicUpdateText, setPublicUpdateText] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // New state variables for Edit and Report features
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editAppText, setEditAppText] = useState('');
  const [isSubmittingAppEdit, setIsSubmittingAppEdit] = useState(false);

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [isSubmittingReplyEdit, setIsSubmittingReplyEdit] = useState(false);

  const REWARD_OPTIONS = [
    { id: 'Paid work', icon: 'cash-outline' },
    { id: 'Party/Treat', icon: 'pizza-outline' },
    { id: 'Chai+Samosa treat', icon: 'cafe-outline' },
    { id: 'Trip sponsored', icon: 'airplane-outline' },
    { id: 'Certificate', icon: 'ribbon-outline' },
    { id: 'Recommendations', icon: 'star-outline' },
    { id: 'Any other', icon: 'options-outline' }
  ];

  const TITLE_SUGGESTIONS = [
    'Research Assistant',
    'Volunteer for Campaign',
    'Assignment Help',
    'Project Work Help',
  ];

  useEffect(() => {
    const loadGig = async () => {
      // First try to find it in the store
      let foundGig = gigs.find(g => g.id === id);
      if (!foundGig) {
        // Fetch from Firestore if not in store (e.g. direct deep link)
        try {
          const docRef = await getDoc(doc(db, 'gigs', id as string));
          if (docRef.exists()) {
            const data = docRef.data();
            foundGig = { 
              id: docRef.id, 
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt 
            } as Gig;
          }
        } catch (e) {
          console.error("Error fetching single gig", e);
        }
      }
      setGig(foundGig || null);
      
      // If user is author or admin, fetch all apps. Otherwise, user can only fetch their own implicitly
      // We will try to fetch apps anyway. Firestore rules will reject if not author/admin, but we can catch it or filter.
      // Actually, if they are the author or admin, we fetch. If they are a normal user, they might have applied.
      // We'll just fetch, rules allow reading if applicantUid == user.uid OR author == user.uid
      if (foundGig) {
        await fetchApplications(id as string);
      }
      
      setLoading(false);
    };
    
    if (id) {
      loadGig();
    }
  }, [id, gigs]);

  const gigApps = applications[id as string] || [];
  const isAuthor = user?.uid === gig?.authorUid;
  const isAdmin = user?.adminRole === 'SUPER_ADMIN';
  const canManage = isAuthor || isAdmin;
  
  // Find if the current user has already applied
  const myApplication = !isAuthor ? gigApps.find(app => app.applicantUid === user?.uid) : null;
  const isClosed = gig?.status === 'closed';

  const handleApply = async () => {
    if (!replyMessage.trim()) return;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to apply.');
      return;
    }
    
    setIsSubmitting(true);
    Keyboard.dismiss();
    try {
      await applyToGig(gig!.id, {
        applicantUid: user.uid,
        applicantName: user.name || 'Anonymous',
        applicantPhoto: user.photoUrl,
        applicantRole: user.role,
        applicantAdminRole: user.adminRole,
        applicantIsVerified: user.isVerified,
        message: replyMessage.trim()
      });
      setReplyMessage('');
      Alert.alert('Success', 'Your application/reply was sent privately to the author.');
    } catch (e) {
      Alert.alert('Error', 'Failed to send reply.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async () => {
    if (!gig) return;
    const newStatus = isClosed ? 'open' : 'closed';
    try {
      await updateGigStatus(gig.id, newStatus);
      setGig({ ...gig, status: newStatus });
    } catch (e) {
      Alert.alert('Error', 'Failed to update status.');
    }
  };

  const handleOwnerReply = async (applicationId: string) => {
    if (!ownerReplyText.trim() || !gig) return;
    setSubmittingOwnerReply(true);
    try {
      const { replyToApplication } = useGigsStore.getState();
      await replyToApplication(gig.id, applicationId, ownerReplyText.trim());
      setReplyingToAppId(null);
      setOwnerReplyText('');
    } catch (e) {
      Alert.alert('Error', 'Failed to send reply.');
    } finally {
      setSubmittingOwnerReply(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!publicUpdateText.trim() || !gig) return;
    setIsSubmittingUpdate(true);
    try {
      const { addPublicUpdate } = useGigsStore.getState();
      await addPublicUpdate(gig.id, publicUpdateText.trim());
      
      // Update local state so it shows up immediately
      const newUpdate = {
        id: Date.now().toString(),
        text: publicUpdateText.trim(),
        createdAt: new Date().toISOString()
      };
      setGig({
        ...gig,
        publicUpdates: [...(gig.publicUpdates || []), newUpdate]
      });
      
      setPublicUpdateText('');
    } catch (e) {
      Alert.alert('Error', 'Failed to post update.');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

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

  const openEditModal = () => {
    if (!gig) return;
    setEditTitle(gig.title);
    setEditDescription(gig.description);
    setEditRewardType(gig.rewardType);
    if (gig.rewardType === 'Any other') {
      setEditCustomReward(gig.customReward || '');
    } else {
      setEditCustomReward('');
    }
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!gig) return;
    if (!editTitle.trim() || !editDescription.trim()) {
      Alert.alert('Incomplete', 'Please provide a title and description.');
      return;
    }
    if (editRewardType === 'Any other' && !editCustomReward.trim()) {
      Alert.alert('Incomplete', 'Please specify the custom reward.');
      return;
    }

    setIsSaving(true);
    try {
      const { updateGig } = useGigsStore.getState();
      await updateGig(gig.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        rewardType: editRewardType,
        customReward: editRewardType === 'Any other' ? editCustomReward.trim() : undefined,
      });
      setGig({
        ...gig,
        title: editTitle.trim(),
        description: editDescription.trim(),
        rewardType: editRewardType,
        customReward: editRewardType === 'Any other' ? editCustomReward.trim() : undefined,
      });
      setIsEditModalVisible(false);
      Alert.alert('Success', 'Requirement updated successfully.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update opportunity.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Opportunity', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          if (!gig) return;
          try {
            await deleteGig(gig.id);
            handleBack();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete gig.');
          }
        }
      }
    ]);
  };

  const handleReport = () => {
    if (Platform.OS === 'web') {
      const reason = window.prompt("Why are you reporting this requirement?", "Violating community guidelines");
      if (reason) submitReport(reason);
    } else {
      Alert.alert(
        'Report Requirement',
        'Why are you reporting this requirement?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Spam or Misleading', onPress: () => submitReport('Spam or Misleading') },
          { text: 'Inappropriate Content', onPress: () => submitReport('Inappropriate Content') },
          { text: 'Harassment or Scam', onPress: () => submitReport('Harassment or Scam') }
        ]
      );
    }
  };

  const submitReport = async (reason: string) => {
    if (!gig) return;
    try {
      await reportGig(gig.id, reason);
      Alert.alert('Reported', 'Thank you. This requirement has been reported to the admins.');
      handleBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to submit report.');
    }
  };

  const handleSaveAppEdit = async (appId: string) => {
    if (!gig || !editAppText.trim()) return;
    setIsSubmittingAppEdit(true);
    try {
      const { editApplication } = useGigsStore.getState();
      await editApplication(gig.id, appId, editAppText.trim());
      setEditingAppId(null);
      setEditAppText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save edits.');
    } finally {
      setIsSubmittingAppEdit(false);
    }
  };

  const handleDeleteApp = (appId: string) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (!gig) return;
        try {
          const { deleteApplication } = useGigsStore.getState();
          await deleteApplication(gig.id, appId);
        } catch (error) {
          Alert.alert('Error', 'Failed to delete comment.');
        }
      }}
    ]);
  };

  const handleSaveReplyEdit = async (appId: string) => {
    if (!gig || !editReplyText.trim()) return;
    setIsSubmittingReplyEdit(true);
    try {
      const { editReply } = useGigsStore.getState();
      await editReply(gig.id, appId, editReplyText.trim());
      setEditingReplyId(null);
      setEditReplyText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save edits.');
    } finally {
      setIsSubmittingReplyEdit(false);
    }
  };

  const handleDeleteReply = (appId: string) => {
    Alert.alert('Delete Reply', 'Are you sure you want to delete your reply?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (!gig) return;
        try {
          const { deleteReply } = useGigsStore.getState();
          await deleteReply(gig.id, appId);
        } catch (error) {
          Alert.alert('Error', 'Failed to delete reply.');
        }
      }}
    ]);
  };

  const handleReportApp = (appId: string) => {
    if (Platform.OS === 'web') {
      const reason = window.prompt("Why are you reporting this comment?", "Violating community guidelines");
      if (reason && gig) {
        useGigsStore.getState().reportApplication(gig.id, appId, reason)
          .then(() => Alert.alert('Reported', 'Comment has been reported.'))
          .catch(() => Alert.alert('Error', 'Failed to report comment.'));
      }
    } else {
      Alert.alert('Report Comment', 'Why are you reporting this comment?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Spam', onPress: () => submitAppReport(appId, 'Spam') },
        { text: 'Inappropriate', onPress: () => submitAppReport(appId, 'Inappropriate') },
        { text: 'Harassment', onPress: () => submitAppReport(appId, 'Harassment') }
      ]);
    }
  };

  const submitAppReport = async (appId: string, reason: string) => {
    if (!gig) return;
    try {
      const { reportApplication } = useGigsStore.getState();
      await reportApplication(gig.id, appId, reason);
      Alert.alert('Reported', 'Thank you. The comment has been reported.');
    } catch (e) {
      Alert.alert('Error', 'Failed to submit report.');
    }
  };

  const getRewardIcon = (rewardType: string) => {
    switch (rewardType) {
      case 'Paid work': return 'cash-outline';
      case 'Party/Treat': return 'pizza-outline';
      case 'Chai+Samosa treat': return 'cafe-outline';
      case 'Trip sponsored': return 'airplane-outline';
      case 'Certificate': return 'ribbon-outline';
      case 'Recommendations': return 'star-outline';
      default: return 'gift-outline';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!gig) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Opportunity not found or deleted.</Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={handleBack}>
          <Text style={{ color: theme.primary, fontSize: 16 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>Opportunity</Text>
        
        {canManage ? (
          <TouchableOpacity onPress={handleDelete} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={22} color={theme.danger} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleReport} style={{ padding: 4 }}>
            <Ionicons name="flag-outline" size={22} color={theme.danger} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
          <View style={styles.authorHeader}>
            <Image 
              source={{ uri: (isAuthor && user ? user.photoUrl : gig.authorPhoto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(isAuthor && user ? (user.name || '') : gig.authorName) }} 
              style={styles.avatar} 
            />
            <View style={styles.authorInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.authorName, { color: theme.text }]} numberOfLines={1}>
                  {isAuthor && user ? user.name : gig.authorName}
                </Text>
                {(() => {
                  const currentAuthorAdminRole = isAuthor && user ? user.adminRole : gig.authorAdminRole;
                  const currentAuthorRole = isAuthor && user ? user.role : gig.authorRole;
                  const currentAuthorUid = isAuthor && user ? user.uid : gig.authorUid;
                  const isAuthorAdmin = Boolean(
                    ['SUPER_ADMIN', 'Admin'].includes(currentAuthorAdminRole as string) ||
                    ['SUPER_ADMIN', 'Admin'].includes(currentAuthorRole as string) ||
                    (currentAuthorUid && ['Zdxi8kTc2kcs1cOPxWS81PTVmco2', 'DdP2c855PSRUJwhmN9rvbkYBraP2'].includes(currentAuthorUid))
                  );
                  return isAuthorAdmin ? <MaterialIcons name="verified" size={15} color="#1D9BF0" /> : null;
                })()}
              </View>
              <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>
                {(() => {
                  const currentAuthorAdminRole = isAuthor && user ? user.adminRole : gig.authorAdminRole;
                  const currentAuthorRole = isAuthor && user ? user.role : gig.authorRole;
                  const currentAuthorUid = isAuthor && user ? user.uid : gig.authorUid;
                  const isAuthorAdmin = Boolean(
                    ['SUPER_ADMIN', 'Admin'].includes(currentAuthorAdminRole as string) ||
                    ['SUPER_ADMIN', 'Admin'].includes(currentAuthorRole as string) ||
                    (currentAuthorUid && ['Zdxi8kTc2kcs1cOPxWS81PTVmco2', 'DdP2c855PSRUJwhmN9rvbkYBraP2'].includes(currentAuthorUid))
                  );
                  return isAuthorAdmin ? 'Admin' : (currentAuthorRole || 'Student');
                })()} • {timeAgo(gig.createdAt)}
              </Text>
            </View>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            {gig.title}
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {gig.description}
          </Text>

          <View style={[styles.rewardBadge, { backgroundColor: theme.isDark ? 'rgba(96, 165, 250, 0.15)' : theme.primary + '15', alignSelf: 'flex-start', marginTop: 16 }]}>
            <Ionicons name={getRewardIcon(gig.rewardType) as any} size={16} color={theme.isDark ? '#60A5FA' : theme.primary} />
            <Text style={[styles.rewardText, { color: theme.isDark ? '#60A5FA' : theme.primary }]}>
              {gig.rewardType === 'Any other' ? gig.customReward : gig.rewardType}
            </Text>
          </View>

          {canManage && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity 
                style={[styles.statusToggle, { flex: 1, backgroundColor: isClosed ? theme.primary : theme.danger + '20' }]}
                onPress={toggleStatus}
              >
                <Text style={[styles.statusToggleText, { color: isClosed ? '#FFF' : theme.danger }]}>
                  {isClosed ? 'Reopen' : 'Mark as Finished'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.statusToggle, { flex: 1, backgroundColor: theme.isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(15, 23, 42, 0.08)' }]}
                onPress={openEditModal}
              >
                <Text style={[styles.statusToggleText, { color: theme.isDark ? '#60A5FA' : theme.primary }]}>
                  Edit Requirement
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Public Updates Section */}
        {((gig.publicUpdates && gig.publicUpdates.length > 0) || (canManage && !isClosed)) && (
          <View style={[styles.publicUpdatesSection, { marginTop: 24, marginBottom: 8 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>
              Public Updates
            </Text>
            
            {gig.publicUpdates?.map(update => (
              <View key={update.id} style={[styles.updateCard, { backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC', borderColor: theme.cardBorder, borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="megaphone" size={14} color={theme.isDark ? '#60A5FA' : theme.primary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: '600' }}>
                    Author Update • {timeAgo(update.createdAt)}
                  </Text>
                </View>
                <Text style={{ color: theme.text, fontSize: 14 }}>
                  {update.text}
                </Text>
              </View>
            ))}

            {canManage && !isClosed && (
              <View style={[styles.updateInputContainer, { marginTop: 12, backgroundColor: theme.backgroundElement, padding: 12, borderRadius: 8, borderColor: theme.cardBorder, borderWidth: 1 }]}>
                <TextInput
                  style={[styles.replyInput, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background, marginBottom: 8 }]}
                  placeholder="Post a public update for everyone to see..."
                  placeholderTextColor={theme.textSecondary + '80'}
                  multiline
                  value={publicUpdateText}
                  onChangeText={setPublicUpdateText}
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                />
                <TouchableOpacity 
                  style={[styles.smallSendBtn, { backgroundColor: theme.primary, alignSelf: 'flex-end', paddingHorizontal: 16 }, (!publicUpdateText.trim() || isSubmittingUpdate) && { opacity: 0.6 }]}
                  onPress={handleAddUpdate}
                  disabled={!publicUpdateText.trim() || isSubmittingUpdate}
                >
                  {isSubmittingUpdate ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.smallSendBtnText}>Post Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {(isAuthor || isAdmin) && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {isAuthor ? `Private Replies (${gigApps.length})` : `All Private Replies [Admin] (${gigApps.length})`}
            </Text>
            <View style={styles.applicationsList}>
              {gigApps.length === 0 ? (
                <Text style={[styles.emptyApps, { color: theme.textSecondary }]}>
                  No applications or replies yet.
                </Text>
              ) : (
                gigApps.map(app => (
                  <View key={app.id} style={[styles.appCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                    <View style={styles.appHeader}>
                      <Image 
                        source={{ uri: app.applicantPhoto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(app.applicantName) }} 
                        style={styles.appAvatar} 
                      />
                      <View style={styles.appAuthorInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={[styles.appName, { color: theme.text }]} numberOfLines={1}>
                            {app.applicantName}
                          </Text>
                          {(() => {
                            const isAppAdmin = Boolean(
                              ['SUPER_ADMIN', 'Admin'].includes(app.applicantAdminRole as string) ||
                              ['SUPER_ADMIN', 'Admin'].includes(app.applicantRole as string) ||
                              (app.applicantUid && ['Zdxi8kTc2kcs1cOPxWS81PTVmco2', 'DdP2c855PSRUJwhmN9rvbkYBraP2'].includes(app.applicantUid))
                            );
                            return (isAppAdmin || app.applicantIsVerified) ? (
                              <MaterialIcons name="verified" size={14} color="#1D9BF0" />
                            ) : null;
                          })()}
                        </View>
                        <Text style={[styles.appTime, { color: theme.textSecondary }]}>
                          {(() => {
                            const isAppAdmin = Boolean(
                              ['SUPER_ADMIN', 'Admin'].includes(app.applicantAdminRole as string) ||
                              ['SUPER_ADMIN', 'Admin'].includes(app.applicantRole as string) ||
                              (app.applicantUid && ['Zdxi8kTc2kcs1cOPxWS81PTVmco2', 'DdP2c855PSRUJwhmN9rvbkYBraP2'].includes(app.applicantUid))
                            );
                            const role = isAppAdmin ? 'Admin' : (app.applicantRole || 'Student');
                            return `${role} • `;
                          })()}{timeAgo(app.createdAt)}
                        </Text>
                      </View>
                      
                      {/* Application Options */}
                      <TouchableOpacity 
                        style={{ padding: 4, marginLeft: 'auto' }}
                        onPress={() => {
                          const isAppOwner = user?.uid === app.applicantUid;
                          const options: AlertButton[] = [];
                          if (isAppOwner) {
                            options.push({ text: 'Edit', onPress: () => { setEditingAppId(app.id); setEditAppText(app.message); } });
                            options.push({ text: 'Delete', style: 'destructive', onPress: () => handleDeleteApp(app.id) });
                          } else {
                            options.push({ text: 'Report', style: 'destructive', onPress: () => handleReportApp(app.id) });
                          }
                          options.push({ text: 'Cancel', style: 'cancel' });
                          if (Platform.OS === 'web') {
                            if (isAppOwner) {
                              const wantsEdit = window.confirm("Do you want to edit your comment? (Cancel to Delete)");
                              if (wantsEdit) { setEditingAppId(app.id); setEditAppText(app.message); }
                              else {
                                if (window.confirm("Are you sure you want to delete your comment?")) { handleDeleteApp(app.id); }
                              }
                            } else {
                              handleReportApp(app.id);
                            }
                          } else {
                            Alert.alert('Options', '', options);
                          }
                        }}
                      >
                        <Ionicons name="ellipsis-vertical" size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    
                    {editingAppId === app.id ? (
                      <View style={styles.replyInputContainer}>
                        <TextInput
                          style={[styles.smallReplyInput, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background }]}
                          multiline
                          value={editAppText}
                          onChangeText={setEditAppText}
                          autoFocus
                          autoCapitalize="sentences"
                        />
                        <View style={styles.replyActions}>
                          <TouchableOpacity onPress={() => { setEditingAppId(null); setEditAppText(''); }} style={{ padding: 8 }}>
                            <Text style={{ color: theme.textSecondary }}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.smallSendBtn, { backgroundColor: theme.primary }, (!editAppText.trim() || isSubmittingAppEdit) && { opacity: 0.6 }]}
                            onPress={() => handleSaveAppEdit(app.id)}
                            disabled={!editAppText.trim() || isSubmittingAppEdit}
                          >
                            {isSubmittingAppEdit ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.smallSendBtnText}>Save</Text>}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <Text style={[styles.appMessage, { color: theme.text }]}>{app.message}</Text>
                    )}
                    
                    {app.ownerReply ? (
                      <View style={[styles.ownerReplyBox, { backgroundColor: theme.isDark ? 'rgba(96, 165, 250, 0.1)' : theme.primary + '08' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={[styles.ownerReplyLabel, { color: theme.isDark ? '#60A5FA' : theme.primary, marginBottom: 0 }]}>Your Reply:</Text>
                          <TouchableOpacity 
                            style={{ padding: 4 }}
                            onPress={() => {
                              const options: AlertButton[] = [];
                              if (isAuthor || isAdmin) {
                                options.push({ text: 'Edit', onPress: () => { setEditingReplyId(app.id); setEditReplyText(app.ownerReply!); } });
                                options.push({ text: 'Delete', style: 'destructive', onPress: () => handleDeleteReply(app.id) });
                              } else {
                                options.push({ text: 'Report', style: 'destructive', onPress: () => handleReportApp(app.id) });
                              }
                              options.push({ text: 'Cancel', style: 'cancel' });
                              if (Platform.OS === 'web') {
                                if (isAuthor || isAdmin) {
                                  const wantsEdit = window.confirm("Do you want to edit your reply? (Cancel to Delete)");
                                  if (wantsEdit) { setEditingReplyId(app.id); setEditReplyText(app.ownerReply!); }
                                  else {
                                    if (window.confirm("Are you sure you want to delete your reply?")) { handleDeleteReply(app.id); }
                                  }
                                } else {
                                  handleReportApp(app.id);
                                }
                              } else {
                                Alert.alert('Options', '', options);
                              }
                            }}
                          >
                            <Ionicons name="ellipsis-vertical" size={16} color={theme.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        
                        {editingReplyId === app.id ? (
                          <View style={styles.replyInputContainer}>
                            <TextInput
                              style={[styles.smallReplyInput, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background }]}
                              multiline
                              value={editReplyText}
                              onChangeText={setEditReplyText}
                              autoFocus
                              autoCapitalize="sentences"
                            />
                            <View style={styles.replyActions}>
                              <TouchableOpacity onPress={() => { setEditingReplyId(null); setEditReplyText(''); }} style={{ padding: 8 }}>
                                <Text style={{ color: theme.textSecondary }}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.smallSendBtn, { backgroundColor: theme.primary }, (!editReplyText.trim() || isSubmittingReplyEdit) && { opacity: 0.6 }]}
                                onPress={() => handleSaveReplyEdit(app.id)}
                                disabled={!editReplyText.trim() || isSubmittingReplyEdit}
                              >
                                {isSubmittingReplyEdit ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.smallSendBtnText}>Save</Text>}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <Text style={[styles.ownerReplyText, { color: theme.text }]}>{app.ownerReply}</Text>
                        )}
                      </View>
                    ) : isAuthor && !isClosed ? (
                      <View style={styles.replyActionContainer}>
                        {replyingToAppId === app.id ? (
                          <View style={styles.replyInputContainer}>
                            <TextInput
                              style={[styles.smallReplyInput, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background }]}
                              placeholder="Type your reply..."
                              placeholderTextColor={theme.textSecondary + '80'}
                              multiline
                              value={ownerReplyText}
                              onChangeText={setOwnerReplyText}
                              autoCapitalize="sentences"
                            />
                            <View style={styles.replyActions}>
                              <TouchableOpacity onPress={() => { setReplyingToAppId(null); setOwnerReplyText(''); }} style={{ padding: 8 }}>
                                <Text style={{ color: theme.textSecondary }}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.smallSendBtn, { backgroundColor: theme.primary }, (!ownerReplyText.trim() || submittingOwnerReply) && { opacity: 0.6 }]}
                                onPress={() => handleOwnerReply(app.id)}
                                disabled={!ownerReplyText.trim() || submittingOwnerReply}
                              >
                                {submittingOwnerReply ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.smallSendBtnText}>Send</Text>}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity onPress={() => setReplyingToAppId(app.id)} style={styles.replyButton}>
                            <Ionicons name="arrow-undo-outline" size={16} color={theme.textSecondary} />
                            <Text style={[styles.replyButtonText, { color: theme.textSecondary }]}>Reply</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {!isAuthor && (
          <View style={[styles.applicantSection, isAdmin && { marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: theme.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 4 }]}>
              Your Application
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 16 }}>
              <Ionicons name="lock-closed" size={12} /> Your application and messages are strictly private. Only the author can see them.
            </Text>
            {myApplication ? (
              <View style={[styles.appCard, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
                <Text style={[styles.appMessage, { color: theme.text }]}>{myApplication.message}</Text>
                <Text style={[styles.appTime, { color: theme.textSecondary, marginTop: 10 }]}>Sent {timeAgo(myApplication.createdAt)}</Text>
                
                {myApplication.ownerReply && (
                  <View style={[styles.ownerReplyBox, { backgroundColor: theme.isDark ? 'rgba(96, 165, 250, 0.1)' : theme.primary + '08', marginTop: 12 }]}>
                    <Text style={[styles.ownerReplyLabel, { color: theme.isDark ? '#60A5FA' : theme.primary }]}>{gig?.authorName}'s Reply:</Text>
                    <Text style={[styles.ownerReplyText, { color: theme.text }]}>{myApplication.ownerReply}</Text>
                  </View>
                )}
              </View>
            ) : isClosed ? (
              <View style={[styles.closedBox, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                <Text style={[styles.closedText, { color: theme.textSecondary }]}>This opportunity is now closed.</Text>
              </View>
            ) : (
              <View style={styles.replyBox}>
                <TextInput
                  style={[styles.replyInput, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}
                  placeholder="Why are you a good fit? Write a private message..."
                  placeholderTextColor={theme.textSecondary + '80'}
                  multiline
                  value={replyMessage}
                  onChangeText={setReplyMessage}
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                />
                <TouchableOpacity 
                  style={[styles.sendBtn, { backgroundColor: theme.primary }, (!replyMessage.trim() || isSubmitting) && { opacity: 0.6 }]}
                  onPress={handleApply}
                  disabled={!replyMessage.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.sendBtnText}>Send Application</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        
        <Modal
          visible={isEditModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <KeyboardAvoidingView 
            style={{ flex: 1, backgroundColor: theme.background }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.backButton}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Requirement</Text>
              <TouchableOpacity 
                style={[styles.postBtn, (!editTitle.trim() || !editDescription.trim()) && { opacity: 0.5 }]}
                onPress={handleSaveEdit}
                disabled={isSaving || !editTitle.trim() || !editDescription.trim()}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={theme.isDark ? '#60A5FA' : theme.primary} />
                ) : (
                  <Text style={[styles.postBtnText, { color: theme.isDark ? '#60A5FA' : theme.primary }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Title / Requirement</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {TITLE_SUGGESTIONS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 20,
                          borderWidth: 1,
                          backgroundColor: editTitle === s ? (theme.isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(15, 23, 42, 0.08)') : theme.backgroundElement,
                          borderColor: editTitle === s ? (theme.isDark ? '#60A5FA' : theme.primary) : theme.cardBorder,
                        }}
                        onPress={() => setEditTitle(s)}
                      >
                        <Text style={{
                          fontSize: 13,
                          color: editTitle === s ? (theme.isDark ? '#60A5FA' : theme.primary) : theme.textSecondary,
                          fontFamily: editTitle === s ? 'Inter-SemiBold' : 'Inter-Medium'
                        }}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}
                  placeholder="e.g., Need a Research Assistant for ML Project"
                  placeholderTextColor={theme.textSecondary + '80'}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  maxLength={100}
                  autoCapitalize="sentences"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Detailed Description</Text>
                <TextInput
                  style={[styles.input, { height: 120, paddingTop: 14 }, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}
                  placeholder="Explain what help you need..."
                  placeholderTextColor={theme.textSecondary + '80'}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Reward / Offering</Text>
                <Text style={[{ fontSize: 13, fontFamily: 'Inter-Regular', marginTop: -4, marginBottom: 12 }, { color: theme.textSecondary }]}>What will the person get in return?</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {REWARD_OPTIONS.map((option) => {
                    const isSelected = editRewardType === option.id;
                    const selectedColor = theme.isDark ? '#60A5FA' : theme.primary;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderRadius: 20,
                          borderWidth: 1,
                          backgroundColor: isSelected ? (theme.isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(15, 23, 42, 0.08)') : theme.backgroundElement,
                          borderColor: isSelected ? selectedColor : theme.cardBorder 
                        }}
                        onPress={() => setEditRewardType(option.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={option.icon as any} size={16} color={isSelected ? selectedColor : theme.textSecondary} />
                        <Text style={{ marginLeft: 6, fontSize: 14, color: isSelected ? selectedColor : theme.textSecondary, fontFamily: isSelected ? 'Inter-SemiBold' : 'Inter-Medium' }}>
                          {option.id}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {editRewardType === 'Any other' && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Specify Reward</Text>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}
                    placeholder="e.g., Co-authorship in paper"
                    placeholderTextColor={theme.textSecondary + '80'}
                    value={editCustomReward}
                    onChangeText={setEditCustomReward}
                    maxLength={50}
                    autoCapitalize="sentences"
                  />
                </View>
              )}
              <View style={{ height: 100 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        <View style={{ height: 50 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  authorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginRight: 4,
  },
  timeAgo: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
    lineHeight: 28,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rewardText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  statusToggle: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusToggleText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
    marginLeft: 4,
  },
  applicationsList: {
    gap: 12,
  },
  emptyApps: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 20,
  },
  appCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  appAuthorInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  appTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  appMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  applicantSection: {
    marginTop: 8,
  },
  replyBox: {
    gap: 12,
  },
  replyInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    height: 120,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  sendBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  ownerReplyBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#60A5FA',
  },
  ownerReplyLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  ownerReplyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  replyActionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  replyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  replyInputContainer: {
    marginTop: 4,
  },
  smallReplyInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  smallSendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  smallSendBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  closedBox: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  closedText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter-Medium',
  },
  postBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  publicUpdatesSection: {},
  updateCard: {},
  updateInputContainer: {},
});
