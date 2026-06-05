import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Linking, Dimensions, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, limit, getDocs, startAfter, where, orderBy, doc, updateDoc, deleteDoc, addDoc, QueryDocumentSnapshot } from 'firebase/firestore';
import { db, storage } from '@/config/firebase';
import { ref, deleteObject } from 'firebase/storage';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/utils/auditLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { PdfViewerModal } from '@/components/modals/PdfViewerModal';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 15;

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
}

export default function MaterialsModerationScreen() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  
  const [materials, setMaterials] = useState<MaterialDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [filterStatus, setFilterStatus] = useState<MaterialStatus | 'All'>('Pending');

  // PDF Viewer Modal State
  const [isPdfVisible, setIsPdfVisible] = useState(false);
  const [activePdfUrl, setActivePdfUrl] = useState('');
  const [activePdfTitle, setActivePdfTitle] = useState('');

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
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
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
    try {
      const material = materials.find(m => m.id === materialId);
      const dbStatus = newStatus.toUpperCase();

      // If approving and it's a Google Drive file, call GAS to route it
      if (newStatus === 'Approved' && material?.driveFileId) {
        const gasUrl = await AsyncStorage.getItem('@mce_study_materials_gas_url') || process.env.EXPO_PUBLIC_GAS_URL || "https://script.google.com/macros/s/AKfycbzHJPVpMJ5J-ZUe-40wFASxy3_1fB7vm2mtfSG1t_1-ijPtEpIKoj9XnPar1ICs5geI/exec";
        const response = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: "route_approved",
            fileId: material.driveFileId,
            branch: material.branch,
            semester: material.semester,
            materialType: material.materialType,
            secret: "MCE_CONNECT_ADMIN_2026"
          })
        });
        const json = await response.json();
        if (!json.success) {
          throw new Error(json.error || "Failed to route in Google Drive");
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

      // If approved, send a notification to the uploader if ownerUid exists
      if (newStatus === 'Approved') {
        const material = materials.find(m => m.id === materialId);
        if (material && material.ownerUid) {
          try {
            const userNotifRef = collection(db, 'users', material.ownerUid, 'notifications');
            await addDoc(userNotifRef, {
              type: 'system',
              title: '🎉 Study Material Approved! 📚',
              body: `Congratulations! Your shared material "${title || 'Untitled Document'}" has been approved by college moderators and is now publicly live in the Library room!`,
              timestamp: new Date().toISOString(),
              read: false,
              senderUid: 'system',
              senderName: 'MCE Connect'
            });
          } catch (notifErr) {
            console.warn("Failed to send approval notification to contributor:", notifErr);
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
    } catch (error) {
      console.error('Error updating material status in Firestore:', error);
      const errMsg = 'Failed to update status on study materials database.';
      if (Platform.OS === 'web') {
        alert(errMsg);
      } else {
        Alert.alert('Error', errMsg);
      }
    }
  };

  const deleteMaterial = (materialId: string, title: string) => {
    const executeDelete = async () => {
      try {
        const material = materials.find(m => m.id === materialId);
        if (material) {
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

          setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, status: 'Deleted' } : m));

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
            alert(successMsg);
          } else {
            Alert.alert('Deleted', successMsg);
          }
        }
      } catch (error: any) {
        console.error('Error deleting study material:', error);
        const errMsg = 'Failed to delete: ' + (error.message || 'Unknown error');
        if (Platform.OS === 'web') {
          alert(errMsg);
        } else {
          Alert.alert('Error', errMsg);
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Delete Material?\n\nAre you sure you want to mark "${title}" as deleted?`
      );
      if (confirmed) {
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

  const renderItem = ({ item }: { item: MaterialDoc }) => {
    return (
      <View style={styles.materialCard}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.materialTitle}>{item.title}</Text>
            <Text style={styles.uploaderText}>Uploaded by: {item.uploaderName || 'Unknown'}</Text>
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
            onPress={() => openFile(item.fileUrl || item.webViewUrl, item.title)}
          >
            <Ionicons name="open-outline" size={16} color="#3B82F6" style={{ marginRight: 6 }} />
            <Text style={[styles.actionText, { color: '#3B82F6' }]}>View File</Text>
          </TouchableOpacity>
          
          {item.status === 'Pending' && (
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: '#10B981', flex: 1 }]} 
              onPress={() => updateMaterialStatus(item.id, 'Approved', item.title)}
            >
              <Text style={[styles.actionText, { color: '#10B981' }]}>Approve</Text>
            </TouchableOpacity>
          )}

          {item.status !== 'Rejected' && item.status !== 'Deleted' && (
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: '#F59E0B', flex: 1 }]} 
              onPress={() => updateMaterialStatus(item.id, 'Rejected', item.title)}
            >
              <Text style={[styles.actionText, { color: '#F59E0B' }]}>Reject</Text>
            </TouchableOpacity>
          )}

          {item.status !== 'Deleted' && (
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: '#DC2626', flex: 1 }]} 
              onPress={() => deleteMaterial(item.id, item.title)}
            >
              <Text style={[styles.actionText, { color: '#DC2626' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => router.replace('/notanadmin/dashboard')}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ marginLeft: 12, flexShrink: 1 }}>
            <Text style={styles.title} numberOfLines={2}>Study Materials Moderation</Text>
            <Text style={styles.subtitle} numberOfLines={2}>Review user-uploaded notes, PYQs, and textbooks</Text>
          </View>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Text style={styles.filterLabel}>Status:</Text>
          {['Pending', 'Approved', 'Rejected', 'Deleted', 'All'].map((status) => (
            <TouchableOpacity
              key={`status-${status}`}
              style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
              onPress={() => setFilterStatus(status as any)}
            >
              <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
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
          data={materials}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={() => fetchMaterials(false)}
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
      <PdfViewerModal
        visible={isPdfVisible}
        onClose={() => setIsPdfVisible(false)}
        url={activePdfUrl}
        title={activePdfTitle}
      />
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
