// others/admin-panel/assets/js/main.js
// Importe la configuration et les services Firebase depuis le fichier dédié.
import { db } from '../../firebase-config.js';

// Importe les fonctions spécifiques de Firebase Firestore.
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Importe les fonctions UI depuis le nouveau module
import { $, $$, toast } from './ui.js';
// Importe le module d'authentification
import { initAuth } from './auth.js';
// Importe le module de routage
import { initRouter } from './router.js';
// Importe les fonctions de la vue des produits
import { initProductsView, renderProductList, renderProductFormPage } from './views/productsView.js';


/* ============================ State ============================ */
let allMatches = [];
let allPromoCards = [];

/* ============================ Theme ============================ */
const themePrefEl = $('#theme-pref');
function applyTheme(pref){
  const root = document.documentElement;
  if(pref==='light'){ root.setAttribute('data-theme','light'); if(themePrefEl){ themePrefEl.textContent='Clair'; } }
  else if(pref==='dark'){ root.setAttribute('data-theme','dark'); if(themePrefEl){ themePrefEl.textContent='Sombre'; } }
  else{
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', dark?'dark':'auto'); if(themePrefEl){ themePrefEl.textContent='Auto'; }
  }
  localStorage.setItem('theme-pref', pref);
}
applyTheme(localStorage.getItem('theme-pref') || 'auto');
$('#toggle-theme').addEventListener('click', function(){
  const now = localStorage.getItem('theme-pref') || 'auto';
  const next = now==='light' ? 'dark' : (now==='dark' ? 'auto' : 'light');
  applyTheme(next);
  toast('Th&egrave;me', 'Pr&eacute;f&eacute;rence: ' + (next==='light'?'Clair':(next==='dark'?'Sombre':'Auto')), 'info');
});
$('#drawer-theme')?.addEventListener('click', function(){ $('#toggle-theme').click(); });
$$('#page-settings [data-theme-choice]').forEach(function(btn){
  btn.addEventListener('click', function(){ applyTheme(btn.dataset.themeChoice); });
});

/* ============================ App Initialization ============================ */
async function initAfterLogin(){
  lucide.createIcons();
  
  // Raccourcis
  $('#quick-add-product').onclick = function(){ location.hash = '#/new-product'; };
  $('#quick-add-match').onclick = function(){ location.hash = '#/new-match'; };
  $('#quick-add-promocard').onclick = function(){ location.hash = '#/new-promocard'; };

  // Recherche globale
  const gSearch = $('#global-search');
  document.addEventListener('keydown', function(e){
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const isInput = /input|textarea|select/i.test(tag);
    if(!isInput && (e.key==='/' || (e.key && e.key.toLowerCase()==='k' && (e.metaKey||e.ctrlKey)))){
      e.preventDefault(); gSearch.focus();
    }
  });

  // Initialise les écouteurs de la vue des produits
  initProductsView();

  // Initialise le routeur en lui passant les fonctions de rendu des pages
  initRouter({
    renderProductListPage: renderProductList,
    renderProductFormPage,
    renderMatchListPage: async () => { await ensureMatchesLoaded(); renderMatchList(); },
    renderMatchFormPage,
    renderPromoCardListPage: async () => { await ensurePromoCardsLoaded(); renderPromoCardList(); },
    renderPromoCardFormPage,
  });
}

/* ============================ Data Fetch (Matches & PromoCards) ============================ */
const $matchesContent = $('#matches-content');
const $promoCardsContent = $('#promocards-content');

async function ensureMatchesLoaded(){
  if(allMatches.length) return;
  $matchesContent.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(6);
  const q = query(collection(db,'matches'), orderBy('startTime','desc'));
  const snap = await getDocs(q);
  allMatches = snap.docs.map(function(d){ return {id:d.id, ...d.data()}; });
  $('#kpi-matches').textContent = String(allMatches.length);
}
async function ensurePromoCardsLoaded() {
    if(allPromoCards.length > 0) return;
    $promoCardsContent.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(3);
    const q = query(collection(db, 'promoCards'), orderBy('sortOrder', 'asc'));
    const snap = await getDocs(q);
    allPromoCards = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    $('#kpi-promocards').textContent = String(allPromoCards.length);
}


/* ============================ Matches UI ============================ */
$('#add-match').addEventListener('click', function(){ location.hash = '#/new-match'; });
$('#search-matches').addEventListener('input', function(){ renderMatchList(); });

function renderMatchList(){
  const term = ($('#search-matches').value||'').toLowerCase();
  const arr = term ? allMatches.filter(function(m){
    return (m.teamA||'').toLowerCase().indexOf(term)!==-1
      || (m.teamB||'').toLowerCase().indexOf(term)!==-1
      || (m.competition||'').toLowerCase().indexOf(term)!==-1;
  }) : allMatches.slice();

  if(!arr.length){
    $matchesContent.innerHTML = '<div class="center" style="padding:32px">Aucun match.</div>'; return;
  }
  const table = document.createElement('table'); table.className='table';
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

  arr.forEach(function(m){
    const date = m.startTime && m.startTime.toDate ? m.startTime.toDate() : (m.startTime ? new Date(m.startTime) : null);
    const finalScore = (typeof m.finalScoreA==='number' && typeof m.finalScoreB==='number') ? (m.finalScoreA + ' - ' + m.finalScoreB) : '';
    const tr = document.createElement('tr'); tr.dataset.id = m.id;
    tr.innerHTML = `
      <td style="font-weight:800">${escapeHtml(m.teamA || 'Équipe A')} vs ${escapeHtml(m.teamB || 'Équipe B')}</td>
      <td>${escapeHtml(m.competition || '—')}</td>
      <td>${date ? fmtDate(date) : '—'}</td>
      <td class="actions">
        <span class="badge ${finalScore? 'success':''}">${finalScore || 'À jouer'}</span>
        <button class="btn btn-small" data-edit>Éditer</button>
        <button class="btn btn-danger btn-small" data-del>Supprimer</button>
      </td>`;
    tr.querySelector('[data-edit]').addEventListener('click', function(){ location.hash = '#/edit-match/'+m.id; });
    tr.querySelector('[data-del]').addEventListener('click', function(){ handleDelete(m.id, (m.teamA||'')+' vs '+(m.teamB||''), 'matches'); });
    tb.appendChild(tr);
  });
  $matchesContent.innerHTML=''; $matchesContent.appendChild(table);
}

async function renderMatchFormPage(id){
  let m = {};
  if(id){
    m = allMatches.find(function(x){return x.id===id;}) || (await getDoc(doc(db,'matches',id)).then(function(s){return s.exists()?{id:s.id,...s.data()}:null;}));
    if(!m){ $matchesContent.innerHTML = '<div class="center" style="padding:32px">Match introuvable.</div>'; return; }
  }
  const start = m.startTime && m.startTime.toDate ? m.startTime.toDate() : (m.startTime ? new Date(m.startTime) : null);
  const startVal = start ? new Date(start.getTime()-start.getTimezoneOffset()*60000).toISOString().slice(0,16) : '';

  const wrap = document.createElement('div'); wrap.className='form-wrap';
  wrap.innerHTML = `
    <div class="form-head">
      <div class="form-title">${id?'Éditer':'Nouveau'} match</div>
    </div>
    <form class="form-main" novalidate>
      <div class="twocol">
        <div class="field">
          <label class="label" for="m-competition">Compétition</label>
          <input id="m-competition" class="input" type="text" value="${escapeAttr(m.competition||'')}" />
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
          <input id="m-teamA" class="input" type="text" value="${escapeAttr(m.teamA||'')}" required />
        </div>
        <div class="field">
          <label class="label" for="m-teamB">Équipe B</label>
          <input id="m-teamB" class="input" type="text" value="${escapeAttr(m.teamB||'')}" required />
        </div>
      </div>
      <div class="twocol">
        <div class="field">
          <label class="label" for="m-logoA">Logo &eacute;quipe A (URL)</label>
          <input id="m-logoA" class="input" type="url" value="${escapeAttr(m.teamALogo||'')}" />
        </div>
        <div class="field">
          <label class="label" for="m-logoB">Logo &eacute;quipe B (URL)</label>
          <input id="m-logoB" class="input" type="url" value="${escapeAttr(m.teamBLogo||'')}" />
        </div>
      </div>
      <div class="twocol">
        <div class="field">
          <label class="label" for="m-scoreA">Score A (final)</label>
          <input id="m-scoreA" class="input" type="number" min="0" step="1" value="${typeof m.finalScoreA==='number'?m.finalScoreA:''}" />
        </div>
        <div class="field">
          <label class="label" for="m-scoreB">Score B (final)</label>
          <input id="m-scoreB" class="input" type="number" min="0" step="1" value="${typeof m.finalScoreB==='number'?m.finalScoreB:''}" />
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn" data-cancel>Annuler</button>
        <button type="submit" class="btn btn-primary">${id?'Enregistrer':'Créer le match'}</button>
      </div>
    </form>`;
  $matchesContent.innerHTML=''; $matchesContent.appendChild(wrap);
  wrap.querySelector('[data-cancel]').addEventListener('click', function(){ if(history.length>1){ history.back(); } else { location.hash='#/matches'; } });
  wrap.querySelector('form').addEventListener('submit', function(e){ handleMatchFormSubmit(e, id); });
}

async function handleMatchFormSubmit(e, id){
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(submitBtn, true);

  const competition = $('#m-competition').value.trim();
  const teamA = $('#m-teamA').value.trim();
  const teamB = $('#m-teamB').value.trim();
  const teamALogo = $('#m-logoA').value.trim() || null;
  const teamBLogo = $('#m-logoB').value.trim() || null;
  const scoreA = $('#m-scoreA').value==='' ? null : parseInt($('#m-scoreA').value,10);
  const scoreB = $('#m-scoreB').value==='' ? null : parseInt($('#m-scoreB').value,10);
  const startVal = $('#m-startTime').value;
  $('#err-mstart').classList.add('hide');
  if(!startVal){ $('#err-mstart').textContent='La date/heure est requise.'; $('#err-mstart').classList.remove('hide'); setButtonLoading(submitBtn, false); return; }

  try{
    const data = {
      competition, teamA, teamB, teamALogo, teamBLogo,
      finalScoreA: Number.isNaN(scoreA)? null : scoreA,
      finalScoreB: Number.isNaN(scoreB)? null : scoreB,
      startTime: new Date(startVal)
    };
    if(id){
      await updateDoc(doc(db,'matches',id), data);
      const m = allMatches.find(function(x){return x.id===id;}); if(m) Object.assign(m, data);
      toast('Match mis à jour', teamA+' vs '+teamB, 'success'); location.hash = '#/matches';
    }else{
      const refDoc = await addDoc(collection(db,'matches'), data);
      allMatches.unshift({id:refDoc.id, ...data});
      toast('Match créé', teamA+' vs '+teamB, 'success'); location.hash = '#/matches';
      $('#kpi-matches').textContent = String(allMatches.length);
    }
  }catch(err){
    console.error(err);
    toast('Erreur','Enregistrement impossible','error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/* ============================ Promo Cards UI ============================ */
$('#add-promocard').addEventListener('click', () => location.hash = '#/new-promocard');
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
                        <input type="checkbox" data-active-toggle ${c.isActive ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </span>
                </label>
            </td>
            <td class="actions">
                <button class="btn btn-small" data-edit>Éditer</button>
                <button class="btn btn-danger btn-small" data-del>Supprimer</button>
            </td>`;
        tr.querySelector('[data-edit]').onclick = () => location.hash = `#/edit-promocard/${c.id}`;
        tr.querySelector('[data-del]').onclick = () => handleDelete(c.id, c.title, 'promoCards');
        tr.querySelector('[data-active-toggle]').onchange = (e) => handlePromoCardStatusToggle(c.id, e.target.checked);
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
        toast('Statut mis à jour', `La carte est maintenant ${isActive ? 'active' : 'inactive'}.`, 'success');
    } catch (error) {
        console.error("Erreur de mise à jour du statut:", error);
        toast('Erreur', 'Impossible de changer le statut.', 'error');
        renderPromoCardList(); // Re-render to revert the toggle on error
    }
}

async function renderPromoCardFormPage(id) {
    let card = {};
    if (id) {
        card = allPromoCards.find(c => c.id === id) || (await getDoc(doc(db, 'promoCards', id)).then(s => s.exists() ? { id: s.id, ...s.data() } : null));
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
    wrap.querySelector('[data-cancel]').onclick = () => location.hash = '#/promocards';
    wrap.querySelector('form').onsubmit = e => handlePromoCardFormSubmit(e, id);
}

async function handlePromoCardFormSubmit(e, id) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);

    const data = {
        title: $('#pc-title').value.trim(),
        subtitle: $('#pc-subtitle').value.trim(),
        cta: $('#pc-cta').value.trim(),
        screen: $('#pc-screen').value.trim(),
        image: $('#pc-image').value.trim(),
        sortOrder: parseInt($('#pc-sortOrder').value, 10) || 0,
        isActive: $('#pc-isActive').checked,
    };
    if (!data.title || !data.sortOrder) {
        toast('Erreur', 'Le titre et l\'ordre sont requis.', 'error');
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

async function handleDelete(id, name, type) {
    const ok = await openModal({
        title: 'Supprimer',
        body: `Supprimer "<strong>${escapeHtml(name || id)}</strong>" ?`,
        okText: 'Supprimer',
        cancelText: 'Annuler',
        danger: true
    });
    if (!ok) return;

    try {
        if (type === 'matches') {
            await deleteDoc(doc(db, 'matches', id));
            allMatches = allMatches.filter(m => m.id !== id);
            renderMatchList();
            $('#kpi-matches').textContent = String(allMatches.length);
        } else if (type === 'promoCards') {
            await deleteDoc(doc(db, 'promoCards', id));
            allPromoCards = allPromoCards.filter(c => c.id !== id);
            renderPromoCardList();
            $('#kpi-promocards').textContent = String(allPromoCards.length);
        }
        toast('Supprimé', '', 'success');
    } catch (e) {
        console.error(e);
        toast('Erreur', 'Suppression impossible', 'error');
    }
}


/* ============================ App Kickoff ============================ */
if(!location.hash) location.hash = '#/products';

// On initialise l'authentification en lui disant quoi faire
// une fois que l'utilisateur est bien connecté.
initAuth(initAfterLogin);

setTimeout(function(){ const content = $('#content'); if(content){ content.setAttribute('tabindex','-1'); } }, 0);