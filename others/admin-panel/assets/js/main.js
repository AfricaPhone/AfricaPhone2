// Importe la configuration et les services Firebase depuis le fichier dédié.
import { auth, db, storage } from './firebase-config.js';

// Importe les fonctions spécifiques de Firebase Auth et Firestore.
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
  updateDoc,
  deleteDoc,
  addDoc,
  orderBy,
  query,
  serverTimestamp,
  arrayRemove,
} from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js';

/* ============================ Helpers ============================ */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const fmtXOF = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' });
const fmtDate = d => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(d);

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
let allPromoCodes = []; // AJOUT
let allBrands = [];
let productSearchTerm = '';
let productCategoryFilter = '';
let viewMode = 'table'; // 'table' | 'cards'
let sortBy = { key: 'name', dir: 'asc' };
const PREDEFINED_CATEGORIES = ['smartphone', 'tablette', 'portable a touche', 'accessoire'];
let PREDEFINED_SPECS = [
  'Écran',
  'Processeur',
  'Appareil Photo',
  'Batterie',
  'Connectivité',
  'Dimensions',
  'Poids',
  'Système',
];

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
    // Vérifie si l'utilisateur est un administrateur
    try {
      const tokenResult = await user.getIdTokenResult(true); // Force la mise à jour du jeton
      if (tokenResult.claims.admin) {
        // L'utilisateur est un administrateur
        console.log(`[Admin Panel] Connexion d'un admin réussie. UID: ${user.uid}, Token: ${tokenResult.token}`);
        $login.classList.add('hide');
        $app.classList.remove('hide');
        $app.setAttribute('aria-hidden', 'false');
        initAfterLogin();
      } else {
        // L'utilisateur n'est pas un administrateur, le déconnecte
        await signOut(auth);
        toast('Accès refusé', 'Vos identifiants ne sont pas ceux d\'un administrateur.', 'error');
        // Redirige pour nettoyer l'interface
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

/* ============================ Routing ============================ */
const $navProducts = $('#nav-products'),
  $navBrands = $('#nav-brands'),
  $navMatches = $('#nav-matches'),
  $navSettings = $('#nav-settings'),
  $navPromoCards = $('#nav-promocards'),
  $navPromoCodes = $('#nav-promocodes');
const $toolbarProducts = $('#toolbar-products'),
  $toolbarBrands = $('#toolbar-brands'),
  $toolbarMatches = $('#toolbar-matches'),
  $toolbarPromoCards = $('#toolbar-promocards'),
  $toolbarPromoCodes = $('#toolbar-promocodes');
const $productsContent = $('#products-content'),
  $brandsContent = $('#brands-content'),
  $matchesContent = $('#matches-content'),
  $promoCardsContent = $('#promocards-content'),
  $promoCodesContent = $('#promocodes-content');

window.addEventListener('hashchange', handleRoute);
async function handleRoute() {
  const parts = (location.hash || '#/products').split('/');
  const route = parts[1] || 'products';
  const id = parts[2];

  // Nav active
  $navProducts.classList.toggle('active', route.includes('product'));
  $navBrands.classList.toggle('active', route.includes('brand'));
  $navMatches.classList.toggle('active', route.includes('match'));
  $navPromoCards.classList.toggle('active', route.includes('promocard'));
  $navPromoCodes.classList.toggle('active', route.includes('promocode'));
  $navSettings.classList.toggle('active', route === 'settings');

  // Toolbars affichage
  $toolbarProducts.classList.toggle('hide', !route.includes('product'));
  $toolbarBrands.classList.toggle('hide', !route.includes('brand'));
  $toolbarMatches.classList.toggle('hide', !route.includes('match'));
  $toolbarPromoCards.classList.toggle('hide', !route.includes('promocard'));
  $toolbarPromoCodes.classList.toggle('hide', !route.includes('promocode'));

  // Pages
  $('#page-products').classList.toggle('hide', !route.includes('product'));
  $('#page-brands').classList.toggle('hide', !route.includes('brand'));
  $('#page-matches').classList.toggle('hide', !route.includes('match'));
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
    setCrumb('Éditer produit');
    await renderProductFormPage(id);
  } else if (route === 'brands') {
    setCrumb('Marques');
    await ensureBrandsLoaded();
    renderBrandList();
  } else if (route === 'new-brand') {
    setCrumb('Nouvelle marque');
    renderBrandFormPage();
  } else if (route === 'edit-brand' && id) {
    setCrumb('Éditer marque');
    await renderBrandFormPage(id);
  } else if (route === 'matches') {
    setCrumb('Matchs');
    await ensureMatchesLoaded();
    renderMatchList();
  } else if (route === 'new-match') {
    setCrumb('Nouveau match');
    renderMatchFormPage();
  } else if (route === 'edit-match' && id) {
    setCrumb('Éditer match');
    await renderMatchFormPage(id);
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
    await ensurePromoCodesLoaded();
    renderPromoCodeList();
  } else if (route === 'new-promocode') {
    setCrumb('Nouveau Code Promo');
    renderPromoCodeFormPage();
  } else if (route === 'edit-promocode' && id) {
    setCrumb('Éditer Code Promo');
    await renderPromoCodeFormPage(id);
  } else if (route === 'settings') {
    setCrumb('Param&egrave;tres');
  } else {
    location.hash = '#/products';
  }
}

async function initAfterLogin() {
  lucide.createIcons();
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
  $('#quick-add-promocard').onclick = function () {
    location.hash = '#/new-promocard';
  };
  $('#quick-add-promocode').onclick = function () {
    location.hash = '#/new-promocode';
  };
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
async function ensurePromoCardsLoaded() {
  if (allPromoCards.length > 0) return;
  $promoCardsContent.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(3);
  const q = query(collection(db, 'promoCards'), orderBy('sortOrder', 'asc'));
  const snap = await getDocs(q);
  allPromoCards = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  $('#kpi-promocards').textContent = String(allPromoCards.length);
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
			  Sélection
			</label>
		  </div>
		  <div class="muted">${escapeHtml(p.brand || '—')} • ${escapeHtml(p.category || '—')}</div>
		  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
			<div style="font-weight:900">${typeof p.price === 'number' ? fmtXOF.format(p.price) : '—'}</div>
			<div class="actions">
			  <button class="btn btn-small" data-edit>Éditer</button>
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
		  <th class="sortable ${sortBy.key === 'category' ? 'sorted' : ''}" data-sort="category">Catégorie ${sortIcon('category')}</th>
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
		<td>${escapeHtml(p.brand || '—')}</td>
		<td><span class="chip">${escapeHtml(p.category || '—')}</span></td>
		<td>
		  <input type="number" step="1" min="0" class="input" style="max-width:120px" value="${typeof p.price === 'number' ? p.price : ''}" placeholder="0" data-price-update />
		</td>
		<td>${typeof p.stock === 'number' ? p.stock : '—'}</td>
		<td class="actions">
		  <button class="btn btn-small" data-edit>Éditer</button>
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
    title: 'Supprimer la sélection',
    body:
      'Êtes-vous sûr de vouloir supprimer <strong>' +
      ids.length +
      '</strong> élément(s) ? Cette action est irréversible.',
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
  toast('Suppression terminée', done + ' succès, ' + fail + ' échec(s)', fail ? 'error' : 'success');
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
    toast('Prix mis à jour', fmtXOF.format(val), 'success');
  } catch (e) {
    console.error(e);
    toast('Erreur', 'Impossible de mettre à jour le prix', 'error');
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
    // --- DÉBUT DU PATCH : Rafraîchir le jeton avant l'action privilégiée ---
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
      $('#kpi-promocards').textContent = String(allPromoCards.length);
    } else if (type === 'promoCodes') {
      allPromoCodes = allPromoCodes.filter(c => c.id !== id);
      renderPromoCodeList();
      $('#kpi-promocodes').textContent = String(allPromoCodes.length);
    }
    toast('Supprimé', '', 'success');
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
		<input type="text" class="input spec-key" list="specs-suggestions" placeholder="Caractéristique (ex: Écran)" value="${escapeAttr(spec.key)}">
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
		<img src="${escapeAttr(url)}" alt="Aperçu ${index + 1}">
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
	  <div class="form-title">${id ? 'Éditer' : 'Nouveau'} produit</div>
	  <div class="kpi">${id ? 'ID: ' + escapeHtml(id) : 'Création'}</div>
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
		  <label class="label" for="p-category">Catégorie</label>
		  <select id="p-category" class="select">
			<option value="">— Sélectionner —</option>
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
		<label class="label">Spécifications techniques</label>
		<div id="p-specs-container" class="specs-container">
		</div>
		<button type="button" id="add-spec-btn" class="btn btn-small" style="margin-top:10px;"><i data-lucide="plus" class="icon"></i> Ajouter une spécification</button>
	  </div>
	  
	  <div class="twocol">
		<div class="field">
		  <label class="label" for="p-stock">Stock</label>
		  <input id="p-stock" class="input" type="number" min="0" step="1" value="${typeof p.stock === 'number' ? p.stock : ''}" />
		</div>
		<div class="field">
		  <label class="label" for="p-images">Images</label>
		  <input id="p-images-file" class="input" type="file" accept="image/png,image/jpeg,image/webp" multiple />
		  <div class="hint">Sélectionnez une ou plusieurs images. La première sera l'image principale.</div>
		  <div id="p-images-preview" class="image-preview-grid">
			${existingImagesHtml}
		  </div>
		</div>
	  </div>
	  
	  <div class="form-actions">
		<button type="button" class="btn" data-cancel>Annuler</button>
		<button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Créer le produit'}</button>
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
                <img src="${escapeAttr(url)}" alt="Aperçu ${index + 1}">
                <button type="button" class="remove-btn" data-remove-image-url="${escapeAttr(url)}">
                        <i data-lucide="x" class="icon" style="width:16px;height:16px"></i>
                </button>
        </div>
  `
        )
        .join('');
      btn.closest('.image-preview-item').remove();
      toast('Image supprimée du produit', 'Le fichier reste sur le serveur.', 'success');
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

    toast('Succès', `Produit ${id ? 'mis à jour' : 'créé'} avec succès.`, 'success');
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
                <button class="btn btn-small" data-edit>Éditer</button>
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
        <div class="form-head"><div class="form-title">${id ? 'Éditer' : 'Nouvelle'} marque</div></div>
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
                <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Créer la marque'}</button>
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
      toast('Marque mise à jour', name, 'success');
    } else {
      const refDoc = await addDoc(collection(db, 'brands'), data);
      allBrands.push({ id: refDoc.id, ...data });
      $('#kpi-brands').textContent = String(allBrands.length);
      toast('Marque créée', name, 'success');
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
		<th>Compétition</th>
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
	  <td style="font-weight:800">${escapeHtml(m.teamA || 'Équipe A')} vs ${escapeHtml(m.teamB || 'Équipe B')}</td>
	  <td>${escapeHtml(m.competition || '—')}</td>
	  <td>${date ? fmtDate(date) : '—'}</td>
	  <td class="actions">
		<span class="badge ${finalScore ? 'success' : ''}">${finalScore || 'À jouer'}</span>
		<button class="btn btn-small" data-edit>Éditer</button>
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
	  <div class="form-title">${id ? 'Éditer' : 'Nouveau'} match</div>
	</div>
	<form class="form-main" novalidate>
	  <div class="twocol">
		<div class="field">
		  <label class="label" for="m-competition">Compétition</label>
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
		  <label class="label" for="m-teamA">Équipe A</label>
		  <input id="m-teamA" class="input" type="text" value="${escapeAttr(m.teamA || '')}" required />
		</div>
		<div class="field">
		  <label class="label" for="m-teamB">Équipe B</label>
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
		<button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Créer le match'}</button>
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
      toast('Match mis à jour', teamA + ' vs ' + teamB, 'success');
      location.hash = '#/matches';
    } else {
      const refDoc = await addDoc(collection(db, 'matches'), data);
      allMatches.unshift({ id: refDoc.id, ...data });
      toast('Match créé', teamA + ' vs ' + teamB, 'success');
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
  const term = ($('#search-promocards').value || '').toLowerCase();
  const arr = term ? allPromoCards.filter(c => (c.title || '').toLowerCase().includes(term)) : allPromoCards;

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
  arr.forEach(c => {
    const tr = document.createElement('tr');
    tr.dataset.id = c.id;
    tr.innerHTML = `
			<td>${c.image ? `<img class="img" src="${escapeAttr(c.image)}" />` : ''}</td>
			<td style="font-weight:800">${escapeHtml(c.title || 'Sans titre')}</td>
			<td><span class="chip">${escapeHtml(c.screen || 'Aucune')}</span></td>
			<td><span class="badge">${c.sortOrder || 'N/A'}</span></td>
			<td>
				<label class="toggle">
					<span class="toggle-switch">
						<input type="checkbox" data-active-toggle ${c.isActive ? 'checked' : ''} />
						<span class="toggle-slider"></span>
					</span>
				</label>
			</td>
			<td class="actions">
				<button class="btn btn-small" data-edit>Éditer</button>
				<button class="btn btn-danger btn-small" data-del>Supprimer</button>
			</td>`;
    tr.querySelector('[data-edit]').onclick = () => (location.hash = `#/edit-promocard/${c.id}`);
    tr.querySelector('[data-del]').onclick = () => handleDelete(c.id, c.title, 'promoCards');
    tr.querySelector('[data-active-toggle]').onchange = e => handlePromoCardStatusToggle(c.id, e.target.checked);
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
    toast('Statut mis à jour', `La carte est maintenant ${isActive ? 'active' : 'inactif'}.`, 'success');
  } catch (error) {
    console.error('Erreur de mise à jour du statut:', error);
    toast('Erreur', 'Impossible de changer le statut.', 'error');
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
		<div class="form-head"><div class="form-title">${id ? 'Éditer' : 'Nouvelle'} Carte Promo</div></div>
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
					<label class="label" for="pc-screen">Écran de destination</label>
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
				<button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Créer la carte'}</button>
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
      toast('Carte mise à jour', data.title, 'success');
    } else {
      const refDoc = await addDoc(collection(db, 'promoCards'), data);
      allPromoCards.push({ id: refDoc.id, ...data });
      $('#kpi-promocards').textContent = String(allPromoCards.length);
      toast('Carte créée', data.title, 'success');
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
                <button class="btn btn-small" data-edit>Éditer</button>
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
    toast('Statut mis à jour', `Le code est maintenant ${isActive ? 'actif' : 'inactif'}.`, 'success');
  } catch (error) {
    console.error('Erreur de mise à jour du statut:', error);
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
        <div class="form-head"><div class="form-title">${id ? 'Éditer' : 'Nouveau'} Code Promo</div></div>
        <form class="form-main" novalidate>
            <div class="twocol">
                <div class="field">
                    <label class="label" for="pc-code">Le Code</label>
                    <input id="pc-code" class="input" type="text" value="${escapeAttr(code.code || '')}" required placeholder="ex: BIENVENUE10" />
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
                <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Créer le code'}</button>
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
      toast('Code mis à jour', data.code, 'success');
    } else {
      const finalData = { ...data, createdAt: serverTimestamp() };
      const refDoc = await addDoc(collection(db, 'promoCodes'), finalData);
      allPromoCodes.unshift({ id: refDoc.id, ...finalData });
      $('#kpi-promocodes').textContent = String(allPromoCodes.length);
      toast('Code créé', data.code, 'success');
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