// cloud_function/index.ts
import {logger} from "firebase-functions";
import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialise l'app Firebase Admin pour interagir avec Firestore.
admin.initializeApp();
const db = admin.firestore();

/**
 * NOUVELLE FONCTION "CALLABLE"
 * Gère la soumission (création/mise à jour) d'un pronostic.
 * C'est cette fonction que l'application va appeler.
 */
export const submitPrediction = onCall(async (request) => {
    // 1. Vérifier que l'utilisateur est authentifié
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Vous devez être connecté.");
    }

    const { uid } = request.auth;
    const { matchId, scoreA, scoreB, predictionId } = request.data as {
        matchId: string;
        scoreA: number;
        scoreB: number;
        predictionId?: string; // ID du pronostic s'il s'agit d'une mise à jour
    };

    // 2. Valider les données reçues
    if (!matchId || typeof scoreA !== "number" || typeof scoreB !== "number") {
        throw new HttpsError("invalid-argument", "Les données fournies sont invalides.");
    }
    
    // 3. Vérifier que le match n'a pas commencé (logique de sécurité côté serveur)
    const matchRef = db.collection("matches").doc(matchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
        throw new HttpsError("not-found", `Le match ${matchId} n'existe pas.`);
    }

    const matchStartTime = matchDoc.data()?.startTime.toDate();
    if (new Date() >= matchStartTime) {
        throw new HttpsError("failed-precondition", "Les pronostics pour ce match sont terminés.");
    }

    // 4. Créer ou Mettre à jour le pronostic
    try {
        if (predictionId) {
            // --- Mise à jour d'un pronostic existant ---
            logger.info(`Mise à jour du pronostic ${predictionId} pour l'utilisateur ${uid}.`);
            const predictionRef = db.collection("predictions").doc(predictionId);
            
            // On vérifie que l'utilisateur est bien le propriétaire du pronostic
            const existingPrediction = await predictionRef.get();
            if (!existingPrediction.exists || existingPrediction.data()?.userId !== uid) {
                 throw new HttpsError("permission-denied", "Vous ne pouvez pas modifier ce pronostic.");
            }
            
            await predictionRef.update({ scoreA, scoreB });
            return { success: true, message: "Pronostic mis à jour !" };

        } else {
            // --- Création d'un nouveau pronostic ---
            logger.info(`Création d'un pronostic pour l'utilisateur ${uid} sur le match ${matchId}.`);
            const userDoc = await db.collection("users").doc(uid).get();
            const userName = userDoc.exists ? `${userDoc.data()?.firstName} ${userDoc.data()?.lastName}` : "Utilisateur Anonyme";

            const newPrediction = {
                userId: uid,
                userName: userName,
                matchId: matchId,
                scoreA: scoreA,
                scoreB: scoreB,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            
            await db.collection("predictions").add(newPrediction);
            return { success: true, message: "Pronostic enregistré. Bonne chance !" };
        }
    } catch (error) {
        logger.error("Erreur lors de l'écriture du pronostic:", error);
        throw new HttpsError("internal", "Une erreur interne est survenue.");
    }
});


export const aggregatePredictions = onDocumentCreated("predictions/{predictionId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        logger.warn("Données de l'événement de création absentes.");
        return;
    }

    const prediction = snap.data() as { matchId: string, scoreA: number, scoreB: number };
    const { matchId, scoreA, scoreB } = prediction;

    if (!matchId) {
        logger.error(`Le pronostic ${snap.id} n'a pas de matchId.`);
        return;
    }

    logger.info(`Agrégation pour le pronostic ${snap.id} sur le match ${matchId}.`);

    const matchRef = db.collection("matches").doc(matchId);
    
    // La clé pour notre map de tendances. Ex: "1-0", "2-2".
    const scoreKey = `${scoreA}-${scoreB}`;

    try {
        // Utilise une transaction pour garantir que les mises à jour sont atomiques.
        // C'est essentiel quand plusieurs utilisateurs font des pronostics en même temps.
        await db.runTransaction(async (transaction) => {
            const matchDoc = await transaction.get(matchRef);
            if (!matchDoc.exists) {
                throw new Error(`Match ${matchId} non trouvé!`);
            }

            const data = matchDoc.data() || {};
            const trends = data.trends || {};
            
            // La transaction doit relire l'ancien score pour le décrémenter s'il existe
            // Ceci n'est pas géré ici pour garder l'exemple simple, mais serait
            // nécessaire si un utilisateur pouvait changer son vote.
            // Pour l'instant, on se contente d'incrémenter.
            const currentTotal = data.predictionCount || 0;
            const currentScoreCount = trends[scoreKey] || 0;

            // Met à jour le document match avec les nouveaux compteurs
            transaction.update(matchRef, {
                predictionCount: currentTotal + 1,
                // Utilise la notation par points pour mettre à jour un champ dans une map.
                [`trends.${scoreKey}`]: currentScoreCount + 1,
            });
        });
        logger.info(`Match ${matchId} mis à jour avec succès.`);
    } catch (err) {
        logger.error(`Erreur lors de la transaction pour le match ${matchId}:`, err);
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