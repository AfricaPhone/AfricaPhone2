/**
 * Script to check Firebase data for partner dashboard
 * Run with: node functions/check-partner-data.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'africaphone-vente',
        credential: admin.credential.applicationDefault(),
    });
}

const db = admin.firestore();

async function checkPartnerData() {
    console.log('='.repeat(60));
    console.log('📊 RAPPORT DES DONNÉES PARTENAIRES FIREBASE');
    console.log('='.repeat(60));
    console.log();

    // 1. Lister tous les codes promo dans promoRules
    console.log('📋 1. CODES PROMO CONFIGURÉS (promoRules)');
    console.log('-'.repeat(40));
    try {
        const rulesSnap = await db.collection('promoRules').get();
        if (rulesSnap.empty) {
            console.log('   ❌ Aucun code promo configuré');
        } else {
            console.log(`   ✅ ${rulesSnap.size} code(s) trouvé(s):`);
            rulesSnap.docs.forEach(doc => {
                const data = doc.data();
                console.log(`   - ${doc.id}: actif=${data.isActive !== false}, mdp=${data.partnerPassword ? '✓' : '✗'}`);
            });
        }
    } catch (e) {
        console.log('   ⚠️ Erreur:', e.message);
    }
    console.log();

    // 2. Vérifier promoMetrics pour chaque code
    console.log('📈 2. MÉTRIQUES ENREGISTRÉES (promoMetrics)');
    console.log('-'.repeat(40));
    try {
        const metricsSnap = await db.collection('promoMetrics').get();
        if (metricsSnap.empty) {
            console.log('   ❌ Aucune métrique enregistrée');
        } else {
            console.log(`   ✅ ${metricsSnap.size} code(s) avec métriques:`);
            for (const doc of metricsSnap.docs) {
                const dailySnap = await db.collection('promoMetrics').doc(doc.id).collection('daily').orderBy('date', 'desc').limit(5).get();
                let totalVisits = 0;
                let totalSales = 0;
                dailySnap.docs.forEach(d => {
                    const data = d.data();
                    totalVisits += data.visits?.total || 0;
                    totalSales += data.sales?.count || 0;
                });
                console.log(`   - ${doc.id}: ${dailySnap.size} jour(s), ${totalVisits} visites, ${totalSales} ventes`);
            }
        }
    } catch (e) {
        console.log('   ⚠️ Erreur:', e.message);
    }
    console.log();

    // 3. Vérifier pour ZIDANE1 spécifiquement
    console.log('🔍 3. DÉTAILS POUR "ZIDANE1"');
    console.log('-'.repeat(40));
    try {
        // promoRules
        const ruleDoc = await db.collection('promoRules').doc('ZIDANE1').get();
        if (ruleDoc.exists) {
            const data = ruleDoc.data();
            console.log('   promoRules/ZIDANE1:');
            console.log(`     - isActive: ${data.isActive !== false}`);
            console.log(`     - partnerPassword: ${data.partnerPassword ? '✓ configuré' : '✗ non configuré'}`);
            console.log(`     - partnerName: ${data.partnerName || 'non défini'}`);
            console.log(`     - allowedChannels: ${JSON.stringify(data.allowedChannels || [])}`);
        } else {
            console.log('   ❌ promoRules/ZIDANE1 n\'existe pas');
        }

        // promoMetrics
        const metricsDoc = await db.collection('promoMetrics').doc('ZIDANE1').get();
        if (metricsDoc.exists) {
            const dailySnap = await db.collection('promoMetrics').doc('ZIDANE1').collection('daily').orderBy('date', 'desc').limit(10).get();
            console.log(`   promoMetrics/ZIDANE1/daily: ${dailySnap.size} document(s)`);
            dailySnap.docs.forEach(d => {
                const data = d.data();
                console.log(`     - ${d.id}: visites=${data.visits?.total || 0}, web=${data.visits?.web || 0}, wa=${data.visits?.wa || 0}, ventes=${data.sales?.count || 0}`);
            });
        } else {
            console.log('   ❌ promoMetrics/ZIDANE1 n\'existe pas (aucun clic enregistré)');
        }
    } catch (e) {
        console.log('   ⚠️ Erreur:', e.message);
    }
    console.log();

    // 4. Vérifier promoPayouts
    console.log('💰 4. VERSEMENTS (promoPayouts)');
    console.log('-'.repeat(40));
    try {
        const payoutsSnap = await db.collection('promoPayouts').limit(20).get();
        if (payoutsSnap.empty) {
            console.log('   ❌ Aucun versement enregistré');
        } else {
            console.log(`   ✅ ${payoutsSnap.size} versement(s) trouvé(s):`);
            payoutsSnap.docs.forEach(doc => {
                const data = doc.data();
                console.log(`   - ${data.code || 'N/A'}: ${data.amount || 0} CFA, status=${data.status || 'N/A'}`);
            });
        }
    } catch (e) {
        console.log('   ⚠️ Erreur:', e.message);
    }
    console.log();

    // 5. Sessions partenaires actives
    console.log('🔐 5. SESSIONS PARTENAIRES (partnerSessions)');
    console.log('-'.repeat(40));
    try {
        const now = new Date();
        const sessionsSnap = await db.collection('partnerSessions').limit(10).get();
        if (sessionsSnap.empty) {
            console.log('   ❌ Aucune session');
        } else {
            console.log(`   ✅ ${sessionsSnap.size} session(s):`);
            sessionsSnap.docs.forEach(doc => {
                const data = doc.data();
                const expiresAt = data.expiresAt?.toDate?.() || null;
                const isExpired = expiresAt ? expiresAt < now : false;
                console.log(`   - ${data.code || 'N/A'}: ${isExpired ? '⏰ expirée' : '✓ active'}`);
            });
        }
    } catch (e) {
        console.log('   ⚠️ Erreur:', e.message);
    }
    console.log();

    console.log('='.repeat(60));
    console.log('📊 FIN DU RAPPORT');
    console.log('='.repeat(60));
}

checkPartnerData()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erreur fatale:', err);
        process.exit(1);
    });
