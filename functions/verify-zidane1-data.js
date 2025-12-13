/**
 * Script de vérification des données ZIDANE1 dans Firebase
 * Exécuter avec: node functions/verify-zidane1-data.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Chemin vers le service account
const serviceAccountPath = path.join(__dirname, '..', 'africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    try {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: 'africaphone-vente',
        });
        console.log('✅ Firebase Admin initialisé avec service account');
    } catch (err) {
        console.error('❌ Erreur initialisation:', err.message);
        process.exit(1);
    }
}

const db = admin.firestore();

async function verifyZidane1Data() {
    const CODE = 'ZIDANE1';

    console.log('');
    console.log('='.repeat(60));
    console.log(`📊 VÉRIFICATION DONNÉES FIREBASE POUR "${CODE}"`);
    console.log('='.repeat(60));
    console.log('');

    // 1. Vérifier promoRules
    console.log('1️⃣ promoRules/' + CODE);
    console.log('-'.repeat(40));
    try {
        const ruleDoc = await db.collection('promoRules').doc(CODE).get();
        if (ruleDoc.exists) {
            const data = ruleDoc.data();
            console.log('   ✅ Document existe');
            console.log(`   - isActive: ${data.isActive !== false}`);
            console.log(`   - partnerPassword: ${data.partnerPassword ? '✓ configuré' : '✗ non configuré'}`);
            console.log(`   - partnerName: ${data.partnerName || 'non défini'}`);
            console.log(`   - allowedChannels: ${JSON.stringify(data.allowedChannels || [])}`);
            console.log(`   - priceBrackets: ${data.priceBrackets?.length || 0} tranches`);
        } else {
            console.log('   ❌ Document n\'existe pas!');
        }
    } catch (e) {
        console.log('   ⚠️ Erreur:', e.message);
    }
    console.log('');

    // 2. Vérifier promoMetrics
    console.log('2️⃣ promoMetrics/' + CODE + '/daily');
    console.log('-'.repeat(40));
    try {
        const metricsDoc = await db.collection('promoMetrics').doc(CODE).get();
        if (metricsDoc.exists || true) { // Le document parent peut ne pas exister
            const dailySnap = await db.collection('promoMetrics').doc(CODE).collection('daily')
                .orderBy('date', 'desc')
                .limit(10)
                .get();

            if (dailySnap.empty) {
                console.log('   ⚠️ Aucune donnée quotidienne (0 documents)');
                console.log('   ℹ️  Les données seront créées quand quelqu\'un cliquera sur un lien promo');
            } else {
                console.log(`   ✅ ${dailySnap.size} document(s) quotidien(s)`);
                let totalVisits = 0;
                let totalSales = 0;
                let totalCommission = 0;

                dailySnap.docs.forEach(d => {
                    const data = d.data();
                    const visits = data.visits?.total || 0;
                    const sales = data.sales?.count || 0;
                    const commission = data.sales?.commission || 0;
                    totalVisits += visits;
                    totalSales += sales;
                    totalCommission += commission;
                    console.log(`   - ${d.id}: visites=${visits}, web=${data.visits?.web || 0}, wa=${data.visits?.wa || 0}, ventes=${sales}`);
                });

                console.log('');
                console.log(`   📈 TOTAUX (10 derniers jours):`);
                console.log(`      Visites: ${totalVisits}`);
                console.log(`      Ventes: ${totalSales}`);
                console.log(`      Commission: ${totalCommission} CFA`);
            }
        }
    } catch (e) {
        console.log('   ⚠️ Erreur:', e.message);
    }
    console.log('');

    // 3. Vérifier promoPayouts
    console.log('3️⃣ promoPayouts (filtrés par code)');
    console.log('-'.repeat(40));
    try {
        const payoutsSnap = await db.collection('promoPayouts')
            .where('code', '==', CODE)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (payoutsSnap.empty) {
            console.log('   ℹ️  Aucun versement enregistré pour ce code');
        } else {
            console.log(`   ✅ ${payoutsSnap.size} versement(s)`);
            payoutsSnap.docs.forEach(doc => {
                const data = doc.data();
                console.log(`   - ${data.amount || 0} CFA, status=${data.status || 'N/A'}, mode=${data.paymentMethod || 'N/A'}`);
            });
        }
    } catch (e) {
        // L'index peut ne pas exister
        console.log('   ℹ️  Collection non indexée ou vide');
    }
    console.log('');

    // 4. Vérifier partnerSessions
    console.log('4️⃣ partnerSessions (sessions actives)');
    console.log('-'.repeat(40));
    try {
        const now = new Date();
        const sessionsSnap = await db.collection('partnerSessions')
            .where('code', '==', CODE)
            .limit(5)
            .get();

        if (sessionsSnap.empty) {
            console.log('   ℹ️  Aucune session active');
        } else {
            console.log(`   ✅ ${sessionsSnap.size} session(s)`);
            sessionsSnap.docs.forEach(doc => {
                const data = doc.data();
                const expiresAt = data.expiresAt?.toDate?.() || null;
                const isExpired = expiresAt ? expiresAt < now : false;
                console.log(`   - Token: ${doc.id.substring(0, 8)}... | ${isExpired ? '⏰ expirée' : '✓ active'}`);
            });
        }
    } catch (e) {
        console.log('   ⚠️ Erreur:', e.message);
    }
    console.log('');

    // 5. Résumé
    console.log('='.repeat(60));
    console.log('📋 RÉSUMÉ');
    console.log('='.repeat(60));
    console.log('');
    console.log('Pour que le tableau de bord affiche des données:');
    console.log('1. Le document promoRules/' + CODE + ' doit exister ✓');
    console.log('2. Des clics doivent avoir été enregistrés via les liens promo');
    console.log('3. Si promoMetrics/' + CODE + '/daily est vide, le dashboard affichera 0');
    console.log('');
    console.log('🔗 Pour générer des clics de test:');
    console.log('   https://africaphone.org/p/' + CODE);
    console.log('   https://africaphone.org/a/' + CODE);
    console.log('   https://africaphone.org/w/' + CODE);
    console.log('');
}

verifyZidane1Data()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Erreur fatale:', err);
        process.exit(1);
    });
