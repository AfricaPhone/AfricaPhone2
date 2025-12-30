const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const CONTEST_ID = 'votes-artistes';
const AFFAIRE_VOTE_DIR = path.join(__dirname, '..', 'Affaire Vote');
const LOST_VOTES_FILE = path.join(AFFAIRE_VOTE_DIR, 'rapport_votes_perdus_final.json');
const OUTPUT_FILE = path.join(AFFAIRE_VOTE_DIR, 'rapport_general_consolide.md');

// Initialize Firebase Admin
function initAdmin() {
    if (admin.apps.length > 0) return admin;

    const possiblePaths = [
        'africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json',
        'africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json',
    ];

    let credentials = null;
    for (const fileName of possiblePaths) {
        try {
            const filePath = path.join(process.cwd(), fileName);
            credentials = require(filePath);
            break;
        } catch (e) { }
    }

    if (!credentials) {
        throw new Error('No service account file found!');
    }

    admin.initializeApp({
        credential: admin.credential.cert(credentials),
    });
    return admin;
}

function formatMoney(amount) {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
}

async function main() {
    try {
        initAdmin();
        const db = admin.firestore();

        console.log('--- GÉNÉRATION DU RAPPORT CONSOLIDÉ (v2) ---\n');

        // 1. Fetch Official Firebase Data
        console.log('1. Récupération des données officielles...');
        const contestDoc = await db.collection('contests').doc(CONTEST_ID).get();
        if (!contestDoc.exists) throw new Error("Concours introuvable");
        const contestData = contestDoc.data();

        // Fetch Candidates
        const candidatesSnap = await db.collection('contests').doc(CONTEST_ID).collection('candidates').get();

        // Fetch ALL counted votes from Firestore
        const votesSnap = await db.collection('contests').doc(CONTEST_ID).collection('votes').get();

        // 2. Load Lost Votes (Virtual Data)
        console.log('2. Chargement des votes perdus...');
        let lostVotes = [];
        if (fs.existsSync(LOST_VOTES_FILE)) {
            lostVotes = JSON.parse(fs.readFileSync(LOST_VOTES_FILE, 'utf8'));
        }

        // 3. Data Merging & Aggregation
        console.log('3. Consolidation des données...');

        const candidatesMap = {}; // ID -> { name, officialVotes, lostVotes, totalVotes, officialTx, lostTx, totalTx, officialAmount, lostAmount, totalAmount }

        // Initialize with Official Candidates Data
        candidatesSnap.forEach(doc => {
            const data = doc.data();
            candidatesMap[doc.id] = {
                id: doc.id,
                name: data.name || data.fullname || data.label || 'Nom Inconnu',
                officialVotes: data.voteCount || 0, // Using the counter from candidate doc
                totalVotes: data.voteCount || 0,     // Will add lost votes later, but for now init with official
                officialTx: 0,
                totalTx: 0,
                officialAmount: 0,
                totalAmount: 0
            };
        });

        // Process Official Votes to get Tx count and Amount
        votesSnap.forEach(doc => {
            const v = doc.data();
            const cid = v.candidateId;
            if (candidatesMap[cid]) {
                candidatesMap[cid].officialTx += 1;
                candidatesMap[cid].totalTx += 1;
                candidatesMap[cid].officialAmount += (v.amount || 0);
                candidatesMap[cid].totalAmount += (v.amount || 0);
            }
        });

        // Process Lost Votes
        lostVotes.forEach(v => {
            const cid = v.candidateId;
            if (candidatesMap[cid]) {
                const numVotes = Math.floor((v.amount || 0) / 100);
                // Be careful not to double count if we ran recovery already?
                // The script assumes we haven't run recovery yet (or reverted it).
                // If we reverted, then official counters are back to pre-recovery state.

                candidatesMap[cid].totalVotes += numVotes;
                candidatesMap[cid].totalTx += 1;
                candidatesMap[cid].totalAmount += (v.amount || 0);
            }
        });

        // Global Stats
        const candidateList = Object.values(candidatesMap).sort((a, b) => b.totalVotes - a.totalVotes);

        const globalStats = {
            totalCandidates: candidateList.length,
            totalVotesConsolidated: 0,
            totalTxConsolidated: 0,
            totalAmountConsolidated: 0
        };

        // Calculate Totals
        candidateList.forEach(c => {
            globalStats.totalVotesConsolidated += c.totalVotes;
            globalStats.totalTxConsolidated += c.totalTx;
            globalStats.totalAmountConsolidated += c.totalAmount;
        });

        // 4. Generate Markdown Report
        const dateStr = new Date().toLocaleDateString('fr-FR');

        let md = `# RAPPORT GÉNÉRAL DU CONCOURS\n\n`;
        md += `**Concours :** ${contestData.title || CONTEST_ID}\n`;
        md += `**Période :** Du 14 décembre au 29 décembre 2025\n`;
        md += `**Date du rapport :** ${dateStr}\n\n`;

        md += `## Statistiques Globales\n\n`;
        md += `- **Nombre de candidats :** ${globalStats.totalCandidates}\n`;
        md += `- **Nombre total de transactions :** ${globalStats.totalTxConsolidated}\n`;
        md += `- **Nombre total de votes :** ${globalStats.totalVotesConsolidated}\n`;
        md += `- **Montant total collecté :** ${formatMoney(globalStats.totalAmountConsolidated)}\n\n`;

        md += `## Récapitulatif par Candidat\n\n`;
        md += `| Rang | Candidat | Transactions | Votes | Montant |\n`;
        md += `| :--- | :--- | :---: | :---: | :---: |\n`;

        candidateList.forEach((c, index) => {
            md += `| ${index + 1} | **${c.name}** | ${c.totalTx} | **${c.totalVotes}** | ${formatMoney(c.totalAmount)} |\n`;
        });

        // Write File
        fs.writeFileSync(OUTPUT_FILE, md, 'utf8');

        // Console Output (Top 5)
        console.log(`\nRAPPORT GÉNÉRAL (Top 5):\n`);
        console.table(candidateList.slice(0, 5).map((c, i) => ({
            "Rang": i + 1,
            "Candidat": c.name,
            "Transactions": c.totalTx,
            "Votes": c.totalVotes,
            "Montant": c.totalAmount
        })));

        console.log(`\nRapport complet sauvegardé : ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('Erreur:', error);
        process.exit(1);
    }
}

main();
