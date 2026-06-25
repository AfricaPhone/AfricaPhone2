import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import type {
  FirestoreTimestampLike,
  InstallmentPlan,
  InstallmentPlanScheduleItem,
  InstallmentPlanStatus,
} from '@/types/customerOrders';

const INSTALLMENT_STATUSES = new Set<InstallmentPlanStatus>([
  'draft',
  'documents_required',
  'contract_review',
  'active',
  'late',
  'completed',
  'cancelled',
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

const normalizeInstallmentSnapshot = (id: string, data: DocumentData): InstallmentPlan => ({
  ...(data as InstallmentPlan),
  id,
});

const serializeScheduleItem = (item: InstallmentPlanScheduleItem): InstallmentPlanScheduleItem & { dueAt: string | null } => ({
  ...item,
  dueAt: toIsoString(item.dueAt),
});

const serializeInstallmentPlanForAdmin = (plan: InstallmentPlan, fallbackId?: string) => ({
  ...plan,
  id: plan.id || fallbackId || '',
  createdAt: toIsoString(plan.createdAt),
  updatedAt: toIsoString(plan.updatedAt),
  activatedAt: toIsoString(plan.activatedAt),
  schedule: Array.isArray(plan.schedule) ? plan.schedule.map(serializeScheduleItem) : [],
});

const sortInstallmentsForAdmin = (plans: ReturnType<typeof serializeInstallmentPlanForAdmin>[]) =>
  [...plans].sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''));

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
    console.error('admin installments: invalid token', error);
    return { ok: false as const, response: errorResponse('Session admin invalide ou expiree.', 401) };
  }
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminResult = await requireAdmin(request);
  if (!adminResult.ok) {
    return adminResult.response;
  }

  try {
    const snapshot = await getAdminDb().collection('installmentPlans').orderBy('createdAt', 'desc').limit(100).get();
    const installments = snapshot.docs.map(docSnap =>
      serializeInstallmentPlanForAdmin(normalizeInstallmentSnapshot(docSnap.id, docSnap.data()), docSnap.id)
    );

    return NextResponse.json({ installments: sortInstallmentsForAdmin(installments) });
  } catch (error) {
    console.error('admin installments: list failed', error);
    return errorResponse('Impossible de charger les cotisations admin.', 500);
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
    installmentPlanId?: unknown;
    status?: unknown;
  };
  const installmentPlanId = typeof body.installmentPlanId === 'string' ? body.installmentPlanId.trim() : '';

  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(installmentPlanId)) {
    return errorResponse('Dossier cotisation invalide.', 400);
  }

  if (typeof body.status !== 'string' || !INSTALLMENT_STATUSES.has(body.status as InstallmentPlanStatus)) {
    return errorResponse('Statut cotisation invalide.', 400);
  }

  try {
    const installmentRef = getAdminDb().collection('installmentPlans').doc(installmentPlanId);
    const updatePayload: Record<string, unknown> = {
      status: body.status,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminResult.uid,
    };
    if (body.status === 'active') {
      updatePayload.activatedAt = FieldValue.serverTimestamp();
      updatePayload.activatedBy = adminResult.uid;
    }
    await installmentRef.update({
      ...updatePayload,
    });
    const updatedSnapshot = await installmentRef.get();

    if (!updatedSnapshot.exists) {
      return errorResponse('Dossier cotisation introuvable.', 404);
    }

    return NextResponse.json({
      installment: serializeInstallmentPlanForAdmin(
        normalizeInstallmentSnapshot(updatedSnapshot.id, updatedSnapshot.data() ?? {}),
        updatedSnapshot.id
      ),
    });
  } catch (error) {
    console.error('admin installments: update failed', error);
    return errorResponse('Impossible de mettre a jour la cotisation.', 500);
  }
}
