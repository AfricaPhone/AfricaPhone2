/**
 * Script de test pour vérifier les redirections des liens partenaires.
 * Teste les liens Web (/p/) et WhatsApp (/w/).
 */

const fetch = require('node-fetch'); // Nécessite 'node-fetch' si < v18, sinon natif

async function checkRedirect(url, label) {
    console.log(`\n🔍 Test ${label}: ${url}`);
    try {
        const response = await fetch(url, { redirect: 'manual' });

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            console.log(`✅ Redirection détectée (${response.status})`);
            console.log(`   Vers: ${location}`);

            // Analyse basique de la destination
            if (label.includes('WhatsApp')) {
                if (location.includes('wa.me') || location.includes('whatsapp.com')) {
                    console.log('   ℹ️ Cible WhatsApp valide.');
                } else {
                    console.log('   ⚠️ Cible WhatsApp INATTENDUE.');
                }
            } else if (label.includes('Web')) {
                if (location.includes('africaphone') && location.includes('code=')) {
                    console.log('   ℹ️ Cible Web valide (paramètre code présent).');
                } else {
                    console.log('   ⚠️ Cible Web suspecte.');
                }
            }
            return true;
        } else if (response.status === 200) {
            console.log('⚠️ Réponse 200 OK (Pas de redirection directe, peut-être HTML meta refresh ?)');
            // Check body for meta refresh if needed (rare for API functions)
            return false;
        } else {
            console.log(`❌ Erreur: Statut ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Erreur technique: ${error.message}`);
        return false;
    }
}

async function runTests() {
    const code = 'ZIDANE1';

    // URLs à tester (On teste le domaine hosting direct pour éviter les soucis DNS si config récente)
    const baseUrl = 'https://africaphone-org.web.app';
    // Note: Si le site par défaut est utilisé, c'est peut-être africaphone-vente.web.app ?
    // D'après firebase.json: site "africaphone-org"

    console.log('--- Démarrage des tests de liens ---');

    await checkRedirect(`${baseUrl}/p/${code}`, 'Lien Web (Track)');
    await checkRedirect(`${baseUrl}/w/${code}`, 'Lien WhatsApp');

    // Test aussi sur le domaine de production probable
    const prodUrl = 'https://africaphone.org';
    await checkRedirect(`${prodUrl}/p/${code}`, 'Prod Web');
    await checkRedirect(`${prodUrl}/w/${code}`, 'Prod WhatsApp');

    // Test DIRECT Cloud Functions (Bypass Hosting)
    const cfBase = 'https://us-central1-africaphone-vente.cloudfunctions.net';

    // Note: trackPromoLink attend le code en query param ?code=... ou dans le path ?
    // D'après le rewrite hosting: source: "/p/**", function: "trackPromoLink"
    // Souvent cela passe le path comme paramètres ou req.path.
    // Essayons avec query param qui est le standard pour les HTTP functions
    await checkRedirect(`${cfBase}/trackPromoLink?code=${code}`, 'Direct CF Web (Query)');

    // Testing redirectWhatsApp
    // Rewrite: source: "/w/**", function: "redirectWhatsApp"
    await checkRedirect(`${cfBase}/redirectWhatsApp?code=${code}`, 'Direct CF WhatsApp (Query)');
}

runTests();
