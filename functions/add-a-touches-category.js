/**
 * Script pour ajouter la catégorie "À touches" à la collection brands
 * 
 * Usage: 
 *   cd functions
 *   node add-a-touches-category.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('../africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'africaphone-vente.firebasestorage.app'
    });
}

const db = admin.firestore();

const CATEGORY_TO_ADD = {
    id: 'a-touches',
    name: 'À touches',
    logoUrl: 'https://firebasestorage.googleapis.com/v0/b/africaphone-vente.firebasestorage.app/o/brands%2Fa-touches-logo.png?alt=media',
    filterValue: 'portable a touche',
    description: 'Tous les téléphones à touches disponibles',
    tagline: 'portable a touche',
};

async function getMaxSortOrder() {
    const snapshot = await db.collection('brands').orderBy('sortOrder', 'desc').limit(1).get();
    if (snapshot.empty) {
        return 0;
    }
    return snapshot.docs[0].data().sortOrder || 0;
}

async function main() {
    console.log('🚀 Ajout de la catégorie "À touches" dans Firestore...\n');

    try {
        // Check if already exists
        const existingDoc = await db.collection('brands').doc(CATEGORY_TO_ADD.id).get();
        if (existingDoc.exists) {
            console.log(`⚠️  La catégorie "${CATEGORY_TO_ADD.name}" existe déjà. Abandon.`);
            process.exit(0);
        }

        // Get current max sortOrder
        const maxSortOrder = await getMaxSortOrder();
        console.log(`📊 Ordre de tri actuel maximum: ${maxSortOrder}`);

        const newSortOrder = maxSortOrder + 1;

        // Create Firestore document
        const brandData = {
            name: CATEGORY_TO_ADD.name,
            logoUrl: CATEGORY_TO_ADD.logoUrl,
            sortOrder: newSortOrder,
            filterValue: CATEGORY_TO_ADD.filterValue,
            description: CATEGORY_TO_ADD.description,
            tagline: CATEGORY_TO_ADD.tagline,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('brands').doc(CATEGORY_TO_ADD.id).set(brandData);
        console.log(`✅ Document Firestore créé avec sortOrder: ${newSortOrder}`);
        console.log(`\n🎉 Catégorie "${CATEGORY_TO_ADD.name}" ajoutée avec succès !`);

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

main().then(() => process.exit(0));
