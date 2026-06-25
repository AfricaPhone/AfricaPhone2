import type { User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import {
  buildCustomerDocumentStoragePath,
  type CustomerDocumentStatus,
  type CustomerDocumentType,
} from '@/types/customerOrders';
import { db, storage } from './firebaseClient';

export type CustomerDocumentUploadResult = {
  id: string;
  type: CustomerDocumentType;
  status: CustomerDocumentStatus;
  fileName: string;
  storagePath: string;
  contentType: string;
  size: number;
};

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_DOCUMENT_TYPES = new Set([...ALLOWED_IMAGE_TYPES, 'application/pdf']);

const ACCEPT_BY_TYPE: Record<CustomerDocumentType, string> = {
  profile_photo: 'image/jpeg,image/png,image/webp',
  identity_card: 'image/jpeg,image/png,image/webp,application/pdf',
  signed_contract: 'image/jpeg,image/png,image/webp,application/pdf',
  representative_identity_card: 'image/jpeg,image/png,image/webp,application/pdf',
};

export const getCustomerDocumentAccept = (documentType: CustomerDocumentType) => ACCEPT_BY_TYPE[documentType];

const createDocumentId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const validateCustomerDocumentFile = (documentType: CustomerDocumentType, file: File) => {
  const allowedTypes = documentType === 'profile_photo' ? ALLOWED_IMAGE_TYPES : ALLOWED_DOCUMENT_TYPES;
  const maxSize = documentType === 'profile_photo' ? MAX_PROFILE_PHOTO_SIZE : MAX_DOCUMENT_SIZE;

  if (!allowedTypes.has(file.type)) {
    throw new Error(
      documentType === 'profile_photo'
        ? 'La photo doit etre une image JPG, PNG ou WebP.'
        : 'Le document doit etre une image ou un PDF.'
    );
  }

  if (file.size > maxSize) {
    throw new Error(documentType === 'profile_photo' ? 'La photo depasse 5 Mo.' : 'Le document depasse 10 Mo.');
  }
};

export const uploadCustomerDocument = async (params: {
  user: User;
  file: File;
  documentType: CustomerDocumentType;
  orderId?: string | null;
  installmentPlanId?: string | null;
}): Promise<CustomerDocumentUploadResult> => {
  const { user, file, documentType, orderId = null, installmentPlanId = null } = params;
  validateCustomerDocumentFile(documentType, file);

  const documentId = createDocumentId();
  const storagePath = buildCustomerDocumentStoragePath({
    userId: user.uid,
    documentType,
    documentId,
    fileName: file.name,
  });
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      source: 'web-customer',
      userId: user.uid,
      documentId,
      documentType,
    },
  });

  const status: CustomerDocumentStatus = 'under_review';
  const contractVerification =
    documentType === 'signed_contract'
      ? {
          contractReference: null,
          qrVerification: {
            status: 'manual_review',
            extractedReference: null,
            matchedInstallmentPlanId: installmentPlanId,
            checkedAt: null,
            error: 'Controle QR automatique a venir. Validation admin obligatoire.',
          },
        }
      : {};

  await setDoc(doc(db, 'customerDocuments', documentId), {
    id: documentId,
    userId: user.uid,
    orderId,
    installmentPlanId,
    type: documentType,
    status,
    storagePath,
    downloadUrl: null,
    fileName: file.name,
    contentType: file.type,
    size: file.size,
    ...contractVerification,
    rejectionReason: null,
    createdAt: serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
  });

  return {
    id: documentId,
    type: documentType,
    status,
    fileName: file.name,
    storagePath,
    contentType: file.type,
    size: file.size,
  };
};
