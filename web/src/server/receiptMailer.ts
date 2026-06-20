import nodemailer from 'nodemailer';
import type { CustomerOrder, OrderPayment } from '@/types/customerOrders';
import { formatPrice } from '@/utils/formatPrice';

export type ReceiptMailResult =
  | { status: 'not_configured'; error: string }
  | { status: 'sent'; messageId: string | null }
  | { status: 'failed'; error: string };

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM?.trim() || process.env.AFRICAPHONE_RECEIPT_FROM?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass || !from || !Number.isFinite(port)) {
    return null;
  }

  return { host, user, pass, from, port, secure };
};

const escapeHtml = (value: string | null | undefined) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatOrderReference = (order: CustomerOrder) => {
  const raw = String(order.localDraftId || order.id || '').trim();
  if (!raw) {
    return 'Commande AfricaPhone';
  }

  const draftMatch = /^AFP-(\d{8})-([A-Z0-9]+)$/i.exec(raw);
  if (draftMatch) {
    const [, datePart, suffix] = draftMatch;
    return `Demande ${datePart.slice(6, 8)}/${datePart.slice(4, 6)} #${suffix.toUpperCase()}`;
  }

  return `Commande #${raw.slice(-6).toUpperCase()}`;
};

const buildReceiptText = (order: CustomerOrder, payment: OrderPayment, transactionId: string) => {
  const items = order.items
    .map(item => `- ${item.name} x${item.quantity}: ${formatPrice(item.subtotal)}`)
    .join('\n');

  return [
    `Bonjour ${order.customer.fullName},`,
    '',
    'AfricaPhone confirme la reception de votre paiement Kkiapay.',
    '',
    `Reference commande: ${formatOrderReference(order)}`,
    `Reference paiement: ${payment.providerReference || payment.id}`,
    `Transaction Kkiapay: ${transactionId}`,
    `Montant: ${formatPrice(payment.amount)}`,
    '',
    'Articles:',
    items || '- Article non renseigne',
    '',
    'Conservez ce recu. Notre equipe vous contactera pour la livraison ou le retrait.',
    '',
    'AfricaPhone',
  ].join('\n');
};

const buildReceiptHtml = (order: CustomerOrder, payment: OrderPayment, transactionId: string) => {
  const rows = order.items
    .map(
      item => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.name)}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatPrice(item.subtotal)}</td>
        </tr>`
    )
    .join('');

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
      <h1 style="font-size:22px;margin:0 0 12px;">Recu de paiement AfricaPhone</h1>
      <p>Bonjour <strong>${escapeHtml(order.customer.fullName)}</strong>,</p>
      <p>Votre paiement Kkiapay a ete confirme.</p>
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px;margin:16px 0;">
        <p style="margin:0;"><strong>${escapeHtml(formatOrderReference(order))}</strong></p>
        <p style="margin:6px 0 0;">Montant : <strong>${formatPrice(payment.amount)}</strong></p>
        <p style="margin:6px 0 0;">Transaction Kkiapay : <strong>${escapeHtml(transactionId)}</strong></p>
        <p style="margin:6px 0 0;">Reference paiement : <strong>${escapeHtml(payment.providerReference || payment.id)}</strong></p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <thead>
          <tr>
            <th style="padding:10px;border-bottom:2px solid #d1d5db;text-align:left;">Article</th>
            <th style="padding:10px;border-bottom:2px solid #d1d5db;text-align:center;">Qt</th>
            <th style="padding:10px;border-bottom:2px solid #d1d5db;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:18px;">Conservez ce recu. Notre equipe vous contactera pour la livraison ou le retrait.</p>
      <p>AfricaPhone</p>
    </div>`;
};

export const sendOrderPaymentReceipt = async (params: {
  order: CustomerOrder;
  payment: OrderPayment;
  transactionId: string;
}): Promise<ReceiptMailResult> => {
  const recipient = params.payment.receiptEmail || params.order.customer.email;
  if (!recipient) {
    return { status: 'failed', error: 'Adresse email client manquante.' };
  }

  const smtpConfig = getSmtpConfig();
  if (!smtpConfig) {
    return { status: 'not_configured', error: 'Configuration SMTP manquante.' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });

    const info = await transporter.sendMail({
      from: smtpConfig.from,
      to: recipient,
      subject: `Recu AfricaPhone - ${formatOrderReference(params.order)}`,
      text: buildReceiptText(params.order, params.payment, params.transactionId),
      html: buildReceiptHtml(params.order, params.payment, params.transactionId),
    });

    return { status: 'sent', messageId: info.messageId || null };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Envoi du recu impossible.',
    };
  }
};
