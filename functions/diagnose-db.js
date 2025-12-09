const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json');
const serviceAccount = require(serviceAccountPath);

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function diagnose() {
    console.log('🔍 Diagnostic tracking...');
    console.log('Project ID:', admin.app().options.credential.projectId);

    const codes = ['ZIDANE1', 'AUTO_TEST_406'];

    for (const c of codes) {
        console.log(`\n📂 Vérification pour CODE: [${c}]`);
        const dailyRef = db.collection('promoMetrics').doc(c).collection('daily');
        const snapshot = await dailyRef.get();

        if (snapshot.empty) {
            console.log('   ⚠️ Aucune donnée "daily" trouvée.');
        } else {
            console.log(`   ✅ ${snapshot.size} documents trouvés :`);
            snapshot.forEach(doc => {
                console.log(`   - Date: ${doc.id}`);
                console.log(JSON.stringify(doc.data(), null, 2));
            });
        }
    }
}

diagnose();
