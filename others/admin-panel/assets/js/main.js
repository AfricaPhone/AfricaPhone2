// others/admin-panel/assets/js/main.js
// Importe les fonctions UI depuis le nouveau module
import { $, $$, toast } from './ui.js';
// Importe le module d'authentification
import { initAuth } from './auth.js';
// Importe le module de routage
import { initRouter } from './router.js';
// Importe les fonctions des vues
import { initProductsView, renderProductList, renderProductFormPage } from './views/productsView.js';
import { initMatchesView, renderMatchList, renderMatchFormPage } from './views/matchesView.js';
import { initPromoCardsView, renderPromoCardList, renderPromoCardFormPage } from './views/promoCardsView.js';


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
function initAfterLogin(){
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

  // Initialise les écouteurs pour chaque vue
  initProductsView();
  initMatchesView();
  initPromoCardsView();

  // Initialise le routeur en lui passant les fonctions de rendu des pages
  initRouter({
    renderProductListPage: renderProductList,
    renderProductFormPage,
    renderMatchListPage: renderMatchList,
    renderMatchFormPage,
    renderPromoCardListPage: renderPromoCardList,
    renderPromoCardFormPage,
  });
}

/* ============================ App Kickoff ============================ */
if(!location.hash) location.hash = '#/products';

// On initialise l'authentification en lui disant quoi faire
// une fois que l'utilisateur est bien connecté.
initAuth(initAfterLogin);

setTimeout(function(){ const content = $('#content'); if(content){ content.setAttribute('tabindex','-1'); } }, 0);