// others/admin-panel/assets/js/auth.js
import { auth } from '../../firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { $, $$, setButtonLoading, toast } from './ui.js';

const $login = $('#login');
const $loginForm = $('#login-form');
const $loginError = $('#login-error');
const $app = $('#app');

/**
 * Gère la soumission du formulaire de connexion.
 */
const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const submitBtn = $loginForm.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    const email = $('#email').value.trim();
    const pass = $('#password').value.trim();

    // Réinitialisation des erreurs
    $('#email-err').classList.add('hide');
    $('#password-err').classList.add('hide');
    $loginError.classList.add('hide');

    if (!email) {
        $('#email-err').textContent = 'Email requis.';
        $('#email-err').classList.remove('hide');
        setButtonLoading(submitBtn, false);
        return;
    }
    if (!pass) {
        $('#password-err').textContent = 'Mot de passe requis.';
        $('#password-err').classList.remove('hide');
        setButtonLoading(submitBtn, false);
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        toast('Bienvenue', 'Connexion réussie', 'success');
    } catch (err) {
        console.error(err);
        $loginError.textContent = 'Identifiants invalides.';
        $loginError.classList.remove('hide');
        toast('Erreur', 'Impossible de se connecter', 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
};

/**
 * Gère la déconnexion de l'utilisateur.
 */
const handleLogout = async () => {
    await signOut(auth);
    toast('Déconnecté', '', 'success');
    location.hash = '#/products'; // Redirige après déconnexion
};

/**
 * Initialise le module d'authentification.
 * @param {Function} onLoginSuccess - La fonction à appeler une fois que l'utilisateur est connecté.
 */
export function initAuth(onLoginSuccess) {
    // Écouteur sur le formulaire de connexion
    $loginForm?.addEventListener('submit', handleLoginSubmit);

    // Écouteurs sur les boutons de déconnexion
    $('#logout')?.addEventListener('click', handleLogout);
    $('#drawer-logout')?.addEventListener('click', async () => {
        await handleLogout();
        const drawer = $('#drawer');
        if (drawer) drawer.classList.remove('open');
    });

    // Observe les changements d'état de l'authentification
    onAuthStateChanged(auth, (user) => {
        const isLoggedIn = !!user;
        
        $login.classList.toggle('hide', isLoggedIn);
        $app.classList.toggle('hide', !isLoggedIn);
        $app.setAttribute('aria-hidden', String(!isLoggedIn));

        if (isLoggedIn) {
            // Si l'utilisateur est connecté, on exécute le callback
            // pour initialiser le reste de l'application.
            onLoginSuccess();
        }
    });
}