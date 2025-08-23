// others/admin-panel/assets/js/views/promoCardsView.js
import { $, escapeHtml, escapeAttr, openModal, toast, setButtonLoading } from '../ui.js';
import * as promoCardsService from '../services/promoCardsService.js';

const $promoCardsContent = $('#promocards-content');
let searchTerm = '';

export async function renderPromoCardList() {
    $promoCardsContent.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(3);
    const allCards = await promoCardsService.getPromoCards();
    $('#kpi-promocards').textContent = String(allCards.length);

    const term = searchTerm.toLowerCase();
    const arr = term ? allCards.filter(c => (c.title || '').toLowerCase().includes(term)) : allCards;

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
        tr.querySelector('[data-del]').onclick = () => handleDelete(c.id, c.title);
        tr.querySelector('[data-active-toggle]').onchange = (e) => handleStatusToggle(c.id, e.target.checked);
        tb.appendChild(tr);
    });

    $promoCardsContent.innerHTML = '';
    $promoCardsContent.appendChild(table);
    lucide.createIcons();
}

export async function renderPromoCardFormPage(id) {
    let card = {};
    if (id) {
        card = await promoCardsService.getPromoCard(id);
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
                <div class="field"><label class="label" for="pc-title">Titre</label><input id="pc-title" class="input" type="text" value="${escapeAttr(card.title || '')}" required /></div>
                <div class="field"><label class="label" for="pc-subtitle">Sous-titre (optionnel)</label><input id="pc-subtitle" class="input" type="text" value="${escapeAttr(card.subtitle || '')}" /></div>
            </div>
            <div class="twocol">
                <div class="field"><label class="label" for="pc-cta">Texte du bouton (CTA)</label><input id="pc-cta" class="input" type="text" value="${escapeAttr(card.cta || '')}" /></div>
                <div class="field"><label class="label" for="pc-screen">Écran de destination</label><input id="pc-screen" class="input" type="text" value="${escapeAttr(card.screen || '')}" placeholder="Ex: MatchList, Store..." /></div>
            </div>
            <div class="twocol">
                <div class="field"><label class="label" for="pc-image">URL de l'image</label><input id="pc-image" class="input" type="url" value="${escapeAttr(card.image || '')}" /></div>
                <div class="field"><label class="label" for="pc-sortOrder">Ordre d'affichage</label><input id="pc-sortOrder" class="input" type="number" min="1" step="1" value="${card.sortOrder || ''}" required /></div>
            </div>
            <div class="field"><label class="toggle"><span class="toggle-switch"><input id="pc-isActive" type="checkbox" ${card.isActive !== false ? 'checked' : ''}><span class="toggle-slider"></span></span><span>Active (visible dans l'application)</span></label></div>
            <div class="form-actions"><button type="button" class="btn" data-cancel>Annuler</button><button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Créer la carte'}</button></div>
        </form>`;
    
    $promoCardsContent.innerHTML = '';
    $promoCardsContent.appendChild(wrap);
    wrap.querySelector('[data-cancel]').onclick = () => history.length > 1 ? history.back() : location.hash = '#/promocards';
    wrap.querySelector('form').onsubmit = e => handleFormSubmit(e, id);
}

async function handleFormSubmit(e, id) {
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
        await promoCardsService.savePromoCard(data, id);
        toast(`Carte ${id ? 'mise à jour' : 'créée'}`, data.title, 'success');
        location.hash = '#/promocards';
    } catch (err) {
        console.error(err);
        toast('Erreur', 'Enregistrement impossible', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

async function handleStatusToggle(id, isActive) {
    try {
        await promoCardsService.updatePromoCardStatus(id, isActive);
        toast('Statut mis à jour', `La carte est maintenant ${isActive ? 'active' : 'inactive'}.`, 'success');
    } catch (error) {
        console.error("Erreur de mise à jour du statut:", error);
        toast('Erreur', 'Impossible de changer le statut.', 'error');
        renderPromoCardList(); // Re-render to revert the toggle on error
    }
}

async function handleDelete(id, name) {
    const ok = await openModal({
        title: 'Supprimer',
        body: `Supprimer "<strong>${escapeHtml(name || id)}</strong>" ?`,
        okText: 'Supprimer',
        cancelText: 'Annuler',
        danger: true
    });
    if (!ok) return;

    try {
        await promoCardsService.deletePromoCard(id);
        toast('Carte promo supprimée', '', 'success');
        renderPromoCardList();
    } catch (e) {
        console.error(e);
        toast('Erreur', 'Suppression impossible', 'error');
    }
}

export function initPromoCardsView() {
    $('#add-promocard').addEventListener('click', () => location.hash = '#/new-promocard');
    $('#search-promocards').addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderPromoCardList();
    });
}