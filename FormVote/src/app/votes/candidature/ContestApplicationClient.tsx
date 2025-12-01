'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { ContestSubmissionSettings, ContestCandidateDraft, ContestCandidatePayload } from '@/types/contestSubmission';
import { MAX_BIO_LENGTH, buildPhotoStoragePath, normalizePhoneNumber } from '@/utils/contestCandidate';
import { sha256HexBrowser } from '@/utils/hashBrowser';
import { clearContestDraft, loadContestDraft, saveContestDraft } from '@/utils/contestDraftStorage';
import { storage } from '@/lib/firebaseClient';

type Props = {
  initialSettings: ContestSubmissionSettings;
};

type StatusMessage = {
  type: 'success' | 'error' | null;
  message: string | null;
};

type PhotoState = {
  status: 'idle' | 'uploading' | 'uploaded' | 'error';
  path?: string;
  url?: string;
  error?: string | null;
  phoneHash?: string;
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_SIZE = 8 * 1024 * 1024; // 8 MB raw, compressed to <=5 MB server-side

const emptyDraft: ContestCandidateDraft = {
  contestId: '',
  fullName: '',
  media: '',
  biography: '',
  phone: '',
  email: '',
};

const sanitizeContestId = (value: string, fallback: string) => {
  const trimmed = value.trim();
  return trimmed || fallback;
};

const formatPhonePreview = (value: string) => {
  const normalized = normalizePhoneNumber(value);
  return normalized ?? value;
};

const waitForImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = err => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    image.src = url;
  });

const compressImage = async (file: File): Promise<Blob> => {
  const image = await waitForImage(file);
  const canvas = document.createElement('canvas');
  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext('2d');
  if (!context) {
    return file;
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Impossible de compresser le fichier.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.82
    );
  });
};

const createRandomSuffix = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  }
  return Math.random().toString(36).slice(2, 12);
};

export default function ContestApplicationClient({ initialSettings }: Props) {
  const [formValues, setFormValues] = useState<ContestCandidateDraft>(() => ({
    ...emptyDraft,
    contestId: sanitizeContestId(initialSettings.contestId, 'press-stars-2025'),
  }));
  const [photoState, setPhotoState] = useState<PhotoState>({ status: 'idle' });
  const [statusMessage, setStatusMessage] = useState<StatusMessage>({ type: null, message: null });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const savedDraft = loadContestDraft();
    if (savedDraft) {
      setFormValues(prev => ({
        ...prev,
        ...savedDraft,
        contestId: sanitizeContestId(savedDraft.contestId || prev.contestId, prev.contestId),
      }));
      if (savedDraft.photoPath) {
        setPhotoState({
          status: 'uploaded',
          path: savedDraft.photoPath,
          url: savedDraft.photoUrl,
        });
      }
      setStatusMessage({
        type: 'success',
        message: 'Brouillon chargé automatiquement.',
      });
    }
    setDraftRestored(true);
  }, []);

  const isContestOpen = initialSettings.isOpen;

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): Record<string, string> => {
    const nextErrors: Record<string, string> = {};
    if (!formValues.fullName.trim()) {
      nextErrors.fullName = 'Nom complet requis.';
    }
    if (!formValues.media.trim()) {
      nextErrors.media = 'Média ou organe requis.';
    }
    if (formValues.biography.trim().length === 0) {
      nextErrors.biography = 'Biographie requise.';
    } else if (formValues.biography.trim().length > MAX_BIO_LENGTH) {
      nextErrors.biography = `Maximum ${MAX_BIO_LENGTH} caractères.`;
    }
    const normalizedPhone = normalizePhoneNumber(formValues.phone);
    if (!normalizedPhone) {
      nextErrors.phone = 'Numéro WhatsApp au format international requis.';
    }
    if (formValues.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email.trim())) {
      nextErrors.email = 'Adresse e-mail invalide.';
    }
    if (!photoState.path) {
      nextErrors.photo = 'Merci de téléverser votre photo.';
    }
    if (!sanitizeContestId(formValues.contestId, initialSettings.contestId)) {
      nextErrors.contestId = 'Identifiant du concours requis.';
    }
    return nextErrors;
  };

  const handleSaveDraft = useCallback(() => {
    setIsSavingDraft(true);
    const payload: ContestCandidateDraft = {
      ...formValues,
      photoPath: photoState.path,
      photoUrl: photoState.url,
    };
    const saved = saveContestDraft(payload);
    setStatusMessage({
      type: saved ? 'success' : 'error',
      message: saved ? 'Brouillon enregistré !' : 'Sauvegarde impossible sur cet appareil.',
    });
    setIsSavingDraft(false);
  }, [formValues, photoState.path, photoState.url]);

  const handleClearDraft = () => {
    clearContestDraft();
    setFormValues(prev => ({
      ...emptyDraft,
      contestId: prev.contestId,
    }));
    setPhotoState({ status: 'idle' });
    setStatusMessage({ type: 'success', message: 'Brouillon réinitialisé.' });
  };

  const uploadPhoto = async (file: File) => {
    if (!isContestOpen) {
      throw new Error('La période de candidature est close.');
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      throw new Error('Formats acceptés : JPG, PNG ou WEBP.');
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      throw new Error('Le fichier dépasse 8 Mo.');
    }
    const normalizedPhone = normalizePhoneNumber(formValues.phone);
    if (!normalizedPhone) {
      throw new Error('Renseignez un numéro WhatsApp valide avant le téléversement.');
    }
    const contestId = sanitizeContestId(formValues.contestId, initialSettings.contestId);
    if (!contestId) {
      throw new Error("L'identifiant du concours est obligatoire.");
    }

    const phoneHash = await sha256HexBrowser(normalizedPhone);
    const compressedBlob = await compressImage(file);
    if (compressedBlob.size > 5 * 1024 * 1024) {
      throw new Error('Le fichier compressé dépasse 5 Mo.');
    }
    const suffix = createRandomSuffix();
    const storagePath = buildPhotoStoragePath(contestId, phoneHash, suffix);
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, compressedBlob, {
      contentType: 'image/jpeg',
      customMetadata: {
        source: 'contest-form',
        contestId,
        phoneHash,
      },
      cacheControl: 'public,max-age=86400',
    });
    const url = await getDownloadURL(storageRef);
    setPhotoState({
      status: 'uploaded',
      path: storagePath,
      url,
      phoneHash,
    });
    setStatusMessage({
      type: 'success',
      message: 'Photo téléversée avec succès.',
    });
    setErrors(prev => {
      const next = { ...prev };
      delete next.photo;
      return next;
    });
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) {
      return;
    }
    const file = event.target.files[0];
    setPhotoState({ status: 'uploading' });
    try {
      await uploadPhoto(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Téléversement impossible.';
      setPhotoState({
        status: 'error',
        error: message,
      });
      setStatusMessage({
        type: 'error',
        message,
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateForm();
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setStatusMessage({ type: 'error', message: 'Merci de corriger les champs indiqués.' });
      return;
    }
    if (!photoState.path) {
      setStatusMessage({ type: 'error', message: 'Téléversez votre photo avant la soumission.' });
      return;
    }
    if (!isContestOpen) {
      setStatusMessage({ type: 'error', message: 'La phase de candidatures est clôturée.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const normalizedPhone = normalizePhoneNumber(formValues.phone);
      if (!normalizedPhone) {
        throw new Error('Numéro WhatsApp invalide.');
      }
      const payload: ContestCandidatePayload = {
        contestId: sanitizeContestId(formValues.contestId, initialSettings.contestId),
        fullName: formValues.fullName.trim(),
        media: formValues.media.trim(),
        biography: formValues.biography.trim(),
        phone: normalizedPhone,
        email: formValues.email?.trim() || undefined,
        photoPath: photoState.path,
      };
      const response = await fetch('/api/submitContestCandidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Soumission impossible pour le moment.');
      }
      clearContestDraft();
      setStatusMessage({ type: 'success', message: data.message });
      setFormValues(prev => ({
        ...emptyDraft,
        contestId: prev.contestId,
      }));
      setPhotoState({ status: 'idle' });
      formRef.current?.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Soumission impossible.';
      setStatusMessage({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contestLink = initialSettings.sitePublicUrl || 'https://africaphone-contest-form.web.app/votes';
  const phonePreview = useMemo(() => formatPhonePreview(formValues.phone), [formValues.phone]);

  return (
    <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-10">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <NextImage src="/logo.png" alt="AfricaPhone" width={120} height={40} className="h-10 w-auto" />
            <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Formulaire de candidature artistes chanteurs</p>
          </div>
            <Link
              href={contestLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Accéder au site public
            </Link>
          </div>
          <p className="mt-4 text-base text-white/80">
            Merci de renseigner les informations ci-dessous pour présenter votre profil artistique.
          </p>
        </header>

        {statusMessage.message ? (
          <div
            className={`rounded-2xl border px-5 py-4 text-sm font-medium ${
              statusMessage.type === 'success'
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
                : 'border-rose-400/50 bg-rose-500/10 text-rose-100'
            }`}
          >
            {statusMessage.message}
          </div>
        ) : null}

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="grid gap-8 rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-xl shadow-black/20 md:grid-cols-3 md:gap-10"
        >
          <input type="hidden" name="contestId" value={formValues.contestId} readOnly />
          {!isContestOpen ? (
            <div className="md:col-span-3 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm font-semibold text-rose-100">
              La phase de candidatures est clôturée.
            </div>
          ) : null}
          <div className="space-y-6 md:col-span-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-white/90">
                Nom complet
                <input
                  type="text"
                  name="fullName"
                  value={formValues.fullName}
                  onChange={handleInputChange}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-white/40 focus:bg-white/10"
                  placeholder="Nom Prénom"
                  required
                />
                {errors.fullName ? <span className="text-xs text-rose-300">{errors.fullName}</span> : null}
              </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-white/90">
              Média ou organe
              <input
                type="text"
                name="media"
                value={formValues.media}
                onChange={handleInputChange}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-white/40 focus:bg-white/10"
                placeholder="Radio XYZ, TV5 Monde..."
                required
              />
              {errors.media ? <span className="text-xs text-rose-300">{errors.media}</span> : null}
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-white/90">
              Biographie courte ({formValues.biography.length}/{MAX_BIO_LENGTH})
              <textarea
                name="biography"
                value={formValues.biography}
                onChange={handleInputChange}
                className="min-h-[140px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-white/40 focus:bg-white/10"
                maxLength={MAX_BIO_LENGTH}
                placeholder="En 3 ou 4 phrases, présentez votre parcours..."
              />
              {errors.biography ? <span className="text-xs text-rose-300">{errors.biography}</span> : null}
            </label>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-semibold text-white/90">
                Téléphone WhatsApp (+229...)
                <input
                  type="tel"
                  name="phone"
                  value={formValues.phone}
                  onChange={handleInputChange}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-white/40 focus:bg-white/10"
                  placeholder="+229XXXXXXXXX"
                  required
                />
                <span className="text-xs text-white/60">Format international requis. Prévisualisation&nbsp;: {phonePreview}</span>
                {errors.phone ? <span className="text-xs text-rose-300">{errors.phone}</span> : null}
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-white/90">
                E-mail (optionnel)
                <input
                  type="email"
                  name="email"
                  value={formValues.email}
                  onChange={handleInputChange}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-white/40 focus:bg-white/10"
                  placeholder="vous@media.africa"
                />
                {errors.email ? <span className="text-xs text-rose-300">{errors.email}</span> : null}
              </label>
            </div>
          </div>

          <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div>
              <h2 className="text-lg font-semibold text-white">Photo officielle</h2>
              <p className="text-sm text-white/70">
                JPG/PNG 5 Mo max. Éclairage uniforme et cadrage poitrine ou portrait serré recommandés.
              </p>
            </div>
            <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-10 text-center text-sm text-white/80 transition hover:border-white/60">
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={!isContestOpen} />
              <span className="rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-wide text-white/70">
                {photoState.status === 'uploading' ? 'Téléversement...' : 'Sélectionner un fichier'}
              </span>
              {photoState.url ? (
                <NextImage
                  src={photoState.url}
                  alt="Prévisualisation"
                  width={128}
                  height={128}
                  className="h-32 w-32 rounded-full object-cover shadow-lg shadow-black/30"
                />
              ) : (
                <span>Glissez votre photo ou cliquez pour la sélectionner.</span>
              )}
              {photoState.error ? <span className="text-xs text-rose-300">{photoState.error}</span> : null}
              {errors.photo ? <span className="text-xs text-rose-300">{errors.photo}</span> : null}
            </label>
            <div className="space-y-3 rounded-2xl bg-slate-900/60 p-4 text-sm text-white/80">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/50">
                <span>Brouillon local</span>
                <span>{draftRestored ? 'Prêt' : 'Chargement...'}</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/20"
                  disabled={isSavingDraft}
                >
                  {isSavingDraft ? 'Enregistrement...' : 'Enregistrer pour plus tard'}
                </button>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/40 hover:text-white"
                >
                  Effacer le brouillon
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={!isContestOpen || isSubmitting}
              className="w-full rounded-full bg-emerald-400 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-400/40 disabled:text-white/60"
            >
              {isContestOpen ? (isSubmitting ? 'Envoi en cours...' : 'Soumettre ma candidature') : 'Candidatures clôturées'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
