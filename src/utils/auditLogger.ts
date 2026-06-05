import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface AuditLogParams {
  adminUid: string;
  adminName: string;
  adminEmail: string;
  action: string;
  targetId: string;
  targetType: string;
  details?: string;
}

export const logAdminAction = async (params: AuditLogParams) => {
  try {
    const logsRef = collection(db, 'admin_logs');
    await addDoc(logsRef, {
      ...params,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};
