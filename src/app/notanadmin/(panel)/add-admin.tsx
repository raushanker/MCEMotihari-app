import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, where, doc, setDoc, limit, arrayUnion } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/hooks/useAuth';
import { logAdminAction } from '@/utils/auditLogger';

const DEPT_OPTIONS = [
  { id: 'cse',       label: 'CSE' },
  { id: 'cse_ai',    label: 'CSE (AI)' },
  { id: 'civil',     label: 'Civil' },
  { id: 'civil_ca',  label: 'Civil (CA)' },
  { id: 'eee',       label: 'EEE' },
  { id: 'mechanical',label: 'Mechanical' },
  { id: 'humanities',label: 'Humanities' },
];

type AdminRole = 'SUPER_ADMIN' | 'MODERATOR' | 'LIBRARY_ADMIN' | 'FACULTY_ADMIN';

export default function AddAdminScreen() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  const handleAssignRole = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role.');
      return;
    }
    if (selectedRole === 'FACULTY_ADMIN' && selectedDepts.length === 0) {
      Alert.alert('Error', 'Please select at least one department for the Faculty Admin.');
      return;
    }

    setAssigning(true);
    try {
      // Find user by email in privateUsers
      const q = query(collection(db, 'privateUsers'), where('email', '==', email.toLowerCase().trim()), limit(1));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        Alert.alert('Error', 'No user found with this email. They must login to the app at least once first.');
        setAssigning(false);
        return;
      }
      
      const userDoc = snapshot.docs[0];
      const uid = userDoc.id;
      const privateData = userDoc.data();
      
      if (selectedRole === 'FACULTY_ADMIN') {
        // Faculty admin assignment
        await setDoc(doc(db, 'publicProfiles', uid), { deptFacultyAdminRoles: arrayUnion(...selectedDepts) }, { merge: true });
        await setDoc(doc(db, 'privateUsers', uid), { deptFacultyAdminRoles: arrayUnion(...selectedDepts) }, { merge: true }).catch(() => {});
        
        if (currentUser) {
          await logAdminAction({
            adminUid: currentUser.uid, adminName: currentUser.name || 'Admin',
            adminEmail: currentUser.email || '', action: 'Assigned Dept Faculty Admin',
            targetId: uid, targetType: 'DeptFacultyAdmin',
            details: `Assigned ${selectedDepts.join(', ')} notice board access to ${email}`,
          });
        }
        Alert.alert('Success', `${email} is now a Faculty Admin for ${selectedDepts.length} department(s).`);
      } else {
        // Platform admin assignment
        if (privateData.adminRole === selectedRole) {
          Alert.alert('Info', 'User already has this role.');
          setAssigning(false);
          return;
        }

        await setDoc(doc(db, 'publicProfiles', uid), { adminRole: selectedRole }, { merge: true });
        await setDoc(doc(db, 'privateUsers', uid), { adminRole: selectedRole }, { merge: true });
        
        if (currentUser) {
          await logAdminAction({
            adminUid: currentUser.uid,
            adminName: currentUser.name || 'Admin',
            adminEmail: currentUser.email || '',
            action: `Assigned role ${selectedRole}`,
            targetId: uid,
            targetType: 'AdminAccess',
            details: `Assigned to ${email}`
          });
        }
        Alert.alert('Success', `User is now a ${selectedRole.replace('_', ' ')}`);
      }
      
      // Clear form
      setEmail('');
      setSelectedRole(null);
      setSelectedDepts([]);
    } catch (error: any) {
      console.error('Error assigning role:', error);
      Alert.alert('Error', error?.message || 'Failed to assign role.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/notanadmin/admins')}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flexShrink: 1 }}>
          <Text style={styles.title} numberOfLines={2}>Add New Admin</Text>
          <Text style={styles.subtitle} numberOfLines={2}>Grant access to users via their Email</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.label}>1. User Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. faculty@mcemotihari.ac.in"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { marginTop: 24 }]}>2. Select Role</Text>
          
          <View style={styles.roleGrid}>
            <TouchableOpacity 
              style={[styles.roleCard, selectedRole === 'SUPER_ADMIN' && styles.roleCardActive]}
              onPress={() => setSelectedRole('SUPER_ADMIN')}
            >
              <Ionicons name="shield-checkmark" size={24} color={selectedRole === 'SUPER_ADMIN' ? '#EF4444' : '#64748B'} />
              <Text style={[styles.roleCardText, selectedRole === 'SUPER_ADMIN' && { color: '#EF4444' }]}>Super Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.roleCard, selectedRole === 'FACULTY_ADMIN' && styles.roleCardActive]}
              onPress={() => setSelectedRole('FACULTY_ADMIN')}
            >
              <Ionicons name="school" size={24} color={selectedRole === 'FACULTY_ADMIN' ? '#EAB308' : '#64748B'} />
              <Text style={[styles.roleCardText, selectedRole === 'FACULTY_ADMIN' && { color: '#CA8A04' }]}>Faculty Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.roleCard, selectedRole === 'MODERATOR' && styles.roleCardActive]}
              onPress={() => setSelectedRole('MODERATOR')}
            >
              <Ionicons name="chatbubbles" size={24} color={selectedRole === 'MODERATOR' ? '#3B82F6' : '#64748B'} />
              <Text style={[styles.roleCardText, selectedRole === 'MODERATOR' && { color: '#2563EB' }]}>Moderator</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.roleCard, selectedRole === 'LIBRARY_ADMIN' && styles.roleCardActive]}
              onPress={() => setSelectedRole('LIBRARY_ADMIN')}
            >
              <Ionicons name="book" size={24} color={selectedRole === 'LIBRARY_ADMIN' ? '#22C55E' : '#64748B'} />
              <Text style={[styles.roleCardText, selectedRole === 'LIBRARY_ADMIN' && { color: '#16A34A' }]}>Library Admin</Text>
            </TouchableOpacity>
          </View>

          {/* Department Selection (only shows if Faculty Admin is selected) */}
          {selectedRole === 'FACULTY_ADMIN' && (
            <View style={styles.deptSection}>
              <Text style={styles.label}>3. Select Departments (Notice Board)</Text>
              <View style={styles.deptSelectorRow}>
                <TouchableOpacity
                  style={[styles.deptChip, selectedDepts.length === DEPT_OPTIONS.length && { backgroundColor: '#EAB308', borderColor: '#CA8A04' }]}
                  onPress={() => {
                    if (selectedDepts.length === DEPT_OPTIONS.length) setSelectedDepts([]);
                    else setSelectedDepts(DEPT_OPTIONS.map(d => d.id));
                  }}
                >
                  <Text style={[styles.deptChipText, selectedDepts.length === DEPT_OPTIONS.length && { color: '#FFF' }]}>All</Text>
                </TouchableOpacity>
                {DEPT_OPTIONS.map(d => {
                  const isSelected = selectedDepts.includes(d.id);
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.deptChip, isSelected && { backgroundColor: '#EAB308', borderColor: '#CA8A04' }]}
                      onPress={() => {
                        setSelectedDepts(prev => prev.includes(d.id) ? prev.filter(id => id !== d.id) : [...prev, d.id]);
                      }}
                    >
                      <Text style={[styles.deptChipText, isSelected && { color: '#FFF' }]}>{d.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.submitBtn, (!email || !selectedRole) && styles.submitBtnDisabled]}
            onPress={handleAssignRole}
            disabled={assigning || !email || !selectedRole}
          >
            {assigning ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Grant Access</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollContent: { padding: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    fontSize: 15,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  roleCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCardActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#3B82F6',
  },
  roleCardText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  deptSection: { marginTop: 24 },
  deptSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  deptChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  deptChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    backgroundColor: '#0F172A',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
