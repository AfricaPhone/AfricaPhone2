const CONTEST_ID = 'press-stars-2025';
const VOTE_DURATION_MINUTES = 2;

// NOTE: Vérifiez les droits d'utilisation des photos avant diffusion publique.
const CANDIDATES = [
  {
    id: 'modeste-tolouwa-nanyo-adani',
    name: 'Modeste Tolouwa-Nanyo Adani',
    media: 'SRTB - Radio Bénin',
    bio: 'Reporter radio distingué aux Dedras Climate Awards 2024 pour ses enquêtes sur la résilience climatique.',
    voteCount: 0,
    photoUrl: 'https://afrikmotiv.com/wp-content/uploads/2024/12/image-2.png',
    tagline: 'La voix du climat sur les ondes nationales.',
  },
  {
    id: 'ozias-sounouvou',
    name: 'Ozias Sounouvou',
    media: 'Télévision nationale du Bénin (ORTB)',
    bio: 'Présentateur vedette reconnu pour ses analyses politiques et son ton incisif sur l’actualité nationale.',
    voteCount: 0,
    photoUrl: 'https://i0.wp.com/lesoleilbenin.com/wp-content/uploads/2015/06/Ozias-Sounouvou.jpg?fit=1200%2C357&ssl=1',
    tagline: 'L’édito sans détour du 20h.',
  },
  {
    id: 'hermann-rodrigue-amegan',
    name: 'Hermann Rodrigue Amegan',
    media: 'ORTB - Bonjour le Bénin',
    bio: 'Journaliste reporter d’images et co-animateur de l’émission “Bonjour le Bénin”, proche du terrain.',
    voteCount: 0,
    photoUrl: 'https://i.ytimg.com/vi/2G74U3BQbT8/maxresdefault.jpg',
    tagline: 'Le regard du matin sur les réalités locales.',
  },
  {
    id: 'wilfried-leandre-houngbedji',
    name: 'Wilfried Léandre Houngbédji',
    media: 'Porte-parole du Gouvernement (ex La Nation)',
    bio: 'Ancien rédacteur en chef et porte-parole, longtemps figure du quotidien La Nation et des conférences gouvernementales.',
    voteCount: 0,
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Wilifrend_L%C3%A9andre_Houngb%C3%A9dji_02.jpg',
    tagline: 'Informer et répondre au nom de l’État.',
  },
  {
    id: 'alphonse-moise-soude',
    name: 'Alphonse Moïse Soudé',
    media: 'Le Matinal / Analyste politique',
    bio: 'Chroniqueur et analyste politique béninois, habitué des plateaux télé et des dossiers sur la liberté de la presse.',
    voteCount: 0,
    photoUrl: 'https://lematinal.bj/wp-content/uploads/2022/05/Alphonse-Moise-Soude.png',
    tagline: 'Le décryptage des enjeux démocratiques.',
  },
  {
    id: 'arthur-houindo',
    name: 'Arthur Houindo',
    media: 'Eden TV',
    bio: 'Journaliste reporter d’images distingué par l’ambassade de Chine pour ses productions télévisées.',
    voteCount: 0,
    photoUrl: 'https://benin-eden.tv/wp-content/uploads/2024/12/arthur.jpg',
    tagline: 'L’image comme preuve sur Eden TV.',
  },
  {
    id: 'franck-ahounou',
    name: 'Franck Ahounou',
    media: 'Canal 3 Bénin',
    bio: 'Rédacteur en chef de Canal 3 Bénin, artisan des grands journaux télévisés de la chaîne privée.',
    voteCount: 0,
    photoUrl: 'https://www.banouto.bj/images/imagekit/mobile/w780/image-preview_Nt63npcUL.jpg',
    tagline: 'L’info Canal 3 dans la rigueur.',
  },
  {
    id: 'emilien-david',
    name: 'Émilien David',
    media: 'TV5 Monde Afrique',
    bio: 'Correspondant de TV5 Monde Afrique à Cotonou, spécialiste des dossiers diplomatiques et sociétaux.',
    voteCount: 0,
    photoUrl: 'https://www.24haubenin.info/local/cache-gd2/18/6890fce82f567b39797318213afc78.jpg',
    tagline: 'Les grands récits africains pour TV5.',
  },
  {
    id: 'jean-luc-aplogan',
    name: 'Jean-Luc Aplogan',
    media: 'RFI',
    bio: 'Correspondant RFI Afrique de l’Ouest, voix familière des reportages sur la diplomatie et l’économie béninoises.',
    voteCount: 0,
    photoUrl: 'https://ui-avatars.com/api/?name=Jean-Luc+Aplogan&background=0F172A&color=fff',
    tagline: 'Le souffle RFI sur l’actualité ouest-africaine.',
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
  const start = new Date(now.getTime() - 60 * 1000);
  const end = new Date(now.getTime() + VOTE_DURATION_MINUTES * 60 * 1000);

  const contestRef = db.collection('contests').doc(CONTEST_ID);

  await contestRef.set(
    {
      title: 'Trophées des journalistes béninois 2025',
      description:
        'Vote express de 15 minutes pour élire la voix médiatique qui a marqué l’année au Bénin.',
      startDate: admin.firestore.Timestamp.fromDate(start),
      endDate: admin.firestore.Timestamp.fromDate(end),
      status: 'active',
      isTest: false,
      isPublic: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
        media: candidate.media,
        bio: candidate.bio,
        voteCount: candidate.voteCount ?? 0,
        photoUrl: candidate.photoUrl,
        tagline: candidate.tagline,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
