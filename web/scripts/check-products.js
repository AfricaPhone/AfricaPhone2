/**
 * Diagnostic script to check products in Firebase
 * Run with: node scripts/check-products.js
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Find service account key
const possiblePaths = [
    path.join(__dirname, '..', '..', 'serviceAccountKey.json'),
    path.join(__dirname, '..', '..', 'functions', 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json'),
];

let serviceAccountPath = null;
for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        serviceAccountPath = p;
        break;
    }
}

if (!serviceAccountPath) {
    console.error('❌ Could not find serviceAccountKey.json');
    console.log('Tried paths:', possiblePaths);
    process.exit(1);
}

console.log('Using service account:', serviceAccountPath);

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function analyzeProducts() {
    console.log('\n📦 Analyzing products in Firebase...\n');

    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();

    console.log(`Total products: ${snapshot.size}\n`);

    // Analyze categories
    const categoryStats = {};
    const segmentStats = {};
    const typeStats = {};
    const samplesByCategory = {};

    snapshot.forEach((doc) => {
        const data = doc.data();

        // Category field
        const category = data.category || '(empty)';
        categoryStats[category] = (categoryStats[category] || 0) + 1;
        if (!samplesByCategory[category]) {
            samplesByCategory[category] = [];
        }
        if (samplesByCategory[category].length < 3) {
            samplesByCategory[category].push({ id: doc.id, name: data.name });
        }

        // Segment field
        const segment = data.segment || '(empty)';
        segmentStats[segment] = (segmentStats[segment] || 0) + 1;

        // Type field
        const type = data.type || '(empty)';
        typeStats[type] = (typeStats[type] || 0) + 1;
    });

    console.log('=== CATEGORY FIELD ANALYSIS ===');
    console.log('Expected values for website: tablette, accessoire');
    console.log('');
    Object.entries(categoryStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
            const isExpected = ['tablette', 'accessoire', 'smartphone', 'portable a touche'].includes(cat.toLowerCase());
            const indicator = isExpected ? '✅' : '⚠️';
            console.log(`  ${indicator} "${cat}": ${count} products`);
            if (samplesByCategory[cat]) {
                samplesByCategory[cat].forEach(p => console.log(`      - ${p.name} (${p.id})`));
            }
        });

    console.log('\n=== SEGMENT FIELD ANALYSIS ===');
    Object.entries(segmentStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([seg, count]) => {
            console.log(`  "${seg}": ${count} products`);
        });

    console.log('\n=== TYPE FIELD ANALYSIS ===');
    Object.entries(typeStats)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            console.log(`  "${type}": ${count} products`);
        });

    // Check for tablette specifically
    console.log('\n=== TABLETTE PRODUCTS (all variations) ===');
    let tabletteCount = 0;
    snapshot.forEach((doc) => {
        const data = doc.data();
        const cat = (data.category || '').toLowerCase();
        const seg = (data.segment || '').toLowerCase();
        const type = (data.type || '').toLowerCase();

        if (cat.includes('tablet') || seg.includes('tablet') || type.includes('tablet')) {
            tabletteCount++;
            console.log(`  - ${data.name} | category="${data.category}" segment="${data.segment}" type="${data.type}"`);
        }
    });
    if (tabletteCount === 0) {
        console.log('  ❌ No products with "tablette" in category, segment, or type');
    }

    // Check for accessoire specifically
    console.log('\n=== ACCESSOIRE PRODUCTS (all variations) ===');
    let accessoireCount = 0;
    snapshot.forEach((doc) => {
        const data = doc.data();
        const cat = (data.category || '').toLowerCase();
        const seg = (data.segment || '').toLowerCase();
        const type = (data.type || '').toLowerCase();
        const tags = Array.isArray(data.tags) ? data.tags.join(',').toLowerCase() : '';

        if (cat.includes('accessoire') || seg.includes('accessoire') || type.includes('accessoire') || tags.includes('accessoire')) {
            accessoireCount++;
            if (accessoireCount <= 10) {
                console.log(`  - ${data.name} | category="${data.category}" segment="${data.segment}" type="${data.type}"`);
            }
        }
    });
    if (accessoireCount > 10) {
        console.log(`  ... and ${accessoireCount - 10} more accessoire products`);
    }
    if (accessoireCount === 0) {
        console.log('  ❌ No products with "accessoire" in category, segment, type, or tags');
    }

    console.log('\n=== DIAGNOSIS ===');
    const hasTablette = Object.keys(categoryStats).some(k => k.toLowerCase().includes('tablet'));
    const hasAccessoire = Object.keys(categoryStats).some(k => k.toLowerCase().includes('accessoire'));

    if (!hasTablette) {
        console.log('⚠️ PROBLEM: No products have category containing "tablette"');
        console.log('   SOLUTION: Update products in admin panel to set category = "tablette"');
    }
    if (!hasAccessoire) {
        console.log('⚠️ PROBLEM: No products have category containing "accessoire"');
        console.log('   SOLUTION: Update products in admin panel to set category = "accessoire"');
    }
    if (hasTablette && hasAccessoire) {
        console.log('✅ Products with tablette and accessoire categories exist');
    }
}

analyzeProducts()
    .then(() => {
        console.log('\n✅ Analysis complete');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Error:', err);
        process.exit(1);
    });
