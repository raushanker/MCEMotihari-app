import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Dimensions, ScrollView, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, limit, getDocs, startAfter, where, orderBy, doc, updateDoc, deleteDoc, QueryDocumentSnapshot, getDoc, setDoc, collectionGroup, documentId } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/utils/auditLogger';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';


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
  allReportIds?: string[];
  allReasons?: string[];
  postId?: string;
}

export default function ReportsModerationScreen() {
  const theme = useThemeColors();
  const { isDark } = theme;
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

      // We will fetch up to 200 matching documents and sort and group them locally.
      constraints.push(limit(200));

      const finalQuery = query(q, ...constraints);
      const snapshot = await getDocs(finalQuery);

      let newReports = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReportDoc));
      
      // Sort locally descending by createdAt
      newReports.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      // Group reports by targetId and type to avoid duplicate cards
      const groupedMap: { [key: string]: ReportDoc } = {};

      newReports.forEach(r => {
        const key = `${r.targetId}_${r.type}`;
        if (!groupedMap[key]) {
          groupedMap[key] = {
            ...r,
            reportedByCount: 1, // Start with 1 matching report document
            allReportIds: [r.id],
            allReasons: r.lastReportReason ? [r.lastReportReason] : [],
          };
        } else {
          const group = groupedMap[key];
          group.allReportIds = group.allReportIds || [];
          group.allReasons = group.allReasons || [];
          
          group.allReportIds.push(r.id);
          group.reportedByCount += 1;
          
          if (r.lastReportReason && !group.allReasons.includes(r.lastReportReason)) {
            group.allReasons.push(r.lastReportReason);
          }
        }
      });

      const groupedList = Object.values(groupedMap);

      setReports(groupedList);
      setHasMore(false); // Disable infinite scroll since we fetched all recent relevant docs

    } catch (error) {
      console.error('Error fetching reports:', error);
      if (isRefresh) setReports([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const dismissReport = async (allReportIds: string[], targetId: string) => {
    try {
      await Promise.all(allReportIds.map(id => updateDoc(doc(db, 'reports', id), { status: 'dismissed' })));
      setReports(prev => prev.filter(r => !allReportIds.includes(r.id)));
      
      if (currentUser) {
        await logAdminAction({
          adminUid: currentUser.uid,
          adminName: currentUser.name || 'Admin',
          adminEmail: currentUser.email || '',
          action: 'Dismissed Reports',
          targetId: targetId,
          targetType: 'Report',
          details: `Dismissed report IDs: ${allReportIds.join(', ')}`
        });
      }
      
      Alert.alert('Success', 'Reports have been dismissed.');
    } catch (error) {
      console.error('Error dismissing reports:', error);
      Alert.alert('Error', 'Failed to dismiss reports');
    }
  };

  const deleteTargetContent = async (allReportIds: string[], type: string, targetId: string, postId?: string) => {
    const executeDelete = async () => {
      try {
        let docRef = null;
        let authorUid = null;
        let contentTitle = '';
        const typeLower = type.toLowerCase();

        if (typeLower === 'post') {
          const postSnap = await getDoc(doc(db, 'posts', targetId));
          if (postSnap.exists()) {
            docRef = doc(db, 'posts', targetId);
            authorUid = postSnap.data().authorUid;
            contentTitle = postSnap.data().title || postSnap.data().text || 'Untitled Post';
          } else {
            docRef = doc(db, 'posts', targetId);
          }
        } else if (typeLower === 'comment') {
          if (postId) {
            const commentDocRef = doc(db, 'posts', postId, 'comments', targetId);
            const commentSnap = await getDoc(commentDocRef);
            if (commentSnap.exists()) {
              docRef = commentDocRef;
              authorUid = commentSnap.data().userId;
              contentTitle = commentSnap.data().text || 'Comment';
            } else {
              docRef = commentDocRef;
            }
          } else {
            throw new Error('Missing parent postId to locate the reported comment.');
          }
        } else if (typeLower === 'user') {
          docRef = doc(db, 'users', targetId);
        } else if (typeLower === 'material') {
          const matSnap = await getDoc(doc(db, 'study_materials', targetId));
          if (matSnap.exists()) {
            docRef = doc(db, 'study_materials', targetId);
            authorUid = matSnap.data().uploadedBy;
            contentTitle = matSnap.data().title || 'Untitled Material';
          }
        }

        if (docRef) {
          await deleteDoc(docRef);
          
          // Send Notification to the author
          if (authorUid) {
            const notifRef = doc(collection(db, 'users', authorUid, 'notifications'));
            
            let notifTitle = '⚠️ Content Removed';
            let notifBody = `Your ${typeLower} has been removed by the administrator.`;
            
            const truncatedTitle = contentTitle.substring(0, 40) + (contentTitle.length > 40 ? '...' : '');

            if (typeLower === 'post') {
              notifTitle = '⚠️ Post Removed: Policy Violation';
              notifBody = `Your post "${truncatedTitle}" was removed by the administrator due to a violation of our Privacy Policy or community post guidelines.`;
            } else if (typeLower === 'comment') {
              notifTitle = '⚠️ Comment Removed: Policy Violation';
              notifBody = `Your comment "${truncatedTitle}" was removed by the administrator due to a violation of our Privacy Policy or community post guidelines.`;
            } else if (typeLower === 'material') {
              notifTitle = '⚠️ Material Removed: Guidelines Violation';
              notifBody = `Your uploaded study material "${truncatedTitle}" was removed by the administrator due to a violation of community guidelines.`;
            }

            await setDoc(notifRef, {
              type: 'post_policy_violation',
              title: notifTitle,
              body: notifBody,
              timestamp: new Date().toISOString(),
              read: false
            });
          }
        }
        
        // Mark all associated reports as resolved
        await Promise.all(allReportIds.map(id => updateDoc(doc(db, 'reports', id), { status: 'resolved' })));
        
        // Filter out all reports belonging to these IDs locally
        setReports(prev => prev.filter(r => !allReportIds.includes(r.id)));
        
        if (currentUser) {
          await logAdminAction({
            adminUid: currentUser.uid,
            adminName: currentUser.name || 'Admin',
            adminEmail: currentUser.email || '',
            action: `Deleted ${type} (Resolved Reports)`,
            targetId: targetId,
            targetType: type.charAt(0).toUpperCase() + type.slice(1),
            details: `Resolved report IDs: ${allReportIds.join(', ')}`
          });
        }
        
        if (Platform.OS === 'web') {
          window.alert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted and associated reports resolved.`);
        } else {
          Alert.alert('Success', `${type.charAt(0).toUpperCase() + type.slice(1)} deleted and associated reports resolved.`);
        }
      } catch (error: any) {
        console.error('Error deleting content:', error);
        const errMsg = error?.message || error?.toString() || 'Unknown error';
        if (Platform.OS === 'web') {
          window.alert('Failed to delete content: ' + errMsg);
        } else {
          Alert.alert('Error', 'Failed to delete content: ' + errMsg);
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirm = window.confirm(`Are you sure you want to permanently delete this ${type}? This action cannot be undone.`);
      if (confirm) {
        await executeDelete();
      }
    } else {
      Alert.alert(
        'Delete Content & Resolve',
        `Are you sure you want to permanently delete this ${type}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive', 
            onPress: executeDelete
          }
        ]
      );
    }
  };

  const viewReportTarget = async (item: ReportDoc) => {
    if (item.type === 'post') {
      router.push({ pathname: '/post/[id]', params: { id: item.targetId, fromAdmin: 'reports' } as any });
    } else if (item.type === 'comment') {
      const postId = item.postId;
      if (postId) {
        router.push({ pathname: '/post/[id]', params: { id: postId, fromAdmin: 'reports' } as any });
      } else {
        Alert.alert('Not Found', 'Could not locate the parent post for this comment.');
      }
    } else if (item.type === 'material') {
      try {
        const docSnap = await getDoc(doc(db, 'study_materials', item.targetId));
        if (docSnap.exists() && docSnap.data().fileUrl) {
          Linking.openURL(docSnap.data().fileUrl).catch(() => {
            Alert.alert('Error', 'Could not open the document URL.');
          });
        } else {
          Alert.alert('Not Found', 'Could not locate the document URL.');
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to retrieve study material details.');
      }
    } else {
      Alert.alert('Info', `Viewing for ${item.type} is not supported directly. Target ID is ${item.targetId}`);
    }
  };

  const renderItem = ({ item }: { item: ReportDoc }) => {
    const allReportIds = item.allReportIds || [item.id];
    const reasonsToDisplay = item.allReasons && item.allReasons.length > 0
      ? item.allReasons.join(', ')
      : (item.lastReportReason || 'Violation of community guidelines');

    return (
      <View style={[styles.reportCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <View style={styles.reportHeader}>
          <View style={styles.typeBadgeContainer}>
            <View style={[styles.badge, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <Text style={[styles.badgeText, { color: isDark ? '#CBD5E1' : '#475569', textTransform: 'capitalize' }]}>{item.type}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEF2F2', marginLeft: 8 }]}>
              <Text style={[styles.badgeText, { color: '#EF4444' }]}>{item.reportedByCount} Reports</Text>
            </View>
          </View>
          <Text style={styles.dateText}>
            {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Recent'}
          </Text>
        </View>

        <View style={styles.reportBody}>
          <Text style={[styles.targetLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Target ID: {item.targetId}</Text>
          {item.targetPreview ? (
            <Text style={[styles.targetPreview, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={3}>"{item.targetPreview}"</Text>
          ) : (
            <Text style={[styles.targetPreview, { fontStyle: 'italic', color: isDark ? '#64748B' : '#94A3B8' }]}>No preview available</Text>
          )}
          
          <View style={[styles.reasonContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
            <Text style={[styles.reasonLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Reasons:</Text>
            <Text style={[styles.reasonText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{reasonsToDisplay}</Text>
          </View>
        </View>

        {item.status === 'pending' && (
          <View style={styles.actions}>
            {(item.type === 'post' || item.type === 'comment' || item.type === 'material') && (
              <TouchableOpacity 
                style={[styles.actionBtn, { borderColor: '#3B82F6' }]} 
                onPress={() => viewReportTarget(item)}
              >
                <Text style={[styles.actionText, { color: '#3B82F6' }]}>View</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: '#64748B' }]} 
              onPress={() => dismissReport(allReportIds, item.targetId)}
            >
              <Text style={[styles.actionText, { color: '#64748B' }]}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, { borderColor: '#DC2626' }]} 
              onPress={() => deleteTargetContent(allReportIds, item.type, item.targetId, item.postId)}
            >
              <Text style={[styles.actionText, { color: '#DC2626' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      <View style={[styles.header, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={isDark ? '#F8FAFC' : '#0F172A'} />
          </TouchableOpacity>
          <View style={{ marginLeft: 12, flexShrink: 1 }}>
            <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]} numberOfLines={2}>Reported Content</Text>
            <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={2}>Review and take action on community reports</Text>
          </View>
        </View>
      </View>

      <View style={[styles.filtersContainer, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: isDark ? '#F8FAFC' : '#64748B' }]}>Status:</Text>
          {['pending', 'resolved', 'dismissed', 'All'].map((status) => (
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterRow, { marginTop: 12 }]}>
          <Text style={[styles.filterLabel, { color: isDark ? '#F8FAFC' : '#64748B' }]}>Type:</Text>
          {['All', 'post', 'comment', 'user', 'material'].map((type) => (
            <TouchableOpacity
              key={`type-${type}`}
              style={[
                styles.filterChip, 
                { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
                filterType === type && [styles.filterChipActive, { backgroundColor: isDark ? '#F8FAFC' : '#0F172A', borderColor: isDark ? '#F8FAFC' : '#0F172A' }]
              ]}
              onPress={() => setFilterType(type as any)}
            >
              <Text style={[
                styles.filterChipText, 
                { color: isDark ? '#94A3B8' : '#64748B' },
                filterType === type && [styles.filterChipTextActive, { color: isDark ? '#0F172A' : '#FFFFFF' }]
              ]}>
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
          style={{ flex: 1 }}
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={Platform.OS === 'web' ? undefined : () => fetchReports(false)}
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
