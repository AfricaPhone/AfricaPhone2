// others/admin-panel/assets/js/router.js
import { $, setCrumb } from './ui.js';

// DOM Elements related to routing
const $navProducts = $('#nav-products');
const $navMatches = $('#nav-matches');
const $navSettings = $('#nav-settings');
const $navPromoCards = $('#nav-promocards');
const $toolbarProducts = $('#toolbar-products');
const $toolbarMatches = $('#toolbar-matches');
const $toolbarPromoCards = $('#toolbar-promocards');
const $pageProducts = $('#page-products');
const $pageMatches = $('#page-matches');
const $pagePromoCards = $('#page-promocards');
const $pageSettings = $('#page-settings');

// This will hold the functions for rendering pages, passed from main.js
let pageRenderers = {};

/**
 * Handles routing logic based on URL hash.
 */
async function handleRoute() {
    const parts = (location.hash || '#/products').split('/');
    const route = parts[1] || 'products';
    const id = parts[2];

    // Update active state for navigation links
    $navProducts.classList.toggle('active', route.includes('product'));
    $navMatches.classList.toggle('active', route.includes('match'));
    $navPromoCards.classList.toggle('active', route.includes('promocard'));
    $navSettings.classList.toggle('active', route === 'settings');

    // Toggle visibility of toolbars
    $toolbarProducts.classList.toggle('hide', !route.includes('product'));
    $toolbarMatches.classList.toggle('hide', !route.includes('match'));
    $toolbarPromoCards.classList.toggle('hide', !route.includes('promocard'));

    // Toggle visibility of pages
    $pageProducts.classList.toggle('hide', !route.includes('product'));
    $pageMatches.classList.toggle('hide', !route.includes('match'));
    $pagePromoCards.classList.toggle('hide', !route.includes('promocard'));
    $pageSettings.classList.toggle('hide', route !== 'settings');

    // Call the appropriate renderer function based on the route
    switch (route) {
        case 'products':
            setCrumb('Produits');
            await pageRenderers.renderProductListPage();
            break;
        case 'new-product':
            setCrumb('Nouveau produit');
            pageRenderers.renderProductFormPage();
            break;
        case 'edit-product':
            if (id) {
                setCrumb('Éditer produit');
                await pageRenderers.renderProductFormPage(id);
            }
            break;
        case 'matches':
            setCrumb('Matchs');
            await pageRenderers.renderMatchListPage();
            break;
        case 'new-match':
            setCrumb('Nouveau match');
            pageRenderers.renderMatchFormPage();
            break;
        case 'edit-match':
            if (id) {
                setCrumb('Éditer match');
                await pageRenderers.renderMatchFormPage(id);
            }
            break;
        case 'promocards':
            setCrumb('Cartes Promo');
            await pageRenderers.renderPromoCardListPage();
            break;
        case 'new-promocard':
            setCrumb('Nouvelle Carte Promo');
            pageRenderers.renderPromoCardFormPage();
            break;
        case 'edit-promocard':
            if (id) {
                setCrumb('Éditer Carte Promo');
                await pageRenderers.renderPromoCardFormPage(id);
            }
            break;
        case 'settings':
            setCrumb('Paramètres');
            // No renderer needed for the static settings page
            break;
        default:
            location.hash = '#/products';
    }
}

/**
 * Initializes the router.
 * @param {object} renderers - An object containing page rendering functions.
 */
export function initRouter(renderers) {
    pageRenderers = renderers;
    window.addEventListener('hashchange', handleRoute);
    handleRoute(); // Initial route handling
}