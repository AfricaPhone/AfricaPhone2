import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import type { CustomerNotification, FirestoreTimestampLike } from '@/types/customerOrders';

const NOTIFICATION_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

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

const getAuthenticatedUserId = async (request: NextRequest) => {
  const authorization = request.headers.get('authorization') ?? '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return { ok: false as const, response: errorResponse('Compte client requis pour suivre les notifications.', 401) };
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    return { ok: true as const, userId: decodedToken.uid };
  } catch (error) {
    console.error('notifications: invalid client token', error);
    return { ok: false as const, response: errorResponse('Session client invalide ou expiree.', 401) };
  }
};

const normalizeNotificationSnapshot = (id: string, data: DocumentData): CustomerNotification => ({
  ...(data as CustomerNotification),
  id,
});

const serializeNotification = (notification: CustomerNotification, fallbackId?: string) => ({
  id: notification.id || fallbackId || '',
  userId: notification.userId,
  orderId: notification.orderId || null,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  read: notification.read === true,
  createdAt: toIsoString(notification.createdAt),
});

const sortNotifications = (notifications: ReturnType<typeof serializeNotification>[]) =>
  [...notifications].sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''));

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUserId(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const snapshot = await getAdminDb()
      .collection('customerNotifications')
      .where('userId', '==', authResult.userId)
      .limit(100)
      .get();
    const notifications = sortNotifications(
      snapshot.docs.map(docSnap => serializeNotification(normalizeNotificationSnapshot(docSnap.id, docSnap.data()), docSnap.id))
    );

    return NextResponse.json({
      authenticated: true,
      unreadCount: notifications.filter(notification => !notification.read).length,
      notifications,
    });
  } catch (error) {
    console.error('notifications: list failed', error);
    return errorResponse('Impossible de charger les notifications.', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await getAuthenticatedUserId(request);
  if (!authResult.ok) {
    return authResult.response;
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

  const body = payload as { notificationId?: unknown; read?: unknown };
  const notificationId = typeof body.notificationId === 'string' ? body.notificationId.trim() : '';

  if (!NOTIFICATION_ID_PATTERN.test(notificationId)) {
    return errorResponse('Notification invalide.', 400);
  }

  if (typeof body.read !== 'boolean') {
    return errorResponse('Statut de lecture invalide.', 400);
  }

  try {
    const notificationRef = getAdminDb().collection('customerNotifications').doc(notificationId);
    const notificationSnapshot = await notificationRef.get();

    if (!notificationSnapshot.exists) {
      return errorResponse('Notification introuvable.', 404);
    }

    const notification = normalizeNotificationSnapshot(notificationSnapshot.id, notificationSnapshot.data() ?? {});
    if (notification.userId !== authResult.userId) {
      return errorResponse('Notification non autorisee.', 403);
    }

    await notificationRef.update({
      read: body.read,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedSnapshot = await notificationRef.get();
    return NextResponse.json({
      notification: serializeNotification(
        normalizeNotificationSnapshot(updatedSnapshot.id, updatedSnapshot.data() ?? {}),
        updatedSnapshot.id
      ),
    });
  } catch (error) {
    console.error('notifications: update failed', error);
    return errorResponse('Impossible de mettre a jour la notification.', 500);
  }
}
