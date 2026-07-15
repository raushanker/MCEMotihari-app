import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';


interface DeletionRequest {
  id: string; // same as uid
  uid: string;
  email: string;
  name: string;
  username: string;
  role: string;
  reason: string;
  status: string;
  timestamp: any;
}

export default function DeletionRequestsScreen() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<'approve' | 'reject' | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'deletion_requests'),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeletionRequest));
      // Sort in memory since Firestore requires composite index for where + orderBy
      data.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
      setRequests(data);
    } catch (error) {
      console.error('Error fetching deletion requests:', error);
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleProcess = (request: DeletionRequest, action: 'approve' | 'reject') => {
    if (!user) return;
    setConfirmingId(request.id);
    setConfirmingAction(action);
  };

  const executeAction = async (request: DeletionRequest, action: 'approve' | 'reject') => {
    if (!user) return;
    setConfirmingId(null);
    setConfirmingAction(null);
    setProcessingId(request.id);
    
    try {
      if (action === 'approve') {
        // 1. Delete Public Profile
        await deleteDoc(doc(db, 'publicProfiles', request.uid));
        // 2. Delete Private Profile
        await deleteDoc(doc(db, 'privateUsers', request.uid));
        
        // 3. Delete Username and Email Lookups
        if (request.username) {
          await deleteDoc(doc(db, 'usernames', request.username.toLowerCase()));
          await deleteDoc(doc(db, 'emailLookup', request.username.toLowerCase()));
        }
        if (request.email) {
          await deleteDoc(doc(db, 'emailLookup', request.email.toLowerCase()));
        }
      }

      // Update request status
      await updateDoc(doc(db, 'deletion_requests', request.id), {
        status: action === 'approve' ? 'processed' : 'rejected',
        processedAt: serverTimestamp(),
        processedBy: user.uid
      });

      // Log action
      const logRef = doc(collection(db, 'admin_logs'));
      await setDoc(logRef, {
        adminUid: user.uid,
        action: action === 'approve' ? 'Approved Account Deletion' : 'Rejected Account Deletion',
        targetId: request.uid,
        targetType: 'UserAccount',
        reason: request.reason || 'No reason provided by user',
        timestamp: serverTimestamp()
      });

      if (Platform.OS === 'web') {
        window.alert(`Success: Request ${action === 'approve' ? 'approved and data purged' : 'rejected'}.`);
      } else {
        Alert.alert('Success', `Request ${action === 'approve' ? 'approved and data purged' : 'rejected'}.`);
      }
      setRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error: any) {
      console.error(`Error processing deletion:`, error);
      if (Platform.OS === 'web') {
        window.alert(`Error: Failed to ${action} request. ${error?.message || ''}`);
      } else {
        Alert.alert('Error', `Failed to ${action} request. ${error?.message || ''}`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const renderItem = ({ item }: { item: DeletionRequest }) => {
    const isProcessing = processingId === item.id;
    const isConfirming = confirmingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userMeta}>@{item.username} • {item.role}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text style={styles.timeText}>
              {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString() : 'Just now'}
            </Text>
          </View>
        </View>

        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>Reason for leaving:</Text>
          <Text style={styles.reasonText}>{item.reason || 'No reason provided.'}</Text>
        </View>

        {isConfirming ? (
          <View style={[styles.actionRow, { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, flexDirection: 'column' }]}>
            <Text style={{ color: '#991B1B', fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
              {confirmingAction === 'approve' ? `Permanently purge ${item.name}'s data?` : `Reject this request?`}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: '#94A3B8', paddingHorizontal: 20 }]}
                onPress={() => { setConfirmingId(null); setConfirmingAction(null); }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btn, confirmingAction === 'approve' ? styles.approveBtn : styles.rejectBtn, { paddingHorizontal: 20 }]}
                onPress={() => executeAction(item, confirmingAction!)}
              >
                <Text style={{ color: confirmingAction === 'approve' ? 'white' : '#64748B', fontWeight: 'bold' }}>Yes, {confirmingAction === 'approve' ? 'Purge' : 'Reject'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.btn, styles.rejectBtn]}
              disabled={isProcessing}
              onPress={() => handleProcess(item, 'reject')}
            >
              <Ionicons name="close-circle-outline" size={18} color="#64748B" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btn, styles.approveBtn]}
              disabled={isProcessing}
              onPress={() => handleProcess(item, 'approve')}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.approveBtnText}>Purge Data</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.headerTitleRow, { flexShrink: 1, marginRight: 12 }]}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => router.replace('/notanadmin/dashboard')}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ marginLeft: 12, flexShrink: 1 }}>
            <Text style={styles.pageTitle} numberOfLines={2}>Deletion Requests</Text>
            <Text style={styles.subtitle} numberOfLines={2}>Review and process user account deletion requests.</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchRequests} disabled={loading}>
          <Ionicons name="refresh" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#10B981" />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>There are no pending deletion requests.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
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
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: Platform.OS === 'web' ? '0 2px 4px rgba(0,0,0,0.05)' : undefined,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  listContent: {
    padding: 24,
    paddingTop: 8,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: Platform.OS === 'web' ? '0 2px 8px rgba(0,0,0,0.04)' : undefined,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  userMeta: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
    fontWeight: '500',
  },
  reasonContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  reasonText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  rejectBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  approveBtn: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
