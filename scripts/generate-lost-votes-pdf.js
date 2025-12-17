#!/usr/bin/env node

/**
 * Generate PDF report of lost votes grouped by candidate
 */

const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const admin = require('firebase-admin');

const LOST_VOTES_FILE = path.join(__dirname, '..', 'exports', 'votes-artistes-lost-2025-12-16.json');
const OUTPUT_PDF = path.join(__dirname, '..', 'exports', 'votes-artistes-lost-by-candidate.pdf');

function initAdmin() {
    if (admin.apps.length > 0) return admin;

    const possiblePaths = [
        'africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json',
        'africaphone-vente-firebase-adminsdk-fbsvc-1fcd2f6858.json',
    ];

    let credentials = null;
    for (const fileName of possiblePaths) {
        try {
            const filePath = path.join(process.cwd(), fileName);
            credentials = require(filePath);
            break;
        } catch (e) { }
    }

    if (credentials) {
        admin.initializeApp({ credential: admin.credential.cert(credentials) });
    }
    return admin;
}

async function getCandidateNames(candidateIds) {
    const names = {};

    try {
        initAdmin();
        const db = admin.firestore();

        for (const candidateId of candidateIds) {
            const doc = await db.collection('contests').doc('votes-artistes')
                .collection('candidates').doc(candidateId).get();

            if (doc.exists) {
                const data = doc.data();
                names[candidateId] = data.name || data.media || candidateId;
            } else {
                names[candidateId] = candidateId;
            }
        }
    } catch (e) {
        console.warn('Could not fetch candidate names from Firebase:', e.message);
        candidateIds.forEach(id => { names[id] = id; });
    }

    return names;
}

async function main() {
    console.log('=== GÉNÉRATION DU RAPPORT PDF ===\n');

    // Read lost votes
    if (!fs.existsSync(LOST_VOTES_FILE)) {
        console.error(`Fichier non trouvé: ${LOST_VOTES_FILE}`);
        process.exit(1);
    }

    const lostVotes = JSON.parse(fs.readFileSync(LOST_VOTES_FILE, 'utf8'));
    console.log(`Votes perdus chargés: ${lostVotes.length}`);

    // Group by candidate
    const byCandidate = {};
    lostVotes.forEach(vote => {
        const candidateId = vote.candidateId || 'unknown';
        if (!byCandidate[candidateId]) {
            byCandidate[candidateId] = { votes: [], totalAmount: 0, totalVoix: 0 };
        }
        const amount = Number(vote.amount) || 0;
        const voix = Math.floor(amount / 100);
        byCandidate[candidateId].votes.push(vote);
        byCandidate[candidateId].totalAmount += amount;
        byCandidate[candidateId].totalVoix += voix;
    });

    // Get candidate names from Firebase
    const candidateIds = Object.keys(byCandidate);
    console.log(`Candidats concernés: ${candidateIds.length}`);

    const candidateNames = await getCandidateNames(candidateIds);

    // Create PDF
    console.log('\nGénération du PDF...');
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(OUTPUT_PDF);
    doc.pipe(stream);

    // Title
    doc.fontSize(20).font('Helvetica-Bold')
        .text('RAPPORT DES VOTES PERDUS', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica')
        .text('Concours: votes-artistes', { align: 'center' });
    doc.fontSize(10)
        .text(`Date du rapport: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
    doc.moveDown();

    // Summary
    let grandTotalVoix = 0;
    let grandTotalAmount = 0;
    Object.values(byCandidate).forEach(c => {
        grandTotalVoix += c.totalVoix;
        grandTotalAmount += c.totalAmount;
    });

    doc.fontSize(12).font('Helvetica-Bold')
        .text('RÉSUMÉ GLOBAL', { underline: true });
    doc.fontSize(11).font('Helvetica');
    doc.text(`Total transactions: ${lostVotes.length}`);
    doc.text(`Total voix perdues: ${grandTotalVoix}`);
    doc.text(`Total montant: ${grandTotalAmount.toLocaleString('fr-FR')} XOF`);
    doc.text(`Candidats concernés: ${candidateIds.length}`);
    doc.moveDown(1.5);

    // Sort candidates by total votes lost (descending)
    const sortedCandidates = candidateIds.sort((a, b) =>
        byCandidate[b].totalVoix - byCandidate[a].totalVoix
    );

    // Details by candidate
    doc.fontSize(12).font('Helvetica-Bold')
        .text('DÉTAILS PAR CANDIDAT', { underline: true });
    doc.moveDown();

    sortedCandidates.forEach((candidateId, index) => {
        const candidate = byCandidate[candidateId];
        const name = candidateNames[candidateId] || candidateId;

        // Check if we need a new page
        if (doc.y > 650) {
            doc.addPage();
        }

        // Candidate header
        doc.fontSize(11).font('Helvetica-Bold')
            .fillColor('#1a365d')
            .text(`${index + 1}. ${name}`, { continued: false });

        doc.fontSize(10).font('Helvetica').fillColor('black')
            .text(`   ID: ${candidateId}`);
        doc.text(`   Voix perdues: ${candidate.totalVoix} | Montant: ${candidate.totalAmount.toLocaleString('fr-FR')} XOF`);
        doc.moveDown(0.3);

        // Transactions table header
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#4a5568');
        const tableTop = doc.y;
        doc.text('Transaction', 50, tableTop, { width: 120 });
        doc.text('Client', 170, tableTop, { width: 130 });
        doc.text('Montant', 300, tableTop, { width: 60 });
        doc.text('Voix', 360, tableTop, { width: 40 });
        doc.text('Date', 400, tableTop, { width: 140 });

        doc.moveTo(50, doc.y + 2).lineTo(540, doc.y + 2).stroke('#e2e8f0');
        doc.moveDown(0.3);

        // Transactions rows
        doc.fontSize(8).font('Helvetica').fillColor('black');
        candidate.votes.forEach(vote => {
            const y = doc.y;
            const amount = Number(vote.amount) || 0;
            const voix = Math.floor(amount / 100);
            const date = vote.date ? new Date(vote.date).toLocaleDateString('fr-FR') : 'N/A';

            doc.text(String(vote.transactionId || '').substring(0, 18), 50, y, { width: 120 });
            doc.text(String(vote.customer || 'N/A').substring(0, 22), 170, y, { width: 130 });
            doc.text(`${amount}`, 300, y, { width: 60 });
            doc.text(`${voix}`, 360, y, { width: 40 });
            doc.text(date, 400, y, { width: 140 });
            doc.moveDown(0.2);
        });

        doc.moveDown(0.8);
    });

    // Footer
    doc.fontSize(8).font('Helvetica').fillColor('#718096')
        .text(`Généré automatiquement le ${new Date().toLocaleString('fr-FR')}`, 50, 750, { align: 'center' });

    doc.end();

    stream.on('finish', () => {
        console.log(`\n✅ PDF généré: ${OUTPUT_PDF}`);
        process.exit(0);
    });
}

main().catch(error => {
    console.error('Erreur:', error);
    process.exit(1);
});
