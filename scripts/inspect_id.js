const admin = require('firebase-admin');
const path = require('path');

const TARGET_ID = '3249781445677467';
const CONTEST_ID = 'votes-artistes';

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

        console.log(`Recherche de l'ID: ${TARGET_ID}...\n`);

        const checks = [
            { name: 'Collections Racines - voteIntents', ref: db.collection('voteIntents').doc(TARGET_ID) },
            { name: 'Collections Racines - payments', ref: db.collection('payments').doc(TARGET_ID) },
            { name: 'Collections Racines - contests', ref: db.collection('contests').doc(TARGET_ID) },
            { name: 'Collections Racines - users', ref: db.collection('users').doc(TARGET_ID) },
            { name: 'Sous-Collection - candidates', ref: db.collection('contests').doc(CONTEST_ID).collection('candidates').doc(TARGET_ID) },
            { name: 'Sous-Collection - votes', ref: db.collection('contests').doc(CONTEST_ID).collection('votes').doc(TARGET_ID) }
        ];

        let found = false;

        for (const check of checks) {
            const doc = await check.ref.get();
            if (doc.exists) {
                console.log(`✅ TROUVÉ dans : ${check.name}`);
                console.log('--- Données ---');
                console.dir(doc.data(), { depth: null });
                found = true;
                break; // Stop after first match usually, or continue if ID could be reused (unlikely for auto ids)
            }
        }

        if (!found) {
            console.log('❌ ID introuvable dans les collections communes vérifiées.');
            // Optional: Search query if it's a field value instead of a doc ID?
            // User asked "what is ID", usually implies Doc ID.
        }

    } catch (error) {
        console.error('Erreur:', error);
    }
}

main();
