#!/usr/bin/env node
/**
 * Récupère tous les candidats avec leurs numéros de téléphone
 * depuis contestCandidateProfiles et génère un rapport
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const CONTEST_ID = 'votes-artistes';

function initAdmin() {
    if (admin.apps.length > 0) return admin;

    const possiblePaths = [
        'africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json',
    ];

    let credentials = null;
    for (const fileName of possiblePaths) {
        try {
            const filePath = path.join(process.cwd(), fileName);
            credentials = require(filePath);
            console.log(`Using service account: ${fileName}`);
            break;
        } catch (e) { }
    }

    if (!credentials) throw new Error('No service account file found!');

    admin.initializeApp({ credential: admin.credential.cert(credentials) });
    return admin;
}

async function main() {
    initAdmin();
    const db = admin.firestore();

    console.log('Récupération des candidats...');

    // Récupérer candidats
    const candidatesSnap = await db.collection('contests').doc(CONTEST_ID).collection('candidates').get();

    // Récupérer les profils avec téléphones
    const profilesSnap = await db.collection('contestCandidateProfiles').where('contestId', '==', CONTEST_ID).get();

    // Map par phoneHash pour faire correspondre
    const profilesByHash = new Map();
    const profilesById = new Map();

    profilesSnap.forEach(doc => {
        const data = doc.data();
        if (data.phoneHash) {
            profilesByHash.set(data.phoneHash, {
                phone: data.phone || data.phoneNormalized || 'Non renseigné',
                id: doc.id
            });
        }
        profilesById.set(doc.id, {
            phone: data.phone || data.phoneNormalized || 'Non renseigné'
        });
    });

    console.log(`Trouvé ${candidatesSnap.size} candidats et ${profilesSnap.size} profils`);

    const candidates = [];
    candidatesSnap.forEach(doc => {
        const d = doc.data();
        // Chercher le téléphone via phoneHash ou ID
        let phone = 'Non renseigné';

        if (d.phoneHash && profilesByHash.has(d.phoneHash)) {
            phone = profilesByHash.get(d.phoneHash).phone;
        } else if (profilesById.has(doc.id)) {
            phone = profilesById.get(doc.id).phone;
        }

        candidates.push({
            id: doc.id,
            name: d.name || 'N/A',
            media: d.media || '',
            phone: phone,
            voteCount: d.voteCount || 0,
            phoneHash: d.phoneHash || ''
        });
    });

    // Trier par votes décroissants
    candidates.sort((a, b) => b.voteCount - a.voteCount);

    // Afficher le résultat
    console.log('\n=== CLASSEMENT DES CANDIDATS ===\n');
    console.log('Rang | Candidat | Téléphone | Votes | Montant');
    console.log('-----|----------|-----------|-------|--------');

    let totalVotes = 0;
    candidates.forEach((c, i) => {
        const montant = c.voteCount * 100;
        totalVotes += c.voteCount;
        console.log(`${(i + 1).toString().padStart(2)} | ${c.name} | ${c.phone} | ${c.voteCount} | ${montant.toLocaleString()} FCFA`);
    });

    console.log('-----|----------|-----------|-------|--------');
    console.log(`TOTAL: ${candidates.length} candidats | ${totalVotes} votes | ${(totalVotes * 100).toLocaleString()} FCFA`);

    // Sauvegarder en JSON
    const outputPath = path.join(process.cwd(), 'exports', 'candidates-with-phones.json');
    fs.writeFileSync(outputPath, JSON.stringify(candidates, null, 2));
    console.log(`\nExport JSON: ${outputPath}`);

    process.exit(0);
}

main().catch(e => {
    console.error('Erreur:', e);
    process.exit(1);
});
