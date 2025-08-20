// js/auth.js
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { auth } from './firebase.js';
import { setButtonLoading, toast } from './ui.js';

const $login = document.querySelector('#login');
const $loginForm = document.querySelector('#login-form');
const $loginError = document.querySelector('#login-error');
const $app = document.querySelector('#app');

export function initAuth(onLogin, onLogout) {
  $loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = $loginForm.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    const email = document.querySelector('#email').value.trim();
    const pass = document.querySelector('#password').value.trim();
    document.querySelector('#email-err').classList.add('hide');
    document.querySelector('#password-err').classList.add('hide');
    $loginError.classList.add('hide');

    if (!email) {
      document.querySelector('#email-err').textContent = 'Email requis.';
      document.querySelector('#email-err').classList.remove('hide');
      setButtonLoading(submitBtn, false);
      return;
    }
    if (!pass) {
      document.querySelector('#password-err').textContent = 'Mot de passe requis.';
      document.querySelector('#password-err').classList.remove('hide');
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
  });

  onAuthStateChanged(auth, (user) => {
    const logged = !!user;
    $login.classList.toggle('hide', logged);
    $app.classList.toggle('hide', !logged);
    $app.setAttribute('aria-hidden', String(!logged));
    if (logged) {
      onLogin();
    } else {
      onLogout();
    }
  });

  document.querySelector('#logout').addEventListener('click', handleSignOut);
  document.querySelector('#drawer-logout').addEventListener('click', handleSignOut);
}

async function handleSignOut() {
  await signOut(auth);
  toast('Déconnecté', '', 'success');
  location.hash = '#/products';
}
