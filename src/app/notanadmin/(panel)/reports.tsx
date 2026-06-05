import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, limit, getDocs, startAfter, where, orderBy, doc, updateDoc, deleteDoc, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/utils/auditLogger';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 15;

type ReportStatus = 'pending' | 'resolved' | 'dismissed';
type ReportType = 'post' | 'comment' | 'user' | 'material';

interface ReportDoc {
  id: string;
  type: ReportType;
  targetId: string;
  targetPreview?: string;
  reportedByCount: number;
  lastReportReason?: string;
  status: ReportStatus;
  createdAt?: any;
}

export default function ReportsModerationScreen() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  
  const [reports, setReports] = useState<ReportDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'All'>('pending');
  const [filterType, setFilterType] = useState<ReportType | 'All'>('All');

  useEffect(() => {
    fetchReports(true);
  }, [filterStatus, filterType]);

  const fetchReports = async (isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
      setHasMore(true);
    } else {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }

    try {
      let q = collection(db, 'reports');
      let constraints: any[] = [];

      if (filterStatus !== 'All') {
        constraints.push(where('status', '==', filterStatus));
      }
      if (filterType !== 'All') {
        constraints.push(where('type', '==', filterType));
      }

      constraints.push(orderBy('createdAt', 'desc'));
      constraints.push(limit(PAGE_SIZE));

      if (!isRefresh && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const finalQuery = query(q, ...constraints);
      const snapshot = await getDocs(finalQuery);

      const newReports = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReportDoc));

      if (isRefresh) {
        setReports(newReports);
      } else {
        setReports(prev => [...prev, ...newReports]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

    } catch (error) {
      console.error('Error fetching reports:', error);
      if (isRefresh) setReports([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const dismissReport = async (reportId: string, targetId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'dismissed' });
      setReports(prev => prev.filter(r => r.id !== reportId));
      
      if (currentUser) {
        await logAdminAction({
          adminUid: currentUser.uid,
          adminName: currentUser.name || 'Admin',
          adminEmail: currentUser.email || '',
          action: 'Dismissed Report',
          targetId: reportId,
          targetType: 'Report',
          details: `Target Content ID: ${targetId}`
        });
      }
      
      Alert.alert('Success', 'Report has been dismissed.');
    } catch (error) {
      console.error('Error dismissing report:', error);
      Alert.alert('Error', 'Failed to dismiss report');
    }
  };

  const deleteTargetContent = async (reportId: string, type: ReportType, targetId: string) => {
    Alert.alert(
      'Delete Content & Resolve',
      `Are you sure you want to permanently delete this ${type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              // Delete the actual content based on type
              let collectionName = 'posts';
              if (type === 'comment') collectionName = 'reportedComments'; // Comments are nested, but this is a rough implementation
              if (type === 'user') collectionName = 'users';
              if (type === 'material') collectionName = 'study_materials';

              await deleteDoc(doc(db, collectionName, targetId));
              
              // Mark report as resolved
              await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
              setReports(prev => prev.filter(r => r.id !== reportId));
              
              if (currentUser) {
                await logAdminAction({
                  adminUid: currentUser.uid,
                  adminName: currentUser.name || 'Admin',
                  adminEmail: currentUser.email || '',
                  action: `Deleted ${type} (Resolved Report)`,
                  targetId: targetId,
                  targetType: type.charAt(0).toUpperCase() + type.slice(1),
                  details: `Report ID: ${reportId}`
                });
              }
              
              Alert.alert('Success', `${type.charAt(0).toUpperCase() + type.slice(1)} deleted and report resolved.`);
            } catch (error) {
              console.error('Error deleting content:', error);
              Alert.alert('Error', 'Failed to delete content and resolve report');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: ReportDoc }) => {
    return (
      <View style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <View style={styles.typeBadgeContainer}>
            <View style={[styles.badge, { backgroundColor: '#F1F5F9' }]}>
              <Text style={[styles.badgeText, { color: '#475569', textTransform: 'capitalize' }]}>{item.type}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#FEF2F2', marginLeft: 8 }]}>
              <Text style={[styles.badgeText, { color: '#EF4444' }]}>{item.reportedByCount} Reports</Text>
            </View>
          </View>
          <Text style={styles.dateText}>
            {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Recent'}
          </Text>
        </View>

        <View style={styles.reportBody}>
          <Text style={styles.targetLabel}>Target ID: {item.targetId}</Text>
          {item.targetPreview ? (
            <Text style={styles.targetPreview} numberOfLines={3}>"{item.targetPreview}"</Text>
          ) : (
            <Text style={[styles.targetPreview, { fontStyle: 'italic', color: '#94A3B8' }]}>No preview available</Text>
          )}
          
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonLabel}>Latest Reason:</Text>
            <Text style={styles.reasonText}>{item.lastReportReason || 'Violation of community guidelines'}</Text>
          </View>
        </View>

        {item.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: '#64748B' }]} 
              onPress={() => dismissReport(item.id, item.targetId)}
            >
              <Text style={[styles.actionText, { color: '#64748B' }]}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: '#DC2626' }]} 
              onPress={() => deleteTargetContent(item.id, item.type, item.targetId)}
            >
              <Text style={[styles.actionText, { color: '#DC2626' }]}>Delete Content</Text>
            </TouchableOpacity>
          </View>
        )}
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
            <Text style={styles.title} numberOfLines={2}>Reported Content</Text>
            <Text style={styles.subtitle} numberOfLines={2}>Review and take action on community reports</Text>
          </View>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Text style={styles.filterLabel}>Status:</Text>
          {['pending', 'resolved', 'dismissed', 'All'].map((status) => (
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterRow, { marginTop: 12 }]}>
          <Text style={styles.filterLabel}>Type:</Text>
          {['All', 'post', 'comment', 'user', 'material'].map((type) => (
            <TouchableOpacity
              key={`type-${type}`}
              style={[styles.filterChip, filterType === type && styles.filterChipActive]}
              onPress={() => setFilterType(type as any)}
            >
              <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={() => fetchReports(false)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
              <Text style={styles.emptyText}>All clear! No reports found.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="small" color="#3B82F6" style={{ margin: 20 }} /> : null
          }
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
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadgeContainer: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  reportBody: {
    marginBottom: 16,
  },
  targetLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  targetPreview: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#CBD5E1',
  },
  reasonContainer: {
    marginTop: 12,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  reasonText: {
    fontSize: 13,
    color: '#0F172A',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
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
