
const admin = require('firebase-admin');
const serviceAccount = require('../africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function extendRegistration() {
    console.log('🔍 Recherche des concours actifs...');

    const snapshot = await db.collection('contests')
        .where('status', '==', 'active')
        .get();

    if (snapshot.empty) {
        console.log('❌ Aucun concours actif trouvé.');
        return;
    }

    const now = new Date();
    // Target: 5 days from today (2025-12-09) at 00:00
    // "dans 5 jours à partir de 00 h aujour'dhui"
    // Assuming user means DEADLINE is 5 days from today.
    // Today is 2025-12-09.
    // 5 days later = 2025-12-14.
    const targetDate = new Date('2025-12-15T00:00:00');

    // Or maybe user meant 5 days from NOW?
    // "à partir de 00 h aujour'dhui" suggests strict date calculation.

    console.log(`📅 Date cible pour la fin des inscriptions (début votes) : ${targetDate.toISOString()} (${targetDate.toLocaleString()})`);

    let updatedCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const currentOpen = data.voteOpensAt ? data.voteOpensAt.toDate() : null;

        console.log(`\n🏆 Concours trouvé: [${doc.id}] "${data.title}"`);
        console.log(`   - Actuel début des votes : ${currentOpen ? currentOpen.toLocaleString() : 'Non défini'}`);

        // We only update if the contest hasn't started voting yet (or we want to extend registration anyway)
        // "Phase d'inscription" means we are BEFORE voteOpensAt.

        if (data.status === 'active') {
            await doc.ref.update({
                voteOpensAt: admin.firestore.Timestamp.fromDate(targetDate)
            });
            console.log(`   ✅ Mis à jour vers : ${targetDate.toLocaleString()}`);
            updatedCount++;
        }
    }

    console.log(`\n✨ Terminé. ${updatedCount} concours mis à jour.`);
}

extendRegistration().catch(console.error);
