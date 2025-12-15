/**
 * Script de diagnostic pour vérifier la structure des données partenaire ZIDANE1
 * Utilise le service account pour accéder à Firestore
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function diagnosePartnerData() {
    const code = 'ZIDANE1';
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 DIAGNOSTIC PARTENAIRE: ${code}`);
    console.log(`${'='.repeat(60)}\n`);

    // 1. Vérifier promoRules
    console.log('1️⃣  STRUCTURE promoRules');
    console.log('-'.repeat(40));
    try {
        const ruleDoc = await db.collection('promoRules').doc(code).get();
        if (ruleDoc.exists) {
            const data = ruleDoc.data();
            console.log('✅ Document trouvé');
            console.log('Champs disponibles:', Object.keys(data).sort().join(', '));
            console.log('\nDétails:');
            console.log('  - code:', data.code || '(non défini)');
            console.log('  - isActive:', data.isActive);
            console.log('  - allowedChannels:', data.allowedChannels?.join(', ') || '(non défini)');
            console.log('  - partnerName:', data.partnerName || '(non défini)');
            console.log('  - partnerPhone:', data.partnerPhone || '(non défini)');
            console.log('  - partnerPasswordHash:', data.partnerPasswordHash ? '✅ Défini' : '❌ Non défini');
            console.log('  - priceBrackets:', data.priceBrackets?.length || 0, 'tranches');

            // Vérifier si des liens sont stockés
            console.log('\n📎 LIENS STOCKÉS:');
            console.log('  - webLink:', data.webLink || '❌ Non stocké');
            console.log('  - appLink:', data.appLink || '❌ Non stocké');
            console.log('  - waLink:', data.waLink || '❌ Non stocké');
            console.log('  - dashboardLink:', data.dashboardLink || '❌ Non stocké');
        } else {
            console.log('❌ Document non trouvé dans promoRules');
        }
    } catch (err) {
        console.error('Erreur promoRules:', err.message);
    }

    // 2. Vérifier promoCodes
    console.log('\n2️⃣  STRUCTURE promoCodes');
    console.log('-'.repeat(40));
    try {
        const codesSnap = await db.collection('promoCodes').where('code', '==', code).get();
        if (!codesSnap.empty) {
            const data = codesSnap.docs[0].data();
            console.log('✅ Document trouvé (ID:', codesSnap.docs[0].id, ')');
            console.log('Champs disponibles:', Object.keys(data).sort().join(', '));
            console.log('\nDétails:');
            console.log('  - code:', data.code);
            console.log('  - type:', data.type);
            console.log('  - value:', data.value);
            console.log('  - assignedTo:', data.assignedTo || '(non défini)');
            console.log('  - isActive:', data.isActive);
        } else {
            console.log('❌ Aucun document trouvé dans promoCodes');
        }
    } catch (err) {
        console.error('Erreur promoCodes:', err.message);
    }

    // 3. Vérifier promoMetrics (pour les visites par canal)
    console.log('\n3️⃣  MÉTRIQUES PAR CANAL (promoMetrics)');
    console.log('-'.repeat(40));
    try {
        const metricsSnap = await db.collection('promoMetrics').doc(code).collection('daily').orderBy('date', 'desc').limit(5).get();
        if (!metricsSnap.empty) {
            console.log('✅', metricsSnap.size, 'jours de métriques trouvés (affichage des 5 derniers)');
            metricsSnap.docs.forEach(doc => {
                const data = doc.data();
                console.log(`\n  📅 ${doc.id}:`);
                console.log('    - visits.total:', data.visits?.total || 0);
                console.log('    - visits.web:', data.visits?.web || 0);
                console.log('    - visits.app:', data.visits?.app || 0);
                console.log('    - visits.wa:', data.visits?.wa || 0);
                console.log('    - visits.qr:', data.visits?.qr || 0);
                console.log('    - visits.bo:', data.visits?.bo || 0);
                if (data.sales?.count) {
                    console.log('    - sales.count:', data.sales.count);
                }
            });
        } else {
            console.log('❌ Aucune métrique trouvée dans promoMetrics');
        }
    } catch (err) {
        console.error('Erreur promoMetrics:', err.message);
    }

    // 4. Vérifier les templates de liens globaux
    console.log('\n4️⃣  TEMPLATES DE LIENS (settings/linkTemplates)');
    console.log('-'.repeat(40));
    try {
        const templatesDoc = await db.collection('settings').doc('linkTemplates').get();
        if (templatesDoc.exists) {
            const data = templatesDoc.data();
            console.log('✅ Templates trouvés');
            console.log('  - webBaseUrl:', data.webBaseUrl || '(non défini)');
            console.log('  - appLinkDomain:', data.appLinkDomain || '(non défini)');
            console.log('  - appScheme:', data.appScheme || '(non défini)');
            console.log('  - whatsappNumber:', data.whatsappNumber || '(non défini)');
            console.log('  - waMessageTemplate:', data.waMessageTemplate ? '✅ Défini' : '(non défini)');
        } else {
            console.log('❌ Document linkTemplates non trouvé');
        }
    } catch (err) {
        console.error('Erreur settings:', err.message);
    }

    // 5. Sessions partenaire
    console.log('\n5️⃣  SESSIONS PARTENAIRE (partnerSessions)');
    console.log('-'.repeat(40));
    try {
        const sessionsSnap = await db.collection('partnerSessions').where('code', '==', code).orderBy('createdAt', 'desc').limit(3).get();
        if (!sessionsSnap.empty) {
            console.log('✅', sessionsSnap.size, 'session(s) trouvée(s)');
            sessionsSnap.docs.forEach(doc => {
                const data = doc.data();
                console.log(`\n  🔑 Session ${doc.id.substring(0, 8)}...:`);
                console.log('    - createdAt:', data.createdAt?.toDate?.() || 'N/A');
                console.log('    - expiresAt:', data.expiresAt?.toDate?.() || 'N/A');
            });
        } else {
            console.log('⚠️ Aucune session active');
        }
    } catch (err) {
        console.error('Erreur partnerSessions:', err.message);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('📋 CONCLUSION');
    console.log(`${'='.repeat(60)}`);
    console.log(`
Les liens (webLink, appLink, waLink) ne sont PAS stockés dans Firestore.
Ils sont générés dynamiquement côté client à partir de templates:
  - https://africaphone.org/p/{CODE} (web)
  - https://africaphone.org/a/{CODE} (app)
  - https://africaphone.org/w/{CODE} (WhatsApp)
  - https://africaphone.org/d/{CODE} (dashboard)

Pour que les liens soient pré-remplis à la connexion du partenaire,
il faudrait SOIT:
  A) Stocker les liens dans promoRules lors de la création du code
  B) Les générer côté serveur dans getPartnerDashboard et les retourner
`);

    process.exit(0);
}

diagnosePartnerData().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
});
