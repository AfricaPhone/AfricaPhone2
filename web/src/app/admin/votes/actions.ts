'use server';

import { getAdminDb } from '@/lib/firebaseAdmin'; // Assuming this exists or similar
import * as admin from 'firebase-admin';

// Types
export interface VoteStat {
    contestId: string;
    totalCandidates: number;
    totalVotes: number;
    totalAmount: number;
    totalTransactions: number;
}

export interface LostVote {
    transactionId: string;
    partnerId: string;
    amount: number;
    candidateId: string;
    contestId: string;
    date: string;
    status: string;
}

export interface CandidateReport {
    id: string;
    name: string;
    totalVotes: number;
    totalAmount: number;
    transactions: number;
}

// 1. Get Global Stats for a Contest
export async function getContestStats(contestId: string, startDate?: string, endDate?: string): Promise<VoteStat> {
    const db = getAdminDb();

    // Fetch Contest Doc (for static info if needed, but we rely on votes for dynamic stats)
    // const contestDoc = await db.collection('contests').doc(contestId).get();

    // Fetch Candidates (to get total candidates count)
    const candidatesSnap = await db.collection('contests').doc(contestId).collection('candidates').get();

    // Fetch Votes
    const votesSnap = await db.collection('contests').doc(contestId).collection('votes').get();

    let totalVotes = 0;
    let totalAmount = 0;
    let totalTransactions = 0;

    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : 9999999999999;

    votesSnap.forEach(doc => {
        const v = doc.data();
        const createdAt = v.createdAt?.toDate ? v.createdAt.toDate().getTime() : 0;

        if (createdAt >= start && createdAt <= end) {
            // Note: v.amount / 100 roughly equals votes, but v.amount is strictly money.
            // If we want exact VOICES, we usually calculate amount/UNIT.
            // Assuming 100 FCFA = 1 Vote based on previous context.
            const votes = Math.floor((v.amount || 0) / 100);

            totalAmount += (v.amount || 0);
            totalVotes += votes;
            totalTransactions += 1;
        }
    });

    return {
        contestId,
        totalCandidates: candidatesSnap.size,
        totalVotes: totalVotes,
        totalAmount: totalAmount,
        totalTransactions: totalTransactions
    };
}

// 2. Get Candidates Ranking (Consolidated)
export async function getCandidateRankings(contestId: string, startDate?: string, endDate?: string): Promise<CandidateReport[]> {
    const db = getAdminDb();
    const candidatesSnap = await db.collection('contests').doc(contestId).collection('candidates').get();
    const votesSnap = await db.collection('contests').doc(contestId).collection('votes').get();

    const candidatesMap: Record<string, CandidateReport> = {};

    candidatesSnap.forEach(doc => {
        const d = doc.data();
        candidatesMap[doc.id] = {
            id: doc.id,
            name: d.name || d.fullname || d.label || 'Inconnu',
            totalVotes: 0,
            totalAmount: 0,
            transactions: 0
        };
    });

    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : 9999999999999;

    votesSnap.forEach(doc => {
        const v = doc.data();
        const createdAt = v.createdAt?.toDate ? v.createdAt.toDate().getTime() : 0;
        const cid = v.candidateId;

        if (candidatesMap[cid] && createdAt >= start && createdAt <= end) {
            candidatesMap[cid].totalAmount += (v.amount || 0);
            candidatesMap[cid].transactions += 1;
            candidatesMap[cid].totalVotes += Math.floor((v.amount || 0) / 100);
        }
    });

    // Sort Descending
    return Object.values(candidatesMap).sort((a, b) => b.totalVotes - a.totalVotes);
}

// 3. Detect Lost Votes (Reconciliation)
// Note: This requires the list of Kkiapay Transactions.
// We can't easily fetch Kkiapay ALL history from here without API Key.
// Assuming we pass a list of "Success Transaction IDs" from client (uploaded file)?
// Or we just check 'pending' intents that HAVE a success payment in 'payments' collection?
// The "Internal Reconciliation" (Firebase Payments vs Vote Intents) is safer/easier.
export async function scanForLostVotes(contestId: string): Promise<LostVote[]> {
    const db = getAdminDb();

    // Strategy: Look for voteIntents that are 'pending'
    // AND have a corresponding 'payment' that is 'success'.

    const pendingIntentsSnap = await db.collection('voteIntents')
        .where('contestId', '==', contestId)
        .where('status', '==', 'pending')
        .get();

    const lostVotes: LostVote[] = [];

    // This loop effectively does the "Internal Join"
    for (const doc of pendingIntentsSnap.docs) {
        const intent = doc.data();
        const partnerId = doc.id; // Correct? Yes, doc ID is intentId (partnerId) usually.

        // Wait, partnerId in Kkiapay = Intent ID. 
        // We need to find if there IS a successful payment for this Intent.

        // Payments are indexed by Transaction ID usually, but we might query by partnerId?
        const paymentQuery = await db.collection('payments')
            .where('partnerId', '==', partnerId)
            .where('status', '==', 'success') // or similar
            .get();

        if (!paymentQuery.empty) {
            // FOUND ONE!
            const payment = paymentQuery.docs[0].data();
            lostVotes.push({
                transactionId: payment.transactionId || paymentQuery.docs[0].id,
                partnerId: partnerId,
                amount: payment.amount || intent.amount,
                candidateId: intent.candidateId,
                contestId: intent.contestId,
                date: payment.createdAt?.toDate ? payment.createdAt.toDate().toISOString() : new Date().toISOString(),
                status: 'LOST'
            });
        }
    }

    return lostVotes;
}

// 4. Recover a specific Lost Vote
export async function recoverLostVoteAction(vote: LostVote) {
    const db = getAdminDb();
    const { transactionId, partnerId, amount, candidateId, contestId } = vote;

    try {
        await db.runTransaction(async (t) => {
            const intentRef = db.collection('voteIntents').doc(partnerId);
            const voteRef = db.collection('contests').doc(contestId).collection('votes').doc(transactionId);
            const candidateRef = db.collection('contests').doc(contestId).collection('candidates').doc(candidateId);
            const contestRef = db.collection('contests').doc(contestId);

            const intentDoc = await t.get(intentRef);
            if (!intentDoc.exists) throw new Error("Intent missing");
            if (intentDoc.data()?.status === 'counted') return; // Idempotent

            const votesToAdd = Math.floor(amount / 100);

            t.set(voteRef, {
                transactionId,
                userId: intentDoc.data()?.userId || 'guest',
                candidateId,
                contestId,
                amount,
                counted: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                recovered: true,
                recoveredAt: admin.firestore.FieldValue.serverTimestamp()
            });

            t.update(intentRef, {
                status: 'counted',
                transactionId,
                countedAt: admin.firestore.FieldValue.serverTimestamp(),
                recovered: true
            });

            t.update(candidateRef, {
                voteCount: admin.firestore.FieldValue.increment(votesToAdd)
            });

            t.update(contestRef, {
                totalVotes: admin.firestore.FieldValue.increment(votesToAdd)
            });
        });
        return { success: true };
    } catch (e: any) {
        console.error("Recovery failed", e);
        return { success: false, error: e.message };
    }
}
