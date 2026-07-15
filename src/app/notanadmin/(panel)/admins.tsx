import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';

export default function AdminsHubScreen() {
  const router = useRouter();

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
            <Text style={styles.title} numberOfLines={2}>Admin Controls</Text>
            <Text style={styles.subtitle} numberOfLines={2}>Manage users and permissions</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Add New Admin Card */}
        <TouchableOpacity 
          style={[styles.card, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}
          onPress={() => router.push('/notanadmin/add-admin')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#86EFAC' }]}>
            <Ionicons name="person-add" size={32} color="#166534" />
          </View>
          <View style={styles.cardTextContent}>
            <Text style={[styles.cardTitle, { color: '#14532D' }]}>Add New Admin</Text>
            <Text style={styles.cardDesc}>
              Grant Super Admin or Faculty Admin roles to a user via email.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#4ADE80" />
        </TouchableOpacity>

        {/* All Admins Card */}
        <TouchableOpacity 
          style={[styles.card, { borderColor: '#DBEAFE', backgroundColor: '#EFF6FF', marginTop: 16 }]}
          onPress={() => router.push('/notanadmin/all-admins')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#BFDBFE' }]}>
            <Ionicons name="people" size={32} color="#1D4ED8" />
          </View>
          <View style={styles.cardTextContent}>
            <Text style={[styles.cardTitle, { color: '#1E3A8A' }]}>All Admins</Text>
            <Text style={styles.cardDesc}>
              View a complete list of all users with any admin privileges.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#60A5FA" />
        </TouchableOpacity>

        {/* Verified Admins Card */}
        <TouchableOpacity 
          style={[styles.card, { borderColor: '#FEF08A', backgroundColor: '#FEF9C3', marginTop: 16 }]}
          onPress={() => router.push('/notanadmin/verified-admins')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#FDE047' }]}>
            <Ionicons name="checkmark-done-circle" size={32} color="#B45309" />
          </View>
          <View style={styles.cardTextContent}>
            <Text style={[styles.cardTitle, { color: '#78350F' }]}>Verified Admins</Text>
            <Text style={styles.cardDesc}>
              View admins who have a verified blue tick or Super status.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FBBF24" />
        </TouchableOpacity>

      </ScrollView>
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
  scrollContent: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextContent: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  }
});
