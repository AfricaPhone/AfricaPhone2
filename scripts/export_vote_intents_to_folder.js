const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const CONTEST_ID = 'votes-artistes';
const OUTPUT_DIR = path.join(__dirname, '..', 'Affaire Vote');
const OUTPUT_FILENAME = `vote_intents_export_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;

// Initialize Firebase Admin
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
            console.log(`Using service account: ${fileName}`);
            break;
        } catch (e) { }
    }

    if (!credentials) {
        throw new Error('No service account file found!');
    }

    admin.initializeApp({
        credential: admin.credential.cert(credentials),
    });
    return admin;
}

function serializeTimestamp(value) {
    if (!value) return '';
    if (value.toDate) return value.toDate().toISOString();
    if (value._seconds) return new Date(value._seconds * 1000).toISOString();
    return value;
}

async function main() {
    try {
        initAdmin();
        const db = admin.firestore();

        console.log(`Fetching voteIntents for contest: ${CONTEST_ID}...`);

        // Fetch all intents for the contest
        const snapshot = await db.collection('voteIntents')
            .where('contestId', '==', CONTEST_ID)
            .get();

        if (snapshot.empty) {
            console.log('No vote intents found.');
            return;
        }

        console.log(`Found ${snapshot.size} intents. Processing...`);

        const intents = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            intents.push({
                intentId: doc.id,
                contestId: data.contestId || '',
                candidateId: data.candidateId || '',
                amount: data.amount || 0,
                status: data.status || '',
                createdAt: serializeTimestamp(data.createdAt),
                transactionId: data.transactionId || '',
                userId: data.userId || ''
            });
        });

        // Convert to CSV manually
        const fields = ['intentId', 'contestId', 'candidateId', 'amount', 'status', 'createdAt', 'transactionId', 'userId'];
        const csvRows = [fields.join(',')]; // Header

        intents.forEach(intent => {
            const row = fields.map(field => {
                const val = intent[field];
                // Escape quotes if string
                if (typeof val === 'string') {
                    return `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            });
            csvRows.push(row.join(','));
        });

        const csv = csvRows.join('\n');

        // Ensure output directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILENAME);
        fs.writeFileSync(outputPath, csv);

        console.log(`Successfully exported ${intents.length} vote intents to:`);
        console.log(outputPath);

    } catch (error) {
        console.error('Error exporting vote intents:', error);
        process.exit(1);
    }
}

main();
