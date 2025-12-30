// Importe la configuration et les services Firebase depuis le fichier dédié.
import {
  auth,
  db,
  storage,
  analytics,
  logEvent,
  functions,
  connectFunctionsEmulator,
  httpsCallable,
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
  getMultiFactorResolver,
} from './firebase-config.js';

// Importe les fonctions spécifiques de Firebase Auth et Firestore.
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  orderBy,
  query,
  where,
  limit,
  serverTimestamp,
  arrayRemove,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

/* ============================ Helpers ============================ */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const fmtXOF = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' });
const fmtDate = d => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
window.addEventListener('unhandledrejection', event => {
  const error = event && event.reason;
  const message = typeof error?.message === 'string' ? error.message : '';
  const code = typeof error?.code === 'string' ? error.code : '';
  if (code === 'permission-denied' || /permission/i.test(message)) {
    event.preventDefault();
    console.error('[Admin Panel] Operation blocked by Firestore security rules.', error);
    toast('Permissions insuffisantes', "Votre compte n'a pas acc?s ? cette ressource.", 'error');
  }
});

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}
function escapeAttr(s = '') {
  return escapeHtml(s).replace(/`/g, '&#96;');
}

function track(eventName, params = {}) {
  try {
    if (analytics && typeof logEvent === 'function') {
      logEvent(analytics, eventName, params);
    }
  } catch (err) {
    console.warn('Analytics log failed', err);
  }
}

function setButtonLoading(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = '<span class="loader"></span>';
  } else {
    button.disabled = false;
    if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
    }
  }
}

function toast(title, msg = '', type = 'success', timeout = 3500) {
  const host = $('#toasts');
  const el = document.createElement('div');
  const icons = { success: 'check-circle-2', error: 'alert-circle', info: 'info' };
  el.className = 'toast ' + type;
  el.innerHTML = `
	<i data-lucide="${icons[type] || 'info'}" class="icon"></i>
	<div class="grow">
	  <div class="title">${escapeHtml(title)}</div>
	  ${msg ? '<div class="msg">' + escapeHtml(msg) + '</div>' : ''}
	</div>
	<button class="btn btn-icon btn-small" aria-label="Fermer">
	  <i data-lucide="x" class="icon"></i>
	</button>`;
  host.appendChild(el);
  lucide.createIcons();
  const remove = () => {
    el.style.transform = 'translateX(8px)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 180);
  };
  el.querySelector('button').addEventListener('click', remove);
  if (timeout) setTimeout(remove, timeout);
}

function openModal(opts) {
  const {
    title = 'Confirmation',
    body = '',
    okText = 'Confirmer',
    cancelText = 'Annuler',
    danger = false,
  } = opts || {};
  return new Promise(function (resolve) {
    const modal = $('#modal');
    const foot = $('#modal-foot');
    const bodyEl = $('#modal-body');
    $('#modal-title').textContent = title;
    bodyEl.innerHTML = body;
    foot.innerHTML = '';
    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn';
    btnCancel.textContent = cancelText;
    const btnOk = document.createElement('button');
    btnOk.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
    btnOk.textContent = okText;
    foot.appendChild(btnCancel);
    foot.appendChild(btnOk);

    const close = function (res) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      resolve(res);
    };
    $('#modal-close').onclick = function () {
      close(false);
    };
    btnCancel.onclick = function () {
      close(false);
    };
    btnOk.onclick = function () {
      close(true);
    };
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modal.addEventListener(
      'click',
      function (e) {
        if (e.target === modal) {
          close(false);
        }
      },
      { once: true }
    );
    setTimeout(function () {
      btnOk.focus();
    }, 0);
    function esc(e) {
      if (e.key === 'Escape') {
        close(false);
        document.removeEventListener('keydown', esc);
      }
    }
    document.addEventListener('keydown', esc);
  });
}

function setCrumb(name) {
  $('#crumb-current').textContent = name;
}

/* ============================ State ============================ */
let allProducts = [];
let allMatches = [];
const matchPredictionsCache = new Map();
let allPromoCards = [];
let contestPromoCard = null;
let allPromoCodes = []; // AJOUT
let allPromoRules = [];
let allPromoPayouts = [];
let allBrands = [];
let allContests = [];
const contestCandidates = new Map();
const CONTEST_SELECTION_STORAGE_KEY = 'admin-selected-contest';
let selectedContestId = localStorage.getItem(CONTEST_SELECTION_STORAGE_KEY) || '';
let candidateSearchTerm = '';
let productSearchTerm = '';
let productCategoryFilter = '';
let viewMode = 'table'; // 'table' | 'cards'
let sortBy = { key: 'name', dir: 'asc' };
let promoCodePartnerFilter = '';
let promoPayoutSearchTerm = '';
let functionsInstance = functions;
let promoTab = 'codes';
// Votes Module State
let allVotes = [];
let allVoteIntents = [];
let votesDateFilter = { start: '', end: '' };
let lostVotesFound = [];
let votesContestId = '';
const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname);
if (isLocalhost) {
  try {
    connectFunctionsEmulator(functionsInstance, 'localhost', 5001);
    console.info('[Admin] Functions emulator connected (localhost:5001)');
  } catch (err) {
    console.warn('[Admin] Functions emulator connection failed', err);
  }
}
const PREDEFINED_CATEGORIES = ['smartphone', 'tablette', 'portable a touche', 'accessoire'];
let PREDEFINED_SPECS = [
  '?cran',
  'Processeur',
  'Appareil Photo',
  'Batterie',
  'Connectivit?',
  'Dimensions',
  'Poids',
  'Syst?me',
];

const DEFAULT_PRICE_BRACKETS = [
  { min: 0, max: 149000, discountValue: 5000, commissionValue: 8000, label: '0-149k' },
  { min: 149000, max: 249000, discountValue: 10000, commissionValue: 15000, label: '149k-249k' },
  { min: 249000, max: 399000, discountValue: 15000, commissionValue: 25000, label: '249k-399k' },
  { min: 399000, max: null, discountValue: 20000, commissionValue: 35000, label: '400k+' },
];
const CHANNEL_OPTIONS = [
  { value: 'web', label: 'Web (site)' },
  { value: 'app', label: 'App mobile' },
  { value: 'wa', label: 'WhatsApp' },
  { value: 'qr', label: 'QR code' },
  { value: 'bo', label: 'Back-office' },
];

// --- Features / Flags ---
let featuresConfig = { promoCardsEnabled: true };
let topProductsIds = []; // Global state for top products
let linkTemplates = null;
const FALLBACK_LINK_TEMPLATES = {
  webBaseUrl: 'https://africaphone-org.web.app/promo',
  appLinkDomain: 'https://africaphone-org.web.app/ul',
  appScheme: 'africaphone://apply-promo',
  defaultCampaign: 'default',
  defaultSub: 'cta1',
  waMessageTemplate: 'Profite du code {code} sur AfricaPhone : {link} (ref {ref})',
  whatsappNumber: '',
};

/* ============================ Brackets Helpers ============================ */
function renderChannelCheckboxes(targetId, selected = []) {
  const container = document.getElementById(targetId);
  if (!container) return;
  const selectedSet = new Set((selected || []).map(s => String(s).toLowerCase()));
  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(150px, 1fr))';
  container.style.gap = '6px 12px';
  container.innerHTML = CHANNEL_OPTIONS.map(
    opt => `
      <label class="checkbox channel-item" style="display:flex;align-items:center;gap:6px;">
        <input type="checkbox" value="${opt.value}" ${selectedSet.has(opt.value) ? 'checked' : ''}>
        <span>${opt.label}</span>
      </label>
    `,
  ).join('');
}

function readChannelCheckboxes(targetId) {
  const container = document.getElementById(targetId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
    .map(el => (el.value || '').trim().toLowerCase())
    .filter(Boolean);
}

function buildBracketHeaderRow() {
  const head = document.createElement('div');
  head.className = 'bracket-head';
  head.style.display = 'grid';
  head.style.gridTemplateColumns = '1fr 1fr 1fr 1fr 1.2fr auto';
  head.style.gap = '6px';
  head.style.alignItems = 'center';
  head.style.marginTop = '4px';
  head.style.fontSize = '12px';
  head.style.fontWeight = '600';
  head.style.opacity = '0.85';
  head.innerHTML = `
    <div>Min</div>
    <div>Max</div>
    <div>Remise</div>
    <div>Commission</div>
    <div>Label</div>
    <div></div>
  `;
  return head;
}

function buildBracketRow(bracket = {}) {
  const row = document.createElement('div');
  row.className = 'bracket-row';
  row.style.display = 'grid';
  row.style.gridTemplateColumns = '1fr 1fr 1fr 1fr 1.2fr auto';
  row.style.gap = '6px';
  row.style.alignItems = 'center';
  row.style.marginTop = '8px';

  row.innerHTML = `
    <input type="number" class="input bracket-min" placeholder="Min" min="0" step="1000" value="${bracket.min ?? ''}" />
    <input type="number" class="input bracket-max" placeholder="Max (vide = +)" min="0" step="1000" value="${bracket.max ?? ''}" />
    <input type="number" class="input bracket-discount" placeholder="Remise" min="0" step="500" value="${bracket.discountValue ?? ''}" />
    <input type="number" class="input bracket-commission" placeholder="Commission" min="0" step="500" value="${bracket.commissionValue ?? ''}" />
    <input type="text" class="input bracket-label" placeholder="Label" value="${escapeAttr(bracket.label || '')}" />
    <button type="button" class="btn btn-icon btn-small" data-remove-bracket title="Supprimer">
      <i data-lucide="x" class="icon"></i>
    </button>
  `;
  row.querySelector('[data-remove-bracket]').onclick = () => row.remove();
  return row;
}

function renderBracketRows(brackets) {
  const container = document.getElementById('brackets-rows');
  if (!container) return;
  container.innerHTML = '';
  container.appendChild(buildBracketHeaderRow());
  const list = Array.isArray(brackets) && brackets.length ? brackets : DEFAULT_PRICE_BRACKETS;
  list.forEach(b => container.appendChild(buildBracketRow(b)));
  lucide.createIcons();
}

function readBracketRows() {
  const container = document.getElementById('brackets-rows');
  if (!container) return [];
  const rows = Array.from(container.querySelectorAll('.bracket-row'));
  const result = [];
  rows.forEach(row => {
    const min = Number(row.querySelector('.bracket-min')?.value || 0);
    const maxRaw = row.querySelector('.bracket-max')?.value;
    const max = maxRaw === '' || maxRaw === null || maxRaw === undefined ? null : Number(maxRaw);
    const discountValue = Number(row.querySelector('.bracket-discount')?.value || 0);
    const commissionValue = Number(row.querySelector('.bracket-commission')?.value || 0);
    const label = (row.querySelector('.bracket-label')?.value || '').trim();
    if (Number.isNaN(discountValue) || Number.isNaN(commissionValue)) {
      return;
    }
    result.push({
      min: Number.isNaN(min) ? 0 : min,
      max: Number.isNaN(max) ? null : max,
      discountValue,
      commissionValue,
      label: label || null,
    });
  });
  return result;
}

async function ensureFeaturesLoaded() {
  try {
    const ref = doc(db, 'config', 'features');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() || {};
      featuresConfig.promoCardsEnabled = data.promoCardsEnabled !== false;
    } else {
      featuresConfig.promoCardsEnabled = true;
    }
  } catch (err) {
    console.error('Settings: unable to load features config', err);
    featuresConfig.promoCardsEnabled = true;
  }
}

function applyLinkTemplatesToSettingsUI() {
  const data = linkTemplates || FALLBACK_LINK_TEMPLATES;
  const setInputsValue = (ids = [], value = '') => {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = value || '';
    });
  };
  const setStatus = (ids = [], text) => {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    });
  };
  setInputsValue(['lt-webBaseUrl', 'tab-lt-webBaseUrl'], data.webBaseUrl || '');
  setInputsValue(['lt-appLinkDomain', 'tab-lt-appLinkDomain'], data.appLinkDomain || '');
  setInputsValue(['lt-appScheme', 'tab-lt-appScheme'], data.appScheme || '');
  setInputsValue(['lt-defaultCampaign', 'tab-lt-defaultCampaign'], data.defaultCampaign || '');
  setInputsValue(['lt-defaultSub', 'tab-lt-defaultSub'], data.defaultSub || '');
  setInputsValue(['lt-waMessageTemplate', 'tab-lt-waMessageTemplate'], data.waMessageTemplate || '');
  setInputsValue(['lt-waNumber', 'tab-lt-waNumber'], data.whatsappNumber || '');
  setStatus(['lt-status', 'tab-lt-status'], 'Chargé.');
}

async function saveLinkTemplates() {
  const btn = document.getElementById('save-link-templates') || document.getElementById('tab-save-link-templates');
  setButtonLoading(btn, true);
  const readVal = ids => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && typeof el.value === 'string') return el.value.trim();
    }
    return '';
  };
  const webBaseUrl = readVal(['lt-webBaseUrl', 'tab-lt-webBaseUrl']);
  const appLinkDomain = readVal(['lt-appLinkDomain', 'tab-lt-appLinkDomain']);
  const appScheme = readVal(['lt-appScheme', 'tab-lt-appScheme']);
  const defaultCampaign = readVal(['lt-defaultCampaign', 'tab-lt-defaultCampaign']) || 'default';
  const defaultSub = readVal(['lt-defaultSub', 'tab-lt-defaultSub']) || 'cta1';
  const waMessageTemplate = readVal(['lt-waMessageTemplate', 'tab-lt-waMessageTemplate']);
  const whatsappNumber = readVal(['lt-waNumber', 'tab-lt-waNumber']);
  const payload = {
    webBaseUrl,
    appLinkDomain,
    appScheme,
    defaultCampaign,
    defaultSub,
    waMessageTemplate,
    whatsappNumber,
  };
  try {
    const ref = doc(db, 'config', 'linkTemplates');
    await setDoc(ref, payload, { merge: true });
    linkTemplates = { ...FALLBACK_LINK_TEMPLATES, ...payload };
    applyLinkTemplatesToSettingsUI();
    track('link_templates_save', { hasWaNumber: Boolean(payload.whatsappNumber) });
    toast('Enregistr?', 'Templates de liens mis ? jour', 'success');
  } catch (err) {
    console.error('Save link templates failed', err);
    toast('Erreur', 'Impossible de sauvegarder les templates', 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

async function ensureLinkTemplatesLoaded() {
  try {
    const ref = doc(db, 'config', 'linkTemplates');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      linkTemplates = { ...FALLBACK_LINK_TEMPLATES, ...(snap.data() || {}) };
    } else {
      linkTemplates = { ...FALLBACK_LINK_TEMPLATES };
    }
  } catch (err) {
    console.error('Settings: unable to load link templates', err);
    linkTemplates = { ...FALLBACK_LINK_TEMPLATES };
  }
}

function applyFeaturesToSettingsUI() {
  const el = document.getElementById('toggle-promocards');
  if (el) {
    el.checked = !!featuresConfig.promoCardsEnabled;
  }
}

/* ============================ Auth ============================ */
const $login = $('#login'),
  $loginForm = $('#login-form'),
  $loginError = $('#login-error');
const $app = $('#app');

// --- MFA State ---
let pendingMfaResolver = null;
let pendingCredentials = { email: '', password: '' };
let mfaEnrollmentSecret = null;

// --- MFA UI Helpers ---
function showMfaModal(mode = 'verify') {
  const modal = document.getElementById('mfa-modal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  const verifySection = document.getElementById('mfa-verify-section');
  const enrollSection = document.getElementById('mfa-enroll-section');

  if (mode === 'enroll') {
    verifySection?.classList.add('hide');
    enrollSection?.classList.remove('hide');
  } else {
    verifySection?.classList.remove('hide');
    enrollSection?.classList.add('hide');
  }
}

function hideMfaModal() {
  const modal = document.getElementById('mfa-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  pendingMfaResolver = null;
  pendingCredentials = { email: '', password: '' };
  mfaEnrollmentSecret = null;
}

async function handleMfaVerification(code) {
  if (!pendingMfaResolver || !code) {
    toast('Erreur', 'Code TOTP invalide', 'error');
    return false;
  }

  try {
    const mfaAssertion = TotpMultiFactorGenerator.assertionForSignIn(
      pendingMfaResolver.hints[0].uid,
      code.trim()
    );
    await pendingMfaResolver.resolveSignIn(mfaAssertion);
    hideMfaModal();
    toast('Bienvenue', 'Connexion réussie avec 2FA', 'success');
    return true;
  } catch (err) {
    console.error('MFA verification failed:', err);
    toast('Erreur', 'Code 2FA invalide. Veuillez réessayer.', 'error');
    return false;
  }
}

async function startMfaEnrollment(user) {
  try {
    // Re-authenticate user first
    const credential = EmailAuthProvider.credential(
      pendingCredentials.email,
      pendingCredentials.password
    );
    await reauthenticateWithCredential(user, credential);

    // Generate TOTP secret
    const mfaSession = await multiFactor(user).getSession();
    mfaEnrollmentSecret = await TotpMultiFactorGenerator.generateSecret(mfaSession);

    // Display QR code
    const qrUrl = mfaEnrollmentSecret.generateQrCodeUrl(
      pendingCredentials.email,
      'AfricaPhone Admin'
    );
    const qrContainer = document.getElementById('mfa-qr-code');
    if (qrContainer) {
      qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}" alt="QR Code 2FA" />`;
    }

    const secretDisplay = document.getElementById('mfa-secret-key');
    if (secretDisplay) {
      secretDisplay.textContent = mfaEnrollmentSecret.secretKey;
    }

    showMfaModal('enroll');
    return true;
  } catch (err) {
    console.error('MFA enrollment failed:', err);
    toast('Erreur', 'Impossible de démarrer la configuration 2FA', 'error');
    return false;
  }
}

async function completeMfaEnrollment(code) {
  if (!mfaEnrollmentSecret || !code) {
    toast('Erreur', 'Code TOTP invalide', 'error');
    return false;
  }

  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    const mfaAssertion = TotpMultiFactorGenerator.assertionForEnrollment(
      mfaEnrollmentSecret,
      code.trim()
    );

    await multiFactor(user).enroll(mfaAssertion, 'Authenticator App');
    hideMfaModal();
    toast('Succès', 'Authentification 2FA activée avec succès !', 'success');

    // Now proceed with login
    $login.classList.add('hide');
    $app.classList.remove('hide');
    $app.setAttribute('aria-hidden', 'false');
    initAfterLogin();
    return true;
  } catch (err) {
    console.error('MFA enrollment completion failed:', err);
    toast('Erreur', 'Code de vérification invalide. Veuillez réessayer.', 'error');
    return false;
  }
}

$loginForm?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const submitBtn = $loginForm.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);
  const email = $('#email').value.trim();
  const pass = $('#password').value.trim();
  $('#email-err').classList.add('hide');
  $('#password-err').classList.add('hide');
  $loginError.classList.add('hide');
  if (!email) {
    $('#email-err').textContent = 'Email requis.';
    $('#email-err').classList.remove('hide');
    setButtonLoading(submitBtn, false);
    return;
  }
  if (!pass) {
    $('#password-err').textContent = 'Mot de passe requis.';
    $('#password-err').classList.remove('hide');
    setButtonLoading(submitBtn, false);
    return;
  }

  // Store credentials for MFA flow
  pendingCredentials = { email, password: pass };

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    toast('Bienvenue', 'Connexion réussie', 'success');
  } catch (err) {
    console.error('Login error:', err);

    // Check if MFA is required
    if (err.code === 'auth/multi-factor-auth-required') {
      try {
        pendingMfaResolver = getMultiFactorResolver(auth, err);
        showMfaModal('verify');
        toast('2FA requis', 'Veuillez entrer votre code d\'authentification', 'info');
      } catch (mfaErr) {
        console.error('MFA resolver error:', mfaErr);
        $loginError.textContent = 'Erreur de configuration 2FA.';
        $loginError.classList.remove('hide');
      }
    } else {
      $loginError.textContent = 'Identifiants invalides.';
      $loginError.classList.remove('hide');
      toast('Erreur', 'Impossible de se connecter', 'error');
    }
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

onAuthStateChanged(auth, async function (user) {
  const logged = !!user;

  if (logged) {
    // Vérifie si l'utilisateur est un administrateur
    try {
      const tokenResult = await user.getIdTokenResult(true);
      if (tokenResult.claims.admin) {
        // L'utilisateur est un administrateur
        console.log(`[Admin Panel] Connexion d'un admin réussie. UID: ${user.uid}`);

        // Check if MFA is enrolled
        const enrolledFactors = multiFactor(user).enrolledFactors;
        if (enrolledFactors.length === 0) {
          // MFA not enrolled - force enrollment
          console.log('[Admin Panel] 2FA non configuré, démarrage de l\'enrôlement obligatoire');
          toast('Configuration 2FA requise', 'Vous devez configurer l\'authentification à deux facteurs pour accéder au panneau admin.', 'info');
          await startMfaEnrollment(user);
          return;
        }

        // MFA is enrolled, proceed with login
        $login.classList.add('hide');
        $app.classList.remove('hide');
        $app.setAttribute('aria-hidden', 'false');
        initAfterLogin();
      } else {
        // L'utilisateur n'est pas un administrateur, le déconnecte
        await signOut(auth);
        toast('Accès refusé', "Vos identifiants ne sont pas ceux d'un administrateur.", 'error');
        location.reload();
      }
    } catch (err) {
      console.error('Erreur lors de la vérification des revendications:', err);
      await signOut(auth);
      location.reload();
    }
  } else {
    // L'utilisateur n'est pas connecté
    $login.classList.remove('hide');
    $app.classList.add('hide');
    $app.setAttribute('aria-hidden', 'true');
  }
});

$('#logout').addEventListener('click', async function () {
  await signOut(auth);
  toast('D&eacute;connect&eacute;', '', 'success');
  location.hash = '#/products';
});

// Drawer mobile
const drawer = $('#drawer');
$('#open-drawer').addEventListener('click', function () {
  drawer.classList.add('open');
});
$('[data-close-drawer]')?.addEventListener('click', function () {
  drawer.classList.remove('open');
});
$('#drawer-logout')?.addEventListener('click', async function () {
  await signOut(auth);
  drawer.classList.remove('open');
});

// Drawer links
$$('#drawer .link-item').forEach(function (a) {
  a.addEventListener('click', function () {
    location.hash = a.dataset.route;
    drawer.classList.remove('open');
  });
});

/* ============================ Theme ============================ */
const themePrefEl = $('#theme-pref');
function applyTheme(pref) {
  const root = document.documentElement;
  if (pref === 'light') {
    root.setAttribute('data-theme', 'light');
    if (themePrefEl) {
      themePrefEl.textContent = 'Clair';
    }
  } else if (pref === 'dark') {
    root.setAttribute('data-theme', 'dark');
    if (themePrefEl) {
      themePrefEl.textContent = 'Sombre';
    }
  } else {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', dark ? 'dark' : 'auto');
    if (themePrefEl) {
      themePrefEl.textContent = 'Auto';
    }
  }
  localStorage.setItem('theme-pref', pref);
}
applyTheme(localStorage.getItem('theme-pref') || 'auto');
$('#toggle-theme').addEventListener('click', function () {
  const now = localStorage.getItem('theme-pref') || 'auto';
  const next = now === 'light' ? 'dark' : now === 'dark' ? 'auto' : 'light';
  applyTheme(next);
  toast(
    'Th&egrave;me',
    'Pr&eacute;f&eacute;rence: ' + (next === 'light' ? 'Clair' : next === 'dark' ? 'Sombre' : 'Auto'),
    'info'
  );
});
$('#drawer-theme')?.addEventListener('click', function () {
  $('#toggle-theme').click();
});
$$('#page-settings [data-theme-choice]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    applyTheme(btn.dataset.themeChoice);
  });
});

/* ============================ Votes Module ============================ */
async function initVotesModule() {
  const contestSelect = $('#votes-contest-select');
  const refreshBtn = $('#votes-refresh');
  const generateReportBtn = $('#votes-generate-report');
  const startDateInput = $('#votes-start-date');
  const endDateInput = $('#votes-end-date');

  // Load contests into select
  await ensureContestsLoaded();
  contestSelect.innerHTML = '<option value="">Sélectionner un concours</option>' +
    allContests.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('');

  // Set default contest if available
  if (allContests.length > 0 && !votesContestId) {
    votesContestId = allContests[0].id;
    contestSelect.value = votesContestId;
  }

  // Listeners
  contestSelect.addEventListener('change', (e) => {
    votesContestId = e.target.value;
    loadVotesData();
  });

  startDateInput.addEventListener('change', (e) => {
    votesDateFilter.start = e.target.value;
    loadVotesData(); // Refresh on date change
  });

  endDateInput.addEventListener('change', (e) => {
    votesDateFilter.end = e.target.value;
    loadVotesData(); // Refresh on date change
  });

  refreshBtn.addEventListener('click', loadVotesData);

  generateReportBtn.addEventListener('click', () => {
    toast('Info', 'Fonctionnalité de rapport à venir', 'info');
  });

  // Initial load
  if (votesContestId) {
    loadVotesData();
  }
}

async function loadVotesData() {
  if (!votesContestId) return;

  const container = $('#votes-content');
  const statsContainer = $('#votes-stats');
  const rankingsContainer = $('#votes-rankings');
  const alertContainer = $('#votes-lost-alert');

  // Show loading state
  statsContainer.innerHTML = '<div class="skeleton" style="height:100px;"></div>'.repeat(4);
  rankingsContainer.innerHTML = '<div class="skeleton" style="height:300px;"></div>';

  try {
    // 1. Fetch Votes for Contest
    const votesRef = collection(db, `contests/${votesContestId}/votes`);
    let q = query(votesRef, orderBy('timestamp', 'desc'));

    // Client-side filtering for dates (since compound queries might need indexes)
    // We fetch all or a reasonable limit, then filter. For admin stats, we might want all.
    // WARNING: If thousands of votes, this might be heavy. 
    // Optimization: Add date range to query if indexes exist. 
    // For now, let's fetch last 2000 votes to avoid reading too much if no date filter.
    if (!votesDateFilter.start && !votesDateFilter.end) {
      q = query(votesRef, orderBy('timestamp', 'desc'), limit(5000));
    }

    const votesSnap = await getDocs(q);
    allVotes = votesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter by date matches
    let filteredVotes = allVotes;
    if (votesDateFilter.start) {
      const startTs = new Date(votesDateFilter.start).getTime();
      filteredVotes = filteredVotes.filter(v => v.timestamp?.toMillis() >= startTs);
    }
    if (votesDateFilter.end) {
      // End of day
      const endTs = new Date(votesDateFilter.end).setHours(23, 59, 59, 999);
      filteredVotes = filteredVotes.filter(v => v.timestamp?.toMillis() <= endTs);
    }

    // 2. Fetch Candidates (should be loaded)
    // const candidates = ... (we need to fetch candidates subcollection or use a map)
    const candidatesRef = collection(db, `contests/${votesContestId}/candidates`);
    const candidatesSnap = await getDocs(candidatesRef);
    const candidatesMap = new Map();
    candidatesSnap.docs.forEach(d => {
      candidatesMap.set(d.id, { id: d.id, ...d.data() });
    });

    // 3. Calculate Stats
    const totalVotes = filteredVotes.length;
    const totalAmount = filteredVotes.reduce((sum, v) => sum + (v.amount || 0), 0);
    const totalTransactions = new Set(filteredVotes.map(v => v.transactionId)).size; // approx

    // 4. Render Stats
    statsContainer.innerHTML = `
        <div class="stat-card">
            <span class="stat-label">Total Votes</span>
            <span class="stat-value">${totalVotes.toLocaleString()}</span>
        </div>
        <div class="stat-card">
            <span class="stat-label">Montant Total</span>
            <span class="stat-value">${fmtXOF.format(totalAmount)}</span>
        </div>
        <div class="stat-card">
            <span class="stat-label">Transactions (est.)</span>
            <span class="stat-value">${totalTransactions.toLocaleString()}</span>
        </div>
         <div class="stat-card">
            <span class="stat-label">Candidats</span>
            <span class="stat-value">${candidatesMap.size}</span>
        </div>
    `;

    // 5. Calculate Rankings
    const rankingMap = new Map();
    candidatesMap.forEach((c, id) => rankingMap.set(id, { ...c, count: 0, amount: 0 }));

    filteredVotes.forEach(v => {
      if (v.candidateId && rankingMap.has(v.candidateId)) {
        const c = rankingMap.get(v.candidateId);
        c.count += 1;
        c.amount += (v.amount || 0);
      }
    });

    const rankedList = Array.from(rankingMap.values()).sort((a, b) => b.count - a.count);

    // 6. Render Rankings
    rankingsContainer.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Rang</th>
                    <th>Candidat</th>
                    <th>Votes</th>
                    <th>Montant</th>
                    <th>%</th>
                </tr>
            </thead>
            <tbody>
                ${rankedList.map((c, idx) => `
                    <tr>
                        <td><strong>#${idx + 1}</strong></td>
                        <td>
                             <div style="display:flex;align-items:center;gap:10px;">
                                <img src="${c.photoUrl || ''}" class="thumb" style="width:32px;height:32px;border-radius:50%" onerror="this.style.display='none'">
                                <span>${escapeHtml(c.name)}</span>
                            </div>
                        </td>
                        <td>${c.count}</td>
                        <td>${fmtXOF.format(c.amount)}</td>
                        <td>${totalVotes > 0 ? ((c.count / totalVotes) * 100).toFixed(1) + '%' : '0%'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    // 7. Check for Lost Votes logic (simplified: check pending intents vs successful payments)
    // This requires fetching voteIntents which can be large.
    // For this specific view, we might only scan properly if we query intents.
    checkForLostVotes(alertContainer);

  } catch (err) {
    console.error("Error loading votes data:", err);
    toast('Erreur', 'Impossible de charger les données de votes', 'error');
  }
}

async function checkForLostVotes(container) {
  if (!votesContestId) return;
  container.classList.add('hide');

  try {
    // Query for PENDING intents that are OLDER than 5 minutes (to avoid race conditions with live votes)
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);

    // We look for intents that are strictly 'pending'
    // In a real scenario we'd query by status.
    const intentsRef = collection(db, 'voteIntents');
    const q = query(intentsRef, where('contestId', '==', votesContestId), where('status', '==', 'pending'), limit(50));
    const snap = await getDocs(q);

    const potentialLost = [];
    // For each pending intent, we ideally verify with Kkiapay (via edge function or simple status check if we had the API key here, but we don't safely).
    // For this Admin panel, we will rely on a "Scan" button or just display those that seem stuck?
    // Actually, detecting lost votes requires checking if payment WAS successful. 
    // We can't easily know if payment was successful from here without Kkiapay API.
    // BUT, if we assume the user might have run a script or we have a flag, we can show it.

    // Alternative: The user has `scripts/recover_lost_votes.js` for deep analysis.
    // Here, we can just provide a UI to trigger that analysis OR just show basic "Stuck" intents.

    if (!snap.empty) {
      container.innerHTML = `
                <div class="votes-alert-content">
                    <div class="votes-alert-title">Votes en attente détectés</div>
                    <div class="votes-alert-msg">Il y a ${snap.size} intentions de vote en statut 'pending'. Cela peut indiquer des votes perdus ou des abandons.</div>
                </div>
                <button class="btn btn-small btn-outline" id="btn-scan-lost">Analyser</button>
             `;
      container.classList.remove('hide');

      $('#btn-scan-lost').onclick = () => {
        toast('Info', 'Veuillez utiliser le script de récupération via le terminal pour une analyse précise.', 'info');
      };
    }

  } catch (err) {
    console.warn("Lost votes check failed", err);
  }
}


/* ============================ Routing ============================ */
const $navProducts = $('#nav-products'),
  $navBrands = $('#nav-brands'),
  $navMatches = $('#nav-matches'),
  $navContests = $('#nav-contests'),
  $navSettings = $('#nav-settings'),
  $navPromoCards = $('#nav-promocards'),
  $navPromoCodes = $('#nav-promocodes');
const $toolbarProducts = $('#toolbar-products'),
  $toolbarBrands = $('#toolbar-brands'),
  $toolbarMatches = $('#toolbar-matches'),
  $toolbarContests = $('#toolbar-contests'),
  $toolbarPromoCards = $('#toolbar-promocards'),
  $toolbarPromoCodes = $('#toolbar-promocodes');
const $productsContent = $('#products-content'),
  $brandsContent = $('#brands-content'),
  $matchesContent = $('#matches-content'),
  $contestsContent = $('#contests-content'),
  $promoCardsContent = $('#promocards-content'),
  $promoCodesContent = $('#promocodes-content'),
  $promoRulesContent = document.getElementById('promorules-content'),
  $promoPayoutsContent = document.getElementById('promopayouts-content'),
  $promoTemplatesContent = document.getElementById('promo-templates-content');

window.addEventListener('hashchange', handleRoute);
window.addEventListener('hashchange', async function () {
  try {
    const parts = (location.hash || '#/products').split('/');
    const route = parts[1] || 'products';
    if (route === 'settings') {
      await ensureFeaturesLoaded();
      applyFeaturesToSettingsUI();
      await ensureLinkTemplatesLoaded();
      applyLinkTemplatesToSettingsUI();
    }
  } catch (e) {
    console.warn('Settings sync skipped', e);
  }
});
async function handleRoute() {
  const parts = (location.hash || '#/products').split('/');
  const route = parts[1] || 'products';
  const id = parts[2];
  const childId = parts[3];
  track('page_view_admin', { route, id: id || null });

  const isContestRoute = route.includes('contest') || route.includes('candidate');
  const isPromoRoute = route.includes('promocode') || route.includes('promorule') || route.includes('promopayout');
  const isVotesRoute = route.includes('votes');

  // Nav active
  $navProducts.classList.toggle('active', route.includes('product'));
  $navBrands.classList.toggle('active', route.includes('brand'));
  $navMatches.classList.toggle('active', route.includes('match'));
  $navContests.classList.toggle('active', isContestRoute);
  $navPromoCards.classList.toggle('active', route.includes('promocard'));
  $navPromoCodes.classList.toggle('active', isPromoRoute);
  if ($navSettings) $navSettings.classList.toggle('active', route === 'settings');
  // Dynamic Nav for Votes (if element exists)
  const $navVotes = document.getElementById('nav-votes');
  if ($navVotes) $navVotes.classList.toggle('active', isVotesRoute);

  // Toolbars affichage
  $toolbarProducts.classList.toggle('hide', !route.includes('product'));
  $toolbarBrands.classList.toggle('hide', !route.includes('brand'));
  $toolbarMatches.classList.toggle('hide', !route.includes('match'));
  $toolbarContests.classList.toggle('hide', !isContestRoute);
  $toolbarPromoCards.classList.toggle('hide', !route.includes('promocard'));
  $toolbarPromoCodes.classList.toggle('hide', !isPromoRoute);
  const $toolbarVotes = document.getElementById('toolbar-votes');
  if ($toolbarVotes) $toolbarVotes.classList.toggle('hide', !isVotesRoute);

  // Pages
  $('#page-products').classList.toggle('hide', !route.includes('product'));
  $('#page-brands').classList.toggle('hide', !route.includes('brand'));
  $('#page-matches').classList.toggle('hide', !route.includes('match'));
  $('#page-contests').classList.toggle('hide', !isContestRoute);
  $('#page-promocards').classList.toggle('hide', !route.includes('promocard'));
  $('#page-promocodes').classList.toggle('hide', !isPromoRoute);
  $('#page-settings').classList.toggle('hide', route !== 'settings');
  const $pageVotes = document.getElementById('page-votes');
  if ($pageVotes) $pageVotes.classList.toggle('hide', !isVotesRoute);

  if (route === 'products') {
    setCrumb('Produits');
    await ensureProductsLoaded();
    renderProductList();
  } else if (route === 'votes') {
    setCrumb('Votes');
    // Logic is handled by listeners, but we might want to refresh if first load
    if (!votesContestId && allContests.length > 0) {
      initVotesModule(); // Ensure init if not done
    }
  } else if (route === 'new-product') {
    setCrumb('Produits');
    await ensureProductsLoaded();
    renderProductList();
  } else if (route === 'new-product') {
    setCrumb('Nouveau produit');
    renderProductFormPage();
  } else if (route === 'edit-product' && id) {
    setCrumb('?diter produit');
    await renderProductFormPage(id);
  } else if (route === 'brands') {
    setCrumb('Marques');
    await ensureBrandsLoaded();
    renderBrandList();
  } else if (route === 'new-brand') {
    setCrumb('Nouvelle marque');
    renderBrandFormPage();
  } else if (route === 'edit-brand' && id) {
    setCrumb('?diter marque');
    await renderBrandFormPage(id);
  } else if (route === 'matches') {
    setCrumb('Matchs');
    await ensureMatchesLoaded();
    renderMatchList();
  } else if (route === 'new-match') {
    setCrumb('Nouveau match');
    renderMatchFormPage();
  } else if (route === 'edit-match' && id) {
    setCrumb('?diter match');
    await renderMatchFormPage(id);
  } else if (route === 'match-predictions' && id) {
    await ensureMatchesLoaded();
    await renderMatchPredictionsPage(id);
  } else if (route === 'contests') {
    setCrumb('Concours');
    await ensureContestsLoaded();
    await setSelectedContest(selectedContestId || allContests[0]?.id || '', { force: true });
  } else if (route === 'new-contest') {
    setCrumb('Nouveau concours');
    await ensureContestsLoaded();
    renderContestFormPage();
  } else if (route === 'edit-contest' && id) {
    setCrumb('?diter concours');
    await ensureContestsLoaded();
    await renderContestFormPage(id);
  } else if (route === 'new-candidate') {
    await ensureContestsLoaded();
    const contestId = id || selectedContestId || allContests[0]?.id || '';
    if (!contestId) {
      toast('Info', "Créez un concours avant d'ajouter un candidat.", 'info');
      location.hash = '#/new-contest';
      return;
    }
    await setSelectedContest(contestId, { force: true, skipRender: true });
    setCrumb('Nouveau candidat');
    await renderCandidateFormPage(contestId);
  } else if (route === 'edit-candidate' && id && childId) {
    await ensureContestsLoaded();
    await setSelectedContest(id, { force: true, skipRender: true });
    setCrumb('?diter candidat');
    await renderCandidateFormPage(id, childId);
  } else if (route === 'promocards') {
    setCrumb('Cartes Promo');
    await ensurePromoCardsLoaded();
    renderPromoCardList();
  } else if (route === 'new-promocard') {
    setCrumb('Nouvelle Carte Promo');
    renderPromoCardFormPage();
  } else if (route === 'edit-promocard' && id) {
    setCrumb('Éditer Carte Promo');
    await renderPromoCardFormPage(id);
  } else if (route === 'promocodes') {
    setCrumb('Codes Promo');
    const tabFromHash = id && ['codes', 'rules', 'payouts', 'templates'].includes(id) ? id : 'codes';
    await setPromoTab(tabFromHash);
  } else if (route === 'new-promocode') {
    setCrumb('Nouveau Code Promo');
    await setPromoTab('codes');
    renderPromoCodeFormPage();
  } else if (route === 'edit-promocode' && id) {
    setCrumb('Éditer Code Promo');
    await setPromoTab('codes');
    await renderPromoCodeFormPage(id);
  } else if (route === 'promopayouts') {
    setCrumb('Versements Promo');
    await setPromoTab('payouts');
  } else if (route === 'new-promopayout') {
    setCrumb('Nouveau versement');
    await setPromoTab('payouts');
    renderPromoPayoutFormPage();
  } else if (route === 'edit-promopayout' && id) {
    setCrumb('Éditer versement');
    await setPromoTab('payouts');
    await renderPromoPayoutFormPage(id);
  } else if (route === 'promorules') {
    setCrumb('Règles Promo');
    await setPromoTab('rules');
  } else if (route === 'new-promorule') {
    setCrumb('Nouvelle Règle Promo');
    await setPromoTab('rules');
    renderPromoRuleFormPage();
  } else if (route === 'edit-promorule' && id) {
    setCrumb('Éditer Règle Promo');
    await setPromoTab('rules');
    await renderPromoRuleFormPage(id);
  } else if (route === 'settings') {
    setCrumb('Param?tres');
  } else {
    location.hash = '#/products';
  }
}

async function initAfterLogin() {
  lucide.createIcons();
  await ensureFeaturesLoaded();
  applyFeaturesToSettingsUI();
  await ensureLinkTemplatesLoaded();
  applyLinkTemplatesToSettingsUI();
  document.querySelectorAll('#save-link-templates, #tab-save-link-templates').forEach(btn => {
    btn.addEventListener('click', saveLinkTemplates);
  });
  // Settings: bind promo cards toggle if present
  const promoToggle = document.getElementById('toggle-promocards');
  if (promoToggle) {
    promoToggle.onchange = async e => {
      const input = e.target;
      const next = !!input.checked;
      input.disabled = true;
      try {
        const ref = doc(db, 'config', 'features');
        await setDoc(ref, { promoCardsEnabled: next }, { merge: true });
        featuresConfig.promoCardsEnabled = next;
        toast('ParamÃ¨tre enregistrÃ©', next ? 'Cartes promo activÃ©es' : 'Cartes promo dÃ©sactivÃ©es', 'success');
      } catch (err) {
        console.error('Settings: unable to update promo cards flag', err);
        input.checked = !next;
        toast('Erreur', 'Impossible de mettre Ã  jour le paramÃ¨tre', 'error');
      } finally {
        input.disabled = false;
      }
    };
  }
  // Raccourcis
  $('#quick-add-product').onclick = function () {
    location.hash = '#/new-product';
  };
  $('#quick-add-brand').onclick = function () {
    location.hash = '#/new-brand';
  };
  $('#quick-add-match').onclick = function () {
    location.hash = '#/new-match';
  };
  $('#quick-add-contest').onclick = function () {
    location.hash = '#/new-contest';
  };
  $('#quick-add-candidate').onclick = function () {
    if (!allContests.length) {
      toast('Info', "Créez un concours avant d'ajouter un candidat.", 'info');
      location.hash = '#/new-contest';
      return;
    }
    const targetId = selectedContestId || allContests[0].id;
    location.hash = `#/new-candidate/${targetId}`;
  };
  $('#quick-add-promocard').onclick = function () {
    location.hash = '#/new-promocard';
  };
  $('#quick-add-promocode').onclick = function () {
    location.hash = '#/new-promocode';
  };
  const contestFilter = $('#contest-filter');
  if (contestFilter) {
    contestFilter.addEventListener('change', async event => {
      const value = event.target.value;
      if (value) {
        await setSelectedContest(value, { force: true });
      } else {
        await setSelectedContest(allContests[0]?.id || '', { force: true });
      }
    });
  }

  const candidateSearchInput = $('#search-candidates');
  if (candidateSearchInput) {
    candidateSearchInput.addEventListener('input', event => {
      candidateSearchTerm = event.target.value || '';
      if (location.hash.includes('contest') || location.hash.includes('candidate')) {
        renderContestsOverview();
      }
    });
  }

  $('#add-contest')?.addEventListener('click', () => {
    location.hash = '#/new-contest';
  });
  $('#add-candidate')?.addEventListener('click', () => {
    const targetId = selectedContestId || allContests[0]?.id || '';
    if (!targetId) {
      toast('Info', "Créez un concours avant d'ajouter un candidat.", 'info');
      location.hash = '#/new-contest';
      return;
    }
    location.hash = `#/new-candidate/${targetId}`;
  });

  // Recherche globale
  const gSearch = $('#global-search');
  document.addEventListener('keydown', function (e) {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const isInput = /input|textarea|select/i.test(tag);
    if (!isInput && (e.key === '/' || (e.key && e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)))) {
      e.preventDefault();
      gSearch.focus();
    }
  });
  handleRoute();
  // If already on settings, sync feature toggles
  try {
    const parts = (location.hash || '#/products').split('/');
    const route = parts[1] || 'products';
    if (route === 'settings') {
      await ensureFeaturesLoaded();
      applyFeaturesToSettingsUI();
    }
  } catch (e) {
    console.warn('Settings sync skipped', e);
  }
  // Initialize Votes Module
  initVotesModule().catch(err => console.warn('Votes module init failed', err));
}

/* ============================ Data Fetch ============================ */
async function ensureProductsLoaded() {
  if (allProducts.length) return;
  $productsContent.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(6);
  const q = query(collection(db, 'products'), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  allProducts = snap.docs.map(function (d) {
    return { id: d.id, ...d.data() };
  });
  $('#kpi-products').textContent = String(allProducts.length);
}

async function ensureBrandsLoaded() {
  if (allBrands.length) return;
  $brandsContent.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(4);
  const q = query(collection(db, 'brands'), orderBy('sortOrder', 'asc'));
  const snap = await getDocs(q);
  allBrands = snap.docs.map(function (d) {
    return { id: d.id, ...d.data() };
  });
  $('#kpi-brands').textContent = String(allBrands.length);
}

async function ensureMatchesLoaded() {
  if (allMatches.length) return;
  $matchesContent.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(6);
  const q = query(collection(db, 'matches'), orderBy('startTime', 'desc'));
  const snap = await getDocs(q);
  allMatches = snap.docs.map(function (d) {
    return { id: d.id, ...d.data() };
  });
  $('#kpi-matches').textContent = String(allMatches.length);
}
function getPromoSortOrder(card) {
  if (typeof card?.sortOrder === 'number') {
    return card.sortOrder;
  }
  const parsed = parseInt(card?.sortOrder, 10);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}
function getPromoCardsForDisplay() {
  const list = contestPromoCard ? [...allPromoCards, contestPromoCard] : [...allPromoCards];
  return list.sort((a, b) => getPromoSortOrder(a) - getPromoSortOrder(b));
}
function updatePromoCardsKpi() {
  const total = allPromoCards.length + (contestPromoCard ? 1 : 0);
  $('#kpi-promocards').textContent = String(total);
}
async function refreshContestPromoCard() {
  try {
    const contestsRef = collection(db, 'contests');
    const contestQuery = query(contestsRef, where('status', '==', 'active'), orderBy('endDate', 'asc'), limit(1));
    const snap = await getDocs(contestQuery);
    if (snap.empty) {
      contestPromoCard = null;
      return;
    }
    const docSnap = snap.docs[0];
    const data = docSnap.data() || {};
    const fallbackImage =
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=1400&auto=format&fit=crop';
    const image =
      (typeof data.heroImage === 'string' && data.heroImage) ||
      (typeof data.bannerImage === 'string' && data.bannerImage) ||
      (typeof data.image === 'string' && data.image) ||
      fallbackImage;
    const status = typeof data.status === 'string' ? data.status : 'draft';
    const explicitOrder =
      typeof data.promoCardSortOrder === 'number' && Number.isFinite(data.promoCardSortOrder)
        ? data.promoCardSortOrder
        : -1;
    contestPromoCard = {
      id: `contest-${docSnap.id}`,
      contestId: docSnap.id,
      title: typeof data.title === 'string' ? data.title : 'Concours',
      subtitle:
        typeof data.description === 'string' && data.description ? data.description : 'Elisez votre candidat favori.',
      cta: status === 'ended' ? 'Voir les resultats' : 'Participer',
      screen: 'Contest',
      image,
      sortOrder: explicitOrder,
      isActive: status === 'active',
      isContestCard: true,
    };
  } catch (error) {
    console.error('PromoCards: unable to load contest card', error);
    contestPromoCard = null;
  }
}
async function ensurePromoCardsLoaded(force = false) {
  if (!force && allPromoCards.length > 0) {
    await refreshContestPromoCard();
    updatePromoCardsKpi();
    return;
  }
  $promoCardsContent.innerHTML = '<div class "skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(3);
  const q = query(collection(db, 'promoCards'), orderBy('sortOrder', 'asc'));
  const snap = await getDocs(q);
  allPromoCards = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  await refreshContestPromoCard();
  updatePromoCardsKpi();
}
async function ensurePromoCodesLoaded() {
  if (allPromoCodes.length > 0) return;
  await ensurePromoRulesLoaded().catch(err => console.warn('PromoRules preload skipped', err));
  $promoCodesContent.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(3);
  const q = query(collection(db, 'promoCodes'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  allPromoCodes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  $('#kpi-promocodes').textContent = String(allPromoCodes.length);
}

async function ensurePromoRulesLoaded() {
  if (allPromoRules.length > 0) return;
  const target = $promoRulesContent || $promoCodesContent;
  if (target) {
    target.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(3);
  }
  const q = query(collection(db, 'promoRules'));
  const snap = await getDocs(q);
  allPromoRules = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => {
    return (a.code || a.id || '').localeCompare(b.code || b.id || '');
  });
}

async function ensurePromoPayoutsLoaded(force = false) {
  if (!force && allPromoPayouts.length > 0) return;
  if ($promoPayoutsContent) {
    $promoPayoutsContent.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(3);
  }
  try {
    const q = query(collection(db, 'promoPayouts'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    allPromoPayouts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('PromoPayouts load failed', err);
    allPromoPayouts = [];
    if ($promoPayoutsContent) {
      $promoPayoutsContent.innerHTML =
        '<div class="center" style="padding:32px">Erreur de chargement des versements.</div>';
    }
  }
}

async function setPromoTab(tab = 'codes') {
  const allowed = ['codes', 'rules', 'payouts', 'templates'];
  const nextTab = allowed.includes(tab) ? tab : 'codes';
  promoTab = nextTab;
  document.querySelectorAll('.promo-tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === nextTab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  const sections = {
    codes: $promoCodesContent,
    rules: $promoRulesContent,
    payouts: $promoPayoutsContent,
    templates: $promoTemplatesContent,
  };
  Object.entries(sections).forEach(([key, el]) => {
    if (el) {
      el.classList.toggle('hide', key !== nextTab);
    }
  });
  // Filters: show search/partner only on codes tab
  const promoFilters = [document.getElementById('search-promocodes'), document.getElementById('filter-promocode-partner')];
  promoFilters.forEach(el => {
    if (el) el.classList.toggle('hide', nextTab !== 'codes');
  });
  if (nextTab === 'codes') {
    await ensurePromoCodesLoaded();
    renderPromoCodeList();
  } else if (nextTab === 'rules') {
    await ensurePromoRulesLoaded();
    renderPromoRuleList();
  } else if (nextTab === 'payouts') {
    await ensurePromoPayoutsLoaded();
    renderPromoPayoutList();
  } else if (nextTab === 'templates') {
    await ensureLinkTemplatesLoaded();
    applyLinkTemplatesToSettingsUI();
  }
}

/* ============================ Products UI ============================ */
$('#search-products').addEventListener('input', function (e) {
  productSearchTerm = (e.target.value || '').toLowerCase();
  if (location.hash.indexOf('#/products') === 0) renderProductList();
});
$('#filter-category').addEventListener('change', function (e) {
  productCategoryFilter = e.target.value || '';
  if (location.hash.indexOf('#/products') === 0) renderProductList();
});
$('#add-product').addEventListener('click', function () {
  location.hash = '#/new-product';
});
$('#view-table').addEventListener('click', function () {
  viewMode = 'table';
  $('#view-table').setAttribute('aria-selected', 'true');
  $('#view-cards').setAttribute('aria-selected', 'false');
  renderProductList();
});
$('#view-cards').addEventListener('click', function () {
  viewMode = 'cards';
  $('#view-table').setAttribute('aria-selected', 'false');
  $('#view-cards').setAttribute('aria-selected', 'true');
  renderProductList();
});

function filteredProducts() {
  let arr = allProducts.slice();
  if (productSearchTerm) {
    const t = productSearchTerm;
    arr = arr.filter(function (p) {
      return (
        (p.name || '').toLowerCase().indexOf(t) !== -1 ||
        (p.brand || '').toLowerCase().indexOf(t) !== -1 ||
        (p.category || '').toLowerCase().indexOf(t) !== -1
      );
    });
  }
  if (productCategoryFilter) {
    arr = arr.filter(function (p) {
      return (p.category || '') === productCategoryFilter;
    });
  }
  const dir = sortBy.dir === 'asc' ? 1 : -1;
  arr.sort(function (a, b) {
    if (['price', 'stock', 'ordreVedette'].includes(sortBy.key)) {
      const na = Number(a[sortBy.key]);
      const nb = Number(b[sortBy.key]);
      const va = Number.isFinite(na) ? na : 0;
      const vb = Number.isFinite(nb) ? nb : 0;
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase(), 'fr');
    }
    const ka = (a[sortBy.key] ?? '').toString().toLowerCase();
    const kb = (b[sortBy.key] ?? '').toString().toLowerCase();
    if (ka < kb) return -1 * dir;
    if (ka > kb) return 1 * dir;
    return 0;
  });
  return arr;
}

function renderProductList() {
  const items = filteredProducts();
  $('#bulk-delete').disabled = true;

  if (!items.length) {
    $productsContent.innerHTML =
      '' +
      '<div class="center" style="padding:32px">' +
      '  <div>' +
      '    <div class="login-title" style="text-align:center;margin-bottom:6px">Aucun produit</div>' +
      '    <div class="muted" style="text-align:center">Ajoutez votre premier produit pour d&eacute;marrer.</div>' +
      '    <div style="display:flex;justify-content:center;margin-top:10px">' +
      '      <button id="empty-add-product" class="btn btn-primary"><i data-lucide="plus" class="icon"></i> Nouveau produit</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    $('#empty-add-product').onclick = () => (location.hash = '#/new-product');
    lucide.createIcons();
    return;
  }

  if (viewMode === 'cards') {
    const grid = document.createElement('div');
    grid.className = 'grid';
    items.forEach(function (p) {
      const el = document.createElement('div');
      el.className = 'card';
      el.dataset.id = p.id;
      el.innerHTML = `
		<img class="thumb" src="${escapeAttr((p.imageUrls && p.imageUrls[0]) || p.imageUrl || '')}" alt="${escapeAttr(p.name || 'Image produit')}" loading="lazy" onerror="this.style.display='none'"/>
		<div class="grow">
		  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
			<div style="font-weight:800">${escapeHtml(p.name || 'Sans nom')}</div>
			<label class="chip" style="user-select:none">
			  <input type="checkbox" data-select id="sel-${p.id}" />
			  S?lection
			</label>
		  </div>
		  <div class="muted">${escapeHtml(p.brand || '?')} ? ${escapeHtml(p.category || '?')}</div>
		  ${typeof p.ordreVedette === 'number' && p.ordreVedette > 0 ? '<div class="chip chip-primary" style="margin-top:6px">Top #' + escapeHtml(String(p.ordreVedette)) + '</div>' : ''}
		  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
			<div style="font-weight:900">${typeof p.price === 'number' ? fmtXOF.format(p.price) : '?'}</div>
			<div class="actions">
			  <button class="btn btn-small" data-edit>?diter</button>
			  <button class="btn btn-danger btn-small" data-del>Supprimer</button>
			</div>
		  </div>
		</div>`;
      el.querySelector('[data-edit]').addEventListener('click', function () {
        location.hash = '#/edit-product/' + p.id;
      });
      el.querySelector('[data-del]').addEventListener('click', function () {
        handleDelete(p.id, p.name, 'products');
      });
      grid.appendChild(el);
    });
    $productsContent.innerHTML = '';
    $productsContent.appendChild(grid);
  } else {
    const table = document.createElement('table');
    table.className = 'table';
    const sortIcon = key => {
      if (sortBy.key !== key) return `<i data-lucide="chevrons-up-down" class="icon sort-icon"></i>`;
      return sortBy.dir === 'asc'
        ? `<i data-lucide="chevron-up" class="icon sort-icon"></i>`
        : `<i data-lucide="chevron-down" class="icon sort-icon"></i>`;
    };
    table.innerHTML = `
	  <thead>
		<tr>
		  <th style="width:38px"><input id="sel-all" type="checkbox"/></th>
		  <th style="width:60px">Image</th>
		  <th class="sortable ${sortBy.key === 'name' ? 'sorted' : ''}" data-sort="name">Nom ${sortIcon('name')}</th>
		  <th class="sortable ${sortBy.key === 'brand' ? 'sorted' : ''}" data-sort="brand">Marque ${sortIcon('brand')}</th>
		  <th class="sortable ${sortBy.key === 'category' ? 'sorted' : ''}" data-sort="category">Cat?gorie ${sortIcon('category')}</th>
		  <th style="width:140px">Prix</th>
		  <th style="width:90px">Stock</th>
		  <th style="width:110px" class="sortable ${sortBy.key === 'ordreVedette' ? 'sorted' : ''}" data-sort="ordreVedette">Top ${sortIcon('ordreVedette')}</th>
		  <th style="width:180px;text-align:right">Actions</th>
		</tr>
	  </thead>
	  <tbody id="tbody-products"></tbody>`;
    const tb = table.querySelector('#tbody-products');
    items.forEach(function (p) {
      const tr = document.createElement('tr');
      tr.dataset.id = p.id;
      const mainImage = (p.imageUrls && p.imageUrls[0]) || p.imageUrl || '';
      tr.innerHTML = `
		<td><input type="checkbox" data-select /></td>
		<td>${mainImage ? '<img class="img" src="' + escapeAttr(mainImage) + '" alt="' + escapeAttr(p.name || 'Image produit') + '" onerror="this.style.display=\'none\'" />' : '<div class="img center muted"><i data-lucide="image-off" class="icon"></i></div>'}</td>
		<td style="font-weight:800">${escapeHtml(p.name || 'Sans nom')}</td>
		<td>${escapeHtml(p.brand || '?')}</td>
		<td><span class="chip">${escapeHtml(p.category || '?')}</span></td>
		<td>
		  <input type="number" step="1" min="0" class="input" style="max-width:120px" value="${typeof p.price === 'number' ? p.price : ''}" placeholder="0" data-price-update />
		</td>
		<td>${typeof p.stock === 'number' ? p.stock : '?'}</td>
		<td><input type="number" step="1" min="0" class="input" style="max-width:100px" value="${typeof p.ordreVedette === 'number' ? p.ordreVedette : ''}" placeholder="0" data-vedette-update /></td>
		<td class="actions">
		  <button class="btn btn-small" data-edit>?diter</button>
		  <button class="btn btn-danger btn-small" data-del>Supprimer</button>
		</td>`;
      const sel = tr.querySelector('[data-select]');
      const inp = tr.querySelector('[data-price-update]');
      const vedetteInp = tr.querySelector('[data-vedette-update]');
      const btnEdit = tr.querySelector('[data-edit]');
      const btnDel = tr.querySelector('[data-del]');
      sel.addEventListener('change', updateBulkState);
      inp.addEventListener('change', function () {
        handlePriceUpdate(p.id, inp);
      });
      if (vedetteInp) {
        vedetteInp.addEventListener('change', function () {
          handleVedetteUpdate(p.id, vedetteInp);
        });
      }
      btnEdit.addEventListener('click', function () {
        location.hash = '#/edit-product/' + p.id;
      });
      btnDel.addEventListener('click', function () {
        handleDelete(p.id, p.name, 'products');
      });
      tb.appendChild(tr);
    });
    $productsContent.innerHTML = '';
    $productsContent.appendChild(table);
    $('#sel-all').addEventListener('change', function (e) {
      $$('#tbody-products [data-select]').forEach(function (cb) {
        cb.checked = e.target.checked;
      });
      updateBulkState();
    });
  }
  lucide.createIcons();
}

function updateBulkState() {
  const any = Array.prototype.slice.call($$('[data-select]')).some(function (cb) {
    return cb.checked;
  });
  $('#bulk-delete').disabled = !any;
}
$('#bulk-delete').addEventListener('click', async function () {
  const ids = Array.prototype.slice
    .call($$('[data-select]'))
    .filter(function (cb) {
      return cb.checked;
    })
    .map(function (cb) {
      return cb.closest('tr,.card').dataset.id;
    });
  if (!ids.length) return;
  const ok = await openModal({
    title: 'Supprimer la s?lection',
    body:
      '?tes-vous s?r de vouloir supprimer <strong>' +
      ids.length +
      '</strong> ?l?ment(s) ? Cette action est irr?versible.',
    okText: 'Supprimer',
    cancelText: 'Annuler',
    danger: true,
  });
  if (!ok) return;
  let done = 0,
    fail = 0;
  for (const id of ids) {
    try {
      await deleteDoc(doc(db, 'products', id));
      allProducts = allProducts.filter(function (p) {
        return p.id !== id;
      });
      done++;
    } catch (e) {
      console.error(e);
      fail++;
    }
  }
  toast('Suppression termin?e', done + ' succ?s, ' + fail + ' ?chec(s)', fail ? 'error' : 'success');
  renderProductList();
  $('#kpi-products').textContent = String(allProducts.length);
});

async function handlePriceUpdate(id, inputEl) {
  const val = parseFloat(inputEl.value);
  if (Number.isNaN(val) || val < 0) {
    toast('Prix invalide', 'Entrez un nombre positif', 'error');
    inputEl.focus();
    return;
  }
  inputEl.disabled = true;
  try {
    await updateDoc(doc(db, 'products', id), { price: val });
    const p = allProducts.find(function (x) {
      return x.id === id;
    });
    if (p) p.price = val;
    toast('Prix mis ? jour', fmtXOF.format(val), 'success');
  } catch (e) {
    console.error(e);
    toast('Erreur', 'Impossible de mettre ? jour le prix', 'error');
  } finally {
    inputEl.disabled = false;
  }
}

async function handleVedetteUpdate(id, inputEl) {
  const parsed = parseInt(inputEl.value, 10);
  const val = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  inputEl.value = val || '';
  inputEl.disabled = true;
  try {
    await updateDoc(doc(db, 'products', id), { ordreVedette: val });
    const product = allProducts.find(x => x.id === id);
    if (product) {
      product.ordreVedette = val;
    }
    toast(
      'Ordre mis Ã  jour',
      val > 0 ? `Produit positionnÃ© #${val}` : 'Produit retirÃ© du top',
      'success'
    );
  } catch (e) {
    console.error(e);
    toast('Erreur', "Impossible de mettre Ã  jour l'ordre vedette", 'error');
  } finally {
    inputEl.disabled = false;
  }
}

async function handleDelete(id, name, type) {
  const ok = await openModal({
    title: 'Supprimer',
    body: 'Supprimer "<strong>' + escapeHtml(name || id) + '</strong>" ?',
    okText: 'Supprimer',
    cancelText: 'Annuler',
    danger: true,
  });
  if (!ok) return;
  try {
    // --- D?BUT DU PATCH : Rafra?chir le jeton avant l'action privil?gi?e ---
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
    }
    // --- FIN DU PATCH ---
    await deleteDoc(doc(db, type, id));
    if (type === 'products') {
      allProducts = allProducts.filter(p => p.id !== id);
      renderProductList();
      $('#kpi-products').textContent = String(allProducts.length);
    } else if (type === 'brands') {
      allBrands = allBrands.filter(b => b.id !== id);
      renderBrandList();
      $('#kpi-brands').textContent = String(allBrands.length);
    } else if (type === 'matches') {
      allMatches = allMatches.filter(m => m.id !== id);
      matchPredictionsCache.delete(id);
      renderMatchList();
      $('#kpi-matches').textContent = String(allMatches.length);
    } else if (type === 'promoCards') {
      allPromoCards = allPromoCards.filter(c => c.id !== id);
      renderPromoCardList();
      updatePromoCardsKpi();
    } else if (type === 'promoCodes') {
      allPromoCodes = allPromoCodes.filter(c => c.id !== id);
      renderPromoCodeList();
      $('#kpi-promocodes').textContent = String(allPromoCodes.length);
      const codeValue = (name || id || '').toUpperCase();
      if (codeValue) {
        try {
          await deleteDoc(doc(db, 'promoRules', codeValue));
        } catch (err) {
          console.warn('Unable to delete linked promoRule', err);
        }
        allPromoRules = allPromoRules.filter(r => (r.code || r.id || '').toUpperCase() !== codeValue);
      }
    } else if (type === 'promoRules') {
      allPromoRules = allPromoRules.filter(r => r.id !== id);
      renderPromoRuleList();
    } else if (type === 'promoPayouts') {
      allPromoPayouts = allPromoPayouts.filter(p => p.id !== id);
      renderPromoPayoutList();
    }
    toast('Supprim?', '', 'success');
  } catch (e) {
    console.error(e);
    toast('Erreur', 'Suppression impossible', 'error');
  }
}

/* ------------------- Product Form ------------------- */
function addSpecRow(container, spec = { key: '', value: '' }) {
  const row = document.createElement('div');
  row.className = 'spec-row';
  row.innerHTML = `
		<input type="text" class="input spec-key" list="specs-suggestions" placeholder="Caract?ristique (ex: ?cran)" value="${escapeAttr(spec.key)}">
		<input type="text" class="input spec-value" placeholder="Valeur (ex: 6.1 Pouces OLED)" value="${escapeAttr(spec.value)}">
		<button type="button" class="btn btn-icon btn-danger" data-remove-spec><i data-lucide="trash-2" class="icon"></i></button>
	`;
  row.querySelector('[data-remove-spec]').addEventListener('click', () => row.remove());
  container.appendChild(row);
  lucide.createIcons();
}

function updateSpecSuggestions() {
  const datalist = $('#specs-suggestions');
  datalist.innerHTML = PREDEFINED_SPECS.map(spec => `<option value="${escapeAttr(spec)}"></option>`).join('');
}

async function renderProductFormPage(id) {
  let p = {};
  if (id) {
    p =
      allProducts.find(function (x) {
        return x.id === id;
      }) ||
      (await getDoc(doc(db, 'products', id)).then(function (s) {
        return s.exists() ? { id: s.id, ...s.data() } : null;
      }));
    if (!p) {
      $productsContent.innerHTML = '<div class="center" style="padding:32px">Produit introuvable.</div>';
      return;
    }
  }

  const categoryOptions = PREDEFINED_CATEGORIES.map(
    cat => `<option value="${escapeAttr(cat)}">${escapeHtml(cat.charAt(0).toUpperCase() + cat.slice(1))}</option>`
  ).join('');
  let existingImagesHtml = (p.imageUrls || [])
    .map(
      (url, index) => `
	<div class="image-preview-item" data-url="${escapeAttr(url)}">
		<img src="${escapeAttr(url)}" alt="Aper?u ${index + 1}">
		<button type="button" class="remove-btn" data-remove-image-url="${escapeAttr(url)}">
			<i data-lucide="x" class="icon" style="width:16px;height:16px"></i>
		</button>
	</div>
  `
    )
    .join('');

  const wrap = document.createElement('div');
  wrap.className = 'form-wrap';
  wrap.innerHTML = `
	<div class="form-head">
	  <div class="form-title">${id ? '?diter' : 'Nouveau'} produit</div>
	  <div class="kpi">${id ? 'ID: ' + escapeHtml(id) : 'Cr?ation'}</div>
	</div>
	<form class="form-main" novalidate>
	  <div class="twocol">
		<div class="field">
		  <label class="label" for="p-name">Nom</label>
		  <input id="p-name" class="input" type="text" value="${escapeAttr(p.name || '')}" required />
		  <div class="hint">Nom commercial lisible (ex. "iPhone 13 128 Go").</div>
		  <div id="err-name" class="error hide"></div>
		</div>
		<div class="field">
		  <label class="label" for="p-brand">Marque</label>
		  <input id="p-brand" class="input" type="text" value="${escapeAttr(p.brand || '')}" />
		</div>
	  </div>
	  <div class="twocol">
		<div class="field">
		  <label class="label" for="p-category">Cat?gorie</label>
		  <select id="p-category" class="select">
			<option value="">? s?lectionner</option>
			${categoryOptions}
		  </select>
		</div>
		<div class="field">
		  <label class="label" for="p-price">Prix (FCFA)</label>
		  <input id="p-price" class="input" type="number" min="0" step="1" value="${typeof p.price === 'number' ? p.price : ''}" />
		  <div id="err-price" class="error hide"></div>
		</div>
	  </div>
	  <div class="twocol">
		<div class="field">
			<label class="label" for="p-rom">Stockage</label>
			<input id="p-rom" class="input" type="number" min="0" step="1" value="${typeof p.rom === 'number' ? p.rom : ''}" />
		</div>
		<div class="field">
			<label class="label" for="p-ram">RAM</label>
			<input id="p-ram" class="input" type="number" min="0" step="1" value="${typeof p.ram === 'number' ? p.ram : ''}" />
		</div>
	  </div>
	  <div class="field">
		<label class="label" for="p-desc">Description</label>
		<textarea id="p-desc" class="textarea" rows="4">${escapeHtml(p.description || '')}</textarea>
	  </div>

	  <div class="field">
		<label class="label">Sp?cifications techniques</label>
		<div id="p-specs-container" class="specs-container">
		</div>
		<button type="button" id="add-spec-btn" class="btn btn-small" style="margin-top:10px;"><i data-lucide="plus" class="icon"></i> Ajouter une sp?cification</button>
	  </div>
	  
	  <div class="twocol">
		<div class="field">
		  <label class="label" for="p-stock">Stock</label>
		  <input id="p-stock" class="input" type="number" min="0" step="1" value="${typeof p.stock === 'number' ? p.stock : ''}" />
		</div>
		<div class="field">
		  <label class="label" for="p-vedette">Ordre top produits</label>
		  <input id="p-vedette" class="input" type="number" min="0" step="1" value="${typeof p.ordreVedette === 'number' ? p.ordreVedette : ''}" />
		  <div class="hint">1 apparaÃ®t en premiÃ¨re position sur le site. Laissez 0 pour retirer le produit du top.</div>
		</div>
	  </div>
	  <div class="field">
		<label class="label" for="p-images">Images</label>
		<input id="p-images-file" class="input" type="file" accept="image/png,image/jpeg,image/webp" multiple />
		<div class="hint">SÃ©lectionnez une ou plusieurs images. La premiÃ¨re sera l'image principale.</div>
		<div id="p-images-preview" class="image-preview-grid">
		  ${existingImagesHtml}
		</div>
	  </div>
	  <div class="form-actions">
		<button type="button" class="btn" data-cancel>Annuler</button>
		<button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Cr?er le produit'}</button>
	  </div>
	</form>`;
  $productsContent.innerHTML = '';
  $productsContent.appendChild(wrap);

  updateSpecSuggestions();
  const specsContainer = $('#p-specs-container');
  if (p.specifications && Array.isArray(p.specifications)) {
    p.specifications.forEach(spec => addSpecRow(specsContainer, spec));
  }
  $('#add-spec-btn').addEventListener('click', () => addSpecRow(specsContainer));

  if (p.category) $('#p-category').value = p.category;

  const fileInput = $('#p-images-file');
  const previewContainer = $('#p-images-preview');

  previewContainer.addEventListener('click', async e => {
    const btn = e.target.closest('[data-remove-image-url]');
    if (!btn || !id) return;
    e.preventDefault();
    const url = btn.dataset.removeImageUrl;
    const confirm = await openModal({
      title: 'Supprimer cette image ?',
      body: "Cette action va retirer l'image du produit, mais le fichier restera sur le serveur.",
      okText: 'Supprimer',
      cancelText: 'Annuler',
      danger: true,
    });
    if (!confirm) return;
    try {
      const updatePayload = { imageUrls: arrayRemove(url) };
      if (p.imageUrl === url) {
        const newMain = (p.imageUrls || []).find(u => u !== url) || '';
        updatePayload.imageUrl = newMain;
        p.imageUrl = newMain;
      }
      await updateDoc(doc(db, 'products', id), updatePayload);
      p.imageUrls = (p.imageUrls || []).filter(u => u !== url);
      existingImagesHtml = p.imageUrls
        .map(
          (url, index) => `
        <div class="image-preview-item" data-url="${escapeAttr(url)}">
                <img src="${escapeAttr(url)}" alt="Aper?u ${index + 1}">
                <button type="button" class="remove-btn" data-remove-image-url="${escapeAttr(url)}">
                        <i data-lucide="x" class="icon" style="width:16px;height:16px"></i>
                </button>
        </div>
  `
        )
        .join('');
      btn.closest('.image-preview-item').remove();
      toast('Image supprim?e du produit', 'Le fichier reste sur le serveur.', 'success');
    } catch (err) {
      console.error(err);
      toast('Erreur', "Impossible de supprimer l'image du produit", 'error');
    }
    lucide.createIcons();
  });

  fileInput.addEventListener('change', () => {
    previewContainer.innerHTML = existingImagesHtml;
    if (fileInput.files) {
      Array.from(fileInput.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
          const div = document.createElement('div');
          div.className = 'image-preview-item';
          div.innerHTML = `<img src="${e.target.result}" alt="${escapeAttr(file.name)}">`;
          previewContainer.appendChild(div);
        };
        reader.readAsDataURL(file);
      });
    }
    lucide.createIcons();
  });

  wrap.querySelector('[data-cancel]').addEventListener('click', function () {
    if (history.length > 1) {
      history.back();
    } else {
      location.hash = '#/products';
    }
  });
  wrap.querySelector('form').addEventListener('submit', function (e) {
    handleProductFormSubmit(e, id);
  });
  lucide.createIcons();
}

async function handleProductFormSubmit(e, id) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  const name = $('#p-name').value.trim();
  if (!name) {
    toast('Erreur', 'Le nom du produit est obligatoire.', 'error');
    setButtonLoading(submitBtn, false);
    return;
  }

  const specifications = [];
  $$('#p-specs-container .spec-row').forEach(row => {
    const key = row.querySelector('.spec-key').value.trim();
    const value = row.querySelector('.spec-value').value.trim();
    if (key && value) {
      specifications.push({ key, value });
      if (!PREDEFINED_SPECS.includes(key)) {
        PREDEFINED_SPECS.push(key);
      }
    }
  });

  const vedetteInput = parseInt($('#p-vedette').value, 10);
  const normalizedVedette = Number.isFinite(vedetteInput) && vedetteInput > 0 ? vedetteInput : 0;

  try {
    let productId = id;
    const productData = {
      name: name,
      brand: $('#p-brand').value.trim(),
      category: $('#p-category').value.trim() || '',
      price: parseFloat($('#p-price').value) || null,
      stock: parseInt($('#p-stock').value, 10) || null,
      ram: parseInt($('#p-ram').value, 10) || null,
      rom: parseInt($('#p-rom').value, 10) || null,
      ordreVedette: normalizedVedette,
      description: $('#p-desc').value.trim(),
      specifications: specifications,
      updatedAt: serverTimestamp(),
    };

    if (productId) {
      await updateDoc(doc(db, 'products', productId), productData);
    } else {
      const newDocRef = await addDoc(collection(db, 'products'), {
        ...productData,
        imageUrls: [],
        createdAt: serverTimestamp(),
      });
      productId = newDocRef.id;
    }

    const files = $('#p-images-file').files;
    if (files && files.length > 0) {
      toast('Envoi des images...', `${files.length} fichier(s) en cours de traitement.`, 'info');
      for (const file of files) {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${timestamp}_${randomSuffix}.${ext}`;
        const filePath = `product-images/${productId}/${fileName}`;
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, file);
      }
    }

    toast('Succ?s', `Produit ${id ? 'mis ? jour' : 'cr??'} avec succ?s.`, 'success');
    allProducts = [];
    await ensureProductsLoaded();
    location.hash = '#/products';
  } catch (err) {
    console.error(err);
    toast('Erreur', 'Une erreur est survenue lors de la sauvegarde.', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/* ============================ Contests UI ============================ */
const getSelectedContest = () => allContests.find(contest => contest.id === selectedContestId) || null;

const CONTEST_STATUS_LABELS = {
  draft: 'Brouillon',
  active: 'Actif',
  ended: 'Termin?',
};

const formatContestStatus = status =>
  CONTEST_STATUS_LABELS[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : '');

const toInputDateValue = value => {
  if (!value) {
    return '';
  }
  const dt = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(dt.getTime())) {
    return '';
  }
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().slice(0, 16);
};

const toDisplayDate = value => {
  if (!value) {
    return '?';
  }
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) {
    return '?';
  }
  return fmtDate(dt);
};

const updateContestFilterOptions = () => {
  const select = $('#contest-filter');
  if (!select) {
    return;
  }
  const currentValue = selectedContestId;
  const options = allContests
    .map(
      contest =>
        `<option value="${escapeAttr(contest.id)}"${contest.id === currentValue ? ' selected' : ''}>${escapeHtml(contest.title || contest.id)}</option>`
    )
    .join('');
  select.innerHTML = allContests.length
    ? `<option value="">S?lectionner un concours</option>${options}`
    : '<option value="">Aucun concours disponible</option>';
  if (currentValue && select.value !== currentValue) {
    select.value = currentValue;
  }
};

const updateKpiContests = () => {
  const el = $('#kpi-contests');
  if (el) {
    el.textContent = allContests.length ? String(allContests.length) : '?';
  }
};

const updateKpiCandidates = count => {
  const el = $('#kpi-candidates');
  if (el) {
    el.textContent = typeof count === 'number' && count >= 0 ? String(count) : '?';
  }
};

const normalizeSearch = value => (value ? value.trim().toLowerCase() : '');

async function ensureContestsLoaded(force = false) {
  if (!force && allContests.length) {
    updateContestFilterOptions();
    updateKpiContests();
    return;
  }
  if (!$contestsContent.classList.contains('hide')) {
    $contestsContent.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(6);
  }
  const contestsQuery = query(collection(db, 'contests'), orderBy('endDate', 'asc'));
  const snapshot = await getDocs(contestsQuery);
  allContests = snapshot.docs.map(docSnap => {
    const data = docSnap.data() || {};
    const rawEndDate =
      data.endDate && typeof data.endDate === 'object' && typeof data.endDate.toDate === 'function'
        ? data.endDate.toDate()
        : data.endDate
          ? new Date(data.endDate)
          : null;
    return {
      id: docSnap.id,
      title: typeof data.title === 'string' ? data.title : 'Concours',
      description: typeof data.description === 'string' ? data.description : '',
      status: typeof data.status === 'string' ? data.status : 'draft',
      endDate: rawEndDate,
      totalParticipants: Number.isFinite(data.totalParticipants)
        ? data.totalParticipants
        : Number.isFinite(data.totalCandidates)
          ? data.totalCandidates
          : 0,
      totalVotes: Number.isFinite(data.totalVotes)
        ? data.totalVotes
        : Number.isFinite(data.voteCount)
          ? data.voteCount
          : 0,
    };
  });
  updateContestFilterOptions();
  updateKpiContests();
  if (selectedContestId && !allContests.some(contest => contest.id === selectedContestId)) {
    selectedContestId = '';
    localStorage.removeItem(CONTEST_SELECTION_STORAGE_KEY);
  }
  if (!selectedContestId && allContests.length) {
    selectedContestId = allContests[0].id;
    localStorage.setItem(CONTEST_SELECTION_STORAGE_KEY, selectedContestId);
  }
}

async function ensureContestCandidatesLoaded(contestId, force = false) {
  if (!contestId) {
    updateKpiCandidates(0);
    return [];
  }
  if (!force && contestCandidates.has(contestId)) {
    if (contestId === selectedContestId) {
      updateKpiCandidates(contestCandidates.get(contestId).length);
    }
    return contestCandidates.get(contestId);
  }
  const candidatesCollection = collection(db, 'contests', contestId, 'candidates');
  const candidatesQuery = query(candidatesCollection, orderBy('voteCount', 'desc'));
  const snapshot = await getDocs(candidatesQuery);
  const candidates = snapshot.docs.map(docSnap => {
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      contestId,
      name: typeof data.name === 'string' ? data.name : 'Candidat',
      media: typeof data.media === 'string' ? data.media : '',
      photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
      voteCount: Number.isFinite(data.voteCount) ? data.voteCount : Number.isFinite(data.votes) ? data.votes : 0,
    };
  });
  contestCandidates.set(contestId, candidates);
  if (contestId === selectedContestId) {
    updateKpiCandidates(candidates.length);
  }
  return candidates;
}

async function setSelectedContest(contestId, options = {}) {
  const { force = false, skipRender = false } = options;
  const normalizedId = contestId || '';
  const changed = normalizedId !== selectedContestId;
  selectedContestId = normalizedId;
  if (selectedContestId) {
    localStorage.setItem(CONTEST_SELECTION_STORAGE_KEY, selectedContestId);
  } else {
    localStorage.removeItem(CONTEST_SELECTION_STORAGE_KEY);
  }
  if (changed) {
    candidateSearchTerm = '';
    const searchInput = $('#search-candidates');
    if (searchInput) {
      searchInput.value = '';
    }
  }
  updateContestFilterOptions();
  if (selectedContestId) {
    await ensureContestCandidatesLoaded(selectedContestId, force || changed);
  } else {
    updateKpiCandidates(0);
  }
  if (!skipRender) {
    renderContestsOverview();
  }
}

function renderContestsOverview() {
  if (!$contestsContent) {
    return;
  }
  if (!allContests.length) {
    updateKpiCandidates(0);
    $contestsContent.innerHTML = `
      <div class="empty-state">
        <p>Aucun concours disponible.</p>
        <button class="btn btn-primary" type="button" data-create-first-contest><i data-lucide="plus" class="icon"></i> Cr?er un concours</button>
      </div>`;
    $contestsContent.querySelector('[data-create-first-contest]')?.addEventListener('click', () => {
      location.hash = '#/new-contest';
    });
    lucide.createIcons();
    return;
  }

  const select = $('#contest-filter');
  if (select && select.value !== (selectedContestId || '')) {
    select.value = selectedContestId || '';
  }
  const searchInput = $('#search-candidates');
  if (searchInput && searchInput.value !== candidateSearchTerm) {
    searchInput.value = candidateSearchTerm;
  }

  const contest = getSelectedContest();
  if (!contest) {
    updateKpiCandidates(0);
    $contestsContent.innerHTML = `<div class="empty-state"><p>S?lectionnez un concours pour voir ses candidats.</p></div>`;
    lucide.createIcons();
    return;
  }

  const candidates = contestCandidates.get(contest.id) || [];
  const searchTerm = normalizeSearch(candidateSearchTerm);
  const visibleCandidates = searchTerm
    ? candidates.filter(candidate => `${candidate.name} ${candidate.media}`.toLowerCase().includes(searchTerm))
    : candidates;
  updateKpiCandidates(candidates.length);

  const rows = visibleCandidates
    .map(
      (candidate, index) => `
        <tr>
          <td class="muted">${index + 1}</td>
          <td>
            <div class="candidate-cell" style="display:flex;align-items:center;gap:12px;">
              ${candidate.photoUrl ? `<img src="${escapeAttr(candidate.photoUrl)}" alt="${escapeAttr(candidate.name)}" style="width:40px;height:40px;border-radius:20px;object-fit:cover;" />` : ''}
              <div>
                <div class="candidate-name">${escapeHtml(candidate.name)}</div>
                ${candidate.media ? `<div class="muted">${escapeHtml(candidate.media)}</div>` : ''}
              </div>
            </div>
          </td>
          <td class="muted">${escapeHtml(candidate.id)}</td>
          <td class="strong">${Number(candidate.voteCount || 0).toLocaleString('fr-FR')}</td>
          <td class="actions">
            <button class="btn btn-small" type="button" data-edit-candidate="${escapeAttr(candidate.id)}"><i data-lucide="edit-3" class="icon"></i> ?diter</button>
            <button class="btn btn-danger btn-small" type="button" data-delete-candidate="${escapeAttr(candidate.id)}"><i data-lucide="trash-2" class="icon"></i></button>
          </td>
        </tr>`
    )
    .join('');

  const tableHtml = visibleCandidates.length
    ? `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Candidat</th>
                <th>ID</th>
                <th>Votes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>`
    : `<div class="empty-state"><p>${searchTerm ? 'Aucun candidat ne correspond ? cette recherche.' : 'Aucun candidat n?est encore enregistr? pour ce concours.'}</p></div>`;

  $contestsContent.innerHTML = `
    <div class="contest-layout">
      <div class="card contest-summary">
        <div class="card-head">
          <div>
            <h2>${escapeHtml(contest.title || 'Concours')}</h2>
            <div class="muted">Identifiant : ${escapeHtml(contest.id)}</div>
          </div>
          <div class="actions">
            <span class="badge status-${escapeAttr(contest.status)}">${formatContestStatus(contest.status)}</span>
            <button class="btn btn-icon btn-small" type="button" data-delete-current-contest title="Supprimer"><i data-lucide="trash-2" class="icon"></i></button>
            <button class="btn btn-outline btn-small" type="button" data-edit-current-contest><i data-lucide="edit-3" class="icon"></i> ?diter</button>
          </div>
        </div>
        <div class="card-body">
          <dl class="meta-grid">
            <div>
              <dt>Date de fin</dt>
              <dd>${toDisplayDate(contest.endDate)}</dd>
            </div>
            <div>
              <dt>Total votes</dt>
              <dd>${Number(contest.totalVotes || 0).toLocaleString('fr-FR')}</dd>
            </div>
            <div>
              <dt>Participants</dt>
              <dd>${Number(contest.totalParticipants || candidates.length).toLocaleString('fr-FR')}</dd>
            </div>
          </dl>
          <p class="muted">${contest.description ? escapeHtml(contest.description) : 'Aucune description fournie.'}</p>
        </div>
      </div>
      <div class="card candidate-list">
        <div class="card-head">
          <div>
            <h3>Candidats</h3>
            <div class="muted">${visibleCandidates.length} sur ${candidates.length} candidat(s)</div>
          </div>
          <button class="btn btn-primary btn-small" type="button" data-add-candidate><i data-lucide="plus" class="icon"></i> Ajouter</button>
        </div>
        <div class="card-body">
          ${tableHtml}
        </div>
      </div>
    </div>`;

  const editButton = $contestsContent.querySelector('[data-edit-current-contest]');
  editButton?.addEventListener('click', () => {
    location.hash = `#/edit-contest/${contest.id}`;
  });

  const deleteButton = $contestsContent.querySelector('[data-delete-current-contest]');
  deleteButton?.addEventListener('click', () => {
    handleContestDeletion(contest.id, contest.title || 'ce concours');
  });

  const addCandidateButton = $contestsContent.querySelector('[data-add-candidate]');
  addCandidateButton?.addEventListener('click', () => {
    location.hash = `#/new-candidate/${contest.id}`;
  });

  $contestsContent.querySelectorAll('[data-edit-candidate]').forEach(button => {
    button.addEventListener('click', () => {
      const candidateId = button.getAttribute('data-edit-candidate');
      if (candidateId) {
        location.hash = `#/edit-candidate/${contest.id}/${candidateId}`;
      }
    });
  });

  $contestsContent.querySelectorAll('[data-delete-candidate]').forEach(button => {
    button.addEventListener('click', () => {
      const candidateId = button.getAttribute('data-delete-candidate');
      const candidate = candidates.find(item => item.id === candidateId);
      if (candidateId) {
        handleCandidateDeletion(contest.id, candidateId, candidate?.name || 'ce candidat');
      }
    });
  });

  lucide.createIcons();
}

async function handleCandidateDeletion(contestId, candidateId, label) {
  const confirmed = await openModal({
    title: 'Supprimer',
    body: `Confirmer la suppression de <strong>${escapeHtml(label)}</strong> ?`,
    okText: 'Supprimer',
    danger: true,
  });
  if (!confirmed) {
    return;
  }
  try {
    await deleteDoc(doc(db, 'contests', contestId, 'candidates', candidateId));
    const list = contestCandidates.get(contestId) || [];
    contestCandidates.set(
      contestId,
      list.filter(candidate => candidate.id !== candidateId)
    );
    toast('Candidat supprim?', label, 'success');
    if (contestId === selectedContestId) {
      updateKpiCandidates((contestCandidates.get(contestId) || []).length);
      renderContestsOverview();
    }
  } catch (error) {
    console.error(error);
    toast('Erreur', 'Suppression impossible pour le moment.', 'error');
  }
}

async function handleContestDeletion(contestId, label) {
  const confirmed = await openModal({
    title: 'Supprimer',
    body: `Confirmer la suppression du concours <strong>${escapeHtml(label || 'ce concours')}</strong> ?`,
    okText: 'Supprimer',
    cancelText: 'Annuler',
    danger: true,
  });
  if (!confirmed) {
    return;
  }
  try {
    await ensureContestCandidatesLoaded(contestId, true);
    const candidates = [...(contestCandidates.get(contestId) || [])];
    for (const candidate of candidates) {
      await deleteDoc(doc(db, 'contests', contestId, 'candidates', candidate.id));
    }
    await deleteDoc(doc(db, 'contests', contestId));
    contestCandidates.delete(contestId);
    allContests = allContests.filter(item => item.id !== contestId);
    updateContestFilterOptions();
    updateKpiContests();
    const wasSelected = selectedContestId === contestId;
    if (wasSelected) {
      const nextId = allContests[0]?.id || '';
      await setSelectedContest(nextId, { force: true });
    } else {
      renderContestsOverview();
    }
    await refreshContestPromoCard();
    renderPromoCardList();
    updatePromoCardsKpi();
    toast('Concours supprime', label || 'ce concours', 'success');
  } catch (error) {
    console.error('Contest deletion failed', error);
    toast('Erreur', 'Suppression impossible pour le moment.', 'error');
  }
}

async function renderContestFormPage(id) {
  const isEdition = Boolean(id);
  let contest = null;
  if (isEdition) {
    contest = getSelectedContest() || allContests.find(item => item.id === id) || null;
    if (!contest) {
      const snap = await getDoc(doc(db, 'contests', id));
      if (snap.exists()) {
        const data = snap.data() || {};
        contest = {
          id: snap.id,
          title: typeof data.title === 'string' ? data.title : 'Concours',
          description: typeof data.description === 'string' ? data.description : '',
          status: typeof data.status === 'string' ? data.status : 'draft',
          endDate:
            data.endDate && typeof data.endDate === 'object' && typeof data.endDate.toDate === 'function'
              ? data.endDate.toDate()
              : data.endDate
                ? new Date(data.endDate)
                : null,
          totalParticipants: Number.isFinite(data.totalParticipants) ? data.totalParticipants : 0,
          totalVotes: Number.isFinite(data.totalVotes) ? data.totalVotes : 0,
        };
      }
    }
    if (!contest) {
      $contestsContent.innerHTML = '<div class="empty-state"><p>Concours introuvable.</p></div>';
      return;
    }
  }

  const defaults = contest || {
    title: '',
    description: '',
    status: 'draft',
    endDate: null,
    totalParticipants: 0,
    totalVotes: 0,
  };

  const wrap = document.createElement('div');
  wrap.className = 'form-wrap';
  wrap.innerHTML = `
    <div class="form-head">
      <div class="form-title">${isEdition ? '?diter' : 'Nouveau'} concours</div>
      ${isEdition ? `<div class="kpi">ID : ${escapeHtml(contest.id)}</div>` : ''}
    </div>
    <form class="form-main" novalidate>
      <div class="field">
        <label class="label" for="contest-title">Titre du concours</label>
        <input id="contest-title" class="input" type="text" value="${escapeAttr(defaults.title)}" required />
      </div>
      <div class="field">
        <label class="label" for="contest-description">Description</label>
        <textarea id="contest-description" class="textarea" rows="4" placeholder="D?tails du concours">${escapeHtml(defaults.description)}</textarea>
      </div>
      <div class="twocol">
        <div class="field">
          <label class="label" for="contest-status">Statut</label>
          <select id="contest-status" class="select">
            <option value="draft" ${defaults.status === 'draft' ? 'selected' : ''}>Brouillon</option>
            <option value="active" ${defaults.status === 'active' ? 'selected' : ''}>Actif</option>
            <option value="ended" ${defaults.status === 'ended' ? 'selected' : ''}>Termin?</option>
          </select>
        </div>
        <div class="field">
          <label class="label" for="contest-end">Date de fin</label>
          <input id="contest-end" class="input" type="datetime-local" value="${escapeAttr(toInputDateValue(defaults.endDate))}" />
        </div>
      </div>
      <div class="twocol">
        <div class="field">
          <label class="label" for="contest-participants">Participants (optionnel)</label>
          <input id="contest-participants" class="input" type="number" min="0" step="1" value="${defaults.totalParticipants || ''}" />
        </div>
        <div class="field">
          <label class="label" for="contest-votes">Votes (optionnel)</label>
          <input id="contest-votes" class="input" type="number" min="0" step="1" value="${defaults.totalVotes || ''}" />
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn" data-cancel>Annuler</button>
        <button type="submit" class="btn btn-primary">${isEdition ? 'Enregistrer' : 'Cr?er le concours'}</button>
      </div>
    </form>`;

  $contestsContent.innerHTML = '';
  $contestsContent.appendChild(wrap);
  wrap.querySelector('[data-cancel]')?.addEventListener('click', () => {
    location.hash = '#/contests';
  });
  wrap.querySelector('form').onsubmit = e => handleContestFormSubmit(e, isEdition ? contest.id : null);
  lucide.createIcons();
}

async function handleContestFormSubmit(e, contestId) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);
  try {
    const title = form.querySelector('#contest-title').value.trim();
    if (!title) {
      toast('Erreur', 'Le titre est requis.', 'error');
      setButtonLoading(submitBtn, false);
      return;
    }
    const description = form.querySelector('#contest-description').value.trim();
    const status = form.querySelector('#contest-status').value || 'draft';
    const endValue = form.querySelector('#contest-end').value;
    const participants = Number(form.querySelector('#contest-participants').value);
    const votes = Number(form.querySelector('#contest-votes').value);

    const payload = {
      title,
      description,
      status,
      updatedAt: serverTimestamp(),
    };
    if (endValue) {
      const endDate = new Date(endValue);
      if (!Number.isNaN(endDate.getTime())) {
        payload.endDate = endDate;
      }
    } else {
      payload.endDate = null;
    }
    if (Number.isFinite(participants) && participants >= 0) {
      payload.totalParticipants = participants;
    }
    if (Number.isFinite(votes) && votes >= 0) {
      payload.totalVotes = votes;
    }

    if (contestId) {
      await updateDoc(doc(db, 'contests', contestId), payload);
      const index = allContests.findIndex(contest => contest.id === contestId);
      if (index > -1) {
        const merged = { ...allContests[index], ...payload };
        if (payload.endDate instanceof Date) {
          merged.endDate = payload.endDate;
        } else if (payload.endDate === null) {
          merged.endDate = null;
        }
        allContests[index] = merged;
      }
      toast('Concours mis ? jour', title, 'success');
      await ensureContestsLoaded(true);
      await setSelectedContest(contestId, { force: true });
    } else {
      const createdPayload = {
        ...payload,
        createdAt: serverTimestamp(),
        totalVotes: payload.totalVotes || 0,
        totalParticipants: payload.totalParticipants || 0,
      };
      const ref = await addDoc(collection(db, 'contests'), createdPayload);
      await updateDoc(ref, { id: ref.id });
      toast('Concours cr??', title, 'success');
      await ensureContestsLoaded(true);
      await setSelectedContest(ref.id, { force: true });
    }
    location.hash = '#/contests';
  } catch (error) {
    console.error(error);
    toast('Erreur', 'Enregistrement impossible pour le moment.', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function renderCandidateFormPage(contestId, candidateId) {
  if (!contestId) {
    $contestsContent.innerHTML =
      "<div class=\"empty-state\"><p>Sélectionnez un concours avant d'ajouter un candidat.</p></div>";
    return;
  }
  const contest = allContests.find(item => item.id === contestId) || null;
  if (!contest) {
    await ensureContestsLoaded(true);
  }
  const candidates = contestCandidates.get(contestId) || [];
  let candidate = null;
  if (candidateId) {
    candidate = candidates.find(item => item.id === candidateId) || null;
    if (!candidate) {
      const snap = await getDoc(doc(db, 'contests', contestId, 'candidates', candidateId));
      if (snap.exists()) {
        const data = snap.data() || {};
        candidate = {
          id: snap.id,
          name: data.name || 'Candidat',
          media: data.media || '',
          photoUrl: data.photoUrl || '',
          voteCount: Number.isFinite(data.voteCount) ? data.voteCount : 0,
        };
      }
    }
    if (!candidate) {
      $contestsContent.innerHTML = '<div class="empty-state"><p>Candidat introuvable.</p></div>';
      return;
    }
  }

  const defaults = candidate || { name: '', media: '', photoUrl: '', voteCount: 0 };
  const wrap = document.createElement('div');
  wrap.className = 'form-wrap';
  wrap.innerHTML = `
    <div class="form-head">
      <div class="form-title">${candidateId ? '?diter' : 'Nouveau'} candidat</div>
      <div class="muted">Concours : ${escapeHtml((getSelectedContest() || {}).title || contestId)}</div>
    </div>
    <form class="form-main" novalidate>
      <div class="field">
        <label class="label" for="candidate-name">Nom</label>
        <input id="candidate-name" class="input" type="text" value="${escapeAttr(defaults.name)}" required />
      </div>
      <div class="field">
        <label class="label" for="candidate-media">M?dia / Organisation</label>
        <input id="candidate-media" class="input" type="text" value="${escapeAttr(defaults.media)}" placeholder="Cha?ne, journal..." />
      </div>
      <div class="field">
        <label class="label" for="candidate-photo">Photo (URL)</label>
        <input id="candidate-photo" class="input" type="url" value="${escapeAttr(defaults.photoUrl)}" placeholder="https://" />
        <div class="hint">Utilisez une URL publique ou importez l'image depuis un stockage d?j? autoris?.</div>
      </div>
      <div class="field">
        <label class="label" for="candidate-votes">Votes initiaux</label>
        <input id="candidate-votes" class="input" type="number" min="0" step="1" value="${Number(defaults.voteCount || 0)}" />
      </div>
      <div class="form-actions">
        <button type="button" class="btn" data-cancel>Annuler</button>
        <button type="submit" class="btn btn-primary">${candidateId ? 'Enregistrer' : 'Ajouter le candidat'}</button>
      </div>
    </form>`;

  $contestsContent.innerHTML = '';
  $contestsContent.appendChild(wrap);
  wrap.querySelector('[data-cancel]')?.addEventListener('click', () => {
    location.hash = '#/contests';
  });
  wrap.querySelector('form').onsubmit = e => handleCandidateFormSubmit(e, contestId, candidateId || null);
  lucide.createIcons();
}

async function handleCandidateFormSubmit(e, contestId, candidateId) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);
  try {
    const name = form.querySelector('#candidate-name').value.trim();
    if (!name) {
      toast('Erreur', 'Le nom du candidat est requis.', 'error');
      setButtonLoading(submitBtn, false);
      return;
    }
    const media = form.querySelector('#candidate-media').value.trim();
    const photoUrl = form.querySelector('#candidate-photo').value.trim();
    const votes = Number(form.querySelector('#candidate-votes').value);
    const base = {
      name,
      media,
      photoUrl,
      voteCount: Number.isFinite(votes) && votes >= 0 ? votes : 0,
      updatedAt: serverTimestamp(),
    };

    if (candidateId) {
      await updateDoc(doc(db, 'contests', contestId, 'candidates', candidateId), base);
      const list = contestCandidates.get(contestId) || [];
      const index = list.findIndex(candidate => candidate.id === candidateId);
      if (index > -1) {
        list[index] = { ...list[index], ...base };
      }
      contestCandidates.set(contestId, list);
      toast('Candidat mis ? jour', name, 'success');
    } else {
      const ref = await addDoc(collection(db, 'contests', contestId, 'candidates'), {
        ...base,
        contestId,
        createdAt: serverTimestamp(),
      });
      await updateDoc(ref, { id: ref.id });
      const list = contestCandidates.get(contestId) || [];
      contestCandidates.set(contestId, [{ id: ref.id, contestId, ...base }, ...list]);
      toast('Candidat ajout?', name, 'success');
    }

    await setSelectedContest(contestId, { force: true });
    location.hash = '#/contests';
  } catch (error) {
    console.error(error);
    toast('Erreur', 'Impossible d?enregistrer le candidat.', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/* ============================ Brands UI ============================ */
$('#add-brand').addEventListener('click', () => (location.hash = '#/new-brand'));
$('#search-brands').addEventListener('input', () => renderBrandList());

function renderBrandList() {
  const term = ($('#search-brands').value || '').toLowerCase();
  const arr = term ? allBrands.filter(b => (b.name || '').toLowerCase().includes(term)) : allBrands;

  if (!arr.length) {
    $brandsContent.innerHTML = `<div class="center" style="padding:32px">Aucune marque.</div>`;
    return;
  }

  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `
        <thead>
            <tr>
                <th style="width:60px">Logo</th>
                <th>Nom</th>
                <th>Ordre</th>
                <th style="width:180px;text-align:right">Actions</th>
            </tr>
        </thead>
        <tbody id="tbody-brands"></tbody>
    `;
  const tb = table.querySelector('#tbody-brands');
  arr.forEach(brand => {
    const tr = document.createElement('tr');
    tr.dataset.id = brand.id;
    tr.innerHTML = `
            <td>${brand.logoUrl ? `<img class="img" src="${escapeAttr(brand.logoUrl)}" alt="Logo ${escapeAttr(brand.name)}"/>` : ''}</td>
            <td style="font-weight:800">${escapeHtml(brand.name || 'Sans nom')}</td>
            <td><span class="badge">${brand.sortOrder || 'N/A'}</span></td>
            <td class="actions">
                <button class="btn btn-small" data-edit>?diter</button>
                <button class="btn btn-danger btn-small" data-del>Supprimer</button>
            </td>
        `;
    tr.querySelector('[data-edit]').onclick = () => (location.hash = `#/edit-brand/${brand.id}`);
    tr.querySelector('[data-del]').onclick = () => handleDelete(brand.id, brand.name, 'brands');
    tb.appendChild(tr);
  });
  $brandsContent.innerHTML = '';
  $brandsContent.appendChild(table);
  lucide.createIcons();
}

async function renderBrandFormPage(id) {
  let brand = {};
  if (id) {
    brand =
      allBrands.find(b => b.id === id) ||
      (await getDoc(doc(db, 'brands', id)).then(s => (s.exists() ? { id: s.id, ...s.data() } : null)));
    if (!brand) {
      $brandsContent.innerHTML = '<div class="center" style="padding:32px">Marque introuvable.</div>';
      return;
    }
  }

  const wrap = document.createElement('div');
  wrap.className = 'form-wrap';
  wrap.innerHTML = `
        <div class="form-head"><div class="form-title">${id ? '?diter' : 'Nouvelle'} marque</div></div>
        <form class="form-main" novalidate>
            <div class="twocol">
                <div class="field">
                    <label class="label" for="b-name">Nom de la marque</label>
                    <input id="b-name" class="input" type="text" value="${escapeAttr(brand.name || '')}" required />
                </div>
                <div class="field">
                    <label class="label" for="b-sortOrder">Ordre d'affichage</label>
                    <input id="b-sortOrder" class="input" type="number" min="1" step="1" value="${brand.sortOrder || ''}" required />
                </div>
            </div>
            <div class="field">
                <label class="label" for="b-logoUrl">URL du logo</label>
                <input id="b-logoUrl" class="input" type="url" value="${escapeAttr(brand.logoUrl || '')}" />
            </div>
            <div class="form-actions">
                <button type="button" class="btn" data-cancel>Annuler</button>
                <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Cr?er la marque'}</button>
            </div>
        </form>
    `;
  $brandsContent.innerHTML = '';
  $brandsContent.appendChild(wrap);
  wrap.querySelector('[data-cancel]').onclick = () => (location.hash = '#/brands');
  wrap.querySelector('form').onsubmit = e => handleBrandFormSubmit(e, id);
}

async function handleBrandFormSubmit(e, id) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  const name = $('#b-name').value.trim();
  const sortOrder = parseInt($('#b-sortOrder').value, 10);
  const logoUrl = $('#b-logoUrl').value.trim();

  if (!name || isNaN(sortOrder)) {
    toast('Erreur', "Le nom et l'ordre sont requis.", 'error');
    setButtonLoading(submitBtn, false);
    return;
  }

  const data = { name, sortOrder, logoUrl };

  try {
    if (id) {
      await updateDoc(doc(db, 'brands', id), data);
      const i = allBrands.findIndex(b => b.id === id);
      if (i > -1) allBrands[i] = { id, ...data };
      toast('Marque mise ? jour', name, 'success');
    } else {
      const refDoc = await addDoc(collection(db, 'brands'), data);
      allBrands.push({ id: refDoc.id, ...data });
      $('#kpi-brands').textContent = String(allBrands.length);
      toast('Marque cr??e', name, 'success');
    }
    allBrands.sort((a, b) => a.sortOrder - b.sortOrder);
    location.hash = '#/brands';
  } catch (err) {
    console.error(err);
    toast('Erreur', 'Enregistrement impossible', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/* ============================ Matches UI ============================ */
$('#add-match').addEventListener('click', function () {
  location.hash = '#/new-match';
});
$('#search-matches').addEventListener('input', function () {
  renderMatchList();
});

function renderMatchList() {
  const term = ($('#search-matches').value || '').toLowerCase();
  const arr = term
    ? allMatches.filter(function (m) {
      return (
        (m.teamA || '').toLowerCase().indexOf(term) !== -1 ||
        (m.teamB || '').toLowerCase().indexOf(term) !== -1 ||
        (m.competition || '').toLowerCase().indexOf(term) !== -1
      );
    })
    : allMatches.slice();

  if (!arr.length) {
    $matchesContent.innerHTML = '<div class="center" style="padding:32px">Aucun match.</div>';
    return;
  }
  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `
	<thead>
	  <tr>
		<th>Affiche</th>
		<th>Comp?tition</th>
		<th>Date</th>
		<th style="width:180px;text-align:right">Actions</th>
	  </tr>
	</thead>
	<tbody id="tbody-matches"></tbody>`;
  const tb = table.querySelector('#tbody-matches');

  arr.forEach(function (m) {
    const date = m.startTime && m.startTime.toDate ? m.startTime.toDate() : m.startTime ? new Date(m.startTime) : null;
    const finalScore =
      typeof m.finalScoreA === 'number' && typeof m.finalScoreB === 'number'
        ? m.finalScoreA + ' - ' + m.finalScoreB
        : '';
    const tr = document.createElement('tr');
    tr.dataset.id = m.id;
    tr.innerHTML = `
	  <td style="font-weight:800">${escapeHtml(m.teamA || '?quipe A')} vs ${escapeHtml(m.teamB || '?quipe B')}</td>
	  <td>${escapeHtml(m.competition || '?')}</td>
	  <td>${date ? fmtDate(date) : '?'}</td>
	  <td class="actions">
		<span class="badge ${finalScore ? 'success' : ''}">${finalScore || '? jouer'}</span>
		<button class="btn btn-small" data-view>Pronostics</button>
		<button class="btn btn-small" data-edit>?diter</button>
		<button class="btn btn-danger btn-small" data-del>Supprimer</button>
	  </td>`;
    tr.querySelector('[data-view]').addEventListener('click', function () {
      location.hash = '#/match-predictions/' + m.id;
    });
    tr.querySelector('[data-edit]').addEventListener('click', function () {
      location.hash = '#/edit-match/' + m.id;
    });
    tr.querySelector('[data-del]').addEventListener('click', function () {
      handleDelete(m.id, (m.teamA || '') + ' vs ' + (m.teamB || ''), 'matches');
    });
    tb.appendChild(tr);
  });
  $matchesContent.innerHTML = '';
  $matchesContent.appendChild(table);
}

async function loadMatchPredictions(matchId, options = {}) {
  const force = options.force === true;
  if (!force && matchPredictionsCache.has(matchId)) {
    return matchPredictionsCache.get(matchId);
  }
  if (force) {
    matchPredictionsCache.delete(matchId);
  }
  const q = query(collection(db, 'predictions'), where('matchId', '==', matchId));
  const snap = await getDocs(q);
  const items = snap.docs.map(docSnap => {
    const data = docSnap.data() || {};
    const createdAt =
      data.createdAt && typeof data.createdAt.toDate === 'function'
        ? data.createdAt.toDate()
        : data.createdAt
          ? new Date(data.createdAt)
          : null;
    const updatedAt =
      data.updatedAt && typeof data.updatedAt.toDate === 'function'
        ? data.updatedAt.toDate()
        : data.updatedAt
          ? new Date(data.updatedAt)
          : null;
    const contactFirstName = typeof data.contactFirstName === 'string' ? data.contactFirstName : '';
    const contactLastName = typeof data.contactLastName === 'string' ? data.contactLastName : '';
    const contactName = `${contactFirstName} ${contactLastName}`.trim();
    const contactPhone =
      typeof data.contactPhoneNormalized === 'string' && data.contactPhoneNormalized
        ? data.contactPhoneNormalized
        : typeof data.contactPhone === 'string'
          ? data.contactPhone
          : '';
    const searchPieces = [
      data.userName,
      contactFirstName,
      contactLastName,
      contactPhone,
      data.userId,
      data.transactionId,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return {
      id: docSnap.id,
      userName: typeof data.userName === 'string' && data.userName ? data.userName : 'Participant',
      userId: typeof data.userId === 'string' ? data.userId : '',
      scoreA: typeof data.scoreA === 'number' ? data.scoreA : null,
      scoreB: typeof data.scoreB === 'number' ? data.scoreB : null,
      isWinner: data.isWinner === true,
      featuredWinner: data.featuredWinner === true,
      contactName,
      contactPhone,
      createdAt,
      updatedAt,
      searchIndex: searchPieces,
    };
  });
  items.sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
    return bTime - aTime;
  });
  matchPredictionsCache.set(matchId, items);
  return items;
}

async function renderMatchPredictionsPage(matchId) {
  let match =
    allMatches.find(function (m) {
      return m.id === matchId;
    }) ||
    (await getDoc(doc(db, 'matches', matchId)).then(function (snap) {
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    }));
  if (!match) {
    $matchesContent.innerHTML = '<div class="center" style="padding:32px">Match introuvable.</div>';
    return;
  }

  const matchDate =
    match.startTime && typeof match.startTime.toDate === 'function'
      ? match.startTime.toDate()
      : match.startTime
        ? new Date(match.startTime)
        : null;
  const finalScore =
    typeof match.finalScoreA === 'number' && typeof match.finalScoreB === 'number'
      ? `${match.finalScoreA} - ${match.finalScoreB}`
      : '';

  setCrumb(
    'Pronostics \u00b7 ' +
    (match.teamA || '?quipe A') +
    ' vs ' +
    (match.teamB || '?quipe B')
  );

  const container = document.createElement('div');
  container.className = 'match-detail';
  container.innerHTML = `
    <div class="card match-summary">
      <div class="summary-info">
        <div class="match-title">${escapeHtml(match.teamA || '?quipe A')} <span class="muted">vs</span> ${escapeHtml(match.teamB || '?quipe B')}</div>
        <div class="match-meta">
          ${match.competition ? `<span class="chip">${escapeHtml(match.competition)}</span>` : ''}
          <span class="muted">${matchDate ? fmtDate(matchDate) : 'Date &agrave; confirmer'}</span>
        </div>
        ${finalScore ? `<div class="match-score">Score final : <strong>${finalScore}</strong></div>` : ''}
      </div>
      <div class="match-actions">
        <button class="btn btn-small" type="button" id="match-back"><i data-lucide="arrow-left" class="icon"></i> Retour</button>
        <button class="btn btn-small" type="button" id="match-refresh"><i data-lucide="refresh-cw" class="icon"></i> Rafra&icirc;chir</button>
      </div>
    </div>
    <div class="card predictions-toolbar">
      <div class="field predictions-search">
        <label class="label" for="pred-search">Recherche</label>
        <input id="pred-search" class="input" type="search" placeholder="Nom, t&eacute;l&eacute;phone ou identifiant" />
      </div>
      <label class="toggle predictions-toggle">
        <span class="toggle-switch">
          <input type="checkbox" id="pred-winners-only" />
          <span class="toggle-slider"></span>
        </span>
        <span>Gagnants uniquement</span>
      </label>
      <div class="kpi-counters">
        <div class="kpi-card">
          <div class="kpi-label">Pronostics</div>
          <div class="kpi-value" id="pred-total">0</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Gagnants</div>
          <div class="kpi-value" id="pred-winners">0</div>
        </div>
      </div>
    </div>
    <div id="predictions-table-wrap" class="predictions-card">
      <div class="predictions-empty muted">Chargement des pronostics...</div>
    </div>
  `;

  $matchesContent.innerHTML = '';
  $matchesContent.appendChild(container);
  lucide.createIcons();

  const backBtn = container.querySelector('#match-back');
  const refreshBtn = container.querySelector('#match-refresh');
  const searchInput = container.querySelector('#pred-search');
  const winnersToggle = container.querySelector('#pred-winners-only');
  const tableWrap = container.querySelector('#predictions-table-wrap');
  const totalEl = container.querySelector('#pred-total');
  const winnersEl = container.querySelector('#pred-winners');

  const state = {
    items: [],
    search: '',
    winnersOnly: false,
  };

  function applyFilters() {
    const term = normalizeSearch(state.search);
    const winnersOnly = state.winnersOnly;
    const total = state.items.length;
    const winnersCount = state.items.filter(function (item) {
      return item.isWinner;
    }).length;
    totalEl.textContent = String(total);
    winnersEl.textContent = String(winnersCount);
    let list = state.items;
    if (term) {
      list = list.filter(function (item) {
        return item.searchIndex.includes(term);
      });
    }
    if (winnersOnly) {
      list = list.filter(function (item) {
        return item.isWinner;
      });
    }
    renderPredictionRows(list);
  }

  function renderPredictionRows(list) {
    if (!list.length) {
      tableWrap.innerHTML =
        '<div class="predictions-empty">Aucun pronostic correspondant.</div>';
      return;
    }
    const rows = list
      .map(function (item) {
        const statusPieces = [];
        if (item.isWinner) {
          statusPieces.push('<span class="badge">Gagnant</span>');
        } else {
          statusPieces.push('<span class="chip chip-muted">En attente</span>');
        }
        if (item.featuredWinner) {
          statusPieces.push('<span class="chip chip-info">Mis en avant</span>');
        }
        const scoreLabel =
          item.scoreA === null || item.scoreB === null ? '?' : `${item.scoreA} - ${item.scoreB}`;
        const contactBits = [];
        if (item.contactName) {
          contactBits.push(escapeHtml(item.contactName));
        }
        if (item.contactPhone) {
          contactBits.push('<span class="muted">' + escapeHtml(item.contactPhone) + '</span>');
        }
        const userIdLabel = item.userId ? '<div class="muted">ID: ' + escapeHtml(item.userId) + '</div>' : '';
        const createdLabel = item.createdAt instanceof Date ? fmtDate(item.createdAt) : '?';
        return `
          <tr class="${item.isWinner ? 'winner-row' : ''}">
            <td>
              <div class="pred-name">${escapeHtml(item.userName || 'Participant')}</div>
              ${userIdLabel}
            </td>
            <td class="pred-score">${scoreLabel}</td>
            <td>${contactBits.length ? contactBits.join('<br/>') : '<span class="muted">?</span>'}</td>
            <td class="pred-status">${statusPieces.join(' ')}</td>
            <td>${createdLabel}</td>
          </tr>`;
      })
      .join('');
    tableWrap.innerHTML = `
      <table class="table predictions-table">
        <thead>
          <tr>
            <th>Participant</th>
            <th>Pronostic</th>
            <th>Contact</th>
            <th>Statut</th>
            <th>Enregistr&eacute; le</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    lucide.createIcons();
  }

  async function fetchPredictions(force = false) {
    if (force) {
      tableWrap.innerHTML = '<div class="predictions-empty muted">Rafra&icirc;chissement...</div>';
    }
    try {
      const data = await loadMatchPredictions(matchId, { force });
      state.items = data;
      applyFilters();
      if (force) {
        toast('Pronostics mis ? jour', '', 'success');
      }
    } catch (error) {
      console.error('Match predictions load failed', error);
      tableWrap.innerHTML =
        '<div class="predictions-empty">Impossible de charger les pronostics pour le moment.</div>';
      toast('Erreur', 'Lecture des pronostics impossible.', 'error');
    }
  }

  backBtn?.addEventListener('click', function () {
    location.hash = '#/matches';
  });
  refreshBtn?.addEventListener('click', async function () {
    refreshBtn.disabled = true;
    try {
      await fetchPredictions(true);
    } finally {
      refreshBtn.disabled = false;
    }
  });
  searchInput?.addEventListener('input', function (e) {
    state.search = e.target.value || '';
    applyFilters();
  });
  winnersToggle?.addEventListener('change', function (e) {
    state.winnersOnly = !!e.target.checked;
    applyFilters();
  });

  await fetchPredictions();
}

async function renderMatchFormPage(id) {
  let m = {};
  if (id) {
    m =
      allMatches.find(function (x) {
        return x.id === id;
      }) ||
      (await getDoc(doc(db, 'matches', id)).then(function (s) {
        return s.exists() ? { id: s.id, ...s.data() } : null;
      }));
    if (!m) {
      $matchesContent.innerHTML = '<div class="center" style="padding:32px">Match introuvable.</div>';
      return;
    }
  }
  const start = m.startTime && m.startTime.toDate ? m.startTime.toDate() : m.startTime ? new Date(m.startTime) : null;
  const startVal = start
    ? new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    : '';

  const wrap = document.createElement('div');
  wrap.className = 'form-wrap';
  wrap.innerHTML = `
	<div class="form-head">
	  <div class="form-title">${id ? '?diter' : 'Nouveau'} match</div>
	</div>
	<form class="form-main" novalidate>
	  <div class="twocol">
		<div class="field">
		  <label class="label" for="m-competition">Comp?tition</label>
		  <input id="m-competition" class="input" type="text" value="${escapeAttr(m.competition || '')}" />
		</div>
		<div class="field">
		  <label class="label" for="m-startTime">Date &amp; heure</label>
		  <input id="m-startTime" class="input" type="datetime-local" value="${startVal}" required />
		  <div id="err-mstart" class="error hide"></div>
		</div>
	  </div>
	  <div class="twocol">
		<div class="field">
		  <label class="label" for="m-teamA">?quipe A</label>
		  <input id="m-teamA" class="input" type="text" value="${escapeAttr(m.teamA || '')}" required />
		</div>
		<div class="field">
		  <label class="label" for="m-teamB">?quipe B</label>
		  <input id="m-teamB" class="input" type="text" value="${escapeAttr(m.teamB || '')}" required />
		</div>
	  </div>
	  <div class="twocol">
		<div class="field">
		  <label class="label" for="m-logoA">Logo &eacute;quipe A (URL)</label>
		  <input id="m-logoA" class="input" type="url" value="${escapeAttr(m.teamALogo || '')}" />
		</div>
		<div class="field">
		  <label class="label" for="m-logoB">Logo &eacute;quipe B (URL)</label>
		  <input id="m-logoB" class="input" type="url" value="${escapeAttr(m.teamBLogo || '')}" />
		</div>
	  </div>
	  <div class="twocol">
		<div class="field">
		  <label class="label" for="m-scoreA">Score A (final)</label>
		  <input id="m-scoreA" class="input" type="number" min="0" step="1" value="${typeof m.finalScoreA === 'number' ? m.finalScoreA : ''}" />
		</div>
		<div class="field">
		  <label class="label" for="m-scoreB">Score B (final)</label>
		  <input id="m-scoreB" class="input" type="number" min="0" step="1" value="${typeof m.finalScoreB === 'number' ? m.finalScoreB : ''}" />
		</div>
	  </div>
	  <div class="form-actions">
		<button type="button" class="btn" data-cancel>Annuler</button>
		<button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Cr?er le match'}</button>
	  </div>
	</form>`;
  $matchesContent.innerHTML = '';
  $matchesContent.appendChild(wrap);
  wrap.querySelector('[data-cancel]').addEventListener('click', function () {
    if (history.length > 1) {
      history.back();
    } else {
      location.hash = '#/matches';
    }
  });
  wrap.querySelector('form').addEventListener('submit', function (e) {
    handleMatchFormSubmit(e, id);
  });
}

async function handleMatchFormSubmit(e, id) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  const competition = $('#m-competition').value.trim();
  const teamA = $('#m-teamA').value.trim();
  const teamB = $('#m-teamB').value.trim();
  const teamALogo = $('#m-logoA').value.trim() || null;
  const teamBLogo = $('#m-logoB').value.trim() || null;
  const scoreA = $('#m-scoreA').value === '' ? null : parseInt($('#m-scoreA').value, 10);
  const scoreB = $('#m-scoreB').value === '' ? null : parseInt($('#m-scoreB').value, 10);
  const startVal = $('#m-startTime').value;
  $('#err-mstart').classList.add('hide');
  if (!startVal) {
    $('#err-mstart').textContent = 'La date/heure est requise.';
    $('#err-mstart').classList.remove('hide');
    setButtonLoading(submitBtn, false);
    return;
  }

  try {
    const data = {
      competition,
      teamA,
      teamB,
      teamALogo,
      teamBLogo,
      finalScoreA: Number.isNaN(scoreA) ? null : scoreA,
      finalScoreB: Number.isNaN(scoreB) ? null : scoreB,
      startTime: new Date(startVal),
    };
    if (id) {
      await updateDoc(doc(db, 'matches', id), data);
      const m = allMatches.find(function (x) {
        return x.id === id;
      });
      if (m) Object.assign(m, data);
      toast('Match mis ? jour', teamA + ' vs ' + teamB, 'success');
      location.hash = '#/matches';
    } else {
      const refDoc = await addDoc(collection(db, 'matches'), data);
      allMatches.unshift({ id: refDoc.id, ...data });
      toast('Match cr??', teamA + ' vs ' + teamB, 'success');
      location.hash = '#/matches';
      $('#kpi-matches').textContent = String(allMatches.length);
    }
  } catch (err) {
    console.error(err);
    toast('Erreur', 'Enregistrement impossible', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/* ============================ Promo Cards UI ============================ */
$('#add-promocard').addEventListener('click', () => (location.hash = '#/new-promocard'));
$('#search-promocards').addEventListener('input', () => renderPromoCardList());

function renderPromoCardList() {
  const term = normalizeSearch($('#search-promocards').value || '');

  const cards = getPromoCardsForDisplay();

  const arr = term
    ? cards.filter(card => `${card.title || ''} ${card.subtitle || ''}`.toLowerCase().includes(term))
    : cards;

  if (!arr.length) {
    $promoCardsContent.innerHTML = '<div class="center" style="padding:32px">Aucune carte promo.</div>';

    return;
  }

  const table = document.createElement('table');

  table.className = 'table';

  table.innerHTML = `

        <thead>

            <tr>

                <th style="width:60px">Image</th>

                <th>Titre</th>

                <th>Destination</th>

                <th>Ordre</th>

                <th>Statut</th>

                <th style="width:180px;text-align:right">Actions</th>

            </tr>

        </thead>

        <tbody id="tbody-promocards"></tbody>`;

  const tb = table.querySelector('#tbody-promocards');

  arr.forEach((card, index) => {
    const isContestCard = card.isContestCard === true;

    const tr = document.createElement('tr');

    tr.dataset.id = card.id;

    const sortLabel = isContestCard
      ? card.sortOrder < 0
        ? 'Auto'
        : (card.sortOrder ?? 'N/A')
      : (card.sortOrder ?? 'N/A');

    const destination = card.screen || (isContestCard ? 'Contest' : 'Aucune');

    const statusCell = isContestCard
      ? `<span class="chip">${card.isActive ? 'Active (auto)' : 'Inactif'}</span>`
      : `<label class="toggle">

          <span class="toggle-switch">

            <input type="checkbox" data-active-toggle ${card.isActive ? 'checked' : ''} />

            <span class="toggle-slider"></span>

          </span>

        </label>`;

    const actionsCell = isContestCard
      ? '<button class="btn btn-icon btn-small" type="button" data-move-up title="Monter"><i data-lucide="arrow-up" class="icon"></i></button>' +
      '<button class="btn btn-icon btn-small" type="button" data-move-down title="Descendre"><i data-lucide="arrow-down" class="icon"></i></button>' +
      '<button class="btn btn-small" data-edit>Editer</button>' +
      '<button class="btn btn-danger btn-small" data-del>Supprimer</button>'
      : '<button class="btn btn-icon btn-small" type="button" data-move-up title="Monter"><i data-lucide="arrow-up" class="icon"></i></button>' +
      '<button class="btn btn-icon btn-small" type="button" data-move-down title="Descendre"><i data-lucide="arrow-down" class="icon"></i></button>' +
      '<button class="btn btn-small" data-edit>Editer</button>' +
      '<button class="btn btn-danger btn-small" data-del>Supprimer</button>';

    tr.innerHTML = `

        <td>${card.image ? `<img class="img" src="${escapeAttr(card.image)}" />` : ''}</td>

        <td style="font-weight:800">${escapeHtml(card.title || 'Sans titre')}</td>

        <td><span class="chip">${escapeHtml(destination)}</span></td>

        <td><span class="badge">${escapeHtml(String(sortLabel))}</span></td>

        <td>${statusCell}</td>

        <td class="actions">${actionsCell}</td>`;

    const moveUpBtn = tr.querySelector('[data-move-up]');

    const moveDownBtn = tr.querySelector('[data-move-down]');

    if (moveUpBtn) {
      moveUpBtn.disabled = index === 0;

      moveUpBtn.onclick = () => handlePromoCardMove(card.id, 'up');
    }

    if (moveDownBtn) {
      moveDownBtn.disabled = index === arr.length - 1;

      moveDownBtn.onclick = () => handlePromoCardMove(card.id, 'down');
    }

    if (isContestCard) {
      tr.querySelector('[data-edit]').onclick = () => (location.hash = `#/edit-contest/${card.contestId}`);
      tr.querySelector('[data-del]').onclick = () => handleContestDeletion(card.contestId, card.title);
    } else {
      tr.querySelector('[data-edit]').onclick = () => (location.hash = `#/edit-promocard/${card.id}`);
      tr.querySelector('[data-del]').onclick = () => handleDelete(card.id, card.title, 'promoCards');
      tr.querySelector('[data-active-toggle]').onchange = e => handlePromoCardStatusToggle(card.id, e.target.checked);
    }

    tb.appendChild(tr);
  });

  $promoCardsContent.innerHTML = '';

  $promoCardsContent.appendChild(table);

  lucide.createIcons();
}

async function handlePromoCardStatusToggle(id, isActive) {
  try {
    await updateDoc(doc(db, 'promoCards', id), { isActive: isActive });
    const card = allPromoCards.find(c => c.id === id);
    if (card) card.isActive = isActive;
    toast('Statut mis ? jour', `La carte est maintenant ${isActive ? 'active' : 'inactif'}.`, 'success');
  } catch (error) {
    console.error('Erreur de mise ? jour du statut:', error);
    toast('Erreur', 'Impossible de changer le statut.', 'error');
    renderPromoCardList();
  }
}

async function handlePromoCardMove(id, direction) {
  const list = getPromoCardsForDisplay();
  const currentIndex = list.findIndex(card => card.id === id);
  if (currentIndex === -1) {
    return;
  }
  const offset = direction === 'up' ? -1 : 1;
  const targetIndex = currentIndex + offset;
  if (targetIndex < 0 || targetIndex >= list.length) {
    return;
  }
  const [movedCard] = list.splice(currentIndex, 1);
  list.splice(targetIndex, 0, movedCard);
  try {
    const updates = [];
    const rebuilt = [];
    list.forEach((card, idx) => {
      const newOrder = (idx + 1) * 10;
      if (card.isContestCard) {
        if (card.sortOrder !== newOrder) {
          card.sortOrder = newOrder;
          updates.push(updateDoc(doc(db, 'contests', card.contestId), { promoCardSortOrder: newOrder }));
        }
        if (contestPromoCard && contestPromoCard.id === card.id) {
          contestPromoCard.sortOrder = newOrder;
        }
      } else {
        if (card.sortOrder !== newOrder) {
          card.sortOrder = newOrder;
          updates.push(updateDoc(doc(db, 'promoCards', card.id), { sortOrder: newOrder }));
        }
        const { isContestCard, contestId, ...rest } = card;
        rebuilt.push(rest);
      }
    });
    if (updates.length) {
      await Promise.all(updates);
    }
    allPromoCards = rebuilt.sort((a, b) => getPromoSortOrder(a) - getPromoSortOrder(b));
    renderPromoCardList();
    toast('Ordre mis a jour', movedCard.title || 'Carte promo', 'success');
  } catch (error) {
    console.error('Promo card reorder failed', error);
    toast('Erreur', 'Impossible de reordonner la carte.', 'error');
    await ensurePromoCardsLoaded(true);
    renderPromoCardList();
  }
}

async function renderPromoCardFormPage(id) {
  let card = {};
  if (id) {
    card =
      allPromoCards.find(c => c.id === id) ||
      (await getDoc(doc(db, 'promoCards', id)).then(s => (s.exists() ? { id: s.id, ...s.data() } : null)));
    if (!card) {
      $promoCardsContent.innerHTML = '<div class="center" style="padding:32px">Carte introuvable.</div>';
      return;
    }
  }
  const wrap = document.createElement('div');
  wrap.className = 'form-wrap';
  wrap.innerHTML = `
		<div class="form-head"><div class="form-title">${id ? '?diter' : 'Nouvelle'} Carte Promo</div></div>
		<form class="form-main" novalidate>
			<div class="twocol">
				<div class="field">
					<label class="label" for="pc-title">Titre</label>
					<input id="pc-title" class="input" type="text" value="${escapeAttr(card.title || '')}" required />
				</div>
				<div class="field">
					<label class="label" for="pc-subtitle">Sous-titre (optionnel)</label>
					<input id="pc-subtitle" class="input" type="text" value="${escapeAttr(card.subtitle || '')}" />
				</div>
			</div>
			<div class="twocol">
				<div class="field">
					<label class="label" for="pc-cta">Texte du bouton (CTA)</label>
					<input id="pc-cta" class="input" type="text" value="${escapeAttr(card.cta || '')}" />
				</div>
				<div class="field">
					<label class="label" for="pc-screen">?cran de destination</label>
					<input id="pc-screen" class="input" type="text" value="${escapeAttr(card.screen || '')}" placeholder="Ex: MatchList, Store..." />
				</div>
			</div>
			<div class="twocol">
				<div class="field">
				  <label class="label" for="pc-image">URL de l'image</label>
				  <input id="pc-image" class="input" type="url" value="${escapeAttr(card.image || '')}" />
				</div>
				<div class="field">
					<label class="label" for="pc-sortOrder">Ordre d'affichage</label>
					<input id="pc-sortOrder" class="input" type="number" min="1" step="1" value="${card.sortOrder || ''}" required />
				</div>
			</div>
			<div class="field">
				<label class="toggle">
					<span class="toggle-switch">
						<input id="pc-isActive" type="checkbox" ${card.isActive !== false ? 'checked' : ''}>
						<span class="toggle-slider"></span>
					</span>
					<span>Active (visible dans l'application)</span>
				</label>
			</div>
			<div class="form-actions">
				<button type="button" class="btn" data-cancel>Annuler</button>
				<button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Cr?er la carte'}</button>
			</div>
		</form>`;
  $promoCardsContent.innerHTML = '';
  $promoCardsContent.appendChild(wrap);
  wrap.querySelector('[data-cancel]').onclick = () => (location.hash = '#/promocards');
  wrap.querySelector('form').onsubmit = e => handlePromoCardFormSubmit(e, id);
}

async function handlePromoCardFormSubmit(e, id) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  const sortOrder = parseInt($('#pc-sortOrder').value, 10);
  const data = {
    title: $('#pc-title').value.trim(),
    subtitle: $('#pc-subtitle').value.trim(),
    cta: $('#pc-cta').value.trim(),
    screen: $('#pc-screen').value.trim(),
    image: $('#pc-image').value.trim(),
    sortOrder: isNaN(sortOrder) ? 0 : sortOrder,
    isActive: $('#pc-isActive').checked,
  };
  if (!data.title) {
    toast('Erreur', 'Le titre est requis.', 'error');
    setButtonLoading(submitBtn, false);
    return;
  }
  try {
    if (id) {
      await updateDoc(doc(db, 'promoCards', id), data);
      const i = allPromoCards.findIndex(c => c.id === id);
      if (i > -1) allPromoCards[i] = { id, ...data };
      toast('Carte mise ? jour', data.title, 'success');
    } else {
      const refDoc = await addDoc(collection(db, 'promoCards'), data);
      allPromoCards.push({ id: refDoc.id, ...data });
      updatePromoCardsKpi();
      toast('Carte cr??e', data.title, 'success');
    }
    allPromoCards.sort((a, b) => a.sortOrder - b.sortOrder);
    location.hash = '#/promocards';
  } catch (err) {
    console.error(err);
    toast('Erreur', 'Enregistrement impossible', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/* ============================ Promo Payouts UI ============================ */
function renderPromoPayoutList() {
  if (!$promoPayoutsContent) return;
  const term = (promoPayoutSearchTerm || '').toLowerCase();
  const arr = term
    ? allPromoPayouts.filter(p =>
      `${p.code || ''} ${p.status || ''} ${p.mode || ''}`.toLowerCase().includes(term.toLowerCase()),
    )
    : allPromoPayouts;
  if (!arr.length) {
    $promoPayoutsContent.innerHTML = '<div class="center" style="padding:32px">Aucun versement.</div>';
    return;
  }
  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `
        <thead>
            <tr>
                <th>Code</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Mode</th>
                <th>Date</th>
                <th style="width:180px;text-align:right">Actions</th>
            </tr>
        </thead>
        <tbody id="tbody-promopayouts"></tbody>`;
  const tb = table.querySelector('#tbody-promopayouts');
  arr.forEach(p => {
    const createdAt =
      p.createdAt && typeof p.createdAt.toDate === 'function'
        ? p.createdAt.toDate()
        : p.createdAt
          ? new Date(p.createdAt)
          : null;
    const dateText = createdAt && !Number.isNaN(createdAt.valueOf()) ? fmtDate(createdAt) : '-';
    const status = (p.status || 'pending').toLowerCase();
    const statusLabel = status === 'paid' ? 'Payé' : status === 'cancelled' ? 'Annulé' : 'En attente';
    const statusClass = status === 'paid' ? 'success' : status === 'cancelled' ? 'danger' : 'warning';
    const tr = document.createElement('tr');
    tr.dataset.id = p.id;
    tr.innerHTML = `
            <td style="font-weight:800"><span class="chip">${escapeHtml(p.code || '')}</span></td>
            <td>${fmtXOF.format(p.amount || 0)}</td>
            <td><span class="badge ${statusClass}">${statusLabel}</span></td>
            <td>${escapeHtml(p.mode || '-')}</td>
            <td>${escapeHtml(dateText)}</td>
            <td class="actions">
                <button class="btn btn-small" data-edit>Éditer</button>
                <button class="btn btn-danger btn-small" data-del>Supprimer</button>
            </td>`;
    tr.querySelector('[data-edit]').onclick = () => (location.hash = `#/edit-promopayout/${p.id}`);
    tr.querySelector('[data-del]').onclick = () => handleDelete(p.id, p.code, 'promoPayouts');
    tb.appendChild(tr);
  });
  $promoPayoutsContent.innerHTML = '';
  $promoPayoutsContent.appendChild(table);
  lucide.createIcons();
}

async function renderPromoPayoutFormPage(id) {
  let payout = {};
  if (id) {
    payout =
      allPromoPayouts.find(p => p.id === id) ||
      (await getDoc(doc(db, 'promoPayouts', id)).then(s => (s.exists() ? { id: s.id, ...s.data() } : null)));
    if (!payout) {
      if ($promoPayoutsContent) {
        $promoPayoutsContent.innerHTML = '<div class="center" style="padding:32px">Versement introuvable.</div>';
      }
      return;
    }
  }

  const wrap = document.createElement('div');
  wrap.className = 'form-wrap';
  wrap.innerHTML = `
        <div class="form-head"><div class="form-title">${id ? 'Éditer' : 'Nouveau'} versement</div></div>
        <form class="form-main" novalidate>
            <div class="twocol">
              <div class="field">
                <label class="label" for="pp-code">Code</label>
                <input id="pp-code" class="input" type="text" value="${escapeAttr(payout.code || '')}" required placeholder="EX: JOYFUL-AP" />
                <div class="hint">Code promo concerné.</div>
              </div>
              <div class="field">
                <label class="label" for="pp-amount">Montant</label>
                <input id="pp-amount" class="input" type="number" min="0" step="1000" value="${payout.amount ?? ''}" required />
                <div class="hint">Montant versé (FCFA).</div>
              </div>
            </div>
            <div class="twocol">
              <div class="field">
                <label class="label" for="pp-mode">Mode</label>
                <select id="pp-mode" class="select">
                  <option value="momo" ${payout.mode === 'momo' ? 'selected' : ''}>Mobile Money</option>
                  <option value="virement" ${payout.mode === 'virement' ? 'selected' : ''}>Virement bancaire</option>
                  <option value="cash" ${payout.mode === 'cash' ? 'selected' : ''}>Cash</option>
                  <option value="autre" ${payout.mode === 'autre' ? 'selected' : ''}>Autre</option>
                </select>
              </div>
              <div class="field">
                <label class="label" for="pp-status">Statut</label>
                <select id="pp-status" class="select">
                  <option value="paid" ${payout.status === 'paid' ? 'selected' : ''}>Payé</option>
                  <option value="pending" ${!payout.status || payout.status === 'pending' ? 'selected' : ''}>En attente</option>
                  <option value="cancelled" ${payout.status === 'cancelled' ? 'selected' : ''}>Annulé</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label class="label" for="pp-date">Date</label>
              <input id="pp-date" class="input" type="datetime-local" value="${escapeAttr(toInputDateValue(payout.createdAt))}" />
            </div>
            <div class="field">
              <label class="label" for="pp-ref">Référence paiement</label>
              <input id="pp-ref" class="input" type="text" value="${escapeAttr(payout.ref || '')}" placeholder="TxID, ref bancaire..." />
            </div>
            <div class="field">
              <label class="label" for="pp-note">Note (optionnel)</label>
              <textarea id="pp-note" class="textarea" rows="3" placeholder="Détail ou commentaire">${escapeHtml(payout.note || '')}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" data-cancel>Annuler</button>
                <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Enregistrer le versement'}</button>
            </div>
        </form>`;
  if ($promoPayoutsContent) {
    $promoPayoutsContent.innerHTML = '';
    $promoPayoutsContent.appendChild(wrap);
  }
  wrap.querySelector('[data-cancel]').onclick = () => (location.hash = '#/promocodes/payouts');
  wrap.querySelector('form').onsubmit = e => handlePromoPayoutFormSubmit(e, id, payout);
}

async function handlePromoPayoutFormSubmit(e, id, existing = {}) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);
  const code = ($('#pp-code').value || '').trim().toUpperCase();
  const amount = Number($('#pp-amount').value);
  const mode = $('#pp-mode').value || 'momo';
  const status = $('#pp-status').value || 'pending';
  const note = ($('#pp-note').value || '').trim();
  const ref = ($('#pp-ref').value || '').trim();
  const dateVal = $('#pp-date').value;
  if (!code || Number.isNaN(amount)) {
    toast('Erreur', 'Code et montant requis.', 'error');
    setButtonLoading(submitBtn, false);
    return;
  }
  const payload = {
    code,
    amount,
    mode,
    status,
    note: note || null,
    ref: ref || null,
  };
  if (dateVal) {
    payload.createdAt = new Date(dateVal);
  } else if (!id) {
    payload.createdAt = serverTimestamp();
  }
  try {
    if (id) {
      await updateDoc(doc(db, 'promoPayouts', id), payload);
      const i = allPromoPayouts.findIndex(p => p.id === id);
      if (i > -1) {
        allPromoPayouts[i] = { ...allPromoPayouts[i], ...payload };
      }
      toast('Versement mis à jour', code, 'success');
    } else {
      const refDoc = await addDoc(collection(db, 'promoPayouts'), payload);
      const fresh = await getDoc(refDoc);
      const saved = fresh.exists() ? { id: refDoc.id, ...fresh.data() } : { id: refDoc.id, ...payload };
      allPromoPayouts.unshift(saved);
      toast('Versement enregistré', code, 'success');
    }
    renderPromoPayoutList();
    location.hash = '#/promocodes/payouts';
  } catch (err) {
    console.error(err);
    toast('Erreur', 'Enregistrement impossible', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/* ============================ Promo Codes UI (AJOUT) ============================ */
$('#add-promocode').addEventListener('click', () => (location.hash = '#/new-promocode'));
$('#search-promocodes').addEventListener('input', () => renderPromoCodeList());
$('#filter-promocode-partner')?.addEventListener('input', e => {
  promoCodePartnerFilter = (e.target.value || '').toLowerCase();
  renderPromoCodeList();
});
$('#add-promorule')?.addEventListener('click', () => (location.hash = '#/new-promorule'));
$('#search-promorules')?.addEventListener('input', () => renderPromoRuleList());
$('#add-promopayout')?.addEventListener('click', () => (location.hash = '#/new-promopayout'));
document.querySelectorAll('.promo-tab-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const tab = btn.dataset.tab || 'codes';
    await setPromoTab(tab);
    const base = '#/promocodes';
    const hash = tab === 'codes' ? base : `${base}/${tab}`;
    location.hash = hash;
  });
});

function renderPromoCodeList() {
  ensurePromoRulesLoaded().catch(err => console.warn('PromoRules load skipped', err));
  const term = ($('#search-promocodes').value || '').toLowerCase();
  const partnerFilter = promoCodePartnerFilter || '';
  let arr = allPromoCodes.slice();
  if (term) {
    arr = arr.filter(c => {
      const codeMatch = (c.code || '').toLowerCase().includes(term);
      const partnerMatch = (c.assignedTo || '').toLowerCase().includes(term);
      return codeMatch || partnerMatch;
    });
  }
  if (partnerFilter) {
    arr = arr.filter(c => (c.assignedTo || '').toLowerCase().includes(partnerFilter));
  }

  if (!arr.length) {
    $promoCodesContent.innerHTML = `<div class="center" style="padding:32px">Aucun code promo.</div>`;
    return;
  }
  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `
        <thead>
            <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Valeur</th>
                <th>Partenaire</th>
                <th>Statut / Règle</th>
                <th style="width:220px;text-align:right">Actions</th>
            </tr>
        </thead>
        <tbody id="tbody-promocodes"></tbody>`;
  const tb = table.querySelector('#tbody-promocodes');
  arr.forEach(c => {
    const tr = document.createElement('tr');
    tr.dataset.id = c.id;
    const valText = c.type === 'percentage' ? `${c.value}%` : fmtXOF.format(c.value);
    const rule = allPromoRules.find(r => (r.code || r.id || '').toLowerCase() === (c.code || '').toLowerCase());
    const channels = rule?.allowedChannels?.join(', ') || 'tous';
    const bracketsText = summarizeBrackets(rule?.priceBrackets || DEFAULT_PRICE_BRACKETS);
    tr.innerHTML = `
            <td style="font-weight:800"><span class="chip">${escapeHtml(c.code || 'Sans code')}</span></td>
            <td>${escapeHtml(c.type === 'percentage' ? 'Pourcentage' : 'Montant Fixe')}</td>
            <td><span class="badge success">${valText}</span></td>
            <td>${escapeHtml(c.assignedTo || '-')}</td>
            <td>
                <label class="toggle">
                    <span class="toggle-switch">
                        <input type="checkbox" data-active-toggle ${c.isActive ? 'checked' : ''} />
                        <span class="toggle-slider"></span>
                    </span>
                </label>
                <div class="muted small">${escapeHtml(channels)}</div>
                <div class="muted small">${escapeHtml(bracketsText)}</div>
            </td>
            <td class="actions">
                <button class="btn btn-outline btn-small" data-preview>Tester liens</button>
                <button class="btn btn-small" data-edit>Éditer</button>
                <button class="btn btn-danger btn-small" data-del>Supprimer</button>
            </td>`;
    tr.querySelector('[data-preview]').onclick = () => previewPromoLinks(c.code, c.assignedTo);
    tr.querySelector('[data-edit]').onclick = () => (location.hash = `#/edit-promocode/${c.id}`);
    tr.querySelector('[data-del]').onclick = () => handleDelete(c.id, c.code, 'promoCodes');
    tr.querySelector('[data-active-toggle]').onchange = e => handlePromoCodeStatusToggle(c.id, e.target.checked);
    tb.appendChild(tr);
  });
  $promoCodesContent.innerHTML = '';
  $promoCodesContent.appendChild(table);
  lucide.createIcons();
}

async function previewPromoLinks(code, ref) {
  const normalized = (code || '').trim();
  if (!normalized) return;
  try {
    const callable = httpsCallable(functionsInstance, 'generatePromoLinks');
    const res = await callable({ code: normalized, ref });
    const data = res.data || {};
    const body = `
      <div class="field"><div class="label">Web</div><div class="chip">${escapeHtml(data.webLink || '-')}</div></div>
      <div class="field"><div class="label">App</div><div class="chip">${escapeHtml(data.appDeepLink || data.appLink || '-')}</div></div>
      <div class="field"><div class="label">WhatsApp</div><div class="chip">${escapeHtml(data.whatsappLink || '-')}</div></div>
    `;
    await openModal({ title: `Liens pour ${escapeHtml(normalized)}`, body, okText: 'Fermer', cancelText: 'Fermer' });
  } catch (error) {
    console.error('Preview promo links failed', error);
    toast('Erreur', 'Impossible de générer les liens.', 'error');
  }
}

async function handlePromoCodeStatusToggle(id, isActive) {
  try {
    await updateDoc(doc(db, 'promoCodes', id), { isActive: isActive });
    const code = allPromoCodes.find(c => c.id === id);
    if (code) code.isActive = isActive;
    toast('Statut mis ? jour', `Le code est maintenant ${isActive ? 'actif' : 'inactif'}.`, 'success');
  } catch (error) {
    console.error('Erreur de mise ? jour du statut:', error);
    toast('Erreur', 'Impossible de changer le statut.', 'error');
    renderPromoCodeList();
  }
}


async function renderPromoCodeFormPage(id) {
  let code = {};
  let rule = null;
  if (id) {
    code =
      allPromoCodes.find(c => c.id === id) ||
      (await getDoc(doc(db, 'promoCodes', id)).then(s => (s.exists() ? { id: s.id, ...s.data() } : null)));
    if (!code) {
      $promoCodesContent.innerHTML = '<div class="center" style="padding:32px">Code introuvable.</div>';
      return;
    }
  }
  const ruleId = (code.code || code.id || id || '').toUpperCase();
  if (ruleId) {
    rule =
      allPromoRules.find(r => (r.code || r.id || '').toUpperCase() === ruleId) ||
      (await getDoc(doc(db, 'promoRules', ruleId)).then(s => (s.exists() ? { id: s.id, ...s.data() } : null)));
  }
  const ruleData = rule || {
    code: ruleId,
    isActive: code.isActive !== false,
    allowedChannels: ['web', 'app', 'wa', 'qr', 'bo'],
    allowedPartners: [],
    partnerRefRequired: false,
    priceBrackets: DEFAULT_PRICE_BRACKETS,
    startsAt: null,
    endsAt: null,
  };
  const channelsSelected =
    (ruleData.allowedChannels && ruleData.allowedChannels.length
      ? ruleData.allowedChannels
      : ['web', 'app', 'wa', 'qr', 'bo']
    ).map(c => String(c).toLowerCase());
  const partnersValue = (ruleData.allowedPartners || []).join(',');
  const initialBrackets = ruleData.priceBrackets && ruleData.priceBrackets.length ? ruleData.priceBrackets : DEFAULT_PRICE_BRACKETS;

  const wrap = document.createElement('div');
  wrap.className = 'form-wrap';
  wrap.innerHTML = `
        <div class="form-head"><div class="form-title">${id ? 'Éditer' : 'Nouveau'} Code Promo</div></div>
        <form class="form-main" novalidate>
            <div class="twocol">
                <div class="field">
                    <label class="label" for="pc-code">Le Code</label>
                    <input id="pc-code" class="input" type="text" value="${escapeAttr(code.code || '')}" ${id ? 'disabled' : ''} required placeholder="ex: BIENVENUE10" />
                </div>
                <div class="field">
                    <label class="label" for="pc-type">Type de réduction</label>
                    <select id="pc-type" class="select">
                        <option value="percentage" ${code.type === 'percentage' ? 'selected' : ''}>Pourcentage (%)</option>
                        <option value="fixed" ${code.type === 'fixed' ? 'selected' : ''}>Montant Fixe (FCFA)</option>
                    </select>
                </div>
            </div>
            <div class="field">
                <label class="label" for="pc-value">Valeur de la réduction</label>
                <input id="pc-value" class="input" type="number" min="0" step="1" value="${code.value || ''}" required />
                <div class="hint">Ex: "10" pour 10% ou "5000" pour 5000 FCFA.</div>
            </div>
            <div class="field">
                <label class="label" for="pc-partner">Partenaire attribué</label>
                <input id="pc-partner" class="input" type="text" value="${escapeAttr(code.assignedTo || '')}" placeholder="Orange Money, Canal+, etc." />
                <div class="hint">Optionnel. Permet d'identifier le partenaire ou la campagne associée à ce code.</div>
            </div>
            <div class="field">
                <label class="toggle">
                    <span class="toggle-switch">
                        <input id="pc-isActive" type="checkbox" ${code.isActive !== false ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </span>
                    <span>Actif (utilisable dans l'application)</span>
                </label>
            </div>
            <div class="divider"></div>
            <div class="field">
              <label class="label">Règle promo (validation)</label>
              <div class="hint">Canaux autorisés, partenaires et tranches de remise/commission</div>
            </div>
            <div class="twocol">
              <div class="field">
                <label class="label">Canaux autorisés</label>
                <div id="pc-channels-group" class="channel-checks"></div>
                <div class="hint">Coche les canaux où ce code peut être utilisé.</div>
              </div>
              <div class="field">
                <label class="label" for="pc-partners">Partenaires autorisés</label>
                <input id="pc-partners" class="input" type="text" value="${escapeAttr(partnersValue)}" placeholder="PART-001,PART-002" />
                <div class="hint">Laisse vide pour tous les partenaires.</div>
              </div>
            </div>
            <div class="field">
              <label class="toggle">
                <span class="toggle-switch">
                  <input id="pc-partnerRequired" type="checkbox" ${ruleData.partnerRefRequired ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </span>
                <span>Ref partenaire obligatoire</span>
              </label>
            </div>
            <div class="twocol">
              <div class="field">
                <label class="label" for="pc-start">Début</label>
                <input id="pc-start" class="input" type="datetime-local" value="${escapeAttr(toInputDateValue(ruleData.startsAt))}" />
              </div>
              <div class="field">
                <label class="label" for="pc-end">Fin</label>
                <input id="pc-end" class="input" type="datetime-local" value="${escapeAttr(toInputDateValue(ruleData.endsAt))}" />
              </div>
            </div>
            <div class="field">
              <label class="label">Tranches (remise / commission)</label>
              <div id="brackets-rows" class="brackets-rows"></div>
              <div class="top-actions" style="margin-top:8px; gap:8px;">
                <button id="add-bracket" type="button" class="btn btn-outline btn-small"><i data-lucide="plus" class="icon"></i> Ajouter une tranche</button>
                <button id="reset-brackets" type="button" class="btn btn-small"><i data-lucide="rotate-ccw" class="icon"></i> Valeurs par défaut</button>
              </div>
              <div class="hint">Ex: 0-149 000 => remise 5 000 / commission 8 000. Laissez Max vide pour une tranche ouverte.</div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" data-cancel>Annuler</button>
                <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Créer le code'}</button>
            </div>
        </form>`;
  $promoCodesContent.innerHTML = '';
  $promoCodesContent.appendChild(wrap);
  wrap.querySelector('[data-cancel]').onclick = () => (location.hash = '#/promocodes');
  wrap.querySelector('form').onsubmit = e => handlePromoCodeFormSubmit(e, id || ruleId);

  renderChannelCheckboxes('pc-channels-group', channelsSelected);
  renderBracketRows(initialBrackets);
  document.getElementById('add-bracket')?.addEventListener('click', () => {
    const container = document.getElementById('brackets-rows');
    if (container) {
      container.appendChild(buildBracketRow({ min: 0, max: null, discountValue: 0, commissionValue: 0, label: '' }));
    }
    lucide.createIcons();
  });
  document.getElementById('reset-brackets')?.addEventListener('click', () => renderBracketRows(DEFAULT_PRICE_BRACKETS));
}


async function handlePromoCodeFormSubmit(e, id) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  const codeValue = ($('#pc-code').value || '').trim().toUpperCase();
  const value = parseFloat($('#pc-value').value);

  if (!codeValue || isNaN(value)) {
    toast('Erreur', 'Le code et la valeur sont requis.', 'error');
    setButtonLoading(submitBtn, false);
    return;
  }

  const data = {
    code: codeValue,
    type: $('#pc-type').value,
    value: value,
    assignedTo: $('#pc-partner').value.trim(),
    isActive: $('#pc-isActive').checked,
  };

  const allowedChannels = readChannelCheckboxes('pc-channels-group');
  const partnersRaw = $('#pc-partners').value || '';
  const allowedPartners = partnersRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  let priceBrackets = readBracketRows();
  if (!priceBrackets.length) {
    priceBrackets = DEFAULT_PRICE_BRACKETS;
  }

  const startsAtVal = $('#pc-start').value;
  const endsAtVal = $('#pc-end').value;
  const rulePayload = {
    code: codeValue,
    isActive: $('#pc-isActive').checked,
    allowedChannels: allowedChannels.length ? allowedChannels : ['web', 'app', 'wa', 'qr', 'bo'],
    allowedPartners: allowedPartners,
    partnerRefRequired: $('#pc-partnerRequired').checked,
    priceBrackets: priceBrackets,
    startsAt: startsAtVal ? new Date(startsAtVal) : null,
    endsAt: endsAtVal ? new Date(endsAtVal) : null,
    updatedAt: serverTimestamp(),
  };

  try {
    let promoCodeId = id;
    if (id) {
      await updateDoc(doc(db, 'promoCodes', id), data);
      const i = allPromoCodes.findIndex(c => c.id === id);
      if (i > -1) allPromoCodes[i] = { id, ...data };
      toast('Code mis ? jour', data.code, 'success');
    } else {
      const finalData = { ...data, createdAt: serverTimestamp() };
      const refDoc = await addDoc(collection(db, 'promoCodes'), finalData);
      promoCodeId = refDoc.id;
      allPromoCodes.unshift({ id: promoCodeId, ...finalData });
      $('#kpi-promocodes').textContent = String(allPromoCodes.length);
      toast('Code cr??', data.code, 'success');
    }

    const ruleRef = doc(db, 'promoRules', codeValue);
    await setDoc(ruleRef, { ...rulePayload, createdAt: serverTimestamp() }, { merge: true });
    const idx = allPromoRules.findIndex(r => (r.code || r.id || '').toUpperCase() === codeValue);
    if (idx > -1) {
      allPromoRules[idx] = { ...allPromoRules[idx], ...rulePayload, id: codeValue };
    } else {
      allPromoRules.unshift({ id: codeValue, ...rulePayload });
    }
    allPromoRules = allPromoRules.sort((a, b) => (a.code || a.id || '').localeCompare(b.code || b.id || ''));

    track('promo_code_save', { code: data.code, isEdit: Boolean(id), type: data.type, hasWa: allowedChannels.includes('wa'), partners: allowedPartners.length });
    location.hash = '#/promocodes';
    return;
  } catch (err) {
    console.error(err);
    toast('Erreur', 'Enregistrement impossible', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/* ============================ Promo Rules UI ============================ */
function summarizeBrackets(brackets = []) {
  if (!Array.isArray(brackets) || brackets.length === 0) return 'Aucune tranche';
  return brackets
    .slice(0, 3)
    .map(b => {
      const min = typeof b.min === 'number' ? b.min : 0;
      const max = typeof b.max === 'number' ? b.max : null;
      const discount = typeof b.discountValue === 'number' ? fmtXOF.format(b.discountValue) : '-';
      const commission = typeof b.commissionValue === 'number' ? fmtXOF.format(b.commissionValue) : '-';
      return `${min}-${max || '+'}: -${discount} / +${commission}`;
    })
    .join(' | ');
}

function renderPromoRuleList() {
  const term = (document.getElementById('search-promorules')?.value || '').toLowerCase();
  const arr = term
    ? allPromoRules.filter(r => {
      const codeMatch = (r.code || r.id || '').toLowerCase().includes(term);
      const partnerMatch = (r.allowedPartners || []).join(',').toLowerCase().includes(term);
      return codeMatch || partnerMatch;
    })
    : allPromoRules;

  if (!arr.length) {
    if ($promoRulesContent) $promoRulesContent.innerHTML = `<div class="center" style="padding:32px">Aucune rÃ¨gle promo.</div>`;
    return;
  }

  const table = document.createElement('table');
  table.className = 'table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Code</th>
        <th>Actif</th>
        <th>Canaux</th>
        <th>Tranches</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="tbody-promorules"></tbody>`;
  const tb = table.querySelector('#tbody-promorules');
  arr.forEach(r => {
    const tr = document.createElement('tr');
    tr.dataset.id = r.id;
    const channels = (r.allowedChannels || []).join(', ') || 'tous';
    const bracketsText = summarizeBrackets(r.priceBrackets || DEFAULT_PRICE_BRACKETS);
    tr.innerHTML = `
      <td style="font-weight:700">${escapeHtml(r.code || r.id || '')}</td>
      <td>
        <label class="toggle">
          <span class="toggle-switch">
            <input type="checkbox" data-active-toggle ${r.isActive !== false ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </span>
        </label>
      </td>
      <td>${escapeHtml(channels)}</td>
      <td>${escapeHtml(bracketsText)}</td>
      <td class="actions">
        <button class="btn btn-small" data-edit>?diter</button>
        <button class="btn btn-danger btn-small" data-del>Supprimer</button>
      </td>`;
    tr.querySelector('[data-edit]').onclick = () => (location.hash = `#/edit-promorule/${r.id}`);
    tr.querySelector('[data-del]').onclick = () => handleDelete(r.id, r.code || r.id, 'promoRules');
    tr.querySelector('[data-active-toggle]').onchange = e => handlePromoRuleStatusToggle(r.id, e.target.checked);
    tb.appendChild(tr);
  });
  $promoRulesContent.innerHTML = '';
  if ($promoRulesContent) {
    $promoRulesContent.appendChild(table);
  }
  lucide.createIcons();
}

async function handlePromoRuleStatusToggle(id, isActive) {
  try {
    await updateDoc(doc(db, 'promoRules', id), { isActive: isActive });
    const rule = allPromoRules.find(r => r.id === id);
    if (rule) rule.isActive = isActive;
    toast('Statut mis ? jour', `La r?gle est maintenant ${isActive ? 'active' : 'inactive'}.`, 'success');
  } catch (error) {
    console.error('PromoRule status update failed', error);
    toast('Erreur', 'Impossible de changer le statut.', 'error');
    renderPromoRuleList();
  }
}

async function renderPromoRuleFormPage(id) {
  let rule = {};
  if (id) {
    rule =
      allPromoRules.find(r => r.id === id) ||
      (await getDoc(doc(db, 'promoRules', id)).then(s => (s.exists() ? { id: s.id, ...s.data() } : null)));
    if (!rule) {
      $promoRulesContent.innerHTML = '<div class="center" style="padding:32px">R?gle introuvable.</div>';
      return;
    }
  }

  const initialBrackets = rule.priceBrackets && rule.priceBrackets.length ? rule.priceBrackets : DEFAULT_PRICE_BRACKETS;
  const channelsSelected =
    (rule.allowedChannels && rule.allowedChannels.length
      ? rule.allowedChannels
      : ['web', 'app', 'wa', 'qr', 'bo']
    ).map(c => String(c).toLowerCase());
  const partners = (rule.allowedPartners || []).join(',');

  const wrap = document.createElement('div');
  wrap.className = 'form-wrap';
  wrap.innerHTML = `
    <div class="form-head"><div class="form-title">${id ? '?diter R?gle' : 'Nouvelle R?gle Promo'}</div></div>
    <form class="form-main" novalidate>
      <div class="twocol">
        <div class="field">
          <label class="label" for="pr-code">Code</label>
          <input id="pr-code" class="input" type="text" value="${escapeAttr(rule.code || rule.id || '')}" ${id ? 'disabled' : ''
    } required />
          <div class="hint">Utilise des lettres/chiffres, ex: JOYFUL-AP</div>
        </div>
        <div class="field">
          <label class="label">Actif</label>
          <label class="toggle">
            <span class="toggle-switch">
              <input id="pr-active" type="checkbox" ${rule.isActive !== false ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </span>
            <span>Code utilisable</span>
          </label>
        </div>
      </div>
      <div class="twocol">
        <div class="field">
          <label class="label">Canaux autorises</label>
          <div id="pr-channels-group" class="channel-checks"></div>
          <div class="hint">Coche les canaux ou la regle peut s'appliquer.</div>
        </div>
        <div class="field">
          <label class="label" for="pr-partners">Partenaires autorises</label>
          <input id="pr-partners" class="input" type="text" value="${escapeAttr(partners)}" placeholder="PART-001,PART-002" />
          <div class="hint">Laisse vide pour tous les partenaires.</div>
        </div>
      </div>
      <div class="field">
        <label class="toggle">
          <span class="toggle-switch">
            <input id="pr-partnerRequired" type="checkbox" ${rule.partnerRefRequired ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </span>
          <span>Ref partenaire obligatoire</span>
        </label>
      </div>
      <div class="twocol">
        <div class="field">
          <label class="label" for="pr-start">D?but</label>
          <input id="pr-start" class="input" type="datetime-local" value="${escapeAttr(toInputDateValue(rule.startsAt))}" />
        </div>
        <div class="field">
          <label class="label" for="pr-end">Fin</label>
          <input id="pr-end" class="input" type="datetime-local" value="${escapeAttr(toInputDateValue(rule.endsAt))}" />
        </div>
      </div>
      <div class="field">
        <label class="label">Tranches (visuel)</label>
        <div id="pr-brackets-rows" class="brackets-rows"></div>
        <div class="top-actions" style="margin-top:8px; gap:8px;">
          <button id="pr-add-bracket" type="button" class="btn btn-outline btn-small"><i data-lucide="plus" class="icon"></i> Ajouter une tranche</button>
          <button id="pr-reset-brackets" type="button" class="btn btn-small"><i data-lucide="rotate-ccw" class="icon"></i> Valeurs par défaut</button>
        </div>
        <div class="hint">Chaque tranche: { min, max, discountValue, commissionValue, label }. Laisse Max vide pour une tranche ouverte.</div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn" data-cancel>Annuler</button>
        <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Cr?er la r?gle'}</button>
      </div>
    </form>`;
  $promoRulesContent.innerHTML = '';
  $promoRulesContent.appendChild(wrap);
  renderChannelCheckboxes('pr-channels-group', channelsSelected);
  renderBracketRows(initialBrackets);
  document.getElementById('pr-add-bracket')?.addEventListener('click', () => {
    const container = document.getElementById('pr-brackets-rows');
    if (container) {
      container.appendChild(buildBracketRow({ min: 0, max: null, discountValue: 0, commissionValue: 0, label: '' }));
    }
    lucide.createIcons();
  });
  document.getElementById('pr-reset-brackets')?.addEventListener('click', () => renderBracketRows(DEFAULT_PRICE_BRACKETS));
  wrap.querySelector('[data-cancel]').onclick = () => (location.hash = '#/promocodes/rules');
  wrap.querySelector('form').onsubmit = e => handlePromoRuleFormSubmit(e, id, rule.code || rule.id);
}

async function handlePromoRuleFormSubmit(e, id, existingCode) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  const code = (existingCode || $('#pr-code').value || '').trim().toUpperCase();
  if (!code) {
    toast('Erreur', 'Le code est requis.', 'error');
    setButtonLoading(submitBtn, false);
    return;
  }

  const allowedChannels = readChannelCheckboxes('pr-channels-group');
  const partnersRaw = $('#pr-partners').value || '';
  const allowedPartners = partnersRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  let priceBrackets = readBracketRows();
  if (!priceBrackets.length) {
    priceBrackets = DEFAULT_PRICE_BRACKETS;
  }

  const startsAtVal = $('#pr-start').value;
  const endsAtVal = $('#pr-end').value;
  const payload = {
    code,
    isActive: $('#pr-active').checked,
    allowedChannels: allowedChannels.length ? allowedChannels : ['web', 'app', 'wa', 'qr', 'bo'],
    allowedPartners: allowedPartners,
    partnerRefRequired: $('#pr-partnerRequired').checked,
    priceBrackets: priceBrackets,
    startsAt: startsAtVal ? new Date(startsAtVal) : null,
    endsAt: endsAtVal ? new Date(endsAtVal) : null,
    updatedAt: serverTimestamp(),
  };

  try {
    const docId = id || code;
    const ref = doc(db, 'promoRules', docId);
    if (!id) {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
      allPromoRules.unshift({ id: docId, ...payload });
    } else {
      await setDoc(ref, payload, { merge: true });
      const idx = allPromoRules.findIndex(r => r.id === docId);
      if (idx > -1) {
        allPromoRules[idx] = { ...allPromoRules[idx], ...payload };
      } else {
        allPromoRules.unshift({ id: docId, ...payload });
      }
    }
    allPromoRules = allPromoRules.sort((a, b) => (a.code || a.id || '').localeCompare(b.code || b.id || ''));
    track('promo_rule_save', { code: code, isEdit: Boolean(id), hasWa: allowedChannels.includes('wa'), partners: allowedPartners.length });
    toast('Succ?s', id ? 'R?gle mise ? jour' : 'R?gle cr??e', 'success');
    location.hash = '#/promocodes/rules';
    return;
  } catch (err) {
    console.error(err);
    toast('Erreur', 'Enregistrement impossible', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/* ============================ Sorting (click header) ============================ */
document.addEventListener('click', function (e) {
  const th = e.target.closest && e.target.closest('th[data-sort]');
  if (!th) return;
  if (location.hash.indexOf('#/products') !== 0) return;
  const key = th.dataset.sort;
  if (sortBy.key === key) {
    sortBy.dir = sortBy.dir === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.key = key;
    sortBy.dir = 'asc';
  }
  renderProductList();
});

/* ============================ Kickoff ============================ */
if (!location.hash) location.hash = '#/products';
setTimeout(function () {
  const content = $('#content');
  if (content) {
    content.setAttribute('tabindex', '-1');
  }
}, 0);

// Expose MFA functions globally for HTML onclick handlers
window.handleMfaVerification = handleMfaVerification;
window.completeMfaEnrollment = completeMfaEnrollment;

/* ============================ Top Products Manager ============================ */
async function openTopProductsModal() {
  const modal = document.getElementById('top-products-modal');
  const sourceList = document.getElementById('tpm-source-list');
  const targetList = document.getElementById('tpm-target-list');
  const searchInput = document.getElementById('tpm-search-source');
  const saveBtn = document.getElementById('tpm-save');
  const closeBtn = document.getElementById('tpm-close');
  const statusEl = document.getElementById('tpm-status');

  // Helper to load Config
  async function loadTopProductsConfig() {
    try {
      const snap = await getDoc(doc(db, 'config', 'topProducts'));
      if (snap.exists()) {
        const data = snap.data();
        topProductsIds = Array.isArray(data.productIds) ? data.productIds : [];
      } else {
        topProductsIds = [];
      }
    } catch (e) {
      console.error('Error loading top products config', e);
      toast('Erreur', 'Impossible de charger la configuration Top Produits', 'error');
    }
  }

  // Ensure fresh data
  setButtonLoading(saveBtn, true);
  await Promise.all([ensureProductsLoaded(), loadTopProductsConfig()]);
  setButtonLoading(saveBtn, false);

  let currentSourceFilter = '';

  function renderLists() {
    // 1. Filter Source List (All products NOT in topProductsIds)
    const availableProducts = allProducts.filter(p => !topProductsIds.includes(p.id));

    // Apply search filter
    const filteredSource = availableProducts.filter(p => {
      const term = currentSourceFilter.toLowerCase();
      return (p.name || '').toLowerCase().includes(term) || (p.brand || '').toLowerCase().includes(term);
    });

    sourceList.innerHTML = '';
    filteredSource.forEach(p => {
      const item = document.createElement('div');
      item.className = 'tpm-item source';
      item.style.padding = '8px';
      item.style.border = '1px solid var(--color-border)';
      item.style.borderRadius = '4px';
      item.style.marginBottom = '4px';
      item.style.background = 'var(--color-bg)';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'space-between';

      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          ${p.imageUrls && p.imageUrls[0] ? `<img src="${escapeAttr(p.imageUrls[0])}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;">` : '<div style="width:32px;height:32px;background:#eee;border-radius:4px;"></div>'}
          <div>
            <div style="font-weight:500; font-size:13px;">${escapeHtml(p.name)}</div>
            <div style="font-size:11px; color:var(--color-muted);">${escapeHtml(p.brand)}</div>
          </div>
        </div>
        <button class="btn btn-small btn-icon" title="Ajouter">
          <i data-lucide="plus" class="icon"></i>
        </button>
      `;
      item.querySelector('button').onclick = () => {
        topProductsIds.push(p.id);
        renderLists();
      };
      sourceList.appendChild(item);
    });

    // 2. Render Target List (topProductsIds in order)
    targetList.innerHTML = '';
    if (topProductsIds.length === 0) {
      targetList.innerHTML = '<div style="padding:16px; text-align:center; color:var(--color-muted); font-size:13px;">Aucun produit sélectionné.</div>';
    } else {
      topProductsIds.forEach((pid, index) => {
        const p = allProducts.find(x => x.id === pid);
        if (!p) return; // Should not happen if data is consistent

        const item = document.createElement('div');
        item.className = 'tpm-item target';
        item.style.padding = '8px';
        item.style.border = '1px solid var(--color-border)';
        item.style.borderRadius = '4px';
        item.style.marginBottom = '4px';
        item.style.background = 'var(--color-bg)';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';

        item.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="font-weight:bold; color:var(--color-primary); width:20px;">#${index + 1}</div>
            ${p.imageUrls && p.imageUrls[0] ? `<img src="${escapeAttr(p.imageUrls[0])}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;">` : '<div style="width:32px;height:32px;background:#eee;border-radius:4px;"></div>'}
            <div>
              <div style="font-weight:500; font-size:13px;">${escapeHtml(p.name)}</div>
            </div>
          </div>
          <div style="display:flex; gap:4px;">
            <button class="btn btn-small btn-icon" data-action="up" ${index === 0 ? 'disabled' : ''} title="Monter">
              <i data-lucide="chevron-up" class="icon"></i>
            </button>
            <button class="btn btn-small btn-icon" data-action="down" ${index === topProductsIds.length - 1 ? 'disabled' : ''} title="Descendre">
              <i data-lucide="chevron-down" class="icon"></i>
            </button>
            <button class="btn btn-small btn-icon btn-danger" data-action="remove" title="Retirer">
              <i data-lucide="trash-2" class="icon"></i>
            </button>
          </div>
        `;

        item.querySelector('[data-action="up"]').onclick = () => {
          if (index > 0) {
            [topProductsIds[index], topProductsIds[index - 1]] = [topProductsIds[index - 1], topProductsIds[index]];
            renderLists();
          }
        };
        item.querySelector('[data-action="down"]').onclick = () => {
          if (index < topProductsIds.length - 1) {
            [topProductsIds[index], topProductsIds[index + 1]] = [topProductsIds[index + 1], topProductsIds[index]];
            renderLists();
          }
        };
        item.querySelector('[data-action="remove"]').onclick = () => {
          topProductsIds.splice(index, 1);
          renderLists();
        };

        targetList.appendChild(item);
      });
    }
    lucide.createIcons();
  }

  // Event Listeners
  searchInput.oninput = (e) => {
    currentSourceFilter = e.target.value;
    renderLists();
  };

  saveBtn.onclick = async () => {
    setButtonLoading(saveBtn, true);
    try {
      await setDoc(doc(db, 'config', 'topProducts'), {
        productIds: topProductsIds,
        updatedAt: serverTimestamp()
      });
      toast('Succès', 'Liste des Top Produits mise à jour !', 'success');
      closeModal();
    } catch (e) {
      console.error(e);
      toast('Erreur', 'Impossible de sauvegarder la liste.', 'error');
    } finally {
      setButtonLoading(saveBtn, false);
    }
  };

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  closeBtn.onclick = closeModal;

  // Open Modal UI
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Initial Render
  renderLists();
}

/* ============================ Top Products Manager ============================ */
async function openTopProductsModal() {
  const modal = document.getElementById('top-products-modal');
  const sourceList = document.getElementById('tpm-source-list');
  const targetList = document.getElementById('tpm-target-list');
  const searchInput = document.getElementById('tpm-search-source');
  const saveBtn = document.getElementById('tpm-save');
  const closeBtn = document.getElementById('tpm-close');
  const statusEl = document.getElementById('tpm-status');

  // Helper to load Config
  async function loadTopProductsConfig() {
    try {
      const snap = await getDoc(doc(db, 'config', 'topProducts'));
      if (snap.exists()) {
        const data = snap.data();
        topProductsIds = Array.isArray(data.productIds) ? data.productIds : [];
      } else {
        topProductsIds = [];
      }
    } catch (e) {
      console.error('Error loading top products config', e);
      toast('Erreur', 'Impossible de charger la configuration Top Produits', 'error');
    }
  }

  // Ensure fresh data
  setButtonLoading(saveBtn, true);
  await Promise.all([ensureProductsLoaded(), loadTopProductsConfig()]);
  setButtonLoading(saveBtn, false);

  let currentSourceFilter = '';

  function renderLists() {
    // 1. Filter Source List (All products NOT in topProductsIds)
    const availableProducts = allProducts.filter(p => !topProductsIds.includes(p.id));

    // Apply search filter
    const filteredSource = availableProducts.filter(p => {
      const term = currentSourceFilter.toLowerCase();
      return (p.name || '').toLowerCase().includes(term) || (p.brand || '').toLowerCase().includes(term);
    });

    sourceList.innerHTML = '';
    filteredSource.forEach(p => {
      const item = document.createElement('div');
      item.className = 'tpm-item source';
      item.style.padding = '8px';
      item.style.border = '1px solid var(--color-border)';
      item.style.borderRadius = '4px';
      item.style.marginBottom = '4px';
      item.style.background = 'var(--color-bg)';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'space-between';

      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          ${p.imageUrls && p.imageUrls[0] ? `<img src="${escapeAttr(p.imageUrls[0])}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;">` : '<div style="width:32px;height:32px;background:#eee;border-radius:4px;"></div>'}
          <div>
            <div style="font-weight:500; font-size:13px;">${escapeHtml(p.name)}</div>
            <div style="font-size:11px; color:var(--color-muted);">${escapeHtml(p.brand)}</div>
          </div>
        </div>
        <button class="btn btn-small btn-icon" title="Ajouter">
          <i data-lucide="plus" class="icon"></i>
        </button>
      `;
      item.querySelector('button').onclick = () => {
        topProductsIds.push(p.id);
        renderLists();
      };
      sourceList.appendChild(item);
    });

    // 2. Render Target List (topProductsIds in order)
    targetList.innerHTML = '';
    if (topProductsIds.length === 0) {
      targetList.innerHTML = '<div style="padding:16px; text-align:center; color:var(--color-muted); font-size:13px;">Aucun produit sélectionné.</div>';
    } else {
      topProductsIds.forEach((pid, index) => {
        const p = allProducts.find(x => x.id === pid);
        if (!p) return; // Should not happen if data is consistent

        const item = document.createElement('div');
        item.className = 'tpm-item target';
        item.style.padding = '8px';
        item.style.border = '1px solid var(--color-border)';
        item.style.borderRadius = '4px';
        item.style.marginBottom = '4px';
        item.style.background = 'var(--color-bg)';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';

        item.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="font-weight:bold; color:var(--color-primary); width:20px;">#${index + 1}</div>
            ${p.imageUrls && p.imageUrls[0] ? `<img src="${escapeAttr(p.imageUrls[0])}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;">` : '<div style="width:32px;height:32px;background:#eee;border-radius:4px;"></div>'}
            <div>
              <div style="font-weight:500; font-size:13px;">${escapeHtml(p.name)}</div>
            </div>
          </div>
          <div style="display:flex; gap:4px;">
            <button class="btn btn-small btn-icon" data-action="up" ${index === 0 ? 'disabled' : ''} title="Monter">
              <i data-lucide="chevron-up" class="icon"></i>
            </button>
            <button class="btn btn-small btn-icon" data-action="down" ${index === topProductsIds.length - 1 ? 'disabled' : ''} title="Descendre">
              <i data-lucide="chevron-down" class="icon"></i>
            </button>
            <button class="btn btn-small btn-icon btn-danger" data-action="remove" title="Retirer">
              <i data-lucide="trash-2" class="icon"></i>
            </button>
          </div>
        `;

        item.querySelector('[data-action="up"]').onclick = () => {
          if (index > 0) {
            [topProductsIds[index], topProductsIds[index - 1]] = [topProductsIds[index - 1], topProductsIds[index]];
            renderLists();
          }
        };
        item.querySelector('[data-action="down"]').onclick = () => {
          if (index < topProductsIds.length - 1) {
            [topProductsIds[index], topProductsIds[index + 1]] = [topProductsIds[index + 1], topProductsIds[index]];
            renderLists();
          }
        };
        item.querySelector('[data-action="remove"]').onclick = () => {
          topProductsIds.splice(index, 1);
          renderLists();
        };

        targetList.appendChild(item);
      });
    }
    lucide.createIcons();
  }

  // Event Listeners
  searchInput.oninput = (e) => {
    currentSourceFilter = e.target.value;
    renderLists();
  };

  saveBtn.onclick = async () => {
    setButtonLoading(saveBtn, true);
    try {
      await setDoc(doc(db, 'config', 'topProducts'), {
        productIds: topProductsIds,
        updatedAt: serverTimestamp()
      });
      toast('Succès', 'Liste des Top Produits mise à jour !', 'success');
      closeModal();
    } catch (e) {
      console.error(e);
      toast('Erreur', 'Impossible de sauvegarder la liste.', 'error');
    } finally {
      setButtonLoading(saveBtn, false);
    }
  };

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  closeBtn.onclick = closeModal;

  // Open Modal UI
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Initial Render
  renderLists();
}

