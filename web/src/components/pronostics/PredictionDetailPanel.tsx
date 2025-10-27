'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getPendingSubmissionKey,
  getShareStorageKey,
  normalizePhone,
  REQUIRED_APP_SHARES,
  splitFullName,
  submitPronostic,
} from '@/lib/pronostics';
import type { Match, Prediction } from '@/types/pronostics';

export type PredictionDetailPanelProps = {
  match: Match | null;
  loading: boolean;
  error: string | null;
  winners: Prediction[];
  loadingWinners: boolean;
  errorWinners: string | null;
};

type PendingSubmission = {
  scoreA: number;
  scoreB: number;
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
};

const APP_SHARE_URL = 'https://africaphone-africaphone.web.app/';
const WHATSAPP_SHARE_MESSAGE = `Rejoignez-moi pour le prochain match ! Pronostique le score exact et tente de gagner ton téléphone gratuit chez AFRICA PHONE. Télécharge l’application ici : ${APP_SHARE_URL}`;
const MIN_PHONE_LENGTH = 6;

export default function PredictionDetailPanel({
  match,
  loading,
  error,
  winners,
  loadingWinners,
  errorWinners,
}: PredictionDetailPanelProps) {
  const [contactName, setContactName] = useState('');
  const [contactFirstName, setContactFirstName] = useState('');
  const [contactLastName, setContactLastName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [localShareCount, setLocalShareCount] = useState(0);
  const [pendingSubmission, setPendingSubmission] = useState<PendingSubmission | null>(null);
  const [sharePromptVisible, setSharePromptVisible] = useState(false);
  const [pendingShareFeedback, setPendingShareFeedback] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);

  const matchId = match?.id ?? null;
  const shareStorageKey = useMemo(() => (matchId ? getShareStorageKey(matchId) : null), [matchId]);
  const pendingSubmissionKey = useMemo(() => (matchId ? getPendingSubmissionKey(matchId) : null), [matchId]);

  useEffect(() => {
    setSubmissionMessage(null);
    setSubmissionError(null);
    setLastSubmissionId(null);

    if (!match) {
      setContactName('');
      setContactFirstName('');
      setContactLastName('');
      setContactPhone('');
      setScoreA('');
      setScoreB('');
      setLocalShareCount(0);
      setPendingSubmission(null);
      setSharePromptVisible(false);
      return;
    }

    if (shareStorageKey) {
      try {
        const raw = window.localStorage.getItem(shareStorageKey);
        const parsed = raw ? parseInt(raw, 10) : 0;
        setLocalShareCount(Number.isFinite(parsed) ? parsed : 0);
      } catch (storageError) {
        console.warn('PredictionDetailPanel: unable to read share count', storageError);
        setLocalShareCount(0);
      }
    } else {
      setLocalShareCount(0);
    }

    if (pendingSubmissionKey) {
      try {
        const rawDraft = window.localStorage.getItem(pendingSubmissionKey);
        if (rawDraft) {
          const parsed: PendingSubmission = JSON.parse(rawDraft);
          setPendingSubmission(parsed);
          setSharePromptVisible(true);
          setContactFirstName(parsed.contactFirstName);
          setContactLastName(parsed.contactLastName);
          setContactName(formatFullName(parsed.contactFirstName, parsed.contactLastName));
          setContactPhone(parsed.contactPhone);
          setScoreA(String(parsed.scoreA));
          setScoreB(String(parsed.scoreB));
        } else {
          setPendingSubmission(null);
          setSharePromptVisible(false);
        }
      } catch (draftError) {
        console.error('PredictionDetailPanel: unable to read pending submission', draftError);
        setPendingSubmission(null);
      }
    } else {
      setPendingSubmission(null);
      setSharePromptVisible(false);
    }
  }, [match, pendingSubmissionKey, shareStorageKey]);

  const performSubmission = useCallback(
    async (submission: PendingSubmission) => {
      if (!match || !matchId) {
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await submitPronostic({
          matchId,
          scoreA: submission.scoreA,
          scoreB: submission.scoreB,
          contactFirstName: submission.contactFirstName,
          contactLastName: submission.contactLastName,
          contactPhone: submission.contactPhone,
          predictionId: lastSubmissionId,
        });

        if (response.success) {
          setSubmissionMessage(response.message || 'Pronostic enregistré. Bonne chance !');
          setPendingSubmission(null);
          setSharePromptVisible(false);
          setLastSubmissionId(response.predictionId ?? null);
          setScoreA('');
          setScoreB('');
          if (pendingSubmissionKey) {
            try {
              window.localStorage.removeItem(pendingSubmissionKey);
            } catch (storageError) {
              console.warn('PredictionDetailPanel: unable to clear pending submission', storageError);
            }
          }
          if (shareStorageKey) {
            try {
              window.localStorage.removeItem(shareStorageKey);
            } catch (shareError) {
              console.warn('PredictionDetailPanel: unable to clear share count', shareError);
            }
          }
          setLocalShareCount(0);
        } else {
          setSubmissionError(response.message || "Impossible d'enregistrer le pronostic.");
        }
      } catch (submissionErrorInner) {
        console.error('PredictionDetailPanel: submission error', submissionErrorInner);
        const message =
          submissionErrorInner instanceof Error
            ? submissionErrorInner.message
            : "Une erreur inattendue s'est produite.";
        setSubmissionError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [lastSubmissionId, match, matchId, pendingSubmissionKey, shareStorageKey]
  );

  const handleShare = useCallback(async () => {
    if (!matchId) {
      return;
    }
    const encodedMessage = encodeURIComponent(WHATSAPP_SHARE_MESSAGE);
    const shareUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;

    setIsSharing(true);
    try {
      setPendingShareFeedback(true);
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    } catch (shareError) {
      console.error('PredictionDetailPanel: share error', shareError);
      setPendingShareFeedback(false);
    } finally {
      setIsSharing(false);
    }
  }, [matchId]);

  const applyShareProgress = useCallback(async () => {
    if (!matchId || !shareStorageKey) {
      return;
    }

    const before = Math.min(localShareCount, REQUIRED_APP_SHARES);
    if (before >= REQUIRED_APP_SHARES) {
      setPendingShareFeedback(false);
      return;
    }

    const after = Math.min(before + 1, REQUIRED_APP_SHARES);
    try {
      window.localStorage.setItem(shareStorageKey, String(after));
    } catch (storageError) {
      console.warn('PredictionDetailPanel: unable to persist share count', storageError);
    }

    setLocalShareCount(after);

    if (after >= REQUIRED_APP_SHARES) {
      setSharePromptVisible(false);
      if (pendingSubmission) {
        await performSubmission(pendingSubmission);
      } else {
        setSubmissionMessage('Merci pour le partage ! Vous pouvez maintenant placer votre pronostic.');
      }
    } else {
      setSubmissionMessage(
        `Merci pour le partage ! Il reste ${REQUIRED_APP_SHARES - after} partage(s) à effectuer pour valider votre participation.`
      );
    }

    setPendingShareFeedback(false);
  }, [localShareCount, matchId, pendingSubmission, performSubmission, shareStorageKey]);

  useEffect(() => {
    if (!pendingShareFeedback) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void applyShareProgress();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [applyShareProgress, pendingShareFeedback]);

  const matchStarted = useMemo(() => {
    if (!match) {
      return false;
    }
    const matchDate = match.startTime?.toDate?.();
    if (!matchDate) {
      return false;
    }
    const GRACE_PERIOD_MS = 60 * 1000;
    return Date.now() >= matchDate.getTime() - GRACE_PERIOD_MS;
  }, [match]);

  const matchEnded = useMemo(() => {
    if (!match) {
      return false;
    }
    return typeof match.finalScoreA === 'number' && typeof match.finalScoreB === 'number';
  }, [match]);

  const shareProgress = useMemo(() => {
    const effectiveShares = Math.min(localShareCount, REQUIRED_APP_SHARES);
    return {
      effectiveShares,
      ratio: REQUIRED_APP_SHARES === 0 ? 1 : Math.min(effectiveShares / REQUIRED_APP_SHARES, 1),
      percent: REQUIRED_APP_SHARES === 0 ? 100 : Math.round((effectiveShares / REQUIRED_APP_SHARES) * 100),
      remaining: Math.max(REQUIRED_APP_SHARES - effectiveShares, 0),
      complete: REQUIRED_APP_SHARES === 0 ? true : effectiveShares >= REQUIRED_APP_SHARES,
    };
  }, [localShareCount]);

  const communityTrends = useMemo(() => {
    if (!match || !match.trends || !match.predictionCount) {
      return [];
    }
    const total = match.predictionCount;
    if (total <= 0) {
      return [];
    }
    return Object.entries(match.trends)
      .map(([score, count]) => {
        const parsedCount = typeof count === 'number' ? count : 0;
        return {
          score,
          count: parsedCount,
          percentage: total > 0 ? Math.round((parsedCount / total) * 100) : 0,
        };
      })
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [match]);

  const matchDateLabel = useMemo(() => {
    const date = match?.startTime?.toDate?.();
    if (!date) {
      return 'Date à confirmer';
    }
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }, [match]);

  const scorePlaceholder = useMemo(() => {
    if (matchEnded && typeof match?.finalScoreA === 'number' && typeof match?.finalScoreB === 'number') {
      return `${match.finalScoreA} - ${match.finalScoreB}`;
    }
    return '0';
  }, [match, matchEnded]);

  const canSubmit = Boolean(match) && !matchStarted && !matchEnded;

  const handleContactNameChange = useCallback((value: string) => {
    setContactName(value);
    const { firstName, lastName } = splitFullName(value);
    setContactFirstName(firstName);
    setContactLastName(lastName);
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmissionError(null);
      setSubmissionMessage(null);

      if (!match || !matchId) {
        setSubmissionError('Veuillez sélectionner un match.');
        return;
      }
      if (!canSubmit) {
        setSubmissionError('Les pronostics sont fermés pour ce match.');
        return;
      }

      const trimmedFirst = contactFirstName.trim();
      const trimmedLast = contactLastName.trim();
      const trimmedPhone = contactPhone.trim();
      const normalizedPhone = normalizePhone(trimmedPhone);

      if (!trimmedFirst || !trimmedLast || !trimmedPhone) {
        setSubmissionError('Merci de renseigner vos nom, prénom et numéro WhatsApp.');
        return;
      }
      if (normalizedPhone.length < MIN_PHONE_LENGTH) {
        setSubmissionError('Le numéro WhatsApp fourni est invalide.');
        return;
      }

      const parsedScoreA = parseInt(scoreA, 10);
      const parsedScoreB = parseInt(scoreB, 10);
      if (Number.isNaN(parsedScoreA) || Number.isNaN(parsedScoreB)) {
        setSubmissionError('Veuillez saisir un score valide pour chaque équipe.');
        return;
      }

      const submission: PendingSubmission = {
        scoreA: parsedScoreA,
        scoreB: parsedScoreB,
        contactFirstName: trimmedFirst,
        contactLastName: trimmedLast,
        contactPhone: trimmedPhone,
      };

      if (!shareProgress.complete) {
        setPendingSubmission(submission);
        setSharePromptVisible(true);
        if (pendingSubmissionKey) {
          try {
            window.localStorage.setItem(pendingSubmissionKey, JSON.stringify(submission));
          } catch (storageError) {
            console.warn('PredictionDetailPanel: unable to persist pending submission', storageError);
          }
        }
        setSubmissionMessage(
          `Partagez l’application à ${shareProgress.remaining} personne(s) pour valider votre pronostic.`
        );
        return;
      }

      await performSubmission(submission);
    },
    [
      canSubmit,
      contactFirstName,
      contactLastName,
      contactPhone,
      match,
      matchId,
      pendingSubmissionKey,
      performSubmission,
      scoreA,
      scoreB,
      shareProgress.complete,
      shareProgress.remaining,
    ]
  );

  const handleForgetDraft = useCallback(() => {
    setPendingSubmission(null);
    setSharePromptVisible(false);
    if (pendingSubmissionKey) {
      try {
        window.localStorage.removeItem(pendingSubmissionKey);
      } catch (storageError) {
        console.warn('PredictionDetailPanel: unable to remove pending submission', storageError);
      }
    }
  }, [pendingSubmissionKey]);

  const renderContent = useMemo(() => {
    if (loading) {
      return <LoadingPanel />;
    }
    if (error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
          <strong className="text-base font-semibold text-rose-700">Erreur</strong>
          <p>{error}</p>
        </div>
      );
    }
    if (!match) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white/80 p-6 text-center text-sm text-slate-500">
          <strong className="text-base font-semibold text-slate-700">Sélectionnez un match</strong>
          <p>Choisissez un match dans la liste pour consulter les tendances et placer votre pronostic.</p>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-orange-100 sm:p-6">
        <header className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-orange-500">{match.competition}</span>
          <h2 className="text-2xl font-semibold text-slate-900">
            {match.teamA}{' '}
            <span className="text-lg font-normal text-slate-500" aria-hidden="true">
              vs
            </span>{' '}
            {match.teamB}
          </h2>
          <p className="text-sm text-slate-500">{matchDateLabel}</p>
          {matchEnded && typeof match.finalScoreA === 'number' && typeof match.finalScoreB === 'number' && (
            <p className="flex items-center gap-1 text-sm font-semibold text-slate-700">
              Score final :{' '}
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                {match.finalScoreA} - {match.finalScoreB}
              </span>
            </p>
          )}
        </header>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nom & prénom</span>
              <input
                type="text"
                value={contactName}
                onChange={event => handleContactNameChange(event.target.value)}
                placeholder="Ex. Jean Dupont"
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                disabled={!canSubmit || isSubmitting}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Numéro WhatsApp</span>
              <input
                type="tel"
                value={contactPhone}
                onChange={event => setContactPhone(event.target.value)}
                placeholder="Ex. 01 54 15 15 22"
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                disabled={!canSubmit || isSubmitting}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ScoreInput
              label={match.teamA}
              value={scoreA}
              onChange={setScoreA}
              placeholder={scorePlaceholder}
              disabled={!canSubmit || isSubmitting}
            />
            <ScoreInput
              label={match.teamB}
              value={scoreB}
              onChange={setScoreB}
              placeholder={scorePlaceholder}
              disabled={!canSubmit || isSubmitting}
            />
            <div className="col-span-2 flex flex-col justify-center rounded-2xl bg-orange-50 px-4 py-3 text-xs text-orange-600 sm:col-span-4 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
              <span>
                Partagez le lien de l&apos;application à {REQUIRED_APP_SHARES} personne(s) pour valider votre participation.
              </span>
              <button
                type="button"
                onClick={handleShare}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600 sm:mt-0 sm:text-sm"
                disabled={isSharing}
              >
                {isSharing ? 'Ouverture WhatsApp…' : 'Partager'}
              </button>
            </div>
          </div>

          <ShareProgressBar shareProgress={shareProgress} />

          {submissionError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {submissionError}
            </div>
          )}
          {submissionMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {submissionMessage}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-slate-800/40 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Enregistrement…' : 'Placer mon pronostic'}
            </button>
            {!canSubmit && (
              <span className="text-xs font-semibold uppercase tracking-wide text-rose-500">
                {matchEnded ? 'Match terminé' : 'Pronostics fermés'}
              </span>
            )}
          </div>
        </form>

        {sharePromptVisible && match && (
          <ShareReminderCard
            remaining={shareProgress.remaining}
            onShare={handleShare}
            onForget={handleForgetDraft}
            isSharing={isSharing}
          />
        )}

        <section className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4">
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Tendances des pronostics</h3>
            <span className="text-xs text-slate-500">{match.predictionCount ?? 0} pronostics</span>
          </header>
          {communityTrends.length === 0 ? (
            <p className="text-xs text-slate-500">
              Les tendances apparaîtront au fur et à mesure des participations.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {communityTrends.map(item => (
                <li
                  key={item.score}
                  className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs text-slate-600"
                >
                  <span className="font-mono text-sm font-semibold text-slate-700">{item.score}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-orange-500"
                        style={{ width: `${Math.max(item.percentage, 5)}%` }}
                      />
                    </div>
                    <span className="font-semibold text-slate-700">{item.percentage}%</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Gagnants</h3>
            {loadingWinners && <span className="text-xs text-slate-400">Chargement…</span>}
          </header>
          {errorWinners && <p className="text-xs text-rose-600">{errorWinners}</p>}
          {!errorWinners && winners.length === 0 && !loadingWinners && (
            <p className="text-xs text-slate-500">Les gagnants seront annoncés une fois le match terminé.</p>
          )}
          {!loadingWinners && winners.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {winners.map(winner => (
                <li key={winner.id} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
                  <p className="font-semibold text-slate-700">{winner.userName}</p>
                  <p className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-semibold text-white">
                      {winner.scoreA} - {winner.scoreB}
                    </span>
                    {winner.contactPhone && <span className="text-[11px] text-slate-400">{winner.contactPhone}</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }, [
    canSubmit,
    communityTrends,
    contactName,
    contactPhone,
    error,
    errorWinners,
    handleContactNameChange,
    handleForgetDraft,
    handleShare,
    handleSubmit,
    isSharing,
    isSubmitting,
    loading,
    loadingWinners,
    match,
    matchDateLabel,
    matchEnded,
    scoreA,
    scoreB,
    scorePlaceholder,
    sharePromptVisible,
    shareProgress,
    submissionError,
    submissionMessage,
    winners,
  ]);

  return (
    <section aria-labelledby="prediction-detail-title" className="flex h-full flex-col">
      <header className="mb-3 hidden">
        <h2 id="prediction-detail-title" className="text-lg font-semibold text-slate-900">
          Détail du match
        </h2>
      </header>
      {renderContent}
    </section>
  );
}

function formatFullName(first?: string, last?: string): string {
  const parts: string[] = [];
  if (first && first.trim().length > 0) {
    parts.push(first.trim());
  }
  if (last && last.trim().length > 0) {
    parts.push(last.trim());
  }
  return parts.join(' ');
}

function LoadingPanel() {
  return (
    <div className="flex h-full flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-orange-50">
      <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
      <div className="flex flex-col gap-4">
        <div className="h-12 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-12 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-12 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

type ScoreInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function ScoreInput({ label, value, onChange, placeholder, disabled }: ScoreInputProps) {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const numeric = event.target.value.replace(/[^\d]/g, '');
      onChange(numeric.slice(0, 2));
    },
    [onChange]
  );

  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-lg font-semibold text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
        disabled={disabled}
      />
    </label>
  );
}

type ShareProgressBarProps = {
  shareProgress: {
    ratio: number;
    percent: number;
    remaining: number;
    effectiveShares: number;
    complete: boolean;
  };
};

function ShareProgressBar({ shareProgress }: ShareProgressBarProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Progression des partages</span>
        <span>
          {shareProgress.effectiveShares}/{REQUIRED_APP_SHARES} ({shareProgress.percent}%)
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-white">
        <div
          className={`h-full rounded-full ${shareProgress.complete ? 'bg-emerald-500' : 'bg-orange-500'}`}
          style={{ width: `${Math.max(shareProgress.percent, shareProgress.complete ? 100 : 10)}%` }}
        />
      </div>
      {!shareProgress.complete && (
        <span className="text-xs text-slate-500">
          Encore {shareProgress.remaining} partage(s) pour valider votre participation.
        </span>
      )}
      {shareProgress.complete && (
        <span className="text-xs font-semibold text-emerald-600">
          Partages complétés, pronostic prêt à être validé.
        </span>
      )}
    </div>
  );
}

type ShareReminderCardProps = {
  remaining: number;
  onShare: () => void;
  onForget: () => void;
  isSharing: boolean;
};

function ShareReminderCard({ remaining, onShare, onForget, isSharing }: ShareReminderCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
      <strong className="text-base font-semibold text-orange-700">Partage requis</strong>
      <p>
        Vous avez un pronostic en attente. Partagez encore {remaining} fois l&apos;application pour que votre
        participation soit prise en compte.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onForget}
          className="inline-flex items-center justify-center rounded-full border border-orange-300 px-4 py-2 text-xs font-semibold text-orange-700 transition hover:border-orange-400 hover:text-orange-800"
        >
          Effacer le brouillon
        </button>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600"
          disabled={isSharing}
        >
          {isSharing ? 'Ouverture WhatsApp…' : 'Partager maintenant'}
        </button>
      </div>
    </div>
  );
}
