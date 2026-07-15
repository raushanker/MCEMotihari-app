import React from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, 
  Platform, Image, Alert, StatusBar, Modal, ActivityIndicator,  Dimensions
} from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeRouter as useRouter } from '@/hooks/useSafeRouter';
import { useAppStore } from '@/store/useAppStore';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MyConnectionsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const { user, connections, showToast } = useAppStore();
  const [activeConnection, setActiveConnection] = React.useState<any | null>(null);
  const [menuPosition, setMenuPosition] = React.useState<{ x: number, y: number } | null>(null);
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = React.useState('');

  const [displayLimit, setDisplayLimit] = React.useState(10);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  // Sync connections in the background on mount to keep data fresh
  React.useEffect(() => {
    if (user && user.role !== 'Guest') {
      useAppStore.getState().syncConnections().catch(() => {});
    }
  }, [user]);

  const connectedList = React.useMemo(() => {
    if (!user || user.role === 'Guest') return [];
    return connections.filter(c => c.status === 'Connected');
  }, [connections, user]);

  const filteredList = React.useMemo(() => {
    if (!searchQuery.trim()) return connectedList;
    const queryLower = searchQuery.toLowerCase().trim();
    return connectedList.filter(item => 
      item.name?.toLowerCase().includes(queryLower) ||
      item.role?.toLowerCase().includes(queryLower) ||
      item.branch?.toLowerCase().includes(queryLower)
    );
  }, [connectedList, searchQuery]);

  const paginatedList = React.useMemo(() => {
    return filteredList.slice(0, displayLimit);
  }, [filteredList, displayLimit]);

  const handleLoadMore = () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit(prev => prev + 10);
      setIsLoadingMore(false);
    }, 550);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      if (router.canGoBack()) { router.back(); } else { router.replace('/'); }
    } else {
      router.replace('/network');
    }
  };

  const handleRemoveConnection = async (item: any) => {
    if (!user) return;
    
    const executeRemoval = async () => {
      try {
        // Optimistically update local store
        const previousConnections = connections || [];
        const updated = previousConnections.filter(c => c.id !== item.id);
        useAppStore.setState({ connections: updated });
        await AsyncStorage.setItem('@mce_connections', JSON.stringify(updated));

        // Delete connection documents on both sides in Firestore
        await Promise.all([
          deleteDoc(doc(db, 'users', user.uid, 'connections', item.id)),
          deleteDoc(doc(db, 'users', item.id, 'connections', user.uid))
        ]);

        showToast(`Disconnected from ${item.name}`, 'info');
      } catch (err) {
        console.error('Disconnection failed:', err);
        Alert.alert('Error', 'Failed to remove connection.');
      }
    };

    if (Platform.OS === 'web') {
      const confirm = window.confirm(`Are you sure you want to remove ${item.name} from your network?`);
      if (confirm) {
        await executeRemoval();
      }
    } else {
      Alert.alert(
        'Remove Connection',
        `Are you sure you want to remove ${item.name} from your network?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: executeRemoval }
        ]
      );
    }
  };

  const handleViewProfile = (item: any) => {
    if (item.username) {
      router.push(`/@${item.username}?from=connections`);
    } else {
      router.push(`/@${item.id}?from=connections`);
    }
  };

  const handleShowOptions = (event: any, item: any) => {
    const pageX = event.nativeEvent.pageX || event.nativeEvent.clientX || 200;
    const pageY = event.nativeEvent.pageY || event.nativeEvent.clientY || 200;
    setMenuPosition({ x: pageX - 125, y: pageY + 12 });
    setActiveConnection(item);
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>My Network</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {connectedList.length} connection{connectedList.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Search Bar (Static Top) */}
      {connectedList.length > 0 && (
        <View style={[styles.searchSection, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder, borderBottomWidth: 1 }]}>
          <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              placeholder="Search by name, department..."
              placeholderTextColor="#94A3B8"
              style={[styles.searchInput, { color: theme.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
             autoCapitalize="sentences" />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={() => {
          setMenuPosition(null);
          setActiveConnection(null);
        }}
        scrollEventThrottle={16}
      >
        {connectedList.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <Ionicons name="people-outline" size={48} color={theme.textSecondary} style={{ marginBottom: 12, opacity: 0.7 }} />
            <Text style={[styles.emptyText, { color: theme.text }]}>No connections yet</Text>
            <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
              Grow your college network! Go to Recommendations on the Network screen and connect with peers.
            </Text>
          </View>
        ) : filteredList.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
            <Ionicons name="search-outline" size={48} color={theme.textSecondary} style={{ marginBottom: 12, opacity: 0.7 }} />
            <Text style={[styles.emptyText, { color: theme.text }]}>No results found</Text>
            <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
              We couldn't find any connections matching "{searchQuery}".
            </Text>
          </View>
        ) : (
          <View>
            <View style={[styles.listContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, marginBottom: 12 }]}>
              {paginatedList.map((item, index) => (
                <View 
                  key={item.id} 
                  style={[
                    styles.itemRow, 
                    { 
                      borderBottomColor: theme.cardBorder,
                      borderBottomWidth: index === paginatedList.length - 1 ? 0 : 1 
                    }
                  ]}
                >
                <TouchableOpacity 
                  style={styles.itemLeft} 
                  onPress={() => handleViewProfile(item)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.image || 'https://api.dicebear.com/7.x/avataaars/png?seed=' + encodeURIComponent(item.name || 'Felix') }}
                    style={styles.avatar}
                  />
                  <View style={styles.infoCol}>
                    <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                      {(item.id === 'Zdxi8kTc2kcs1cOPxWS81PTVmco2' || item.id === 'DdP2c855PSRUJwhmN9rvbkYBraP2' || (item as any).adminRole === 'SUPER_ADMIN' || (item.role as string) === 'SUPER_ADMIN') && (
                        <Text> <Ionicons name="checkmark-circle" size={14} color="#1D9BF0" /></Text>
                      )}
                    </Text>
                    <Text style={[styles.roleText, { color: theme.textSecondary }]} numberOfLines={1}>
                      {item.role === 'Student' ? `${item.branch || ''} Student` : item.role || 'MCE Member'}
                    </Text>
                  </View>
                </TouchableOpacity>
                 <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={{ padding: 8 }}
                    onPress={(event) => handleShowOptions(event, item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

            {/* Pagination Load More Button */}
            {filteredList.length > displayLimit && (
              <View style={{ marginVertical: 8, alignItems: 'center', justifyContent: 'center' }}>
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color="#D95A1D" style={{ paddingVertical: 12 }} />
                ) : (
                  <TouchableOpacity
                    style={{
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.cardBorder,
                      borderWidth: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 24,
                      borderRadius: 12,
                      shadowColor: '#000',
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                    onPress={handleLoadMore}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>
                      Load More Connections
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Premium Anchored Context Dropdown Menu Overlay */}
      {menuPosition && activeConnection && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setMenuPosition(null);
            setActiveConnection(null);
          }}
        >
          <TouchableOpacity 
            style={styles.modalBackdropClose} 
            activeOpacity={1} 
            onPress={() => {
              setMenuPosition(null);
              setActiveConnection(null);
            }}
          >
            <View style={[
              styles.dropdownMenuGlobal, 
              { 
                left: Math.min(menuPosition.x, Dimensions.get('window').width - 150),
                top: menuPosition.y,
                backgroundColor: theme.backgroundElement, 
                borderColor: theme.cardBorder,
                shadowColor: theme.isDark ? '#000000' : '#0F172A',
              }
            ]}>
              <TouchableOpacity
                style={[styles.dropdownItem, { borderBottomColor: theme.cardBorder, borderBottomWidth: 1 }]}
                onPress={() => {
                  const conn = activeConnection;
                  setMenuPosition(null);
                  setActiveConnection(null);
                  handleViewProfile(conn);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={16} color={theme.text} style={{ marginRight: 10 }} />
                <Text style={[styles.dropdownItemText, { color: theme.text }]}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  const conn = activeConnection;
                  setMenuPosition(null);
                  setActiveConnection(null);
                  handleRemoveConnection(conn);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 10 }} />
                <Text style={[styles.dropdownItemText, { color: '#EF4444', fontWeight: '700' }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
    paddingVertical: 16,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  roleText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  actionsRow: {
    marginLeft: 12,
    position: 'relative',
    zIndex: 999,
  },
  removeBtn: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownMenuGlobal: {
    position: 'absolute',
    width: 140,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    elevation: 8,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalBackdropClose: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    padding: 0,
  },
});
