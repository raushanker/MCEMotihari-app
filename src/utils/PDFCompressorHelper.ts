export const compressPDF = async (uri: string, _sizeInMb: number): Promise<string> => {
  console.log("[UPLOAD_TRACE] Compression bypassed (Web/Unsupported platform)");
  return uri;
};
