import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

type CheckPhoneData = {
  phoneNumber: string;
};

/**
 * Une fonction appelable pour vérifier si un numéro de téléphone existe déjà.
 * @param {object} rawData - Données envoyées par le client.
 * @returns {Promise<{exists: boolean}>} Indique si le numéro existe.
 */
export const checkPhoneNumberExists = functions.https.onCall(
  async (rawData: unknown) => {
    // 1. Valider l'entrée de manière sûre
    const phoneNumber = (rawData as CheckPhoneData)?.phoneNumber;

    if (
      !phoneNumber ||
      typeof phoneNumber !== "string" ||
      !/^\+[1-9]\d{1,14}$/.test(phoneNumber)
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Le numéro de téléphone fourni est invalide."
      );
    }

    functions.logger.info(`Vérification du numéro : ${phoneNumber}`);

    try {
      // 2. Interroger la collection 'users'
      const usersRef = db.collection("users");
      const snapshot = await usersRef
        .where("phoneNumber", "==", phoneNumber)
        .limit(1)
        .get();

      // 3. Renvoyer le résultat
      if (snapshot.empty) {
        functions.logger.info(
          "Le numéro " +
            phoneNumber +
            " n'existe pas dans la collection users."
        );
        return {exists: false};
      }

      functions.logger.warn(
        "Le numéro " +
          phoneNumber +
          " existe déjà dans la collection users."
      );
      return {exists: true};
    } catch (err) {
      functions.logger.error(
        "Erreur lors de la vérification du numéro:",
        err
      );
      throw new functions.https.HttpsError(
        "internal",
        "Une erreur s'est produite lors de la vérification du numéro."
      );
    }
  }
);
