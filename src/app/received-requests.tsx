import React from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, 
  Platform, Image, Alert, StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useAppStore } from '@/store/useAppStore';
import { useNotificationStore } from '@/store/useNotificationStore';

export default function ReceivedRequestsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const { user, showToast } = useAppStore();
  const { notifications, initNotifications } = useNotificationStore();
  const insets = useSafeAreaInsets();
 
   // Sync notifications on mount/auth state changes to fetch invitations
   React.useEffect(() => {
     if (user && user.role !== 'Guest') {
       const unsubscribe = initNotifications(user.uid);
       return () => unsubscribe();
     }
   }, [user]);
 
   const pendingRequests = React.useMemo(() => {
     if (!user || user.role === 'Guest') return [];
     const mockNames = ['Amit Singh', 'Nisha Kumari', 'Pankaj Kumar', 'Abhishek Kumar', 'Shweta Raj', 'Rohan Sharma'];
     return notifications.filter(n => 
       n.type === 'connection_request' && 
       n.status !== 'accepted' && 
       n.status !== 'declined' &&
       (!n.senderName || !mockNames.includes(n.senderName))
     );
   }, [notifications, user]);

  const handleBack = () => {
    if (router.canGoBack()) {
      if (router.canGoBack()) { router.back(); } else { router.replace('/'); }
    } else {
      router.replace('/network');
    }
  };

  const handleAcceptRequest = async (item: any) => {
    if (!user) return;
    try {
      const { runTransaction, doc } = require('firebase/firestore');
      const { db } = require('../config/firebase');

      let senderUid = item.senderUid;
      if (!senderUid && item.id && item.id.startsWith('connection_request_')) {
        const parts = item.id.split('_');
        if (parts.length >= 3) {
          senderUid = parts[2];
        }
      }

      if (!senderUid) {
        throw new Error("Sender UID not found in notification.");
      }

      const requestId = item.id;
      const acceptanceNotifId = `connection_accepted_${user.uid}_${senderUid}_${requestId}`;
      const sortedUserIds = [user.uid, senderUid].sort().join('_');

      const notifDocRef = doc(db, 'users', user.uid, 'notifications', requestId);
      const senderConnRef = doc(db, 'users', senderUid, 'connections', user.uid);
      const recipientConnRef = doc(db, 'users', user.uid, 'connections', senderUid);
      const senderNotifRef = doc(db, 'users', senderUid, 'notifications', acceptanceNotifId);

      await runTransaction(db, async (transaction: any) => {
        const notifDoc = await transaction.get(notifDocRef);
        if (!notifDoc.exists()) {
          throw new Error("Pending request notification does not exist.");
        }
        
        const notifData = notifDoc.data();
        if (notifData.status === 'accepted') {
          return; // Already accepted
        }

        const recipientConnDoc = await transaction.get(recipientConnRef);
        if (recipientConnDoc.exists() && recipientConnDoc.data().status === 'Connected') {
          return; // Already connected
        }

        transaction.update(notifDocRef, {
          status: 'accepted',
          read: true,
          body: `You accepted ${item.senderName}'s connection request.`
        });

        transaction.set(senderConnRef, {
          id: user.uid,
          name: user.name,
          role: user.role || 'Student',
          branch: user.department || '',
          batch: user.batch || '',
          image: user.photoUrl || '',
          status: 'Connected',
          sortedUserIds,
          connectedAt: new Date().toISOString()
        });

        transaction.set(recipientConnRef, {
          id: senderUid,
          name: item.senderName || '',
          role: item.senderRole || 'Student',
          branch: item.senderBranch || '',
          batch: item.senderBatch || '',
          image: item.senderPhoto || '',
          status: 'Connected',
          sortedUserIds,
          connectedAt: new Date().toISOString()
        });

        transaction.set(senderNotifRef, {
          type: 'connection_accepted',
          title: '🤝 Connection Accepted',
          body: `${user.name} accepted your connection request. You are now connected!`,
          timestamp: new Date().toLocaleString(),
          read: false,
          senderUid: user.uid,
          senderName: user.name,
          senderPhoto: user.photoUrl || '',
          senderBranch: user.department || '',
          senderBatch: user.batch || '',
          senderUsername: user.username || '',
          senderRole: user.role || 'Student',
          requestId
        });
      });

      showToast(`Connected with ${item.senderName}! 🤝`, 'success');
    } catch (err: any) {
      console.warn('Accept connection failed:', err);
      Alert.alert('Error', 'Failed to accept invitation: ' + err.message);
    }
  };

  const handleIgnoreRequest = async (item: any) => {
    if (!user) return;
    try {
      const { doc, updateDoc } = require('firebase/firestore');
      const { db } = require('../config/firebase');
      const notifDocRef = doc(db, 'users', user.uid, 'notifications', item.id);
      
      await updateDoc(notifDocRef, {
        status: 'declined',
        read: true
      });
      showToast('Invitation ignored.', 'info');
    } catch (err) {
      console.warn('Ignore invitation failed:', err);
      Alert.alert('Error', 'Failed to ignore invitation.');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={{ height: insets.top, backgroundColor: theme.backgroundElement, zIndex: 101 }} />
      <StatusBar
        backgroundColor={theme.backgroundElement}
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        translucent={false}
      />

      {/* Header Bar */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder, paddingTop: 10, paddingBottom: 10 }]}>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: theme.background }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Received Invitations</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {pendingRequests.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <Ionicons name="mail-open-outline" size={48} color={theme.textSecondary} style={{ marginBottom: 12, opacity: 0.7 }} />
            <Text style={[styles.emptyText, { color: theme.text }]}>No pending invitations yet</Text>
            <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
              When someone requests to connect with you, they will appear here.
            </Text>
          </View>
        ) : (
          <View style={[styles.listContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            {pendingRequests.map((item, index) => (
              <View 
                key={item.id} 
                style={[
                  styles.itemRow, 
                  { 
                    borderBottomColor: theme.cardBorder,
                    borderBottomWidth: index === pendingRequests.length - 1 ? 0 : 1 
                  }
                ]}
              >
                <View style={styles.itemLeft}>
                  <Image
                    source={{ uri: item.senderPhoto || 'https://api.dicebear.com/7.x/avataaars/png?seed=' + item.senderName }}
                    style={styles.avatar}
                  />
                  <View style={styles.infoCol}>
                    <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={1}>
                      {item.senderName}
                    </Text>
                    <Text style={[styles.roleText, { color: theme.textSecondary }]} numberOfLines={1}>
                      {item.senderRole === 'Student' ? `${item.senderBranch || ''} Student` : item.senderRole || 'MCE Member'}
                    </Text>
                  </View>
                </View>
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleAcceptRequest(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ignoreBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                    onPress={() => handleIgnoreRequest(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.ignoreBtnText, { color: theme.textSecondary }]}>Ignore</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
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
    borderBottomWidth: 1,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0px 2px 4px rgba(0,0,0,0.08)' : undefined,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCol: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  listContainer: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  roleText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginLeft: 12,
  },
  acceptBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  ignoreBtn: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  ignoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
