const admin = require('firebase-admin');
const path = require('path');
const https = require('https');

// 1. Initialisation avec le Service Account
const serviceAccountPath = path.join(__dirname, '..', 'africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const TEST_CODE = 'AUTO_TEST_' + Math.floor(Math.random() * 1000);
const SHORT_LINK_BASE = 'https://africaphone.org/p/';

async function runVerification() {
    console.log('🚀 Démarrage du test de vérification bout-en-bout...');
    console.log(`🔐 Code Promo Test : ${TEST_CODE}`);

    try {
        // Étape 1 : Créer le Code Promo dans Firestore
        console.log('\n--- ÉTAPE 1 : Création du Code Promo ---');
        await db.collection('promoCodes').doc(TEST_CODE).set({
            code: TEST_CODE,
            discountValue: 5000,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isActive: true
        });
        console.log('✅ Code promo créé dans promoCodes.');

        // Créer la règle associée
        await db.collection('promoRules').doc(TEST_CODE).set({
            code: TEST_CODE,
            isActive: true,
            priceBrackets: [
                { min: 0, discountValue: 5000, commissionValue: 2000, label: 'Standard' }
            ]
        });
        console.log('✅ Règle promo créée dans promoRules.');

        // Étape 2 : Simuler le Clic sur le Lien Court
        const shortLink = `${SHORT_LINK_BASE}${TEST_CODE}?ref=TestScript&channel=web`;
        console.log('\n--- ÉTAPE 2 : Simulation du Clic ---');
        console.log(`👉 Visite du lien : ${shortLink}`);

        await new Promise((resolve, reject) => {
            https.get(shortLink, (res) => {
                console.log(`📡 Réponse HTTP : ${res.statusCode}`);
                console.log(`📍 Location Header : ${res.headers.location}`);

                if (res.statusCode === 302 || res.statusCode === 301) {
                    console.log('✅ Redirection détectée (Le Tracking fonctionne).');
                    resolve();
                } else {
                    console.log('⚠️ Pas de redirection immédiate (c\'est peut-être normal si Firebase Hosting sert une page, mais pour /p/ on attend une redirection Cloud Function).');
                    // On continue quand même pour voir les métriques
                    resolve();
                }
            }).on('error', (e) => {
                console.error(`❌ Erreur lors de la requête : ${e.message}`);
                reject(e);
            });
        });

        // Attendre un peu que la Cloud Function traite l'événement Firestore
        console.log('\n⏳ Attente de 10 secondes pour la mise à jour des métriques...');
        await new Promise(r => setTimeout(r, 10000));

        // Étape 3 : Vérifier les Métriques dans Firestore
        console.log('\n--- ÉTAPE 3 : Vérification Firestore ---');
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const metricDocPath = `promoMetrics/${TEST_CODE}/daily/${today}`;

        console.log(`🔍 Lecture de : ${metricDocPath}`);
        const metricDoc = await db.doc(metricDocPath).get();

        if (!metricDoc.exists) {
            console.error('❌ ÉCHEC : Aucun document de métriques trouvé ! Le tracking n\'a pas écrit en base.');
        } else {
            const data = metricDoc.data();
            console.log('📄 Données trouvées :', JSON.stringify(data, null, 2));

            if (data.visits && data.visits.total >= 1) {
                console.log('🎉 SUCCÈS TOTAL : La visite a bien été comptabilisée !');
            } else {
                console.error('⚠️ ATTENTION : Le document existe mais le compteur de visites est à 0 ou absent.');
            }
        }

    } catch (error) {
        console.error('💥 Erreur fatale durant le test :', error);
    } finally {
        // Nettoyage (Facultatif, on peut garder pour inspection manuelle)
        console.log('\n--- Fin du test ---');
        process.exit(0);
    }
}

runVerification();
