const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const MISSING_FILE = path.join(__dirname, '..', 'exports', 'kkiapay-transactions-missing-2025-12-20.json');

async function main() {
    const raw = fs.readFileSync(MISSING_FILE);
    const missing = JSON.parse(raw);

    console.log(`Analyzing ${missing.length} missing transactions...`);

    const results = [];

    for (const tx of missing) {
        const uid = tx.partnerId; // Suspected UID
        console.log(`\nChecking User: ${uid} (Tx: ${tx.transactionId})`);

        // 1. Try to find any successful vote by this user
        const intentsSnap = await db.collection('voteIntents')
            .where('userId', '==', uid)
            // .orderBy('createdAt', 'desc') // Removed to avoid index requirement
            .limit(5)
            .get();

        if (intentsSnap.empty) {
            console.log('  -> No other intents found for this user.');
            results.push({ ...tx, probableCandidate: null, probableIndication: 'No history' });
            continue;
        }

        const candidates = new Set();
        intentsSnap.forEach(doc => {
            const data = doc.data();
            candidates.add(data.candidateId);
            console.log(`  -> Found history: Candidate ${data.candidateId} (Status: ${data.status})`);
        });

        if (candidates.size === 1) {
            const candidateId = [...candidates][0];
            console.log(`  => ACTION: Likely vote for ${candidateId}`);
            results.push({ ...tx, probableCandidate: candidateId, probableIndication: 'Single candidate history' });
        } else {
            console.log(`  => Ambiguous: Voted for multiple candidates: ${[...candidates].join(', ')}`);
            results.push({ ...tx, probableCandidate: null, probableIndication: 'Multiple candidates' });
        }
    }

    const newPath = path.join(__dirname, '..', 'exports', 'kkiapay-missing-with-candidates.json');
    fs.writeFileSync(newPath, JSON.stringify(results, null, 2));
    console.log(`\nSaved analysis to ${newPath}`);
}

main();
