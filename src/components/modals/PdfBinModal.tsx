import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from '@/hooks/useThemeColors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { SavedPdf } from '../../screens/PdfLibraryScreen';

interface PdfBinModalProps {
  visible: boolean;
  onClose: () => void;
  onRestore: () => void; // Trigger refresh in library
}

const BIN_STORAGE_KEY = '@doc_scanner_bin_pdfs';
const LIBRARY_STORAGE_KEY = '@doc_scanner_pdfs';

export const PdfBinModal: React.FC<PdfBinModalProps> = ({ visible, onClose, onRestore }) => {
  const theme = useThemeColors();
  const [binPdfs, setBinPdfs] = useState<SavedPdf[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  useEffect(() => {
    if (visible) {
      loadBinPdfs();
    } else {
      setSelectedIds([]);
      setIsSelectMode(false);
    }
  }, [visible]);

  const loadBinPdfs = async () => {
    try {
      const data = await AsyncStorage.getItem(BIN_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setBinPdfs(parsed);
      } else {
        setBinPdfs([]);
      }
    } catch (err) {
      console.warn('Error loading bin', err);
    }
  };

  const restoreSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      const toRestore = binPdfs.filter(p => selectedIds.includes(p.id));
      const remainingBin = binPdfs.filter(p => !selectedIds.includes(p.id));
      
      const libData = await AsyncStorage.getItem(LIBRARY_STORAGE_KEY);
      let libPdfs = libData ? JSON.parse(libData) : [];
      
      libPdfs = [...toRestore, ...libPdfs];
      
      await AsyncStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(libPdfs));
      await AsyncStorage.setItem(BIN_STORAGE_KEY, JSON.stringify(remainingBin));
      
      setBinPdfs(remainingBin);
      setSelectedIds([]);
      setIsSelectMode(false);
      onRestore(); // trigger refresh
    } catch (err) {
      console.warn('Error restoring', err);
    }
  };

  const permanentlyDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    Alert.alert(
      "Permanently Delete",
      "These files will be permanently deleted and cannot be recovered. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const toDelete = binPdfs.filter(p => selectedIds.includes(p.id));
              const remainingBin = binPdfs.filter(p => !selectedIds.includes(p.id));
              
              if (Platform.OS !== 'web') {
                for (const pdf of toDelete) {
                  try {
                    await FileSystem.deleteAsync(pdf.uri, { idempotent: true });
                  } catch (e) {
                    console.warn('File already deleted', e);
                  }
                }
              }
              
              await AsyncStorage.setItem(BIN_STORAGE_KEY, JSON.stringify(remainingBin));
              setBinPdfs(remainingBin);
              setSelectedIds([]);
              setIsSelectMode(false);
            } catch (err) {
              console.warn('Error deleting', err);
            }
          }
        }
      ]
    );
  };

  const clearBin = async () => {
    if (binPdfs.length === 0) return;
    
    Alert.alert(
      "Empty Bin",
      "All files in the bin will be permanently deleted. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Empty Bin", 
          style: "destructive",
          onPress: async () => {
            try {
              if (Platform.OS !== 'web') {
                for (const pdf of binPdfs) {
                  try {
                    await FileSystem.deleteAsync(pdf.uri, { idempotent: true });
                  } catch (e) {
                    console.warn('File already deleted', e);
                  }
                }
              }
              await AsyncStorage.removeItem(BIN_STORAGE_KEY);
              setBinPdfs([]);
              setSelectedIds([]);
              setIsSelectMode(false);
            } catch (err) {
              console.warn('Error emptying bin', err);
            }
          }
        }
      ]
    );
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
      if (selectedIds.length === 1) setIsSelectMode(false);
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const renderItem = ({ item }: { item: SavedPdf }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity 
        style={[styles.pdfCard, { backgroundColor: theme.backgroundElement, borderColor: isSelected ? '#3B82F6' : theme.cardBorder, borderWidth: isSelected ? 2 : 1 }]}
        onPress={() => {
          if (isSelectMode) toggleSelect(item.id);
        }}
        onLongPress={() => {
          if (!isSelectMode) {
            setIsSelectMode(true);
            toggleSelect(item.id);
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.pdfIcon, { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2' }]}>
            <Ionicons name="document" size={24} color="#EF4444" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.pdfName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.pdfMeta, { color: theme.textSecondary }]}>
              {new Date(item.date).toLocaleDateString()} • {formatSize(item.sizeBytes)}{item.pageCount ? ` • ${item.pageCount} page${item.pageCount > 1 ? 's' : ''}` : ''}
            </Text>
          </View>
          {isSelectMode && (
            <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? "#3B82F6" : theme.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
          {isSelectMode ? (
            <>
              <TouchableOpacity style={styles.backBtn} onPress={() => {
                if (selectedIds.length === binPdfs.length) setSelectedIds([]);
                else setSelectedIds(binPdfs.map(p => p.id));
              }}>
                <Ionicons name={selectedIds.length === binPdfs.length && binPdfs.length > 0 ? "checkbox" : "square-outline"} size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.text }]}>{selectedIds.length} Selected</Text>
              <TouchableOpacity style={styles.backBtn} onPress={() => { setIsSelectMode(false); setSelectedIds([]); }}>
                <Text style={{ color: '#3B82F6', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.backBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.text }]}>Recycle Bin</Text>
              <TouchableOpacity style={styles.backBtn} onPress={() => { if(binPdfs.length > 0) setIsSelectMode(true); }}>
                {binPdfs.length > 0 && <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 16 }}>Select</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>

        <FlatList
          data={binPdfs}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="trash-outline" size={64} color={theme.textSecondary} opacity={0.5} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Bin is Empty</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Deleted PDFs will appear here.
              </Text>
            </View>
          }
        />

        {binPdfs.length > 0 && (
          <View style={[styles.bottomBar, { borderTopColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
            {isSelectMode ? (
              <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 16 }}>
                <TouchableOpacity 
                  style={[styles.bottomBtn, { backgroundColor: selectedIds.length > 0 ? '#3B82F6' : theme.cardBorder }]}
                  disabled={selectedIds.length === 0}
                  onPress={restoreSelected}
                >
                  <Ionicons name="refresh" size={20} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.bottomBtnText}>Restore</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.bottomBtn, { backgroundColor: selectedIds.length > 0 ? '#EF4444' : theme.cardBorder }]}
                  disabled={selectedIds.length === 0}
                  onPress={permanentlyDeleteSelected}
                >
                  <Ionicons name="trash" size={20} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.bottomBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.bottomBtn, { backgroundColor: '#EF4444', width: '90%', alignSelf: 'center' }]}
                onPress={clearBin}
              >
                <Ionicons name="trash-bin" size={20} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.bottomBtnText}>Empty Bin</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700' },
  listContent: { padding: 16, flexGrow: 1 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
  pdfCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdfIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfo: { flex: 1 },
  pdfName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  pdfMeta: { fontSize: 12 },
  bottomBar: {
    paddingVertical: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  bottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 0.48,
  },
  bottomBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
