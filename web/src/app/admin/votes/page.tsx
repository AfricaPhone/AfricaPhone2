import VoteDashboard from './components/VoteDashboard';
import { getAdminDb } from '@/lib/firebaseAdmin';

// Fetch available contests for the dropdown
async function getContests() {
    const db = getAdminDb();
    const snapshot = await db.collection('contests').get();
    return snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().title || doc.id
    }));
}

export default async function VoteAdminPage() {
    const contests = await getContests();

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
                    🗳️ Espace de Gestion des Votes
                </h1>
                <VoteDashboard contests={contests} />
            </div>
        </div>
    );
}
