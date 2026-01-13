// Script de test pour l'API Boutique (Node.js 18+)
// Utilise le 'fetch' natif de Node.js.

// URL de l'API (À modifier une fois déployé si différent)
// En Prod: 'https://us-central1-africaphone-vente.cloudfunctions.net/api_record_sale'
// En Emulateur: 'http://127.0.0.1:5001/africaphone-vente/us-central1/api_record_sale'
const API_URL = 'https://us-central1-africaphone-vente.cloudfunctions.net/api_record_sale';

// La clé API définie dans le code Cloud Function (functions/src/index.ts)
const API_KEY = 'sk_boutique_test_123456';

async function testSale(code, amount) {
  console.log(`📡 Simulating SALE request for code: ${code} (${amount} FCFA)...`);
  console.log(`🎯 Target URL: ${API_URL}`);

  try {
    const payload = {
      code: code,
      amount: amount,
      ref: 'caisse_test_01', // Identifiant de la caisse ou du vendeur
      transactionId: `test_${Date.now()}` // ID unique pour éviter les doublons
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(payload)
    });

    // Lecture de la réponse
    const responseText = await response.text();

    // Tentative de parsing JSON pour affichage propre
    try {
      const data = JSON.parse(responseText);
      console.log(`\n📊 HTTP Status: ${response.status}`);
      console.log('📦 Server Response:', JSON.stringify(data, null, 2));

      if (response.ok) {
        console.log('\n✅ SUCCÈS : La vente a été acceptée par le serveur.');
      } else {
        console.log('\n❌ ÉCHEC : Le serveur a refusé la requête.');
      }
    } catch (e) {
      console.log(`\n📊 HTTP Status: ${response.status}`);
      console.log('📦 Raw Response:', responseText);
    }

  } catch (err) {
    console.error('\n🔴 CRITICAL ERROR : Impossible de contacter le serveur.');
    console.error('Vérifiez votre connexion internet ou si l\'URL est correcte.');
    console.error('Détail:', err);
  }
}

// --- EXÉCUTION DU TEST ---
// Test avec un code qui (probablement) n'existe pas pour vérifier la 404,
// ou remplacez 'CODE_TEST' par un vrai code de votre base pour tester le succès (ex: 'NOEL2024').
console.log("--- DÉBUT DU TEST ---");
// Récupération des arguments ligne de commande (ex: node script.js MON_CODE 10000)
const args = process.argv.slice(2);
const code = args[0] || 'TEST_BOUTIQUE';
const amount = parseInt(args[1], 10) || 50000;

console.log(`--- DÉBUT DU TEST AVEC: ${code} / ${amount} FCFA ---`);
testSale(code, amount);
