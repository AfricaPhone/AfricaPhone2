// js/pages/products.js
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";
import { db, storage } from '../firebase.js';
import { escapeAttr, escapeHtml, fmtXOF, openModal, setButtonLoading, toast } from '../ui.js';

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

let allProducts = [];
let productSearchTerm = '';
let productCategoryFilter = '';
let viewMode = 'table';
let sortBy = { key: 'name', dir: 'asc' };
const PREDEFINED_CATEGORIES = ['smartphone', 'tablette', 'portable a touche', 'accessoire'];

const $content = $('#content');

async function ensureProductsLoaded() {
    if (allProducts.length) return;
    $content.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(6);
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $('#kpi-products').textContent = String(allProducts.length);
}

function filteredProducts() {
    let arr = [...allProducts];
    if (productSearchTerm) {
        const t = productSearchTerm;
        arr = arr.filter(p =>
            ((p.name || '').toLowerCase().includes(t)) ||
            ((p.brand || '').toLowerCase().includes(t)) ||
            ((p.category || '').toLowerCase().includes(t))
        );
    }
    if (productCategoryFilter) {
        arr = arr.filter(p => (p.category || '') === productCategoryFilter);
    }
    const dir = sortBy.dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
        const ka = (a[sortBy.key] ?? '').toString().toLowerCase();
        const kb = (b[sortBy.key] ?? '').toString().toLowerCase();
        if (ka < kb) return -1 * dir;
        if (ka > kb) return 1 * dir;
        return 0;
    });
    return arr;
}

async function handleDelete(id, name) {
    const ok = await openModal({
        title: 'Supprimer Produit',
        body: `Êtes-vous sûr de vouloir supprimer "<strong>${escapeHtml(name || id)}</strong>" ?`,
        okText: 'Supprimer',
        danger: true
    });
    if (!ok) return;
    try {
        await deleteDoc(doc(db, 'products', id));
        allProducts = allProducts.filter(p => p.id !== id);
        renderProductList();
        $('#kpi-products').textContent = String(allProducts.length);
        toast('Produit supprimé', '', 'success');
    } catch (e) {
        console.error(e);
        toast('Erreur', 'Suppression impossible', 'error');
    }
}

function renderProductList() {
    const items = filteredProducts();
    
    if (!items.length) {
        $content.innerHTML = `
            <div class="center" style="padding:32px">
              <div>
                <div class="login-title" style="text-align:center;margin-bottom:6px">Aucun produit</div>
                <div class="muted" style="text-align:center">Ajoutez votre premier produit pour démarrer.</div>
                <div style="display:flex;justify-content:center;margin-top:10px">
                  <button id="empty-add-product" class="btn btn-primary"><i data-lucide="plus" class="icon"></i> Nouveau produit</button>
                </div>
              </div>
            </div>`;
        $('#empty-add-product').onclick = () => location.hash = '#/new-product';
        lucide.createIcons();
        return;
    }

    if (viewMode === 'cards') {
        const grid = document.createElement('div');
        grid.className = 'grid';
        items.forEach(p => {
            const el = document.createElement('div');
            el.className = 'card';
            el.dataset.id = p.id;
            el.innerHTML = `
                <img class="thumb" src="${escapeAttr(p.imageUrl || '')}" alt="${escapeAttr(p.name || 'Image produit')}" loading="lazy" onerror="this.style.display='none'"/>
                <div class="grow">
                    <div style="font-weight:800">${escapeHtml(p.name || 'Sans nom')}</div>
                    <div class="muted">${escapeHtml(p.brand || '—')} • ${escapeHtml(p.category || '—')}</div>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
                        <div style="font-weight:900">${typeof p.price === 'number' ? fmtXOF.format(p.price) : '—'}</div>
                        <div class="actions">
                            <button class="btn btn-small" data-edit>Éditer</button>
                            <button class="btn btn-danger btn-small" data-del>Supprimer</button>
                        </div>
                    </div>
                </div>`;
            el.querySelector('[data-edit]').onclick = () => location.hash = `#/edit-product/${p.id}`;
            el.querySelector('[data-del]').onclick = () => handleDelete(p.id, p.name);
            grid.appendChild(el);
        });
        $content.innerHTML = '';
        $content.appendChild(grid);
    } else {
        const table = document.createElement('table');
        table.className = 'table';
        const sortIcon = key => {
            if (sortBy.key !== key) return `<i data-lucide="chevrons-up-down" class="icon sort-icon"></i>`;
            return sortBy.dir === 'asc' ? `<i data-lucide="chevron-up" class="icon sort-icon"></i>` : `<i data-lucide="chevron-down" class="icon sort-icon"></i>`;
        };
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width:60px">Image</th>
                    <th class="sortable ${sortBy.key === 'name' ? 'sorted' : ''}" data-sort="name">Nom ${sortIcon('name')}</th>
                    <th class="sortable ${sortBy.key === 'brand' ? 'sorted' : ''}" data-sort="brand">Marque ${sortIcon('brand')}</th>
                    <th class="sortable ${sortBy.key === 'category' ? 'sorted' : ''}" data-sort="category">Catégorie ${sortIcon('category')}</th>
                    <th>Prix</th>
                    <th style="width:180px;text-align:right">Actions</th>
                </tr>
            </thead>
            <tbody></tbody>`;
        const tb = table.querySelector('tbody');
        items.forEach(p => {
            const tr = document.createElement('tr');
            tr.dataset.id = p.id;
            tr.innerHTML = `
                <td>${p.imageUrl ? `<img class="img" src="${escapeAttr(p.imageUrl)}" alt="Image produit" />` : '<div class="img center muted"><i data-lucide="image-off" class="icon"></i></div>'}</td>
                <td style="font-weight:800">${escapeHtml(p.name || 'Sans nom')}</td>
                <td>${escapeHtml(p.brand || '—')}</td>
                <td><span class="chip">${escapeHtml(p.category || '—')}</span></td>
                <td>${typeof p.price === 'number' ? fmtXOF.format(p.price) : '—'}</td>
                <td class="actions">
                    <button class="btn btn-small" data-edit>Éditer</button>
                    <button class="btn btn-danger btn-small" data-del>Supprimer</button>
                </td>`;
            tr.querySelector('[data-edit]').onclick = () => location.hash = `#/edit-product/${p.id}`;
            tr.querySelector('[data-del]').onclick = () => handleDelete(p.id, p.name);
            tb.appendChild(tr);
        });
        $content.innerHTML = '';
        $content.appendChild(table);
        table.querySelectorAll('th.sortable').forEach(th => {
            th.onclick = () => {
                const key = th.dataset.sort;
                if (sortBy.key === key) {
                    sortBy.dir = sortBy.dir === 'asc' ? 'desc' : 'asc';
                } else {
                    sortBy.key = key;
                    sortBy.dir = 'asc';
                }
                renderProductList();
            };
        });
    }
    lucide.createIcons();
}

async function handleProductFormSubmit(e, id) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);

    const data = {
        name: $('#p-name').value.trim(),
        brand: $('#p-brand').value.trim(),
        category: $('#p-category').value.trim(),
        price: parseFloat($('#p-price').value),
        description: $('#p-desc').value.trim(),
    };
    const file = ($('#p-image-file').files && $('#p-image-file').files[0]) || null;

    if (!data.name) {
        toast('Erreur', 'Le nom est obligatoire.', 'error');
        setButtonLoading(submitBtn, false);
        return;
    }

    try {
        if (file) {
            const ext = file.name.split('.').pop() || 'jpg';
            const path = `product-images/${id || ('p_' + Date.now())}.${ext}`;
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, file);
            data.imageUrl = await getDownloadURL(storageRef);
        }

        if (id) {
            await updateDoc(doc(db, 'products', id), data);
            const index = allProducts.findIndex(p => p.id === id);
            if (index > -1) allProducts[index] = { id, ...allProducts[index], ...data };
            toast('Produit mis à jour', data.name, 'success');
        } else {
            data.createdAt = serverTimestamp();
            const docRef = await addDoc(collection(db, 'products'), data);
            allProducts.unshift({ id: docRef.id, ...data });
            $('#kpi-products').textContent = String(allProducts.length);
            toast('Produit créé', data.name, 'success');
        }
        location.hash = '#/products';
    } catch (err) {
        console.error(err);
        toast('Erreur', 'Enregistrement impossible', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

export async function renderProductFormPage(id) {
    let p = {};
    if (id) {
        p = allProducts.find(x => x.id === id) || (await getDoc(doc(db, 'products', id)).then(s => s.exists() ? { id: s.id, ...s.data() } : null));
        if (!p) {
            $content.innerHTML = '<div class="center" style="padding:32px">Produit introuvable.</div>';
            return;
        }
    }

    const categoryOptions = PREDEFINED_CATEGORIES.map(cat => `<option value="${escapeAttr(cat)}">${escapeHtml(cat.charAt(0).toUpperCase() + cat.slice(1))}</option>`).join('');

    $content.innerHTML = `
        <div class="form-wrap">
            <div class="form-head">
                <div class="form-title">${id ? 'Éditer' : 'Nouveau'} produit</div>
            </div>
            <form class="form-main" novalidate>
                <div class="twocol">
                    <div class="field">
                        <label class="label" for="p-name">Nom</label>
                        <input id="p-name" class="input" type="text" value="${escapeAttr(p.name || '')}" required />
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
                    </div>
                </div>
                <div class="field">
                    <label class="label" for="p-desc">Description</label>
                    <textarea id="p-desc" class="textarea" rows="4">${escapeHtml(p.description || '')}</textarea>
                </div>
                <div class="field">
                    <label class="label" for="p-image">Image</label>
                    <input id="p-image-file" class="input" type="file" accept="image/png,image/jpeg,image/webp" />
                    <img id="p-image-preview" class="image-preview" src="${escapeAttr(p.imageUrl || '')}" alt="Aperçu" style="margin-top:10px; ${p.imageUrl ? '' : 'display:none'}"/>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn" data-cancel>Annuler</button>
                    <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Créer le produit'}</button>
                </div>
            </form>
        </div>`;

    if (p.category) $('#p-category').value = p.category;

    $('#p-image-file').addEventListener('change', () => {
        const file = $('#p-image-file').files[0];
        if (file) {
            $('#p-image-preview').src = URL.createObjectURL(file);
            $('#p-image-preview').style.display = 'block';
        }
    });

    $('[data-cancel]').onclick = () => location.hash = '#/products';
    $('form').onsubmit = e => handleProductFormSubmit(e, id);
}

export async function initProductsPage() {
    await ensureProductsLoaded();
    renderProductList();
}
