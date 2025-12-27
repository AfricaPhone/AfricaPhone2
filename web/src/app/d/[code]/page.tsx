'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import styles from './dashboard.module.css';

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyDNYwc40OWGXHrOOqqPYTB_jDGJmI7Mc1M',
  authDomain: 'africaphone-vente.firebaseapp.com',
  projectId: 'africaphone-vente',
  storageBucket: 'africaphone-vente.firebasestorage.app',
  messagingSenderId: '203471818329',
  appId: '1:203471818329:web:c2c77d48098c1a6a596b48',
};

// Types
interface KPIs {
  sales: number;
  leads: number;
  commission: number;
  discount: number;
}

interface Channel {
  id: string;
  label: string;
  count: number;
  commission: number;
  discount: number;
}

interface PayoutItem {
  amount: number;
  date: string | null;
  mode: string;
  status: string;
  ref: string;
}

interface Payouts {
  lastAmount: number;
  lastDate: string | null;
  pendingAmount: number;
  history: PayoutItem[];
}

interface SaleRow {
  id: string;
  createdAt: string;
  channel: string;
  ref: string | null;
  cartValue: number | null;
  discountValue: number | null;
  commissionValue: number | null;
}

interface PromoRule {
  code: string;
  allowedChannels: string[];
  partnerRefRequired: boolean;
  priceBrackets: Array<{ min: number; max?: number; discountValue: number; commissionValue: number }>;
}

interface DashboardData {
  code: string;
  authenticated: boolean;
  kpis: KPIs;
  channels: Channel[];
  payouts: Payouts;
  table: SaleRow[];
  rule: PromoRule;
  partnerLinks?: {
    dashboardLink: string;
    webLink: string;
    appLink: string;
    waLink: string;
  };
}

interface GeneratedLinks {
  webLink: string;
  appLink: string;
  appDeepLink: string;
  whatsappLink: string;
}

// Fallback data
const FALLBACK_DATA: DashboardData = {
  code: '',
  authenticated: false,
  kpis: { sales: 0, leads: 0, commission: 0, discount: 0 },
  channels: [],
  payouts: { lastAmount: 0, lastDate: null, pendingAmount: 0, history: [] },
  table: [],
  rule: { code: '', allowedChannels: [], partnerRefRequired: false, priceBrackets: [] },
};

// Helpers
const formatCfa = (value: number | undefined | null): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `${Math.round(value).toLocaleString('fr-FR')} CFA`;
};

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '-';
  }
};

// Initialize Firebase
const getFirebaseApp = (): FirebaseApp => {
  if (getApps().length) return getApps()[0];
  return initializeApp(firebaseConfig);
};

export default function PartnerDashboardPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase() || '';

  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Chargement...');
  const [data, setData] = useState<DashboardData>({ ...FALLBACK_DATA, code });
  const [links, setLinks] = useState<GeneratedLinks | null>(null);

  // Form state
  const [codeInput, setCodeInput] = useState(code);
  const [refInput, setRefInput] = useState('');
  const [campaignInput, setCampaignInput] = useState('');
  const [subInput, setSubInput] = useState('');
  const [cartValueInput, setCartValueInput] = useState('');
  const [validateStatus, setValidateStatus] = useState('');

  // Load dashboard data
  const loadDashboard = useCallback(async (promoCode: string) => {
    if (!promoCode) {
      setData({ ...FALLBACK_DATA, code: promoCode });
      setStatus('Veuillez entrer un code promo.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setStatus('Chargement des statistiques...');

    try {
      const app = getFirebaseApp();
      const functions = getFunctions(app);
      const getPartnerDashboard = httpsCallable<{ code: string; partnerId?: string }, DashboardData>(
        functions,
        'getPartnerDashboard'
      );
      const result = await getPartnerDashboard({ code: promoCode, partnerId: refInput || undefined });
      setData(result.data || { ...FALLBACK_DATA, code: promoCode });
      setStatus('Données synchronisées');
    } catch (error) {
      console.error('getPartnerDashboard error:', error);
      setData({ ...FALLBACK_DATA, code: promoCode });
      setStatus('Erreur de chargement. Données locales affichées.');
    } finally {
      setLoading(false);
    }
  }, [refInput]);

  // Generate links
  const generateLinks = useCallback(async () => {
    if (!codeInput.trim()) {
      setStatus('Veuillez saisir un code promo.');
      return;
    }

    setStatus('Génération des liens...');

    try {
      const app = getFirebaseApp();
      const functions = getFunctions(app);
      const generatePromoLinks = httpsCallable<
        { code: string; ref?: string; campaign?: string; sub?: string },
        GeneratedLinks
      >(functions, 'generatePromoLinks');
      const result = await generatePromoLinks({
        code: codeInput.trim(),
        ref: refInput || undefined,
        campaign: campaignInput || undefined,
        sub: subInput || undefined,
      });
      setLinks(result.data);
      setStatus('Liens générés.');
    } catch (error) {
      console.error('generatePromoLinks error:', error);
      setStatus('Erreur lors de la génération des liens.');
    }
  }, [codeInput, refInput, campaignInput, subInput]);

  // Validate code
  const validateCode = useCallback(async () => {
    if (!codeInput.trim()) {
      setValidateStatus('Veuillez saisir un code promo.');
      return;
    }

    setValidateStatus('Validation...');

    try {
      const app = getFirebaseApp();
      const functions = getFunctions(app);
      const validatePromoV2 = httpsCallable<
        { code: string; channel: string; cartValue?: number },
        { discountValue: number; commissionValue: number }
      >(functions, 'validatePromoV2');
      const cartValue = cartValueInput ? Number(cartValueInput) : undefined;
      const result = await validatePromoV2({
        code: codeInput.trim(),
        channel: 'web',
        cartValue,
      });
      setValidateStatus(
        `Valide. Remise: ${result.data.discountValue} CFA / Commission: ${result.data.commissionValue} CFA`
      );
    } catch (error) {
      console.error('validatePromoV2 error:', error);
      setValidateStatus('Code invalide ou indisponible.');
    }
  }, [codeInput, cartValueInput]);

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setStatus('Copié !');
    setTimeout(() => setStatus(''), 2000);
  };

  // Initial load
  useEffect(() => {
    if (code) {
      setCodeInput(code);
      loadDashboard(code);
      generateLinks();
    } else {
      setLoading(false);
    }
  }, [code]);

  return (
    <div className={`${styles.appShell} ${darkMode ? styles.dark : styles.light}`}>
      {/* Header */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.logo}></div>
          <div>
            <p className={styles.eyebrow}>Espace partenaire</p>
            <p className={styles.title}>Codes promos AfricaPhone</p>
          </div>
        </div>
        <div className={styles.topActions}>
          <button className={styles.toggleBtn} onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀️ Mode clair' : '🌙 Mode sombre'}
          </button>
        </div>
      </header>

      {/* Filters */}
      <section className={styles.card}>
        <div className={styles.filters}>
          <div className={styles.filterBlock}>
            <p className={styles.label}>Code actif</p>
            <div className={styles.chipRow}>
              {code && <span className={styles.chipActive}>{code}</span>}
            </div>
          </div>
          <div className={styles.filterGrid}>
            <div>
              <p className={styles.label}>Période</p>
              <div className={styles.field}>7 derniers jours ▼</div>
            </div>
            <div>
              <p className={styles.label}>Canal</p>
              <div className={styles.field}>Tous canaux ▼</div>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className={styles.kpiGrid}>
        <article className={styles.kpi}>
          <div className={styles.kpiHeader}>
            <p className={styles.label}>Ventes conclues</p>
            <span className={styles.pillSuccess}>+{data.kpis.sales} validées</span>
          </div>
          <p className={styles.kpiValue}>{data.kpis.sales}</p>
          <p className={styles.kpiNote}>✓ Paiements confirmés</p>
        </article>

        <article className={styles.kpi}>
          <div className={styles.kpiHeader}>
            <p className={styles.label}>Leads à suivre</p>
            <span className={styles.pillWarning}>{data.kpis.leads} en attente</span>
          </div>
          <p className={styles.kpiValue}>{data.kpis.leads}</p>
          <p className={styles.kpiNote}>Code vu sans achat</p>
        </article>

        <article className={styles.kpi}>
          <div className={styles.kpiHeader}>
            <p className={styles.label}>Commission estimée</p>
            <span className={styles.pillGhost}>Bonus inclus</span>
          </div>
          <p className={`${styles.kpiValue} ${styles.accent}`}>{formatCfa(data.kpis.commission)}</p>
          <p className={styles.kpiNote}>Versée à validation</p>
        </article>

        <article className={styles.kpi}>
          <div className={styles.kpiHeader}>
            <p className={styles.label}>Remises clients</p>
            <span className={styles.pillGhost}>Motivation</span>
          </div>
          <p className={styles.kpiValue}>{formatCfa(data.kpis.discount)}</p>
          <p className={styles.kpiNote}>Économies générées</p>
        </article>
      </section>

      {/* Channels */}
      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.label}>Répartition par canal</p>
            <p className={styles.sectionTitle}>Performance relative</p>
          </div>
        </div>
        <div className={styles.channelGrid}>
          {data.channels.length === 0 ? (
            <p className={styles.muted}>Aucune donnée canal.</p>
          ) : (
            data.channels.map((channel) => {
              const total = data.channels.reduce((sum, c) => sum + c.count, 0) || 1;
              const pct = Math.round((channel.count / total) * 100);
              return (
                <div key={channel.id} className={styles.channel}>
                  <div className={styles.channelTop}>
                    <span>{channel.label}</span>
                    <span className={styles.pillLight}>{channel.count} ventes</span>
                  </div>
                  <div className={styles.bar}>
                    <div className={styles.barFill} style={{ width: `${pct}%` }}></div>
                  </div>
                  <p className={styles.channelNote}>Commission: {formatCfa(channel.commission)}</p>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Payouts */}
      <section className={styles.card}>
        <header className={styles.sectionHead}>
          <div>
            <p className={styles.label}>Commissions</p>
            <p className={styles.sectionTitle}>Paiements perçus et en attente</p>
          </div>
          <div className={styles.pillGroup}>
            <span className={styles.pillPrimary}>
              Total: {formatCfa(data.payouts.history.reduce((s, p) => s + p.amount, 0))}
            </span>
            <span className={styles.pillWarning}>Attente: {formatCfa(data.payouts.pendingAmount)}</span>
          </div>
        </header>
        <div className={styles.payoutGrid}>
          <div className={styles.payoutSummary}>
            <div className={styles.summaryRow}>
              <span className={styles.muted}>Dernier reversement</span>
              <span className={styles.bold}>{formatCfa(data.payouts.lastAmount)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.muted}>Date</span>
              <span>{formatDate(data.payouts.lastDate)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.muted}>Prochain versement</span>
              <span className={styles.pillSuccess}>
                {data.payouts.pendingAmount > 0 ? 'À programmer' : 'OK'}
              </span>
            </div>
          </div>
          <div className={styles.table}>
            <div className={`${styles.tableRow} ${styles.tableHead}`}>
              <span>Date</span>
              <span>Montant</span>
              <span>Mode</span>
              <span>Statut</span>
              <span>Ref</span>
            </div>
            {data.payouts.history.length === 0 ? (
              <div className={styles.tableRow}>
                <span className={styles.muted}>Aucun paiement</span>
              </div>
            ) : (
              data.payouts.history.map((item, i) => (
                <div key={i} className={styles.tableRow}>
                  <span>{formatDate(item.date)}</span>
                  <span>{formatCfa(item.amount)}</span>
                  <span>{item.mode || '--'}</span>
                  <span>
                    <span className={item.status === 'percu' ? styles.pillSuccess : styles.pillWarning}>
                      {item.status || '--'}
                    </span>
                  </span>
                  <span className={styles.muted}>{item.ref || '--'}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Share Links */}
      <section className={styles.card}>
        <header className={styles.sectionHead}>
          <div>
            <p className={styles.label}>Liens à partager</p>
            <p className={styles.sectionTitle}>Outils de diffusion</p>
          </div>
          <span className={styles.pillGhost}>Code actif: {codeInput.toUpperCase()}</span>
        </header>
        <div className={styles.shareConfig}>
          <div className={styles.inputGroup}>
            <label>Code promo</label>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="EX: ZIDANE1"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Ref partenaire (facultatif)</label>
            <input
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              placeholder="EX: PART-001"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Campagne</label>
            <input
              value={campaignInput}
              onChange={(e) => setCampaignInput(e.target.value)}
              placeholder="default"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Variation / bouton</label>
            <input value={subInput} onChange={(e) => setSubInput(e.target.value)} placeholder="cta1" />
          </div>
        </div>
        <div className={styles.shareActions}>
          <button
            className={styles.btnPrimary}
            onClick={async () => {
              await generateLinks();
              await loadDashboard(codeInput);
            }}
          >
            Générer les liens
          </button>
          <span className={styles.status}>{status}</span>
        </div>
        <div className={styles.shareActions}>
          <input
            type="number"
            value={cartValueInput}
            onChange={(e) => setCartValueInput(e.target.value)}
            placeholder="Montant panier (optionnel)"
            className={styles.cartValueInput}
          />
          <button className={styles.pillLight} onClick={validateCode}>
            Valider le code
          </button>
          <span className={styles.status}>{validateStatus}</span>
        </div>
        <div className={styles.shareGrid}>
          {links && (
            <>
              <div className={styles.shareBlock}>
                <p className={styles.muted}>🌐 Lien Web</p>
                <div className={styles.shareField}>
                  <span>{links.webLink}</span>
                  <button className={styles.pillLight} onClick={() => copyToClipboard(links.webLink)}>
                    Copier
                  </button>
                </div>
              </div>
              <div className={styles.shareBlock}>
                <p className={styles.muted}>📱 Lien App (Deep Link)</p>
                <div className={styles.shareField}>
                  <span>{links.appDeepLink}</span>
                  <button className={styles.pillLight} onClick={() => copyToClipboard(links.appDeepLink)}>
                    Copier
                  </button>
                </div>
              </div>
              <div className={styles.shareBlock}>
                <p className={styles.muted}>💬 WhatsApp</p>
                <div className={styles.shareField}>
                  <span>{links.whatsappLink?.slice(0, 50)}...</span>
                  <button className={styles.pillLight} onClick={() => copyToClipboard(links.whatsappLink)}>
                    Copier
                  </button>
                </div>
              </div>
            </>
          )}
          <div className={styles.shareBlock}>
            <p className={styles.muted}>⚙️ Règle promo</p>
            <div className={styles.infoBlock}>
              <h4>Code: {data.rule.code || codeInput}</h4>
              <ul className={styles.infoList}>
                <li>Canaux: {data.rule.allowedChannels.join(', ') || 'tous'}</li>
                <li>Ref partenaire obligatoire: {data.rule.partnerRefRequired ? 'Oui' : 'Non'}</li>
                <li>
                  Tranches:{' '}
                  {data.rule.priceBrackets.length > 0
                    ? data.rule.priceBrackets
                        .slice(0, 3)
                        .map((b) => `${b.min}-${b.max || '+'}: -${b.discountValue}/+${b.commissionValue}`)
                        .join(' | ')
                    : '--'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Sales Table */}
      <section className={styles.card}>
        <header className={styles.sectionHead}>
          <div>
            <p className={styles.label}>Tableau ventes / leads</p>
            <p className={styles.sectionTitle}>Suivi unique</p>
          </div>
          <span className={styles.pillGhost}>Code: {codeInput.toUpperCase()}</span>
        </header>
        <div className={styles.table}>
          <div className={`${styles.tableRow} ${styles.tableHead}`}>
            <span>Date</span>
            <span>Client</span>
            <span>Canal</span>
            <span>Qté</span>
            <span>Montant</span>
            <span>Remise</span>
            <span>Commission</span>
          </div>
          {data.table.length === 0 ? (
            <div className={styles.tableRow}>
              <span className={styles.muted}>Aucune vente enregistrée</span>
            </div>
          ) : (
            data.table.map((row) => (
              <div key={row.id} className={styles.tableRow}>
                <span>{formatDate(row.createdAt)}</span>
                <span className={styles.muted}>{row.ref || '--'}</span>
                <span>{(row.channel || 'web').toUpperCase()}</span>
                <span>1</span>
                <span>{row.cartValue ? `${Math.round(row.cartValue / 1000)}k` : '-'}</span>
                <span className={styles.pillLight}>
                  {row.discountValue ? `-${Math.round(row.discountValue / 1000)}k` : '-'}
                </span>
                <span className={styles.pillPrimary}>
                  {row.commissionValue ? `+${Math.round(row.commissionValue / 1000)}k` : '-'}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footnote}>
        <p>AfricaPhone Partner Dashboard © 2025</p>
      </footer>
    </div>
  );
}
