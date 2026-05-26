import api from './authApi';

export interface DocumentInfo {
  id: string;
  fileName: string;
  createdAt: string;
}

export async function getDocuments(): Promise<DocumentInfo[]> {
  const { data } = await api.get('/admin/document');
  return data.data as DocumentInfo[];
}

export async function uploadDocument(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  await api.post('/admin/document/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/admin/document/${documentId}`);
}
