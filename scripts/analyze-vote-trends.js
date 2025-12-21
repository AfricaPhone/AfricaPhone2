const fs = require('fs');
const path = require('path');

// Trouver le fichier d'export le plus récent
const exportDir = path.join(__dirname, '..', 'exports');
const files = fs.readdirSync(exportDir)
    .filter(f => f.startsWith('votes-artistes-full-export-') && f.endsWith('.json'))
    .sort()
    .reverse();

if (files.length === 0) {
    console.error("Aucun fichier d'export trouvé.");
    process.exit(1);
}

const latestExport = path.join(exportDir, files[0]);
console.log(`Analyse du fichier: ${files[0]}`);

const data = JSON.parse(fs.readFileSync(latestExport, 'utf8'));
const votes = data.votes || [];
const candidates = data.candidates || [];

console.log(`\nTotal votes: ${votes.length}`);
console.log(`Total candidats: ${candidates.length}`);

// 1. Analyse par candidat
console.log('\n=== CLASSEMENT PAR CANDIDAT ===');
const candidateStats = {};
candidates.forEach(c => {
    candidateStats[c.id] = {
        name: c.name,
        media: c.media || c.name,
        count: 0,
        amount: 0,
        id: c.id
    };
});

votes.forEach(v => {
    if (candidateStats[v.candidateId]) {
        const voteCount = Math.floor(v.amount / 100);
        candidateStats[v.candidateId].voteVolume = (candidateStats[v.candidateId].voteVolume || 0) + voteCount;
        candidateStats[v.candidateId].amount += v.amount;
    }
});

const sortedCandidates = Object.values(candidateStats).sort((a, b) => (b.voteVolume || 0) - (a.voteVolume || 0));
sortedCandidates.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} (${c.media}): ${c.voteVolume || 0} voix (${c.amount} XOF)`);
});

// 2. Analyse Temporelle (Votes par jour)
console.log('\n=== ÉVOLUTION DES VOTES PAR JOUR ===');
const votesByDay = {};

votes.forEach(v => {
    if (!v.createdAt) return;
    let dateStr = v.createdAt;
    if (typeof v.createdAt === 'object' && v.createdAt._seconds) {
        dateStr = new Date(v.createdAt._seconds * 1000).toISOString();
    }
    const date = dateStr.split('T')[0];

    if (!votesByDay[date]) votesByDay[date] = { count: 0, volume: 0, amount: 0 };

    const voteCount = Math.floor(v.amount / 100);
    votesByDay[date].count++;
    votesByDay[date].volume += voteCount;
    votesByDay[date].amount += v.amount;
});

const sortedDays = Object.keys(votesByDay).sort();
sortedDays.forEach(date => {
    const stats = votesByDay[date];
    console.log(`${date}: ${stats.volume} voix (${stats.count} tx) - ${stats.amount} XOF`);
});

// 3. Matrice Candidat / Jour (Top 5)
console.log('\n=== DÉTAIL TOP 5 CANDIDATS PAR JOUR ===');
const top5Candidates = sortedCandidates.slice(0, 5);
const matrix = {};

sortedDays.forEach(date => {
    matrix[date] = {};
    top5Candidates.forEach(c => matrix[date][c.id] = 0);
});

votes.forEach(v => {
    if (!v.createdAt) return;
    let dateStr = v.createdAt;
    if (typeof v.createdAt === 'object' && v.createdAt._seconds) {
        dateStr = new Date(v.createdAt._seconds * 1000).toISOString();
    }
    const date = dateStr.split('T')[0];

    // Check if within our sorted days (it should be)
    if (matrix[date] && matrix[date][v.candidateId] !== undefined) {
        const voteCount = Math.floor(v.amount / 100);
        matrix[date][v.candidateId] += voteCount;
    }
});

// Affichage tableau
const colWidth = 20;
const header = 'Date'.padEnd(12) + top5Candidates.map(c => c.media.substring(0, colWidth - 2).padEnd(colWidth)).join('|');
console.log('-'.repeat(header.length));
console.log(header);
console.log('-'.repeat(header.length));

sortedDays.forEach(date => {
    let row = date.padEnd(12);
    top5Candidates.forEach(c => {
        const val = (matrix[date][c.id] || 0).toString();
        row += val.padEnd(colWidth) + '|';
    });
    console.log(row);
});
