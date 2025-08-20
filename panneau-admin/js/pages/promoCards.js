// js/pages/promoCards.js
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { db } from '../firebase.js';
import { escapeAttr, escapeHtml, openModal, setButtonLoading, toast } from '../ui.js';

const $ = sel => document.querySelector(sel);
const $content = $('#content');

let allPromoCards = [];

async function ensurePromoCardsLoaded() {
    if (allPromoCards.length) return;
    $content.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(3);
    const q = query(collection(db, 'promoCards'), orderBy('sortOrder', 'asc'));
    const snap = await getDocs(q);
    allPromoCards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $('#kpi-promocards').textContent = String(allPromoCards.length);
}

async function handleDelete(id, name) {
    const ok = await openModal({
        title: 'Supprimer Carte Promo',
        body: `Êtes-vous sûr de vouloir supprimer la carte "<strong>${escapeHtml(name || id)}</strong>" ?`,
        okText: 'Supprimer',
        danger: true
    });
    if (!ok) return;
    try {
        await deleteDoc(doc(db, 'promoCards', id));
        allPromoCards = allPromoCards.filter(c => c.id !== id);
        renderPromoCardList();
        $('#kpi-promocards').textContent = String(allPromoCards.length);
        toast('Carte supprimée', '', 'success');
    } catch (e) {
        console.error(e);
        toast('Erreur', 'Suppression impossible', 'error');
    }
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
        renderPromoCardList(); // Revert UI on error
    }
}

function renderPromoCardList() {
    const term = ($('#search-promocards')?.value || '').toLowerCase();
    const arr = term ? allPromoCards.filter(c => (c.title || '').toLowerCase().includes(term)) : [...allPromoCards];

    if (!arr.length) {
        $content.innerHTML = '<div class="center" style="padding:32px">Aucune carte promo.</div>';
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
        <tbody></tbody>`;
    const tb = table.querySelector('tbody');
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
        tr.querySelector('[data-active-toggle]').onchange = (e) => handlePromoCardStatusToggle(c.id, e.target.checked);
        tb.appendChild(tr);
    });
    $content.innerHTML = '';
    $content.appendChild(table);
    lucide.createIcons();
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
            const index = allPromoCards.findIndex(c => c.id === id);
            if (index > -1) allPromoCards[index] = { id, ...data };
            toast('Carte mise à jour', data.title, 'success');
        } else {
            const docRef = await addDoc(collection(db, 'promoCards'), data);
            allPromoCards.push({ id: docRef.id, ...data });
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

export async function renderPromoCardFormPage(id) {
    let card = {};
    if (id) {
        card = allPromoCards.find(c => c.id === id) || (await getDoc(doc(db, 'promoCards', id)).then(s => s.exists() ? { id: s.id, ...s.data() } : null));
        if (!card) {
            $content.innerHTML = '<div class="center" style="padding:32px">Carte introuvable.</div>';
            return;
        }
    }
    $content.innerHTML = `
        <div class="form-wrap">
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
            </form>
        </div>`;
    $('[data-cancel]').onclick = () => location.hash = '#/promocards';
    $('form').onsubmit = e => handlePromoCardFormSubmit(e, id);
}

export async function initPromoCardsPage() {
    await ensurePromoCardsLoaded();
    renderPromoCardList();
    $('#search-promocards')?.addEventListener('input', renderPromoCardList);
}
