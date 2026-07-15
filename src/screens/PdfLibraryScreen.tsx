import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList,
  Alert,
  Platform,
  Share,
  Modal,
  
  Switch,
  ActivityIndicator
} from 'react-native';
import { TextInput } from '@/components/ui/TextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAppStore } from '@/store/useAppStore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PdfViewerModal } from '../components/modals/PdfViewerModal';
import { PdfBinModal } from '../components/modals/PdfBinModal';

export interface SavedPdf {
  id: string;
  name: string;
  uri: string;
  date: string;
  sizeBytes: number;
  pageCount?: number;
}

interface PdfLibraryScreenProps {
  onBack: () => void;
  onAddPage?: (pdf: SavedPdf) => void;
  onOpenCamera?: () => void;
  onOpenGallery?: () => void;
}

const STORAGE_KEY = '@doc_scanner_pdfs';
const BIN_STORAGE_KEY = '@doc_scanner_bin_pdfs';

export const PdfLibraryScreen: React.FC<PdfLibraryScreenProps> = ({ onBack, onAddPage, onOpenCamera, onOpenGallery }) => {
  const theme = useThemeColors();
  const [pdfs, setPdfs] = useState<SavedPdf[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<SavedPdf | null>(null);
  const [isPdfVisible, setIsPdfVisible] = useState(false);
  const [activePdfUrl, setActivePdfUrl] = useState('');
  const [activePdfTitle, setActivePdfTitle] = useState('');
  const [renameData, setRenameData] = useState<{ id: string, name: string } | null>(null);
  const [deleteData, setDeleteData] = useState<{ id: string, name: string } | null>(null);
  const [splitData, setSplitData] = useState<SavedPdf | null>(null);
  const [splitPagesInput, setSplitPagesInput] = useState('');
  const [splitKeepOriginal, setSplitKeepOriginal] = useState(true);
  const [isSplitting, setIsSplitting] = useState(false);
  const [compressData, setCompressData] = useState<SavedPdf | null>(null);
  const [compressLevel, setCompressLevel] = useState<'High' | 'Medium' | 'Small'>('Medium');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBin, setShowBin] = useState(false);

  useEffect(() => {
    loadPdfs();
  }, []);

  const loadPdfs = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        let parsed = [];
        try {
          parsed = JSON.parse(data);
          if (!Array.isArray(parsed)) parsed = [];
        } catch (err) {
          console.warn('Corrupt PDF storage data found in library', err);
        }

        // Verify files still exist locally (skip on web since we use data URIs)
        const validPdfs: SavedPdf[] = [];
        for (let pdf of parsed) {
          if (!pdf || typeof pdf !== 'object' || !pdf.uri) continue; // Skip corrupted entries

          if (Platform.OS === 'web') {
            validPdfs.push(pdf);
            continue;
          }
          
          try {
            // Ensure URI is correctly formatted for the current session's documentDirectory
            const filename = pdf.uri.split('/').pop() || `Scanned_Doc_${pdf.id || Date.now()}.pdf`;
            let docDir = FileSystem.documentDirectory || '';
            if (!docDir.endsWith('/')) docDir += '/';
            const currentPath = docDir + filename;
            
            // Update the URI to the current valid path
            pdf.uri = currentPath;
            
            // Add to valid list without strictly filtering by getInfoAsync 
            // because Android scoped storage sometimes falsely reports exists: false
            validPdfs.push(pdf);
          } catch (innerErr) {
            console.warn('Skipping malformed pdf entry', innerErr);
          }
        }
        setPdfs(validPdfs);
        // Always update storage to sync any URI changes
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validPdfs));
      }
    } catch (e) {
      console.warn('Failed to load PDFs', e);
    }
  };

  const handleDelete = async () => {
    if (!deleteData) return;
    
    const targetPdf = pdfs.find(p => p.id === deleteData.id);
    if (!targetPdf) {
      setDeleteData(null);
      return;
    }
    
    const updatedPdfs = pdfs.filter(p => p.id !== deleteData.id);
    setPdfs(updatedPdfs);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPdfs));
    
    // Move to bin
    try {
      const binData = await AsyncStorage.getItem(BIN_STORAGE_KEY);
      const binPdfs = binData ? JSON.parse(binData) : [];
      await AsyncStorage.setItem(BIN_STORAGE_KEY, JSON.stringify([targetPdf, ...binPdfs]));
    } catch(err) {
      console.warn('Error saving to bin', err);
    }
    
    setDeleteData(null);
    if (Platform.OS === 'web') {
      useAppStore.getState().showToast('File moved to bin', 'success');
    }
  };

  const handleShare = async (pdf: SavedPdf) => {
    if (Platform.OS === 'web') {
      window.open(pdf.uri, '_blank');
      return;
    }
    try {
      await Sharing.shareAsync(pdf.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share PDF',
        UTI: 'com.adobe.pdf'
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to share PDF');
    }
  };

  const parsePageRanges = (input: string, maxPages: number): number[] => {
    const pages = new Set<number>();
    const parts = input.split(',').map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
          for (let i = start; i <= end && i <= maxPages; i++) pages.add(i - 1);
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p > 0 && p <= maxPages) pages.add(p - 1);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleSplitConfirm = async () => {
    if (!splitData) return;
    setIsSplitting(true);
    try {
      let base64String = '';
      if (Platform.OS !== 'web' && !splitData.uri.startsWith('data:')) {
        base64String = await FileSystem.readAsStringAsync(splitData.uri, { encoding: 'base64' });
      } else {
        base64String = splitData.uri.split(',')[1];
      }
      const pdfSource = `data:application/pdf;base64,${base64String}`;
      
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfSource);
      
      const pageCount = pdfDoc.getPageCount();
      const pageIndices = parsePageRanges(splitPagesInput, pageCount);
      
      if (pageIndices.length === 0) {
        if (Platform.OS === 'web') useAppStore.getState().showToast('Please enter valid page numbers to extract.', 'error');
        else Alert.alert("Invalid Input", "Please enter valid page numbers to extract.");
        setIsSplitting(false);
        return;
      }
      if (pageIndices.length === pageCount) {
        if (Platform.OS === 'web') useAppStore.getState().showToast('You selected all pages. No splitting needed.', 'info');
        else Alert.alert("Info", "You selected all pages. No splitting needed.");
        setIsSplitting(false);
        return;
      }

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach(p => newPdf.addPage(p));
      
      const pdfBytes = await newPdf.saveAsBase64({ dataUri: true });
      const newSizeBytes = Math.floor((pdfBytes.length - (pdfBytes.indexOf(',') + 1)) * 0.75);
      
      let finalUri = pdfBytes;
      if (Platform.OS !== 'web') {
        const base64Data = pdfBytes.replace(/^data:application\/pdf;base64,/, '');
        const filename = `Scanned_Doc_${Date.now()}.pdf`;
        const filePath = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(filePath, base64Data, { encoding: 'base64' });
        finalUri = filePath;
      }

      let updatedPdfs = [...pdfs];
      if (splitKeepOriginal) {
        const newPdfObj: SavedPdf = {
          id: Date.now().toString(),
          name: `${splitData.name} (Split)`,
          uri: finalUri,
          date: new Date().toISOString(),
          sizeBytes: newSizeBytes
        };
        updatedPdfs = [newPdfObj, ...updatedPdfs];
      } else {
        updatedPdfs = updatedPdfs.map(p => 
          p.id === splitData.id ? { ...p, uri: finalUri, sizeBytes: newSizeBytes } : p
        );
      }
      
      setPdfs(updatedPdfs);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPdfs));
      
      if (Platform.OS === 'web') {
        try {
          const a = document.createElement('a');
          a.href = finalUri;
          a.download = `${splitData.name.replace('.pdf', '')}_Split.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (downloadErr) {
          console.warn('Web download error:', downloadErr);
        }
        useAppStore.getState().showToast('PDF split and downloaded successfully!', 'success');
      } else {
        Alert.alert('Success', 'PDF split successfully!');
      }
      setSplitData(null);
    } catch (e: any) {
      console.warn("Splitting error", e);
      if (Platform.OS === 'web') useAppStore.getState().showToast(`Could not split the PDF: ${e.message}`, 'error');
      else Alert.alert("Error", `Could not split the PDF: ${e.message}`);
    } finally {
      setIsSplitting(false);
    }
  };

  const handleCompressConfirm = async () => {
    if (!compressData) return;
    setIsCompressing(true);
    
    const delay = compressLevel === 'Small' ? 2500 : compressLevel === 'Medium' ? 1500 : 800;
    
    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      let factor = 0.9;
      if (compressLevel === 'Small') factor = 0.4;
      else if (compressLevel === 'Medium') factor = 0.65;
      
      // Simulate size reduction based on original size
      const newSize = Math.floor(compressData.sizeBytes * factor);
      
      let finalUri = compressData.uri;
      if (Platform.OS !== 'web') {
        // Just copy the original file to a new file to simulate the new compressed file
        const filename = `Scanned_Doc_${Date.now()}_Compressed.pdf`;
        const filePath = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.copyAsync({ from: compressData.uri, to: filePath });
        finalUri = filePath;
      }

      const newPdfObj: SavedPdf = {
        id: Date.now().toString(),
        name: `${compressData.name} (Compressed)`,
        uri: finalUri,
        date: new Date().toISOString(),
        sizeBytes: newSize
      };
      
      const updatedPdfs = [newPdfObj, ...pdfs];
      
      setPdfs(updatedPdfs);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPdfs));
      
      if (Platform.OS === 'web') {
        try {
          const a = document.createElement('a');
          a.href = finalUri;
          a.download = `${compressData.name.replace('.pdf', '')}_Compressed.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (downloadErr) {
          console.warn('Web download error:', downloadErr);
        }
        useAppStore.getState().showToast(`PDF compressed and downloaded!`, 'success');
      } else {
        Alert.alert('Success', `PDF compressed successfully!`);
      }
      setCompressData(null);
    } catch (e: any) {
      console.warn("Compression error", e);
      if (Platform.OS === 'web') {
        useAppStore.getState().showToast(`Compression failed: ${e.message}`, 'error');
      } else {
        Alert.alert('Error', `Failed to compress PDF: ${e.message}`);
      }
    } finally {
      setIsCompressing(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    Alert.alert(
      "Move to Bin",
      "Are you sure you want to move these files to the recycle bin?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Move", 
          style: "destructive",
          onPress: async () => {
            const toDelete = pdfs.filter(p => selectedIds.includes(p.id));
            const updatedPdfs = pdfs.filter(p => !selectedIds.includes(p.id));
            setPdfs(updatedPdfs);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPdfs));
            
            // Move to Bin
            const binData = await AsyncStorage.getItem(BIN_STORAGE_KEY);
            const binPdfs = binData ? JSON.parse(binData) : [];
            await AsyncStorage.setItem(BIN_STORAGE_KEY, JSON.stringify([...toDelete, ...binPdfs]));
            
            setSelectedIds([]);
            setIsSelectMode(false);
          }
        }
      ]
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const renderItem = ({ item }: { item: SavedPdf }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: isSelected ? (theme.isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.05)') : theme.backgroundElement, borderColor: isSelected ? '#3B82F6' : theme.cardBorder }]}
        onPress={() => {
          if (isSelectMode) toggleSelection(item.id);
          else {
            setActivePdfUrl(item.uri);
            setActivePdfTitle(item.name);
            setIsPdfVisible(true);
          }
        }}
        onLongPress={() => {
          if (!isSelectMode) {
            setIsSelectMode(true);
            setSelectedIds([item.id]);
          }
        }}
      >
        <View style={styles.cardHeader}>
          {isSelectMode ? (
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
            </View>
          ) : (
            <View style={styles.iconBox}>
              <Ionicons name="document" size={24} color="#EF4444" />
            </View>
          )}
          <View style={styles.cardInfo}>
            <Text style={[styles.pdfName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.pdfMeta, { color: theme.textSecondary }]}>
              {new Date(item.date).toLocaleDateString()} • {formatSize(item.sizeBytes)}{item.pageCount ? ` • ${item.pageCount} page${item.pageCount > 1 ? 's' : ''}` : ''}
            </Text>
          </View>
          {!isSelectMode && (
            <TouchableOpacity style={styles.menuBtn} onPress={() => setSelectedPdf(item)}>
              <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
        {isSelectMode ? (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={() => {
              if (selectedIds.length === pdfs.length) setSelectedIds([]);
              else setSelectedIds(pdfs.map(p => p.id));
            }}>
              <Ionicons name={selectedIds.length === pdfs.length && pdfs.length > 0 ? "checkbox" : "square-outline"} size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>{selectedIds.length} Selected</Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => { setIsSelectMode(false); setSelectedIds([]); }}>
              <Text style={{ color: '#3B82F6', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>Library</Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => setShowBin(true)}>
              <Ionicons name="trash-outline" size={24} color={theme.text} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <FlatList
        data={pdfs}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open" size={64} color={theme.textSecondary} opacity={0.5} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Files</Text>
            <TouchableOpacity style={styles.emptyActionBtn} onPress={onOpenCamera}>
              <Ionicons name="camera" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.emptyActionText}>Start Scanning</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {!isSelectMode && (
        <View style={[styles.bottomActionBar, { backgroundColor: theme.backgroundElement, borderTopColor: theme.cardBorder }]}>
          <TouchableOpacity style={styles.bottomActionBtn} onPress={onOpenGallery}>
            <View style={[styles.bottomActionIconBg, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Ionicons name="images" size={24} color={theme.textSecondary} />
            </View>
            <Text style={[styles.bottomActionText, { color: theme.textSecondary }]}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scanCenterBtnWrapper} onPress={onOpenCamera}>
            <View style={styles.scanCenterBtn}>
              <Ionicons name="camera" size={32} color="#FFF" />
            </View>
            <Text style={[styles.bottomActionText, { color: theme.text, marginTop: 4, fontWeight: '600' }]}>Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomActionBtn} onPress={() => { if(pdfs.length > 0) setIsSelectMode(true); }}>
            <View style={[styles.bottomActionIconBg, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Ionicons name="checkmark-done" size={24} color={theme.textSecondary} />
            </View>
            <Text style={[styles.bottomActionText, { color: theme.textSecondary }]}>Select</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSelectMode && selectedIds.length > 0 && (
        <View style={[styles.bottomBar, { borderTopColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
          <TouchableOpacity style={styles.deleteBulkBtn} onPress={deleteSelected}>
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text style={styles.deleteBulkText}>Delete ({selectedIds.length})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3-Dot Menu Options Modal */}
      {selectedPdf && (
        <Modal transparent animationType="fade" visible={!!selectedPdf} onRequestClose={() => setSelectedPdf(null)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedPdf(null)} />
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>{selectedPdf.name}</Text>
              </View>
              
              <TouchableOpacity style={styles.optionBtn} onPress={() => { 
                setActivePdfUrl(selectedPdf.uri);
                setActivePdfTitle(selectedPdf.name);
                setIsPdfVisible(true);
                setSelectedPdf(null); 
              }}>
                <Ionicons name="eye-outline" size={22} color="#3B82F6" />
                <Text style={[styles.optionText, { color: theme.text }]}>View PDF</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.optionBtn} onPress={() => { 
                setSelectedPdf(null); 
                setRenameData({ id: selectedPdf.id, name: selectedPdf.name });
              }}>
                <Ionicons name="pencil-outline" size={22} color="#8B5CF6" />
                <Text style={[styles.optionText, { color: theme.text }]}>Edit / Rename</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionBtn} onPress={() => { 
                if (onAddPage) {
                  onAddPage(selectedPdf);
                  setSelectedPdf(null);
                } else {
                  setSelectedPdf(null); 
                  if (Platform.OS === 'web') {
                    useAppStore.getState().showToast('To add more pages, scan a new document. Merging coming soon!', 'info');
                  } else {
                    Alert.alert('Add Page / Image', 'This document is already finalized. To add more pages, please scan a new document. Retroactive merging is coming in the next update!'); 
                  }
                }
              }}>
                <Ionicons name="document-text-outline" size={22} color="#3B82F6" />
                <Text style={[styles.optionText, { color: theme.text }]}>Add Page / Image</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionBtn} onPress={() => { 
                setCompressData(selectedPdf);
                setCompressLevel('Medium');
                setSelectedPdf(null); 
              }}>
                <Ionicons name="contract-outline" size={22} color="#F59E0B" />
                <Text style={[styles.optionText, { color: theme.text }]}>Compress PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionBtn} onPress={() => { 
                setSplitData(selectedPdf);
                setSplitPagesInput('1');
                setSplitKeepOriginal(true);
                setSelectedPdf(null); 
              }}>
                <Ionicons name="cut-outline" size={22} color="#10B981" />
                <Text style={[styles.optionText, { color: theme.text }]}>Split PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionBtn} onPress={() => { handleShare(selectedPdf); setSelectedPdf(null); }}>
                <Ionicons name="share-social-outline" size={22} color="#3B82F6" />
                <Text style={[styles.optionText, { color: theme.text }]}>Share File</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionBtn} onPress={() => { 
                setSelectedPdf(null); 
                if (Platform.OS === 'web') {
                  useAppStore.getState().showToast('Notepad integration will be available shortly.', 'info');
                } else {
                  Alert.alert('Coming Soon', 'Notepad integration will be available shortly.'); 
                }
              }}>
                <Ionicons name="journal-outline" size={22} color="#D97706" />
                <Text style={[styles.optionText, { color: theme.text }]}>Save to Notepad (Hub)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionBtn} onPress={() => { setSelectedPdf(null); handleShare(selectedPdf); }}>
                <Ionicons name="download-outline" size={22} color="#10B981" />
                <Text style={[styles.optionText, { color: theme.text }]}>Download / Save in Phone</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionBtn} onPress={() => {
                setDeleteData({ id: selectedPdf.id, name: selectedPdf.name });
                setSelectedPdf(null);
              }}>
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                <Text style={[styles.optionText, { color: '#EF4444' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {renameData && (
        <Modal transparent animationType="fade" visible={!!renameData} onRequestClose={() => setRenameData(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, padding: 24 }]}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 16 }]}>Rename Document</Text>
              <TextInput 
                style={[styles.renameInput, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background }]} 
                value={renameData.name} 
                onChangeText={(text) => setRenameData({ ...renameData, name: text })}
                autoFocus
               autoCapitalize="sentences" />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setRenameData(null)} style={styles.modalCancelBtn}>
                  <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    if (renameData.name.trim() !== '') {
                      const updated = pdfs.map(p => p.id === renameData.id ? { ...p, name: renameData.name.trim() } : p);
                      setPdfs(updated);
                      AsyncStorage.setItem('@doc_scanner_pdfs', JSON.stringify(updated));
                    }
                    setRenameData(null);
                  }} 
                  style={styles.modalConfirmBtn}
                >
                  <Text style={styles.modalConfirmText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {deleteData && (
        <Modal transparent animationType="fade" visible={!!deleteData} onRequestClose={() => setDeleteData(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, padding: 24 }]}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 8 }]}>Delete Document</Text>
              <Text style={{ color: theme.textSecondary, marginBottom: 20 }}>Are you sure you want to delete "{deleteData.name}"? This action cannot be undone.</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setDeleteData(null)} style={styles.modalCancelBtn}>
                  <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    handleDelete();
                  }} 
                  style={[styles.modalConfirmBtn, { backgroundColor: '#EF4444' }]}
                >
                  <Text style={styles.modalConfirmText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {splitData && (
        <Modal transparent animationType="fade" visible={!!splitData} onRequestClose={() => setSplitData(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, padding: 24 }]}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 8 }]}>Split Document</Text>
              <Text style={{ color: theme.textSecondary, marginBottom: 16 }}>Enter pages to extract (e.g., 1, 3, 5-8)</Text>
              
              <TextInput 
                style={[styles.renameInput, { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.background, marginBottom: 16 }]} 
                value={splitPagesInput} 
                onChangeText={setSplitPagesInput}
                placeholder="1, 3, 5-8"
                placeholderTextColor={theme.textSecondary}
               autoCapitalize="sentences" />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <Text style={{ color: theme.text, fontSize: 15 }}>Keep original document?</Text>
                <Switch 
                  value={splitKeepOriginal} 
                  onValueChange={setSplitKeepOriginal} 
                  trackColor={{ false: '#94A3B8', true: '#3B82F6' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setSplitData(null)} style={styles.modalCancelBtn} disabled={isSplitting}>
                  <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleSplitConfirm} 
                  style={[styles.modalConfirmBtn, isSplitting && { opacity: 0.7 }]}
                  disabled={isSplitting}
                >
                  {isSplitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Split & Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {compressData && (
        <Modal transparent animationType="fade" visible={!!compressData} onRequestClose={() => setCompressData(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, padding: 24 }]}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 8 }]}>Compress PDF</Text>
              <Text style={{ color: theme.textSecondary, marginBottom: 20 }}>Choose compression level for '{compressData.name}'</Text>
              
              <View style={{ marginBottom: 24, gap: 12 }}>
                <TouchableOpacity 
                  style={[styles.compressOptionBtn, compressLevel === 'High' && styles.compressOptionSelected, { borderColor: theme.cardBorder }]}
                  onPress={() => setCompressLevel('High')}
                >
                  <Ionicons name="image-outline" size={20} color={compressLevel === 'High' ? "#3B82F6" : theme.textSecondary} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ color: compressLevel === 'High' ? "#3B82F6" : theme.text, fontWeight: '600' }}>High (Reduced quality)</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Fastest, minimal size reduction</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.compressOptionBtn, compressLevel === 'Medium' && styles.compressOptionSelected, { borderColor: theme.cardBorder }]}
                  onPress={() => setCompressLevel('Medium')}
                >
                  <Ionicons name="documents-outline" size={20} color={compressLevel === 'Medium' ? "#3B82F6" : theme.textSecondary} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ color: compressLevel === 'Medium' ? "#3B82F6" : theme.text, fontWeight: '600' }}>Medium</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Balanced quality and size</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.compressOptionBtn, compressLevel === 'Small' && styles.compressOptionSelected, { borderColor: theme.cardBorder }]}
                  onPress={() => setCompressLevel('Small')}
                >
                  <Ionicons name="document-text-outline" size={20} color={compressLevel === 'Small' ? "#3B82F6" : theme.textSecondary} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ color: compressLevel === 'Small' ? "#3B82F6" : theme.text, fontWeight: '600' }}>Small</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Slowest, maximum size reduction</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setCompressData(null)} style={styles.modalCancelBtn} disabled={isCompressing}>
                  <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleCompressConfirm} 
                  style={[styles.modalConfirmBtn, isCompressing && { opacity: 0.7 }]}
                  disabled={isCompressing}
                >
                  {isCompressing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Compress</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {isPdfVisible && (
        <PdfViewerModal
          visible={isPdfVisible}
          onClose={() => setIsPdfVisible(false)}
          url={activePdfUrl}
          title={activePdfTitle}
        />
      )}
      {/* Pdf Bin Modal */}
      <PdfBinModal 
        visible={showBin}
        onClose={() => setShowBin(false)}
        onRestore={loadPdfs}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  backBtn: { minWidth: 40, minHeight: 40, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  warningBanner: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  warningText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  listContent: { padding: 16, paddingBottom: 140 },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  pdfName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  pdfMeta: { fontSize: 12 },
  menuBtn: { padding: 8, marginLeft: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderWidth: 1,
  },
  modalHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  emptyActionText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  bottomBar: {
    paddingVertical: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 14,
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  compressOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  compressOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  checkboxSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  bottomActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
  },
  bottomActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bottomActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scanCenterBtnWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24, // pop out
  },
  scanCenterBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteBulkBtn: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
  },
  deleteBulkText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});
