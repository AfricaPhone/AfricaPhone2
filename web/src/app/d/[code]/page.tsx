'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
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

// Types V2
interface KPIs {
  clicks: number;
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
  status?: string;
  isSale?: boolean;
}

interface PromoRule {
  code: string;
  allowedChannels: string[];
  partnerRefRequired: boolean;
  priceBrackets: Array<{ min: number; max?: number; discountValue: number; commissionValue: number }>;
}

interface DashboardData {
  code: string;
  kpis: KPIs;
  channels: Channel[];
  payouts: Payouts;
  table: SaleRow[];
  rule: PromoRule;
  dailyHistory?: Array<{ date: string; clicks: number; sales: number; leads: number }>;
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
  kpis: { clicks: 0, sales: 0, leads: 0, commission: 0, discount: 0 },
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
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('Chargement...');
  const [data, setData] = useState<DashboardData>({ ...FALLBACK_DATA, code });
  const [links, setLinks] = useState<GeneratedLinks | null>(null);

  // Filters State
  const [rangeType, setRangeType] = useState<'7d' | '30d' | 'month' | 'custom'>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Form state
  const [codeInput, setCodeInput] = useState(code);
  const [refInput] = useState(''); // Kept as it might be used in loadDashboard if UI allows input in future
  // Removed unused inputs: campaignInput, subInput, cartValueInput

  // Load dashboard data
  const loadDashboard = useCallback(async (promoCode: string) => {
    if (!promoCode) {
      setData({ ...FALLBACK_DATA, code: promoCode });
      setStatus('Veuillez entrer un code promo.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setStatus('Synchronisation...');

    try {
      const app = getFirebaseApp();
      const functions = getFunctions(app);
      const getPartnerDashboard = httpsCallable<{ code: string; partnerId?: string; rangeDays?: number, startAt?: string, endAt?: string }, DashboardData>(
        functions,
        'getPartnerDashboardV2'
      );

      // Calcul des paramètres de date
      let rangeDays = 7;
      let startAt = undefined;
      let endAt = undefined;

      if (rangeType === '30d') rangeDays = 30;
      if (rangeType === 'month') rangeDays = 30;
      if (rangeType === 'custom' && customStart) {
        startAt = customStart;
        endAt = customEnd || undefined;
      }

      const result = await getPartnerDashboard({
        code: promoCode,
        partnerId: refInput || undefined,
        rangeDays: rangeType !== 'custom' ? rangeDays : undefined,
        startAt,
        endAt
      });

      setData(result.data || { ...FALLBACK_DATA, code: promoCode });
      setStatus('Données à jour');
    } catch (error) {
      console.error('getPartnerDashboard error:', error);
      setData({ ...FALLBACK_DATA, code: promoCode });
      setStatus('Erreur de chargement. Données locales.');
    } finally {
      setIsLoading(false);
    }
  }, [refInput, rangeType, customStart, customEnd]);

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
      // Removed campaign/sub inputs from call as they are not in UI
      const result = await generatePromoLinks({
        code: codeInput.trim(),
        ref: refInput || undefined,
      });
      setLinks(result.data);
      setStatus('Liens générés.');
    } catch (error) {
      console.error('generatePromoLinks error:', error);
      setStatus('Erreur lors de la génération des liens.');
    }
  }, [codeInput, refInput]);

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
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Helper: Conversion Rate
  const conversionRate = data.kpis.clicks > 0
    ? ((data.kpis.sales / data.kpis.clicks) * 100).toFixed(1)
    : '0.0';

  return (
    <div className={`${styles.appShell} ${darkMode ? styles.dark : styles.light}`}>
      {/* Loading indicator */}
      {isLoading && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99, background: 'rgba(0,0,0,0.5)', color: 'white', textAlign: 'center', padding: '10px' }}>
          Chargement des données...
        </div>
      )}

      {/* Header */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.logo}></div>
          <div>
            <p className={styles.eyebrow}>Espace Partenaire Pro</p>
            <p className={styles.title}>Dashboard Performance</p>
          </div>
        </div>
        <div className={styles.topActions}>
          <button className={styles.toggleBtn} onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀️ Clair' : '🌙 Sombre'}
          </button>
        </div>
      </header>

      {/* Filters Bar */}
      <section className={styles.card} style={{ padding: '15px 20px' }}>
        <div className={styles.filters} style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={styles.label} style={{ marginBottom: 0 }}>Période :</span>
            <button
              className={rangeType === '7d' ? styles.pillPrimary : styles.pillLight}
              onClick={() => { setRangeType('7d'); setCustomStart(''); loadDashboard(code); }}
            >
              7 jours
            </button>
            <button
              className={rangeType === '30d' ? styles.pillPrimary : styles.pillLight}
              onClick={() => { setRangeType('30d'); setCustomStart(''); loadDashboard(code); }}
            >
              30 jours
            </button>
            <button
              className={rangeType === 'custom' ? styles.pillPrimary : styles.pillLight}
              onClick={() => setRangeType('custom')}
            >
              Calendrier 📅
            </button>
          </div>

          {rangeType === 'custom' && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className={styles.field}
                style={{ padding: '5px' }}
              />
              <span>à</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className={styles.field}
                style={{ padding: '5px' }}
              />
              <button className={styles.pillSuccess} onClick={() => loadDashboard(code)}>Appliquer</button>
            </div>
          )}

          <div style={{ marginLeft: 'auto' }}>
            <span className={styles.chipActive}>{code}</span>
            {status && <span style={{ marginLeft: '10px', fontSize: '0.8em', opacity: 0.7 }}>{status}</span>}
          </div>
        </div>
      </section>

      {/* KPIs V2 */}
      <section className={styles.kpiGrid}>

        {/* KPI 1: CLICS (Trafic) */}
        <article className={styles.kpi}>
          <div className={styles.kpiHeader}>
            <p className={styles.label}>Trafic (Clics)</p>
            <span className={styles.pillGhost}>Visites</span>
          </div>
          <p className={styles.kpiValue}>{data.kpis.clicks}</p>
          <p className={styles.kpiNote}>Personnes intéressées</p>
        </article>

        {/* KPI 2: LEADS (Panier) */}
        <article className={styles.kpi}>
          <div className={styles.kpiHeader}>
            <p className={styles.label}>Leads (Paniers)</p>
            <span className={styles.pillWarning}>Intention</span>
          </div>
          <p className={styles.kpiValue}>{data.kpis.leads}</p>
          <p className={styles.kpiNote}>Ont testé le code</p>
        </article>

        {/* KPI 3: CONVERSION (Taux) */}
        <article className={styles.kpi} style={{ border: '1px solid var(--accent)' }}>
          <div className={styles.kpiHeader}>
            <p className={styles.label}>Taux de Transfo.</p>
            <span className={styles.pillSuccess}>Performance</span>
          </div>
          <p className={`${styles.kpiValue} ${styles.accent}`}>{conversionRate}%</p>
          <p className={styles.kpiNote}>Ventes / Clics</p>
        </article>

        {/* KPI 4: VENTES (Réelles) */}
        <article className={styles.kpi}>
          <div className={styles.kpiHeader}>
            <p className={styles.label}>Ventes Confirmées</p>
            <span className={styles.pillSuccess}>Payé</span>
          </div>
          <p className={styles.kpiValue}>{data.kpis.sales}</p>
          <p className={styles.kpiNote}>Commandes validées</p>
        </article>

        {/* KPI 5: GAINS */}
        <article className={styles.kpi}>
          <div className={styles.kpiHeader}>
            <p className={styles.label}>Mes Gains</p>
            <span className={styles.pillGhost}>CFA</span>
          </div>
          <p className={styles.kpiValue}>{formatCfa(data.kpis.commission)}</p>
          <p className={styles.kpiNote}>Disponibles</p>
        </article>
      </section>

      {/* Chart Placeholder (Si data.dailyHistory existe) */}
      {data.dailyHistory && data.dailyHistory.length > 0 && (
        <section className={styles.card}>
          <header className={styles.sectionHead}>
            <p className={styles.sectionTitle}>Évolution (Clics vs Ventes)</p>
          </header>
          <div style={{ padding: '20px', height: '200px', display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
            {data.dailyHistory.map((day, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', height: '150px', gap: '2px' }}>
                  <div style={{ flex: 1, background: 'var(--text-secondary)', opacity: 0.3, height: `${Math.min(100, day.clicks * 5)}%`, borderRadius: '4px' }} title={`${day.clicks} clics`}></div>
                  <div style={{ flex: 1, background: 'var(--accent)', height: `${Math.min(100, day.sales * 20)}%`, borderRadius: '4px' }} title={`${day.sales} ventes`}></div>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{day.date.split('-')[2]}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sales Table */}
      <section className={styles.card}>
        <header className={styles.sectionHead}>
          <div>
            <p className={styles.label}>Journal d&apos;activité</p>
            <p className={styles.sectionTitle}>Détail des interactions</p>
          </div>
          <span className={styles.pillGhost}>Code: {codeInput.toUpperCase()}</span>
        </header>
        <div className={styles.table}>
          <div className={`${styles.tableRow} ${styles.tableHead}`}>
            <span>Date</span>
            <span>Type</span>
            <span>Canal</span>
            <span>Montant</span>
            <span>Commission</span>
            <span>Statut</span>
          </div>
          {data.table.length === 0 ? (
            <div className={styles.tableRow}>
              <span className={styles.muted}>Aucune activité sur la période</span>
            </div>
          ) : (
            data.table.map((row) => (
              <div key={row.id} className={styles.tableRow}>
                <span>{formatDate(row.createdAt)}</span>
                <span className={row.isSale ? styles.bold : styles.muted}>
                  {row.isSale ? '💰 VENTE' : '👀 LEAD'}
                </span>
                <span>{(row.channel || 'web').toUpperCase()}</span>
                <span>{row.cartValue ? `${Math.round(row.cartValue / 1000)}k` : '-'}</span>
                <span className={row.isSale ? styles.pillSuccess : styles.muted}>
                  {row.commissionValue ? `+${Math.round(row.commissionValue)}` : '-'}
                </span>
                <span style={{ fontSize: '0.8em' }}>{row.status || (row.isSale ? 'Confirmé' : 'Abandon')}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Share Links (Reduced visibility) */}
      <section className={styles.card} style={{ opacity: 0.9 }}>
        <header className={styles.sectionHead} onClick={() => { }} style={{ cursor: 'pointer' }}>
          <p className={styles.sectionTitle}>⚙️ Outils & Liens (Configuration)</p>
          <button className={styles.pillLight}>Afficher / Masquer</button>
        </header>
        {/* Keeping share links logic but visible is fine */}
        <div className={styles.shareConfig}>
          <div className={styles.inputGroup}>
            <label>Code</label>
            <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} />
          </div>
          <div className={styles.shareActions} style={{ margin: 0 }}>
            <button className={styles.btnPrimary} onClick={generateLinks}>Générer mes liens</button>
          </div>
        </div>

        {links && (
          <div className={styles.shareGrid} style={{ marginTop: '20px' }}>
            <div className={styles.shareBlock}>
              <p className={styles.muted}>🌐 Site Web</p>
              <div className={styles.shareField}>
                <input readOnly value={links.webLink} style={{ width: '100%', border: 'none', background: 'transparent' }} />
                <button className={styles.pillLight} onClick={() => copyToClipboard(links.webLink)}>Copier</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className={styles.footnote}>
        <p>AfricaPhone Partner Dashboard © 2025</p>
      </footer>
    </div>
  );
}
