/**
 * Script d'initialisation des collections Firestore pour le système de codes promo
 * 
 * Ce script crée toutes les collections et documents nécessaires pour le système de tracking
 * des influenceurs avec les liens courts au format africaphone.org/p/CODE
 * 
 * Usage:
 * 1. npm install --save-dev @types/node
 * 2. ts-node init-firestore.ts
 * ou
 * 3. npm run init-firestore (après avoir ajouté le script dans package.json)
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Initialiser Firebase Admin avec le service account
const serviceAccountPath = path.join(__dirname, '..', 'africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function initializeFirestore() {
    console.log('🚀 Démarrage de l'initialisation Firestore...\n');

  try {
        // 1. Configuration des templates de liens
        console.log('📝 Configuration de config/linkTemplates...');
        await db.collection('config').doc('linkTemplates').set({
            shortLinkDomain: 'https://africaphone.org',
            finalRedirectUrl: 'https://africaphone.org',
            appScheme: 'africaphone://apply-promo',
            appLinkDomain: 'https://africaphone.org/p',
            defaultCampaign: 'default',
            defaultSub: 'cta1',
            waMessageTemplate: 'Profite du code {code} sur AfricaPhone : {link} (ref {ref})',
            whatsappNumber: '22997000000', // À remplacer par le vrai numéro
        }, { merge: true });
        console.log('✅ config/linkTemplates créé\n');

        // 2. Configuration des features
        console.log('📝 Configuration de config/features...');
        await db.collection('config').doc('features').set({
            promoCardsEnabled: true,
        }, { merge: true });
        console.log('✅ config/features créé\n');

        // 3. Créer un code promo de test
        console.log('📝 Création d'un code promo de test...');
    const testCodeId = db.collection('promoCodes').doc().id;
        await db.collection('promoCodes').doc(testCodeId).set({
            code: 'TEST2025',
            type: 'fixed',
            value: 10000,
            isActive: true,
            assignedTo: 'Test Influencer',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Code promo TEST2025 créé\n');

        // 4. Créer la règle associée au code test
        console.log('📝 Création de la règle pour TEST2025...');
        await db.collection('promoRules').doc('TEST2025').set({
            code: 'TEST2025',
            isActive: true,
            allowedChannels: ['web', 'app', 'wa', 'qr', 'bo'],
            startsAt: null,
            endsAt: null,
            partnerRefRequired: false,
            allowedPartners: [],
            priceBrackets: [
                {
                    min: 0,
                    max: 149000,
                    discountValue: 5000,
                    commissionValue: 8000,
                    label: '0-149k',
                },
                {
                    min: 149000,
                    max: 249000,
                    discountValue: 10000,
                    commissionValue: 15000,
                    label: '149k-249k',
                },
                {
                    min: 249000,
                    max: 399000,
                    discountValue: 15000,
                    commissionValue: 25000,
                    label: '249k-399k',
                },
                {
                    min: 399000,
                    max: null,
                    discountValue: 20000,
                    commissionValue: 35000,
                    label: '400k+',
                },
            ],
        });
        console.log('✅ Règle TEST2025 créée\n');

        // 5. Log de génération de liens (init vide)
        console.log('📝 Vérification de la collection promoLinkGenerations...');
        const linkGenCount = await db.collection('promoLinkGenerations').count().get();
        console.log(`✅ Collection promoLinkGenerations prête (${linkGenCount.data().count} documents)\n`);

        // 6. Log de validation (init vide)
        console.log('📝 Vérification de la collection promoValidationLogs...');
        const validationCount = await db.collection('promoValidationLogs').count().get();
        console.log(`✅ Collection promoValidationLogs prête (${validationCount.data().count} documents)\n`);

        // 7. Log de ventes (init vide)
        console.log('📝 Vérification de la collection promoSalesLogs...');
        const salesCount = await db.collection('promoSalesLogs').count().get();
        console.log(`✅ Collection promoSalesLogs prête (${salesCount.data().count} documents)\n`);

        // 8. Métriques (init vide - se remplira automatiquement)
        console.log('📝 Vérification de la collection promoMetrics...');
        const metricsCount = await db.collection('promoMetrics').count().get();
        console.log(`✅ Collection promoMetrics prête (${metricsCount.data().count} codes)\n`);

        // 9. Paiements (init vide)
        console.log('📝 Vérification de la collection promoPayouts...');
        const payoutsCount = await db.collection('promoPayouts').count().get();
        console.log(`✅ Collection promoPayouts prête (${payoutsCount.data().count} paiements)\n`);

        console.log('🎉 Initialisation terminée avec succès!\n');
        console.log('📋 Résumé:');
        console.log('   - config/linkTemplates: ✅ Configuré pour africaphone.org/p/CODE');
        console.log('   - config/features: ✅ Créé');
        console.log('   - Code de test TEST2025: ✅ Créé avec grille de remises');
        console.log('   - Collections de tracking: ✅ Prêtes\n');
        console.log('🧪 Pour tester:');
        console.log('   1. Déployez les Cloud Functions: firebase deploy --only functions');
        console.log('   2. Déployez le Hosting: firebase deploy --only hosting:africaphone-org');
        console.log('   3. Générez un lien via l\'admin pour le code TEST2025');
        console.log('   4. Le lien sera: https://africaphone.org/p/TEST2025?ref=xxx\n');

    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Exécuter
initializeFirestore();
