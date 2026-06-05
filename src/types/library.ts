export interface LibraryMaterial {
  id: string;
  title: string;
  subject: string;
  branch: string;
  semester: string;
  materialType: string;
  description: string;
  fileUrl: string;
  isLink: boolean;
  ownerUid: string;
  uploaderName: string;
  uploaderEmail?: string;
  visibility: 'PUBLIC' | 'ANONYMOUS' | 'DEPARTMENT_ONLY';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reportCount: number;
  createdAt: string;
  storagePath?: string;
}
