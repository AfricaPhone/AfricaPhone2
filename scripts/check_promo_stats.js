/**
 * Script pour vérifier les données Firestore du code promo ZIDANE1
 */
const admin = require('firebase-admin');
const path = require('path');

// Initialisation Firebase
const serviceAccountPath = path.join(__dirname, '..', 'africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'africaphone-vente'
    });
}

const db = admin.firestore();
const CODE = 'ZIDANE1';

async function checkPromoStats() {
    console.log(`\n========== STATISTIQUES FIREBASE POUR: ${CODE} ==========\n`);

    // 1. Vérifier promoRules (Le code existe-t-il?)
    console.log('1. PromoRules (Configuration du code):');
    try {
        const ruleDoc = await db.collection('promoRules').doc(CODE).get();
        if (ruleDoc.exists) {
            const data = ruleDoc.data();
            console.log(`   ✅ Code trouvé!`);
            console.log(`   - isActive: ${data.isActive}`);
            console.log(`   - Code: ${data.code}`);
            console.log(`   - Channels autorisés: ${JSON.stringify(data.allowedChannels)}`);
        } else {
            console.log(`   ❌ Code NON TROUVÉ dans promoRules`);
        }
    } catch (err) {
        console.log(`   ⚠️ Erreur: ${err.message}`);
    }

    // 2. Vérifier promoMetrics (Clics)
    console.log('\n2. PromoMetrics (Clics/Visites):');
    try {
        const metricsRef = db.collection('promoMetrics').doc(CODE).collection('daily');
        const metricsSnap = await metricsRef.orderBy(admin.firestore.FieldPath.documentId(), 'desc').limit(10).get();

        if (metricsSnap.empty) {
            console.log(`   ⚠️ Aucune donnée de clics pour ${CODE}`);
        } else {
            let totalClicks = 0;
            console.log(`   📊 ${metricsSnap.size} jours de données trouvés:`);
            metricsSnap.forEach(doc => {
                const data = doc.data();
                const visits = data.visits?.total || 0;
                totalClicks += visits;
                console.log(`   - ${doc.id}: ${visits} clics`);
            });
            console.log(`   📈 TOTAL Clics (derniers 10 jours): ${totalClicks}`);
        }
    } catch (err) {
        console.log(`   ⚠️ Erreur: ${err.message}`);
    }

    // 3. Vérifier promoValidationLogs (Leads)
    console.log('\n3. PromoValidationLogs (Leads/Paniers):');
    try {
        const leadsSnap = await db.collection('promoValidationLogs')
            .where('code', '==', CODE)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (leadsSnap.empty) {
            console.log(`   ⚠️ Aucun lead pour ${CODE}`);
        } else {
            console.log(`   📊 ${leadsSnap.size} leads trouvés (max 10 affichés):`);
            leadsSnap.forEach(doc => {
                const data = doc.data();
                const date = data.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '?';
                console.log(`   - ${date}: Panier ${data.cartValue || 0} CFA (channel: ${data.channel || '?'})`);
            });
        }
    } catch (err) {
        console.log(`   ⚠️ Erreur (index manquant?): ${err.message}`);
    }

    // 4. Vérifier promoSalesLogs (Ventes)
    console.log('\n4. PromoSalesLogs (Ventes confirmées):');
    try {
        const salesSnap = await db.collection('promoSalesLogs')
            .where('code', '==', CODE)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (salesSnap.empty) {
            console.log(`   ⚠️ Aucune vente pour ${CODE}`);
        } else {
            let totalCommission = 0;
            console.log(`   📊 ${salesSnap.size} ventes trouvées (max 10 affichées):`);
            salesSnap.forEach(doc => {
                const data = doc.data();
                const date = data.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || '?';
                totalCommission += data.commissionValue || 0;
                console.log(`   - ${date}: ${data.cartValue || 0} CFA (Commission: ${data.commissionValue || 0} CFA)`);
            });
            console.log(`   💰 TOTAL Commissions: ${totalCommission} CFA`);
        }
    } catch (err) {
        console.log(`   ⚠️ Erreur (index manquant?): ${err.message}`);
    }

    console.log('\n========== FIN DU RAPPORT ==========\n');
    process.exit(0);
}

checkPromoStats();
