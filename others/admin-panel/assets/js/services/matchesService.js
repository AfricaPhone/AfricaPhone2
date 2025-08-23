// others/admin-panel/assets/js/services/matchesService.js
import { db } from '../../../firebase-config.js';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// State local pour cacher les matchs
let allMatches = [];

/**
 * Force le rechargement des matchs depuis Firestore.
 */
async function forceReloadMatches() {
    const q = query(collection(db, 'matches'), orderBy('startTime', 'desc'));
    const snap = await getDocs(q);
    allMatches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return allMatches;
}

/**
 * Récupère tous les matchs, depuis le cache si possible, sinon depuis Firestore.
 */
export async function getMatches() {
    if (allMatches.length) {
        return allMatches;
    }
    return await forceReloadMatches();
}

/**
 * Récupère un match spécifique par son ID.
 */
export async function getMatch(id) {
    const cached = allMatches.find(m => m.id === id);
    if (cached) return cached;

    const matchDoc = await getDoc(doc(db, 'matches', id));
    if (matchDoc.exists()) {
        return { id: matchDoc.id, ...matchDoc.data() };
    }
    return null;
}

/**
 * Supprime un match de Firestore et met à jour le cache local.
 * @param {string} id - L'ID du match à supprimer.
 */
export async function deleteMatch(id) {
    await deleteDoc(doc(db, 'matches', id));
    allMatches = allMatches.filter(m => m.id !== id);
}

/**
 * Sauvegarde un match (création ou mise à jour).
 * @param {object} data - Les données du match.
 * @param {string|null} id - L'ID du match pour une mise à jour, ou null pour une création.
 */
export async function saveMatch(data, id) {
    if (id) {
        await updateDoc(doc(db, 'matches', id), data);
    } else {
        await addDoc(collection(db, 'matches'), data);
    }
    // Forcer le rechargement pour avoir la liste à jour
    await forceReloadMatches();
}