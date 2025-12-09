const admin = require('firebase-admin');
const path = require('path');

// Init Admin SDK
const serviceAccountPath = path.join(__dirname, '..', 'africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json');
const serviceAccount = require(serviceAccountPath);

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkMetrics() {
    const args = process.argv.slice(2);
    const code = (args[0] || 'ZIDANE1').toUpperCase();

    // Date du jour YYYY-MM-DD (UTC pour correspondre aux Cloud Functions)
    const today = new Date().toISOString().split('T')[0];

    console.log(`\n🔍 Vérification des métriques pour [${code}] au [${today}]...`);

    try {
        const docRef = db.collection('promoMetrics').doc(code).collection('daily').doc(today);
        const doc = await docRef.get();

        if (!doc.exists) {
            console.log(`❌ Aucun document trouvé pour aujourd'hui (0 visites).`);
            return;
        }

        const data = doc.data();
        console.log('📊 États actuels dans Firestore :');
        console.log(`   - Total Visites : ${data.visits?.total || 0}`);
        console.log(`   - Web : ${data.visits?.web || 0}`);
        console.log(`   - WhatsApp : ${data.visits?.wa || 0}`);
        console.log('-----------------------------------');

    } catch (error) {
        console.error('Erreur de lecture:', error);
    }
}

checkMetrics();
