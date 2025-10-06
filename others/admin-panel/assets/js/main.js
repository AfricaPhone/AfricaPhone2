// Importe la configuration et les services Firebase depuis le fichier d�di�.
import { auth, db, storage } from './firebase-config.js';

// Importe les fonctions sp�cifiques de Firebase Auth et Firestore.
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';
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
} from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js';

/* ============================ Helpers ============================ */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const fmtXOF = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' });
const fmtDate = d => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
window.addEventListener('unhandledrejection', event => {
  const error = event && event.reason;
  const message = typeof (error?.message) === 'string' ? error.message : '';
  const code = typeof (error?.code) === 'string' ? error.code : '';
  if (code === 'permission-denied' || /permission/i.test(message)) {
    event.preventDefault();
    console.error('[Admin Panel] Operation blocked by Firestore security rules.', error);
    toast('Permissions insuffisantes', "Votre compte n'a pas acc�s � cette ressource.", 'error');
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
let allPromoCards = [];
let contestPromoCard = null;
let allPromoCodes = []; // AJOUT
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
const PREDEFINED_CATEGORIES = ['smartphone', 'tablette', 'portable a touche', 'accessoire'];
let PREDEFINED_SPECS = [
  '�cran',
  'Processeur',
  'Appareil Photo',
  'Batterie',
  'Connectivit�',
  'Dimensions',
  'Poids',
  'Syst�me',
];

// --- Features / Flags ---
let featuresConfig = { promoCardsEnabled: true };

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
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    toast('Bienvenue', 'Connexion r&eacute;ussie', 'success');
  } catch (err) {
    console.error(err);
    $loginError.textContent = 'Identifiants invalides.';
    $loginError.classList.remove('hide');
    toast('Erreur', 'Impossible de se connecter', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

onAuthStateChanged(auth, async function (user) {
  const logged = !!user;

  if (logged) {
    // V�rifie si l'utilisateur est un administrateur
    try {
      const tokenResult = await user.getIdTokenResult(true); // Force la mise � jour du jeton
      if (tokenResult.claims.admin) {
        // L'utilisateur est un administrateur
        console.log(`[Admin Panel] Connexion d'un admin r�ussie. UID: ${user.uid}, Token: ${tokenResult.token}`);
        $login.classList.add('hide');
        $app.classList.remove('hide');
        $app.setAttribute('aria-hidden', 'false');
        initAfterLogin();
      } else {
        // L'utilisateur n'est pas un administrateur, le d�connecte
        await signOut(auth);
        toast('Acc�s refus�', "Vos identifiants ne sont pas ceux d'un administrateur.", 'error');
        // Redirige pour nettoyer l'interface
        location.reload();
      }
    } catch (err) {
      console.error('Erreur lors de la v�rification des revendications:', err);
      await signOut(auth);
      location.reload();
    }
  } else {
    // L'utilisateur n'est pas connect�
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
  $promoCodesContent = $('#promocodes-content');

window.addEventListener('hashchange', handleRoute);
window.addEventListener('hashchange', async function () {
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
});
async function handleRoute() {
  const parts = (location.hash || '#/products').split('/');
  const route = parts[1] || 'products';
  const id = parts[2];
  const childId = parts[3];

  const isContestRoute = route.includes('contest') || route.includes('candidate');

  // Nav active
  $navProducts.classList.toggle('active', route.includes('product'));
  $navBrands.classList.toggle('active', route.includes('brand'));
  $navMatches.classList.toggle('active', route.includes('match'));
  $navContests.classList.toggle('active', isContestRoute);
  $navPromoCards.classList.toggle('active', route.includes('promocard'));
  $navPromoCodes.classList.toggle('active', route.includes('promocode'));
  $navSettings.classList.toggle('active', route === 'settings');

  // Toolbars affichage
  $toolbarProducts.classList.toggle('hide', !route.includes('product'));
  $toolbarBrands.classList.toggle('hide', !route.includes('brand'));
  $toolbarMatches.classList.toggle('hide', !route.includes('match'));
  $toolbarContests.classList.toggle('hide', !isContestRoute);
  $toolbarPromoCards.classList.toggle('hide', !route.includes('promocard'));
  $toolbarPromoCodes.classList.toggle('hide', !route.includes('promocode'));

  // Pages
  $('#page-products').classList.toggle('hide', !route.includes('product'));
  $('#page-brands').classList.toggle('hide', !route.includes('brand'));
  $('#page-matches').classList.toggle('hide', !route.includes('match'));
  $('#page-contests').classList.toggle('hide', !isContestRoute);
  $('#page-promocards').classList.toggle('hide', !route.includes('promocard'));
  $('#page-promocodes').classList.toggle('hide', !route.includes('promocode'));
  $('#page-settings').classList.toggle('hide', route !== 'settings');

  if (route === 'products') {
    setCrumb('Produits');
    await ensureProductsLoaded();
    renderProductList();
  } else if (route === 'new-product') {
    setCrumb('Nouveau produit');
    renderProductFormPage();
  } else if (route === 'edit-product' && id) {
    setCrumb('�diter produit');
    await renderProductFormPage(id);
  } else if (route === 'brands') {
    setCrumb('Marques');
    await ensureBrandsLoaded();
    renderBrandList();
  } else if (route === 'new-brand') {
    setCrumb('Nouvelle marque');
    renderBrandFormPage();
  } else if (route === 'edit-brand' && id) {
    setCrumb('�diter marque');
    await renderBrandFormPage(id);
  } else if (route === 'matches') {
    setCrumb('Matchs');
    await ensureMatchesLoaded();
    renderMatchList();
  } else if (route === 'new-match') {
    setCrumb('Nouveau match');
    renderMatchFormPage();
  } else if (route === 'edit-match' && id) {
    setCrumb('�diter match');
    await renderMatchFormPage(id);
  } else if (route === 'contests') {
    setCrumb('Concours');
    await ensureContestsLoaded();
    await setSelectedContest(selectedContestId || (allContests[0]?.id || ''), { force: true });
  } else if (route === 'new-contest') {
    setCrumb('Nouveau concours');
    await ensureContestsLoaded();
    renderContestFormPage();
  } else if (route === 'edit-contest' && id) {
    setCrumb('�diter concours');
    await ensureContestsLoaded();
    await renderContestFormPage(id);
  } else if (route === 'new-candidate') {
    await ensureContestsLoaded();
    const contestId = id || selectedContestId || (allContests[0]?.id || '');
    if (!contestId) {
      toast('Info', 'Cr�ez un concours avant d�ajouter un candidat.', 'info');
      location.hash = '#/new-contest';
      return;
    }
    await setSelectedContest(contestId, { force: true, skipRender: true });
    setCrumb('Nouveau candidat');
    await renderCandidateFormPage(contestId);
  } else if (route === 'edit-candidate' && id && childId) {
    await ensureContestsLoaded();
    await setSelectedContest(id, { force: true, skipRender: true });
    setCrumb('�diter candidat');
    await renderCandidateFormPage(id, childId);
  } else if (route === 'promocards') {
    setCrumb('Cartes Promo');
    await ensurePromoCardsLoaded();
    renderPromoCardList();
  } else if (route === 'new-promocard') {
    setCrumb('Nouvelle Carte Promo');
    renderPromoCardFormPage();
  } else if (route === 'edit-promocard' && id) {
    setCrumb('�diter Carte Promo');
    await renderPromoCardFormPage(id);
  } else if (route === 'promocodes') {
    setCrumb('Codes Promo');
    await ensurePromoCodesLoaded();
    renderPromoCodeList();
  } else if (route === 'new-promocode') {
    setCrumb('Nouveau Code Promo');
    renderPromoCodeFormPage();
  } else if (route === 'edit-promocode' && id) {
    setCrumb('�diter Code Promo');
    await renderPromoCodeFormPage(id);
  } else if (route === 'settings') {
    setCrumb('Param�tres');
  } else {
    location.hash = '#/products';
  }
}

async function initAfterLogin() {
  lucide.createIcons();
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
        toast('Paramètre enregistré', next ? 'Cartes promo activées' : 'Cartes promo désactivées', 'success');
      } catch (err) {
        console.error('Settings: unable to update promo cards flag', err);
        input.checked = !next;
        toast('Erreur', "Impossible de mettre à jour le paramètre", 'error');
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
      toast('Info', 'Cr�ez un concours avant d�ajouter un candidat.', 'info');
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
    const targetId = selectedContestId || (allContests[0]?.id || '');
    if (!targetId) {
      toast('Info', 'Cr�ez un concours avant d�ajouter un candidat.', 'info');
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
    const contestQuery = query(
      contestsRef,
      where('status', '==', 'active'),
      orderBy('endDate', 'asc'),
      limit(1)
    );
    const snap = await getDocs(contestQuery);
    if (snap.empty) {
      contestPromoCard = null;
      return;
    }
    const docSnap = snap.docs[0];
    const data = docSnap.data() || {};
    const fallbackImage = 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=1400&auto=format&fit=crop';
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
        typeof data.description === 'string' && data.description
          ? data.description
          : 'Elisez votre candidat favori.',
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
  $promoCodesContent.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(3);
  const q = query(collection(db, 'promoCodes'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  allPromoCodes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  $('#kpi-promocodes').textContent = String(allPromoCodes.length);
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
			  S�lection
			</label>
		  </div>
		  <div class="muted">${escapeHtml(p.brand || '�')} � ${escapeHtml(p.category || '�')}</div>
		  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
			<div style="font-weight:900">${typeof p.price === 'number' ? fmtXOF.format(p.price) : '�'}</div>
			<div class="actions">
			  <button class="btn btn-small" data-edit>�diter</button>
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
		  <th class="sortable ${sortBy.key === 'category' ? 'sorted' : ''}" data-sort="category">Cat�gorie ${sortIcon('category')}</th>
		  <th style="width:140px">Prix</th>
		  <th style="width:90px">Stock</th>
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
		<td>${escapeHtml(p.brand || '�')}</td>
		<td><span class="chip">${escapeHtml(p.category || '�')}</span></td>
		<td>
		  <input type="number" step="1" min="0" class="input" style="max-width:120px" value="${typeof p.price === 'number' ? p.price : ''}" placeholder="0" data-price-update />
		</td>
		<td>${typeof p.stock === 'number' ? p.stock : '�'}</td>
		<td class="actions">
		  <button class="btn btn-small" data-edit>�diter</button>
		  <button class="btn btn-danger btn-small" data-del>Supprimer</button>
		</td>`;
      const sel = tr.querySelector('[data-select]');
      const inp = tr.querySelector('[data-price-update]');
      const btnEdit = tr.querySelector('[data-edit]');
      const btnDel = tr.querySelector('[data-del]');
      sel.addEventListener('change', updateBulkState);
      inp.addEventListener('change', function () {
        handlePriceUpdate(p.id, inp);
      });
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
    title: 'Supprimer la s�lection',
    body:
      '�tes-vous s�r de vouloir supprimer <strong>' +
      ids.length +
      '</strong> �l�ment(s) ? Cette action est irr�versible.',
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
  toast('Suppression termin�e', done + ' succ�s, ' + fail + ' �chec(s)', fail ? 'error' : 'success');
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
    toast('Prix mis � jour', fmtXOF.format(val), 'success');
  } catch (e) {
    console.error(e);
    toast('Erreur', 'Impossible de mettre � jour le prix', 'error');
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
    // --- D�BUT DU PATCH : Rafra�chir le jeton avant l'action privil�gi�e ---
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
    }
    toast('Supprim�', '', 'success');
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
		<input type="text" class="input spec-key" list="specs-suggestions" placeholder="Caract�ristique (ex: �cran)" value="${escapeAttr(spec.key)}">
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
		<img src="${escapeAttr(url)}" alt="Aper�u ${index + 1}">
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
	  <div class="form-title">${id ? '�diter' : 'Nouveau'} produit</div>
	  <div class="kpi">${id ? 'ID: ' + escapeHtml(id) : 'Cr�ation'}</div>
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
		  <label class="label" for="p-category">Cat�gorie</label>
		  <select id="p-category" class="select">
			<option value="">� S�lectionner �</option>
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
		<label class="label">Sp�cifications techniques</label>
		<div id="p-specs-container" class="specs-container">
		</div>
		<button type="button" id="add-spec-btn" class="btn btn-small" style="margin-top:10px;"><i data-lucide="plus" class="icon"></i> Ajouter une sp�cification</button>
	  </div>
	  
	  <div class="twocol">
		<div class="field">
		  <label class="label" for="p-stock">Stock</label>
		  <input id="p-stock" class="input" type="number" min="0" step="1" value="${typeof p.stock === 'number' ? p.stock : ''}" />
		</div>
		<div class="field">
		  <label class="label" for="p-images">Images</label>
		  <input id="p-images-file" class="input" type="file" accept="image/png,image/jpeg,image/webp" multiple />
		  <div class="hint">S�lectionnez une ou plusieurs images. La premi�re sera l'image principale.</div>
		  <div id="p-images-preview" class="image-preview-grid">
			${existingImagesHtml}
		  </div>
		</div>
	  </div>
	  
	  <div class="form-actions">
		<button type="button" class="btn" data-cancel>Annuler</button>
		<button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Cr�er le produit'}</button>
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
                <img src="${escapeAttr(url)}" alt="Aper�u ${index + 1}">
                <button type="button" class="remove-btn" data-remove-image-url="${escapeAttr(url)}">
                        <i data-lucide="x" class="icon" style="width:16px;height:16px"></i>
                </button>
        </div>
  `
        )
        .join('');
      btn.closest('.image-preview-item').remove();
      toast('Image supprim�e du produit', 'Le fichier reste sur le serveur.', 'success');
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

    toast('Succ�s', `Produit ${id ? 'mis � jour' : 'cr��'} avec succ�s.`, 'success');
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
  ended: 'Termin�',
};

const formatContestStatus = status => CONTEST_STATUS_LABELS[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : '');

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
    return '�';
  }
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) {
    return '�';
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
    .map(contest => `<option value="${escapeAttr(contest.id)}"${contest.id === currentValue ? ' selected' : ''}>${escapeHtml(contest.title || contest.id)}</option>`)
    .join('');
  select.innerHTML = allContests.length
    ? `<option value="">S�lectionner un concours</option>${options}`
    : '<option value="">Aucun concours disponible</option>';
  if (currentValue && select.value !== currentValue) {
    select.value = currentValue;
  }
};

const updateKpiContests = () => {
  const el = $('#kpi-contests');
  if (el) {
    el.textContent = allContests.length ? String(allContests.length) : '�';
  }
};

const updateKpiCandidates = count => {
  const el = $('#kpi-candidates');
  if (el) {
    el.textContent = typeof count === 'number' && count >= 0 ? String(count) : '�';
  }
};

const normalizeSearch = value => value ? value.trim().toLowerCase() : '';

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
    const rawEndDate = data.endDate && typeof data.endDate === 'object' && typeof data.endDate.toDate === 'function' ? data.endDate.toDate() : data.endDate ? new Date(data.endDate) : null;
    return {
      id: docSnap.id,
      title: typeof data.title === 'string' ? data.title : 'Concours',
      description: typeof data.description === 'string' ? data.description : '',
      status: typeof data.status === 'string' ? data.status : 'draft',
      endDate: rawEndDate,
      totalParticipants: Number.isFinite(data.totalParticipants) ? data.totalParticipants : Number.isFinite(data.totalCandidates) ? data.totalCandidates : 0,
      totalVotes: Number.isFinite(data.totalVotes) ? data.totalVotes : Number.isFinite(data.voteCount) ? data.voteCount : 0,
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
        <button class="btn btn-primary" type="button" data-create-first-contest><i data-lucide="plus" class="icon"></i> Cr�er un concours</button>
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
    $contestsContent.innerHTML = `<div class="empty-state"><p>S�lectionnez un concours pour voir ses candidats.</p></div>`;
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
    .map((candidate, index) => `
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
            <button class="btn btn-small" type="button" data-edit-candidate="${escapeAttr(candidate.id)}"><i data-lucide="edit-3" class="icon"></i> �diter</button>
            <button class="btn btn-danger btn-small" type="button" data-delete-candidate="${escapeAttr(candidate.id)}"><i data-lucide="trash-2" class="icon"></i></button>
          </td>
        </tr>`)
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
    : `<div class="empty-state"><p>${searchTerm ? 'Aucun candidat ne correspond � cette recherche.' : 'Aucun candidat n�est encore enregistr� pour ce concours.'}</p></div>`;

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
            <button class="btn btn-outline btn-small" type="button" data-edit-current-contest><i data-lucide="edit-3" class="icon"></i> �diter</button>
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
    contestCandidates.set(contestId, list.filter(candidate => candidate.id !== candidateId));
    toast('Candidat supprim�', label, 'success');
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
      <div class="form-title">${isEdition ? '�diter' : 'Nouveau'} concours</div>
      ${isEdition ? `<div class="kpi">ID : ${escapeHtml(contest.id)}</div>` : ''}
    </div>
    <form class="form-main" novalidate>
      <div class="field">
        <label class="label" for="contest-title">Titre du concours</label>
        <input id="contest-title" class="input" type="text" value="${escapeAttr(defaults.title)}" required />
      </div>
      <div class="field">
        <label class="label" for="contest-description">Description</label>
        <textarea id="contest-description" class="textarea" rows="4" placeholder="D�tails du concours">${escapeHtml(defaults.description)}</textarea>
      </div>
      <div class="twocol">
        <div class="field">
          <label class="label" for="contest-status">Statut</label>
          <select id="contest-status" class="select">
            <option value="draft" ${defaults.status === 'draft' ? 'selected' : ''}>Brouillon</option>
            <option value="active" ${defaults.status === 'active' ? 'selected' : ''}>Actif</option>
            <option value="ended" ${defaults.status === 'ended' ? 'selected' : ''}>Termin�</option>
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
        <button type="submit" class="btn btn-primary">${isEdition ? 'Enregistrer' : 'Cr�er le concours'}</button>
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
      toast('Concours mis � jour', title, 'success');
      await ensureContestsLoaded(true);
      await setSelectedContest(contestId, { force: true });
    } else {
      const createdPayload = { ...payload, createdAt: serverTimestamp(), totalVotes: payload.totalVotes || 0, totalParticipants: payload.totalParticipants || 0 };
      const ref = await addDoc(collection(db, 'contests'), createdPayload);
      await updateDoc(ref, { id: ref.id });
      toast('Concours cr��', title, 'success');
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
    $contestsContent.innerHTML = '<div class="empty-state"><p>S�lectionnez un concours avant d�ajouter un candidat.</p></div>';
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
      <div class="form-title">${candidateId ? '�diter' : 'Nouveau'} candidat</div>
      <div class="muted">Concours : ${escapeHtml((getSelectedContest() || {}).title || contestId)}</div>
    </div>
    <form class="form-main" novalidate>
      <div class="field">
        <label class="label" for="candidate-name">Nom</label>
        <input id="candidate-name" class="input" type="text" value="${escapeAttr(defaults.name)}" required />
      </div>
      <div class="field">
        <label class="label" for="candidate-media">M�dia / Organisation</label>
        <input id="candidate-media" class="input" type="text" value="${escapeAttr(defaults.media)}" placeholder="Cha�ne, journal..." />
      </div>
      <div class="field">
        <label class="label" for="candidate-photo">Photo (URL)</label>
        <input id="candidate-photo" class="input" type="url" value="${escapeAttr(defaults.photoUrl)}" placeholder="https://" />
        <div class="hint">Utilisez une URL publique ou importez l'image depuis un stockage d�j� autoris�.</div>
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
      toast('Candidat mis � jour', name, 'success');
    } else {
      const ref = await addDoc(collection(db, 'contests', contestId, 'candidates'), {
        ...base,
        contestId,
        createdAt: serverTimestamp(),
      });
      await updateDoc(ref, { id: ref.id });
      const list = contestCandidates.get(contestId) || [];
      contestCandidates.set(contestId, [{ id: ref.id, contestId, ...base }, ...list]);
      toast('Candidat ajout�', name, 'success');
    }

    await setSelectedContest(contestId, { force: true });
    location.hash = '#/contests';
  } catch (error) {
    console.error(error);
    toast('Erreur', 'Impossible d�enregistrer le candidat.', 'error');
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
                <button class="btn btn-small" data-edit>�diter</button>
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
        <div class="form-head"><div class="form-title">${id ? '�diter' : 'Nouvelle'} marque</div></div>
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
                <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Cr�er la marque'}</button>
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
      toast('Marque mise � jour', name, 'success');
    } else {
      const refDoc = await addDoc(collection(db, 'brands'), data);
      allBrands.push({ id: refDoc.id, ...data });
      $('#kpi-brands').textContent = String(allBrands.length);
      toast('Marque cr��e', name, 'success');
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
		<th>Comp�tition</th>
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
	  <td style="font-weight:800">${escapeHtml(m.teamA || '�quipe A')} vs ${escapeHtml(m.teamB || '�quipe B')}</td>
	  <td>${escapeHtml(m.competition || '�')}</td>
	  <td>${date ? fmtDate(date) : '�'}</td>
	  <td class="actions">
		<span class="badge ${finalScore ? 'success' : ''}">${finalScore || '� jouer'}</span>
		<button class="btn btn-small" data-edit>�diter</button>
		<button class="btn btn-danger btn-small" data-del>Supprimer</button>
	  </td>`;
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
	  <div class="form-title">${id ? '�diter' : 'Nouveau'} match</div>
	</div>
	<form class="form-main" novalidate>
	  <div class="twocol">
		<div class="field">
		  <label class="label" for="m-competition">Comp�tition</label>
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
		  <label class="label" for="m-teamA">�quipe A</label>
		  <input id="m-teamA" class="input" type="text" value="${escapeAttr(m.teamA || '')}" required />
		</div>
		<div class="field">
		  <label class="label" for="m-teamB">�quipe B</label>
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
		<button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Cr�er le match'}</button>
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
      toast('Match mis � jour', teamA + ' vs ' + teamB, 'success');
      location.hash = '#/matches';
    } else {
      const refDoc = await addDoc(collection(db, 'matches'), data);
      allMatches.unshift({ id: refDoc.id, ...data });
      toast('Match cr��', teamA + ' vs ' + teamB, 'success');
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

    ? cards.filter(card => (`${card.title || ''} ${card.subtitle || ''}`).toLowerCase().includes(term))

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
      ? (card.sortOrder < 0 ? 'Auto' : card.sortOrder ?? 'N/A')
      : card.sortOrder ?? 'N/A';

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
    toast('Statut mis � jour', `La carte est maintenant ${isActive ? 'active' : 'inactif'}.`, 'success');
  } catch (error) {
    console.error('Erreur de mise � jour du statut:', error);
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
		<div class="form-head"><div class="form-title">${id ? '�diter' : 'Nouvelle'} Carte Promo</div></div>
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
					<label class="label" for="pc-screen">�cran de destination</label>
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
				<button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Cr�er la carte'}</button>
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
      toast('Carte mise � jour', data.title, 'success');
    } else {
      const refDoc = await addDoc(collection(db, 'promoCards'), data);
      allPromoCards.push({ id: refDoc.id, ...data });
      updatePromoCardsKpi();
      toast('Carte cr��e', data.title, 'success');
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

/* ============================ Promo Codes UI (AJOUT) ============================ */
$('#add-promocode').addEventListener('click', () => (location.hash = '#/new-promocode'));
$('#search-promocodes').addEventListener('input', () => renderPromoCodeList());

function renderPromoCodeList() {
  const term = ($('#search-promocodes').value || '').toLowerCase();
  const arr = term ? allPromoCodes.filter(c => (c.code || '').toLowerCase().includes(term)) : allPromoCodes;

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
                <th>Statut</th>
                <th style="width:180px;text-align:right">Actions</th>
            </tr>
        </thead>
        <tbody id="tbody-promocodes"></tbody>`;
  const tb = table.querySelector('#tbody-promocodes');
  arr.forEach(c => {
    const tr = document.createElement('tr');
    tr.dataset.id = c.id;
    const valText = c.type === 'percentage' ? `${c.value}%` : fmtXOF.format(c.value);
    tr.innerHTML = `
            <td style="font-weight:800"><span class="chip">${escapeHtml(c.code || 'Sans code')}</span></td>
            <td>${escapeHtml(c.type === 'percentage' ? 'Pourcentage' : 'Montant Fixe')}</td>
            <td><span class="badge success">${valText}</span></td>
            <td>
                <label class="toggle">
                    <span class="toggle-switch">
                        <input type="checkbox" data-active-toggle ${c.isActive ? 'checked' : ''} />
                        <span class="toggle-slider"></span>
                    </span>
                </label>
            </td>
            <td class="actions">
                <button class="btn btn-small" data-edit>�diter</button>
                <button class="btn btn-danger btn-small" data-del>Supprimer</button>
            </td>`;
    tr.querySelector('[data-edit]').onclick = () => (location.hash = `#/edit-promocode/${c.id}`);
    tr.querySelector('[data-del]').onclick = () => handleDelete(c.id, c.code, 'promoCodes');
    tr.querySelector('[data-active-toggle]').onchange = e => handlePromoCodeStatusToggle(c.id, e.target.checked);
    tb.appendChild(tr);
  });
  $promoCodesContent.innerHTML = '';
  $promoCodesContent.appendChild(table);
  lucide.createIcons();
}

async function handlePromoCodeStatusToggle(id, isActive) {
  try {
    await updateDoc(doc(db, 'promoCodes', id), { isActive: isActive });
    const code = allPromoCodes.find(c => c.id === id);
    if (code) code.isActive = isActive;
    toast('Statut mis � jour', `Le code est maintenant ${isActive ? 'actif' : 'inactif'}.`, 'success');
  } catch (error) {
    console.error('Erreur de mise � jour du statut:', error);
    toast('Erreur', 'Impossible de changer le statut.', 'error');
    renderPromoCodeList();
  }
}

async function renderPromoCodeFormPage(id) {
  let code = {};
  if (id) {
    code =
      allPromoCodes.find(c => c.id === id) ||
      (await getDoc(doc(db, 'promoCodes', id)).then(s => (s.exists() ? { id: s.id, ...s.data() } : null)));
    if (!code) {
      $promoCodesContent.innerHTML = '<div class="center" style="padding:32px">Code introuvable.</div>';
      return;
    }
  }
  const wrap = document.createElement('div');
  wrap.className = 'form-wrap';
  wrap.innerHTML = `
        <div class="form-head"><div class="form-title">${id ? '�diter' : 'Nouveau'} Code Promo</div></div>
        <form class="form-main" novalidate>
            <div class="twocol">
                <div class="field">
                    <label class="label" for="pc-code">Le Code</label>
                    <input id="pc-code" class="input" type="text" value="${escapeAttr(code.code || '')}" required placeholder="ex: BIENVENUE10" />
                </div>
                <div class="field">
                    <label class="label" for="pc-type">Type de r�duction</label>
                    <select id="pc-type" class="select">
                        <option value="percentage" ${code.type === 'percentage' ? 'selected' : ''}>Pourcentage (%)</option>
                        <option value="fixed" ${code.type === 'fixed' ? 'selected' : ''}>Montant Fixe (FCFA)</option>
                    </select>
                </div>
            </div>
            <div class="field">
                <label class="label" for="pc-value">Valeur de la r�duction</label>
                <input id="pc-value" class="input" type="number" min="0" step="1" value="${code.value || ''}" required />
                <div class="hint">Ex: "10" pour 10% ou "5000" pour 5000 FCFA.</div>
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
            <div class="form-actions">
                <button type="button" class="btn" data-cancel>Annuler</button>
                <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Cr�er le code'}</button>
            </div>
        </form>`;
  $promoCodesContent.innerHTML = '';
  $promoCodesContent.appendChild(wrap);
  wrap.querySelector('[data-cancel]').onclick = () => (location.hash = '#/promocodes');
  wrap.querySelector('form').onsubmit = e => handlePromoCodeFormSubmit(e, id);
}

async function handlePromoCodeFormSubmit(e, id) {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  const code = $('#pc-code').value.trim().toUpperCase();
  const value = parseFloat($('#pc-value').value);

  if (!code || isNaN(value)) {
    toast('Erreur', 'Le code et la valeur sont requis.', 'error');
    setButtonLoading(submitBtn, false);
    return;
  }

  const data = {
    code: code,
    type: $('#pc-type').value,
    value: value,
    isActive: $('#pc-isActive').checked,
  };

  try {
    if (id) {
      await updateDoc(doc(db, 'promoCodes', id), data);
      const i = allPromoCodes.findIndex(c => c.id === id);
      if (i > -1) allPromoCodes[i] = { id, ...data };
      toast('Code mis � jour', data.code, 'success');
    } else {
      const finalData = { ...data, createdAt: serverTimestamp() };
      const refDoc = await addDoc(collection(db, 'promoCodes'), finalData);
      allPromoCodes.unshift({ id: refDoc.id, ...finalData });
      $('#kpi-promocodes').textContent = String(allPromoCodes.length);
      toast('Code cr��', data.code, 'success');
    }
    location.hash = '#/promocodes';
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





















