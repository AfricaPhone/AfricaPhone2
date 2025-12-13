/**
 * Script pour ajouter les catégories Tablettes et Accessoires à la collection brands
 * 
 * Usage: node functions/add-category-brands.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

const LOGOS_DIR = path.join(__dirname, '..', '.gemini', 'antigravity', 'brain', 'a3044123-7277-4472-82f5-00ba3faa9adc');

const CATEGORIES_TO_ADD = [
    {
        id: 'tablettes',
        name: 'Tablettes',
        logoFile: 'tablettes_logo_1765626812214.png',
        filterValue: 'tablette',
        description: 'Toutes les tablettes disponibles',
        tagline: 'tablette',
    },
    {
        id: 'accessoires',
        name: 'Accessoires',
        logoFile: 'accessoires_logo_1765626835836.png',
        filterValue: 'accessoire',
        description: 'Tous les accessoires disponibles',
        tagline: 'accessoire',
    },
];

async function getMaxSortOrder() {
    const snapshot = await db.collection('brands').orderBy('sortOrder', 'desc').limit(1).get();
    if (snapshot.empty) {
        return 0;
    }
    return snapshot.docs[0].data().sortOrder || 0;
}

async function uploadLogo(localPath, storagePath) {
    const file = bucket.file(storagePath);
    await bucket.upload(localPath, {
        destination: storagePath,
        metadata: {
            contentType: 'image/png',
            cacheControl: 'public, max-age=31536000',
        },
    });

    // Make the file publicly readable
    await file.makePublic();

    // Return the public URL
    return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

async function main() {
    console.log('🚀 Adding category brands to Firestore...\n');

    try {
        // Get current max sortOrder
        const maxSortOrder = await getMaxSortOrder();
        console.log(`📊 Current max sortOrder: ${maxSortOrder}\n`);

        let currentSortOrder = maxSortOrder;

        for (const category of CATEGORIES_TO_ADD) {
            currentSortOrder += 1;

            console.log(`📦 Processing: ${category.name}`);

            // Check if already exists
            const existingDoc = await db.collection('brands').doc(category.id).get();
            if (existingDoc.exists) {
                console.log(`   ⚠️  Already exists, skipping...\n`);
                continue;
            }

            // Upload logo to Firebase Storage
            const localLogoPath = path.join(LOGOS_DIR, category.logoFile);

            if (!fs.existsSync(localLogoPath)) {
                console.log(`   ❌ Logo file not found: ${localLogoPath}\n`);
                continue;
            }

            const storagePath = `brands/${category.id}.png`;
            console.log(`   📤 Uploading logo to Storage...`);
            const logoUrl = await uploadLogo(localLogoPath, storagePath);
            console.log(`   ✅ Logo uploaded: ${logoUrl}`);

            // Create Firestore document
            const brandData = {
                name: category.name,
                logoUrl: logoUrl,
                sortOrder: currentSortOrder,
                filterValue: category.filterValue,
                description: category.description,
                tagline: category.tagline,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            await db.collection('brands').doc(category.id).set(brandData);
            console.log(`   ✅ Firestore document created with sortOrder: ${currentSortOrder}\n`);
        }

        console.log('🎉 Done! Categories added successfully.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main().then(() => process.exit(0));
