import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, limit, getDocs, where, doc, updateDoc, getDoc, deleteField } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/utils/auditLogger';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';


type AdminRole = 'SUPER_ADMIN' | 'MODERATOR' | 'LIBRARY_ADMIN' | 'NOTIFICATION_ADMIN';

interface AdminDoc {
  id: string;
  name: string;
  email: string;
  profilePic?: string;
  photoUrl?: string;
  adminRole?: AdminRole;
}

export default function AdminsScreen() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'publicProfiles'), where('adminRole', 'in', ['SUPER_ADMIN', 'MODERATOR', 'LIBRARY_ADMIN', 'NOTIFICATION_ADMIN']));
      const snapshot = await getDocs(q);
      
      const adminPromises = snapshot.docs.map(async (d) => {
        const publicData = d.data();
        let email = 'unknown@email.com';
        try {
          const privateSnap = await getDoc(doc(db, 'privateUsers', d.id));
          if (privateSnap.exists() && privateSnap.data().email) {
            email = privateSnap.data().email;
          }
        } catch(e) {}
        
        return { id: d.id, ...publicData, email } as AdminDoc;
      });
      
      const adminData = await Promise.all(adminPromises);

      // Explicitly append the Master Admin if they aren't already fetched by query
      const masterAdminUid = process.env.EXPO_PUBLIC_ADMIN_UID || 'Zdxi8kTc2kcs1cOPxWS81PTVmco2';
      const hasMasterAdmin = snapshot.docs.some(d => d.id === masterAdminUid);
      
      if (!hasMasterAdmin) {
        try {
          const [masterPublicSnap, masterPrivateSnap] = await Promise.all([
            getDoc(doc(db, 'publicProfiles', masterAdminUid)),
            getDoc(doc(db, 'privateUsers', masterAdminUid))
          ]);
          
          if (masterPublicSnap.exists()) {
            const publicData = masterPublicSnap.data();
            const email = (masterPrivateSnap.exists() && masterPrivateSnap.data().email) 
              ? masterPrivateSnap.data().email 
              : 'admin@mcemotihari.ac.in';
            
            adminData.unshift({
              id: masterAdminUid,
              name: publicData.name || 'Master Admin',
              email,
              photoUrl: publicData.photoUrl || publicData.profilePic || '',
              adminRole: 'SUPER_ADMIN',
            });
          } else {
            adminData.unshift({
              id: masterAdminUid,
              name: 'Master Admin',
              email: 'admin@mcemotihari.ac.in',
              adminRole: 'SUPER_ADMIN',
            });
          }
        } catch (e) {
          adminData.unshift({
            id: masterAdminUid,
            name: 'Master Admin',
            email: 'admin@mcemotihari.ac.in',
            adminRole: 'SUPER_ADMIN',
          });
        }
      }

      setAdmins(adminData);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (role: AdminRole) => {
    if (!searchEmail.trim()) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    
    setIsSearching(true);
    try {
      // Find user by email in privateUsers
      const q = query(collection(db, 'privateUsers'), where('email', '==', searchEmail.toLowerCase().trim()), limit(1));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        Alert.alert('Error', 'No user found with this email.');
        return;
      }
      
      const userDoc = snapshot.docs[0];
      const privateData = userDoc.data();
      
      if (privateData.adminRole === role) {
        Alert.alert('Info', 'User already has this role.');
        return;
      }

      await updateDoc(doc(db, 'publicProfiles', userDoc.id), { adminRole: role });
      await updateDoc(doc(db, 'privateUsers', userDoc.id), { adminRole: role });
      
      if (currentUser) {
        await logAdminAction({
          adminUid: currentUser.uid,
          adminName: currentUser.name || 'Admin',
          adminEmail: currentUser.email || '',
          action: `Assigned role ${role}`,
          targetId: userDoc.id,
          targetType: 'AdminAccess',
          details: `Assigned to ${privateData.email}`
        });
      }

      Alert.alert('Success', `User is now a ${role}`);
      setSearchEmail('');
      fetchAdmins();
    } catch (error) {
      console.error('Error adding admin:', error);
      Alert.alert('Error', 'Failed to assign role.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveAdmin = async (userId: string, userName: string) => {
    try {
      const masterAdminUid = process.env.EXPO_PUBLIC_ADMIN_UID || 'Zdxi8kTc2kcs1cOPxWS81PTVmco2';
      if (userId === masterAdminUid || userId === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2') {
        Alert.alert('Denied', 'Cannot remove the master Super Admin.');
        return;
      }

      await updateDoc(doc(db, 'publicProfiles', userId), { adminRole: deleteField() });
      await updateDoc(doc(db, 'privateUsers', userId), { adminRole: deleteField() });
      
      if (currentUser) {
        await logAdminAction({
          adminUid: currentUser.uid,
          adminName: currentUser.name || 'Admin',
          adminEmail: currentUser.email || '',
          action: 'Revoked Admin Access',
          targetId: userId,
          targetType: 'AdminAccess',
          details: `Revoked from ${userName}`
        });
      }

      Alert.alert('Success', 'Admin access revoked.');
      fetchAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
      Alert.alert('Error', 'Failed to remove admin.');
    }
  };

  const renderItem = ({ item }: { item: AdminDoc }) => {
    const masterAdminUid = process.env.EXPO_PUBLIC_ADMIN_UID || 'Zdxi8kTc2kcs1cOPxWS81PTVmco2';
    const isMaster = item.id === masterAdminUid || item.id === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2';

    return (
      <View style={styles.adminCard}>
        <Image source={{ uri: item.photoUrl || item.profilePic || 'https://via.placeholder.com/150' }} style={styles.avatar} />
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{item.adminRole?.replace('_', ' ') || ''}</Text>
          </View>
        </View>
        {!isMaster ? (
          <TouchableOpacity 
            style={styles.removeBtn} 
            onPress={() => handleRemoveAdmin(item.id, item.name)}
          >
            <Text style={styles.removeText}>Revoke</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.removeBtn, { borderColor: '#94A3B8', opacity: 0.6 }]}>
            <Text style={[styles.removeText, { color: '#94A3B8' }]}>System</Text>
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
            <Text style={styles.title} numberOfLines={2}>Admin Roles</Text>
            <Text style={styles.subtitle} numberOfLines={2}>Assign and revoke dashboard access</Text>
          </View>
        </View>
      </View>

      <View style={styles.addSection}>
        <Text style={styles.sectionTitle}>Grant Access</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="User Email Address"
            value={searchEmail}
            onChangeText={setSearchEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.roleButtons}>
          <TouchableOpacity 
            style={[styles.roleBtn, { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}
            onPress={() => handleAddAdmin('MODERATOR')}
            disabled={isSearching}
          >
            <Text style={[styles.roleBtnText, { color: '#1D4ED8' }]}>+ Moderator</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.roleBtn, { backgroundColor: '#F0FDF4', borderColor: '#22C55E' }]}
            onPress={() => handleAddAdmin('LIBRARY_ADMIN')}
            disabled={isSearching}
          >
            <Text style={[styles.roleBtnText, { color: '#15803D' }]}>+ Library Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.roleBtn, { backgroundColor: '#FEF2F2', borderColor: '#EF4444' }]}
            onPress={() => handleAddAdmin('SUPER_ADMIN')}
            disabled={isSearching}
          >
            <Text style={[styles.roleBtnText, { color: '#B91C1C' }]}>+ Super Admin</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { paddingHorizontal: 20, paddingTop: 20 }]}>Current Admins</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={admins}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No extra admins assigned yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
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
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  addSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  inputRow: { flexDirection: 'row', marginBottom: 12 },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    minWidth: 0,
  },
  roleButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBtnText: { fontSize: 13, fontWeight: '700' },
  listContent: { padding: 20 },
  adminCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E2E8F0' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  email: { fontSize: 13, color: '#64748B', marginTop: 2 },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  roleText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  removeBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#94A3B8', fontSize: 14 }
});
