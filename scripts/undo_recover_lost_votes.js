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

        // 1. Load Lost Votes (the ones we just recovered)
        if (!fs.existsSync(LOST_VOTES_FILE)) {
            console.error('Fichier de votes perdus introuvable.');
            process.exit(1);
        }
        const lostVotes = JSON.parse(fs.readFileSync(LOST_VOTES_FILE, 'utf8'));

        console.log(`\n=== ANNULATION DE LA RÉCUPÉRATION (${lostVotes.length} votes) ===\n`);

        let successCount = 0;
        let failCount = 0;

        // 2. Process each vote to UNDO
        for (const vote of lostVotes) {
            const { transactionId, partnerId, amount, candidateId } = vote;
            const contestId = vote.contestId || CONTEST_ID;

            console.log(`Annulation: Tx=${transactionId} | Intent=${partnerId}`);

            try {
                await db.runTransaction(async (t) => {
                    // References
                    const intentRef = db.collection('voteIntents').doc(partnerId);
                    const voteRef = db.collection('contests').doc(contestId).collection('votes').doc(transactionId);
                    const candidateRef = db.collection('contests').doc(contestId).collection('candidates').doc(candidateId);
                    const contestRef = db.collection('contests').doc(contestId);

                    // Reads
                    const voteDoc = await t.get(voteRef);
                    const intentDoc = await t.get(intentRef);

                    // Safety Checks
                    if (!voteDoc.exists) {
                        console.log(`  -> Vote doc n'existe pas. Déjà annulé?`);
                        return;
                    }
                    const voteData = voteDoc.data();
                    if (!voteData.recovered) {
                        console.log(`  -> Attention: Ce vote n'est pas marqué 'recovered'. Touche pas par précaution.`);
                        return;
                    }

                    // Calculations
                    const votesToRemove = Math.floor(amount / 100);

                    // Writes (Undo actions)

                    // 1. Delete Vote Doc
                    t.delete(voteRef);

                    // 2. Revert Intent to Pending
                    t.update(intentRef, {
                        status: 'pending',
                        transactionId: admin.firestore.FieldValue.delete(),
                        countedAt: admin.firestore.FieldValue.delete(),
                        recovered: admin.firestore.FieldValue.delete()
                    });

                    // 3. Decrement Candidate
                    t.update(candidateRef, {
                        voteCount: admin.firestore.FieldValue.increment(-votesToRemove)
                    });

                    // 4. Decrement Contest
                    t.update(contestRef, {
                        totalVotes: admin.firestore.FieldValue.increment(-votesToRemove)
                    });
                });

                console.log(`  ✅ Annulation réussie.`);
                successCount++;

            } catch (err) {
                console.error(`  ❌ Erreur: ${err.message}`);
                failCount++;
            }
        }

        console.log('\n=== RÉSULTATS ANNULATION ===');
        console.log(`Annulés: ${successCount}`);
        console.log(`Échecs/Ignorés: ${failCount}`);

    } catch (error) {
        console.error('Erreur globale:', error);
        process.exit(1);
    }
}

main();
