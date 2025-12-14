/**
 * Script de diagnostic approfondi du flux de données
 * Simule ce que fait la Cloud Function getPartnerDashboard
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json');

if (!admin.apps.length) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'africaphone-vente',
    });
    console.log('✅ Firebase Admin initialisé');
}

const db = admin.firestore();

// Reproduit exactement la fonction dayKeyUtc de la Cloud Function
const dayKeyUtc = (d) => {
    const utc = new Date(d.getTime());
    const y = utc.getUTCFullYear();
    const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
    const day = String(utc.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

async function diagnoseDataFetch() {
    const CODE = 'ZIDANE1';
    const rangeDays = 14; // Comme dans le filtre "14 derniers jours"

    console.log('');
    console.log('='.repeat(70));
    console.log(`📊 DIAGNOSTIC APPROFONDI - ${CODE} (${rangeDays} derniers jours)`);
    console.log('='.repeat(70));

    const now = new Date();
    const startDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    const startDateKey = dayKeyUtc(startDate);

    console.log('');
    console.log('📅 Paramètres de la requête:');
    console.log(`   - Date actuelle: ${now.toISOString()}`);
    console.log(`   - Date de début: ${startDate.toISOString()}`);
    console.log(`   - Clé de date de début (dayKeyUtc): "${startDateKey}"`);
    console.log('');

    // 1. Lister TOUS les documents quotidiens pour ce code
    console.log('1️⃣ TOUS les documents dans promoMetrics/' + CODE + '/daily:');
    console.log('-'.repeat(50));
    try {
        const allDailySnap = await db.collection('promoMetrics').doc(CODE).collection('daily').get();
        if (allDailySnap.empty) {
            console.log('   ❌ Aucun document quotidien!');
        } else {
            console.log(`   Total documents: ${allDailySnap.size}`);
            allDailySnap.docs.forEach(doc => {
                const data = doc.data();
                console.log(`   - ID: "${doc.id}", date: "${data.date}", visits.total: ${data.visits?.total || 0}`);
            });
        }
    } catch (e) {
        console.log('   ⚠️ Erreur:', e.message);
    }
    console.log('');

    // 2. Simuler la requête exacte de fetchPartnerMetrics
    console.log('2️⃣ Requête simulée (comme fetchPartnerMetrics):');
    console.log('-'.repeat(50));
    console.log(`   Query: where('date', '>=', '${startDateKey}').orderBy('date', 'asc').limit(${rangeDays})`);
    try {
        const metricsRef = db.collection('promoMetrics').doc(CODE).collection('daily');
        const metricsSnap = await metricsRef
            .where('date', '>=', startDateKey)
            .orderBy('date', 'asc')
            .limit(rangeDays)
            .get();

        if (metricsSnap.empty) {
            console.log('   ❌ La requête ne retourne AUCUN document!');
            console.log('');
            console.log('   🔍 ANALYSE DU PROBLÈME:');
            console.log('   Le champ "date" dans les documents ne correspond peut-être pas');
            console.log('   au format attendu par la requête.');
        } else {
            console.log(`   ✅ ${metricsSnap.size} document(s) retourné(s):`);
            let totalLeads = 0;
            metricsSnap.docs.forEach(doc => {
                const data = doc.data();
                totalLeads += data.visits?.total || 0;
                console.log(`   - ${doc.id}: date="${data.date}", visits=${data.visits?.total || 0}`);
            });
            console.log('');
            console.log(`   📈 Total leads calculé: ${totalLeads}`);
        }
    } catch (e) {
        console.log('   ⚠️ Erreur:', e.message);
        if (e.code === 9) {
            console.log('   💡 Cette erreur indique qu\'un index composite est requis.');
            console.log('   Créez l\'index suivant dans Firestore:');
            console.log('   Collection: promoMetrics/{code}/daily');
            console.log('   Champs: date (Ascending)');
        }
    }
    console.log('');

    // 3. Vérifier le format des dates dans les documents
    console.log('3️⃣ Analyse du format de date:');
    console.log('-'.repeat(50));
    try {
        const sampleSnap = await db.collection('promoMetrics').doc(CODE).collection('daily').limit(1).get();
        if (!sampleSnap.empty) {
            const doc = sampleSnap.docs[0];
            const data = doc.data();
            console.log(`   Document ID: "${doc.id}"`);
            console.log(`   Champ 'date': "${data.date}" (type: ${typeof data.date})`);
            console.log(`   Comparaison: "${data.date}" >= "${startDateKey}" => ${data.date >= startDateKey}`);

            if (data.date !== doc.id) {
                console.log('');
                console.log('   ⚠️ INCOHÉRENCE DÉTECTÉE:');
                console.log('   L\'ID du document ne correspond pas au champ "date".');
            }
        }
    } catch (e) {
        console.log('   ⚠️ Erreur:', e.message);
    }
    console.log('');

    console.log('='.repeat(70));
    console.log('📋 FIN DU DIAGNOSTIC');
    console.log('='.repeat(70));
}

diagnoseDataFetch()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erreur fatale:', err);
        process.exit(1);
    });
