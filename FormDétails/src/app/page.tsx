type ContestSnapshot = {
  title: string;
  phase: string;
  summary: string;
  closingAt: string;
  location: string;
  lastSync: string;
};

type Voter = {
  id: string;
  supporter: string;
  location: string;
  votes: number;
  amount: number;
  method: string;
  lastVote: string;
};

type CandidateDetails = {
  id: string;
  name: string;
  media: string;
  highlight: string;
  color: string;
  totalVotes: number;
  totalAmount: number;
  goalProgress: number;
  voters: Voter[];
};

const mockContest: ContestSnapshot = {
  title: 'Concours AfricaPhone – Journaliste Tech 2025',
  phase: 'Votes en cours',
  summary: 'Espace réservé aux candidats pour suivre les contributions reçues.',
  closingAt: '2025-02-10T18:30:00Z',
  location: 'Abidjan & diffusion en ligne',
  lastSync: '2025-01-12T14:05:00Z',
};

const mockCandidates: CandidateDetails[] = [
  {
    id: 'cand-aicha',
    name: 'Aïcha Ndoye',
    media: 'AfricaNews TV',
    highlight: 'Couvre les innovations africaines depuis 7 ans',
    color: '#fde68a',
    totalVotes: 2540,
    totalAmount: 254000,
    goalProgress: 72,
    voters: [
      {
        id: 'vote-01',
        supporter: 'Mariam Traoré',
        location: 'Abidjan, CI',
        votes: 250,
        amount: 25000,
        method: 'Carte bancaire',
        lastVote: '2025-01-11T10:32:00Z',
      },
      {
        id: 'vote-02',
        supporter: 'André Kouamé',
        location: 'Yamoussoukro, CI',
        votes: 120,
        amount: 12000,
        method: 'Mobile Money',
        lastVote: '2025-01-10T18:12:00Z',
      },
      {
        id: 'vote-03',
        supporter: 'Nadia Bâ',
        location: 'Dakar, SN',
        votes: 75,
        amount: 7500,
        method: 'Carte bancaire',
        lastVote: '2025-01-09T09:45:00Z',
      },
    ],
  },
  {
    id: 'cand-kaan',
    name: 'Kaan Mensah',
    media: 'Radio Numérique Lomé',
    highlight: 'Présentateur du podcast « AfricaNext »',
    color: '#bfdbfe',
    totalVotes: 1985,
    totalAmount: 198500,
    goalProgress: 58,
    voters: [
      {
        id: 'vote-11',
        supporter: 'Clarisse Lawson',
        location: 'Lomé, TG',
        votes: 180,
        amount: 18000,
        method: 'Mobile Money',
        lastVote: '2025-01-12T09:18:00Z',
      },
      {
        id: 'vote-12',
        supporter: 'Didier Ossou',
        location: 'Cotonou, BJ',
        votes: 95,
        amount: 9500,
        method: 'Carte bancaire',
        lastVote: '2025-01-10T22:01:00Z',
      },
      {
        id: 'vote-13',
        supporter: 'Hermine Kaba',
        location: 'Accra, GH',
        votes: 80,
        amount: 8000,
        method: 'Mobile Money',
        lastVote: '2025-01-08T15:20:00Z',
      },
    ],
  },
  {
    id: 'cand-samuel',
    name: 'Samuel Koffi',
    media: 'TechStories Magazine',
    highlight: 'Newsletter hebdo sur les start-up africaines',
    color: '#fecdd3',
    totalVotes: 1787,
    totalAmount: 178700,
    goalProgress: 51,
    voters: [
      {
        id: 'vote-21',
        supporter: 'Prisca Gnahoré',
        location: 'San Pedro, CI',
        votes: 140,
        amount: 14000,
        method: 'Carte bancaire',
        lastVote: '2025-01-12T11:02:00Z',
      },
      {
        id: 'vote-22',
        supporter: 'Yacine Dia',
        location: 'Thiès, SN',
        votes: 90,
        amount: 9000,
        method: 'Mobile Money',
        lastVote: '2025-01-09T20:40:00Z',
      },
      {
        id: 'vote-23',
        supporter: 'Julien Mado',
        location: 'Bouaké, CI',
        votes: 80,
        amount: 8000,
        method: 'Virement bancaire',
        lastVote: '2025-01-07T14:12:00Z',
      },
    ],
  },
];

const numberFormatter = new Intl.NumberFormat('fr-FR');
const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XOF',
  maximumFractionDigits: 0,
});
const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const formatNumber = (value: number) => numberFormatter.format(value);
const formatAmount = (value: number) => currencyFormatter.format(value);
const formatDate = (value: string) => dateTimeFormatter.format(new Date(value));

const initialsFromName = (name: string) =>
  name
    .split(' ')
    .map(part => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const computeDaysLeft = (closingAt: string): string => {
  const target = new Date(closingAt).getTime();
  const now = Date.now();
  if (Number.isNaN(target) || target <= now) {
    return 'Clôture imminente';
  }
  const diff = target - now;
  const days = Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  return `${days} jour${days > 1 ? 's' : ''} restants`;
};

type StatCardProps = {
  label: string;
  value: string;
  caption?: string;
};

const StatCard = ({ label, value, caption }: StatCardProps) => (
  <article className="stat-card">
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    {caption ? <small style={{ color: '#94a3b8' }}>{caption}</small> : null}
  </article>
);

type CandidatePanelProps = {
  candidate: CandidateDetails;
  ranking: number;
  totalCandidates: number;
};

const CandidatePanel = ({ candidate, ranking, totalCandidates }: CandidatePanelProps) => {
  const supporterCount = candidate.voters.length;
  const leadSupporter = candidate.voters[0];

  return (
    <section className="candidate-panel" aria-label={`Détails pour ${candidate.name}`}>
      <div className="candidate-header">
        <div className="candidate-avatar" style={{ background: candidate.color }}>
          {initialsFromName(candidate.name)}
        </div>
        <div className="candidate-meta">
          <h3>{candidate.name}</h3>
          <p>{candidate.media}</p>
          <p style={{ marginTop: 6, color: '#1e293b', fontWeight: 500 }}>{candidate.highlight}</p>
        </div>
        <div className="badge">
          Position #{ranking} / {totalCandidates}
        </div>
      </div>

      <div className="candidate-stats" role="list">
        <div className="stat-highlight" role="listitem">
          <span>Total de voix</span>
          <strong>{formatNumber(candidate.totalVotes)}</strong>
          <div className="progress-track" aria-label="Progression du palier de voix">
            <div className="progress-bar" style={{ width: `${candidate.goalProgress}%` }} />
          </div>
        </div>
        <div className="stat-highlight" role="listitem">
          <span>Montant reçu</span>
          <strong>{formatAmount(candidate.totalAmount)}</strong>
          <small style={{ color: '#64748b' }}>Sur objectif projeté de 350 000 XOF</small>
        </div>
        <div className="stat-highlight" role="listitem">
          <span>Supporters actifs</span>
          <strong>{supporterCount}</strong>
          <small style={{ color: '#64748b' }}>{leadSupporter ? `${leadSupporter.supporter} mène avec ${formatNumber(leadSupporter.votes)} voix` : 'En attente des premiers votes'}</small>
        </div>
      </div>

      <h4 className="section-title">Contributions récentes</h4>
      {candidate.voters.length === 0 ? (
        <div className="empty-state">Aucune contribution enregistrée pour le moment.</div>
      ) : (
        <table className="voter-table">
          <thead>
            <tr>
              <th>Supporter</th>
              <th>Voix</th>
              <th>Montant</th>
              <th>Dernier vote</th>
              <th>Méthode</th>
            </tr>
          </thead>
          <tbody>
            {candidate.voters.map(voter => (
              <tr key={voter.id}>
                <td>
                  <div className="voter-name">{voter.supporter}</div>
                  <div className="voter-location">{voter.location}</div>
                </td>
                <td>{formatNumber(voter.votes)}</td>
                <td>
                  <span className="amount-pill">
                    {formatAmount(voter.amount)}
                  </span>
                </td>
                <td>{formatDate(voter.lastVote)}</td>
                <td>
                  <span className="method-pill">{voter.method}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

const computeAggregates = () => {
  const totals = mockCandidates.reduce(
    (acc, candidate) => {
      acc.votes += candidate.totalVotes;
      acc.amount += candidate.totalAmount;
      candidate.voters.forEach(voter => acc.supporters.add(voter.id));
      return acc;
    },
    { votes: 0, amount: 0, supporters: new Set<string>() }
  );
  return {
    votes: totals.votes,
    amount: totals.amount,
    supporters: totals.supporters.size,
  };
};

const ContestSummary = () => {
  const aggregates = computeAggregates();
  const closingLabel = formatDate(mockContest.closingAt);
  const daysLeft = computeDaysLeft(mockContest.closingAt);

  return (
    <section className="hero-card">
      <div className="hero-inner">
        <div>
          <div className="hero-meta">
            <span className="tag-pill">{mockContest.phase}</span>
            <span className="tag-pill">Edition 2025</span>
          </div>
          <h1 className="hero-title">{mockContest.title}</h1>
          <p className="hero-description">{mockContest.summary}</p>
          <div className="hero-footer">
            <span>📍 {mockContest.location}</span>
            <span>🗓️ Clôture : {closingLabel}</span>
            <span>⏳ {daysLeft}</span>
          </div>
        </div>

        <div className="stats-grid">
          <StatCard label="Supporters identifiés" value={formatNumber(aggregates.supporters)} caption="Uniquement les votants vérifiés" />
          <StatCard label="Voix consolidées" value={formatNumber(aggregates.votes)} caption="Somme des voix remontées" />
          <StatCard label="Montant cumulé" value={formatAmount(aggregates.amount)} caption="Projection calculée à 100 XOF / voix" />
          <StatCard label="Dernière synchronisation" value={formatDate(mockContest.lastSync)} caption="Flux interne FormVote" />
        </div>
      </div>
    </section>
  );
};

export default function ContestDetailsPage() {
  return (
    <main>
      <div className="page-shell">
        <ContestSummary />
        {mockCandidates.map((candidate, index) => (
          <CandidatePanel
            key={candidate.id}
            candidate={candidate}
            ranking={index + 1}
            totalCandidates={mockCandidates.length}
          />
        ))}
      </div>
    </main>
  );
}


