/**
 * Test direct de la Cloud Function getPartnerDashboard
 * Simule un appel comme le ferait le frontend
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

const { getFunctions } = require('firebase-admin/functions');
const fetch = require('node-fetch') || globalThis.fetch;

async function testCloudFunction() {
    console.log('');
    console.log('='.repeat(70));
    console.log('🧪 TEST DIRECT DE LA CLOUD FUNCTION getPartnerDashboard');
    console.log('='.repeat(70));
    console.log('');

    // Récupérer un token de session valide pour ZIDANE1
    const db = admin.firestore();
    const sessionsSnap = await db.collection('partnerSessions')
        .where('code', '==', 'ZIDANE1')
        .limit(1)
        .get();

    if (sessionsSnap.empty) {
        console.log('❌ Aucune session trouvée pour ZIDANE1');
        console.log('Veuillez vous reconnecter sur le dashboard.');
        return;
    }

    const sessionDoc = sessionsSnap.docs[0];
    const sessionData = sessionDoc.data();
    const token = sessionDoc.id;

    console.log('📋 Session trouvée:');
    console.log(`   Token: ${token.substring(0, 20)}...`);
    console.log(`   Code: ${sessionData.code}`);
    console.log(`   Expires: ${sessionData.expiresAt?.toDate?.()}`);
    console.log('');

    // Simuler les paramètres d'appel
    const params = {
        code: 'ZIDANE1',
        token: token,
        rangeDays: 14,
        channel: undefined
    };

    console.log('📤 Paramètres envoyés:');
    console.log(JSON.stringify(params, null, 2));
    console.log('');

    // Tester la logique de fetchPartnerMetrics directement
    console.log('🔄 Simulation de fetchPartnerMetrics...');

    const now = new Date();
    const startDate = new Date(now.getTime() - params.rangeDays * 24 * 60 * 60 * 1000);

    const dayKeyUtc = (d) => {
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const metricsRef = db.collection('promoMetrics').doc('ZIDANE1').collection('daily');
    const metricsSnap = await metricsRef
        .where('date', '>=', dayKeyUtc(startDate))
        .orderBy('date', 'asc')
        .limit(params.rangeDays)
        .get();

    let totalLeads = 0;
    let totalSales = 0;
    const dailyData = [];

    metricsSnap.docs.forEach(doc => {
        const data = doc.data();
        const visits = data.visits?.total || 0;
        const sales = data.sales?.count || 0;
        totalLeads += visits;
        totalSales += sales;
        dailyData.push({
            date: data.date || doc.id,
            visits: visits,
            sales: sales
        });
    });

    console.log('');
    console.log('📊 Résultat simulé (ce que la Cloud Function DEVRAIT retourner):');
    console.log('-'.repeat(50));
    const simulatedResponse = {
        code: 'ZIDANE1',
        authenticated: true,
        kpis: {
            sales: totalSales,
            leads: totalLeads,
            commission: 0,
            discount: 0
        },
        channels: [],
        dailyData: dailyData
    };
    console.log(JSON.stringify(simulatedResponse, null, 2));
    console.log('');

    console.log('='.repeat(70));
    console.log('📋 CONCLUSION');
    console.log('='.repeat(70));
    console.log('');
    console.log('Si le dashboard affiche 0 malgré les 13 visites trouvées,');
    console.log('le problème est probablement:');
    console.log('');
    console.log('1. La Cloud Function getPartnerDashboard n\'a pas été redéployée');
    console.log('2. Le cache du navigateur affiche une ancienne version');
    console.log('3. Une erreur JavaScript côté frontend bloque le rendu');
    console.log('');
}

testCloudFunction()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erreur fatale:', err);
        process.exit(1);
    });
