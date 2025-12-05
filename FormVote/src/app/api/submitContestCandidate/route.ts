import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getAdminBucket } from '@/lib/firebaseAdmin';
import { fetchContestSubmissionSettings } from '@/server/contestSubmissions';
import type { ContestCandidateResponse } from '@/types/contestSubmission';
import {
  MAX_BIO_LENGTH,
  isEmailValid,
  isPhotoPathValid,
  normalizeEmail,
  normalizePhoneNumber,
  slugifyCandidate,
} from '@/utils/contestCandidate';
import { sha256HexNode } from '@/utils/hashNode';

type SubmitRequestBody = {
  contestId?: string;
  fullName?: string;
  media?: string;
  biography?: string;
  phone?: string;
  email?: string;
  photoPath?: string;
};

const errorResponse = (message: string, status = 400) =>
  NextResponse.json({ message }, { status });

const createPhotoUrl = (bucket: string, filePath: string) => {
  const encodedPath = encodeURIComponent(filePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let payload: SubmitRequestBody;
  try {
    payload = await request.json();
  } catch (error) {
    console.error('submitContestCandidate: invalid JSON', error);
    return errorResponse('RequÃƒÂªte invalide.', 400);
  }

  const settings = await fetchContestSubmissionSettings();
  const isSubmissionOpen = settings.isSubmissionOpen ?? settings.isOpen;

  if (!isSubmissionOpen) {
    return errorResponse('La phase de candidatures est clÃƒÂ´turÃƒÂ©e.', 409);
  }

  const contestId = (payload.contestId || settings.contestId || 'press-stars-2025').trim();

  if (!contestId) {
    return errorResponse("L'identifiant du concours est obligatoire.");
  }

  const fullName = (payload.fullName || '').trim();
  if (fullName.length < 3) {
    return errorResponse('Merci de saisir votre nom complet (minimum 3 caractÃƒÂ¨res).');
  }

  const media = (payload.media || '').trim();
  if (media.length < 2) {
    return errorResponse('Merci de prÃ©ciser quelques titres de vos chansons.');
  }

  const biography = (payload.biography || '').trim();
  if (!biography) {
    return errorResponse('Une biographie courte est requise.');
  }
  if (biography.length > MAX_BIO_LENGTH) {
    return errorResponse(`La biographie ne doit pas dÃƒÂ©passer ${MAX_BIO_LENGTH} caractÃƒÂ¨res.`);
  }

  const phoneNormalized = normalizePhoneNumber(payload.phone || '');
  if (!phoneNormalized) {
    return errorResponse('Le numÃƒÂ©ro WhatsApp doit ÃƒÂªtre au format international (+229...).');
  }

  const emailNormalized = normalizeEmail(payload.email || undefined);
  if (!isEmailValid(payload.email)) {
    return errorResponse("L'adresse e-mail n'est pas valide.");
  }

  const phoneHash = sha256HexNode(phoneNormalized);
  const emailHash = emailNormalized ? sha256HexNode(emailNormalized) : null;
  if (!isPhotoPathValid(contestId, phoneHash, payload.photoPath)) {
    return errorResponse('La photo tÃƒÂ©lÃƒÂ©versÃƒÂ©e est invalide ou manquante.');
  }

  const photoPath = payload.photoPath!;

  try {
    const adminDb = getAdminDb();
    const adminBucket = getAdminBucket();
    const bucketFile = adminBucket.file(photoPath);
    const [exists] = await bucketFile.exists();
    if (!exists) {
      return errorResponse("La photo n'a pas été trouvée, merci de la téléverser à nouveau.");
    }

    const [metadata] = await bucketFile.getMetadata();
    const customMetadata = metadata.metadata || {};
    if (customMetadata.source !== 'contest-form') {
      return errorResponse('Le fichier photo doit provenir du formulaire officiel.');
    }

    const photoContentType = metadata.contentType || '';
    if (!photoContentType.startsWith('image/')) {
      return errorResponse('Le fichier photo doit ÃƒÂªtre une image.');
    }

    const fileSize = Number(metadata.size || 0);
    if (!Number.isFinite(fileSize) || fileSize > 5 * 1024 * 1024) {
      return errorResponse('Le fichier photo dÃƒÂ©passe la limite autorisÃƒÂ©e (5 Mo).');
    }

    const candidatesRef = adminDb.collection('contests').doc(contestId).collection('candidates');
    const candidateRef = candidatesRef.doc();
    const profilesRef = adminDb.collection('contestCandidateProfiles');
    const privateRef = profilesRef.doc(candidateRef.id);
    const phoneLockRef = adminDb.collection('contestCandidateLocks').doc(`${contestId}__${phoneHash}`);
    const emailLockRef = emailHash ?
      adminDb.collection('contestCandidateEmailLocks').doc(`${contestId}__${emailHash}`) :
      null;

    const slug = slugifyCandidate(`${fullName}-${media}`) || slugifyCandidate(phoneNormalized);

    const now = FieldValue.serverTimestamp();
    const photoUrl = createPhotoUrl(adminBucket.name, photoPath);

    const payloadToStore = {
      contestId,
      name: fullName,
      media,
      biography,
      slug,
      phoneHash,
      voteCount: 0,
      status: 'published',
      photoUrl,
      photoPath,
      source: 'form',
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    };

    const privatePayload = {
      contestId,
      candidateId: candidateRef.id,
      phone: payload.phone?.trim(),
      phoneNormalized,
      phoneHash,
      email: emailNormalized || null,
      emailNormalized: emailNormalized || null,
      emailHash: emailHash || null,
      createdAt: now,
      updatedAt: now,
      source: 'form',
    };

    await adminDb.runTransaction(async transaction => {
      const phoneLockSnapshot = await transaction.get(phoneLockRef);
      if (phoneLockSnapshot.exists) {
        throw new Error('PHONE_EXISTS');
      }

      if (emailLockRef) {
        const emailLockSnapshot = await transaction.get(emailLockRef);
        if (emailLockSnapshot.exists) {
          throw new Error('EMAIL_EXISTS');
        }
      }

      transaction.set(candidateRef, payloadToStore);
      transaction.set(privateRef, privatePayload);
      transaction.set(phoneLockRef, {
        contestId,
        phoneHash,
        candidateId: candidateRef.id,
        createdAt: now,
        source: 'form',
      });
      if (emailLockRef && emailHash) {
        transaction.set(emailLockRef, {
          contestId,
          emailHash,
          candidateId: candidateRef.id,
          createdAt: now,
          source: 'form',
        });
      }
    });

    const responseBody: ContestCandidateResponse = {
      message: 'Votre candidature a ete enregistree avec succes.',
      candidateId: candidateRef.id,
      contestId,
    };

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PHONE_EXISTS') {
        return errorResponse('Un profil est dÃƒÂ©jÃƒÂ  associÃƒÂ© ÃƒÂ  ce numÃƒÂ©ro WhatsApp.', 409);
      }
      if (error.message === 'EMAIL_EXISTS') {
        return errorResponse('Cette adresse e-mail est dÃƒÂ©jÃƒÂ  liÃƒÂ©e ÃƒÂ  un autre candidat.', 409);
      }
    }
    console.error('submitContestCandidate: unexpected error', error);
    return errorResponse('Impossible de traiter votre candidature pour le moment.', 500);
  }
}


