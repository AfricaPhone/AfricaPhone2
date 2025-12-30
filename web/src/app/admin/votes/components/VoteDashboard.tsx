'use client';

import { useState, useEffect } from 'react';
import {
    VoteStat, CandidateReport, LostVote,
    getContestStats, getCandidateRankings, scanForLostVotes, recoverLostVoteAction
} from '../actions';

interface Props {
    contests: { id: string, name: string }[];
}

export default function VoteDashboard({ contests }: Props) {
    const [selectedContest, setSelectedContest] = useState(contests[0]?.id || '');
    const [stats, setStats] = useState<VoteStat | null>(null);
    const [rankings, setRankings] = useState<CandidateReport[]>([]);
    const [lostVotes, setLostVotes] = useState<LostVote[]>([]);
    const [loading, setLoading] = useState(false);
    // Default: Last 30 days or Full Period? User asked for "Periode".
    // Let's defaults to empty (All time)
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (selectedContest) {
            loadData(selectedContest, startDate, endDate);
        }
    }, [selectedContest, startDate, endDate]);

    const loadData = async (contestId: string, start?: string, end?: string) => {
        setLoading(true);
        try {
            const [s, r, l] = await Promise.all([
                getContestStats(contestId, start, end),
                getCandidateRankings(contestId, start, end),
                scanForLostVotes(contestId) // Lost votes are absolute, date filter maybe not relevant for "Detection" but yes for display.
                // For now, keep detection absolute.
            ]);
            setStats(s);
            setRankings(r);
            setLostVotes(l);
        } catch (e) {
            console.error(e);
            alert("Erreur de chargement des données");
        } finally {
            setLoading(false);
        }
    };

    const handleRecover = async (vote: LostVote) => {
        if (!confirm(`Récupérer le vote de ${vote.amount} XOF pour ${vote.candidateId}?`)) return;

        const res = await recoverLostVoteAction(vote);
        if (res.success) {
            alert("Vote récupéré avec succès!");
            loadData(selectedContest); // Refresh
        } else {
            alert("Erreur: " + res.error);
        }
    };

    return (
        <div className="space-y-8">
            {/* 1. Selector */}
            <div className="bg-white p-6 rounded-lg shadow">
                <label className="block text-sm font-medium text-gray-700 mb-2">Choisir un concours</label>
                <select
                    aria-label="Sélectionner Concours"
                    value={selectedContest}
                    onChange={(e) => setSelectedContest(e.target.value)}
                    className="block w-full p-2 border border-gray-300 rounded-md"
                >
                    {contests.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <div className="mt-4 flex space-x-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Du</label>
                        <input
                            aria-label="Date de début"
                            type="date"
                            className="p-2 border rounded"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Au</label>
                        <input
                            aria-label="Date de fin"
                            type="date"
                            className="p-2 border rounded"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading && <div className="text-center py-10">Chargement...</div>}

            {!loading && stats && (
                <>
                    {/* 2. Global Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard title="Total Candidats" value={stats.totalCandidates} icon="👥" />
                        <StatCard title="Total Transactions" value={stats.totalTransactions} icon="💳" />
                        <StatCard title="Total Votes (Voix)" value={stats.totalVotes} icon="🗳️" />
                        <StatCard title="Montant Collecté" value={stats.totalAmount.toLocaleString() + ' FCFA'} icon="💰" />
                    </div>

                    {/* 3. Lost Votes Alert */}
                    {lostVotes.length > 0 ? (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded animate-pulse">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-red-800 font-bold">⚠️ ANOMALIE DÉTECTÉE</h3>
                                    <p className="text-red-700">Nous avons trouvé <strong>{lostVotes.length} votes perdus</strong> (Paiement OK mais non comptabilisés).</p>
                                </div>
                                <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                                    Voir détails
                                </button>
                            </div>
                            <div className="mt-4">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr>
                                            <th>Transaction</th>
                                            <th>Montant</th>
                                            <th>Date</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lostVotes.map(v => (
                                            <tr key={v.transactionId}>
                                                <td>{v.transactionId}</td>
                                                <td>{v.amount}</td>
                                                <td>{new Date(v.date).toLocaleString()}</td>
                                                <td>
                                                    <button
                                                        onClick={() => handleRecover(v)}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        Récupérer
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                            <p className="text-green-700">✅ Aucune anomalie détectée. Le système est intègre.</p>
                        </div>
                    )}

                    {/* 4. Rankings Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">Classement en temps réel</h3>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rang</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidat</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {rankings.map((c, idx) => (
                                    <tr key={c.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{idx + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.transactions}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.totalAmount.toLocaleString()} FCFA</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{c.totalVotes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: string }) {
    return (
        <div className="bg-white rounded-lg p-6 shadow flex items-center space-x-4">
            <div className="text-4xl">{icon}</div>
            <div>
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}
