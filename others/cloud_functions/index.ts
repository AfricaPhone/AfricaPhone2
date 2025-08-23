// cloud_function/index.ts
import { logger } from "firebase-functions";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";
import * as path from "path";
import * as os from "os";
import * as fs from "fs-extra";
import sharp = require("sharp");

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
      const userName = userDoc.exists
        ? `${userDoc.data()?.firstName} ${userDoc.data()?.lastName}`
        : "Utilisateur Anonyme";

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

/**
 * Gère l'agrégation lors de la CRÉATION d'un pronostic.
 * Se déclenche uniquement quand un nouveau pronostic est ajouté.
 */
export const aggregatePredictions = onDocumentCreated(
  "predictions/{predictionId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn("Données de l'événement de création absentes.");
      return;
    }

    const prediction = snap.data() as { matchId: string; scoreA: number; scoreB: number };
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
      await db.runTransaction(async (transaction) => {
        const matchDoc = await transaction.get(matchRef);
        if (!matchDoc.exists) {
          throw new Error(`Match ${matchId} non trouvé!`);
        }

        const data = matchDoc.data() || {};
        const trends = data.trends || {};

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
  }
);

/**
 * NOUVELLE FONCTION
 * Gère l'agrégation lors de la MISE À JOUR d'un pronostic.
 * Décrémente l'ancien score et incrémente le nouveau.
 */
export const updateAggregatedPredictions = onDocumentUpdated(
  "predictions/{predictionId}",
  async (event) => {
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;

    if (!beforeSnap || !afterSnap) {
      logger.warn(
        `[Update] Données before/after absentes pour le pronostic ${event.params.predictionId}.`
      );
      return;
    }

    const beforeData = beforeSnap.data();
    const afterData = afterSnap.data();

    // Si le score n'a pas changé, on ne fait rien.
    if (beforeData.scoreA === afterData.scoreA && beforeData.scoreB === afterData.scoreB) {
      logger.info(`[Update] Le score pour le pronostic ${beforeSnap.id} n'a pas changé.`);
      return;
    }

    const matchId = afterData.matchId;
    if (!matchId) {
      logger.error(`[Update] Le pronostic ${afterSnap.id} n'a pas de matchId.`);
      return;
    }

    logger.info(
      `[Update] Mise à jour de l'agrégation pour le pronostic ${afterSnap.id} sur le match ${matchId}.`
    );

    const matchRef = db.collection("matches").doc(matchId);

    const oldScoreKey = `${beforeData.scoreA}-${beforeData.scoreB}`;
    const newScoreKey = `${afterData.scoreA}-${afterData.scoreB}`;

    try {
      await db.runTransaction(async (transaction) => {
        const matchDoc = await transaction.get(matchRef);
        if (!matchDoc.exists) {
          throw new Error(`Match ${matchId} non trouvé!`);
        }

        const data = matchDoc.data() || {};
        const trends = data.trends || {};

        const oldScoreCount = trends[oldScoreKey] || 0;
        const newScoreCount = trends[newScoreKey] || 0;

        // Le nombre total de pronostics (predictionCount) ne change pas lors d'une mise à jour.
        transaction.update(matchRef, {
          [`trends.${oldScoreKey}`]: Math.max(0, oldScoreCount - 1), // On décrémente l'ancien score.
          [`trends.${newScoreKey}`]: newScoreCount + 1, // On incrémente le nouveau score.
        });
      });
      logger.info(`[Update] Tendances du match ${matchId} mises à jour avec succès après modification.`);
    } catch (err) {
      logger.error(`[Update] Erreur lors de la transaction de mise à jour pour le match ${matchId}:`, err);
    }
  }
);

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
      logger.warn(`[Match ${matchId}] Données before/after absentes.`);
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
      logger.info(`[Match ${matchId}] Arrêt: scores inchangés ou invalides.`);
      return;
    }

    logger.info(
      `[Match ${matchId}] Score final: ${afterData.finalScoreA}-${afterData.finalScoreB}`
    );

    try {
      // 1) Récupérer tous les pronostics du match.
      const snap = await db.collection("predictions").where("matchId", "==", matchId).get();

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
          logger.info(`[Match ${matchId}] Gagnant: ${p.userId ?? "?"} (${doc.id}).`);
          batch.update(doc.ref, { isWinner: true });
        } else {
          // Optionnel: remettre à false si le score final a changé.
          batch.update(doc.ref, { isWinner: false });
        }
      });

      // 4) Commit.
      await batch.commit();

      logger.info(`[Match ${matchId}] Fin. ${snap.size} pronostics vérifiés.`);
    } catch (err) {
      logger.error(`[Match ${matchId}] Erreur:`, err);
    }
  }
);

/**
 * --- TRAITEMENT D'IMAGE (V2 / 2nd Gen) ---
 * La région est alignée avec le bucket: africa-south1
 */
export const processProductImage = onObjectFinalized(
  {
    region: "africa-south1",
    memory: "1GiB",
    timeoutSeconds: 120,
  },
  async (event) => {
    const object = event.data;
    const bucketName = object.bucket || "";
    const filePath = object.name || "";
    const contentType = object.contentType || "";

    const bucket = getStorage().bucket(bucketName);

    // 1. Vérifications initiales
    if (
      !filePath.startsWith("product-images/") ||
      !contentType.startsWith("image/") ||
      filePath.includes("_processed") // *** BUG FIX: Ignorer les fichiers déjà traités ***
    ) {
      return logger.log("Fichier ignoré :", filePath);
    }
    
    // Extrait l'ID du produit du chemin (ex: product-images/PRODUCT_ID/image.jpg)
    const pathParts = filePath.split("/");
    if (pathParts.length < 3) {
        return logger.log("Chemin de fichier invalide, ID de produit manquant:", filePath);
    }
    const productId = pathParts[1];

    logger.info(`Début du traitement pour l'image du produit ${productId} : ${filePath}`);
    const tempFilePath = path.join(os.tmpdir(), path.basename(filePath));
    const newFileName = `${path.parse(path.basename(filePath)).name}_processed.webp`;
    const tempNewPath = path.join(os.tmpdir(), newFileName);

    try {
      // 2. Télécharger, redimensionner et convertir l'image
      await bucket.file(filePath).download({ destination: tempFilePath });
      await sharp(tempFilePath)
        .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(tempNewPath);

      // 3. Envoyer la nouvelle image optimisée vers le même dossier
      const newFilePath = path.join(path.dirname(filePath), newFileName);
      await bucket.upload(tempNewPath, {
        destination: newFilePath,
        metadata: { contentType: "image/webp" },
      });

      const newFile = bucket.file(newFilePath);
      await newFile.makePublic();
      const publicUrl = newFile.publicUrl();

      // 4. Mettre à jour le document Firestore en utilisant une transaction
      const productRef = db.collection("products").doc(productId);
      
      await db.runTransaction(async (transaction) => {
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists) {
              throw new Error(`Produit ${productId} non trouvé!`);
          }

          const productData = productDoc.data() || {};
          const currentImageUrls = productData.imageUrls || [];
          
          // Ajoute la nouvelle URL à la liste
          const updatedImageUrls = [...currentImageUrls, publicUrl];
          
          const updatePayload: { imageUrls: string[], imageUrl?: string } = {
              imageUrls: updatedImageUrls,
          };

          // Si c'est la première image ajoutée à la liste, on la définit comme image principale
          if (updatedImageUrls.length === 1) {
              updatePayload.imageUrl = publicUrl;
          }

          transaction.update(productRef, updatePayload);
      });

      logger.info(`Produit ${productId} mis à jour avec la nouvelle URL : ${publicUrl}`);

      // 5. Supprimer l'image originale non optimisée
      await bucket.file(filePath).delete();
      logger.info(`Image originale ${filePath} supprimée.`);

    } catch (error) {
      logger.error("Erreur lors du traitement de l'image:", error);
    } finally {
      // 6. Nettoyer les fichiers temporaires
      await fs.unlink(tempFilePath).catch((err: any) => logger.error("Erreur suppression temp:", err));
      await fs.unlink(tempNewPath).catch((err: any) => logger.error("Erreur suppression temp webp:", err));
    }
  }
);
