import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['posts', 'reports', 'deletions', 'users', 'materials', 'admins', 'broadcast'],
  MODERATOR: ['posts', 'reports'],
  LIBRARY_ADMIN: ['materials'],
  NOTIFICATION_ADMIN: ['broadcast'],
};

export default function AdminDashboard() {
  const { isDark } = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasNewMaterials, setHasNewMaterials] = useState(false);
  const [hasNewReports, setHasNewReports] = useState(false);

  useEffect(() => {
    loadCachedStats();
    checkNewSubmissions();
  }, []);

  const loadCachedStats = async () => {
    try {
      const cached = await AsyncStorage.getItem('@mce_admin_stats');
      let shouldSync = true;
      if (cached) {
        const parsed = JSON.parse(cached);
        setStats(parsed);
        // Cost optimization: Only auto-sync if older than 24 hours (86400000 ms)
        if (parsed.lastSyncedAt && Date.now() - parsed.lastSyncedAt < 86400000) {
          shouldSync = false;
        }
      }
      if (shouldSync) {
        handleRefreshStats();
      }
    } catch (e) {
      console.warn('Failed to load cached admin stats:', e);
    }
  };

  const checkNewSubmissions = async () => {
    try {
      const matLastOpenedStr = await AsyncStorage.getItem('@mce_materials_last_opened');
      const repLastOpenedStr = await AsyncStorage.getItem('@mce_reports_last_opened');

      const matLastOpened = matLastOpenedStr ? Number(matLastOpenedStr) : 0;
      const repLastOpened = repLastOpenedStr ? Number(repLastOpenedStr) : 0;

      // 1. Check Study Materials (using count for efficiency)
      const matQuery = query(
        collection(db, 'study_material_submissions'),
        where('status', '==', 'PENDING')
      );
      const matSnap = await getCountFromServer(matQuery);
      setHasNewMaterials(matSnap.data().count > 0);

      // 2. Check Reports (using count for efficiency)
      const repQuery = query(
        collection(db, 'reports'),
        where('status', '==', 'pending')
      );
      const repSnap = await getCountFromServer(repQuery);
      setHasNewReports(repSnap.data().count > 0);
    } catch (e) {
      console.warn("Failed to check new admin notifications:", e);
    }
  };

  const handleRefreshStats = async () => {
    setRefreshing(true);
    try {
      const usersQuery = collection(db, 'publicProfiles');
      const postsQuery = collection(db, 'posts');
      const reportsQuery = collection(db, 'reports');
      const deletionsQuery = collection(db, 'deletion_requests');

      const [usersSnap, postsSnap, reportsSnap, deletionsSnap] = await Promise.all([
        getCountFromServer(usersQuery),
        getCountFromServer(postsQuery),
        getCountFromServer(reportsQuery),
        getCountFromServer(deletionsQuery),
      ]);

      const freshStats = {
        usersCount: usersSnap.data().count,
        postsCount: postsSnap.data().count,
        reportsCount: reportsSnap.data().count,
        deletionsCount: deletionsSnap.data().count,
        lastUpdated: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: 'numeric' }) + ', ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        lastSyncedAt: Date.now(),
      };

      setStats(freshStats);
      await AsyncStorage.setItem('@mce_admin_stats', JSON.stringify(freshStats));
      await checkNewSubmissions();
    } catch (error) {
      console.warn('Failed to sync admin stats:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getRole = () => {
    if (!user) return '';
    const masterAdminUid = process.env.EXPO_PUBLIC_ADMIN_UID || 'Zdxi8kTc2kcs1cOPxWS81PTVmco2';
    if (user.uid === masterAdminUid || user.uid === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2') {
      return 'SUPER_ADMIN';
    }
    return user.adminRole || '';
  };

  const role = getRole();
  const allowedKeys = ROLE_PERMISSIONS[role] || [];

  const MENU_ITEMS = [
    { id: 'broadcast', label: 'Broadcast Alert', description: 'Send announcements to all users', icon: 'megaphone', route: '/notanadmin/broadcast', color: '#EA580C' },
    { id: 'posts', label: 'All Posts', description: 'Moderate all user posts', icon: 'newspaper', route: '/notanadmin/posts', color: '#3B82F6' },
    { id: 'reports', label: 'Reported Content', description: 'Review reported posts/comments', icon: 'warning', route: '/notanadmin/reports', color: '#EF4444' },
    { id: 'deletions', label: 'Deletion Requests', description: 'Process account purge requests', icon: 'trash-bin', route: '/notanadmin/deletions', color: '#F43F5E' },
    { id: 'users', label: 'User Directory', description: 'Manage students and alumni', icon: 'people', route: '/notanadmin/users', color: '#10B981' },
    { id: 'materials', label: 'Study Materials', description: 'Approve or reject notes', icon: 'book', route: '/notanadmin/materials', color: '#F97316' },
    { id: 'admins', label: 'Admin Roles', description: 'Assign roles to users', icon: 'shield-half', route: '/notanadmin/admins', color: '#8B5CF6' },
  ].filter(item => allowedKeys.includes(item.id));

  return (
    <ScrollView style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Manage your digital campus</Text>
          </View>
          <TouchableOpacity 
            style={[styles.refreshBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]} 
            onPress={handleRefreshStats}
            disabled={refreshing}
            activeOpacity={0.7}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#D95A1D" />
            ) : (
              <>
                <Ionicons name="sync" size={16} color={isDark ? '#F8FAFC' : '#0F172A'} />
                <Text style={[styles.refreshText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>Sync</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="people" size={20} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Total Users</Text>
              <Text style={[styles.statValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{stats?.usersCount ?? '...'}</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Ionicons name="newspaper" size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Discussions</Text>
              <Text style={[styles.statValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{stats?.postsCount ?? '...'}</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="warning" size={20} color="#EF4444" />
            </View>
            <View>
              <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Reports</Text>
              <Text style={[styles.statValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{stats?.reportsCount ?? '...'}</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}>
              <Ionicons name="trash" size={20} color="#F43F5E" />
            </View>
            <View>
              <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Deletions</Text>
              <Text style={[styles.statValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{stats?.deletionsCount ?? '...'}</Text>
            </View>
          </View>
        </View>
      <View style={styles.menuGrid}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={[styles.menuCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
            onPress={async () => {
              if (item.id === 'materials') {
                await AsyncStorage.setItem('@mce_materials_last_opened', String(Date.now()));
                setHasNewMaterials(false);
              }
              if (item.id === 'reports') {
                await AsyncStorage.setItem('@mce_reports_last_opened', String(Date.now()));
                setHasNewReports(false);
              }
              router.push(item.route as any);
            }}
          >
            <View style={[styles.iconContainer, { backgroundColor: isDark ? `${item.color}20` : `${item.color}15` }]}>
              <Ionicons name={item.icon as any} size={32} color={item.color} />
              {((item.id === 'materials' && hasNewMaterials) || (item.id === 'reports' && hasNewReports)) && (
                <View style={[styles.redDotBadge, { borderColor: isDark ? '#1E293B' : '#FFFFFF' }]} />
              )}
            </View>
            <View style={styles.menuInfo}>
              <Text style={[styles.menuTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>{item.label}</Text>
              <Text style={[styles.menuDesc, { color: isDark ? '#94A3B8' : '#64748B' }]}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        ))}

        {MENU_ITEMS.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <Ionicons name="lock-closed-outline" size={48} color={isDark ? '#475569' : '#94A3B8'} />
            <Text style={[styles.emptyText, { color: isDark ? '#94A3B8' : '#64748B' }]}>No tools assigned to your role yet.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  refreshBtnDisabled: {
    opacity: 0.6,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  menuGrid: {
    gap: 16,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: Platform.OS === 'web' ? '0px 2px 8px rgba(0,0,0,0.04)' : undefined,
    elevation: 2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  menuDesc: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  redDotBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
