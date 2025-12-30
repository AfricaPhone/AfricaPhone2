const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// File Paths
const AFFAIRE_VOTE_DIR = path.join(__dirname, '..', 'Affaire Vote');
const KKIAPAY_FILE = path.join(AFFAIRE_VOTE_DIR, "LISTE-DES-TRANSACTIONS KKIAPAY jusqu'à maintenant.xlsx");
// Note: Using the exact filename observed in previous steps
const INTENTS_FILE = path.join(AFFAIRE_VOTE_DIR, "vote_intents_export_2025-12-29T11-09-34-049Z.xlsx");

function main() {
    console.log('=== DÉMARRAGE DE LA COMPARAISON KKIAPAY vs FIREBASE ===\n');

    // 1. Load Kkiapay Data
    console.log(`Lecture du fichier Kkiapay: ${path.basename(KKIAPAY_FILE)}`);
    const kkiapayWorkbook = XLSX.readFile(KKIAPAY_FILE);
    const kkiapaySheet = kkiapayWorkbook.Sheets['SUCCESS'] || kkiapayWorkbook.Sheets[kkiapayWorkbook.SheetNames[0]];
    const kkiapayData = XLSX.utils.sheet_to_json(kkiapaySheet);
    console.log(`-> ${kkiapayData.length} transactions trouvées.\n`);

    // 2. Load Vote Intents Data
    console.log(`Lecture du fichier Intents: ${path.basename(INTENTS_FILE)}`);
    const intentsWorkbook = XLSX.readFile(INTENTS_FILE);
    const intentsSheet = intentsWorkbook.Sheets[intentsWorkbook.SheetNames[0]];
    const intentsData = XLSX.utils.sheet_to_json(intentsSheet);
    console.log(`-> ${intentsData.length} intentions de vote trouvées.\n`);

    // Index intents by intentId for fast lookup
    const intentsMap = new Map();
    intentsData.forEach(row => {
        // Adjust key names if necessary based on inspection
        const id = row['intentId'] || row['intentId ']; // trim just in case
        if (id) intentsMap.set(id.trim(), row);
    });

    // 3. Compare
    console.log('--- ANALYSE EN COURS ---\n');

    const lostVotes = [];
    const unknownIntents = [];
    let matchedCount = 0;

    kkiapayData.forEach(tx => {
        // Normalize fields
        const status = tx['Status'] || tx['status'];
        const partnerId = tx['ID Partenaire'] || tx['id_partenaire'];
        const amount = tx['Montant'] || tx['montant'];
        const txId = tx['ID Transaction'] || tx['id_transaction'];
        const date = tx['Date'] || tx['date'];
        const customer = tx['Nom complet client'] || 'N/A';

        // Only interested in SUCCESS transactions in Kkiapay
        if (status !== 'SUCCESS') return;

        if (!partnerId) {
            // Transaction without partner ID (should match manually if needed, but strictly speaking cannot link automatically)
            return;
        }

        const intent = intentsMap.get(partnerId.trim());

        if (intent) {
            matchedCount++;
            // Check status discrepancies
            // We want: Kkiapay SUCCESS && Intent PENDING
            const intentStatus = intent['status'];

            if (intentStatus === 'pending') {
                lostVotes.push({
                    transactionId: txId,
                    partnerId: partnerId,
                    amount: amount,
                    candidateId: intent['candidateId'],
                    contestId: intent['contestId'],
                    date: date,
                    customer: customer
                });
            }
        } else {
            // Partner ID from Kkiapay not found in our export of intents
            // Could be another contest, or date mismatch if export was partial
            unknownIntents.push({
                transactionId: txId,
                partnerId: partnerId,
                amount: amount
            });
        }
    });

    // 4. Aggregation by Candidate
    const reportByCandidate = {};
    let totalLostVotes = 0;
    let totalLostAmount = 0;

    lostVotes.forEach(vote => {
        const candidate = vote.candidateId || 'Inconnu';
        const numVotes = Math.floor(vote.amount / 100); // Assuming 100 XOF per vote

        if (!reportByCandidate[candidate]) {
            reportByCandidate[candidate] = {
                candidateId: candidate,
                transactions: 0,
                votes: 0,
                revenue: 0
            };
        }

        reportByCandidate[candidate].transactions += 1;
        reportByCandidate[candidate].votes += numVotes;
        reportByCandidate[candidate].revenue += vote.amount;

        totalLostVotes += numVotes;
        totalLostAmount += vote.amount;
    });

    // 5. Output Results
    console.log('=== RÉSULTATS ===\n');
    console.log(`Transactions Kkiapay Success analysées : ${kkiapayData.length}`);
    console.log(`Match avec Intents : ${matchedCount}`);
    console.log(`Intents Inconnus (hors export) : ${unknownIntents.length}`);
    console.log(`\n🚨 VOTES PERDUS IDENTIFIÉS : ${lostVotes.length}\n`);

    if (Object.keys(reportByCandidate).length > 0) {
        // Sort by votes descending
        const sortedCandidates = Object.values(reportByCandidate).sort((a, b) => b.votes - a.votes);

        console.table(sortedCandidates.map(c => ({
            "Candidat ID": c.candidateId,
            "Nombre Tx": c.transactions,
            "Votes (Calculés)": c.votes,
            "Montant (XOF)": c.revenue
        })));

        console.log('\n-------------------------------------------------------------');
        console.log(`TOTAL GÉNÉRAL : ${totalLostVotes} Votes perdus | ${totalLostAmount} XOF`);
        console.log('-------------------------------------------------------------\n');

        // Export discrepancies to file for reference
        const reportPath = path.join(AFFAIRE_VOTE_DIR, 'rapport_votes_perdus_final.json');
        fs.writeFileSync(reportPath, JSON.stringify(lostVotes, null, 2));
        console.log(`Détails sauvegardés dans : ${reportPath}`);

    } else {
        console.log('✅ AUCUNE anomalie détectée. Tous les paiements Kkiapay correspondent à des intents "counted" (ou ne sont pas "pending").');
    }
}

main();
