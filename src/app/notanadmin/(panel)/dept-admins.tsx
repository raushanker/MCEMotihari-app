import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity,  ActivityIndicator, Alert } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, where, doc, setDoc, getDoc, deleteField, arrayRemove } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useRouter } from 'expo-router';

const DEPT_OPTIONS = [
  { id: 'cse',       label: 'CSE' },
  { id: 'cse_ai',    label: 'CSE (AI)' },
  { id: 'civil',     label: 'Civil' },
  { id: 'civil_ca',  label: 'Civil (CA)' },
  { id: 'eee',       label: 'EEE' },
  { id: 'mechanical',label: 'Mechanical' },
  { id: 'humanities',label: 'Humanities' },
];

export default function DeptAdminsScreen() {
  const router = useRouter();
  const [deptAdmins, setDeptAdmins] = useState<{ id: string; name: string; email: string; depts: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDeptAdmins();
  }, []);

  const fetchDeptAdmins = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'publicProfiles'), where('deptFacultyAdminRoles', '!=', null));
      const snap = await getDocs(q);
      const results = await Promise.all(snap.docs.map(async d => {
        const data = d.data();
        let email = '';
        try {
          const priv = await getDoc(doc(db, 'privateUsers', d.id));
          if (priv.exists()) email = priv.data().email || '';
        } catch {}
        return {
          id: d.id,
          name: data.name || 'Unknown',
          email,
          depts: (data.deptFacultyAdminRoles || []) as string[],
        };
      }));
      setDeptAdmins(results.filter(r => r.depts.length > 0));
    } catch (e) {
      console.warn('fetchDeptAdmins error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (uid: string, name: string, deptId: string) => {
    Alert.alert(
      'Revoke Access',
      `Remove ${name} from ${deptId.toUpperCase()} Notice Board?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke', style: 'destructive',
          onPress: async () => {
            try {
              await setDoc(doc(db, 'publicProfiles', uid), { deptFacultyAdminRoles: arrayRemove(deptId) }, { merge: true });
              await setDoc(doc(db, 'privateUsers', uid), { deptFacultyAdminRoles: arrayRemove(deptId) }, { merge: true }).catch(() => {});
              fetchDeptAdmins();
            } catch { Alert.alert('Error', 'Revoke failed.'); }
          },
        },
      ]
    );
  };

  const handleRevokeAll = async (uid: string, name: string) => {
    Alert.alert(
      'Remove Faculty Admin',
      `Are you sure you want to remove ${name} from all Notice Boards?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await setDoc(doc(db, 'publicProfiles', uid), { deptFacultyAdminRoles: deleteField() }, { merge: true });
              await setDoc(doc(db, 'privateUsers', uid), { deptFacultyAdminRoles: deleteField() }, { merge: true }).catch(() => {});
              fetchDeptAdmins();
            } catch { Alert.alert('Error', 'Remove failed.'); }
          }
        }
      ]
    );
  };

  const filteredAdmins = deptAdmins.filter(admin => 
    admin.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>All Dept Faculty Admins</Text>
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
        <ActivityIndicator size="large" color="#EAB308" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredAdmins}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No dept faculty admins found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.adminCard}>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email}>{item.email}</Text>
                <View style={styles.deptList}>
                  {item.depts.map(deptId => (
                    <View
                      key={deptId}
                      style={styles.deptChip}
                    >
                      <Text style={styles.deptChipText}>
                        {DEPT_OPTIONS.find(d => d.id === deptId)?.label ?? deptId}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={styles.revokeBtn}
                onPress={() => handleRevokeAll(item.id, item.name)}
              >
                <Text style={styles.revokeBtnText}>Remove</Text>
              </TouchableOpacity>
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
    marginRight: 12
  },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
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
    justifyContent: 'space-between'
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  email: { fontSize: 14, color: '#64748B', marginTop: 2 },
  deptList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  deptChip: {
    backgroundColor: '#FEF9C3',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EAB308',
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  deptChipText: { color: '#CA8A04', fontSize: 12, fontWeight: '700' },
  revokeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    marginLeft: 12,
  },
  revokeBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#94A3B8', fontSize: 14 }
});
