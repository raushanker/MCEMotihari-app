import { useThemeColors } from '@/hooks/useThemeColors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PdfLibraryScreen } from './PdfLibraryScreen';

interface DocScannerScreenProps {
  onBack: () => void;
}

interface ScannedPage {
  id: string;
  uri: string;
  filter: 'original' | 'grayscale' | 'bw' | 'magic';
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const DocScannerScreen: React.FC<DocScannerScreenProps> = ({ onBack }) => {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const isDark = theme.isDark;
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLibrary, setShowLibrary] = useState(true);
  const [appendingPdf, setAppendingPdf] = useState<any>(null);

  // Crop State
  const [cropPageId, setCropPageId] = useState<string | null>(null);
  const [cropBox, setCropBox] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 }); // normalized 0-1
  const [isCropping, setIsCropping] = useState(false);
  const cropImageRef = useRef<View>(null);

  const processAndAddImage = async (uri: string) => {
    try {
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: 1000 } }], // Resize width to 1000px, height auto-scales
        { compress: 0.6, format: SaveFormat.JPEG }
      );
      addPage(manipResult.uri);
    } catch (error) {
      console.warn("Failed to compress image, using original", error);
      addPage(uri);
    }
  };

  const handleCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to scan documents.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true, // Native camera crop
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setShowLibrary(false);
        processAndAddImage(result.assets[0].uri);
      }
    } catch (e) {
      console.warn("Camera error:", e);
    }
  };

  const handleGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false, // Don't enforce native crop for multiple images
        quality: 0.8,
        allowsMultipleSelection: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setShowLibrary(false);
        result.assets.forEach(asset => processAndAddImage(asset.uri));
      }
    } catch (e) {
      console.warn("Gallery error:", e);
    }
  };

  const addPage = (uri: string) => {
    setPages(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(),
      uri,
      filter: 'original'
    }]);
  };

  const removePage = (id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
  };

  const updateFilter = (id: string, filter: 'original' | 'grayscale' | 'bw' | 'magic') => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, filter } : p));
  };

  const movePage = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= pages.length) return;
    setPages(prev => {
      const newPages = [...prev];
      const temp = newPages[index];
      newPages[index] = newPages[index + direction];
      newPages[index + direction] = temp;
      return newPages;
    });
  };

  const getCssFilter = (filterType: string) => {
    switch (filterType) {
      case 'grayscale': return '-webkit-filter: grayscale(100%) contrast(1.2); filter: grayscale(100%) contrast(1.2);';
      case 'bw': return '-webkit-filter: grayscale(100%) contrast(200%) brightness(1.2); filter: grayscale(100%) contrast(200%) brightness(1.2);';
      case 'magic': return '-webkit-filter: contrast(200%) saturate(150%) brightness(1.1); filter: contrast(200%) saturate(150%) brightness(1.1);';
      default: return '';
    }
  };

  const generatePDF = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);

    try {
      let htmlContent = `
        <html>
          <head>
            <style>
              @page { margin: 0; size: A4; } /* A4 strictly */
              body { margin: 0; padding: 0; background-color: #FFFFFF; }
              .page-container {
                width: 210mm;
                height: 297mm;
                display: flex;
                justify-content: center;
                align-items: center;
                overflow: hidden;
                page-break-after: always;
              }
              .doc-image {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
      `;

      if (Platform.OS === 'web') {
        try {
          // @ts-ignore
          const jsPDFModule = await import('jspdf/dist/jspdf.es.min.js');
          const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default.jsPDF || jsPDFModule.default;
          const doc = new jsPDF('p', 'pt', 'a4');
          const pdfWidth = doc.internal.pageSize.getWidth();
          const pdfHeight = doc.internal.pageSize.getHeight();

          const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
            const img = new window.Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = url;
          });

          const applyFilterToImage = async (img: HTMLImageElement, filterType: string): Promise<string> => {
            if (filterType === 'original') return img.src;
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return img.src;
            
            if (filterType === 'bw') {
              ctx.filter = 'grayscale(100%) contrast(200%) brightness(1.2)';
            } else if (filterType === 'grayscale') {
              ctx.filter = 'grayscale(100%) contrast(1.2)';
            } else if (filterType === 'magic') {
              ctx.filter = 'contrast(200%) saturate(150%) brightness(1.1)';
            }
            
            ctx.drawImage(img, 0, 0, img.width, img.height);
            return canvas.toDataURL('image/jpeg', 0.9);
          };

          if (appendingPdf) {
            const { PDFDocument } = await import('pdf-lib');
            const pdfDoc = await PDFDocument.load(appendingPdf.uri);
            const pdfWidth = 595;
            const pdfHeight = 842;
            
            for (let i = 0; i < pages.length; i++) {
              const page = pages[i];
              const img = await loadImage(page.uri);
              const processedUri = await applyFilterToImage(img, page.filter);
              
              const res = await fetch(processedUri);
              const imgBytes = await res.arrayBuffer();
              
              let embeddedImg;
              try {
                embeddedImg = await pdfDoc.embedJpg(imgBytes);
              } catch(e) {
                embeddedImg = await pdfDoc.embedPng(imgBytes);
              }
              
              const imgRatio = img.width / img.height;
              const pdfRatio = pdfWidth / pdfHeight;
              let finalW = pdfWidth;
              let finalH = pdfHeight;
              if (imgRatio < pdfRatio) {
                finalH = pdfHeight;
                finalW = img.width * (pdfHeight / img.height);
              } else {
                finalW = pdfWidth;
                finalH = img.height * (pdfWidth / img.width);
              }
              const x = (pdfWidth - finalW) / 2;
              const y = (pdfHeight - finalH) / 2;
              
              // Add page
              const newPage = pdfDoc.addPage([pdfWidth, pdfHeight]);
              // pdf-lib y-axis starts from bottom, but we can just draw it
              newPage.drawImage(embeddedImg, { x, y, width: finalW, height: finalH });
            }
            
            const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });
            const base64Length = pdfDataUri.length - (pdfDataUri.indexOf(',') + 1);
            const newSizeBytes = Math.floor(base64Length * 0.75);

            const updatedPdf = {
              ...appendingPdf,
              uri: pdfDataUri,
              date: new Date().toISOString(),
              sizeBytes: newSizeBytes,
            };
            
            try {
              const existing = await AsyncStorage.getItem('@doc_scanner_pdfs');
              const parsed = existing ? JSON.parse(existing) : [];
              const updatedList = parsed.map((p: any) => p.id === appendingPdf.id ? updatedPdf : p);
              
              await AsyncStorage.setItem('@doc_scanner_pdfs', JSON.stringify(updatedList));
              setPages([]);
              setAppendingPdf(null);
              setShowLibrary(true);
            } catch (storageErr) {
              console.warn('Storage error:', storageErr);
              alert("Appended successfully, but could not be saved to 'Files' due to storage limits.");
            } finally {
              setIsProcessing(false);
            }
            return;
          }

          for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            if (i > 0) doc.addPage();
            
            // Wait for image to load to get dimensions if we want to scale it,
            // but for A4 scanner we usually just stretch/contain to the A4 page.
            // Let's draw it using doc.addImage
            const img = await loadImage(page.uri);
            const processedUri = await applyFilterToImage(img, page.filter);
            
            // Calculate aspect ratio to fit inside A4 properly
            const imgRatio = img.width / img.height;
            const pdfRatio = pdfWidth / pdfHeight;
            let finalW = pdfWidth;
            let finalH = pdfHeight;
            
            if (imgRatio < pdfRatio) {
              // Image is taller than A4, fit by height
              finalH = pdfHeight;
              finalW = img.width * (pdfHeight / img.height);
            } else {
              // Image is wider than A4, fit by width
              finalW = pdfWidth;
              finalH = img.height * (pdfWidth / img.width);
            }
            
            // Center the image on the page
            const x = (pdfWidth - finalW) / 2;
            const y = (pdfHeight - finalH) / 2;
            
            doc.addImage(processedUri, 'JPEG', x, y, finalW, finalH);
          }

          const pdfDataUri = doc.output('datauristring');
          const pdfBlob = doc.output('blob');

          // Download the file
          const link = document.createElement('a');
          link.href = URL.createObjectURL(pdfBlob);
          link.download = `Scanned_Doc_${Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Save to local storage for "Files" view
          const newPdf = {
            id: Date.now().toString(),
            name: appendingPdf ? appendingPdf.name : `Scanned_Doc_${Date.now()}.pdf`,
            uri: appendingPdf ? appendingPdf.uri : '', 
            date: new Date().toISOString(),
            sizeBytes: pdfBlob.size,
            pageCount: pages.length + (appendingPdf?.pageCount || 0)
          };
          
          try {
            const existing = await AsyncStorage.getItem('@doc_scanner_pdfs');
            const parsed = existing ? JSON.parse(existing) : [];
            await AsyncStorage.setItem('@doc_scanner_pdfs', JSON.stringify([newPdf, ...parsed]));
            setPages([]);
            setShowLibrary(true);
          } catch (storageErr) {
            console.warn('Storage error:', storageErr);
            alert("PDF was downloaded successfully, but could not be saved to 'Files' because browser storage is full.");
            setPages([]);
          }
        } catch (e) {
          console.warn('jsPDF Generation Error:', e);
          alert('Failed to generate PDF. Make sure you have added images.');
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      // Native (Android/iOS) — Add appending logic
      if (appendingPdf) {
        try {
          const { PDFDocument } = await import('pdf-lib');
          const pdfSource = await FileSystem.readAsStringAsync(appendingPdf.uri, { encoding: 'base64' });
          const pdfDoc = await PDFDocument.load(pdfSource);
          const pdfWidth = 595;
          const pdfHeight = 842;
          
          for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const base64Img = await FileSystem.readAsStringAsync(page.uri, { encoding: 'base64' });
            
            let embeddedImg;
            try {
              embeddedImg = await pdfDoc.embedJpg(base64Img);
            } catch(e) {
              embeddedImg = await pdfDoc.embedPng(base64Img);
            }
            
            const imgRatio = embeddedImg.width / embeddedImg.height;
            const pdfRatio = pdfWidth / pdfHeight;
            let finalW = pdfWidth;
            let finalH = pdfHeight;
            if (imgRatio < pdfRatio) {
              finalH = pdfHeight;
              finalW = embeddedImg.width * (pdfHeight / embeddedImg.height);
            } else {
              finalW = pdfWidth;
              finalH = embeddedImg.height * (pdfWidth / embeddedImg.width);
            }
            const x = (pdfWidth - finalW) / 2;
            const y = (pdfHeight - finalH) / 2;
            
            const newPage = pdfDoc.addPage([pdfWidth, pdfHeight]);
            newPage.drawImage(embeddedImg, { x, y, width: finalW, height: finalH });
          }
          
          const pdfBytes = await pdfDoc.saveAsBase64();
          const newSizeBytes = Math.floor(pdfBytes.length * 0.75);
          
          const newPath = FileSystem.documentDirectory + 'Scanned_Doc_' + Date.now() + '.pdf';
          await FileSystem.writeAsStringAsync(newPath, pdfBytes, { encoding: 'base64' });
          
          const updatedPdf = {
            ...appendingPdf,
            uri: newPath,
            date: new Date().toISOString(),
            sizeBytes: newSizeBytes,
            pageCount: pdfDoc.getPageCount()
          };
          
          const existing = await AsyncStorage.getItem('@doc_scanner_pdfs');
          let parsed = [];
          try {
            parsed = existing ? JSON.parse(existing) : [];
          } catch(e) {}
          const updatedList = parsed.map((p: any) => p.id === appendingPdf.id ? updatedPdf : p);
          
          await AsyncStorage.setItem('@doc_scanner_pdfs', JSON.stringify(updatedList));
          
          // Optionally delete the old pdf file
          if (appendingPdf.uri !== newPath) {
            await FileSystem.deleteAsync(appendingPdf.uri, { idempotent: true });
          }

          setPages([]);
          setAppendingPdf(null);
          setShowLibrary(true);
          Alert.alert('Success', 'Pages added successfully!');
        } catch (err) {
          console.warn('Native appending error:', err);
          Alert.alert('Error', 'Failed to append pages.');
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      // Native (Android/iOS) — embed images as base64 data URIs so expo-print can render them
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        let imgSrc = page.uri;
        try {
          // Convert file:// URIs to base64 data URIs for expo-print compatibility
          const base64 = await FileSystem.readAsStringAsync(page.uri, {
            encoding: 'base64',
          });
          imgSrc = `data:image/jpeg;base64,${base64}`;
        } catch (e) {
          console.warn('[DocScanner] Failed to encode image to base64, using original URI:', e);
        }
        const cssFilter = getCssFilter(page.filter);
        htmlContent += `
          <div class="page-container">
            <img class="doc-image" src="${imgSrc}" style="${cssFilter}" />
          </div>
        `;
      }
      htmlContent += `</body></html>`;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 595, // A4 width
        height: 842 // A4 height
      });

      // Save locally to DocumentDirectory
      // @ts-ignore
      const newPath = FileSystem.documentDirectory + 'Scanned_Doc_' + Date.now() + '.pdf';
      await FileSystem.copyAsync({ from: uri, to: newPath });
      const fileInfo = await FileSystem.getInfoAsync(newPath);

      // Save metadata
      const newPdf = {
        id: Date.now().toString(),
        name: `Scanned Document ${new Date().toLocaleDateString()}`,
        uri: newPath,
        date: new Date().toISOString(),
        sizeBytes: fileInfo.exists ? fileInfo.size || 0 : 0,
        pageCount: pages.length
      };
      
      const existing = await AsyncStorage.getItem('@doc_scanner_pdfs');
      let parsed = [];
      try {
        parsed = existing ? JSON.parse(existing) : [];
        if (!Array.isArray(parsed)) parsed = [];
        // Clean out any corrupted or null entries
        parsed = parsed.filter(p => p && typeof p === 'object' && p.uri);
      } catch (err) {
        console.warn('Corrupt PDF storage data found, resetting...', err);
        parsed = [];
      }
      
      await AsyncStorage.setItem('@doc_scanner_pdfs', JSON.stringify([newPdf, ...parsed]));

      setPages([]); // Clear pages
      setShowLibrary(true); // Open Library View
      
      Alert.alert('Success', 'PDF generated and saved successfully!');
    } catch (e) {
      if (Platform.OS === 'web') {
        window.alert("Failed to generate PDF document.");
      } else {
        Alert.alert("Error", "Failed to generate PDF document.");
      }
      console.warn(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyCrop = async () => {
    if (!cropPageId) return;
    setIsCropping(true);
    try {
      const page = pages.find(p => p.id === cropPageId);
      if (!page) return;

      // In a real robust crop, we'd get image dimensions, but let's approximate based on normalized box
      // For expo-image-manipulator, we need actual pixel sizes.
      // We will perform a simple 5% margin trim as a fast "Auto Crop" if building a complex native UI is too flaky,
      // But since we want to use the box:
      // Let's get image size first:
      const { uri } = page;
      // Image.getSize is async
      Image.getSize(uri, async (width, height) => {
        try {
          const cropAction = {
            crop: {
              originX: Math.max(0, width * cropBox.x),
              originY: Math.max(0, height * cropBox.y),
              width: Math.min(width, width * cropBox.w),
              height: Math.min(height, height * cropBox.h)
            }
          };
          const result = await manipulateAsync(uri, [cropAction], { format: SaveFormat.JPEG, compress: 0.9 });
          
          setPages(prev => prev.map(p => p.id === cropPageId ? { ...p, uri: result.uri } : p));
          setCropPageId(null);
        } catch(err) {
          Alert.alert('Crop Error', 'Failed to crop image');
        } finally {
          setIsCropping(false);
        }
      }, (error) => {
        Alert.alert('Error', 'Failed to load image size');
        setIsCropping(false);
      });
    } catch (e) {
      console.warn(e);
      setIsCropping(false);
    }
  };

  const isResizing = useRef(false);
  const startCropBox = useRef({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });

  // PanResponder for Crop UI
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        const { locationX, locationY } = evt.nativeEvent;
        const workspaceW = screenWidth - 40;
        const workspaceH = workspaceW * 4 / 3;
        const currentW = cropBox.w * workspaceW;
        const currentH = cropBox.h * workspaceH;
        
        // If touch is near the bottom-right corner, treat as resize
        if (locationX > currentW - 45 && locationY > currentH - 45) {
          isResizing.current = true;
        } else {
          isResizing.current = false;
        }
        startCropBox.current = { ...cropBox };
      },
      onPanResponderMove: (evt, gestureState) => {
        const workspaceW = screenWidth - 40;
        const workspaceH = workspaceW * 4 / 3;
        
        const dx = gestureState.dx / workspaceW;
        const dy = gestureState.dy / workspaceH;
        
        if (isResizing.current) {
          const newW = Math.max(0.1, Math.min(1 - startCropBox.current.x, startCropBox.current.w + dx));
          const newH = Math.max(0.1, Math.min(1 - startCropBox.current.y, startCropBox.current.h + dy));
          setCropBox(prev => ({
            ...prev,
            w: newW,
            h: newH
          }));
        } else {
          const newX = Math.max(0, Math.min(1 - startCropBox.current.w, startCropBox.current.x + dx));
          const newY = Math.max(0, Math.min(1 - startCropBox.current.h, startCropBox.current.y + dy));
          setCropBox(prev => ({
            ...prev,
            x: newX,
            y: newY
          }));
        }
      },
    })
  ).current;

  const isEditing = pages.length > 0 || appendingPdf !== null;

  if (showLibrary || !isEditing) {
    return (
      <PdfLibraryScreen 
        onBack={() => {
          if (appendingPdf) {
            setAppendingPdf(null);
            setShowLibrary(true);
          } else {
            onBack();
          }
        }} 
        onAddPage={(pdf) => {
          setAppendingPdf(pdf);
          setPages([]);
          setShowLibrary(false);
        }}
        onOpenCamera={handleCapture}
        onOpenGallery={handleGallery}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.cardBorder, paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => {
          if (appendingPdf) {
            setAppendingPdf(null);
            setShowLibrary(true);
          } else {
            onBack();
          }
        }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {appendingPdf ? `Add Page: ${appendingPdf.name}` : 'Scan Document'}
        </Text>
        <TouchableOpacity style={styles.filesBtn} onPress={() => setShowLibrary(true)}>
          <Ionicons name="folder-open" size={22} color="#3B82F6" />
          <Text style={styles.filesText}>Files</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Empty state is no longer heavily relied upon since library is default, but kept as fallback during editing */}
        {pages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Ionicons name="document-text" size={64} color={theme.textSecondary} opacity={0.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Scans Yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Capture a document or import from your gallery.
            </Text>
          </View>
        ) : (
          <View style={styles.pagesGrid}>
            {pages.map((page, index) => (
              <View key={page.id} style={[styles.pageCard, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]}>
                
                {/* Page Controls Top */}
                <View style={styles.pageControlsHeader}>
                  <Text style={[styles.pageIndex, { color: theme.textSecondary }]}>Page {index + 1}</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => setCropPageId(page.id)} style={styles.cropIconBtn}>
                      <Ionicons name="crop" size={22} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removePage(page.id)}>
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.imageContainer, { backgroundColor: isDark ? '#000' : '#F1F5F9' }]}>
                  <Image source={{ uri: page.uri }} style={styles.pageImage} resizeMode="contain" />
                  
                  {/* Visual Filter Emulation for React Native Image Component */}
                  {page.filter !== 'original' && (
                    <View style={[
                      styles.filterOverlay, 
                      page.filter === 'bw' 
                        ? { backgroundColor: 'rgba(255,255,255,0.1)', opacity: 0.9 } // B&W simulation
                        : { backgroundColor: 'rgba(100,100,100,0.4)' } // Gray simulation
                    ]} />
                  )}
                  {page.filter !== 'original' && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{page.filter === 'bw' ? 'B&W (PDF)' : page.filter === 'magic' ? 'Scanner (PDF)' : 'Gray (PDF)'}</Text>
                    </View>
                  )}
                </View>

                {/* Filter Controls */}
                <View style={styles.filterRow}>
                  {(['original', 'magic', 'bw', 'grayscale'] as const).map(f => (
                    <TouchableOpacity 
                      key={f}
                      style={[
                        styles.filterBtn, 
                        page.filter === f ? { backgroundColor: '#3B82F6' } : { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder, borderWidth: 1 }
                      ]}
                      onPress={() => updateFilter(page.id, f)}
                    >
                      <Text style={[
                        styles.filterBtnText, 
                        page.filter === f ? { color: '#FFF' } : { color: theme.textSecondary }
                      ]}>
                        {f === 'original' ? 'Color' : f === 'bw' ? 'B&W' : f === 'magic' ? 'Scanner' : 'Gray'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Reorder Controls */}
                <View style={styles.reorderRow}>
                  <TouchableOpacity 
                    disabled={index === 0} 
                    style={[styles.reorderBtn, index === 0 && { opacity: 0.3 }]}
                    onPress={() => movePage(index, -1)}
                  >
                    <Ionicons name="arrow-up" size={18} color={theme.text} />
                    <Text style={[styles.reorderText, { color: theme.text }]}>Move Up</Text>
                  </TouchableOpacity>
                  
                  <View style={[styles.reorderDivider, { backgroundColor: theme.cardBorder }]} />
                  
                  <TouchableOpacity 
                    disabled={index === pages.length - 1} 
                    style={[styles.reorderBtn, index === pages.length - 1 && { opacity: 0.3 }]}
                    onPress={() => movePage(index, 1)}
                  >
                    <Ionicons name="arrow-down" size={18} color={theme.text} />
                    <Text style={[styles.reorderText, { color: theme.text }]}>Move Down</Text>
                  </TouchableOpacity>
                </View>

              </View>
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={[styles.fabContainer, { 
        backgroundColor: theme.backgroundElement, 
        borderTopColor: theme.cardBorder,
        paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === 'android' ? 24 : 0)
      }]}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} onPress={handleGallery}>
            <Ionicons name="images" size={24} color="#3B82F6" />
            <Text style={[styles.actionText, { color: theme.text }]}>Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.cardBorder }]} onPress={handleCapture}>
            <Ionicons name="camera" size={24} color="#10B981" />
            <Text style={[styles.actionText, { color: theme.text }]}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.exportBtn, pages.length === 0 && { opacity: 0.5 }]} 
            disabled={pages.length === 0 || isProcessing}
            onPress={generatePDF}
          >
            {isProcessing ? (
               <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name={appendingPdf ? "duplicate" : "document"} size={20} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.exportBtnText}>{appendingPdf ? "Add pages" : "Save PDF"}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Crop Modal Overlay */}
      {cropPageId && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setCropPageId(null)}>
          <View style={styles.cropModalOverlay}>
            <View style={[styles.cropModalContainer, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.cropHeader}>
                <Text style={[styles.cropTitle, { color: theme.text }]}>Adjust Crop</Text>
              </View>
              
              <View style={styles.cropWorkspace} ref={cropImageRef}>
                <Image 
                  source={{ uri: pages.find(p => p.id === cropPageId)?.uri }} 
                  style={{ width: '100%', height: '100%' }} 
                  resizeMode="contain" 
                />
                
                {/* Crop Box UI */}
                <View 
                  style={[
                    styles.cropBox, 
                    { 
                      left: `${cropBox.x * 100}%`, 
                      top: `${cropBox.y * 100}%`, 
                      width: `${cropBox.w * 100}%`, 
                      height: `${cropBox.h * 100}%` 
                    }
                  ]}
                  {...panResponder.panHandlers}
                >
                  <View style={[styles.cropCorner, styles.cropCornerTL]} />
                  <View style={[styles.cropCorner, styles.cropCornerTR]} />
                  <View style={[styles.cropCorner, styles.cropCornerBL]} />
                  <View style={[styles.cropCorner, styles.cropCornerBR]} />
                </View>
              </View>

              {/* Bottom Action Buttons */}
              <View style={styles.cropFooter}>
                <View style={styles.cropActionRow}>
                  <TouchableOpacity 
                    style={[styles.cropCancelBtn, { backgroundColor: theme.isDark ? '#334155' : '#F1F5F9' }]} 
                    onPress={() => setCropPageId(null)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={20} color={theme.text} style={{ marginRight: 6 }} />
                    <Text style={[styles.cropActionText, { color: theme.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.cropApplyBtn} 
                    onPress={handleApplyCrop}
                    disabled={isCropping}
                    activeOpacity={0.8}
                  >
                    {isCropping ? (
                      <ActivityIndicator color="#FFF" style={{ marginRight: 6 }} />
                    ) : (
                      <Ionicons name="checkmark" size={22} color="#FFF" style={{ marginRight: 6 }} />
                    )}
                    <Text style={[styles.cropActionText, { color: '#FFF' }]}>{isCropping ? 'Applying...' : 'Apply Crop'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 56,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  filesBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  filesText: { color: '#3B82F6', fontWeight: '600', fontSize: 13 },
  scrollContent: { padding: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIconBox: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', maxWidth: '80%', lineHeight: 22 },
  pagesGrid: { gap: 16 },
  pageCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  pageControlsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  pageIndex: { fontSize: 14, fontWeight: '700' },
  cropIconBtn: { padding: 2 },
  imageContainer: { width: '100%', aspectRatio: 3 / 4, position: 'relative' },
  pageImage: { width: '100%', height: '100%' },
  filterOverlay: { ...StyleSheet.absoluteFillObject, mixBlendMode: 'color' as any },
  filterBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  filterBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  filterRow: { flexDirection: 'row', padding: 12, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  filterBtnText: { fontSize: 12, fontWeight: '600' },
  reorderRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)' },
  reorderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  reorderText: { fontSize: 13, fontWeight: '600' },
  reorderDivider: { width: 1, height: '100%' },
  fabContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 16 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionText: { fontSize: 14, fontWeight: '600' },
  exportBtn: { flex: 1.5, height: 50, borderRadius: 12, backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  exportBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  cropModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  cropModalContainer: { borderRadius: 16, overflow: 'hidden', paddingBottom: 20 },
  cropHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  cropTitle: { fontSize: 18, fontWeight: '700' },
  cropWorkspace: { width: '100%', aspectRatio: 3/4, backgroundColor: '#000', position: 'relative' },
  cropBox: { position: 'absolute', borderWidth: 2, borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  cropCorner: { position: 'absolute', width: 20, height: 20, backgroundColor: '#3B82F6', borderRadius: 10 },
  cropCornerTL: { top: -10, left: -10 },
  cropCornerTR: { top: -10, right: -10 },
  cropCornerBL: { bottom: -10, left: -10 },
  cropCornerBR: { bottom: -10, right: -10 },
  cropFooter: { padding: 16, paddingTop: 20 },
  cropActionRow: { flexDirection: 'row', gap: 12 },
  cropCancelBtn: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cropApplyBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cropActionText: { fontSize: 15, fontWeight: '700' },
});
