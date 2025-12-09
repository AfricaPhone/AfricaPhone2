const admin = require('firebase-admin');
const path = require('path');

// Chemin vers votre fichier service account
// (Situé dans le dossier parent AfricaPhone2)
const serviceAccountPath = path.join(__dirname, '..', 'africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function init() {
    console.log('🚀 Démarrage de la configuration Firestore...');

    const config = {
        shortLinkDomain: 'https://africaphone.org',
        finalRedirectUrl: 'https://africaphone.org',
        appScheme: 'africaphone://apply-promo',
        appLinkDomain: 'https://africaphone.org/p',
        defaultCampaign: 'default',
        defaultSub: 'cta1',
        waMessageTemplate: 'Profite du code {code} sur AfricaPhone : {link} (ref {ref})',
        whatsappNumber: '22997000000', // Numéro par défaut
    };

    console.log('📝 Écriture de config/linkTemplates...');

    try {
        await db.collection('config').doc('linkTemplates').set(config, { merge: true });
        console.log('✅ Configuration sauvegardée avec succès !');
        console.log('   Document: config/linkTemplates');
        console.log('   Valeurs:', JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

init();
