const CANDIDATES = [
  {
    id: 'candidate-1',
    name: 'Amiya Kone',
    bio: 'Passionate about community-driven tech education.',
    voteCount: 0,
    photoUrl: 'https://example.com/images/candidates/amiya-kone.jpg',
    tagline: 'Tech for every classroom.',
  },
  {
    id: 'candidate-2',
    name: 'Benoit Diallo',
    bio: 'Entrepreneur focused on sustainable agriculture solutions.',
    voteCount: 0,
    photoUrl: 'https://example.com/images/candidates/benoit-diallo.jpg',
    tagline: 'Growing a greener future.',
  },
  {
    id: 'candidate-3',
    name: 'Zara Toure',
    bio: 'Multi-disciplinary artist amplifying young voices.',
    voteCount: 0,
    photoUrl: 'https://example.com/images/candidates/zara-toure.jpg',
    tagline: 'Art that inspires change.',
  },
];

let adminInstance;

function ensureCredentials() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS must point to a service account JSON key.'
    );
  }
}

async function getAdmin() {
  if (adminInstance) {
    return adminInstance;
  }

  ensureCredentials();

  const adminModule = await import('firebase-admin');
  const resolvedAdmin = adminModule.default ?? adminModule;

  if (resolvedAdmin.apps.length === 0) {
    resolvedAdmin.initializeApp({
      credential: resolvedAdmin.credential.applicationDefault(),
    });
  }

  adminInstance = resolvedAdmin;
  return adminInstance;
}

async function seedContest() {
  const admin = await getAdmin();
  const db = admin.firestore();

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  const end = new Date(now);
  end.setDate(end.getDate() + 7);

  const contestRef = db.collection('contests').doc('test-contest');

  await contestRef.set(
    {
      title: 'Concours Test',
      description:
        'Concours interne pour valider les flux de vote. Ne pas afficher publiquement.',
      startDate: admin.firestore.Timestamp.fromDate(start),
      endDate: admin.firestore.Timestamp.fromDate(end),
      status: 'hidden',
      isTest: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const batch = db.batch();

  CANDIDATES.forEach((candidate) => {
    const candidateRef = contestRef.collection('candidates').doc(candidate.id);
    batch.set(
      candidateRef,
      {
        name: candidate.name,
        bio: candidate.bio,
        voteCount: candidate.voteCount,
        photoUrl: candidate.photoUrl,
        tagline: candidate.tagline,
        isTestCandidate: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  await batch.commit();
}

async function main() {
  await seedContest();
}

if (process.argv[1] === __filename) {
  main()
    .then(() => {
      console.log('Seed completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

module.exports = { main };
