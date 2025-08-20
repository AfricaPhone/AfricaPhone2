// js/pages/matches.js
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { db } from '../firebase.js';
import { escapeAttr, escapeHtml, fmtDate, openModal, setButtonLoading, toast } from '../ui.js';

const $ = sel => document.querySelector(sel);
const $content = $('#content');

let allMatches = [];

async function ensureMatchesLoaded() {
    if (allMatches.length) return;
    $content.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(6);
    const q = query(collection(db, 'matches'), orderBy('startTime', 'desc'));
    const snap = await getDocs(q);
    allMatches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $('#kpi-matches').textContent = String(allMatches.length);
}

async function handleDelete(id, name) {
    const ok = await openModal({
        title: 'Supprimer Match',
        body: `Êtes-vous sûr de vouloir supprimer le match "<strong>${escapeHtml(name || id)}</strong>" ?`,
        okText: 'Supprimer',
        danger: true
    });
    if (!ok) return;
    try {
        await deleteDoc(doc(db, 'matches', id));
        allMatches = allMatches.filter(m => m.id !== id);
        renderMatchList();
        $('#kpi-matches').textContent = String(allMatches.length);
        toast('Match supprimé', '', 'success');
    } catch (e) {
        console.error(e);
        toast('Erreur', 'Suppression impossible', 'error');
    }
}

function renderMatchList() {
    const term = ($('#search-matches')?.value || '').toLowerCase();
    const arr = term ? allMatches.filter(m =>
        (m.teamA || '').toLowerCase().includes(term) ||
        (m.teamB || '').toLowerCase().includes(term) ||
        (m.competition || '').toLowerCase().includes(term)
    ) : [...allMatches];

    if (!arr.length) {
        $content.innerHTML = '<div class="center" style="padding:32px">Aucun match trouvé.</div>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Affiche</th>
                <th>Compétition</th>
                <th>Date</th>
                <th style="width:180px;text-align:right">Actions</th>
            </tr>
        </thead>
        <tbody></tbody>`;
    const tb = table.querySelector('tbody');
    arr.forEach(m => {
        const date = m.startTime?.toDate ? m.startTime.toDate() : null;
        const finalScore = (typeof m.finalScoreA === 'number' && typeof m.finalScoreB === 'number') ? `${m.finalScoreA} - ${m.finalScoreB}` : '';
        const tr = document.createElement('tr');
        tr.dataset.id = m.id;
        tr.innerHTML = `
            <td style="font-weight:800">${escapeHtml(m.teamA || 'Équipe A')} vs ${escapeHtml(m.teamB || 'Équipe B')}</td>
            <td>${escapeHtml(m.competition || '—')}</td>
            <td>${date ? fmtDate(date) : '—'}</td>
            <td class="actions">
                <span class="badge ${finalScore ? 'success' : ''}">${finalScore || 'À jouer'}</span>
                <button class="btn btn-small" data-edit>Éditer</button>
                <button class="btn btn-danger btn-small" data-del>Supprimer</button>
            </td>`;
        tr.querySelector('[data-edit]').onclick = () => location.hash = `#/edit-match/${m.id}`;
        tr.querySelector('[data-del]').onclick = () => handleDelete(m.id, `${m.teamA} vs ${m.teamB}`);
        tb.appendChild(tr);
    });
    $content.innerHTML = '';
    $content.appendChild(table);
    lucide.createIcons();
}

async function handleMatchFormSubmit(e, id) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);

    const data = {
        competition: $('#m-competition').value.trim(),
        teamA: $('#m-teamA').value.trim(),
        teamB: $('#m-teamB').value.trim(),
        teamALogo: $('#m-logoA').value.trim() || null,
        teamBLogo: $('#m-logoB').value.trim() || null,
        finalScoreA: $('#m-scoreA').value === '' ? null : parseInt($('#m-scoreA').value, 10),
        finalScoreB: $('#m-scoreB').value === '' ? null : parseInt($('#m-scoreB').value, 10),
        startTime: new Date($('#m-startTime').value),
    };

    if (!data.startTime || !data.teamA || !data.teamB) {
        toast('Erreur', 'Les équipes et la date sont requises.', 'error');
        setButtonLoading(submitBtn, false);
        return;
    }

    try {
        if (id) {
            await updateDoc(doc(db, 'matches', id), data);
            const index = allMatches.findIndex(m => m.id === id);
            if (index > -1) allMatches[index] = { id, ...data };
            toast('Match mis à jour', `${data.teamA} vs ${data.teamB}`, 'success');
        } else {
            const docRef = await addDoc(collection(db, 'matches'), data);
            allMatches.unshift({ id: docRef.id, ...data });
            $('#kpi-matches').textContent = String(allMatches.length);
            toast('Match créé', `${data.teamA} vs ${data.teamB}`, 'success');
        }
        location.hash = '#/matches';
    } catch (err) {
        console.error(err);
        toast('Erreur', 'Enregistrement impossible', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

export async function renderMatchFormPage(id) {
    let m = {};
    if (id) {
        m = allMatches.find(x => x.id === id) || (await getDoc(doc(db, 'matches', id)).then(s => s.exists() ? { id: s.id, ...s.data() } : null));
        if (!m) {
            $content.innerHTML = '<div class="center" style="padding:32px">Match introuvable.</div>';
            return;
        }
    }
    const start = m.startTime?.toDate ? m.startTime.toDate() : null;
    const startVal = start ? new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';

    $content.innerHTML = `
        <div class="form-wrap">
            <div class="form-head"><div class="form-title">${id ? 'Éditer' : 'Nouveau'} match</div></div>
            <form class="form-main" novalidate>
                <div class="twocol">
                    <div class="field">
                        <label class="label" for="m-competition">Compétition</label>
                        <input id="m-competition" class="input" type="text" value="${escapeAttr(m.competition || '')}" />
                    </div>
                    <div class="field">
                        <label class="label" for="m-startTime">Date & heure</label>
                        <input id="m-startTime" class="input" type="datetime-local" value="${startVal}" required />
                    </div>
                </div>
                <div class="twocol">
                    <div class="field">
                        <label class="label" for="m-teamA">Équipe A</label>
                        <input id="m-teamA" class="input" type="text" value="${escapeAttr(m.teamA || '')}" required />
                    </div>
                    <div class="field">
                        <label class="label" for="m-teamB">Équipe B</label>
                        <input id="m-teamB" class="input" type="text" value="${escapeAttr(m.teamB || '')}" required />
                    </div>
                </div>
                <div class="twocol">
                    <div class="field">
                        <label class="label" for="m-logoA">Logo équipe A (URL)</label>
                        <input id="m-logoA" class="input" type="url" value="${escapeAttr(m.teamALogo || '')}" />
                    </div>
                    <div class="field">
                        <label class="label" for="m-logoB">Logo équipe B (URL)</label>
                        <input id="m-logoB" class="input" type="url" value="${escapeAttr(m.teamBLogo || '')}" />
                    </div>
                </div>
                <div class="twocol">
                    <div class="field">
                        <label class="label" for="m-scoreA">Score A (final)</label>
                        <input id="m-scoreA" class="input" type="number" min="0" step="1" value="${typeof m.finalScoreA === 'number' ? m.finalScoreA : ''}" />
                    </div>
                    <div class="field">
                        <label class="label" for="m-scoreB">Score B (final)</label>
                        <input id="m-scoreB" class="input" type="number" min="0" step="1" value="${typeof m.finalScoreB === 'number' ? m.finalScoreB : ''}" />
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn" data-cancel>Annuler</button>
                    <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Créer le match'}</button>
                </div>
            </form>
        </div>`;
    $('[data-cancel]').onclick = () => location.hash = '#/matches';
    $('form').onsubmit = e => handleMatchFormSubmit(e, id);
}

export async function initMatchesPage() {
    await ensureMatchesLoaded();
    renderMatchList();
    $('#search-matches')?.addEventListener('input', renderMatchList);
}
