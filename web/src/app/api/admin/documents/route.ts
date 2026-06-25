import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import type {
  CustomerDocument,
  CustomerDocumentStatus,
  CustomerNotification,
  FirestoreTimestampLike,
} from '@/types/customerOrders';

const DOCUMENT_STATUSES = new Set<CustomerDocumentStatus>([
  'uploaded',
  'under_review',
  'approved',
  'rejected',
  'expired',
]);

const errorResponse = (message: string, status = 400) => NextResponse.json({ message }, { status });

const toIsoString = (value: FirestoreTimestampLike): string | null => {
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

const normalizeDocumentSnapshot = (id: string, data: DocumentData): CustomerDocument => ({
  ...(data as CustomerDocument),
  id,
});

const serializeDocumentForAdmin = (document: CustomerDocument, fallbackId?: string) => ({
  ...document,
  id: document.id || fallbackId || '',
  createdAt: toIsoString(document.createdAt),
  reviewedAt: toIsoString(document.reviewedAt),
  qrVerification: document.qrVerification
    ? {
        ...document.qrVerification,
        checkedAt: toIsoString(document.qrVerification.checkedAt),
      }
    : document.qrVerification ?? null,
});

const sortDocumentsForAdmin = (documents: ReturnType<typeof serializeDocumentForAdmin>[]) =>
  [...documents].sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''));

const requireAdmin = async (request: NextRequest) => {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return { ok: false as const, response: errorResponse('Session admin requise.', 401) };
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    if (decodedToken.admin !== true) {
      return { ok: false as const, response: errorResponse('Droits admin requis.', 403) };
    }

    return { ok: true as const, uid: decodedToken.uid };
  } catch (error) {
    console.error('admin documents: invalid token', error);
    return { ok: false as const, response: errorResponse('Session admin invalide ou expiree.', 401) };
  }
};

const buildDocumentNotification = (
  document: CustomerDocument,
  status: CustomerDocumentStatus
): Omit<CustomerNotification, 'id'> | null => {
  if (!document.userId) {
    return null;
  }

  if (document.type === 'signed_contract') {
    if (status === 'approved') {
      return {
        userId: document.userId,
        orderId: document.orderId,
        type: 'contract_review',
        title: 'Contrat valide',
        message: 'Votre contrat signe a ete valide par AfricaPhone. Le dossier de cotisation peut etre active.',
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      };
    }

    if (status === 'rejected') {
      return {
        userId: document.userId,
        orderId: document.orderId,
        type: 'contract_review',
        title: 'Contrat a reprendre',
        message: 'Votre contrat signe doit etre corrige ou renvoye avant activation de la cotisation.',
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      };
    }
  }

  if (document.type === 'identity_card' && status === 'approved') {
    return {
      userId: document.userId,
      orderId: document.orderId,
      type: 'documents_required',
      title: 'Piece validee',
      message: 'Votre piece d identite a ete validee par AfricaPhone.',
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    };
  }

  return null;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin(request);
  if (!adminResult.ok) {
    return adminResult.response;
  }

  try {
    const snapshot = await getAdminDb().collection('customerDocuments').orderBy('createdAt', 'desc').limit(150).get();
    const documents = snapshot.docs.map(docSnap =>
      serializeDocumentForAdmin(normalizeDocumentSnapshot(docSnap.id, docSnap.data()), docSnap.id)
    );

    return NextResponse.json({ documents: sortDocumentsForAdmin(documents) });
  } catch (error) {
    console.error('admin documents: list failed', error);
    return errorResponse('Impossible de charger les documents admin.', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const adminResult = await requireAdmin(request);
  if (!adminResult.ok) {
    return adminResult.response;
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse('Requete invalide.', 400);
  }

  if (!payload || typeof payload !== 'object') {
    return errorResponse('Requete invalide.', 400);
  }

  const body = payload as {
    documentId?: unknown;
    status?: unknown;
    rejectionReason?: unknown;
  };
  const documentId = typeof body.documentId === 'string' ? body.documentId.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : '';

  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(documentId)) {
    return errorResponse('Document invalide.', 400);
  }

  if (!DOCUMENT_STATUSES.has(status as CustomerDocumentStatus)) {
    return errorResponse('Statut document invalide.', 400);
  }

  try {
    const adminDb = getAdminDb();
    const documentRef = adminDb.collection('customerDocuments').doc(documentId);

    await adminDb.runTransaction(async transaction => {
      const documentSnapshot = await transaction.get(documentRef);
      if (!documentSnapshot.exists) {
        throw new Error('DOCUMENT_NOT_FOUND');
      }

      const currentDocument = normalizeDocumentSnapshot(documentSnapshot.id, documentSnapshot.data() ?? {});
      const updatePayload: Record<string, unknown> = {
        status,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: adminResult.uid,
        updatedAt: FieldValue.serverTimestamp(),
        rejectionReason: status === 'rejected' && typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() || null : null,
      };

      transaction.update(documentRef, updatePayload);

      const notification = buildDocumentNotification(currentDocument, status as CustomerDocumentStatus);
      if (notification) {
        const notificationRef = adminDb.collection('customerNotifications').doc();
        transaction.set(notificationRef, {
          id: notificationRef.id,
          ...notification,
        });
      }
    });

    const updatedSnapshot = await documentRef.get();
    if (!updatedSnapshot.exists) {
      return errorResponse('Document introuvable.', 404);
    }

    return NextResponse.json({
      document: serializeDocumentForAdmin(
        normalizeDocumentSnapshot(updatedSnapshot.id, updatedSnapshot.data() ?? {}),
        updatedSnapshot.id
      ),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'DOCUMENT_NOT_FOUND') {
      return errorResponse('Document introuvable.', 404);
    }

    console.error('admin documents: update failed', error);
    return errorResponse('Impossible de mettre a jour le document.', 500);
  }
}
