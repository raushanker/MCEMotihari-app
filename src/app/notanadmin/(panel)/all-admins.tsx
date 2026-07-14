import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, where, doc, getDoc, deleteField, arrayRemove, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/utils/auditLogger';

interface CombinedAdmin {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  adminType: 'Super Admin' | 'Moderator' | 'Library Admin' | 'Faculty Admin' | 'Notification Admin' | string;
  depts?: string[];
  isVerified?: boolean;
}

const DEPT_OPTIONS = [
  { id: 'cse',       label: 'CSE' },
  { id: 'cse_ai',    label: 'CSE (AI)' },
  { id: 'civil',     label: 'Civil' },
  { id: 'civil_ca',  label: 'Civil (CA)' },
  { id: 'eee',       label: 'EEE' },
  { id: 'mechanical',label: 'Mechanical' },
  { id: 'humanities',label: 'Humanities' },
];

export default function AllAdminsScreen() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [admins, setAdmins] = useState<CombinedAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllAdmins();
  }, []);

  const fetchAllAdmins = async () => {
    setLoading(true);
    try {
      const combined: Record<string, CombinedAdmin> = {};

      // 1. Fetch Platform Admins
      const platformQ = query(collection(db, 'publicProfiles'), where('adminRole', 'in', ['SUPER_ADMIN', 'MODERATOR', 'LIBRARY_ADMIN', 'NOTIFICATION_ADMIN']));
      const platformSnap = await getDocs(platformQ);
      for (const d of platformSnap.docs) {
        const data = d.data();
        let email = 'unknown@email.com';
        try {
          const pDoc = await getDoc(doc(db, 'privateUsers', d.id));
          if (pDoc.exists() && pDoc.data().email) email = pDoc.data().email;
        } catch {}
        
        let typeStr = data.adminRole;
        if (data.adminRole === 'SUPER_ADMIN') typeStr = 'Super Admin';
        if (data.adminRole === 'LIBRARY_ADMIN') typeStr = 'Library Admin';
        if (data.adminRole === 'MODERATOR') typeStr = 'Moderator';
        if (data.adminRole === 'NOTIFICATION_ADMIN') typeStr = 'Notification Admin';

        combined[d.id] = {
          id: d.id,
          name: data.name || 'Unknown',
          email,
          photoUrl: data.photoUrl || data.profilePic || '',
          adminType: typeStr,
          isVerified: data.isVerified || false
        };
      }

      // Explicitly check for Master Admin
      const masterAdminUid = process.env.EXPO_PUBLIC_ADMIN_UID || 'Zdxi8kTc2kcs1cOPxWS81PTVmco2';
      if (!combined[masterAdminUid]) {
        try {
          const [pub, priv] = await Promise.all([
            getDoc(doc(db, 'publicProfiles', masterAdminUid)),
            getDoc(doc(db, 'privateUsers', masterAdminUid))
          ]);
          combined[masterAdminUid] = {
            id: masterAdminUid,
            name: pub.exists() ? pub.data().name || 'Master Admin' : 'Master Admin',
            email: (priv.exists() && priv.data().email) ? priv.data().email : 'admin@mcemotihari.ac.in',
            photoUrl: pub.exists() ? pub.data().photoUrl || pub.data().profilePic || '' : '',
            adminType: 'Super Admin',
            isVerified: pub.exists() ? pub.data().isVerified : true,
          };
        } catch {}
      }

      // 2. Fetch Dept Faculty Admins
      const deptQ = query(collection(db, 'publicProfiles'), where('deptFacultyAdminRoles', '!=', null));
      const deptSnap = await getDocs(deptQ);
      for (const d of deptSnap.docs) {
        const data = d.data();
        const depts = data.deptFacultyAdminRoles || [];
        if (depts.length === 0) continue;

        if (combined[d.id]) {
          // If already a platform admin, append the dept info
          combined[d.id].depts = depts;
        } else {
          let email = 'unknown@email.com';
          try {
            const pDoc = await getDoc(doc(db, 'privateUsers', d.id));
            if (pDoc.exists() && pDoc.data().email) email = pDoc.data().email;
          } catch {}
          combined[d.id] = {
            id: d.id,
            name: data.name || 'Unknown',
            email,
            photoUrl: data.photoUrl || data.profilePic || '',
            adminType: 'Faculty Admin',
            depts,
            isVerified: data.isVerified || false
          };
        }
      }

      setAdmins(Object.values(combined));
    } catch (e) {
      console.warn('fetchAllAdmins error', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAdmins = admins.filter(admin => 
    admin.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/notanadmin/admins')}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flexShrink: 1 }}>
          <Text style={styles.title} numberOfLines={2}>All Admins</Text>
          <Text style={styles.subtitle} numberOfLines={2}>View all Super Admins & Faculty Admins</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredAdmins}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No admins found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.adminCard}>
              <Image source={{ uri: item.photoUrl || 'https://via.placeholder.com/150' }} style={styles.avatar} />
              <View style={styles.info}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.adminType === 'Super Admin' && (
                    <Ionicons name="checkmark-circle" size={16} color="#3B82F6" style={{ marginLeft: 4 }} />
                  )}
                </View>
                <Text style={styles.email}>{item.email}</Text>
                
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  <View style={[styles.roleBadge, item.adminType === 'Super Admin' && { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}>
                    <Text style={[styles.roleText, item.adminType === 'Super Admin' && { color: '#B91C1C' }]}>{item.adminType}</Text>
                  </View>
                  
                  {item.depts && item.depts.length > 0 && (
                    <View style={[styles.roleBadge, { backgroundColor: '#FEF9C3', borderColor: '#EAB308' }]}>
                      <Text style={[styles.roleText, { color: '#CA8A04' }]}>Faculty Notice Board</Text>
                    </View>
                  )}
                </View>
                
                {item.depts && item.depts.length > 0 && (
                  <View style={styles.deptList}>
                    {item.depts.map(deptId => (
                      <View key={deptId} style={styles.deptChip}>
                        <Text style={styles.deptChipText}>
                          {DEPT_OPTIONS.find(d => d.id === deptId)?.label ?? deptId}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0' 
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
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginBottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
  },
  
  adminCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E2E8F0' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  email: { fontSize: 14, color: '#64748B', marginTop: 2 },
  
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: { color: '#1D4ED8', fontSize: 11, fontWeight: '700' },
  
  deptList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  deptChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  deptChipText: { color: '#64748B', fontSize: 10, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#94A3B8', fontSize: 14 }
});
