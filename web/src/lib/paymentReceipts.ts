import { auth } from '@/lib/firebaseClient';

type ReceiptDownloadTarget =
  | { orderId: string; paymentId?: never }
  | { paymentId: string; orderId?: never };

const getReceiptFileName = (contentDisposition: string | null, fallback: string) => {
  const match = /filename="([^"]+)"/i.exec(contentDisposition || '');
  return match?.[1] || fallback;
};

const buildReceiptUrl = (target: ReceiptDownloadTarget) => {
  const params = new URLSearchParams();
  if ('orderId' in target && target.orderId) {
    params.set('orderId', target.orderId);
  } else if ('paymentId' in target && target.paymentId) {
    params.set('paymentId', target.paymentId);
  } else {
    throw new Error('Reference de recu manquante.');
  }

  return `/api/payments/receipt?${params.toString()}`;
};

export const downloadPaymentReceipt = async (target: ReceiptDownloadTarget) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Connectez votre compte client pour telecharger le recu.');
  }

  const token = await user.getIdToken();
  const response = await fetch(buildReceiptUrl(target), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || 'Telechargement du recu indisponible.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getReceiptFileName(response.headers.get('content-disposition'), 'recu-africaphone.html');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
