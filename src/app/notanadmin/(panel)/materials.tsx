import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Linking, Dimensions, ScrollView, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { collection, query, limit, getDocs, startAfter, where, orderBy, doc, updateDoc, deleteDoc, addDoc, QueryDocumentSnapshot, getDoc } from 'firebase/firestore';
import { db, storage } from '@/config/firebase';
import { ref, deleteObject } from 'firebase/storage';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/utils/auditLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PdfViewerModal } from '@/components/modals/PdfViewerModal';
import { DetailModal } from '@/components/modals/DetailModal';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 15;

const formatDateToDisplay = (dateObj: Date): string => {
  if (!dateObj) return 'Recent';
  const now = new Date();
  
  const isToday = 
    dateObj.getDate() === now.getDate() &&
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getFullYear() === now.getFullYear();
    
  if (isToday) {
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `Today, ${formattedHours}:${formattedMinutes} ${ampm}`;
  }
  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = 
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear();
    
  if (isYesterday) {
    return 'Yesterday';
  }
  
  return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

type MaterialStatus = 'Pending' | 'Approved' | 'Rejected' | 'Deleted';

interface MaterialDoc {
  id: string;
  title: string;
  branch: string;
  semester: string;
  materialType?: string;
  uploaderName: string;
  fileUrl?: string;
  webViewUrl?: string;
  status: MaterialStatus;
  createdAt?: any;
  ownerUid?: string;
  storagePath?: string;
  driveFileId?: string;
  files?: any[];
}

export default function MaterialsModerationScreen() {
  const { isDark } = useThemeColors();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  
  const [materials, setMaterials] = useState<MaterialDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [filterStatus, setFilterStatus] = useState<MaterialStatus | 'All'>('Pending');

  const [processingId, setProcessingId] = useState<string | null>(null);

  // PDF Viewer Modal State
  const [isPdfVisible, setIsPdfVisible] = useState(false);
  const [activePdfUrl, setActivePdfUrl] = useState('');
  const [activePdfTitle, setActivePdfTitle] = useState('');
  const [selectedMultiFileItem, setSelectedMultiFileItem] = useState<MaterialDoc | null>(null);

  useEffect(() => {
    fetchMaterials(true);
  }, [filterStatus]);

  const fetchMaterials = async (isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
      setHasMore(true);
    } else {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }

    try {
      let q;
      if (filterStatus === 'All') {
        q = query(collection(db, 'study_material_submissions'));
      } else {
        const dbStatus = filterStatus.toUpperCase();
        q = query(
          collection(db, 'study_material_submissions'),
          where('status', '==', dbStatus)
        );
      }

      const querySnapshot = await getDocs(q);
      const mappedData = querySnapshot.docs.map(docSnapshot => {
        const item = docSnapshot.data();
        let displayStatus: MaterialStatus = 'Pending';
        if (item.status === 'APPROVED') displayStatus = 'Approved';
        if (item.status === 'REJECTED') displayStatus = 'Rejected';
        if (item.status === 'DELETED') displayStatus = 'Deleted';

        return {
          id: docSnapshot.id,
          title: item.title || item.fileName || 'Untitled Material',
          branch: item.branch || 'Unknown',
          semester: item.semester || 'All',
          materialType: item.materialType || 'Unknown',
          uploaderName: item.uploaderName || 'Anonymous',
          fileUrl: item.fileUrl || item.webViewUrl || item.directUrl || '',
          status: displayStatus,
          ownerUid: item.ownerUid || '',
          storagePath: item.storagePath || '',
          driveFileId: item.driveFileId || '',
          files: item.files || [],
          createdAt: (() => {
            if (!item.createdAt) return new Date();
            if (typeof item.createdAt.toDate === 'function') return item.createdAt.toDate();
            if (item.createdAt.seconds) return new Date(item.createdAt.seconds * 1000);
            const d = new Date(item.createdAt);
            return isNaN(d.getTime()) ? new Date() : d;
          })()
        };
      });

      // Sort by newest first
      mappedData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      if (isRefresh) {
        setMaterials(mappedData);
      } else {
        setMaterials(prev => [...prev, ...mappedData]);
      }
      setHasMore(false); // Sorted and fetched in memory

    } catch (error) {
      console.error('Error fetching study materials from Firestore:', error);
      if (isRefresh) setMaterials([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const updateMaterialStatus = async (materialId: string, newStatus: MaterialStatus, title: string) => {
    if (processingId) return;
    setProcessingId(materialId);
    try {
      const material = materials.find(m => m.id === materialId);
      const dbStatus = newStatus.toUpperCase();

      // If approving and it's a Google Drive file, call GAS to route it
      if (newStatus === 'Approved' && material?.driveFileId && material.driveFileId !== 'firebase_storage') {
        let gasUrl = await AsyncStorage.getItem('@mce_study_materials_gas_url');
        if (!gasUrl) {
          gasUrl = await AsyncStorage.getItem('@mce_custom_gas_url');
        }
        if (!gasUrl) {
          gasUrl = process.env.EXPO_PUBLIC_GAS_URL || "https://script.google.com/macros/s/AKfycbzHJPVpMJ5J-ZUe-40wFASxy3_1fB7vm2mtfSG1t_1-ijPtEpIKoj9XnPar1ICs5geI/exec";
        }

        const filesToRoute: string[] = [];
        if (material.files && material.files.length > 0) {
          material.files.forEach((f: any) => {
            if (f && f.driveFileId) {
              filesToRoute.push(f.driveFileId);
            }
          });
        }
        if (filesToRoute.length === 0 && material.driveFileId) {
          filesToRoute.push(material.driveFileId);
        }

        for (const fileId of filesToRoute) {
          const response = await fetch(gasUrl!, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: "route_approved",
              fileId: fileId,
              branch: material.branch,
              semester: material.semester,
              materialType: material.materialType,
              secret: "MCE_CONNECT_ADMIN_2026"
            })
          });
          const text = await response.text();
          let json;
          try {
            json = JSON.parse(text);
          } catch (e) {
            throw new Error(`Invalid response from server: ${text.substring(0, 200)}`);
          }
          if (!json.success) {
            throw new Error(json.error || `Failed to route file ${fileId} in Google Drive`);
          }
        }
      }

      const docRef = doc(db, 'study_material_submissions', materialId);
      
      const updateData: any = {
        status: dbStatus
      };
      if (dbStatus === 'APPROVED') {
        updateData.approvedAt = new Date().toISOString();
      }

      await updateDoc(docRef, updateData);

      if (currentUser) {
        await logAdminAction({
          adminUid: currentUser.uid,
          adminName: currentUser.name || 'Admin',
          adminEmail: currentUser.email || '',
          action: `Set material status to ${newStatus} in Firestore`,
          targetId: materialId,
          targetType: 'StudyMaterial',
          details: `Title: ${title}`
        });
      }

      // Send notifications to the uploader if ownerUid exists
      if (material && material.ownerUid) {
        if (newStatus === 'Approved') {
          try {
            const userNotifRef = collection(db, 'users', material.ownerUid, 'notifications');
            const notifTitle = '🎉 Study Material Approved! 📚';
            const notifBody = `Congratulations! Your shared material "${title || 'Untitled Document'}" has been approved by college moderators and is now publicly live in the Library room!`;

            await addDoc(userNotifRef, {
              type: 'system',
              title: notifTitle,
              body: notifBody,
              timestamp: new Date().toISOString(),
              read: false,
              senderUid: 'system',
              senderName: 'MCE Connect',
              openStudy: 'contributions'
            });

            const profileSnap = await getDoc(doc(db, 'publicProfiles', material.ownerUid));
            if (profileSnap.exists()) {
              const profileData = profileSnap.data();
              if (profileData.pushToken) {
                const { sendPushNotifications } = require('@/utils/notifications');
                await sendPushNotifications([profileData.pushToken], notifTitle, notifBody, '/notifications');
              }
            }
          } catch (notifErr) {
            console.warn("Failed to send approval notification to contributor:", notifErr);
          }
        } else if (newStatus === 'Rejected') {
          try {
            const userNotifRef = collection(db, 'users', material.ownerUid, 'notifications');
            const notifTitle = '❌ Study Material Rejected';
            const notifBody = `Your shared material "${title || 'Untitled Document'}" was rejected by college moderators because it did not meet our content guidelines or standard quality guidelines.`;

            await addDoc(userNotifRef, {
              type: 'system',
              title: notifTitle,
              body: notifBody,
              timestamp: new Date().toISOString(),
              read: false,
              senderUid: 'system',
              senderName: 'MCE Connect',
              openStudy: 'contributions'
            });

            const profileSnap = await getDoc(doc(db, 'publicProfiles', material.ownerUid));
            if (profileSnap.exists()) {
              const profileData = profileSnap.data();
              if (profileData.pushToken) {
                const { sendPushNotifications } = require('@/utils/notifications');
                await sendPushNotifications([profileData.pushToken], notifTitle, notifBody, '/notifications');
              }
            }
          } catch (notifErr) {
            console.warn("Failed to send rejection notification to contributor:", notifErr);
          }
        }
      }

      if (filterStatus === 'All') {
        setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, status: newStatus } : m));
      } else {
        setMaterials(prev => prev.filter(m => m.id !== materialId));
      }

      const successMsg = `Material status updated to ${newStatus}.`;
      if (Platform.OS === 'web') {
        alert(successMsg);
      } else {
        Alert.alert('Success', successMsg);
      }
    } catch (error: any) {
      console.error('Error updating material status in Firestore:', error);
      const errMsg = `Failed to update status on study materials database: ${error.message || error}`;
      if (Platform.OS === 'web') {
        alert(errMsg);
      } else {
        Alert.alert('Error', errMsg);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const deleteMaterial = (materialId: string, title: string) => {
    if (processingId) return;
    const executeDelete = async () => {
      setProcessingId(materialId);
      try {
        const material = materials.find(m => m.id === materialId);
        if (material) {
          // 1. Call GAS to delete from Google Drive
          if (material.driveFileId && material.driveFileId !== 'firebase_storage') {
            try {
              const gasUrl = await AsyncStorage.getItem('@mce_study_materials_gas_url') || process.env.EXPO_PUBLIC_GAS_URL || "https://script.google.com/macros/s/AKfycbzHJPVpMJ5J-ZUe-40wFASxy3_1fB7vm2mtfSG1t_1-ijPtEpIKoj9XnPar1ICs5geI/exec";
              await fetch(gasUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                  action: "delete",
                  fileId: material.driveFileId,
                  secret: "MCE_CONNECT_ADMIN_2026"
                })
              });
            } catch (gasErr) {
              console.warn("Failed to delete from Google Drive via GAS:", gasErr);
            }
          }

          if (material.storagePath && material.storagePath !== 'cloudinary_managed') {
            try {
              const storageRef = ref(storage, material.storagePath);
              await deleteObject(storageRef);
            } catch (storageErr) {
              console.warn("Could not delete from storage, perhaps already deleted?", storageErr);
            }
          }

          const docRef = doc(db, 'study_material_submissions', materialId);
          await updateDoc(docRef, { status: 'DELETED' });

          // Send policy violation notification to the uploader if ownerUid exists
          if (material.ownerUid) {
            try {
              const userNotifRef = collection(db, 'users', material.ownerUid, 'notifications');
              const notifTitle = '⚠️ Study Material Removed';
              const notifBody = `Your shared material "${title || 'Untitled Document'}" was removed by college moderators. It is not related to study materials or violated our terms & conditions.`;

              await addDoc(userNotifRef, {
                type: 'post_policy_violation',
                title: notifTitle,
                body: notifBody,
                timestamp: new Date().toISOString(),
                read: false,
                senderUid: 'system',
                senderName: 'MCE Connect'
              });

              const profileSnap = await getDoc(doc(db, 'publicProfiles', material.ownerUid));
              if (profileSnap.exists()) {
                const profileData = profileSnap.data();
                if (profileData.pushToken) {
                  const { sendPushNotifications } = require('@/utils/notifications');
                  await sendPushNotifications([profileData.pushToken], notifTitle, notifBody, '/notifications');
                }
              }
            } catch (notifErr) {
              console.warn("Failed to send deletion notification to contributor:", notifErr);
            }
          }

          if (filterStatus === 'All' || filterStatus === 'Deleted') {
            setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, status: 'Deleted' } : m));
          } else {
            setMaterials(prev => prev.filter(m => m.id !== materialId));
          }

          if (currentUser) {
            await logAdminAction({
              adminUid: currentUser.uid,
              adminName: currentUser.name || 'Admin',
              adminEmail: currentUser.email || '',
              action: `Permanently deleted study material from Firestore`,
              targetId: materialId,
              targetType: 'StudyMaterial',
              details: `Title: ${title}`
            });
          }

          const successMsg = 'Study material moved to deleted items.';
          if (Platform.OS === 'web') {
            try {
              alert(successMsg);
            } catch (e) {
              console.log(successMsg);
            }
          } else {
            Alert.alert('Deleted', successMsg);
          }
        }
      } catch (error: any) {
        console.error('Error deleting study material:', error);
        const errMsg = 'Failed to delete: ' + (error.message || 'Unknown error');
        if (Platform.OS === 'web') {
          try {
            alert(errMsg);
          } catch (e) {
            console.error(errMsg);
          }
        } else {
          Alert.alert('Error', errMsg);
        }
      } finally {
        setProcessingId(null);
      }
    };

    if (Platform.OS === 'web') {
      try {
        const confirmed = window.confirm(
          `Delete Material?\n\nAre you sure you want to mark "${title}" as deleted?`
        );
        if (confirmed) {
          executeDelete();
        }
      } catch (confirmErr) {
        console.warn("window.confirm blocked or failed, executing delete directly:", confirmErr);
        executeDelete();
      }
    } else {
      Alert.alert(
        'Delete Material',
        `Are you sure you want to mark "${title}" as deleted?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: executeDelete }
        ]
      );
    }
  };

  const openFile = (url?: string, title?: string) => {
    if (url) {
      setActivePdfUrl(url);
      setActivePdfTitle(title || 'Document Viewer');
      setIsPdfVisible(true);
    } else {
      if (Platform.OS === 'web') {
        alert('No file URL provided.');
      } else {
        Alert.alert('Error', 'No file URL provided.');
      }
    }
  };

  const handleOpenMaterial = (item: MaterialDoc) => {
    if (item.files && item.files.length > 1) {
      setSelectedMultiFileItem(item);
    } else {
      openFile(item.fileUrl, item.title);
    }
  };

  const renderItem = ({ item }: { item: MaterialDoc }) => {
    return (
      <View style={[styles.materialCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.materialTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{item.title}</Text>
            <Text style={styles.uploaderText}>Uploaded by: {item.uploaderName || 'Unknown'}</Text>
            <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 3 }}>
              📅 Submitted: {formatDateToDisplay(item.createdAt)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: item.status === 'Approved' ? '#ECFDF5' : item.status === 'Rejected' ? '#FEF2F2' : item.status === 'Deleted' ? '#F3F4F6' : '#FFFBEB' 
          }]}>
            <Text style={[styles.statusText, { 
              color: item.status === 'Approved' ? '#10B981' : item.status === 'Rejected' ? '#EF4444' : item.status === 'Deleted' ? '#9CA3AF' : '#F59E0B' 
            }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.metaDataRow}>
          <View style={styles.metaBadge}>
            <Ionicons name="business-outline" size={14} color="#64748B" />
            <Text style={styles.metaText}>{item.branch || 'General'}</Text>
          </View>
          <View style={styles.metaBadge}>
            <Ionicons name="school-outline" size={14} color="#64748B" />
            <Text style={styles.metaText}>Sem: {item.semester || 'All'}</Text>
          </View>
          <View style={styles.metaBadge}>
            <Ionicons name="document-text-outline" size={14} color="#64748B" />
            <Text style={styles.metaText}>{item.materialType || 'PDF'}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, { borderColor: '#3B82F6', flex: 1.5 }]} 
            onPress={() => handleOpenMaterial(item)}
            disabled={processingId !== null}
          >
            <Ionicons name="open-outline" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
            <Text style={[styles.actionText, { color: '#3B82F6' }]}>View File</Text>
          </TouchableOpacity>
          
          {item.status === 'Pending' && (
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: '#10B981', flex: 1 }]} 
              onPress={() => updateMaterialStatus(item.id, 'Approved', item.title)}
              disabled={processingId !== null}
            >
              {processingId === item.id ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Text style={[styles.actionText, { color: '#10B981' }]}>Approve</Text>
              )}
            </TouchableOpacity>
          )}

          {item.status !== 'Rejected' && item.status !== 'Deleted' && (
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: '#F59E0B', flex: 1 }]} 
              onPress={() => updateMaterialStatus(item.id, 'Rejected', item.title)}
              disabled={processingId !== null}
            >
              <Text style={[styles.actionText, { color: '#F59E0B' }]}>Reject</Text>
            </TouchableOpacity>
          )}

          {item.status !== 'Deleted' && (
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: '#DC2626', flex: 1 }]} 
              onPress={() => deleteMaterial(item.id, item.title)}
              disabled={processingId !== null}
            >
              <Text style={[styles.actionText, { color: '#DC2626' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]} 
            onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          >
            <Ionicons name="arrow-back" size={20} color={isDark ? '#F8FAFC' : '#0F172A'} />
          </TouchableOpacity>
          <View style={{ marginLeft: 12, flexShrink: 1 }}>
            <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={2}>Study Materials Moderation</Text>
            <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={2}>Review user-uploaded notes, PYQs, and textbooks</Text>
          </View>
        </View>
      </View>

      <View style={[styles.filtersContainer, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: isDark ? '#F8FAFC' : '#64748B' }]}>Status:</Text>
          {['Pending', 'Approved', 'Rejected', 'Deleted', 'All'].map((status) => (
            <TouchableOpacity
              key={`status-${status}`}
              style={[
                styles.filterChip, 
                { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
                filterStatus === status && [styles.filterChipActive, { backgroundColor: isDark ? '#F8FAFC' : '#0F172A', borderColor: isDark ? '#F8FAFC' : '#0F172A' }]
              ]}
              onPress={() => setFilterStatus(status as any)}
            >
              <Text style={[
                styles.filterChipText, 
                { color: isDark ? '#94A3B8' : '#64748B' },
                filterStatus === status && [styles.filterChipTextActive, { color: isDark ? '#0F172A' : '#FFFFFF' }]
              ]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={materials}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={Platform.OS === 'web' ? undefined : () => fetchMaterials(false)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No materials found.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="small" color="#3B82F6" style={{ margin: 20 }} /> : null
          }
        />
      )}
      {isPdfVisible && (
        <PdfViewerModal
          visible={isPdfVisible}
          onClose={() => setIsPdfVisible(false)}
          url={activePdfUrl}
          title={activePdfTitle}
        />
      )}
      {selectedMultiFileItem && (
        <DetailModal
          visible={!!selectedMultiFileItem}
          title={selectedMultiFileItem.title}
          onClose={() => setSelectedMultiFileItem(null)}
        >
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F172A', marginBottom: 4 }}>
              📚 Associated Documents ({selectedMultiFileItem.files?.length || 0}):
            </Text>

            {selectedMultiFileItem.files?.map((file: any, index: number) => (
              <View 
                key={index} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: 12, 
                  backgroundColor: '#F8FAFC', 
                  borderColor: '#E2E8F0', 
                  borderWidth: 1, 
                  borderRadius: 10,
                  gap: 12
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10, overflow: 'hidden' }}>
                  <Ionicons name="document-text" size={24} color="#EF4444" style={{ flexShrink: 0 }} />
                  <Text 
                    style={{ fontSize: 13, fontWeight: '600', color: '#0F172A', flex: 1 }} 
                    numberOfLines={1} 
                    ellipsizeMode="tail"
                  >
                    {file.fileName}
                  </Text>
                </View>
                <TouchableOpacity
                  style={{ 
                    backgroundColor: '#F97316', 
                    paddingHorizontal: 12, 
                    paddingVertical: 6, 
                    borderRadius: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4
                  }}
                  onPress={() => {
                    openFile(file.directUrl || file.webViewUrl, file.fileName);
                  }}
                >
                  <Ionicons name="eye-outline" size={13} color="#FFF" />
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>Open</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </DetailModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 12,
    alignSelf: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  materialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  materialTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  uploaderText: {
    fontSize: 13,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaDataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 12,
  }
});
