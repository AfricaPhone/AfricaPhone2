const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const CONTEST_ID = 'votes-artistes';
const AFFAIRE_VOTE_DIR = path.join(__dirname, '..', 'Affaire Vote');
const LOST_VOTES_FILE = path.join(AFFAIRE_VOTE_DIR, 'rapport_votes_perdus_final.json');
const OUTPUT_FILE = path.join(AFFAIRE_VOTE_DIR, 'rapport_detaille_votes_retrouves.md');

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

function formatDate(isoString) {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        // Format: 19/12/2025 à 21h52
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} à ${hours}h${minutes}`;
    } catch (e) {
        return isoString;
    }
}

async function main() {
    try {
        initAdmin();
        const db = admin.firestore();

        // 1. Load Lost Votes
        if (!fs.existsSync(LOST_VOTES_FILE)) {
            console.error('Fichier de votes perdus introuvable.');
            process.exit(1);
        }
        const lostVotes = JSON.parse(fs.readFileSync(LOST_VOTES_FILE, 'utf8'));

        // 2. Fetch Candidates
        console.log('Récupération des candidats...');
        const candidatesSnap = await db.collection('contests').doc(CONTEST_ID).collection('candidates').get();
        const candidatesMap = {}; // ID -> Name
        candidatesSnap.forEach(doc => {
            const data = doc.data();
            let name = data.name || data.fullname || data.label || 'Nom Inconnu';
            candidatesMap[doc.id] = name;
        });

        // 3. Group by Candidate
        const grouped = {};

        lostVotes.forEach(vote => {
            const cid = vote.candidateId;
            const cName = candidatesMap[cid] || `ID: ${cid}`;

            if (!grouped[cid]) {
                grouped[cid] = {
                    id: cid,
                    name: cName,
                    votes: [],
                    totalVotes: 0,
                    totalAmount: 0,
                    countTx: 0
                };
            }

            const numVotes = Math.floor((vote.amount || 0) / 100);

            grouped[cid].votes.push({
                customer: vote.customer || 'Anonyme',
                amount: vote.amount || 0,
                numVotes: numVotes,
                date: vote.date
            });

            grouped[cid].totalVotes += numVotes;
            grouped[cid].totalAmount += (vote.amount || 0);
            grouped[cid].countTx += 1;
        });

        const sortedCandidates = Object.values(grouped).sort((a, b) => b.totalVotes - a.totalVotes);

        // 4. Update Summary Data
        let grandTotalTx = 0;
        let grandTotalVotes = 0;
        let grandTotalAmount = 0;

        // 5. Generate Markdown Content
        let md = `# VOTES RETROUVÉS - ${new Date().toLocaleDateString('fr-FR')}\n\n`;
        md += `Regroupés par candidat\n\n`;

        sortedCandidates.forEach((c, index) => {
            md += `### ${index + 1}. ${c.name}\n`;
            md += `${c.totalVotes} votes retrouvés\n\n`;

            md += `| Votant | Montant | Votes | Date & Heure |\n`;
            md += `| :--- | :---: | :---: | :--- |\n`;

            c.votes.forEach(v => {
                md += `| ${v.customer} | ${v.amount} XOF | ${v.numVotes} | ${formatDate(v.date)} |\n`;
            });
            md += `\n`;

            grandTotalTx += c.countTx;
            grandTotalVotes += c.totalVotes;
            grandTotalAmount += c.totalAmount;
        });

        md += `### RÉCAPITULATIF\n\n`;
        md += `| Candidat | Transactions | Votes retrouvés | Montant |\n`;
        md += `| :--- | :---: | :---: | :---: |\n`;

        sortedCandidates.forEach(c => {
            md += `| ${c.name} | ${c.countTx} | ${c.totalVotes} | ${c.totalAmount} XOF |\n`;
        });

        md += `| **TOTAL** | **${grandTotalTx}** | **${grandTotalVotes}** | **${grandTotalAmount} XOF** |\n`;

        // 6. Write File
        fs.writeFileSync(OUTPUT_FILE, md, 'utf8');
        console.log(md);
        console.log(`\nRapport sauvegardé dans: ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('Erreur:', error);
        process.exit(1);
    }
}

main();
