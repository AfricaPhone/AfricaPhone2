'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
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

type PendingSubmission = {
  scoreA: number;
  scoreB: number;
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
};

type LastSubmission = {
  scoreA: number;
  scoreB: number;
  timestamp: number;
};

export type PredictionDetailPanelProps = {
  match: Match | null;
  loading: boolean;
  error: string | null;
  winners: Prediction[];
  loadingWinners: boolean;
  errorWinners: string | null;
};

const MIN_PHONE_LENGTH = 6;
const APP_SHARE_URL = 'https://africaphone-africaphone.web.app/';
const WHATSAPP_SHARE_MESSAGE = `Rejoins-moi pour le prochain match ! Pronostique le score exact et tente de gagner ton telephone gratuit chez AFRICA PHONE. Telecharge l'application ici : ${APP_SHARE_URL}`;
const LAST_SUBMISSION_KEY_PREFIX = 'pronostics_last_submission_v1';

export default function PredictionDetailPanel({
  match,
  loading,
  error,
  winners,
  loadingWinners,
  errorWinners,
}: PredictionDetailPanelProps) {
  const router = useRouter();
  const [contactNameInput, setContactNameInput] = useState('');
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
  const [lastSubmission, setLastSubmission] = useState<LastSubmission | null>(null);
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'contact' | 'score'>('contact');
  const [modalError, setModalError] = useState<string | null>(null);

  const matchId = match?.id ?? null;

  const handleNavigateToWinners = useCallback(() => {
    if (!matchId) {
      return;
    }
    router.push(`/pronostics/${matchId}/winners`);
  }, [matchId, router]);

  const shareStorageKey = useMemo(() => (matchId ? getShareStorageKey(matchId) : null), [matchId]);
  const pendingSubmissionKey = useMemo(() => (matchId ? getPendingSubmissionKey(matchId) : null), [matchId]);
  const lastSubmissionKey = useMemo(
    () => (matchId ? `${LAST_SUBMISSION_KEY_PREFIX}_${matchId}` : null),
    [matchId]
  );

  useEffect(() => {
    setSubmissionError(null);
    setSubmissionMessage(null);

    if (!match || !matchId) {
      setLocalShareCount(0);
      setPendingSubmission(null);
      setSharePromptVisible(false);
      setLastSubmission(null);
      setLastSubmissionId(null);
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
          setContactNameInput(formatFullName(parsed.contactFirstName, parsed.contactLastName));
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

    if (lastSubmissionKey) {
      try {
        const rawLast = window.localStorage.getItem(lastSubmissionKey);
        if (rawLast) {
          const parsed: LastSubmission & { id?: string } = JSON.parse(rawLast);
          setLastSubmission({ scoreA: parsed.scoreA, scoreB: parsed.scoreB, timestamp: parsed.timestamp ?? Date.now() });
          setLastSubmissionId(parsed.id ?? null);
        } else {
          setLastSubmission(null);
          setLastSubmissionId(null);
        }
      } catch (lastError) {
        console.warn('PredictionDetailPanel: unable to read last submission', lastError);
        setLastSubmission(null);
        setLastSubmissionId(null);
      }
    } else {
      setLastSubmission(null);
      setLastSubmissionId(null);
    }
  }, [match, matchId, pendingSubmissionKey, shareStorageKey, lastSubmissionKey]);

  const matchStarted = useMemo(() => {
    if (!match) {
      return false;
    }
    const date = match.startTime?.toDate?.();
    if (!date) {
      return false;
    }
    const GRACE_PERIOD_MS = 60 * 1000;
    return Date.now() >= date.getTime() - GRACE_PERIOD_MS;
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
      .map(([score, count]) => ({
        score,
        count: typeof count === 'number' ? count : 0,
        percentage: total > 0 ? Math.round(((typeof count === 'number' ? count : 0) / total) * 100) : 0,
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [match]);

  const matchDateLabel = useMemo(() => {
    const date = match?.startTime?.toDate?.();
    if (!date) {
      return 'Date a confirmer';
    }
    const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
    return dateFormatter.format(date);
  }, [match]);

  const canSubmit = Boolean(match) && !matchStarted && !matchEnded;

  const handleContactNameChange = useCallback((value: string) => {
    setContactNameInput(value);
    const { firstName, lastName } = splitFullName(value);
    setContactFirstName(firstName);
    setContactLastName(lastName);
  }, []);

  const resetDraft = useCallback(() => {
    setPendingSubmission(null);
    setSharePromptVisible(false);
    if (pendingSubmissionKey) {
      try {
        window.localStorage.removeItem(pendingSubmissionKey);
      } catch (storageError) {
        console.warn('PredictionDetailPanel: unable to clear pending submission', storageError);
      }
    }
  }, [pendingSubmissionKey]);

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
          predictionId: lastSubmissionId ?? undefined,
        });

        setSubmissionMessage(response.message || 'Pronostic enregistre. Bonne chance !');
        setSubmissionError(null);
        setLastSubmission({
          scoreA: submission.scoreA,
          scoreB: submission.scoreB,
          timestamp: Date.now(),
        });
        setLastSubmissionId(response.predictionId ?? lastSubmissionId);
        resetDraft();
        setModalOpen(false);
        setModalStep('contact');
        setScoreA('');
        setScoreB('');

        if (lastSubmissionKey) {
          try {
            window.localStorage.setItem(
              lastSubmissionKey,
              JSON.stringify({
                scoreA: submission.scoreA,
                scoreB: submission.scoreB,
                timestamp: Date.now(),
                id: response.predictionId ?? lastSubmissionId,
              })
            );
          } catch (storageError) {
            console.warn('PredictionDetailPanel: unable to store last submission', storageError);
          }
        }
      } catch (submissionErr) {
        console.error('PredictionDetailPanel: unable to submit pronostic', submissionErr);
        setSubmissionError("Impossible d'enregistrer votre pronostic pour le moment. Merci de reessayer.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [lastSubmissionId, lastSubmissionKey, match, matchId, resetDraft]
  );

  const applyShareProgress = useCallback(async () => {
    if (!shareStorageKey) {
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
        `Merci pour le partage ! Il reste ${REQUIRED_APP_SHARES - after} partage(s) a effectuer pour valider votre participation.`
      );
    }

    setPendingShareFeedback(false);
  }, [localShareCount, pendingSubmission, performSubmission, shareStorageKey]);

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

  useEffect(() => {
    if (!pendingShareFeedback) {
      return;
    }
    const handleFocus = () => {
      void applyShareProgress();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [applyShareProgress, pendingShareFeedback]);

  const handleShare = useCallback(() => {
    const encoded = encodeURIComponent(WHATSAPP_SHARE_MESSAGE);
    const url = `https://wa.me/?text=${encoded}`;
    setIsSharing(true);
    const shareWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (shareWindow) {
      shareWindow.focus();
    }
    setTimeout(() => {
      setIsSharing(false);
      setPendingShareFeedback(true);
    }, 400);
  }, []);

  const handleContactStepSubmit = useCallback(() => {
    const trimmedFirst = contactFirstName.trim();
    const trimmedLast = contactLastName.trim();
    const trimmedPhone = contactPhone.trim();
    const normalizedPhone = normalizePhone(trimmedPhone);

    if (!trimmedFirst || !trimmedLast || !trimmedPhone) {
      setModalError('Merci de renseigner votre nom, prenom et numero WhatsApp.');
      return;
    }
    if (normalizedPhone.length < MIN_PHONE_LENGTH) {
      setModalError('Le numero WhatsApp fourni est invalide.');
      return;
    }
    setModalError(null);
    setModalStep('score');
  }, [contactFirstName, contactLastName, contactPhone]);

  const handleScoreSubmit = useCallback(async () => {
    if (!match || !matchId) {
      setModalError('Veuillez selectionner un match.');
      return;
    }
    if (!canSubmit) {
      setModalError('Les pronostics sont fermes pour ce match.');
      return;
    }
    const parsedA = parseInt(scoreA, 10);
    const parsedB = parseInt(scoreB, 10);
    if (Number.isNaN(parsedA) || Number.isNaN(parsedB)) {
      setModalError('Veuillez saisir un score valide pour chaque equipe.');
      return;
    }

    const trimmedFirst = contactFirstName.trim();
    const trimmedLast = contactLastName.trim();
    const trimmedPhone = contactPhone.trim();
    const normalizedPhone = normalizePhone(trimmedPhone);

    if (!trimmedFirst || !trimmedLast || !trimmedPhone) {
      setModalError('Merci de renseigner votre nom, prenom et numero WhatsApp.');
      setModalStep('contact');
      return;
    }
    if (normalizedPhone.length < MIN_PHONE_LENGTH) {
      setModalError('Le numero WhatsApp fourni est invalide.');
      setModalStep('contact');
      return;
    }

    const submission: PendingSubmission = {
      scoreA: parsedA,
      scoreB: parsedB,
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
          `Partagez l'application a ${shareProgress.remaining || REQUIRED_APP_SHARES} personne(s) pour valider votre pronostic.`
        );
        setModalOpen(false);
        setModalStep('contact');
        setModalError(null);
        return;
      }

      await performSubmission(submission);
  }, [
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
  ]);

  const handleOpenModal = useCallback(() => {
    if (!canSubmit) {
      return;
    }
    setSubmissionError(null);
    setModalError(null);
    setModalStep('contact');
    setModalOpen(true);
  }, [canSubmit]);

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalStep('contact');
    setModalError(null);
  };

  const actionButton = useMemo(() => {
    if (!match || !shareProgress.complete) {
      return null;
    }
    if (!canSubmit) {
      return (
        <button
          type="button"
          disabled
          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#1f2937] text-base font-semibold text-white opacity-70"
        >
          <LockIcon className="h-4 w-4" />
          Pronostics termines
        </button>
      );
    }
    if (pendingSubmission && !shareProgress.complete) {
      return null;
    }
    if (isSubmitting) {
      return (
        <button
          type="button"
          disabled
          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#1f2937] text-base font-semibold text-white opacity-80"
        >
          <SpinnerIcon className="h-4 w-4 animate-spin" />
          Validation en cours...
        </button>
      );
    }
    if (lastSubmission) {
      return (
        <button
          type="button"
          disabled
          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#1f2937] text-base font-semibold text-white opacity-80"
        >
          <CheckIcon className="h-4 w-4" />
          Pronostic valide
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={handleOpenModal}
        className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#111827] text-base font-semibold text-white shadow-[0_12px_30px_rgba(17,24,39,0.25)] transition hover:bg-[#0f172a]"
      >
        <PencilIcon className="h-4 w-4" />
        Placer mon pronostic
      </button>
    );
  }, [canSubmit, handleOpenModal, isSubmitting, lastSubmission, match, pendingSubmission, shareProgress.complete]);

  const resultBanner = useMemo(() => {
    if (!matchEnded) {
      return null;
    }
    const finalScore =
      typeof match?.finalScoreA === 'number' && typeof match?.finalScoreB === 'number'
        ? `${match.finalScoreA} - ${match.finalScoreB}`
        : null;
    const userScore = lastSubmission ? `${lastSubmission.scoreA} - ${lastSubmission.scoreB}` : null;
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700">
        <InfoIcon className="h-5 w-5 text-slate-500" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-800">Match termine</span>
          {finalScore && <span className="text-sm">Score final : {finalScore}</span>}
          {userScore && <span className="text-xs text-slate-500">Votre pronostic : {userScore}</span>}
        </div>
      </div>
    );
  }, [lastSubmission, match, matchEnded]);

  const currentPredictionCard = useMemo(() => {
    if (!lastSubmission || matchEnded || !shareProgress.complete) {
      return null;
    }
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-center">
        <span className="text-sm font-semibold text-sky-800">Votre pronostic actuel</span>
        <span className="text-2xl font-bold text-sky-700">
          {lastSubmission.scoreA} - {lastSubmission.scoreB}
        </span>
      </div>
    );
  }, [lastSubmission, matchEnded, shareProgress.complete]);

  const shareBanner = useMemo(() => {
    if (!sharePromptVisible || !pendingSubmission) {
      return null;
    }
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
        <div className="flex flex-col gap-2">
          <span className="text-base font-semibold text-emerald-800">Partager pour valider</span>
          <span className="text-sm text-emerald-600">
            Partagez le lien de l&apos;application a {REQUIRED_APP_SHARES} personne(s) pour confirmer votre participation.
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-emerald-100">
          <div
            className="h-2 rounded-full bg-emerald-500 transition-[width]"
            style={{ width: `${Math.max(shareProgress.percent, shareProgress.complete ? 100 : 6)}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-emerald-700">
          {shareProgress.remaining > 0
            ? `Encore ${shareProgress.remaining} partage(s) requis.`
            : 'Objectif atteint ! Merci pour le partage.'}
        </span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={resetDraft}
            className="inline-flex items-center justify-center rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:text-emerald-800"
          >
            Effacer le brouillon
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={isSharing}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-[#20bd59] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSharing ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <WhatsAppIcon className="h-4 w-4" />}
            {isSharing ? 'Ouverture WhatsApp...' : 'Partager maintenant'}
          </button>
        </div>
      </div>
    );
  }, [handleShare, isSharing, pendingSubmission, resetDraft, shareProgress.complete, shareProgress.percent, shareProgress.remaining, sharePromptVisible]);

  const shareHelperCard = useMemo(() => {
    if (!match || sharePromptVisible || shareProgress.complete) {
      return null;
    }
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-center gap-3">
          <ShareIcon className="h-5 w-5 text-orange-400" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-800">Boostez vos chances</span>
            <span className="text-xs text-slate-500">
              Partagez le jeu a {REQUIRED_APP_SHARES} personne(s) pour valider votre pronostic.
            </span>
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-orange-500 transition-[width]"
            style={{ width: `${Math.max(shareProgress.percent, shareProgress.complete ? 100 : 6)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Partages : {shareProgress.effectiveShares}/{REQUIRED_APP_SHARES}
          </span>
          {shareProgress.complete ? (
            <span className="font-semibold text-emerald-600">Objectif atteint</span>
          ) : (
            <span>Encore {shareProgress.remaining}</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleShare}
          disabled={isSharing}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSharing ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : <WhatsAppIcon className="h-4 w-4" />}
          {isSharing ? 'Ouverture WhatsApp...' : 'Partager'}
        </button>
      </div>
    );
  }, [handleShare, isSharing, match, shareProgress.complete, shareProgress.effectiveShares, shareProgress.percent, shareProgress.remaining, sharePromptVisible]);

  const submissionFeedback = useMemo(() => {
    if (submissionError) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {submissionError}
        </div>
      );
    }
    if (submissionMessage) {
      return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {submissionMessage}
        </div>
      );
    }
    return null;
  }, [submissionError, submissionMessage]);

  const matchCard = useMemo(() => {
    if (!match) {
      return null;
    }
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
        <div className="flex flex-col items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#FFF3E6] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#FF8A1E]">
            <TrophyIcon className="h-4 w-4" />
            {match.competition || 'Match'}
          </span>
          <span className="text-sm text-slate-500">{matchDateLabel}</span>
        </div>
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-6">
          <TeamColumn name={match.teamA} logo={match.teamALogo} />
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">vs</span>
            {matchEnded && typeof match.finalScoreA === 'number' && typeof match.finalScoreB === 'number' && (
              <span className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                {match.finalScoreA} - {match.finalScoreB}
              </span>
            )}
          </div>
          <TeamColumn name={match.teamB} logo={match.teamBLogo} />
        </div>
      </div>
    );
  }, [match, matchDateLabel, matchEnded]);

  if (loading) {
    return <LoadingPanel />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-600">
        <strong className="text-base font-semibold text-rose-700">Erreur</strong>
        <p>{error}</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white/80 p-6 text-center text-sm text-slate-500">
        <strong className="text-base font-semibold text-slate-700">Selectionnez un match</strong>
        <p>Choisissez un match pour consulter les tendances et placer votre pronostic.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {matchCard}
        {resultBanner}
        {shareProgress.complete ? (
          <WinnersSection
            winners={winners}
            loading={loadingWinners}
            error={errorWinners}
            matchEnded={matchEnded}
            onViewWinners={handleNavigateToWinners}
          />
        ) : null}
        {currentPredictionCard}
        {submissionFeedback}
        {shareBanner}
        {shareHelperCard}
        {actionButton}
        {shareProgress.complete ? <TrendsSection trends={communityTrends} total={match.predictionCount ?? 0} /> : null}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={handleCloseModal}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute right-4 top-4 text-slate-400 transition hover:text-slate-600"
              aria-label="Fermer la fenetre"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            {modalStep === 'contact' ? (
              <div className="flex flex-col gap-4 pt-4">
                <h2 className="text-xl font-bold text-slate-900">Vos informations</h2>
                <p className="text-sm text-slate-500">Renseignez vos informations de contact</p>
                {modalError && <p className="rounded-xl bg-rose-50 px-4 py-2 text-xs text-rose-600">{modalError}</p>}
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={contactNameInput}
                    onChange={event => handleContactNameChange(event.target.value)}
                    placeholder="Nom & prenom"
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                  />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={event => setContactPhone(event.target.value)}
                    placeholder="Numero WhatsApp"
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleContactStepSubmit}
                  className="mt-2 flex h-12 items-center justify-center rounded-2xl bg-[#111827] text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-[#0f172a]"
                >
                  Continuer
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 pt-4">
                <h2 className="text-xl font-bold text-slate-900">Votre pronostic</h2>
                <p className="text-sm text-slate-500">
                  {match.teamA} vs {match.teamB}
                </p>
                {modalError && <p className="rounded-xl bg-rose-50 px-4 py-2 text-xs text-rose-600">{modalError}</p>}
                <div className="flex items-center justify-center gap-6 py-4">
                  <input
                    type="tel"
                    value={scoreA}
                    onChange={event => setScoreA(event.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                    maxLength={2}
                    className="h-24 w-20 rounded-2xl border border-slate-200 bg-slate-50 text-center text-4xl font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                    placeholder="0"
                  />
                  <span className="text-3xl font-bold text-slate-400">-</span>
                  <input
                    type="tel"
                    value={scoreB}
                    onChange={event => setScoreB(event.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                    maxLength={2}
                    className="h-24 w-20 rounded-2xl border border-slate-200 bg-slate-50 text-center text-4xl font-bold text-slate-900 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                    placeholder="0"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleScoreSubmit}
                  disabled={isSubmitting}
                  className="mt-2 flex h-12 items-center justify-center rounded-2xl bg-[#111827] text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:bg-slate-500"
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Continuer'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

type TeamColumnProps = {
  name: string;
  logo?: string | null;
};

function TeamColumn({ name, logo }: TeamColumnProps) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
        {logo ? (
          <Image src={logo} alt={name} width={64} height={64} className="h-full w-full object-contain" />
        ) : (
          <span className="text-lg font-semibold text-slate-500">{getInitials(name)}</span>
        )}
      </div>
      <span className="text-sm font-semibold text-slate-800">{name}</span>
    </div>
  );
}

type TrendsSectionProps = {
  trends: { score: string; percentage: number; count: number }[];
  total: number;
};

function TrendsSection({ trends, total }: TrendsSectionProps) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <header className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">Tendances des pronostics</span>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          <PeopleIcon className="h-4 w-4" />
          {total} participants
        </span>
      </header>
      {trends.length === 0 ? (
        <p className="text-xs text-slate-500">Soyez le premier a faire un pronostic !</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {trends.map(item => (
            <li key={item.score} className="flex items-center justify-between text-sm text-slate-600">
              <span className="font-mono text-base font-semibold text-slate-800">{item.score}</span>
              <div className="flex flex-1 items-center gap-3 pl-4">
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{ width: `${Math.max(item.percentage, 6)}%` }}
                  />
                </div>
                <span className="w-20 text-right text-xs font-semibold text-slate-700">
                  {item.percentage}% ({item.count})
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type WinnersSectionProps = {
  winners: Prediction[];
  loading: boolean;
  error: string | null;
  matchEnded: boolean;
  onViewWinners: () => void;
};

function WinnersSection({ winners, loading, error, matchEnded, onViewWinners }: WinnersSectionProps) {
  const winnersCount = winners.length;
  const summaryMessage =
    error != null
      ? null
      : loading
      ? 'Chargement des gagnants...'
      : !matchEnded
      ? 'Les gagnants seront affiches apres la fin du match.'
      : winnersCount > 0
      ? `${winnersCount} ${winnersCount > 1 ? 'gagnants ont trouve le bon score.' : 'gagnant a trouve le bon score.'}`
      : 'Les gagnants seront annonces prochainement.';

  const buttonDisabled = !matchEnded;
  const buttonBaseClasses =
    'flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600';
  const buttonVariantClasses = buttonDisabled
    ? 'cursor-not-allowed bg-orange-200 text-orange-500 opacity-70'
    : 'bg-orange-500 text-white hover:bg-orange-600';

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-orange-200 bg-[#FFF7ED] px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <TrophyIcon className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-semibold text-orange-700">Gagnants du match</span>
          {summaryMessage ? <span className="text-xs text-orange-600">{summaryMessage}</span> : null}
          {error ? <span className="text-xs font-semibold text-orange-600">{error}</span> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onViewWinners}
        disabled={buttonDisabled}
        className={`${buttonBaseClasses} ${buttonVariantClasses}`}
      >
        <EyeIcon className="h-4 w-4" />
        Voir les gagnants
      </button>
    </section>
  );
}

function LoadingPanel() {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-orange-50">
      <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
      <div className="flex flex-col gap-3">
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

function getInitials(input: string) {
  const parts = input.trim().split(/\s+/);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
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

type IconProps = React.SVGProps<SVGSVGElement>;

function EyeIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function TrophyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 01-5 5 5 5 0 01-5-5z" />
      <path d="M18 4h3v2a5 5 0 01-5 5" />
      <path d="M6 4H3v2a5 5 0 005 5" />
    </svg>
  );
}

function PeopleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function InfoIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function LockIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="9" width="12" height="8" rx="2" />
      <path d="M7 9V6a3 3 0 016 0v3" />
    </svg>
  );
}

function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function PencilIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function SpinnerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M12 4a8 8 0 00-8 8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function WhatsAppIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 .5A11.5 11.5 0 002.2 18.8L.5 23.5l4.8-1.7A11.5 11.5 0 1012 .5zm6.6 16.4c-.3.9-1.7 1.6-2.4 1.7-.6.1-1.3.1-2.1-.1a19 19 0 01-3.3-1.2 11.5 11.5 0 01-3.6-2.9 6.5 6.5 0 01-1.4-2.3c-.1-.6-.1-1.1.2-1.5.2-.4.5-.6.9-.9l.2-.1c.3-.2.5-.2.6 0l.4.6c.1.2.3.4.4.6.2.4.1.6 0 .8l-.2.3c-.1.1-.1.2 0 .3a7 7 0 001.8 2.2 7 7 0 002.5 1.4c.1 0 .2 0 .3-.1l.5-.6c.2-.2.4-.2.7-.1l.8.4.6.3c.1.1.2.1.3.2.1.2 0 .4 0 .6z" />
    </svg>
  );
}

function ShareIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
