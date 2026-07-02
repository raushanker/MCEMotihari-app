// Native PDF Compressor Helper using react-native-pdf-jsi
let PDFCompressor: any = null;
let CompressionPreset: any = null;

try {
  const pdfJsi = require('react-native-pdf-jsi');
  PDFCompressor = pdfJsi.PDFCompressor;
  CompressionPreset = pdfJsi.CompressionPreset;
} catch (e) {
  if (__DEV__) { console.log("[UPLOAD_TRACE] react-native-pdf-jsi is not available in this native build environment."); }
}

export const compressPDF = async (uri: string, sizeInMb: number): Promise<string> => {
  if (sizeInMb > 10 && PDFCompressor && CompressionPreset) {
    try {
      if (__DEV__) { console.log("[UPLOAD_TRACE] Native COMPRESSING started for file: " + sizeInMb.toFixed(2) + "MB"); }
      const result = await PDFCompressor.compressWithPreset(uri, CompressionPreset.WEB);
      const finalPath = result.compressedPath || result.path || uri;
      if (__DEV__) { console.log("[UPLOAD_TRACE] Native COMPRESSION_SUCCESS. Compressed path: " + finalPath); }
      return finalPath;
    } catch (compressErr: any) {
      console.warn("[UPLOAD_TRACE] Native PDF compression failed, using original: " + (compressErr.message || String(compressErr)));
    }
  } else {
    if (__DEV__) { console.log("[UPLOAD_TRACE] Compression skipped. Size: " + sizeInMb.toFixed(2) + "MB, Available: " + !!PDFCompressor); }
  }
  return uri;
};
