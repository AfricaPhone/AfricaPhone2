const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function getActiveContest() {
    console.log('\n=== CONCOURS ACTIFS ===\n');

    const contestsRef = db.collection('contests');
    const snapshot = await contestsRef.where('status', '==', 'active').get();

    if (snapshot.empty) {
        console.log('Aucun concours actif trouvé.');
        return;
    }

    for (const doc of snapshot.docs) {
        const contest = doc.data();
        console.log(`📌 CONCOURS: ${contest.title || doc.id}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Description: ${contest.description || 'N/A'}`);
        console.log(`   Status: ${contest.status}`);
        console.log(`   Total Votes: ${contest.totalVotes || 0}`);
        console.log(`   Date de fin: ${contest.endDate?.toDate?.() || contest.endDate || 'N/A'}`);
        console.log('');

        // Get candidates
        const candidatesRef = db.collection('contests').doc(doc.id).collection('candidates');
        const candidatesSnapshot = await candidatesRef.orderBy('voteCount', 'desc').get();

        console.log(`   📋 CANDIDATS (${candidatesSnapshot.size}):`);
        console.log('   ' + '-'.repeat(60));

        let rank = 1;
        for (const candidateDoc of candidatesSnapshot.docs) {
            const candidate = candidateDoc.data();
            const displayName = candidate.media || candidate.name || 'Inconnu';
            console.log(`   ${rank}. ${displayName}`);
            console.log(`      - Nom complet: ${candidate.name || 'N/A'}`);
            console.log(`      - Nom d'artiste (media): ${candidate.media || 'N/A'}`);
            console.log(`      - Votes: ${candidate.voteCount || 0}`);
            console.log(`      - Photo: ${candidate.photoUrl ? 'Oui' : 'Non'}`);
            console.log('');
            rank++;
        }
    }
}

getActiveContest()
    .then(() => {
        console.log('✅ Requête terminée');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Erreur:', err);
        process.exit(1);
    });
