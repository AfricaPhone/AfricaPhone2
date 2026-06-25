import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { getAdminBucket, getAdminDb } from '@/lib/firebaseAdmin';

const CONFIG_COLLECTION = 'config';
const CONTRACT_TEMPLATE_DOC = 'cotisationContractTemplate';
const CONTRACT_TEMPLATE_STORAGE_ROOT = 'contract-templates';
const DEFAULT_CONTRACT_TEMPLATE_FILE_NAME = 'engagement-depot-progressif-africa-phone.pdf';
const DEFAULT_CONTRACT_TEMPLATE_PUBLIC_PATH = `/contracts/${DEFAULT_CONTRACT_TEMPLATE_FILE_NAME}`;
const DEFAULT_CONTRACT_TEMPLATE_CONTENT_TYPE = 'application/pdf';
const MAX_CONTRACT_TEMPLATE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTRACT_TEMPLATE_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export type CotisationContractTemplate = {
  fileName: string;
  downloadUrl: string;
  storagePath: string;
  contentType: string;
  size: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

const toCleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const toIsoString = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.valueOf()) ? null : value.toISOString();
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? null : date.toISOString();
  }

  if (typeof value === 'object' && value !== null) {
    const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return Number.isNaN(date.valueOf()) ? null : date.toISOString();
    }

    const seconds = typeof timestamp.seconds === 'number' ? timestamp.seconds : timestamp._seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000).toISOString();
    }
  }

  return null;
};

const sanitizeFileName = (value: string) => {
  const cleaned = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);

  return cleaned || 'contrat-cotisation.pdf';
};

const extensionFromContentType = (contentType: string) => {
  if (contentType === 'application/pdf') {
    return '.pdf';
  }
  if (contentType === 'application/msword') {
    return '.doc';
  }
  if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return '.docx';
  }
  return '';
};

const buildDownloadUrl = (bucketName: string, storagePath: string, token: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;

const serializeTemplate = (data: DocumentData | undefined): CotisationContractTemplate | null => {
  if (!data) {
    return null;
  }

  const fileName = toCleanString(data.fileName);
  const downloadUrl = toCleanString(data.downloadUrl);
  const storagePath = toCleanString(data.storagePath);
  if (!fileName || !downloadUrl || !storagePath) {
    return null;
  }

  const size = Number(data.size || 0);

  return {
    fileName,
    downloadUrl,
    storagePath,
    contentType: toCleanString(data.contentType) || 'application/pdf',
    size: Number.isFinite(size) ? size : 0,
    updatedAt: toIsoString(data.updatedAt),
    updatedBy: toCleanString(data.updatedBy) || null,
  };
};

const getDefaultCotisationContractTemplate = async (): Promise<CotisationContractTemplate> => {
  let size = 0;
  try {
    const fileStats = await stat(join(process.cwd(), 'public', 'contracts', DEFAULT_CONTRACT_TEMPLATE_FILE_NAME));
    size = fileStats.size;
  } catch {
    size = 0;
  }

  return {
    fileName: DEFAULT_CONTRACT_TEMPLATE_FILE_NAME,
    downloadUrl: DEFAULT_CONTRACT_TEMPLATE_PUBLIC_PATH,
    storagePath: DEFAULT_CONTRACT_TEMPLATE_PUBLIC_PATH,
    contentType: DEFAULT_CONTRACT_TEMPLATE_CONTENT_TYPE,
    size,
    updatedAt: null,
    updatedBy: null,
  };
};

export const getCotisationContractTemplate = async () => {
  const snapshot = await getAdminDb().collection(CONFIG_COLLECTION).doc(CONTRACT_TEMPLATE_DOC).get();
  return serializeTemplate(snapshot.data()) ?? getDefaultCotisationContractTemplate();
};

export const uploadCotisationContractTemplate = async (params: {
  file: File;
  updatedBy: string;
}) => {
  const contentType = params.file.type || 'application/octet-stream';
  if (!ALLOWED_CONTRACT_TEMPLATE_TYPES.has(contentType)) {
    throw new Error('Format non accepte. Ajoutez un PDF, DOC ou DOCX.');
  }

  if (params.file.size <= 0 || params.file.size > MAX_CONTRACT_TEMPLATE_BYTES) {
    throw new Error('Le contrat doit peser moins de 10 Mo.');
  }

  const originalName = sanitizeFileName(params.file.name || `contrat-cotisation${extensionFromContentType(contentType)}`);
  const finalName = originalName.includes('.') ? originalName : `${originalName}${extensionFromContentType(contentType)}`;
  const storagePath = `${CONTRACT_TEMPLATE_STORAGE_ROOT}/${Date.now()}-${randomUUID()}-${finalName}`;
  const downloadToken = randomUUID();
  const bucket = getAdminBucket();
  const fileRef = bucket.file(storagePath);
  const buffer = Buffer.from(await params.file.arrayBuffer());

  await fileRef.save(buffer, {
    contentType,
    resumable: false,
    metadata: {
      contentDisposition: `inline; filename="${finalName.replace(/"/g, '')}"`,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  const payload = {
    fileName: finalName,
    downloadUrl: buildDownloadUrl(bucket.name, storagePath, downloadToken),
    storagePath,
    contentType,
    size: params.file.size,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: params.updatedBy,
  };

  await getAdminDb().collection(CONFIG_COLLECTION).doc(CONTRACT_TEMPLATE_DOC).set(payload, { merge: true });

  return {
    ...payload,
    updatedAt: new Date().toISOString(),
  } satisfies CotisationContractTemplate;
};
