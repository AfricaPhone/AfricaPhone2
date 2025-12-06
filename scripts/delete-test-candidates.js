const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteTestCandidates() {
    const contestId = 'votes-artistes';

    console.log('\n=== SUPPRESSION DES CANDIDATS TESTS ===\n');

    const candidatesRef = db.collection('contests').doc(contestId).collection('candidates');
    const snapshot = await candidatesRef.get();

    if (snapshot.empty) {
        console.log('Aucun candidat trouvé.');
        return;
    }

    console.log(`Candidats à supprimer: ${snapshot.size}`);

    const batch = db.batch();

    for (const doc of snapshot.docs) {
        const candidate = doc.data();
        console.log(`🗑️  Suppression: ${candidate.media || candidate.name} (ID: ${doc.id})`);
        batch.delete(doc.ref);
    }

    await batch.commit();
    console.log('\n✅ Tous les candidats tests ont été supprimés.');

    // Verify
    const verifySnapshot = await candidatesRef.get();
    console.log(`\nVérification: ${verifySnapshot.size} candidat(s) restant(s).`);
}

deleteTestCandidates()
    .then(() => {
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Erreur:', err);
        process.exit(1);
    });
