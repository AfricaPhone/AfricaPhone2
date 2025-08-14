import {logger} from "firebase-functions";
import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// Initialise l'app Firebase Admin pour interagir avec Firestore.
admin.initializeApp();
const db = admin.firestore();

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
