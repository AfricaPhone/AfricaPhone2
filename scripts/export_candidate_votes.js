const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const CONTEST_ID = 'votes-artistes';
const CANDIDATE_ID = 'GEVWzgnMyTnavWjEa6pg'; // MOUKOUNKOUN MAYASOU
const TARGET_TX_ID = '3249781445677467'; // The transaction linked to intent xj9z...
const OUTPUT_FILE = path.join(__dirname, '..', 'Affaire Vote', 'rapport_votes_moukounkoun.md');

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

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('fr-FR');
}

async function main() {
    try {
        initAdmin();
        const db = admin.firestore();

        console.log(`Récupération des votes pour le candidat : ${CANDIDATE_ID}...`);

        // 1. Fetch Candidate Name
        const candidateDoc = await db.collection('contests').doc(CONTEST_ID).collection('candidates').doc(CANDIDATE_ID).get();
        const candidateName = candidateDoc.exists ? (candidateDoc.data().name || 'Inconnu') : 'Inconnu';
        console.log(`Candidat identifié : ${candidateName}`);

        // 2. Fetch Votes
        const votesSnap = await db.collection('contests').doc(CONTEST_ID).collection('votes')
            .where('candidateId', '==', CANDIDATE_ID)
            .get();

        console.log(`${votesSnap.size} votes trouvés.`);

        // 3. Enrich Data (Fetch Payment/Intent info for Voter Name)
        let detailedVotes = []; // Changed to let to allow sorting reassignment if needed

        // We will try to fetch payment details for better voter info
        for (const doc of votesSnap.docs) {
            const vote = doc.data();
            const txId = vote.transactionId || doc.id;

            let voterName = 'Anonyme';
            let phone = '';

            // Try to find payment info
            if (txId) {
                const paymentDoc = await db.collection('payments').doc(txId).get();
                if (paymentDoc.exists) {
                    const p = paymentDoc.data();

                    // Logic to extract name from various possible locations
                    const client = p.verification?.client || p.client || {};
                    const fromVerification = client.fullname || client.customer_name || client.name;
                    const fromRoot = p.customerName || p.fullname || p.customer_name;

                    if (fromVerification) {
                        voterName = fromVerification;
                    } else if (fromRoot) {
                        voterName = fromRoot;
                    }

                    if (client.phone) phone = client.phone;
                    else if (p.customerPhone) phone = p.customerPhone;
                }
            }

            // If name is still Anonyme but we have phone, use phone
            if (voterName === 'Anonyme' && phone) {
                voterName = `Tel: ${phone}`;
            }

            detailedVotes.push({
                date: vote.createdAt,
                amount: vote.amount || 0,
                votes: Math.floor((vote.amount || 0) / 100), // Assuming 100 FCFA/vote
                transactionId: txId,
                voterName: voterName,
                isTarget: (txId === TARGET_TX_ID)
            });
        }

        // Sort in memory (Oldest first for Cumulative count)
        detailedVotes.sort((a, b) => {
            const dateA = a.date && a.date.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
            const dateB = b.date && b.date.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
            return dateA - dateB; // ASCENDING
        });

        // 4. Generate Report
        let md = `# LISTE DES VOTANT POUR : ${candidateName.toUpperCase()}\n\n`;
        md += `**Total votes (base) :** ${detailedVotes.reduce((acc, v) => acc + v.votes, 0)}\n`;
        md += `**Date rapport :** ${new Date().toLocaleDateString('fr-FR')}\n\n`;
        md += `> **Note :** La transaction recherchée (${TARGET_TX_ID}) est mise en évidence.\n\n`;

        md += `| Date & Heure | Nom complet | Transaction ID | Montant | Votes | Cumul |\n`;
        md += `| :--- | :--- | :--- | :---: | :---: | :---: |\n`;

        let cumulate = 0;
        detailedVotes.forEach(v => {
            cumulate += v.votes; // Add current votes to total

            const marker = v.isTarget ? ' **(ICI)**' : '';
            const dateStr = formatDate(v.date);

            if (v.isTarget) {
                md += `| **${dateStr}** | **${v.voterName}** | **${v.transactionId}** 👈 | **${v.amount} FCFA** | **${v.votes}** | **${cumulate}** |\n`;
            } else {
                md += `| ${dateStr} | ${v.voterName} | ${v.transactionId} | ${v.amount} FCFA | ${v.votes} | ${cumulate} |\n`;
            }
        });

        fs.writeFileSync(OUTPUT_FILE, md, 'utf8');
        console.log(`Rapport généré : ${OUTPUT_FILE}`);

    } catch (error) {
        console.error('Erreur:', error);
    }
}

main();
