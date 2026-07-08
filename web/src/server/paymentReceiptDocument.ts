import type { CustomerOrder, OrderPayment } from '@/types/customerOrders';
import { formatPrice } from '@/utils/formatPrice';

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateTime = (value: Date | string | null | undefined) => {
  if (!value) {
    return 'Date non renseignee';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return 'Date non renseignee';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const formatOrderReference = (order: CustomerOrder) => {
  const raw = String(order.referenceCode || order.localDraftId || order.id || '').trim();
  if (!raw) {
    return 'Commande AfricaPhone';
  }

  const controlledReferenceMatch = /^AP-(\d{6})-([A-Z2-9]{4}-[A-Z2-9]{4})-([A-Z2-9]{2})$/i.exec(raw);
  if (controlledReferenceMatch) {
    const [, datePart, randomPart, checkPart] = controlledReferenceMatch;
    return `Demande ${datePart.slice(4, 6)}/${datePart.slice(2, 4)} #${randomPart.toUpperCase()}-${checkPart.toUpperCase()}`;
  }

  const randomReferenceMatch = /^AFP-([A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4})$/i.exec(raw);
  if (randomReferenceMatch) {
    return `Demande #${randomReferenceMatch[1].toUpperCase()}`;
  }

  const draftMatch = /^AFP-(\d{8})-([A-Z0-9]+)$/i.exec(raw);
  if (draftMatch) {
    const [, , suffix] = draftMatch;
    return `Demande #${suffix.toUpperCase()}`;
  }

  return `Commande #${raw.slice(-6).toUpperCase()}`;
};

const normalizeFilePart = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const readPaymentDate = (payment: OrderPayment) => {
  const value = payment.verifiedAt || payment.updatedAt || payment.createdAt;

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string') {
    return new Date(value);
  }

  if (typeof value === 'object' && value !== null) {
    const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }

    const seconds = typeof timestamp.seconds === 'number' ? timestamp.seconds : timestamp._seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000);
    }
  }

  return new Date();
};

const getFulfillmentLabel = (order: CustomerOrder) => {
  if (order.fulfillmentMode === 'delivery') {
    return 'Livraison';
  }

  if (order.fulfillmentMode === 'representative_pickup') {
    return 'Retrait par representant';
  }

  return 'Retrait client en boutique';
};

const getPaymentPurpose = (payment: OrderPayment) =>
  payment.channel === 'installment_payment' ? 'Versement cotisation' : 'Achat direct';

export const buildPaymentReceiptFileName = (order: CustomerOrder, payment: OrderPayment) => {
  const reference = normalizeFilePart(formatOrderReference(order)) || 'commande';
  const paymentPart = normalizeFilePart(payment.providerTransactionId || payment.providerReference || payment.id).slice(-24);
  return `recu-africaphone-${reference}-${paymentPart || payment.id.slice(-8)}.html`;
};

export const buildPaymentReceiptHtmlDocument = (params: {
  order: CustomerOrder;
  payment: OrderPayment;
  generatedAt: Date;
}) => {
  const { order, payment, generatedAt } = params;
  const paymentDate = readPaymentDate(payment);
  const rows = order.items
    .map(
      item => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td class="num">${escapeHtml(item.quantity)}</td>
          <td class="num">${escapeHtml(formatPrice(item.subtotal))}</td>
        </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Recu AfricaPhone</title>
  <style>
    :root {
      color-scheme: light;
      --green: #059669;
      --green-soft: #ecfdf5;
      --orange: #f97316;
      --ink: #0f172a;
      --muted: #64748b;
      --line: #dbe3ee;
      --paper: #ffffff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f8fafc;
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.45;
    }
    .receipt {
      width: min(860px, calc(100% - 24px));
      margin: 24px auto;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 16px 45px rgba(15, 23, 42, 0.08);
    }
    .topbar { height: 8px; background: linear-gradient(90deg, var(--green), var(--orange)); }
    .inner { padding: 28px; }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 18px;
    }
    .brand { font-size: 24px; font-weight: 900; letter-spacing: 0; }
    .brand span { color: var(--green); }
    h1 { margin: 18px 0 6px; font-size: 28px; line-height: 1.1; }
    .muted { color: var(--muted); font-size: 13px; font-weight: 700; }
    .pill {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      background: var(--green-soft);
      color: var(--green);
      font-size: 12px;
      font-weight: 900;
      padding: 8px 12px;
      text-transform: uppercase;
    }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
    .box { border: 1px solid var(--line); border-radius: 14px; padding: 14px; background: #fbfdff; }
    .box strong { display: block; margin-top: 5px; font-size: 15px; }
    .highlight { background: var(--green-soft); border-color: #a7f3d0; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; overflow: hidden; border-radius: 14px; }
    th, td { padding: 12px; border-bottom: 1px solid var(--line); text-align: left; font-size: 14px; }
    th { background: #f8fafc; color: var(--muted); font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .num { text-align: right; white-space: nowrap; }
    .footer {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }
    @media print {
      body { background: #fff; }
      .receipt { width: 100%; margin: 0; border-radius: 0; box-shadow: none; }
    }
    @media (max-width: 640px) {
      .inner { padding: 18px; }
      .header, .grid { grid-template-columns: 1fr; display: grid; }
      h1 { font-size: 23px; }
    }
  </style>
</head>
<body>
  <main class="receipt">
    <div class="topbar"></div>
    <div class="inner">
      <header class="header">
        <div>
          <div class="brand">Africa<span>Phone</span></div>
          <p class="muted">Recu telecharge depuis l'application AfricaPhone</p>
        </div>
        <div>
          <span class="pill">Paiement confirme</span>
        </div>
      </header>

      <h1>Recu de paiement</h1>
      <p class="muted">Document genere le ${escapeHtml(formatDateTime(generatedAt))}</p>

      <section class="grid">
        <div class="box highlight">
          <span class="muted">Reference commande</span>
          <strong>${escapeHtml(formatOrderReference(order))}</strong>
        </div>
        <div class="box highlight">
          <span class="muted">Montant confirme</span>
          <strong>${escapeHtml(formatPrice(payment.amount))}</strong>
        </div>
        <div class="box">
          <span class="muted">Transaction Kkiapay</span>
          <strong>${escapeHtml(payment.providerTransactionId || 'Reference non renseignee')}</strong>
        </div>
        <div class="box">
          <span class="muted">Reference paiement</span>
          <strong>${escapeHtml(payment.providerReference || payment.id)}</strong>
        </div>
        <div class="box">
          <span class="muted">Client</span>
          <strong>${escapeHtml(order.customer.fullName)}</strong>
          <p class="muted">${escapeHtml(order.customer.whatsapp)} ${order.customer.email ? `- ${escapeHtml(order.customer.email)}` : ''}</p>
        </div>
        <div class="box">
          <span class="muted">Operation</span>
          <strong>${escapeHtml(getPaymentPurpose(payment))}</strong>
          <p class="muted">${escapeHtml(getFulfillmentLabel(order))} - ${escapeHtml(formatDateTime(paymentDate))}</p>
        </div>
      </section>

      <table>
        <thead>
          <tr>
            <th>Article</th>
            <th class="num">Qt</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="3">Article non renseigne</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        Ce recu confirme uniquement le paiement Kkiapay verifie par AfricaPhone. La livraison, le retrait boutique
        ou le retrait par representant reste traite selon les informations de la commande.
      </div>
    </div>
  </main>
</body>
</html>`;
};
