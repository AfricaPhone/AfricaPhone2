const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const CONTEST_ID = 'votes-artistes';
const AFFAIRE_VOTE_DIR = path.join(__dirname, '..', 'Affaire Vote');
const LOST_VOTES_FILE = path.join(AFFAIRE_VOTE_DIR, 'rapport_votes_perdus_final.json');

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
            // Use 'name' or 'fullname' or 'firstName' + 'lastName', mostly likely 'name' or 'label'
            // Based on previous knowledge, it's usually 'name'.
            let name = data.name || data.fullname || data.label || 'Nom Inconnu';
            candidatesMap[doc.id] = name;
        });

        // 3. Aggregate and Map
        const report = {};

        lostVotes.forEach(vote => {
            const cid = vote.candidateId;
            const cName = candidatesMap[cid] || `ID: ${cid}`;
            const numVotes = Math.floor((vote.amount || 0) / 100);

            if (!report[cid]) {
                report[cid] = {
                    id: cid,
                    name: cName,
                    countTx: 0,
                    votes: 0,
                    amount: 0
                };
            }
            report[cid].countTx += 1;
            report[cid].votes += numVotes;
            report[cid].amount += vote.amount;
        });

        // 4. Sort and Display
        const sorted = Object.values(report).sort((a, b) => b.votes - a.votes);

        console.log('\n=== RAPPORT DES VOTES RETROUVÉS PAR CANDIDAT ===\n');

        // Prepare data for table
        const tableData = sorted.map(row => ({
            "Candidat": row.name,
            "Nombre Transactions": row.countTx,
            "Votes Retrouvés": row.votes,
            "Montant (FCFA)": row.amount
        }));

        console.table(tableData);

        // Output MD table string for easy copy-paste
        console.log('\n--- Format Markdown ---\n');
        console.log('| Candidat | Nombre Transations | Votes Retrouvés | Montant Recouvré (FCFA) |');
        console.log('| :--- | :---: | :---: | :---: |');
        sorted.forEach(row => {
            console.log(`| **${row.name}** | ${row.countTx} | **${row.votes}** | ${row.amount} |`);
        });
        console.log('\n-----------------------\n');

        // Save pretty JSON
        const outputPath = path.join(AFFAIRE_VOTE_DIR, 'rapport_votes_retrouves_avec_noms.json');
        fs.writeFileSync(outputPath, JSON.stringify(sorted, null, 2));
        console.log(`Rapport détaillé sauvegardé : ${outputPath}`);

    } catch (error) {
        console.error('Erreur:', error);
        process.exit(1);
    }
}

main();
