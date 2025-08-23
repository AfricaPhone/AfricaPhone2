// others/admin-panel/assets/js/views/productsView.js
import { $, $$, fmtXOF, escapeHtml, escapeAttr, openModal, toast, setButtonLoading } from '../ui.js';
import * as productsService from '../services/productsService.js';

// State pour la vue des produits
let productSearchTerm = '';
let productCategoryFilter = '';
let viewMode = 'table';
let sortBy = { key: 'name', dir: 'asc' };
const PREDEFINED_CATEGORIES = ['smartphone', 'tablette', 'portable a touche', 'accessoire'];

const $productsContent = $('#products-content');

// --- Logique de rendu ---

async function filteredProducts() {
    let arr = await productsService.getProducts();
  
    if (productSearchTerm) {
        const t = productSearchTerm;
        arr = arr.filter(p => 
            ((p.name || '').toLowerCase().indexOf(t) !== -1) ||
            ((p.brand || '').toLowerCase().indexOf(t) !== -1) ||
            ((p.category || '').toLowerCase().indexOf(t) !== -1)
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

export async function renderProductList() {
    $productsContent.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(6);
    const items = await filteredProducts();
    const allProducts = await productsService.getProducts();
    $('#kpi-products').textContent = String(allProducts.length);

    $('#bulk-delete').disabled = true;

    if (!items.length) {
        $productsContent.innerHTML = `
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
        renderCardsView(items);
    } else {
        renderTableView(items);
    }
    lucide.createIcons();
}

function renderTableView(items) {
    const table = document.createElement('table');
    table.className = 'table';
    const sortIcon = (key) => {
        if (sortBy.key !== key) return `<i data-lucide="chevrons-up-down" class="icon sort-icon"></i>`;
        return sortBy.dir === 'asc' ? `<i data-lucide="chevron-up" class="icon sort-icon"></i>` : `<i data-lucide="chevron-down" class="icon sort-icon"></i>`;
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
    items.forEach(p => {
        const tr = document.createElement('tr');
        tr.dataset.id = p.id;
        const mainImage = (p.imageUrls && p.imageUrls[0]) || p.imageUrl || '';
        tr.innerHTML = `
            <td><input type="checkbox" data-select /></td>
            <td>${mainImage ? `<img class="img" src="${escapeAttr(mainImage)}" alt="${escapeAttr(p.name || 'Image produit')}" onerror="this.style.display='none'" />` : '<div class="img center muted"><i data-lucide="image-off" class="icon"></i></div>'}</td>
            <td style="font-weight:800">${escapeHtml(p.name || 'Sans nom')}</td>
            <td>${escapeHtml(p.brand || '—')}</td>
            <td><span class="chip">${escapeHtml(p.category || '—')}</span></td>
            <td><input type="number" step="1" min="0" class="input" style="max-width:120px" value="${typeof p.price === 'number' ? p.price : ''}" placeholder="0" data-price-update /></td>
            <td>${typeof p.stock === 'number' ? p.stock : '—'}</td>
            <td class="actions">
                <button class="btn btn-small" data-edit>Éditer</button>
                <button class="btn btn-danger btn-small" data-del>Supprimer</button>
            </td>`;
        tr.querySelector('[data-select]').addEventListener('change', updateBulkState);
        tr.querySelector('[data-price-update]').addEventListener('change', (e) => handlePriceUpdate(p.id, e.target));
        tr.querySelector('[data-edit]').addEventListener('click', () => location.hash = `#/edit-product/${p.id}`);
        tr.querySelector('[data-del]').addEventListener('click', () => handleDelete(p.id, p.name));
        tb.appendChild(tr);
    });
    $productsContent.innerHTML = '';
    $productsContent.appendChild(table);
    $('#sel-all').addEventListener('change', (e) => {
        $$('#tbody-products [data-select]').forEach(cb => cb.checked = e.target.checked);
        updateBulkState();
    });
}

function renderCardsView(items) {
    const grid = document.createElement('div');
    grid.className = 'grid';
    items.forEach(p => {
        const el = document.createElement('div');
        el.className = 'card';
        el.dataset.id = p.id;
        el.innerHTML = `
            <img class="thumb" src="${escapeAttr((p.imageUrls && p.imageUrls[0]) || p.imageUrl || '')}" alt="${escapeAttr(p.name || 'Image produit')}" loading="lazy" onerror="this.style.display='none'"/>
            <div class="grow">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                    <div style="font-weight:800">${escapeHtml(p.name || 'Sans nom')}</div>
                    <label class="chip" style="user-select:none"><input type="checkbox" data-select id="sel-${p.id}" /> Sélection</label>
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
        el.querySelector('[data-edit]').addEventListener('click', () => location.hash = `#/edit-product/${p.id}`);
        el.querySelector('[data-del]').addEventListener('click', () => handleDelete(p.id, p.name));
        grid.appendChild(el);
    });
    $productsContent.innerHTML = '';
    $productsContent.appendChild(grid);
}

export async function renderProductFormPage(id) {
    let p = {};
    if (id) {
        p = await productsService.getProduct(id);
        if (!p) {
            $productsContent.innerHTML = '<div class="center" style="padding:32px">Produit introuvable.</div>';
            return;
        }
    }

    const categoryOptions = PREDEFINED_CATEGORIES.map(cat => `<option value="${escapeAttr(cat)}">${escapeHtml(cat.charAt(0).toUpperCase() + cat.slice(1))}</option>`).join('');
    const existingImagesHtml = (p.imageUrls || []).map((url, index) => `
      <div class="image-preview-item" data-url="${escapeAttr(url)}">
          <img src="${escapeAttr(url)}" alt="Aperçu ${index + 1}">
          <button type="button" class="remove-btn" data-remove-image-url="${escapeAttr(url)}"><i data-lucide="x" class="icon" style="width:16px;height:16px"></i></button>
      </div>`).join('');

    const wrap = document.createElement('div');
    wrap.className = 'form-wrap';
    wrap.innerHTML = `
        <div class="form-head">
          <div class="form-title">${id ? 'Éditer' : 'Nouveau'} produit</div>
          <div class="kpi">${id ? 'ID: ' + escapeHtml(id) : 'Création'}</div>
        </div>
        <form class="form-main" novalidate>
          <div class="twocol">
            <div class="field"><label class="label" for="p-name">Nom</label><input id="p-name" class="input" type="text" value="${escapeAttr(p.name || '')}" required /><div class="hint">Nom commercial lisible (ex. "iPhone 13 128 Go").</div><div id="err-name" class="error hide"></div></div>
            <div class="field"><label class="label" for="p-brand">Marque</label><input id="p-brand" class="input" type="text" value="${escapeAttr(p.brand || '')}" /></div>
          </div>
          <div class="twocol">
            <div class="field"><label class="label" for="p-category">Catégorie</label><select id="p-category" class="select"><option value="">— Sélectionner —</option>${categoryOptions}</select></div>
            <div class="field"><label class="label" for="p-price">Prix (FCFA)</label><input id="p-price" class="input" type="number" min="0" step="1" value="${typeof p.price === 'number' ? p.price : ''}" /><div id="err-price" class="error hide"></div></div>
          </div>
          <div class="twocol">
            <div class="field"><label class="label" for="p-rom">Stockage</label><input id="p-rom" class="input" type="number" min="0" step="1" value="${typeof p.rom === 'number' ? p.rom : ''}" /></div>
            <div class="field"><label class="label" for="p-ram">RAM</label><input id="p-ram" class="input" type="number" min="0" step="1" value="${typeof p.ram === 'number' ? p.ram : ''}" /></div>
          </div>
          <div class="field"><label class="label" for="p-desc">Description</label><textarea id="p-desc" class="textarea" rows="4">${escapeHtml(p.description || '')}</textarea></div>
          <div class="twocol">
            <div class="field"><label class="label" for="p-stock">Stock</label><input id="p-stock" class="input" type="number" min="0" step="1" value="${typeof p.stock === 'number' ? p.stock : ''}" /></div>
            <div class="field"><label class="label" for="p-images">Images</label><input id="p-images-file" class="input" type="file" accept="image/png,image/jpeg,image/webp" multiple /><div class="hint">Sélectionnez une ou plusieurs images. La première sera l'image principale.</div><div id="p-images-preview" class="image-preview-grid">${existingImagesHtml}</div></div>
          </div>
          <div class="form-actions"><button type="button" class="btn" data-cancel>Annuler</button><button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Créer le produit'}</button></div>
        </form>`;
    $productsContent.innerHTML = '';
    $productsContent.appendChild(wrap);

    if (p.category) $('#p-category').value = p.category;

    const fileInput = $('#p-images-file');
    const previewContainer = $('#p-images-preview');
    fileInput.addEventListener('change', () => {
        previewContainer.innerHTML = existingImagesHtml;
        if (fileInput.files) {
            Array.from(fileInput.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const div = document.createElement('div');
                    div.className = 'image-preview-item';
                    div.innerHTML = `<img src="${e.target.result}" alt="${escapeAttr(file.name)}">`;
                    previewContainer.appendChild(div);
                };
                reader.readAsDataURL(file);
            });
        }
    });

    wrap.querySelector('[data-cancel]').addEventListener('click', () => { history.length > 1 ? history.back() : location.hash = '#/products'; });
    wrap.querySelector('form').addEventListener('submit', (e) => handleProductFormSubmit(e, id));
    lucide.createIcons();
}

// --- Logique de gestion des événements ---

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

    try {
        const productData = {
            name: name,
            brand: $('#p-brand').value.trim(),
            category: $('#p-category').value.trim() || '',
            price: parseFloat($('#p-price').value) || null,
            stock: parseInt($('#p-stock').value, 10) || null,
            ram: parseInt($('#p-ram').value, 10) || null,
            rom: parseInt($('#p-rom').value, 10) || null,
            description: $('#p-desc').value.trim(),
            updatedAt: serverTimestamp()
        };
        const files = $('#p-images-file').files;

        await productsService.saveProduct(productData, files, id);
        toast('Succès', `Produit ${id ? 'mis à jour' : 'créé'} avec succès.`, 'success');
        location.hash = '#/products';
    } catch (err) {
        console.error(err);
        toast('Erreur', 'Une erreur est survenue lors de la sauvegarde.', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
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
        await productsService.deleteProduct(id);
        toast('Supprimé', '', 'success');
        renderProductList(); // Re-render the list after deletion
    } catch (e) {
        console.error(e);
        toast('Erreur', 'Suppression impossible', 'error');
    }
}

async function handlePriceUpdate(id, inputEl) {
    const val = parseFloat(inputEl.value);
    if (isNaN(val) || val < 0) {
        toast('Prix invalide', 'Entrez un nombre positif', 'error');
        inputEl.focus();
        return;
    }
    inputEl.disabled = true;
    try {
        await productsService.updateProductPrice(id, val);
        toast('Prix mis à jour', fmtXOF.format(val), 'success');
    } catch (e) {
        console.error(e);
        toast('Erreur', 'Impossible de mettre à jour le prix', 'error');
    } finally {
        inputEl.disabled = false;
    }
}

function updateBulkState() {
    const any = Array.from($$('[data-select]')).some(cb => cb.checked);
    $('#bulk-delete').disabled = !any;
}

// Initialise les écouteurs d'événements pour la page des produits
export function initProductsView() {
    $('#search-products').addEventListener('input', (e) => {
        productSearchTerm = (e.target.value || '').toLowerCase();
        if (location.hash.startsWith('#/products')) renderProductList();
    });
    $('#filter-category').addEventListener('change', (e) => {
        productCategoryFilter = e.target.value || '';
        if (location.hash.startsWith('#/products')) renderProductList();
    });
    $('#add-product').addEventListener('click', () => location.hash = '#/new-product');
    $('#view-table').addEventListener('click', () => {
        viewMode = 'table';
        $('#view-table').setAttribute('aria-selected', 'true');
        $('#view-cards').setAttribute('aria-selected', 'false');
        renderProductList();
    });
    $('#view-cards').addEventListener('click', () => {
        viewMode = 'cards';
        $('#view-table').setAttribute('aria-selected', 'false');
        $('#view-cards').setAttribute('aria-selected', 'true');
        renderProductList();
    });
    $('#bulk-delete').addEventListener('click', async () => {
        const ids = Array.from($$('[data-select]:checked')).map(cb => cb.closest('tr, .card').dataset.id);
        if (!ids.length) return;
        const ok = await openModal({
            title: 'Supprimer la sélection',
            body: `Êtes-vous sûr de vouloir supprimer <strong>${ids.length}</strong> élément(s) ? Cette action est irréversible.`,
            okText: 'Supprimer',
            cancelText: 'Annuler',
            danger: true
        });
        if (!ok) return;

        let done = 0, fail = 0;
        for (const id of ids) {
            try {
                await productsService.deleteProduct(id);
                done++;
            } catch (e) {
                console.error(e);
                fail++;
            }
        }
        toast('Suppression terminée', `${done} succès, ${fail} échec(s)`, fail ? 'error' : 'success');
        renderProductList();
    });
    // Sorting listener
    document.addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort]');
        if (!th || !location.hash.startsWith('#/products')) return;
        const key = th.dataset.sort;
        if (sortBy.key === key) {
            sortBy.dir = sortBy.dir === 'asc' ? 'desc' : 'asc';
        } else {
            sortBy.key = key;
            sortBy.dir = 'asc';
        }
        renderProductList();
    });
}