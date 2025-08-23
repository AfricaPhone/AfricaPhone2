// others/admin-panel/assets/js/services/productsService.js
import { db, storage } from '../../../firebase-config.js';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { ref, uploadBytes } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";

// State local pour cacher les produits
let allProducts = [];

/**
 * Force le rechargement des produits depuis Firestore.
 */
async function forceReloadProducts() {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return allProducts;
}

/**
 * Récupère tous les produits, depuis le cache si possible, sinon depuis Firestore.
 */
export async function getProducts() {
    if (allProducts.length) {
        return allProducts;
    }
    return await forceReloadProducts();
}

/**
 * Récupère un produit spécifique par son ID.
 */
export async function getProduct(id) {
    const cached = allProducts.find(p => p.id === id);
    if (cached) return cached;
    
    const productDoc = await getDoc(doc(db, 'products', id));
    if (productDoc.exists()) {
        return { id: productDoc.id, ...productDoc.data() };
    }
    return null;
}

/**
 * Supprime un produit de Firestore et met à jour le cache local.
 * @param {string} id - L'ID du produit à supprimer.
 */
export async function deleteProduct(id) {
    await deleteDoc(doc(db, 'products', id));
    allProducts = allProducts.filter(p => p.id !== id);
}

/**
 * Met à jour le prix d'un produit.
 * @param {string} id - L'ID du produit.
 * @param {number} price - Le nouveau prix.
 */
export async function updateProductPrice(id, price) {
    await updateDoc(doc(db, 'products', id), { price: price });
    const product = allProducts.find(p => p.id === id);
    if (product) {
        product.price = price;
    }
}

/**
 * Sauvegarde un produit (création ou mise à jour).
 * @param {object} productData - Les données du produit.
 * @param {FileList} files - Les nouveaux fichiers image à uploader.
 * @param {string|null} id - L'ID du produit pour une mise à jour, ou null pour une création.
 * @returns {Promise<string>} L'ID du produit sauvegardé.
 */
export async function saveProduct(productData, files, id) {
    let productId = id;

    if (productId) {
        // Mise à jour
        await updateDoc(doc(db, 'products', productId), productData);
    } else {
        // Création
        const newDocRef = await addDoc(collection(db, 'products'), {
            ...productData,
            imageUrls: [], // Initialisé vide
            createdAt: serverTimestamp()
        });
        productId = newDocRef.id;
    }

    // Upload des nouvelles images s'il y en a
    if (files && files.length > 0) {
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
    
    // Forcer le rechargement pour refléter tous les changements (y compris les images traitées par la Cloud Function)
    await forceReloadProducts();
    
    return productId;
}