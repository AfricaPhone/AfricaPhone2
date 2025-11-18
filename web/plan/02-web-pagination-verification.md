# 02 – Vérification pagination Firestore (site web)

## Objectif
S’assurer que la pagination du catalogue (`ProductGridSection`) remonte toutes les pages depuis Firestore et que le bouton « Afficher plus » reste visible tant que des documents existent.

## Étapes
1. Lancer le serveur local (`npm run dev`) dans `web/`.
2. Depuis un navigateur, ouvrir le catalogue (`http://localhost:3000/`) puis exécuter le snippet suivant dans la console :
   ```js
   (async () => {
     const seen = new Set();
     let loadMore = document.querySelector('button:contains("Afficher plus")');
     while (loadMore) {
       document.querySelectorAll('[data-product-card]').forEach(card => seen.add(card.getAttribute('data-product-id')));
       loadMore.click();
       await new Promise(r => setTimeout(r, 1200));
       loadMore = [...document.querySelectorAll('button')].find(btn => btn.textContent.includes('Afficher plus'));
     }
     console.log(`Produits distincts chargés : ${seen.size}`);
   })();
   ```
3. Comparer le nombre obtenu avec le total `products` dans Firestore (console > onglet `Indexes` > compteur).
4. Si un écart est détecté :
   - Vérifier que `products` contient toutes les marques (filtre `brand`).
   - Contrôler les règles Firestore (`firestore.rules`) pour s’assurer qu’elles n’empêchent pas la lecture.
   - Ajouter un test automatisé Playwright (`tests/pagination.spec.ts`) qui valide la présence du bouton « Afficher plus » tant qu’il existe des documents (mock Firestore via Emulator si besoin).
5. Documenter les résultats dans `reports/pagination-check-${DATE}.md` (totaux, éventuels correctifs apportés).*** End Patch
