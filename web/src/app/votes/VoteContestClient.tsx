'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type SVGProps,
} from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PAYMENT_CONFIG } from '@/config/payment';
import { fetchActiveContestId } from '@/services/contestService';
import { useContestData } from '@/hooks/useContestData';
import { loadKkiapay, type KkiapayListenerData } from '@/lib/kkiapay';
import type { Candidate, Contest } from '@/types/pronostics';

const VOTE_STATUS_KEY_PREFIX = 'contest_vote_status_v1';
const VOTER_ID_STORAGE_KEY = 'contest_voter_identity';
const SHOW_VOTE_BUTTON = true; // Voting is currently open to the public.
const MIN_VOTE_QUANTITY = 1;
const MAX_VOTE_QUANTITY = 10000;
const clampVoteQuantity = (value: number) => Math.min(MAX_VOTE_QUANTITY, Math.max(MIN_VOTE_QUANTITY, value));
const VOTE_UNIT_PRICE = PAYMENT_CONFIG.VOTE_AMOUNT_XOF;
const amountFromQuantity = (quantity: number) => quantity * VOTE_UNIT_PRICE;
const generateVoterIdentity = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `voter_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};
const deriveQuantityFromInput = (value: string): number | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  if (parsed <= 0) {
    return 0;
  }
  return clampVoteQuantity(parsed);
};

const deriveQuantityFromAmountInput = (value: string): number | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  if (parsed < 0) {
    return 0;
  }
  if (parsed === 0) {
    return 0;
  }
  if (parsed % VOTE_UNIT_PRICE !== 0) {
    return null;
  }
  const computedQuantity = Math.floor(parsed / VOTE_UNIT_PRICE);
  if (computedQuantity <= 0) {
    return 0;
  }
  return clampVoteQuantity(computedQuantity);
};

const normalizeStoredVoteRecord = (value: unknown): StoredVoteRecord | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidateId = typeof (value as { candidateId?: unknown }).candidateId === 'string' ? ((value as { candidateId: string }).candidateId) : null;
  if (!candidateId) {
    return null;
  }

  const candidateNameValue = (value as { candidateName?: unknown }).candidateName;
  const transactionIdValue = (value as { transactionId?: unknown }).transactionId;
  const timestamp = typeof (value as { timestamp?: unknown }).timestamp === 'number' ? (value as { timestamp: number }).timestamp : Date.now();
  const votes = typeof (value as { votes?: unknown }).votes === 'number' ? (value as { votes: number }).votes : undefined;
  const amount = typeof (value as { amount?: unknown }).amount === 'number' ? (value as { amount: number }).amount : undefined;

  return {
    candidateId,
    candidateName: typeof candidateNameValue === 'string' ? candidateNameValue : null,
    transactionId: typeof transactionIdValue === 'string' ? transactionIdValue : null,
    timestamp,
    votes,
    amount,
  };
};

const normalizeStoredVoteList = (value: unknown): StoredVoteRecord[] => {
  if (Array.isArray(value)) {
    return value
      .map(normalizeStoredVoteRecord)
      .filter((record): record is StoredVoteRecord => record !== null);
  }
  const single = normalizeStoredVoteRecord(value);
  if (single) {
    return [single];
  }
  return [];
};

type StoredVoteRecord = {
  candidateId: string;
  candidateName?: string | null;
  transactionId?: string | null;
  timestamp: number;
  votes?: number;
  amount?: number;
};

type VoteDetails = {
  voiceCount: number;
  amount: number;
};

type PaymentStatus = 'success' | 'failed' | 'pending' | null;

const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(value);

const enforceKkiapayViewport = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const applyStyle = () => {
    const iframe = document.querySelector<HTMLIFrameElement>('iframe[src^="https://widget-v3.kkiapay.me"]');
    if (!iframe) {
      return false;
    }

    const style = iframe.style;
    style.setProperty('height', '100vh', 'important');
    style.setProperty('width', '100vw', 'important');
    style.setProperty('maxHeight', '100vh', 'important');
    style.setProperty('maxWidth', '100vw', 'important');
    style.setProperty('top', '0');
    style.setProperty('left', '0');
    style.setProperty('position', 'fixed');

    return true;
  };

  if (!applyStyle()) {
    window.setTimeout(applyStyle, 80);
  }
};

export default function VoteContestClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialContestId = searchParams?.get('contestId') ?? null;

  const [contestId, setContestId] = useState<string | null>(initialContestId);
  const [resolvingContestId, setResolvingContestId] = useState(!initialContestId);
  const [contestIdError, setContestIdError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [storedVotes, setStoredVotes] = useState<StoredVoteRecord[]>([]);
  const [voterIdentity, setVoterIdentity] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(null);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCandidate, setModalCandidate] = useState<Candidate | null>(null);
  const [modalVoteDetails, setModalVoteDetails] = useState<VoteDetails | null>(null);
  const [voteSetupCandidate, setVoteSetupCandidate] = useState<Candidate | null>(null);
  const [voteQuantityInput, setVoteQuantityInput] = useState(String(MIN_VOTE_QUANTITY));
  const [voteAmountInput, setVoteAmountInput] = useState(String(amountFromQuantity(MIN_VOTE_QUANTITY)));
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const pendingCandidateRef = useRef<Candidate | null>(null);
  const pendingVoiceCountRef = useRef<number>(MIN_VOTE_QUANTITY);
  const previousBodyOverflow = useRef<string | null>(null);

  const functionsInstance = useMemo(
    () => getFunctions(undefined, PAYMENT_CONFIG.FUNCTIONS_REGION),
    []
  );

  const contestVoteStorageKey = useMemo(
    () => (contestId ? `${VOTE_STATUS_KEY_PREFIX}_${contestId}` : null),
    [contestId]
  );

  const persistStoredVotes = useCallback(
    (records: StoredVoteRecord[]) => {
      if (!contestVoteStorageKey || typeof window === 'undefined') {
        return;
      }
      try {
        window.localStorage.setItem(contestVoteStorageKey, JSON.stringify(records));
      } catch (error) {
        console.warn('VoteContestPage: unable to persist vote status', error);
      }
    },
    [contestVoteStorageKey]
  );

  const appendVoteRecord = useCallback(
    (record: StoredVoteRecord) => {
      setStoredVotes(prev => {
        const filtered = prev.filter(existing => existing.candidateId !== record.candidateId);
        const updated = [...filtered, record];
        persistStoredVotes(updated);
        return updated;
      });
    },
    [persistStoredVotes]
  );

  const hasVoted = storedVotes.length > 0;

  useEffect(() => {
    if (initialContestId) {
      setContestId(initialContestId);
      setContestIdError(null);
      setResolvingContestId(false);
    }
  }, [initialContestId]);

  useEffect(() => {
    if (initialContestId) {
      return;
    }
    let active = true;
    const resolve = async () => {
      setResolvingContestId(true);
      setContestIdError(null);
      try {
        const activeContestId = await fetchActiveContestId();
        if (!active) {
          return;
        }
        if (activeContestId) {
          setContestId(activeContestId);
        } else {
          setContestIdError('Aucun concours actif pour le moment.');
        }
      } catch (error) {
        if (!active) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Impossible de charger le concours.';
        setContestIdError(message);
      } finally {
        if (active) {
          setResolvingContestId(false);
        }
      }
    };
    resolve();
    return () => {
      active = false;
    };
  }, [initialContestId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!contestVoteStorageKey) {
      setStoredVotes([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(contestVoteStorageKey);
      if (!raw) {
        setStoredVotes([]);
        return;
      }
      const parsed = JSON.parse(raw);
      setStoredVotes(normalizeStoredVoteList(parsed));
    } catch (error) {
      console.warn('VoteContestPage: unable to read stored vote status', error);
      setStoredVotes([]);
    }
  }, [contestVoteStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const existing = window.localStorage.getItem(VOTER_ID_STORAGE_KEY);
      if (existing && existing.trim().length > 0) {
        setVoterIdentity(existing);
        return;
      }
      const fresh = generateVoterIdentity();
      window.localStorage.setItem(VOTER_ID_STORAGE_KEY, fresh);
      setVoterIdentity(fresh);
    } catch (error) {
      console.warn('VoteContestPage: unable to initialize voter identity', error);
      setVoterIdentity(prev => prev ?? generateVoterIdentity());
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (isSearchActive) {
      previousBodyOverflow.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousBodyOverflow.current ?? '';
      };
    }

    document.body.style.overflow = previousBodyOverflow.current ?? '';
    return;
  }, [isSearchActive]);

  const { contest, candidates, isLoading, error } = useContestData(contestId);
  const contestError = contestIdError ?? error ?? null;

  const resolveVoterIdentity = useCallback(() => {
    if (voterIdentity && voterIdentity.trim().length > 0) {
      return voterIdentity;
    }
    if (typeof window === 'undefined') {
      return voterIdentity;
    }
    const fresh = generateVoterIdentity();
    try {
      window.localStorage.setItem(VOTER_ID_STORAGE_KEY, fresh);
    } catch (error) {
      console.warn('VoteContestPage: unable to persist voter identity', error);
    }
    setVoterIdentity(fresh);
    return fresh;
  }, [voterIdentity]);

  const totalVotes = useMemo(() => {
    if (contest && contest.totalVotes > 0) {
      return contest.totalVotes;
    }
    return candidates.reduce((sum, candidate) => sum + (candidate.voteCount ?? 0), 0);
  }, [contest, candidates]);

  const totalCandidates = useMemo(() => candidates.length, [candidates]);

  const filteredCandidates = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return candidates;
    }
    return candidates.filter(candidate => {
      const haystack = `${candidate.name} ${candidate.media}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [candidates, searchQuery]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const contestEnded = useMemo(() => {
    if (!contest) {
      return false;
    }
    if (contest.status === 'ended') {
      return true;
    }
    return contest.endDate.getTime() <= now;
  }, [contest, now]);

  const isBusy = isLoading || resolvingContestId || isPreparingPayment;
  const votingClosed = !contest || contestEnded;

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setModalCandidate(null);
    setModalVoteDetails(null);
    setPaymentStatus(null);
    setPaymentMessage(null);
    setLastTransactionId(null);
  };

  const openSearchOverlay = useCallback(() => {
    if (isBusy) {
      return;
    }
    setIsSearchActive(true);
  }, [isBusy]);

  const closeSearchOverlay = useCallback(() => {
    setIsSearchActive(false);
  }, []);

  const handlePaymentSuccess = useCallback(
    async (data?: KkiapayListenerData) => {
      const candidate = pendingCandidateRef.current;
      const txId =
        (data?.transactionId && String(data.transactionId)) ||
        (data?.flwRef && String(data.flwRef)) ||
        null;

      if (txId) {
        setLastTransactionId(txId);
        try {
          const verify = httpsCallable<{ transactionId: string }, unknown>(functionsInstance, 'verifyKkiapay');
          await verify({ transactionId: txId });
        } catch {
          // La verification finale est assuree cote webhook.
        }
      }

      const voiceCount = pendingVoiceCountRef.current ?? MIN_VOTE_QUANTITY;
      const totalAmount = voiceCount * PAYMENT_CONFIG.VOTE_AMOUNT_XOF;
      const targetName = candidate?.name ? ` pour ${candidate.name}` : '';

      setPaymentStatus('success');
      setPaymentMessage(
        voiceCount > 1 ? `${voiceCount} voix ont ete attribuees${targetName}.` : `Une voix a ete attribuee${targetName}.`
      );
      setModalVoteDetails({ voiceCount, amount: totalAmount });
      setModalCandidate(candidate ?? null);
      setIsModalOpen(true);
      setIsPreparingPayment(false);

      if (candidate?.id) {
        appendVoteRecord({
          candidateId: candidate.id,
          candidateName: candidate.name ?? null,
          transactionId: txId ?? null,
          timestamp: Date.now(),
          votes: voiceCount,
          amount: totalAmount,
        });
      }

      pendingVoiceCountRef.current = MIN_VOTE_QUANTITY;
      pendingCandidateRef.current = null;
    },
    [appendVoteRecord, functionsInstance]
  );

  const handlePaymentFailed = useCallback(
    (data?: KkiapayListenerData) => {
      const candidate = pendingCandidateRef.current;
      const txId = data?.transactionId ? String(data.transactionId) : null;
      if (txId) {
        setLastTransactionId(txId);
      }
      const voiceCount = pendingVoiceCountRef.current ?? MIN_VOTE_QUANTITY;
      const totalAmount = voiceCount * PAYMENT_CONFIG.VOTE_AMOUNT_XOF;
      setPaymentStatus('failed');
      setPaymentMessage("Votre paiement n'a pas abouti.");
      setModalCandidate(candidate ?? null);
      setModalVoteDetails({ voiceCount, amount: totalAmount });
      setIsModalOpen(true);
      setIsPreparingPayment(false);
      pendingVoiceCountRef.current = MIN_VOTE_QUANTITY;
      pendingCandidateRef.current = null;
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    let disposed = false;
    let moduleInstance: Awaited<ReturnType<typeof loadKkiapay>> | null = null;

    loadKkiapay()
      .then(instance => {
        if (disposed) {
          return;
        }
        moduleInstance = instance;
        instance.addSuccessListener(handlePaymentSuccess);
        instance.addFailedListener(handlePaymentFailed);
      })
      .catch(err => {
        console.error('Kkiapay initialisation error', err);
      });

    return () => {
      disposed = true;
      if (moduleInstance) {
        moduleInstance.removeKkiapayListener?.('success');
        moduleInstance.removeKkiapayListener?.('failed');
        moduleInstance.addPendingListener(() => {});
      }
    };
  }, [handlePaymentFailed, handlePaymentSuccess]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    loadKkiapay().catch(error => {
      console.warn('Kkiapay preloading error', error);
    });
  }, []);

  const startVotePayment = useCallback(
    async (candidate: Candidate, voiceCount: number) => {
      resetModal();
      const safeVoiceCount = Math.min(MAX_VOTE_QUANTITY, Math.max(MIN_VOTE_QUANTITY, voiceCount));
      const amount = safeVoiceCount * PAYMENT_CONFIG.VOTE_AMOUNT_XOF;

      if (!contestId || !contest) {
        pendingCandidateRef.current = null;
        pendingVoiceCountRef.current = MIN_VOTE_QUANTITY;
        setPaymentStatus('failed');
        setPaymentMessage('Concours introuvable. Veuillez reessayer.');
        setModalCandidate(candidate);
        setModalVoteDetails({ voiceCount: safeVoiceCount, amount });
        setIsModalOpen(true);
        return;
      }

      const voterKey = resolveVoterIdentity();

      pendingCandidateRef.current = candidate;
      pendingVoiceCountRef.current = safeVoiceCount;
      setIsPreparingPayment(true);

      try {
        const moduleInstance = await loadKkiapay();
        const createIntent = httpsCallable<
          { contestId: string; candidateId: string; amount: number; voterKey?: string },
          { intentId?: string; intent_id?: string }
        >(functionsInstance, 'createVoteIntent');

        const response = await createIntent({
          contestId,
          candidateId: candidate.id,
          amount,
          voterKey: voterKey ?? undefined,
        });

        const payload = response?.data ?? {};
        const rawIntent =
          (typeof payload === 'object' && payload && 'intentId' in payload && payload.intentId) ||
          (typeof payload === 'object' && payload && 'intent_id' in payload && payload.intent_id) ||
          null;

        const intentId =
          typeof rawIntent === 'string'
            ? rawIntent.trim()
            : typeof rawIntent === 'number' && Number.isFinite(rawIntent)
              ? String(rawIntent)
              : null;

        if (!intentId) {
          throw new Error('Intent de vote introuvable.');
        }

        moduleInstance.openKkiapayWidget({
          amount,
          publicAPIKey: PAYMENT_CONFIG.KKIAPAY_PUBLIC_KEY,
          sandbox: PAYMENT_CONFIG.SANDBOX,
          theme: '#FF7A00',
          partnerId: intentId,
          countries: PAYMENT_CONFIG.COUNTRIES ? [...PAYMENT_CONFIG.COUNTRIES] : undefined,
          paymentMethods: PAYMENT_CONFIG.PAYMENT_METHODS ? [...PAYMENT_CONFIG.PAYMENT_METHODS] : undefined,
        });
        enforceKkiapayViewport();
      } catch (error) {
        console.error('Vote payment start error', error);
        pendingCandidateRef.current = null;
        pendingVoiceCountRef.current = MIN_VOTE_QUANTITY;
        setIsPreparingPayment(false);
        setPaymentStatus('failed');
        setPaymentMessage(
          error instanceof Error ? error.message : 'Impossible de lancer le module de paiement.'
        );
        setModalCandidate(candidate);
        setModalVoteDetails({ voiceCount: safeVoiceCount, amount });
        setIsModalOpen(true);
      }
    },
    [contest, contestId, functionsInstance, resolveVoterIdentity]
  );

  const handleVote = useCallback(
    (candidate: Candidate) => {
      if (isBusy) {
        return;
      }
      if (votingClosed) {
        setPaymentStatus('failed');
        setPaymentMessage('Les votes ne sont pas ouverts pour le moment.');
        setModalCandidate(candidate);
        setModalVoteDetails(null);
        setIsModalOpen(true);
        return;
      }
      if (!contestId || !contest) {
        setPaymentStatus('failed');
        setPaymentMessage('Concours introuvable. Veuillez reessayer.');
        setModalCandidate(candidate);
        setModalVoteDetails(null);
        setIsModalOpen(true);
        return;
      }

      setVoteQuantityInput(String(MIN_VOTE_QUANTITY));
      setVoteAmountInput(String(amountFromQuantity(MIN_VOTE_QUANTITY)));
      setVoteSetupCandidate(candidate);
    },
    [contest, contestId, isBusy, votingClosed]
  );

  const handleQuantityInputChange = useCallback((value: string) => {
    setVoteQuantityInput(value);
    const quantity = deriveQuantityFromInput(value);
    if (quantity !== null) {
      setVoteAmountInput(String(amountFromQuantity(quantity)));
    } else if (value.trim().length === 0) {
      setVoteAmountInput('');
    }
  }, []);

  const handleQuantityStep = useCallback((delta: number) => {
    setVoteQuantityInput(prev => {
      const base = deriveQuantityFromInput(prev);
      const resolvedBase = base === null ? MIN_VOTE_QUANTITY : base;
      const rawNextValue = resolvedBase + delta;
      const nextValue = rawNextValue <= 0 ? 0 : clampVoteQuantity(rawNextValue);
      const quantityString = String(nextValue);
      setVoteAmountInput(String(amountFromQuantity(nextValue)));
      return quantityString;
    });
  }, []);

  const handleAmountInputChange = useCallback((value: string) => {
    setVoteAmountInput(value);
    const quantity = deriveQuantityFromAmountInput(value);
    if (quantity !== null) {
      setVoteQuantityInput(String(quantity));
    } else if (value.trim().length === 0) {
      setVoteQuantityInput('');
    }
  }, []);

  const handleConfirmVote = useCallback(() => {
    if (!voteSetupCandidate || isPreparingPayment) {
      return;
    }
    const quantityFromVoices = deriveQuantityFromInput(voteQuantityInput);
    const quantityFromAmountInput = deriveQuantityFromAmountInput(voteAmountInput);
    const resolvedQuantity = quantityFromVoices ?? quantityFromAmountInput;
    if (resolvedQuantity === null || resolvedQuantity <= 0) {
      const fallback = MIN_VOTE_QUANTITY;
      setVoteQuantityInput(String(fallback));
      setVoteAmountInput(String(amountFromQuantity(fallback)));
      return;
    }
    resetModal();
    setVoteSetupCandidate(null);
    void startVotePayment(voteSetupCandidate, resolvedQuantity);
  }, [isPreparingPayment, startVotePayment, voteSetupCandidate, voteAmountInput, voteQuantityInput]);

  const handleVoteDialogClose = useCallback(() => {
    if (isPreparingPayment) {
      return;
    }
    setVoteSetupCandidate(null);
  }, [isPreparingPayment]);

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#111827]">
      <header className="sticky top-0 z-50 border-b border-[#E7E9ED] bg-white">
        <div className="mx-auto grid h-14 w-full max-w-screen-sm grid-cols-[44px_1fr_44px] items-center px-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#111827] transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:outline-offset-2"
            aria-label="Retour"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-center text-[18px] font-semibold">Concours de Vote</h1>
          <div aria-hidden className="h-11 w-11" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-screen-sm flex-col gap-5 px-4 pb-16 pt-5">
        {!isSearchActive && (
          <ContestHero
            contest={contest}
            totalVotes={totalVotes}
            candidateCount={totalCandidates}
            isBusy={isBusy}
            hasVoted={hasVoted}
            storedVotes={storedVotes}
            errorMessage={contestError}
            contestEnded={contestEnded}
          />
        )}

        <CandidateSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          disabled={isBusy}
          onActivate={openSearchOverlay}
        />

        {isPreparingPayment ? <PaymentPreparingNotice /> : null}

        {!isSearchActive && (
          <CandidateList
            contest={contest}
            candidates={filteredCandidates}
            totalVotes={totalVotes}
            isBusy={isBusy}
            hasVoted={hasVoted}
            storedVotes={storedVotes}
            searchQuery={searchQuery}
            onVote={handleVote}
            contestEnded={contestEnded}
            isPreparingPayment={isPreparingPayment}
          />
        )}
      </main>

      <VoteSearchOverlay
        open={isSearchActive}
        query={searchQuery}
        onChange={setSearchQuery}
        onClose={closeSearchOverlay}
        disabled={isBusy}
        errorMessage={contestError}
      >
        <CandidateList
          contest={contest}
          candidates={filteredCandidates}
          totalVotes={totalVotes}
          isBusy={isBusy}
          hasVoted={hasVoted}
          storedVotes={storedVotes}
          searchQuery={searchQuery}
          onVote={handleVote}
          contestEnded={contestEnded}
          isPreparingPayment={isPreparingPayment}
        />
      </VoteSearchOverlay>

      <VoteQuantityModal
        open={Boolean(voteSetupCandidate)}
        candidate={voteSetupCandidate}
        quantityValue={voteQuantityInput}
        onQuantityInputChange={handleQuantityInputChange}
        onAdjustQuantity={handleQuantityStep}
        amountValue={voteAmountInput}
        onAmountInputChange={handleAmountInputChange}
        onClose={handleVoteDialogClose}
        onConfirm={handleConfirmVote}
        unitPrice={PAYMENT_CONFIG.VOTE_AMOUNT_XOF}
        isProcessing={isPreparingPayment}
      />

      <VoteModal
        open={isModalOpen}
        status={paymentStatus}
        message={paymentMessage}
        transactionId={lastTransactionId}
        candidate={modalCandidate}
        voteDetails={modalVoteDetails}
        onClose={resetModal}
      />
    </div>
  );
}

type ContestHeroProps = {
  contest: Contest | null;
  totalVotes: number;
  candidateCount: number;
  isBusy: boolean;
  hasVoted: boolean;
  storedVotes: StoredVoteRecord[];
  errorMessage: string | null;
  contestEnded: boolean;
};

function ContestHero({
  contest,
  totalVotes,
  candidateCount,
  isBusy,
  hasVoted,
  storedVotes,
  errorMessage,
  contestEnded,
}: ContestHeroProps) {
  const [timeLeft, setTimeLeft] = useState<Countdown | null>(() =>
    contest ? calculateTimeLeft(contest.endDate) : null
  );

  const voteThankYouMessage = useMemo(() => {
    if (!hasVoted) {
      return null;
    }
    const names = Array.from(
      new Set(
        storedVotes
          .map(record => (record.candidateName ?? '').trim())
          .filter(name => name.length > 0)
      )
    );

    if (names.length === 0) {
      return 'Merci pour votre vote ! Les resultats seront annonces a la cloture.';
    }

    const formatNames = (list: string[]) => {
      if (list.length === 1) {
        return list[0];
      }
      if (list.length === 2) {
        return `${list[0]} et ${list[1]}`;
      }
      const last = list[list.length - 1];
      return `${list.slice(0, -1).join(', ')} et ${last}`;
    };

    const prefix = names.length === 1 ? 'Merci pour votre vote' : 'Merci pour vos votes';
    return `${prefix} pour ${formatNames(names)} ! Les resultats seront annonces a la cloture.`;
  }, [hasVoted, storedVotes]);

  useEffect(() => {
    if (!contest) {
      setTimeLeft(null);
      return;
    }
    if (contestEnded) {
      setTimeLeft(null);
      return;
    }
    const update = () => {
      setTimeLeft(calculateTimeLeft(contest.endDate));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [contest, contestEnded]);

  if (errorMessage) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-600">
        {errorMessage}
      </section>
    );
  }

  if (!contest && isBusy) {
    return (
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40">
        <div className="h-6 w-40 animate-pulse rounded-full bg-slate-100" />
        <div className="h-24 w-full animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
          alt="Public lors dâ€™une cÃ©rÃ©monie"
          fill
          className="object-cover"
          priority={false}
        />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(17,24,39,0.82)_0%,rgba(17,24,39,0.55)_55%,rgba(17,24,39,0.1)_100%)]" />
      </div>

      <div className="relative flex flex-col gap-5 p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <TrophyIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
              {contest?.title ?? 'Concours'}
            </span>
            <h2 className="text-2xl font-bold leading-tight text-white">
              {contestEnded ? 'Concours clôturé' : "Phase d'inscription"}
            </h2>
          </div>
        </div>

        {contestEnded ? (
          <p className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
            Concours clÃ´turÃ©
          </p>
        ) : timeLeft ? (
          <CountdownPills {...timeLeft} />
        ) : (
          null
        )}

        {voteThankYouMessage ? (
          <p className="rounded-2xl bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-100">
            {voteThankYouMessage}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 text-center text-slate-900">
          <StatCard label="Votes" value={totalVotes} />
          <StatCard label="Candidats" value={candidateCount} />
        </div>
      </div>
    </section>
  );
}

type CandidateListProps = {
  contest: Contest | null;
  candidates: Candidate[];
  totalVotes: number;
  isBusy: boolean;
  hasVoted: boolean;
  storedVotes: StoredVoteRecord[];
  searchQuery: string;
  onVote: (candidate: Candidate) => void;
  contestEnded: boolean;
  isPreparingPayment: boolean;
};

function CandidateList({
  contest,
  candidates,
  totalVotes,
  isBusy,
  hasVoted,
  storedVotes,
  searchQuery,
  onVote,
  contestEnded,
  isPreparingPayment,
}: CandidateListProps) {
  if (!isBusy && candidates.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6 text-center">
        <h2 className="text-base font-semibold text-slate-700">
          {searchQuery.trim()
            ? 'Aucun candidat trouve'
            : 'Aucun candidat disponible pour le moment'}
        </h2>
        <p className="text-sm text-slate-500">
          {searchQuery.trim()
            ? 'Essayez un autre nom ou media.'
            : 'Revenez plus tard pour decouvrir les participants.'}
        </p>
      </section>
    );
  }

  const votingDisabled = !contest || contestEnded;
  const disableButtons = isBusy || votingDisabled;
  const voteButtonLabel = isPreparingPayment ? 'Préparation…' : 'Voter';
  const votedCandidateIds = useMemo(() => {
    return new Set(storedVotes.map(record => record.candidateId));
  }, [storedVotes]);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Candidats en lice</h2>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {formatNumber(totalVotes)} votes
        </span>
      </header>
      <div className="flex flex-col gap-3">
        {candidates.map(candidate => {
          const ratio = totalVotes > 0 ? Math.round((candidate.voteCount / totalVotes) * 100) : 0;
          return (
            <article
              key={candidate.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40 transition hover:-translate-y-[1px] hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-slate-100">
                  {candidate.photoUrl ? (
                    <Image src={candidate.photoUrl} alt={candidate.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                      ?
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-base font-semibold text-slate-900">
                    {candidate.name}
                    {votedCandidateIds.has(candidate.id) ? (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                        Votre vote
                      </span>
                    ) : null}
                  </span>
                  <span className="text-sm text-slate-500">{candidate.media}</span>
                </div>
                {SHOW_VOTE_BUTTON && !votingDisabled ? (
                  <button
                    type="button"
                    onClick={() => onVote(candidate)}
                    disabled={disableButtons}
                    className="inline-flex items-center justify-center rounded-full bg-[#111827] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition enabled:hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2">
                      {isPreparingPayment ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : null}
                      <span>{voteButtonLabel}</span>
                    </span>
                  </button>
                ) : null}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>{formatNumber(candidate.voteCount)} voix</span>
                <span>{ratio}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500"
                  style={{ width: `${Math.max(ratio, ratio > 0 ? 6 : 0)}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

type VoteSearchOverlayProps = {
  open: boolean;
  query: string;
  onChange: (value: string) => void;
  onClose: () => void;
  disabled: boolean;
  errorMessage: string | null;
  children: ReactNode;
};

function VoteSearchOverlay({
  open,
  query,
  onChange,
  onClose,
  disabled,
  errorMessage,
  children,
}: VoteSearchOverlayProps) {
  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      <div className="border-b border-slate-200 bg-white px-4 pb-4 pt-5 shadow-sm shadow-slate-200/40">
        <CandidateSearchBar
          value={query}
          onChange={onChange}
          disabled={disabled}
          autoFocus
          showCancel
          onCancel={onClose}
        />
        {errorMessage ? (
          <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
            {errorMessage}
          </p>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">{children}</div>
    </div>
  );
}

type VoteQuantityModalProps = {
  open: boolean;
  candidate: Candidate | null;
  quantityValue: string;
  onQuantityInputChange: (value: string) => void;
  onAdjustQuantity: (delta: number) => void;
  amountValue: string;
  onAmountInputChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  unitPrice: number;
  isProcessing: boolean;
};

function VoteQuantityModal({
  open,
  candidate,
  quantityValue,
  onQuantityInputChange,
  onAdjustQuantity,
  amountValue,
  onAmountInputChange,
  onClose,
  onConfirm,
  unitPrice,
  isProcessing,
}: VoteQuantityModalProps) {
  if (!open || !candidate) {
    return null;
  }

  const quantityFromVoices = deriveQuantityFromInput(quantityValue);
  const quantityFromAmountField = deriveQuantityFromAmountInput(amountValue);
  const effectiveQuantityRaw = quantityFromVoices ?? quantityFromAmountField ?? null;
  const payableQuantity = effectiveQuantityRaw !== null && effectiveQuantityRaw > 0 ? effectiveQuantityRaw : null;
  const totalAmount = payableQuantity !== null ? amountFromQuantity(payableQuantity) : null;
  const baseQuantity = effectiveQuantityRaw ?? 0;
  const disableDecrease = isProcessing || baseQuantity <= 0;
  const disableIncrease = isProcessing || baseQuantity >= MAX_VOTE_QUANTITY;
  const confirmDisabled = isProcessing || payableQuantity === null;

  const handleQuantityChange = (event: ChangeEvent<HTMLInputElement>) => {
    onQuantityInputChange(event.target.value);
  };
  const handleAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    onAmountInputChange(event.target.value);
  };

  const handleDecrease = () => {
    if (disableDecrease) {
      return;
    }
    onAdjustQuantity(-1);
  };

  const handleIncrease = () => {
    if (disableIncrease) {
      return;
    }
    onAdjustQuantity(1);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 text-slate-400 transition hover:text-slate-600 disabled:opacity-50"
          disabled={isProcessing}
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
          <TrophyIcon className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">Choisissez vos voix</h3>
        <p className="mt-1 text-xs text-slate-500">
          Prix unitaire : {formatNumber(unitPrice)} F CFA (min {MIN_VOTE_QUANTITY} voix).
        </p>

        <div className="mt-4 rounded-2xl bg-slate-100 px-3 py-2">
          <p className="text-base font-semibold text-slate-900">{candidate.name}</p>
          <p className="text-xs text-slate-500">{candidate.media}</p>
        </div>

        <div className="mt-5 flex flex-col gap-2 text-left">
          <label className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nombre de voix
          </label>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2">
          <button
            type="button"
            onClick={handleDecrease}
            disabled={disableDecrease}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white transition enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Retirer une voix"
          >
            -
          </button>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            max={MAX_VOTE_QUANTITY}
            value={quantityValue}
            onChange={handleQuantityChange}
            disabled={isProcessing}
            className="w-20 border-none bg-transparent text-center text-2xl font-semibold text-slate-900 focus:outline-none"
            aria-label="Nombre de voix"
          />
          <button
            type="button"
            onClick={handleIncrease}
            disabled={disableIncrease}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white transition enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Ajouter une voix"
          >
            +
          </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-left">
          <label className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            Montant (F CFA)
          </label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            value={amountValue}
            onChange={handleAmountChange}
            disabled={isProcessing}
            placeholder={`Multiple de ${formatNumber(unitPrice)}`}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-lg font-semibold text-slate-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmDisabled}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white transition enabled:hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isProcessing
            ? 'Initialisation...'
            : totalAmount !== null
              ? `Payer ${formatNumber(totalAmount)} F CFA`
              : 'Entrer un nombre valide'}
        </button>
      </div>
    </div>
  );
}

type VoteModalProps = {
  open: boolean;
  status: PaymentStatus;
  message: string | null;
  transactionId: string | null;
  candidate: Candidate | null;
  onClose: () => void;
  voteDetails: VoteDetails | null;
};

function VoteModal({ open, status, message, transactionId, candidate, onClose, voteDetails }: VoteModalProps) {
  if (!open) {
    return null;
  }

  const isSuccess = status === 'success';
  const isFailure = status === 'failed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 text-slate-400 transition hover:text-slate-600"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            isSuccess ? 'bg-emerald-100 text-emerald-500' : isFailure ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <TrophyIcon className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">
          {isSuccess ? 'Vote enregistre !' : isFailure ? 'Paiement interrompu' : 'Information'}
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          {message ?? (isSuccess ? 'Merci pour votre participation.' : 'Veuillez reessayer dans un instant.')}
        </p>

        {candidate ? (
          <div className="mt-4 rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
            {candidate.name} - {candidate.media}
          </div>
        ) : null}

        {voteDetails ? (
          <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            {voteDetails.voiceCount} voix - {formatNumber(voteDetails.amount)} F CFA
          </div>
        ) : null}

        {transactionId ? (
          <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500">
            Reference paiement : <span className="font-semibold text-slate-700">{transactionId}</span>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#111827] text-sm font-semibold text-white transition hover:bg-[#0f172a]"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

type CandidateSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  onActivate?: () => void;
  showCancel?: boolean;
  onCancel?: () => void;
};

function CandidateSearchBar({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  onActivate,
  showCancel = false,
  onCancel,
}: CandidateSearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isActivationMode = typeof onActivate === 'function' && !showCancel;

  const handleContainerClick = () => {
    if (!isActivationMode || disabled) {
      return;
    }
    onActivate?.();
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        inputRef.current?.blur();
      });
    }
  };

  const handleClear = () => {
    if (disabled) {
      return;
    }
    onChange('');
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const searchField = (
    <div
      className={`flex flex-1 items-center overflow-hidden rounded-full border border-slate-200 bg-white ${
        showCancel ? 'px-4 py-2.5' : 'px-4 py-2'
      } shadow-sm shadow-slate-200/50 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100`}
      onClick={handleContainerClick}
    >
      <SearchIcon className="mr-2 h-5 w-5 text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={handleChange}
        onFocus={event => {
          if (isActivationMode) {
            event.preventDefault();
            onActivate?.();
            if (typeof window !== 'undefined') {
              window.requestAnimationFrame(() => event.target.blur());
            }
          }
        }}
        placeholder="Rechercher un candidat..."
        className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Rechercher un candidat"
        disabled={disabled}
        autoFocus={autoFocus}
        readOnly={isActivationMode}
      />
      {value && !isActivationMode ? (
        <button
          type="button"
          onClick={handleClear}
          className="ml-2 text-xs font-semibold uppercase tracking-wide text-orange-500 transition hover:text-orange-600 disabled:cursor-not-allowed"
          disabled={disabled}
        >
          Effacer
        </button>
      ) : null}
    </div>
  );

  if (!showCancel) {
    return searchField;
  }

  return (
    <div className="flex w-full items-center gap-3">
      {searchField}
      <button
        type="button"
        onClick={onCancel}
        className="text-sm font-semibold text-slate-600 transition hover:text-slate-800"
      >
        Fermer
      </button>
    </div>
  );
}

type IconProps = SVGProps<SVGSVGElement>;

function TrophyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 01-5 5 5 5 0 01-5-5z" />
      <path d="M18 4h3v2a5 5 0 01-5 5" />
      <path d="M6 4H3v2a5 5 0 005 5" />
    </svg>
  );
}

function ChevronLeftIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const calculateTimeLeft = (endDate: Date): Countdown | null => {
  const diff = endDate.getTime() - Date.now();
  if (diff <= 0) {
    return null;
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
};

type CountdownPillsProps = Countdown;

function CountdownPills({ days, hours, minutes, seconds }: CountdownPillsProps) {
  const items = [
    { label: 'jours', value: days },
    { label: 'heures', value: hours },
    { label: 'minutes', value: minutes },
    { label: 'secondes', value: seconds },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map(item => (
        <div
          key={item.label}
          className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white/15 px-2 py-3 text-center"
        >
          <span className="text-lg font-bold text-white">{String(item.value).padStart(2, '0')}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-white/70">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white/90 px-4 py-5 text-center shadow-sm shadow-black/10 backdrop-blur">
      <span className="block text-2xl font-bold text-slate-900">{formatNumber(value)}</span>
      <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}

function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="9" r="5" />
      <path d="m13.5 13.5 3 3" />
    </svg>
  );
}

function PaymentPreparingNotice() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      <div className="flex flex-col text-left">
        <span>Préparation du paiement sécurisé…</span>
        <span className="text-xs font-normal text-slate-500">Merci de patienter pendant l’ouverture du module Kkiapay.</span>
      </div>
    </div>
  );
}
