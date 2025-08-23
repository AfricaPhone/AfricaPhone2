// others/admin-panel/assets/js/views/matchesView.js
import { $, fmtDate, escapeHtml, escapeAttr, openModal, toast, setButtonLoading } from '../ui.js';
import * as matchesService from '../services/matchesService.js';

const $matchesContent = $('#matches-content');
let searchTerm = '';

async function renderMatchList() {
    $matchesContent.innerHTML = '<div class="skeleton" style="height:52px;margin-bottom:8px"></div>'.repeat(6);
    const allMatches = await matchesService.getMatches();
    $('#kpi-matches').textContent = String(allMatches.length);
    
    const term = searchTerm.toLowerCase();
    const arr = term ? allMatches.filter(m => 
        (m.teamA || '').toLowerCase().includes(term) ||
        (m.teamB || '').toLowerCase().includes(term) ||
        (m.competition || '').toLowerCase().includes(term)
    ) : allMatches;

    if (!arr.length) {
        $matchesContent.innerHTML = '<div class="center" style="padding:32px">Aucun match.</div>';
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
        <tbody id="tbody-matches"></tbody>`;
    const tb = table.querySelector('#tbody-matches');

    arr.forEach(m => {
        const date = m.startTime && m.startTime.toDate ? m.startTime.toDate() : (m.startTime ? new Date(m.startTime) : null);
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
        tr.querySelector('[data-edit]').addEventListener('click', () => location.hash = `#/edit-match/${m.id}`);
        tr.querySelector('[data-del]').addEventListener('click', () => handleDelete(m.id, `${m.teamA || ''} vs ${m.teamB || ''}`));
        tb.appendChild(tr);
    });
    $matchesContent.innerHTML = '';
    $matchesContent.appendChild(table);
}

async function renderMatchFormPage(id) {
    let m = {};
    if (id) {
        m = await matchesService.getMatch(id);
        if (!m) {
            $matchesContent.innerHTML = '<div class="center" style="padding:32px">Match introuvable.</div>';
            return;
        }
    }
    const start = m.startTime && m.startTime.toDate ? m.startTime.toDate() : (m.startTime ? new Date(m.startTime) : null);
    const startVal = start ? new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';

    const wrap = document.createElement('div');
    wrap.className = 'form-wrap';
    wrap.innerHTML = `
        <div class="form-head"><div class="form-title">${id ? 'Éditer' : 'Nouveau'} match</div></div>
        <form class="form-main" novalidate>
            <div class="twocol">
                <div class="field"><label class="label" for="m-competition">Compétition</label><input id="m-competition" class="input" type="text" value="${escapeAttr(m.competition || '')}" /></div>
                <div class="field"><label class="label" for="m-startTime">Date &amp; heure</label><input id="m-startTime" class="input" type="datetime-local" value="${startVal}" required /><div id="err-mstart" class="error hide"></div></div>
            </div>
            <div class="twocol">
                <div class="field"><label class="label" for="m-teamA">Équipe A</label><input id="m-teamA" class="input" type="text" value="${escapeAttr(m.teamA || '')}" required /></div>
                <div class="field"><label class="label" for="m-teamB">Équipe B</label><input id="m-teamB" class="input" type="text" value="${escapeAttr(m.teamB || '')}" required /></div>
            </div>
            <div class="twocol">
                <div class="field"><label class="label" for="m-logoA">Logo équipe A (URL)</label><input id="m-logoA" class="input" type="url" value="${escapeAttr(m.teamALogo || '')}" /></div>
                <div class="field"><label class="label" for="m-logoB">Logo équipe B (URL)</label><input id="m-logoB" class="input" type="url" value="${escapeAttr(m.teamBLogo || '')}" /></div>
            </div>
            <div class="twocol">
                <div class="field"><label class="label" for="m-scoreA">Score A (final)</label><input id="m-scoreA" class="input" type="number" min="0" step="1" value="${typeof m.finalScoreA === 'number' ? m.finalScoreA : ''}" /></div>
                <div class="field"><label class="label" for="m-scoreB">Score B (final)</label><input id="m-scoreB" class="input" type="number" min="0" step="1" value="${typeof m.finalScoreB === 'number' ? m.finalScoreB : ''}" /></div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn" data-cancel>Annuler</button>
                <button type="submit" class="btn btn-primary">${id ? 'Enregistrer' : 'Créer le match'}</button>
            </div>
        </form>`;
    $matchesContent.innerHTML = '';
    $matchesContent.appendChild(wrap);
    wrap.querySelector('[data-cancel]').addEventListener('click', () => { history.length > 1 ? history.back() : location.hash = '#/matches'; });
    wrap.querySelector('form').addEventListener('submit', (e) => handleMatchFormSubmit(e, id));
}

async function handleMatchFormSubmit(e, id) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);

    const startVal = $('#m-startTime').value;
    $('#err-mstart').classList.add('hide');
    if (!startVal) {
        $('#err-mstart').textContent = 'La date/heure est requise.';
        $('#err-mstart').classList.remove('hide');
        setButtonLoading(submitBtn, false);
        return;
    }
    
    const scoreA = $('#m-scoreA').value === '' ? null : parseInt($('#m-scoreA').value, 10);
    const scoreB = $('#m-scoreB').value === '' ? null : parseInt($('#m-scoreB').value, 10);

    const data = {
        competition: $('#m-competition').value.trim(),
        teamA: $('#m-teamA').value.trim(),
        teamB: $('#m-teamB').value.trim(),
        teamALogo: $('#m-logoA').value.trim() || null,
        teamBLogo: $('#m-logoB').value.trim() || null,
        finalScoreA: isNaN(scoreA) ? null : scoreA,
        finalScoreB: isNaN(scoreB) ? null : scoreB,
        startTime: new Date(startVal)
    };

    try {
        await matchesService.saveMatch(data, id);
        toast(`Match ${id ? 'mis à jour' : 'créé'}`, `${data.teamA} vs ${data.teamB}`, 'success');
        location.hash = '#/matches';
    } catch (err) {
        console.error(err);
        toast('Erreur', 'Enregistrement impossible', 'error');
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
        await matchesService.deleteMatch(id);
        toast('Match supprimé', '', 'success');
        renderMatchList();
    } catch (e) {
        console.error(e);
        toast('Erreur', 'Suppression impossible', 'error');
    }
}

export function initMatchesView() {
    $('#add-match').addEventListener('click', () => location.hash = '#/new-match');
    $('#search-matches').addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderMatchList();
    });
}