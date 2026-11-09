# Bar Trainer

Appli pour apprendre par cœur les recettes de cocktails du bar (167 recettes, en allemand comme sur la carte). Elle tourne dans le navigateur, s'installe sur iPhone et sur PC, et marche hors ligne.

## Installer sur iPhone

1. Ouvre **https://romaricgbadamosi-max.github.io/bar-trainer/** dans **Safari**.
2. Bouton Partager → **Sur l'écran d'accueil**.
3. Ouvre l'appli depuis l'icône : plein écran, hors ligne.

Sur PC : ouvre la même adresse dans Chrome ou Edge, puis l'icône « Installer » dans la barre d'adresse.

## Mise en ligne (une seule fois)

Sur github.com : dépôt **bar-trainer** → **Settings** → **Pages** → Source : **GitHub Actions**.
Ensuite, chaque modification poussée sur `main` est testée puis mise en ligne automatiquement (onglet Actions). L'appli installée se met à jour toute seule à la réouverture.

## Corriger une recette

Les recettes sont dans `src/data/recipes.json` (généré depuis `docs/recettes-source.txt`). La progression des cocktails non modifiés est conservée ; un cocktail dont les ingrédients changent repart en boîte 1 aux niveaux 2 et 3.

## Ta progression

Elle est enregistrée **sur l'appareil** (pas de compte, pas de synchronisation). Réglages → **Exporter** pour la sauvegarder ou la passer sur un autre appareil (puis **Importer** là-bas).

## Développement

```bash
npm install
npm run dev     # http://localhost:5173/bar-trainer/
npm test
npm run build
```

Cahier des charges complet : `docs/SPEC.md`.
