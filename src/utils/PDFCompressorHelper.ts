export const compressPDF = async (uri: string, _sizeInMb: number): Promise<string> => {
  if (__DEV__) { console.log("[UPLOAD_TRACE] Compression bypassed (Web/Unsupported platform)"); }
  return uri;
};
