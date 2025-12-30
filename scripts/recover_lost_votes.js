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
            console.log(`Using service account: ${fileName}`);
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
        const app = initAdmin();
        const db = admin.firestore();

        // 1. Load Lost Votes
        if (!fs.existsSync(LOST_VOTES_FILE)) {
            console.error('Fichier de votes perdus introuvable.');
            process.exit(1);
        }
        const lostVotes = JSON.parse(fs.readFileSync(LOST_VOTES_FILE, 'utf8'));

        console.log(`\n=== RÉCUPÉRATION DE ${lostVotes.length} VOTES PERDUS ===\n`);

        let successCount = 0;
        let failCount = 0;

        // 2. Process each vote
        for (const vote of lostVotes) {
            const { transactionId, partnerId, amount, candidateId } = vote;
            const contestId = vote.contestId || CONTEST_ID;

            console.log(`Traitement: Tx=${transactionId} | Intent=${partnerId} | Candidat=${candidateId}`);

            try {
                await db.runTransaction(async (t) => {
                    // References
                    const intentRef = db.collection('voteIntents').doc(partnerId);
                    const voteRef = db.collection('contests').doc(contestId).collection('votes').doc(transactionId);
                    const candidateRef = db.collection('contests').doc(contestId).collection('candidates').doc(candidateId);
                    const contestRef = db.collection('contests').doc(contestId);

                    // Reads
                    const intentDoc = await t.get(intentRef);
                    const voteDoc = await t.get(voteRef);

                    if (!intentDoc.exists) {
                        throw new Error(`Intent ${partnerId} n'existe plus!`);
                    }

                    const intentData = intentDoc.data();
                    if (intentData.status === 'counted') {
                        console.log(`  -> Déjà compté. Ignore.`);
                        return; // Already processed
                    }

                    if (voteDoc.exists) {
                        console.log(`  -> Vote doc existe déjà. Ignore.`);
                        return;
                    }

                    // Calculations
                    const votesToAdd = Math.floor(amount / 100);

                    // Writes
                    // 1. Create Vote Doc
                    t.set(voteRef, {
                        transactionId: transactionId,
                        userId: intentData.userId || 'guest',
                        candidateId: candidateId,
                        contestId: contestId,
                        amount: amount,
                        counted: true,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        recovered: true, // Marker for recovered votes
                        recoveredAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    // 2. Mark Intent Counted
                    t.update(intentRef, {
                        status: 'counted',
                        transactionId: transactionId,
                        countedAt: admin.firestore.FieldValue.serverTimestamp(),
                        recovered: true
                    });

                    // 3. Increment Candidate
                    t.update(candidateRef, {
                        voteCount: admin.firestore.FieldValue.increment(votesToAdd)
                    });

                    // 4. Increment Contest
                    t.update(contestRef, {
                        totalVotes: admin.firestore.FieldValue.increment(votesToAdd)
                    });
                });

                console.log(`  ✅ Succès!`);
                successCount++;

            } catch (err) {
                console.error(`  ❌ Erreur: ${err.message}`);
                failCount++;
            }
        }

        console.log('\n=== RÉSULTATS ===');
        console.log(`Succès: ${successCount}`);
        console.log(`Échecs/Ignorés: ${failCount}`);

    } catch (error) {
        console.error('Erreur globale:', error);
        process.exit(1);
    }
}

main();
