const fs = require('fs');
const path = require('path');

// Date limite: 20/12/2025 00h00 Local (UTC+1) => 19/12/2025 23h00 UTC
const CUTOFF_DATE = new Date('2025-12-19T22:57:27.000Z'); // 23:57:27 Local (UTC+1)

const exportDir = path.join(__dirname, '..', 'exports');

// 1. Charger les votes perdus pour récupérer leurs vraies dates (si applicable, même si pour le 19 00h00 ils sont exclus car datant du 19 soir)
const lostVotesFile = path.join(exportDir, 'votes-artistes-lost-2025-12-20.json');
let realDates = {};
if (fs.existsSync(lostVotesFile)) {
    const lostVotes = JSON.parse(fs.readFileSync(lostVotesFile, 'utf8'));
    lostVotes.forEach(v => {
        if (v.transactionId && v.date) {
            realDates[v.transactionId] = new Date(v.date);
        }
    });
}

// 2. Charger l'export principal
const files = fs.readdirSync(exportDir)
    .filter(f => f.startsWith('votes-artistes-full-export-') && f.endsWith('.json'))
    .sort()
    .reverse();

if (files.length === 0) {
    console.error("Aucun fichier d'export trouvé.");
    process.exit(1);
}

const latestExport = path.join(exportDir, files[0]);
console.log(`Utilisation du fichier: ${files[0]}`);

const data = JSON.parse(fs.readFileSync(latestExport, 'utf8'));
const votes = data.votes || [];
const candidates = data.candidates || [];

// Initialiser les candidats
const candidateStats = {};
candidates.forEach(c => {
    candidateStats[c.id] = {
        name: c.name,
        media: c.media || c.name,
        votes: 0,
        amount: 0
    };
});

// Filtrer et compter les votes
let votesIncluded = 0;
let votesExcluded = 0;

votes.forEach(v => {
    let voteDate;

    if (v.transactionId && realDates[v.transactionId]) {
        voteDate = realDates[v.transactionId];
    } else if (v.createdAt) {
        if (typeof v.createdAt === 'string') {
            voteDate = new Date(v.createdAt);
        } else if (v.createdAt._seconds) {
            voteDate = new Date(v.createdAt._seconds * 1000);
        }
    }

    if (!voteDate) return;

    // Filter < cutoff
    if (voteDate <= CUTOFF_DATE) {
        if (candidateStats[v.candidateId]) {
            const voteCount = Math.floor(v.amount / 100);
            candidateStats[v.candidateId].votes += voteCount;
            candidateStats[v.candidateId].amount += v.amount;
            votesIncluded++;
        }
    } else {
        votesExcluded++;
    }
});

// Trier
const sortedCandidates = Object.values(candidateStats).sort((a, b) => b.votes - a.votes);

console.log(`\n=== CLASSEMENT AU 19/12/2025 23:57:27 ===`);
console.log(`Date limite utilisée (UTC): ${CUTOFF_DATE.toISOString()}`);
console.log(`Votes comptabilisés: ${votesIncluded}`);
console.log(`Votes exclus (postérieurs): ${votesExcluded}`);
console.log('--------------------------------------------------');

sortedCandidates.forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} (${c.media}) : ${c.votes} voix (${c.amount} XOF)`);
});
