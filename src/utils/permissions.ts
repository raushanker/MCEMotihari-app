export function canReportContent(
  currentUserId?: string | null, 
  ownerId?: string | null,
  currentUserName?: string | null,
  ownerName?: string | null
): boolean {
  if (!currentUserId) return false;
  
  // If UID is present, check against currentUserId
  if (ownerId) {
    return currentUserId !== ownerId;
  }
  
  // Fallback to name check if ownerId is missing but names are present
  if (ownerName && currentUserName) {
    return ownerName !== currentUserName;
  }

  // If content has no owner info at all, allow report
  return true;
}
