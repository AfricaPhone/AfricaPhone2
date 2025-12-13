// cloud_function/index.ts
import { logger } from 'firebase-functions';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { kkiapay as kkiapayServer } from '@kkiapay-org/nodejs-sdk';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import sharp = require('sharp');
import { createHash, randomUUID } from 'crypto';
// import { URL } from 'url';

// Initialise l'app Firebase Admin pour interagir avec Firestore.
admin.initializeApp();
const db = admin.firestore();
const STORAGE_BUCKET = process.env.PRODUCT_IMAGES_BUCKET || 'africaphone-vente.firebasestorage.app';

// --- Promo / Partenaires : Types et helpers ---
type PriceBracket = {
  min: number;
  max?: number;
  discountValue: number;
  commissionValue: number;
  label?: string;
};

type PromoRule = {
  isActive: boolean;
  allowedChannels?: string[];
  startsAt?: admin.firestore.Timestamp;
  endsAt?: admin.firestore.Timestamp;
  priceBrackets?: PriceBracket[];
  allowedPartners?: string[];
  partnerRefRequired?: boolean;
  code?: string;
};

type LinkTemplates = {
  webBaseUrl: string;
  appScheme: string;
  appLinkDomain?: string;
  defaultCampaign?: string;
  defaultSub?: string;
  whatsappNumber?: string;
  waMessageTemplate?: string;
  shortLinkDomain?: string;
  finalRedirectUrl?: string; // Ajouté pour le nouveau système
};

const DEFAULT_PRICE_BRACKETS: PriceBracket[] = [
  { min: 0, max: 149_000, discountValue: 5_000, commissionValue: 8_000, label: '0-149k' },
  { min: 149_000, max: 249_000, discountValue: 10_000, commissionValue: 15_000, label: '149k-249k' },
  { min: 249_000, max: 399_000, discountValue: 15_000, commissionValue: 25_000, label: '249k-399k' },
  { min: 399_000, max: undefined, discountValue: 20_000, commissionValue: 35_000, label: '400k+' },
];

const DEFAULT_LINK_TEMPLATES: LinkTemplates = {
  webBaseUrl: 'https://us-central1-africaphone-vente.cloudfunctions.net/trackPromoLink',
  appScheme: 'africaphone://apply-promo',
  appLinkDomain: 'https://us-central1-africaphone-vente.cloudfunctions.net/trackPromoLink',
  defaultCampaign: 'default',
  defaultSub: 'cta1',
};

// Secrets pour envoyer un événement GA4 côté serveur (Measurement Protocol).
const GA4_MEASUREMENT_ID = defineSecret('GA4_MEASUREMENT_ID');
const GA4_API_SECRET = defineSecret('GA4_API_SECRET');

const normalizeChannel = (channel?: string) => {
  const normalized = (channel || 'web').toLowerCase();
  const allowed = ['web', 'app', 'wa', 'qr', 'bo'];
  return allowed.includes(normalized) ? normalized : 'web';
};

const dayKeyUtc = (date = new Date()) => {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const clampRangeDays = (value?: number) => {
  const fallback = 30;
  if (!value || Number.isNaN(value)) return fallback;
  return Math.min(180, Math.max(7, Math.floor(value)));
};

const serializeDate = (ts?: admin.firestore.Timestamp) => {
  if (!ts?.toDate) return null;
  return ts.toDate().toISOString();
};

const fetchPromoRule = async (code: string) => {
  const normalizedCode = code.trim().toUpperCase();
  const ruleSnap = await db.collection('promoRules').doc(normalizedCode).get();
  if (!ruleSnap.exists) {
    return null;
  }
  return { id: ruleSnap.id, ...(ruleSnap.data() as PromoRule) };
};

const isWithinDates = (rule: PromoRule) => {
  const now = admin.firestore.Timestamp.now();
  if (rule.startsAt && rule.startsAt.toMillis() > now.toMillis()) return false;
  if (rule.endsAt && rule.endsAt.toMillis() < now.toMillis()) return false;
  return true;
};

const pickPriceBracket = (brackets: PriceBracket[] | undefined, amount?: number) => {
  const safeAmount = typeof amount === 'number' && amount > 0 ? amount : 0;
  const list = brackets?.length ? brackets : DEFAULT_PRICE_BRACKETS;
  return list.find(bracket => {
    const minOk = safeAmount >= bracket.min;
    const maxOk = typeof bracket.max === 'number' ? safeAmount <= bracket.max : true;
    return minOk && maxOk;
  });
};

const logPromoEvent = async (collection: string, data: Record<string, unknown>) => {
  try {
    await db.collection(collection).add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.warn(`promo logging failed for ${collection}`, error);
  }
};

const buildGaClientId = (req: any, code: string, ref: string | null) => {
  const sid = typeof req?.query?.sid === 'string' && req.query.sid.trim().length > 0 ? req.query.sid.trim() : null;
  if (sid) return sid;

  const ip =
    (typeof req?.ip === 'string' && req.ip) ||
    (typeof req?.headers?.['x-forwarded-for'] === 'string' && req.headers['x-forwarded-for']) ||
    '';
  const ua = (req?.get?.('user-agent') as string) || (req?.headers?.['user-agent'] as string) || '';

  const hash = createHash('sha256')
    .update([code, ref || '', ua, ip].join('|'))
    .digest('hex');
  return hash.slice(0, 32);
};

const sendGa4ClickEvent = async (params: {
  req: any;
  code: string;
  channel: string;
  ref: string | null;
  campaign?: string | null;
  sub?: string | null;
  target: string;
}) => {
  const measurementId = GA4_MEASUREMENT_ID.value();
  const apiSecret = GA4_API_SECRET.value();
  if (!measurementId || !apiSecret) return;

  const { req, code, channel, ref, campaign, sub, target } = params;
  const clientId = buildGaClientId(req, code, ref);
  const eventId =
    (typeof req?.query?.eid === 'string' && req.query.eid.trim().length > 0 ? req.query.eid.trim() : randomUUID()).slice(
      0,
      64
    );
  const sessionId = Math.floor(Date.now() / 1000);

  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
        measurementId
      )}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          user_id: ref || undefined,
          events: [
            {
              name: 'promo_link_click',
              params: {
                code,
                channel,
                ref: ref || '(none)',
                campaign: campaign || 'default',
                sub: sub || 'cta1',
                target,
                session_id: sessionId,
                engagement_time_msec: 1,
                event_id: eventId,
              },
            },
          ],
        }),
      }
    );
  } catch (error) {
    logger.warn('ga4 promo link tracking failed', error);
  }
};

const evaluatePromo = async (params: {
  code: string;
  channel?: string;
  ref?: string;
  cartValue?: number;
}) => {
  const { code, channel, ref, cartValue } = params;
  const normalizedCode = code.trim().toUpperCase();
  const normalizedChannel = normalizeChannel(channel);

  const promoRule = await fetchPromoRule(normalizedCode);
  if (!promoRule || !promoRule.isActive) {
    throw new HttpsError('not-found', 'Ce code promo est invalide ou inactif.');
  }

  if (!isWithinDates(promoRule)) {
    throw new HttpsError('failed-precondition', 'Ce code promo est expiré ou pas encore actif.');
  }

  if (promoRule.allowedChannels?.length && !promoRule.allowedChannels.includes(normalizedChannel)) {
    throw new HttpsError('permission-denied', 'Ce code promo ne peut pas être utilisé sur ce canal.');
  }

  if (promoRule.partnerRefRequired && !ref) {
    throw new HttpsError('failed-precondition', 'Un identifiant partenaire est requis pour ce code.');
  }

  if (promoRule.allowedPartners?.length && ref && !promoRule.allowedPartners.includes(ref)) {
    throw new HttpsError('permission-denied', 'Ce code promo n’est pas autorisé pour ce partenaire.');
  }

  const bracket = pickPriceBracket(promoRule.priceBrackets, cartValue);
  if (!bracket) {
    throw new HttpsError('failed-precondition', 'Aucune tranche de prix applicable pour ce panier.');
  }

  const promoSessionId = randomUUID();

  const payload = {
    code: promoRule.code || normalizedCode,
    ruleId: promoRule?.code || normalizedCode,
    channel: normalizedChannel,
    ref: ref || null,
    discountType: 'fixed' as const,
    discountValue: bracket.discountValue,
    commissionValue: bracket.commissionValue,
    priceBracket: { min: bracket.min, max: bracket.max ?? null, label: bracket.label ?? null },
    cartValue: typeof cartValue === 'number' ? cartValue : null,
    promoSessionId,
  };

  await logPromoEvent('promoValidationLogs', payload);

  return payload;
};

/**
 * Valide un code promo avec grille de remises/commissions et retourne un promoSessionId.
 * Attendu: data { code, cartValue, channel, ref }
 */
export const validatePromoV2 = onCall(async request => {
  const { code, channel, ref, cartValue } = request.data as {
    code?: string;
    channel?: string;
    ref?: string;
    cartValue?: number;
  };

  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Le code promo est requis.');
  }

  const result = await evaluatePromo({ code, channel, ref, cartValue });
  return result;
});

/**
 * Confirme un achat associé à un code promo (vente conclue via WA/boutique/app).
 * Attendu: data { code, channel, ref, amount, items?, promoSessionId? }
 */
// buildUrlWithParams supprimé car non utilisé avec le nouveau système de liens courts

/**
 * Génère les liens à partager pour un partenaire/détenteur de code.
 * Attendu: data { code, ref?, campaign?, sub?, channel? }
 */
export const generatePromoLinks = onCall(async request => {
  const { code, ref, campaign, sub, channel } = request.data as {
    code?: string;
    ref?: string;
    campaign?: string;
    sub?: string;
    channel?: string;
  };

  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Le code promo est requis.');
  }

  const normalizedCode = code.trim().toUpperCase();
  const normalizedChannel = normalizeChannel(channel);

  const configSnap = await db.collection('config').doc('linkTemplates').get();
  const configData = configSnap.exists ? (configSnap.data() as Partial<LinkTemplates>) : {};
  const linkTemplates: LinkTemplates = { ...DEFAULT_LINK_TEMPLATES, ...configData };

  const boutiqueSnap = await db.collection('config').doc('boutiqueInfo').get();
  const boutiqueData = boutiqueSnap.exists ? boutiqueSnap.data() : {};
  const whatsappNumber =
    (boutiqueData?.whatsappNumber as string | undefined) ||
    linkTemplates.whatsappNumber ||
    (boutiqueData?.phoneNumber as string | undefined) ||
    '';

  const sharedParams = {
    code: normalizedCode,
    channel: normalizedChannel,
    ref: ref ?? '',
    campaign: campaign ?? linkTemplates.defaultCampaign ?? 'default',
    sub: sub ?? linkTemplates.defaultSub ?? 'cta1',
  };

  // Générer les liens courts au format africaphone.org/p/CODE
  const baseDomain = linkTemplates.shortLinkDomain || 'https://africaphone.org';

  // Construire les paramètres query (sans le code qui est dans le path)
  const queryParams = new URLSearchParams();
  if (ref) queryParams.set('ref', ref);
  if (channel) queryParams.set('channel', normalizedChannel);
  if (campaign) queryParams.set('campaign', campaign ?? linkTemplates.defaultCampaign ?? 'default');
  if (sub) queryParams.set('sub', sub ?? linkTemplates.defaultSub ?? 'cta1');

  const queryString = queryParams.toString();

  // Lien web court : africaphone.org/p/CODE?ref=xxx
  const webLink = `${baseDomain}/p/${normalizedCode}${queryString ? '?' + queryString : ''}`;

  // Lien app : même format mais avec channel=app
  const appQueryParams = new URLSearchParams(queryParams);
  appQueryParams.set('channel', 'app');
  const appLink = `${baseDomain}/p/${normalizedCode}?${appQueryParams.toString()}`;

  // Deep link app natif
  const appDeepLink = `${linkTemplates.appScheme}?${new URLSearchParams({
    code: normalizedCode,
    ref: ref ?? '',
    channel: 'app',
    campaign: campaign ?? linkTemplates.defaultCampaign ?? 'default',
    sub: sub ?? linkTemplates.defaultSub ?? 'cta1',
  }).toString()}`;

  // Message WhatsApp avec le lien court
  const waMessageTemplate =
    linkTemplates.waMessageTemplate || 'Profite du code {code} sur AfricaPhone : {link} (ref {ref})';
  const message = waMessageTemplate
    .replace('{code}', normalizedCode)
    .replace('{link}', webLink)
    .replace('{ref}', ref ?? '');

  const waNumberNormalized = whatsappNumber ? whatsappNumber.replace(/\D+/g, '') : '';
  const whatsappLink = `https://wa.me/${waNumberNormalized}?text=${encodeURIComponent(message)}`;

  const payload = {
    webLink,
    appLink,
    appDeepLink,
    whatsappLink,
    parameters: sharedParams,
    ref: ref ?? null,
  };

  await logPromoEvent('promoLinkGenerations', payload);

  return payload;
});

type PromoMetricDelta = {
  code: string;
  channel: string;
  ref?: string | null;
  visitDelta?: number;
  waContactDelta?: number;
  sale?: {
    amount?: number;
    discountValue?: number;
    commissionValue?: number;
  };
};

const incrementPromoMetrics = async (delta: PromoMetricDelta) => {
  const code = delta.code.trim().toUpperCase();
  const channel = normalizeChannel(delta.channel);
  const ref = typeof delta.ref === 'string' && delta.ref.trim().length > 0 ? delta.ref.trim() : null;
  const visitDelta = Number.isFinite(delta.visitDelta) ? Number(delta.visitDelta) : 0;
  const waContactDelta =
    Number.isFinite(delta.waContactDelta) && channel === 'wa' ? Number(delta.waContactDelta) : 0;
  const saleCount = delta.sale ? 1 : 0;
  const saleAmount = delta.sale?.amount ?? 0;
  const saleDiscount = delta.sale?.discountValue ?? 0;
  const saleCommission = delta.sale?.commissionValue ?? 0;

  const dateKey = dayKeyUtc();
  const baseRef = db.collection('promoMetrics').doc(code).collection('daily').doc(dateKey);
  const partnerRef = ref
    ? db.collection('promoMetrics').doc(code).collection('partners').doc(ref).collection('daily').doc(dateKey)
    : null;

  const buildUpdate = () => {
    const update: any = {
      code,
      date: dateKey,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (visitDelta) {
      update.visits = {
        [channel]: admin.firestore.FieldValue.increment(visitDelta),
        total: admin.firestore.FieldValue.increment(visitDelta),
      };
    }
    if (waContactDelta) {
      update.contacts = {
        wa: admin.firestore.FieldValue.increment(waContactDelta),
        total: admin.firestore.FieldValue.increment(waContactDelta),
      };
    }
    if (saleCount) {
      update.sales = {
        count: admin.firestore.FieldValue.increment(saleCount),
        amount: admin.firestore.FieldValue.increment(saleAmount),
        discount: admin.firestore.FieldValue.increment(saleDiscount),
        commission: admin.firestore.FieldValue.increment(saleCommission),
      };
    }
    return update;
  };

  await Promise.all([
    baseRef.set(buildUpdate(), { merge: true }),
    partnerRef ? partnerRef.set(buildUpdate(), { merge: true }) : Promise.resolve(),
  ]);
};

/**
 * Redirection trackée d'un lien promo.
 * Incrémente les visites (et contacts WA si canal = wa) puis redirige vers la destination finale.
 * Supporte deux formats:
 * 1. /p/CODE?channel=web&ref=xxx (format court)
 * 2. ?code=CODE&channel=web&ref=xxx (format query classique)
 */
export const trackPromoLink = onRequest({ secrets: [GA4_MEASUREMENT_ID, GA4_API_SECRET] }, async (req, res) => {
  try {
    // Extraire le code depuis /p/CODE ou ?code=CODE
    const pathMatch = req.path.match(/\/p\/([^\/\?]+)/);
    const codeFromPath = pathMatch ? pathMatch[1] : null;
    const codeFromQuery = (req.query.code as string | undefined)?.trim();
    const code = codeFromPath || codeFromQuery;

    const channel = normalizeChannel((req.query.channel as string | undefined) || 'web');
    const ref = (req.query.ref as string | undefined)?.trim() || null;
    const campaign = (req.query.campaign as string | undefined)?.trim();
    const sub = (req.query.sub as string | undefined)?.trim();

    if (!code) {
      res.status(400).send('code requis');
      return;
    }

    const configSnap = await db.collection('config').doc('linkTemplates').get();
    const configData = configSnap.exists ? (configSnap.data() as Partial<LinkTemplates>) : {};
    const linkTemplates: LinkTemplates = { ...DEFAULT_LINK_TEMPLATES, ...configData };

    const boutiqueSnap = await db.collection('config').doc('boutiqueInfo').get();
    const boutiqueData = boutiqueSnap.exists ? boutiqueSnap.data() : {};
    const whatsappNumber =
      (boutiqueData?.whatsappNumber as string | undefined) ||
      linkTemplates.whatsappNumber ||
      (boutiqueData?.phoneNumber as string | undefined) ||
      '';

    const normalizedCode = code.toUpperCase();

    const sharedParams = {
      code: normalizedCode,
      ref: ref || '',
      campaign: campaign || linkTemplates.defaultCampaign || 'default',
      sub: sub || linkTemplates.defaultSub || 'cta1',
    };

    // Destination finale: africaphone.org avec le code en query param
    const finalDestination = linkTemplates.finalRedirectUrl || 'https://africaphone.org';
    const target =
      channel === 'wa'
        ? (() => {
          const webLink = `${finalDestination}/?code=${normalizedCode}&ref=${sharedParams.ref}`;
          const messageTemplate =
            linkTemplates.waMessageTemplate || 'Profite du code {code} sur AfricaPhone : {link} (ref {ref})';
          const message = messageTemplate
            .replace('{code}', sharedParams.code)
            .replace('{link}', webLink)
            .replace('{ref}', sharedParams.ref);
          const waNumberNormalized = whatsappNumber ? whatsappNumber.replace(/\D+/g, '') : '';
          return `https://wa.me/${waNumberNormalized}?text=${encodeURIComponent(message)}`;
        })()
        : channel === 'app'
          ? `${linkTemplates.appScheme}?code=${normalizedCode}&ref=${sharedParams.ref}&campaign=${sharedParams.campaign}&sub=${sharedParams.sub}`
          : `${finalDestination}/?code=${normalizedCode}&ref=${sharedParams.ref}&channel=${channel}`;

    // Cookie deduplication using __session (required by Firebase Hosting)
    let sessionData: Record<string, boolean> = {};
    const sessionCookie = req.headers.cookie
      ?.split(';')
      .find(c => c.trim().startsWith('__session='));

    if (sessionCookie) {
      try {
        const rawValue = sessionCookie.split('=')[1].trim();
        // Handle potentially URL-encoded or base64 encoded values if needed, but simple JSON is standard for custom usage
        // We'll use simple JSON string for the value
        sessionData = JSON.parse(decodeURIComponent(rawValue));
      } catch (e) {
        // Ignore parse errors, treat as new session
      }
    }

    const hasVisited = !!sessionData[`visited_${normalizedCode}`];

    await sendGa4ClickEvent({
      req,
      code: normalizedCode,
      channel,
      ref,
      campaign: sharedParams.campaign,
      sub: sharedParams.sub,
      target,
    });

    if (!hasVisited) {
      await incrementPromoMetrics({
        code: normalizedCode,
        channel,
        ref,
        visitDelta: 1,
        waContactDelta: channel === 'wa' ? 1 : 0,
      });
      console.log(`Unique visit recorded for ${normalizedCode}`);

      // Update session
      sessionData[`visited_${normalizedCode}`] = true;
    } else {
      console.log(`Duplicate visit ignored for ${normalizedCode}`);
    }

    // Set __session cookie
    // Note: Firebase Hosting only allows __session. We serialize our data into it.
    const newSessionValue = encodeURIComponent(JSON.stringify(sessionData));
    res.setHeader('Set-Cookie', `__session=${newSessionValue}; Max-Age=86400; Path=/; Secure; SameSite=Lax`);
    res.redirect(302, target);
  } catch (err) {
    logger.error('trackPromoLink failed', err);
    res.status(500).send('Erreur suivi promo');
  }
});

/**
 * Enregistre une vente conclue liée à un code promo (WA/boutique/app).
 * Attendu: data { code, channel, ref?, amount?, discountValue?, commissionValue? }
 */
export const recordPromoSale = onCall(async request => {
  const { code, channel, ref, amount, discountValue, commissionValue } = request.data as {
    code?: string;
    channel?: string;
    ref?: string;
    amount?: number;
    discountValue?: number;
    commissionValue?: number;
  };

  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Le code promo est requis.');
  }

  const normalizedCode = code.trim().toUpperCase();
  const normalizedChannel = normalizeChannel(channel);
  const partnerRef = typeof ref === 'string' && ref.trim().length > 0 ? ref.trim() : null;

  const rule = await fetchPromoRule(normalizedCode);
  if (!rule || !rule.isActive || !isWithinDates(rule)) {
    throw new HttpsError('not-found', 'Code promo introuvable ou inactif.');
  }
  if (rule.allowedChannels?.length && !rule.allowedChannels.includes(normalizedChannel)) {
    throw new HttpsError('permission-denied', 'Ce code promo ne peut pas être utilisé sur ce canal.');
  }
  if (rule.partnerRefRequired && !partnerRef) {
    throw new HttpsError('failed-precondition', 'Un identifiant partenaire est requis pour ce code.');
  }
  if (rule.allowedPartners?.length && partnerRef && !rule.allowedPartners.includes(partnerRef)) {
    throw new HttpsError('permission-denied', 'Ce code promo n’est pas autorisé pour ce partenaire.');
  }

  await incrementPromoMetrics({
    code: normalizedCode,
    channel: normalizedChannel,
    ref: partnerRef,
    sale: {
      amount: Number.isFinite(amount) ? Number(amount) : 0,
      discountValue: Number.isFinite(discountValue) ? Number(discountValue) : 0,
      commissionValue: Number.isFinite(commissionValue) ? Number(commissionValue) : 0,
    },
  });

  await logPromoEvent('promoSalesLogs', {
    code: normalizedCode,
    channel: normalizedChannel,
    ref: partnerRef,
    amount: Number.isFinite(amount) ? Number(amount) : 0,
    discountValue: Number.isFinite(discountValue) ? Number(discountValue) : 0,
    commissionValue: Number.isFinite(commissionValue) ? Number(commissionValue) : 0,
  });

  return { ok: true };
});

/**
 * Récupère les métriques agrégées (visites, contacts, ventes) pour un code/ref.
 * Attendu: data { code, ref?, rangeDays? }
 */
export const getPromoMetrics = onCall(async request => {
  const { code, ref, rangeDays } = request.data as { code?: string; ref?: string; rangeDays?: number };
  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Le code promo est requis.');
  }

  const normalizedCode = code.trim().toUpperCase();
  const partnerRef = typeof ref === 'string' && ref.trim().length > 0 ? ref.trim() : null;
  const effectiveRange = clampRangeDays(rangeDays);
  const since = new Date(Date.now() - effectiveRange * 24 * 60 * 60 * 1000);
  const sinceKey = dayKeyUtc(since);

  const baseCollection = partnerRef
    ? db.collection('promoMetrics').doc(normalizedCode).collection('partners').doc(partnerRef).collection('daily')
    : db.collection('promoMetrics').doc(normalizedCode).collection('daily');

  const snap = await baseCollection.where('date', '>=', sinceKey).orderBy('date', 'asc').limit(200).get();

  type MetricDoc = {
    date: string;
    visits?: Record<string, number>;
    contacts?: Record<string, number>;
    sales?: { count?: number; amount?: number; discount?: number; commission?: number };
  };

  const docs: MetricDoc[] = snap.docs.map(doc => ({ date: doc.get('date') as string, ...(doc.data() as any) }));

  const totals = docs.reduce(
    (acc, doc) => {
      const visits = doc.visits || {};
      const contacts = doc.contacts || {};
      const sales = doc.sales || {};
      acc.visits.web += Number(visits.web || 0);
      acc.visits.app += Number(visits.app || 0);
      acc.visits.wa += Number(visits.wa || 0);
      acc.visits.total += Number(visits.total || 0);
      acc.contacts.wa += Number(contacts.wa || 0);
      acc.contacts.total += Number(contacts.total || 0);
      acc.sales.count += Number(sales.count || 0);
      acc.sales.amount += Number(sales.amount || 0);
      acc.sales.discount += Number(sales.discount || 0);
      acc.sales.commission += Number(sales.commission || 0);
      return acc;
    },
    {
      visits: { web: 0, app: 0, wa: 0, total: 0 },
      contacts: { wa: 0, total: 0 },
      sales: { count: 0, amount: 0, discount: 0, commission: 0 },
    }
  );

  return {
    code: normalizedCode,
    ref: partnerRef,
    rangeDays: effectiveRange,
    totals,
    series: docs.map(doc => ({
      date: doc.date,
      visits: {
        web: Number(doc.visits?.web || 0),
        app: Number(doc.visits?.app || 0),
        wa: Number(doc.visits?.wa || 0),
        total: Number(doc.visits?.total || 0),
      },
      contacts: {
        wa: Number(doc.contacts?.wa || 0),
        total: Number(doc.contacts?.total || 0),
      },
      sales: {
        count: Number(doc.sales?.count || 0),
        amount: Number(doc.sales?.amount || 0),
        discount: Number(doc.sales?.discount || 0),
        commission: Number(doc.sales?.commission || 0),
      },
    })),
  };
});

type DashboardChannel = { id: string; label: string; count: number; commission: number; discount: number };
type DashboardRow = {
  id: string;
  createdAt: string | null;
  channel: string;
  ref: string | null;
  cartValue: number | null;
  discountValue: number | null;
  commissionValue: number | null;
};
type DashboardPayout = { amount: number; date: string | null; mode?: string | null; status?: string | null; ref?: string | null };

const hydratePromoDashboardFromLogs = (logs: Array<Record<string, any>>) => {
  const channels: Record<string, DashboardChannel> = {};
  let totalCommission = 0;
  let totalDiscount = 0;
  let totalCart = 0;
  let cartCount = 0;

  logs.forEach(log => {
    const channel = normalizeChannel(log?.channel);
    const commission = typeof log?.commissionValue === 'number' ? log.commissionValue : 0;
    const discount = typeof log?.discountValue === 'number' ? log.discountValue : 0;
    const cartValue = typeof log?.cartValue === 'number' ? log.cartValue : null;

    totalCommission += commission;
    totalDiscount += discount;
    if (cartValue !== null) {
      totalCart += cartValue;
      cartCount += 1;
    }

    if (!channels[channel]) {
      channels[channel] = { id: channel, label: channel.toUpperCase(), count: 0, commission: 0, discount: 0 };
    }
    channels[channel].count += 1;
    channels[channel].commission += commission;
    channels[channel].discount += discount;
  });

  const rows: DashboardRow[] = logs.slice(0, 8).map((log, idx) => ({
    id: log?.promoSessionId || log?.id || `row-${idx}`,
    createdAt: serializeDate(log?.createdAt) || null,
    channel: normalizeChannel(log?.channel),
    ref: typeof log?.ref === 'string' ? log.ref : log?.partnerId ?? null,
    cartValue: typeof log?.cartValue === 'number' ? log.cartValue : null,
    discountValue: typeof log?.discountValue === 'number' ? log.discountValue : null,
    commissionValue: typeof log?.commissionValue === 'number' ? log.commissionValue : null,
  }));

  const sortedChannels = Object.values(channels).sort((a, b) => b.count - a.count);
  const avgCart = cartCount > 0 ? Math.round(totalCart / cartCount) : 0;
  const saleLogs = logs.filter(log => typeof log?.commissionValue === 'number' && log.commissionValue > 0);

  return {
    leadsCount: logs.length,
    salesCount: saleLogs.length || logs.length,
    totalCommission,
    totalDiscount,
    avgCart,
    channels: sortedChannels,
    rows,
  };
};

/**
 * Dashboard partenaire legacy (sans authentification).
 * @deprecated Utilisez getPartnerDashboard avec authentification.
 */
export const getPartnerDashboardLegacy = onCall(async request => {
  const { code, partnerId, ref, rangeDays } = request.data as {

    code?: string;
    partnerId?: string;
    ref?: string;
    rangeDays?: number;
  };

  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Le code promo est requis.');
  }

  const normalizedCode = code.trim().toUpperCase();
  const partnerRef = typeof partnerId === 'string' && partnerId.trim().length > 0 ? partnerId.trim() : ref?.trim() || null;
  const effectiveRange = clampRangeDays(rangeDays);
  const sinceTs = admin.firestore.Timestamp.fromDate(new Date(Date.now() - effectiveRange * 24 * 60 * 60 * 1000));

  const rule = await fetchPromoRule(normalizedCode);
  if (!rule || !rule.isActive || !isWithinDates(rule)) {
    throw new HttpsError('not-found', 'Code promo introuvable ou inactif.');
  }

  let validationLogs: Array<Record<string, any>> = [];
  try {
    const snap = await db
      .collection('promoValidationLogs')
      .where('code', '==', normalizedCode)
      .where('createdAt', '>=', sinceTs)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();
    validationLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    logger.warn('promoValidationLogs query fallback (index missing?)', error);
    try {
      const snap = await db.collection('promoValidationLogs').where('code', '==', normalizedCode).limit(200).get();
      validationLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      logger.error('promoValidationLogs unavailable', err);
    }
  }

  if (partnerRef) {
    validationLogs = validationLogs.filter(
      log => (log?.ref && log.ref === partnerRef) || (log?.partnerId && log.partnerId === partnerRef)
    );
  }

  const payouts: DashboardPayout[] = [];
  try {
    const payoutSnap = await db
      .collection('promoPayouts')
      .where('code', '==', normalizedCode)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    payoutSnap.forEach(doc => {
      const data = doc.data() as any;
      payouts.push({
        amount: typeof data?.amount === 'number' ? data.amount : 0,
        date: serializeDate(data?.createdAt),
        mode: data?.mode ?? null,
        status: data?.status ?? null,
        ref: doc.id,
      });
    });
  } catch (error) {
    logger.info('promoPayouts collection non disponible ou sans index', error);
  }

  const payoutPaid = payouts.reduce((sum, p) => sum + (Number.isFinite(p.amount) ? p.amount : 0), 0);
  const {
    leadsCount,
    salesCount,
    totalCommission,
    totalDiscount,
    avgCart,
    channels,
    rows,
  } = hydratePromoDashboardFromLogs(validationLogs);

  return {
    code: normalizedCode,
    partnerId: partnerRef,
    rangeDays: effectiveRange,
    rule: {
      code: rule.code || normalizedCode,
      allowedChannels: rule.allowedChannels || [],
      partnerRefRequired: !!rule.partnerRefRequired,
      priceBrackets: rule.priceBrackets || [],
    },
    kpis: {
      sales: salesCount,
      leads: leadsCount,
      commission: Math.max(0, Math.round(totalCommission)),
      discount: Math.max(0, Math.round(totalDiscount)),
      avgCart: Math.max(0, avgCart),
    },
    channels,
    payouts: {
      lastAmount: payouts[0]?.amount ?? 0,
      lastDate: payouts[0]?.date ?? null,
      pendingAmount: Math.max(0, Math.round(totalCommission - payoutPaid)),
      history: payouts,
    },
    table: rows,
    samples: validationLogs.length,
  };
});

/**
 * NOUVELLE FONCTION "CALLABLE"
 * Valide un code promo depuis l'application cliente.
 */
export const validatePromoCode = onCall(async request => {
  // 1. On ne vérifie pas l'authentification ici pour permettre aux non-connectés de tester un code,
  //    mais on pourrait l'ajouter si nécessaire avec : if (!request.auth) { ... }

  const { code } = request.data as { code: string };

  // 2. Valider les données reçues
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'Le code fourni est invalide.');
  }

  const codeToCheck = code.trim().toUpperCase();
  logger.info(`Validation du code promo: ${codeToCheck}`);

  // 3. Chercher le code dans la collection 'promoCodes'
  const promoCodeRef = db.collection('promoCodes');
  const query = promoCodeRef.where('code', '==', codeToCheck).limit(1);

  const snapshot = await query.get();

  if (snapshot.empty) {
    logger.warn(`Code promo non trouvé: ${codeToCheck}`);
    throw new HttpsError('not-found', 'Ce code promo est invalide.');
  }

  const promoDoc = snapshot.docs[0];
  const promoData = promoDoc.data();

  // 4. Vérifier si le code est actif
  if (!promoData.isActive) {
    logger.warn(`Tentative d'utilisation d'un code inactif: ${codeToCheck}`);
    throw new HttpsError('failed-precondition', "Ce code promo n'est plus actif.");
  }

  // 5. (Optionnel) Vérifier une date d'expiration si elle existait
  // if (promoData.expiresAt && promoData.expiresAt.toDate() < new Date()) {
  //   throw new HttpsError('failed-precondition', 'Ce code promo a expiré.');
  // }

  logger.info(`Code promo "${codeToCheck}" validé avec succès.`);
  // 6. Renvoyer les détails de la promotion si tout est OK
  return {
    id: promoDoc.id,
    code: promoData.code,
    type: promoData.type,
    value: promoData.value,
  };
});

/**
 * Permet de r��initialiser un pronostic pour remettre les tests a zero.
 */
export const resetPrediction = onCall(async request => {
  const { matchId, predictionId, contactPhone } = request.data as {
    matchId?: string;
    predictionId?: string;
    contactPhone?: string;
  };

  if (!matchId || typeof matchId !== 'string') {
    throw new HttpsError('invalid-argument', 'matchId est obligatoire.');
  }

  const normalizePhone = (value: string) => value.replace(/\D+/g, '');
  const uid = request.auth?.uid ?? null;
  const normalizedPhone =
    typeof contactPhone === 'string' && contactPhone.trim().length > 0 ? normalizePhone(contactPhone.trim()) : null;

  if (!uid && !normalizedPhone) {
    throw new HttpsError('unauthenticated', 'Impossible de verifier le proprietaire du pronostic.');
  }

  const predictionsRef = db.collection('predictions');
  let targetSnap: FirebaseFirestore.DocumentSnapshot | null = null;

  if (predictionId) {
    const directRef = predictionsRef.doc(predictionId);
    const directSnap = await directRef.get();
    if (directSnap.exists) {
      targetSnap = directSnap;
    }
  }

  if (!targetSnap && uid) {
    const byUser = await predictionsRef.where('matchId', '==', matchId).where('userId', '==', uid).limit(1).get();
    if (!byUser.empty) {
      targetSnap = byUser.docs[0];
    }
  }

  if (!targetSnap && normalizedPhone) {
    const byPhone = await predictionsRef
      .where('matchId', '==', matchId)
      .where('contactPhoneNormalized', '==', normalizedPhone)
      .limit(1)
      .get();
    if (!byPhone.empty) {
      targetSnap = byPhone.docs[0];
    }
  }

  if (!targetSnap) {
    throw new HttpsError('not-found', 'Aucun pronostic a reinitialiser pour ce match.');
  }

  const targetData = targetSnap.data() as {
    matchId?: string;
    userId?: string;
    contactPhoneNormalized?: string;
    scoreA?: number;
    scoreB?: number;
  };

  if (targetData?.matchId !== matchId) {
    throw new HttpsError('failed-precondition', 'Le pronostic trouve ne correspond pas au match demande.');
  }

  const belongsToUid = !!uid && targetData?.userId === uid;
  const belongsToPhone = !!normalizedPhone && targetData?.contactPhoneNormalized === normalizedPhone;

  if (!belongsToUid && !belongsToPhone) {
    throw new HttpsError('permission-denied', 'Vous ne pouvez pas reinitialiser ce pronostic.');
  }

  const scoreA = typeof targetData?.scoreA === 'number' ? targetData.scoreA : null;
  const scoreB = typeof targetData?.scoreB === 'number' ? targetData.scoreB : null;

  const predictionRef = targetSnap.ref;
  const matchRef = db.collection('matches').doc(matchId);

  try {
    await db.runTransaction(async transaction => {
      transaction.delete(predictionRef);

      const matchDoc = await transaction.get(matchRef);
      if (!matchDoc.exists || scoreA === null || scoreB === null) {
        return;
      }

      const matchData = matchDoc.data() || {};
      const trends = matchData.trends || {};
      const scoreKey = `${scoreA}-${scoreB}`;
      const currentTrendCount = trends[scoreKey] || 0;
      const currentTotal = matchData.predictionCount || 0;

      const updates: Record<string, any> = {
        predictionCount: Math.max(0, currentTotal - 1),
      };

      if (currentTrendCount <= 1) {
        updates[`trends.${scoreKey}`] = admin.firestore.FieldValue.delete();
      } else {
        updates[`trends.${scoreKey}`] = currentTrendCount - 1;
      }

      transaction.update(matchRef, updates);
    });
  } catch (error) {
    logger.error('Erreur lors de la reinitialisation du pronostic:', error);
    throw new HttpsError('internal', 'Impossible de reinitialiser le pronostic.');
  }

  return { success: true };
});

/**
 * Gère la soumission (création/mise à jour) d'un pronostic.
 */
export const submitPrediction = onCall(async request => {
  const { matchId, scoreA, scoreB, predictionId, contactFirstName, contactLastName, contactPhone } = request.data as {
    matchId: string;
    scoreA: number;
    scoreB: number;
    predictionId?: string;
    contactFirstName?: string;
    contactLastName?: string;
    contactPhone?: string;
  };

  if (!matchId || typeof scoreA !== 'number' || typeof scoreB !== 'number') {
    throw new HttpsError('invalid-argument', 'Les donn�es fournies sont invalides.');
  }

  const normalizePhone = (value: string) => value.replace(/\D+/g, '');
  const firstName = typeof contactFirstName === 'string' ? contactFirstName.trim() : '';
  const lastName = typeof contactLastName === 'string' ? contactLastName.trim() : '';
  const rawPhone = typeof contactPhone === 'string' ? contactPhone.trim() : '';
  const normalizedPhone = normalizePhone(rawPhone);

  if (!firstName || !lastName || !normalizedPhone) {
    throw new HttpsError('invalid-argument', 'Pr�nom, nom et num�ro WhatsApp sont obligatoires.');
  }
  if (normalizedPhone.length < 6) {
    throw new HttpsError('invalid-argument', 'Le num�ro WhatsApp fourni est invalide.');
  }

  const uid = request.auth?.uid ?? null;
  const userName = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();

  const matchRef = db.collection('matches').doc(matchId);
  const matchDoc = await matchRef.get();

  if (!matchDoc.exists) {
    throw new HttpsError('not-found', `Le match ${matchId} n'existe pas.`);
  }

  const matchStartTime = matchDoc.data()?.startTime?.toDate?.();
  if (matchStartTime && new Date() >= matchStartTime) {
    throw new HttpsError('failed-precondition', 'Les pronostics pour ce match sont termin�s.');
  }

  const predictionsRef = db.collection('predictions');
  let targetPredictionRef: FirebaseFirestore.DocumentReference | null = null;
  let existingPredictionSnap: FirebaseFirestore.DocumentSnapshot | null = null;

  try {
    if (predictionId) {
      targetPredictionRef = predictionsRef.doc(predictionId);
      existingPredictionSnap = await targetPredictionRef.get();
      if (!existingPredictionSnap.exists) {
        throw new HttpsError('not-found', "Ce pronostic n'existe pas.");
      }
      const existingData = existingPredictionSnap.data() as any;
      const ownedByUid = !!uid && existingData?.userId === uid;
      const ownedByPhone =
        existingData?.contactPhoneNormalized && existingData.contactPhoneNormalized === normalizedPhone;
      if (!ownedByUid && !ownedByPhone) {
        throw new HttpsError('permission-denied', 'Vous ne pouvez pas modifier ce pronostic.');
      }
    } else {
      if (!existingPredictionSnap && uid) {
        const existingByUser = await predictionsRef
          .where('matchId', '==', matchId)
          .where('userId', '==', uid)
          .limit(1)
          .get();
        if (!existingByUser.empty) {
          existingPredictionSnap = existingByUser.docs[0];
          targetPredictionRef = predictionsRef.doc(existingPredictionSnap.id);
        }
      }

      if (!existingPredictionSnap) {
        const existingByPhone = await predictionsRef
          .where('matchId', '==', matchId)
          .where('contactPhoneNormalized', '==', normalizedPhone)
          .limit(1)
          .get();
        if (!existingByPhone.empty) {
          existingPredictionSnap = existingByPhone.docs[0];
          targetPredictionRef = predictionsRef.doc(existingByPhone.docs[0].id);
        }
      }
    }

    if (existingPredictionSnap && targetPredictionRef) {
      logger.info('Mise � jour du pronostic', {
        predictionId: targetPredictionRef.id,
        matchId,
        source: 'submitPrediction',
      });
      await targetPredictionRef.update({
        scoreA,
        scoreB,
        userId: uid ?? existingPredictionSnap.data()?.userId ?? `guest_${normalizedPhone}`,
        userName,
        contactFirstName: firstName,
        contactLastName: lastName,
        contactPhone: rawPhone,
        contactPhoneNormalized: normalizedPhone,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, message: 'Pronostic mis � jour !', predictionId: targetPredictionRef.id, updated: true };
    }

    const newPredictionRef = predictionsRef.doc();
    const fallbackUserId = uid ?? `guest_${normalizedPhone || newPredictionRef.id}`;
    logger.info("Cr�ation d'un pronostic", { matchId, fallbackUserId });
    await newPredictionRef.set({
      userId: fallbackUserId,
      userName,
      matchId,
      scoreA,
      scoreB,
      contactFirstName: firstName,
      contactLastName: lastName,
      contactPhone: rawPhone,
      contactPhoneNormalized: normalizedPhone,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: 'Pronostic enregistr�. Bonne chance !',
      predictionId: newPredictionRef.id,
      created: true,
    };
  } catch (error) {
    logger.error("Erreur lors de l'�criture du pronostic:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Une erreur interne est survenue.');
  }
});

/**
 * Gère l'agrégation lors de la CRÉATION d'un pronostic.
 */
export const aggregatePredictions = onDocumentCreated('predictions/{predictionId}', async event => {
  const snap = event.data;
  if (!snap) {
    logger.warn("Données de l'événement de création absentes.");
    return;
  }
  const prediction = snap.data() as { matchId: string; scoreA: number; scoreB: number };
  const { matchId, scoreA, scoreB } = prediction;
  if (!matchId) {
    logger.error(`Le pronostic ${snap.id} n'a pas de matchId.`);
    return;
  }
  logger.info(`Agrégation pour le pronostic ${snap.id} sur le match ${matchId}.`);
  const matchRef = db.collection('matches').doc(matchId);
  const scoreKey = `${scoreA}-${scoreB}`;
  try {
    await db.runTransaction(async transaction => {
      const matchDoc = await transaction.get(matchRef);
      if (!matchDoc.exists) {
        throw new Error(`Match ${matchId} non trouvé!`);
      }
      const data = matchDoc.data() || {};
      const trends = data.trends || {};
      const currentTotal = data.predictionCount || 0;
      const currentScoreCount = trends[scoreKey] || 0;
      transaction.update(matchRef, {
        predictionCount: currentTotal + 1,
        [`trends.${scoreKey}`]: currentScoreCount + 1,
      });
    });
    logger.info(`Match ${matchId} mis à jour avec succès.`);
  } catch (err) {
    logger.error(`Erreur lors de la transaction pour le match ${matchId}:`, err);
  }
});

/**
 * Gère l'agrégation lors de la MISE À JOUR d'un pronostic.
 */
export const updateAggregatedPredictions = onDocumentUpdated('predictions/{predictionId}', async event => {
  const beforeSnap = event.data?.before;
  const afterSnap = event.data?.after;
  if (!beforeSnap || !afterSnap) {
    logger.warn(`[Update] Données before/after absentes pour le pronostic ${event.params.predictionId}.`);
    return;
  }
  const beforeData = beforeSnap.data();
  const afterData = afterSnap.data();
  if (beforeData.scoreA === afterData.scoreA && beforeData.scoreB === afterData.scoreB) {
    logger.info(`[Update] Le score pour le pronostic ${beforeSnap.id} n'a pas changé.`);
    return;
  }
  const matchId = afterData.matchId;
  if (!matchId) {
    logger.error(`[Update] Le pronostic ${afterSnap.id} n'a pas de matchId.`);
    return;
  }
  logger.info(`[Update] Mise à jour de l'agrégation pour le pronostic ${afterSnap.id} sur le match ${matchId}.`);
  const matchRef = db.collection('matches').doc(matchId);
  const oldScoreKey = `${beforeData.scoreA}-${beforeData.scoreB}`;
  const newScoreKey = `${afterData.scoreA}-${afterData.scoreB}`;
  try {
    await db.runTransaction(async transaction => {
      const matchDoc = await transaction.get(matchRef);
      if (!matchDoc.exists) {
        throw new Error(`Match ${matchId} non trouvé!`);
      }
      const data = matchDoc.data() || {};
      const trends = data.trends || {};
      const oldScoreCount = trends[oldScoreKey] || 0;
      const newScoreCount = trends[newScoreKey] || 0;
      transaction.update(matchRef, {
        [`trends.${oldScoreKey}`]: Math.max(0, oldScoreCount - 1),
        [`trends.${newScoreKey}`]: newScoreCount + 1,
      });
    });
    logger.info(`[Update] Tendances du match ${matchId} mises à jour avec succès après modification.`);
  } catch (err) {
    logger.error(`[Update] Erreur lors de la transaction de mise à jour pour le match ${matchId}:`, err);
  }
});

/**
 * Déclenchée à chaque update d'un doc de la collection 'matches'.
 */
export const processMatchResults = onDocumentUpdated('matches/{matchId}', async event => {
  const matchId = event.params.matchId as string;
  const beforeSnap = event.data?.before;
  const afterSnap = event.data?.after;
  if (!beforeSnap || !afterSnap) {
    logger.warn(`[Match ${matchId}] Données before/after absentes.`);
    return;
  }
  const beforeData = beforeSnap.data() as { finalScoreA?: number; finalScoreB?: number };
  const afterData = afterSnap.data() as { finalScoreA?: number; finalScoreB?: number };
  const aChanged = beforeData.finalScoreA !== afterData.finalScoreA;
  const bChanged = beforeData.finalScoreB !== afterData.finalScoreB;
  const aIsNum = typeof afterData.finalScoreA === 'number';
  const bIsNum = typeof afterData.finalScoreB === 'number';
  if ((!aChanged && !bChanged) || !aIsNum || !bIsNum) {
    logger.info(`[Match ${matchId}] Arrêt: scores inchangés ou invalides.`);
    return;
  }
  logger.info(`[Match ${matchId}] Score final: ${afterData.finalScoreA}-${afterData.finalScoreB}`);
  try {
    const snap = await db.collection('predictions').where('matchId', '==', matchId).get();
    if (snap.empty) {
      logger.info(`[Match ${matchId}] Aucun pronostic.`);
      return;
    }
    const batch = db.batch();
    snap.forEach(doc => {
      const p = doc.data() as { userId?: string; scoreA?: number; scoreB?: number; isWinner?: boolean };
      const ok =
        typeof p.scoreA === 'number' &&
        typeof p.scoreB === 'number' &&
        p.scoreA === afterData.finalScoreA &&
        p.scoreB === afterData.finalScoreB;
      if (ok) {
        logger.info(`[Match ${matchId}] Gagnant: ${p.userId ?? '?'} (${doc.id}).`);
        batch.update(doc.ref, { isWinner: true });
      } else {
        batch.update(doc.ref, { isWinner: false });
      }
    });
    await batch.commit();
    logger.info(`[Match ${matchId}] Fin. ${snap.size} pronostics vérifiés.`);
  } catch (err) {
    logger.error(`[Match ${matchId}] Erreur:`, err);
  }
});

/**
 * --- TRAITEMENT D'IMAGE (V2 / 2nd Gen) ---
 */
export const processProductImage = onObjectFinalized(
  {
    region: 'africa-south1',
    memory: '1GiB',
    timeoutSeconds: 120,
    bucket: STORAGE_BUCKET,
  },
  async event => {
    const object = event.data;
    const bucketName = object.bucket || STORAGE_BUCKET;
    const filePath = object.name || '';
    const contentType = object.contentType || '';
    const bucket = getStorage().bucket(bucketName);
    if (
      !filePath.startsWith('product-images/') ||
      !contentType.startsWith('image/') ||
      filePath.includes('_processed')
    ) {
      return logger.log('Fichier ignoré :', filePath);
    }
    const pathParts = filePath.split('/');
    if (pathParts.length < 3) {
      return logger.log('Chemin de fichier invalide, ID de produit manquant:', filePath);
    }
    const productId = pathParts[1];
    logger.info(`Début du traitement pour l'image du produit ${productId} : ${filePath}`);
    const tempFilePath = path.join(os.tmpdir(), path.basename(filePath));
    const newFileName = `${path.parse(path.basename(filePath)).name}_processed.webp`;
    const tempNewPath = path.join(os.tmpdir(), newFileName);
    try {
      await bucket.file(filePath).download({ destination: tempFilePath });
      await sharp(tempFilePath)
        .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(tempNewPath);
      const newFilePath = path.join(path.dirname(filePath), newFileName);
      await bucket.upload(tempNewPath, {
        destination: newFilePath,
        metadata: { contentType: 'image/webp' },
      });
      const newFile = bucket.file(newFilePath);
      await newFile.makePublic();
      const publicUrl = newFile.publicUrl();
      const productRef = db.collection('products').doc(productId);
      await db.runTransaction(async transaction => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists) {
          throw new Error(`Produit ${productId} non trouvé!`);
        }
        const productData = productDoc.data() || {};
        const currentImageUrls = productData.imageUrls || [];
        const updatedImageUrls = [...currentImageUrls, publicUrl];
        const updatePayload: { imageUrls: string[]; imageUrl?: string } = {
          imageUrls: updatedImageUrls,
        };
        if (updatedImageUrls.length === 1) {
          updatePayload.imageUrl = publicUrl;
        }
        transaction.update(productRef, updatePayload);
      });
      logger.info(`Produit ${productId} mis à jour avec la nouvelle URL : ${publicUrl}`);
      await bucket.file(filePath).delete();
      logger.info(`Image originale ${filePath} supprimée.`);
    } catch (error) {
      logger.error("Erreur lors du traitement de l'image:", error);
    } finally {
      await fs.unlink(tempFilePath).catch((err: any) => logger.error('Erreur suppression temp:', err));
      await fs.unlink(tempNewPath).catch((err: any) => logger.error('Erreur suppression temp webp:', err));
    }
  }
);

// ========================
// KKiaPay Vote Integration
// ========================

const KKIA_PUBLIC = defineSecret('KKIA_PUBLIC_KEY');
const KKIA_PRIVATE = defineSecret('KKIA_PRIVATE_KEY');
const KKIA_SECRET = defineSecret('KKIA_SECRET_KEY');
const KKIA_WEBHOOK_SECRET = defineSecret('KKIA_WEBHOOK_SECRET');
const KKIA_SANDBOX = defineSecret('KKIA_SANDBOX');

const REGION = 'europe-west1';
const VOTE_UNIT_XOF = 100;

function makeKkiapay() {
  const sandboxRaw = KKIA_SANDBOX.value();
  const sandbox = typeof sandboxRaw === 'string' && sandboxRaw.trim().toLowerCase() === 'true';
  return kkiapayServer({
    privatekey: KKIA_PRIVATE.value(),
    publickey: KKIA_PUBLIC.value(),
    secretkey: KKIA_SECRET.value(),
    sandbox,
  });
}

interface VoteSuccessOptions {
  transactionId: string;
  partnerId: string;
  amount?: number;
  source: 'webhook' | 'callable';
}

async function handleSuccessfulVote(options: VoteSuccessOptions): Promise<void> {
  const { transactionId, partnerId, amount, source } = options;
  if (!partnerId) {
    logger.warn('handleSuccessfulVote called without partnerId', { transactionId, source });
    return;
  }

  const intentRef = db.collection('voteIntents').doc(partnerId);
  let counted = false;

  await db.runTransaction(async tx => {
    const intentSnap = await tx.get(intentRef);
    if (!intentSnap.exists) {
      logger.warn('Intent not found', { partnerId, transactionId, source });
      return;
    }

    const intent = intentSnap.data() as any;
    const contestId: string = intent.contestId;
    const candidateId: string = intent.candidateId;

    if (transactionId) {
      const paymentRef = db.collection('payments').doc(transactionId);
      tx.set(
        paymentRef,
        {
          candidateId: candidateId || null,
          contestId: contestId || null,
        },
        { merge: true }
      );
    }

    if (!contestId || !candidateId) {
      logger.error('Intent missing contest or candidate', { partnerId, transactionId, source });
      return;
    }

    if (intent?.status === 'counted') {
      return;
    }

    const effectiveAmount = Number(intent.amount || amount || VOTE_UNIT_XOF);
    const votesToAdd = Math.max(1, Math.floor(effectiveAmount / VOTE_UNIT_XOF));

    const contestRef = db.collection('contests').doc(contestId);
    const candidateRef = contestRef.collection('candidates').doc(candidateId);
    const voteRef = contestRef.collection('votes').doc(transactionId || `evt_${Date.now()}`);

    tx.set(
      voteRef,
      {
        transactionId: transactionId || null,
        userId: intent.userId || 'guest',
        candidateId,
        contestId,
        amount: effectiveAmount,
        counted: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(candidateRef, { id: candidateId, contestId }, { merge: true });
    tx.set(contestRef, { id: contestId }, { merge: true });
    tx.update(candidateRef, { voteCount: admin.firestore.FieldValue.increment(votesToAdd) });
    tx.update(contestRef, { totalVotes: admin.firestore.FieldValue.increment(votesToAdd) });

    tx.set(
      intentRef,
      {
        status: 'counted',
        transactionId: transactionId || null,
        countedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    counted = true;
  });

  if (counted) {
    logger.info('Vote counted from payment', { partnerId, transactionId, source });
  }
}
export const createVoteIntent = onCall(
  { region: REGION, secrets: [KKIA_PUBLIC, KKIA_PRIVATE, KKIA_SECRET] },
  async request => {
    const uid = request.auth?.uid ?? 'guest';
    const contestId = String((request.data as any)?.contestId || '');
    const candidateId = String((request.data as any)?.candidateId || '');
    const amount = Number((request.data as any)?.amount || VOTE_UNIT_XOF);

    if (!contestId || !candidateId || !Number.isFinite(amount) || amount <= 0) {
      throw new HttpsError('invalid-argument', 'Invalid payload');
    }

    const intentRef = db.collection('voteIntents').doc();
    await intentRef.set({
      intentId: intentRef.id,
      userId: uid,
      contestId,
      candidateId,
      amount,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { intentId: intentRef.id };
  }
);

export const kkiapayWebhook = onRequest(
  {
    region: REGION,
    secrets: [KKIA_WEBHOOK_SECRET, KKIA_PUBLIC, KKIA_PRIVATE, KKIA_SECRET, KKIA_SANDBOX],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const headerSecret = req.header('x-kkiapay-secret');
    if (!headerSecret || headerSecret !== KKIA_WEBHOOK_SECRET.value()) {
      logger.warn('Invalid webhook signature');
      res.status(401).send('Invalid signature');
      return;
    }

    const body: any = req.body || {};
    const transactionId = String(body?.transactionId || '');
    const partnerId = String(body?.partnerId || body?.partner_id || '');
    const amount = Number(body?.amount || 0);
    const event = String(body?.event || '');
    const isPaymentSucces = body?.isPaymentSucces === true;

    let verifiedSuccess = false;
    try {
      if (transactionId) {
        const k = makeKkiapay();
        const verif: any = await k.verify(transactionId).catch(() => null);
        verifiedSuccess = verif?.status === 'SUCCESS' || verif?.isPaymentSucces === true;
      }
    } catch (e) {
      logger.error('verify() error', e as any);
    }

    const finalSuccess = isPaymentSucces || verifiedSuccess || event === 'transaction.success';

    if (transactionId) {
      await db
        .collection('payments')
        .doc(transactionId)
        .set(
          {
            transactionId,
            partnerId: partnerId || null,
            amount,
            event,
            status: finalSuccess ? 'success' : event === 'transaction.failed' ? 'failed' : 'pending',
            source: 'webhook',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    }

    if (finalSuccess) {
      await handleSuccessfulVote({
        transactionId,
        partnerId,
        amount: Number.isFinite(amount) ? amount : undefined,
        source: 'webhook',
      });
    }

    res.status(204).send();
  }
);

export const verifyKkiapay = onCall(
  { region: REGION, secrets: [KKIA_PUBLIC, KKIA_PRIVATE, KKIA_SECRET, KKIA_SANDBOX] },
  async request => {
    const txId = String((request.data as any)?.transactionId || '');
    if (!txId) {
      throw new HttpsError('invalid-argument', 'transactionId is required');
    }

    const k = makeKkiapay();
    const verif: any = await k.verify(txId);
    const isSuccess = verif?.status === 'SUCCESS' || verif?.isPaymentSucces === true;

    const partnerId = String(verif?.partnerId || verif?.partner_id || (request.data as any)?.partnerId || '');
    const amountFromVerification = Number(verif?.amount);
    const amountFromRequest = Number((request.data as any)?.amount);
    const amount = Number.isFinite(amountFromVerification)
      ? amountFromVerification
      : Number.isFinite(amountFromRequest)
        ? amountFromRequest
        : undefined;

    const updateData: Record<string, unknown> = {
      transactionId: txId,
      status: isSuccess ? 'success' : 'pending',
      verification: verif || null,
      source: 'callable',
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (partnerId) {
      updateData.partnerId = partnerId;
    }
    if (typeof amount === 'number' && Number.isFinite(amount)) {
      updateData.amount = amount;
    }

    await db.collection('payments').doc(txId).set(updateData, { merge: true });

    if (isSuccess) {
      await handleSuccessfulVote({
        transactionId: txId,
        partnerId,
        amount,
        source: 'callable',
      });
    }

    return { ok: true, status: isSuccess ? 'success' : 'pending' };
  }
);

/* ========================================================================== */
/*                          SHORT LINK REDIRECTS                              */
/* ========================================================================== */

export const redirectDashboard = onRequest(async (req, res) => {
  const code = req.path.split('/').pop() || '';
  if (!code) {
    res.status(400).send('Code manquante');
    return;
  }
  // Redirige vers le site PromoPage dédié (promo.africaphone.org) avec le code pré-rempli
  res.redirect(302, `https://africaphone-promo.web.app/?code=${encodeURIComponent(code)}`);
});

export const redirectApp = onRequest(async (req, res) => {
  const code = req.path.split('/').pop() || '';
  if (!code) {
    res.status(400).send('Code manquante');
    return;
  }
  // Redirige vers le schéma de l'application
  const appScheme = `africaphone://apply-promo?code=${encodeURIComponent(code)}&channel=app`;
  res.redirect(302, appScheme);
});

export const redirectWhatsApp = onRequest(async (req, res) => {
  const code = req.path.split('/').pop() || '';
  // const sid = req.query.sid as string; // Unused

  if (!code) {
    res.status(400).send('Code manquante');
    return;
  }

  try {
    // Récupérer le modèle de message
    const templateSnap = await db.collection('settings').doc('linkTemplates').get();
    const data = templateSnap.exists ? templateSnap.data() || {} : {};

    // Par défaut, numéro générique si non configuré
    const waNumber = data.whatsappNumber || '2290154151522';

    // Template par défaut
    // Note: {code} sera remplacé par le code promo
    // {link} sera remplacé par le lien Web court
    const waTemplate = data.waMessageTemplate ||
      'Rien que pour toi ! Profite du code promo {code} sur AfricaPhone. Télécharge ici : {link}';

    const webBaseUrl = data.webBaseUrl || 'https://africaphone.org';
    const webLink = `${webBaseUrl}/p/${code}`;

    // Remplacement des placeholders
    const message = waTemplate
      .replace('{code}', code.toUpperCase())
      .replace('{link}', webLink)
      .replace('{ref}', ''); // Pas de ref ici

    const waNumberNormalized = waNumber.replace(/\D+/g, '');
    const waUrl = `https://wa.me/${waNumberNormalized}?text=${encodeURIComponent(message)}`;

    res.redirect(302, waUrl);
  } catch (error) {
    logger.error('redirectWhatsApp failed', error);
    // Fallback sécurité
    res.redirect(302, `https://wa.me/2290154151522?text=Code%20promo%20${code}`);
  }
});

/* ========================================================================== */
/*                     PARTNER AUTHENTICATION SYSTEM                          */
/* ========================================================================== */

/**
 * Génère un mot de passe aléatoire sécurisé pour les partenaires.
 * Format: 8 caractères avec au moins une majuscule, une minuscule et un chiffre.
 */
const generatePartnerPassword = (): string => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = uppercase + lowercase + digits;

  let password = '';
  // Assurer au moins un de chaque type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];

  // Compléter jusqu'à 8 caractères
  for (let i = 3; i < 8; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Mélanger les caractères
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

/**
 * Hash un mot de passe avec SHA-256 (pour compatibilité navigateur).
 * Note: En production, bcrypt serait idéal mais SHA-256 est suffisant pour ce cas d'usage.
 */
const hashPassword = (password: string): string => {
  return createHash('sha256').update(password).digest('hex');
};

/**
 * Vérifie si un mot de passe correspond au hash stocké.
 */
const verifyPassword = (password: string, hash: string): boolean => {
  return hashPassword(password) === hash;
};

/**
 * Authentifie un partenaire avec son code promo et son mot de passe.
 * Retourne un token de session si succès.
 */
export const authenticatePartner = onCall(async request => {
  const { code, password } = request.data as {
    code?: string;
    password?: string;
  };

  if (!code || typeof code !== 'string' || !password || typeof password !== 'string') {
    throw new HttpsError('invalid-argument', 'Code et mot de passe requis.');
  }

  const normalizedCode = code.trim().toUpperCase();

  // Récupérer les infos du code promo
  const ruleSnap = await db.collection('promoRules').doc(normalizedCode).get();
  if (!ruleSnap.exists) {
    // Log tentative échouée
    await logPromoEvent('partnerAuthAttempts', {
      code: normalizedCode,
      success: false,
      reason: 'code_not_found',
      ip: request.rawRequest?.ip || null,
    });
    throw new HttpsError('not-found', 'Identifiants invalides.');
  }

  const ruleData = ruleSnap.data() as any;

  // Vérifier que le code est actif
  if (ruleData.isActive === false) {
    throw new HttpsError('permission-denied', 'Ce code promo est désactivé.');
  }

  // Vérifier le mot de passe
  const storedHash = ruleData.partnerPasswordHash;
  if (!storedHash) {
    throw new HttpsError('failed-precondition', 'Aucun mot de passe configuré pour ce code. Contactez l\'administrateur.');
  }

  if (!verifyPassword(password, storedHash)) {
    // Log tentative échouée
    await logPromoEvent('partnerAuthAttempts', {
      code: normalizedCode,
      success: false,
      reason: 'wrong_password',
      ip: request.rawRequest?.ip || null,
    });
    throw new HttpsError('unauthenticated', 'Identifiants invalides.');
  }

  // Générer un token de session (valide 7 jours)
  const sessionToken = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

  // Sauvegarder la session
  await db.collection('partnerSessions').doc(sessionToken).set({
    code: normalizedCode,
    token: sessionToken,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    ip: request.rawRequest?.ip || null,
    userAgent: request.rawRequest?.headers?.['user-agent'] || null,
  });

  // Log succès
  await logPromoEvent('partnerAuthAttempts', {
    code: normalizedCode,
    success: true,
    ip: request.rawRequest?.ip || null,
  });

  // Mettre à jour la dernière connexion
  await ruleSnap.ref.update({
    lastPartnerLogin: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info('Partner authenticated', { code: normalizedCode });

  return {
    success: true,
    token: sessionToken,
    expiresAt: expiresAt.toISOString(),
    code: normalizedCode,
    partnerName: ruleData.partnerName || null,
  };
});

/**
 * Vérifie un token de session partenaire.
 */
export const verifyPartnerSession = onCall(async request => {
  const { token } = request.data as { token?: string };

  if (!token || typeof token !== 'string') {
    throw new HttpsError('invalid-argument', 'Token requis.');
  }

  const sessionSnap = await db.collection('partnerSessions').doc(token).get();
  if (!sessionSnap.exists) {
    throw new HttpsError('unauthenticated', 'Session invalide ou expirée.');
  }

  const sessionData = sessionSnap.data() as any;
  const expiresAt = sessionData.expiresAt?.toDate?.();

  if (expiresAt && new Date() > expiresAt) {
    // Supprimer la session expirée
    await sessionSnap.ref.delete();
    throw new HttpsError('unauthenticated', 'Session expirée.');
  }

  return {
    valid: true,
    code: sessionData.code,
    expiresAt: expiresAt?.toISOString() || null,
  };
});

/**
 * Génère ou régénère le mot de passe d'un partenaire (admin uniquement).
 * Attendu: data { code }
 * Retourne le nouveau mot de passe en clair (à communiquer au partenaire).
 */
export const regeneratePartnerPassword = onCall(async request => {
  // Vérifier que l'appelant est admin
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'Réservé aux administrateurs.');
  }

  const { code } = request.data as { code?: string };

  if (!code || typeof code !== 'string') {
    throw new HttpsError('invalid-argument', 'Code promo requis.');
  }

  const normalizedCode = code.trim().toUpperCase();

  // Vérifier que le code existe
  const ruleRef = db.collection('promoRules').doc(normalizedCode);
  const ruleSnap = await ruleRef.get();

  if (!ruleSnap.exists) {
    throw new HttpsError('not-found', 'Code promo introuvable.');
  }

  // Générer un nouveau mot de passe
  const newPassword = generatePartnerPassword();
  const passwordHash = hashPassword(newPassword);

  // Mettre à jour le document
  await ruleRef.update({
    partnerPasswordHash: passwordHash,
    partnerPasswordUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    partnerPasswordUpdatedBy: request.auth.uid,
  });

  // Invalider les anciennes sessions
  const oldSessions = await db.collection('partnerSessions').where('code', '==', normalizedCode).get();
  const batch = db.batch();
  oldSessions.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  logger.info('Partner password regenerated', { code: normalizedCode, by: request.auth.uid });

  return {
    success: true,
    code: normalizedCode,
    password: newPassword, // En clair, à communiquer au partenaire
    message: `Nouveau mot de passe généré. Communiquez-le au partenaire: ${newPassword}`,
  };
});

/**
 * Récupère le dashboard d'un partenaire authentifié.
 * Nécessite un token de session valide.
 */
export const getPartnerDashboard = onCall(async request => {
  const { token, code, rangeDays } = request.data as {
    token?: string;
    code?: string;
    rangeDays?: number;
  };

  let authenticatedCode: string | null = null;

  // Vérifier l'authentification par token de session
  if (token) {
    const sessionSnap = await db.collection('partnerSessions').doc(token).get();
    if (sessionSnap.exists) {
      const sessionData = sessionSnap.data() as any;
      const expiresAt = sessionData.expiresAt?.toDate?.();
      if (!expiresAt || new Date() <= expiresAt) {
        authenticatedCode = sessionData.code;
      }
    }
  }

  // Fallback: si pas de token, vérifier le code (mode démonstration)
  const queryCode = code?.trim().toUpperCase();
  if (!authenticatedCode && !queryCode) {
    throw new HttpsError('unauthenticated', 'Authentification requise.');
  }

  const targetCode = authenticatedCode || queryCode!;
  const isAuthenticated = Boolean(authenticatedCode);

  // Récupérer les données du code promo
  const ruleSnap = await db.collection('promoRules').doc(targetCode).get();
  if (!ruleSnap.exists) {
    throw new HttpsError('not-found', 'Code promo introuvable.');
  }

  const ruleData = ruleSnap.data() as any;

  // Si non authentifié, retourner seulement des infos basiques (mode démo)
  if (!isAuthenticated) {
    return {
      code: targetCode,
      authenticated: false,
      message: 'Connectez-vous pour voir vos statistiques détaillées.',
      kpis: { sales: 0, leads: 0, commission: 0, discount: 0 },
      channels: [],
      payouts: { history: [] },
      table: [],
      rule: {
        code: targetCode,
        allowedChannels: ruleData.allowedChannels || [],
        partnerRefRequired: ruleData.partnerRefRequired || false,
        priceBrackets: ruleData.priceBrackets || [],
      },
    };
  }

  // Utilisateur authentifié: retourner les vraies stats
  const days = clampRangeDays(rangeDays);
  const metrics = await fetchPartnerMetrics(targetCode, days);

  return {
    code: targetCode,
    authenticated: true,
    partnerName: ruleData.partnerName || null,
    kpis: metrics.kpis,
    channels: metrics.channels,
    payouts: metrics.payouts,
    table: metrics.table,
    dailyData: metrics.dailyData,
    rule: {
      code: targetCode,
      allowedChannels: ruleData.allowedChannels || [],
      partnerRefRequired: ruleData.partnerRefRequired || false,
      priceBrackets: ruleData.priceBrackets || [],
    },
  };
});

/**
 * Helper pour récupérer les métriques d'un partenaire.
 */
const fetchPartnerMetrics = async (code: string, rangeDays: number) => {
  const now = new Date();
  const startDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

  let totalSales = 0;
  let totalLeads = 0;
  let totalCommission = 0;
  let totalDiscount = 0;
  const channelStats: Record<string, { count: number; commission: number; discount: number }> = {};
  const salesTable: any[] = [];
  const dailyData: Array<{ date: string; visits: number; sales: number }> = [];

  // Récupérer les métriques quotidiennes
  const metricsRef = db.collection('promoMetrics').doc(code).collection('daily');
  const metricsSnap = await metricsRef.where('date', '>=', dayKeyUtc(startDate)).orderBy('date', 'asc').limit(rangeDays).get();

  metricsSnap.docs.forEach(doc => {
    const data = doc.data();
    const docDate = data.date || doc.id;
    const dailyVisits = data.visits?.total || 0;
    const dailySales = data.sales?.count || 0;

    // Collecter les données quotidiennes pour le graphique
    dailyData.push({
      date: docDate,
      visits: dailyVisits,
      sales: dailySales,
    });

    // Agrégation des visites (leads)
    if (data.visits?.total) {
      totalLeads += data.visits.total;
    }

    // Agrégation des ventes
    if (data.sales?.count) {
      totalSales += data.sales.count;
      totalCommission += data.sales.commission || 0;
      totalDiscount += data.sales.discount || 0;
    }

    // Agrégation par canal
    if (data.visits) {
      ['web', 'app', 'wa', 'qr', 'bo'].forEach(ch => {
        if (data.visits[ch]) {
          if (!channelStats[ch]) {
            channelStats[ch] = { count: 0, commission: 0, discount: 0 };
          }
          channelStats[ch].count += data.visits[ch];
        }
      });
    }
  });

  // Récupérer les versements
  const payoutsSnap = await db
    .collection('promoPayouts')
    .where('code', '==', code)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  const payoutHistory = payoutsSnap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      amount: data.amount || 0,
      date: serializeDate(data.createdAt),
      mode: data.paymentMethod || 'Momo',
      status: data.status || 'pending',
      ref: data.reference || doc.id,
    };
  });

  const pendingAmount = payoutHistory
    .filter(p => p.status === 'pending' || p.status === 'planifie')
    .reduce((sum, p) => sum + p.amount, 0);

  const lastPaid = payoutHistory.find(p => p.status === 'percu' || p.status === 'paid');

  // Formater les canaux pour l'affichage
  const channels = Object.entries(channelStats).map(([id, stats]) => ({
    id,
    label: id.toUpperCase(),
    count: stats.count,
    commission: stats.commission,
    discount: stats.discount,
  }));

  return {
    kpis: {
      sales: totalSales,
      leads: totalLeads,
      commission: totalCommission,
      discount: totalDiscount,
    },
    channels,
    payouts: {
      lastAmount: lastPaid?.amount || 0,
      lastDate: lastPaid?.date || null,
      pendingAmount,
      history: payoutHistory,
    },
    table: salesTable,
    dailyData,
  };
};

/**
 * Déconnexion d'un partenaire (supprime la session).
 */
export const logoutPartner = onCall(async request => {
  const { token } = request.data as { token?: string };

  if (!token) {
    return { success: true };
  }

  try {
    await db.collection('partnerSessions').doc(token).delete();
  } catch (e) {
    // Ignorer si la session n'existe pas
  }

  return { success: true };
});

