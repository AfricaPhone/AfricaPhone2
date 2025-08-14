import {logger} from "firebase-functions";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialise l'app Firebase Admin pour interagir avec Firestore.
admin.initializeApp();
const db = admin.firestore();

/**
 * NOUVELLE FONCTION (CALLABLE)
 * Gère la soumission ou la mise à jour d'un pronostic.
 * Toute la logique de validation est centralisée ici.
 */
export const placePrediction = onCall(async (request) => {
  // 1. Vérifier l'authentification
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Vous devez être connecté pour faire un pronostic."
    );
  }

  const {uid, token} = request.auth;
  const {matchId, scoreA, scoreB} = request.data as {
    matchId: string;
    scoreA: number;
    scoreB: number;
  };

  // 2. Valider les données d'entrée
  if (
    !matchId ||
    typeof scoreA !== "number" ||
    typeof scoreB !== "number" ||
    scoreA < 0 ||
    scoreB < 0
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Les données fournies sont invalides."
    );
  }

  const matchRef = db.collection("matches").doc(matchId);
  const userRef = db.collection("users").doc(uid);

  try {
    const [matchDoc, userDoc] = await Promise.all([
      matchRef.get(),
      userRef.get(),
    ]);

    // 3. Vérifier que le match existe et n'a pas commencé
    if (!matchDoc.exists) {
      throw new HttpsError("not-found", "Le match spécifié n'existe pas.");
    }

    const matchData = matchDoc.data() as { startTime: admin.firestore.Timestamp };
    if (matchData.startTime.toMillis() < Date.now()) {
      throw new HttpsError(
        "failed-precondition",
        "Les pronostics pour ce match sont terminés."
      );
    }

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Profil utilisateur introuvable.");
    }
    const userName = `${userDoc.data()?.firstName ?? ""} ${
      userDoc.data()?.lastName ?? ""
    }`.trim();

    // 4. Chercher une prédiction existante pour cet utilisateur et ce match
    const predictionsRef = db.collection("predictions");
    const existingPredictionQuery = await predictionsRef
      .where("matchId", "==", matchId)
      .where("userId", "==", uid)
      .limit(1)
      .get();

    const predictionData = {
      userId: uid,
      userName: userName || token.name || "Anonyme",
      matchId,
      scoreA,
      scoreB,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 5. Mettre à jour ou créer le document
    if (!existingPredictionQuery.empty) {
      // Mettre à jour
      const predictionDocId = existingPredictionQuery.docs[0].id;
      await predictionsRef.doc(predictionDocId).update({scoreA, scoreB});
      logger.info(`Pronostic mis à jour pour ${uid} sur le match ${matchId}.`);
      return {success: true, message: "Pronostic mis à jour !"};
    } else {
      // Créer
      await predictionsRef.add(predictionData);
      logger.info(`Nouveau pronostic créé pour ${uid} sur le match ${matchId}.`);
      return {success: true, message: "Pronostic enregistré !"};
    }
  } catch (error) {
    logger.error("Erreur lors de la soumission du pronostic:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      "Une erreur interne est survenue.",
      error
    );
  }
});


/**
 * Déclenchée à chaque update d'un doc de la collection 'matches'.
 * Vérifie les pronostics quand les scores finaux sont ajoutés/modifiés.
 */
export const processMatchResults = onDocumentUpdated(
  "matches/{matchId}",
  async (event) => {
    const matchId = event.params.matchId as string;

    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;

    if (!beforeSnap || !afterSnap) {
      logger.warn(
        `[Match ${matchId}] Données before/after absentes.`
      );
      return;
    }

    const beforeData = beforeSnap.data() as {
      finalScoreA?: number;
      finalScoreB?: number;
    };

    const afterData = afterSnap.data() as {
      finalScoreA?: number;
      finalScoreB?: number;
    };

    // Sortie si pas de vrai changement ou scores invalides.
    const aChanged = beforeData.finalScoreA !== afterData.finalScoreA;
    const bChanged = beforeData.finalScoreB !== afterData.finalScoreB;

    const aIsNum = typeof afterData.finalScoreA === "number";
    const bIsNum = typeof afterData.finalScoreB === "number";

    if ((!aChanged && !bChanged) || !aIsNum || !bIsNum) {
      logger.info(
        `[Match ${matchId}] Arrêt: scores inchangés ou invalides.`
      );
      return;
    }

    logger.info(
      `[Match ${matchId}] Score final: ` +
        `${afterData.finalScoreA}-${afterData.finalScoreB}`
    );

    try {
      // 1) Récupérer tous les pronostics du match.
      const snap = await db
        .collection("predictions")
        .where("matchId", "==", matchId)
        .get();

      if (snap.empty) {
        logger.info(`[Match ${matchId}] Aucun pronostic.`);
        return;
      }

      // 2) Batch pour les MAJ.
      const batch = db.batch();

      // 3) Vérifier chaque pronostic.
      snap.forEach((doc) => {
        const p = doc.data() as {
          userId?: string;
          scoreA?: number;
          scoreB?: number;
          isWinner?: boolean;
        };

        const ok =
          typeof p.scoreA === "number" &&
          typeof p.scoreB === "number" &&
          p.scoreA === afterData.finalScoreA &&
          p.scoreB === afterData.finalScoreB;

        if (ok) {
          logger.info(
            `[Match ${matchId}] Gagnant: ` +
              `${p.userId ?? "?"} (${doc.id}).`
          );
          batch.update(doc.ref, {isWinner: true});
        } else {
          // Optionnel: remettre à false si le score final a changé.
          batch.update(doc.ref, {isWinner: false});
        }
      });

      // 4) Commit.
      await batch.commit();

      logger.info(
        `[Match ${matchId}] Fin. ${snap.size} pronostics vérifiés.`
      );
    } catch (err) {
      logger.error(`[Match ${matchId}] Erreur:`, err);
    }
  }
);
