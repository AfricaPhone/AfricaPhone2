// others/admin-panel/assets/js/services/promoCardsService.js
import { db } from '../../../firebase-config.js';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

let allPromoCards = [];

async function forceReloadPromoCards() {
    const q = query(collection(db, 'promoCards'), orderBy('sortOrder', 'asc'));
    const snap = await getDocs(q);
    allPromoCards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return allPromoCards;
}

export async function getPromoCards() {
    if (allPromoCards.length) {
        return allPromoCards;
    }
    return await forceReloadPromoCards();
}

export async function getPromoCard(id) {
    const cached = allPromoCards.find(c => c.id === id);
    if (cached) return cached;

    const docSnap = await getDoc(doc(db, 'promoCards', id));
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
}

export async function deletePromoCard(id) {
    await deleteDoc(doc(db, 'promoCards', id));
    allPromoCards = allPromoCards.filter(c => c.id !== id);
}

export async function updatePromoCardStatus(id, isActive) {
    await updateDoc(doc(db, 'promoCards', id), { isActive });
    const card = allPromoCards.find(c => c.id === id);
    if (card) {
        card.isActive = isActive;
    }
}

export async function savePromoCard(data, id) {
    if (id) {
        await updateDoc(doc(db, 'promoCards', id), data);
    } else {
        await addDoc(collection(db, 'promoCards'), data);
    }
    await forceReloadPromoCards();
}