import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ActivityIndicator, Image, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore, cancelConnectionRequest } from '@/store/useAppStore';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';

function NetworkAvatar({ uri, name, style }: { uri: string; name: string; style: any }) {
  const fallbackUri = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(name || 'Felix')}`;
  const initialUri = uri && typeof uri === 'string' && uri.trim() !== '' && uri !== 'null' && uri !== 'undefined' ? uri : fallbackUri;
  const [imgSrc, setImgSrc] = useState<any>({ uri: initialUri });

  useEffect(() => {
    const nextUri = uri && typeof uri === 'string' && uri.trim() !== '' && uri !== 'null' && uri !== 'undefined' ? uri : fallbackUri;
    setImgSrc({ uri: nextUri });
  }, [uri, fallbackUri]);

  return (
    <Image
      source={imgSrc}
      style={style}
      onError={() => {
        if (imgSrc.uri !== fallbackUri) {
          setImgSrc({ uri: fallbackUri });
        }
      }}
    />
  );
}

const TypedFlashList = FlashList as any;

export default function SentRequestsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const user = useAppStore(state => state.user);
  const connections = useAppStore(state => state.connections);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // Filter only connection requests sent by this user
  const sentRequests = useMemo(() => {
    return connections.filter(c => c.status === 'Sent');
  }, [connections]);

  const handleCancelRequest = async (targetId: string, targetName: string) => {
    if (!user) return;
    
    Alert.alert(
      'Cancel Invitation? ✖️',
      `Kya aap ${targetName} ko bheji gayi connection request cancel karna chahte hain?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(targetId);
            try {
              await cancelConnectionRequest(user, targetId);
            } catch (err) {
              console.warn('Failed to cancel connection request:', err);
              Alert.alert('Error', 'Connection request cancel nahi ho payi. Kripya baad me try karein.');
            } finally {
              setCancellingId(null);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={{ height: insets.top, backgroundColor: theme.backgroundElement, zIndex: 101 }} />
      <StatusBar
        backgroundColor={theme.backgroundElement}
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        translucent={false}
      />
      {/* Header section */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Sent Connection Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main content list */}
      {sentRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: theme.isDark ? '#334155' : '#F1F5F9' }]}>
            <Ionicons name="paper-plane-outline" size={48} color="#F97316" />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Sent Requests</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Aapne abhi tak kisi ko connection request nahi bheji hai. Naye members se connect karne ke liye Network screen par search karein!
          </Text>
        </View>
      ) : (
        <TypedFlashList
          data={sentRequests}
          estimatedItemSize={76}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }: { item: any }) => (
            <View style={[styles.cardRow, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              {/* Profile Avatar */}
              <View style={styles.avatarContainer}>
                <NetworkAvatar uri={item.image} name={item.name} style={styles.avatar} />
              </View>

              {/* Profile Details */}
              <View style={styles.detailsContainer}>
                <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.roleText, { color: theme.textSecondary }]}>
                  {item.role === 'Admin' ? 'Admin' : (item.role || 'Student')}
                </Text>
                <View style={styles.statusBadge}>
                  <Ionicons name="time-outline" size={10} color="#F97316" style={{ marginRight: 4 }} />
                  <Text style={styles.statusText}>Pending Invitation</Text>
                </View>
              </View>

              {/* Action Button: Cancel */}
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.isDark ? '#475569' : '#CBD5E1' }]}
                onPress={() => handleCancelRequest(item.id, item.name)}
                disabled={cancellingId === item.id}
                activeOpacity={0.8}
              >
                {cancellingId === item.id ? (
                  <ActivityIndicator size="small" color="#64748B" />
                ) : (
                  <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Withdraw</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  nameText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  roleText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F97316',
  },
  cancelBtn: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 64,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
});
