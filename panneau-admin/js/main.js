// js/main.js
import { initAuth } from './auth.js';
import { initProductsPage, renderProductFormPage } from './pages/products.js';
import { initMatchesPage, renderMatchFormPage } from './pages/matches.js';
import { initPromoCardsPage, renderPromoCardFormPage } from './pages/promoCards.js';

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const $content = $('#content');

function setCrumb(name) {
    $('#crumb-current').textContent = name;
}

function renderSettingsPage() {
    $content.innerHTML = `
        <div class="form-wrap">
            <div class="form-head"><div class="form-title">Paramètres</div></div>
            <div class="form-main">
                <div class="field">
                    <label class="label">Thème</label>
                    <div class="chip">Préférence : <strong id="theme-pref">Auto</strong></div>
                    <div class="hint">Le thème se synchronise avec votre système.</div>
                </div>
                <div class="form-actions">
                    <button class="btn" type="button" data-theme-choice="light"><i data-lucide="sun" class="icon"></i> Clair</button>
                    <button class="btn" type="button" data-theme-choice="dark"><i data-lucide="moon" class="icon"></i> Sombre</button>
                    <button class="btn" type="button" data-theme-choice="auto"><i data-lucide="computer" class="icon"></i> Automatique</button>
                </div>
            </div>
        </div>`;
    updateThemePreferenceUI();
    $$('[data-theme-choice]').forEach(btn => {
        btn.onclick = () => applyTheme(btn.dataset.themeChoice);
    });
    lucide.createIcons();
}

function applyTheme(pref) {
    const root = document.documentElement;
    if (pref === 'light') {
        root.setAttribute('data-theme', 'light');
    } else if (pref === 'dark') {
        root.setAttribute('data-theme', 'dark');
    } else {
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', dark ? 'dark' : 'auto');
    }
    localStorage.setItem('theme-pref', pref);
    updateThemePreferenceUI();
}

function updateThemePreferenceUI() {
    const pref = localStorage.getItem('theme-pref') || 'auto';
    const themePrefEl = $('#theme-pref');
    if (themePrefEl) {
        if (pref === 'light') themePrefEl.textContent = 'Clair';
        else if (pref === 'dark') themePrefEl.textContent = 'Sombre';
        else themePrefEl.textContent = 'Auto';
    }
}

async function handleRoute() {
    const parts = (location.hash || '#/products').split('/');
    const route = parts[1] || 'products';
    const id = parts[2];

    // Gérer l'état actif des liens de navigation
    $$('.link-item').forEach(a => a.classList.remove('active'));
    $(`a[href="#/${route}"]`)?.classList.add('active');

    // Vider le contenu précédent
    $content.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(6);
    
    // Afficher la page correspondante
    if (route === 'products') { setCrumb('Produits'); await initProductsPage(); }
    else if (route === 'new-product') { setCrumb('Nouveau produit'); await renderProductFormPage(); }
    else if (route === 'edit-product' && id) { setCrumb('Éditer produit'); await renderProductFormPage(id); }
    else if (route === 'matches') { setCrumb('Matchs'); await initMatchesPage(); }
    else if (route === 'new-match') { setCrumb('Nouveau match'); await renderMatchFormPage(); }
    else if (route === 'edit-match' && id) { setCrumb('Éditer match'); await renderMatchFormPage(id); }
    else if (route === 'promocards') { setCrumb('Cartes Promo'); await initPromoCardsPage(); }
    else if (route === 'new-promocard') { setCrumb('Nouvelle Carte Promo'); await renderPromoCardFormPage(); }
    else if (route === 'edit-promocard' && id) { setCrumb('Éditer Carte Promo'); await renderPromoCardFormPage(id); }
    else if (route === 'settings') { setCrumb('Paramètres'); renderSettingsPage(); }
    else { location.hash = '#/products'; }
}

function initApp() {
    console.log("App initialisée !");
    lucide.createIcons();
    
    // Navigation
    const navLinks = `
        <div class="section">Navigation</div>
        <a href="#/products" class="link-item"><i data-lucide="package" class="icon"></i> Produits</a>
        <a href="#/matches" class="link-item"><i data-lucide="swords" class="icon"></i> Matchs</a>
        <a href="#/promocards" class="link-item"><i data-lucide="layout-template" class="icon"></i> Cartes Promo</a>
        <div class="section">Général</div>
        <a href="#/settings" class="link-item"><i data-lucide="settings" class="icon"></i> Paramètres</a>
    `;
    $('#main-nav').innerHTML = navLinks;
    $('#drawer-nav').innerHTML = navLinks;
    
    // KPIs et actions rapides
    $('#kpi-container').innerHTML = `
        <div class="kpi" title="Cartes promo actives"><i data-lucide="layout-template" class="icon"></i><span id="kpi-promocards">—</span></div>
        <div class="kpi" title="Articles au catalogue"><i data-lucide="package" class="icon"></i><span id="kpi-products">—</span></div>
        <div class="kpi" title="Matchs planifiés"><i data-lucide="swords" class="icon"></i><span id="kpi-matches">—</span></div>
        <button id="quick-add-promocard" class="btn btn-outline btn-small"><i data-lucide="plus" class="icon"></i> Carte</button>
        <button id="quick-add-product" class="btn btn-outline btn-small"><i data-lucide="plus" class="icon"></i> Produit</button>
        <button id="quick-add-match" class="btn btn-outline btn-small"><i data-lucide="plus" class="icon"></i> Match</button>
    `;
    $('#quick-add-product').onclick = () => location.hash = '#/new-product';
    $('#quick-add-match').onclick = () => location.hash = '#/new-match';
    $('#quick-add-promocard').onclick = () => location.hash = '#/new-promocard';
    
    // Gestion du drawer mobile
    const drawer = $('#drawer');
    $('#open-drawer').addEventListener('click', () => drawer.classList.add('open'));
    $('[data-close-drawer]').addEventListener('click', () => drawer.classList.remove('open'));
    $$('#drawer .link-item').forEach(a => {
        a.addEventListener('click', () => drawer.classList.remove('open'));
    });

    // Gestion du thème
    applyTheme(localStorage.getItem('theme-pref') || 'auto');
    $('#toggle-theme').addEventListener('click', () => {
        const current = localStorage.getItem('theme-pref') || 'auto';
        const next = current === 'light' ? 'dark' : (current === 'dark' ? 'auto' : 'light');
        applyTheme(next);
    });
    $('#drawer-theme').addEventListener('click', () => $('#toggle-theme').click());

    // Routage
    window.addEventListener('hashchange', handleRoute);
    handleRoute(); // Gérer la route initiale
}

function handleLogout() {
    console.log("Utilisateur déconnecté.");
    // Nettoyer l'état de l'application si nécessaire
}

// Initialise l'authentification et passe les fonctions de callback
initAuth(initApp, handleLogout);
