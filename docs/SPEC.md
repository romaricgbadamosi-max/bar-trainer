# Bar Trainer — cahier des charges

Application web installable (PC **et iPhone**, voir §1.1) pour mémoriser les ~167 recettes de cocktails d'un bar, avec l'objectif d'aller le plus vite possible au service. Le fichier `recipes.json` (fourni à côté de ce document) contient toutes les recettes déjà structurées : **ne pas les retaper, ne rien inventer**. L'app doit fonctionner entièrement hors ligne.

---

## 1. Stack technique

- **Vite + React + TypeScript**, sans backend.
- Données de progression dans **IndexedDB** (via `idb` ou `dexie`), avec boutons **Exporter / Importer la progression** (fichier JSON) pour la sauvegarde.
- **PWA installable** (manifest + service worker, `vite-plugin-pwa`) : installable sur PC depuis Chrome/Edge, et sur iPhone via « Ajouter à l'écran d'accueil », sans App Store.
- Lancement : `npm install && npm run dev` ; build statique : `npm run build`.
- L'interface doit être **utilisable entièrement au clavier** sur PC (objectif vitesse) et **entièrement au doigt** sur iPhone.

### 1.1 iPhone (PWA, sans App Store)
L'app doit s'installer sur iPhone via Safari → Partager → « Sur l'écran d'accueil », et s'ouvrir ensuite en plein écran comme une vraie app, hors ligne.
- **Hébergement HTTPS obligatoire** (le service worker ne marche pas sur une IP locale). Déployer sur **GitHub Pages** avec un workflow GitHub Actions qui build et publie à chaque push sur `main` (régler `base` dans `vite.config.ts` sur le nom du dépôt). Écrire dans le README les étapes pas à pas pour l'utilisateur : créer le dépôt, pousser, activer Pages, ouvrir l'URL dans Safari, ajouter à l'écran d'accueil.
- Balises iOS : `apple-touch-icon` (180×180), `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `viewport-fit=cover` + marges `env(safe-area-inset-*)`. Générer une icône simple (verre à cocktail).
- Appeler `navigator.storage.persist()` au démarrage. Afficher dans Réglages un rappel discret « Dernière sauvegarde : … » et inciter à exporter la progression régulièrement (iOS peut vider le stockage d'un site).
- **La progression est propre à chaque appareil** (pas de synchronisation) : l'export/import JSON sert aussi à passer la progression du PC à l'iPhone et inversement.
- Adaptations tactiles :
  - Boutons de 44 px de haut minimum ; QCM du niveau 2 en grille de 5 gros boutons.
  - Niveau 1 saisie : l'autocomplétion affiche les 5 premiers résultats en gros boutons tapables au-dessus du clavier ; le verre se choisit dans la grille ; bouton « Valider » bien visible.
  - Niveau 3 : champ numérique (`inputmode="decimal"`).
  - Flashcard : taper la carte pour la retourner, puis trois boutons raté / hésitant / immédiat.
  - Les raccourcis clavier sont masqués sur écran tactile.
- Le chrono fonctionne de la même façon sur les deux appareils, mais **les stats de temps sont séparées par type d'appareil** (on est plus lent au doigt qu'au clavier), et sur tactile les constantes $a$ et $b$ ont leurs propres valeurs par défaut (×1,3).

## 2. Langue

- Interface en **français**.
- Noms de cocktails, d'ingrédients, de verres et notes : **tels quels, en allemand** (comme sur la carte du bar). Ne jamais les traduire.

## 3. Modèle de données (`recipes.json`)

```ts
type Recipe = {
  id: string;            // slug unique
  name: string;
  glass: string | null;  // codes du bar, à afficher tels quels (voir §3.2)
  favorite: boolean;     // cocktails les plus commandés → prioritaires
  alcoholFree: boolean;
  frozen: boolean;
  ingredients: Ingredient[];
  garnish: string | null; // Deko — affichée en correction, jamais interrogée
  notes: string | null;   // méthode / remarques de la carte — affichées, jamais interrogées
};

type Ingredient = {
  name: string;
  type: "dose" | "fill" | "presence";
  amount: number | null;    // dose (si type === "dose")
  amountMax: number | null; // si la carte donne une fourchette (ex. 3–4) : toute valeur dans [amount, amountMax] est juste
  unit: string | null;      // "cl" par défaut ; sinon BL, dash, Stück, Scheibe, Stangen, Prise, Fl, Schaufeln
  tag: string | null;       // étiquette de méthode, voir §3.3
};
```

### 3.1 Types d'ingrédients
- `dose` : quantité précise → interrogée aux niveaux 2 et 3.
- `fill` : **« auffüllen »** = on complète le verre avec (ex. Ananassaft, Orangensaft, Sprite). Pas de dose. Affiché « auffüllen », jamais interrogé sur la quantité.
- `presence` : ingrédient sans dose qui n'est pas un remplissage (Minze, Erdbeerpüree, Zimt…). Fait partie de la liste d'ingrédients (niveau 1), affiché « — » au niveau 2.

### 3.2 Verres
Codes utilisés : `Boston`, `M`, `V`, `Tumbler`, `kleiner Tumbler`, `Coupette`, `Longdrink`, `Weinglas`, `Shot`, `Margarita-Glas`, `St. Pauli Glas`. L'utilisateur connaît leur signification : **les afficher tels quels, sans explication**. Le verre fait partie de la réponse au niveau 1. Un cocktail a `glass: null` (Chambord Cosmo, verre absent de la carte) : dans ce cas, ne pas interroger le verre.

### 3.3 Étiquettes de méthode (`tag`)
Valeurs : `oben drauf`, `floaten`, `schichten`, `unten`, `mittig`, `oben`, `muddeln`. Elles sont attachées à l'ingrédient concerné (ex. Tequila Sunrise : Grenadine `oben drauf`). Voir §5.2 pour leur interrogation.

### 3.4 Normalisations déjà appliquées (confirmées par l'utilisateur)
- Smirnoff = **Vodka** (vodka de base). Tanqueray = **Gin** (gin de base). Bombay, Plymouth Gin, Tanqueray Alkoholfrei restent distincts.
- **Havana Club ≠ weißer Rum** (deux produits distincts).
- Läuterzucker = **Zuckersirup**.
- Zitrone = **Zitronensaft**.
- **Lime Juice ≠ Limettensaft** (deux produits distincts). Pulco Limette est un troisième produit.
- Il n'y a qu'un seul rhum 73 % : **Old Pascas 73%** (« 73% Rum », « Rum 73% », « Pascas 73% », « Old Pascas » → Old Pascas 73%).
- Fruit sans précision = **jus** ; un sirop est toujours écrit « sirup » : « Maracuja » → Maracujasaft, « Mango » → Mangosaft.
- Melone et Melone Grün sont deux produits différents.
- Variantes d'écriture unifiées (Kahlua/Kaluha → Kahlúa, O-Saft → Orangensaft, TripleSec → Triple Sec, Rum Dark/br. Rum → brauner Rum…).

## 4. Les niveaux d'apprentissage

Chaque cocktail a une progression **séparée pour chaque niveau**.

### Niveau 1 — Ingrédients + verre
On affiche le nom du cocktail. Deux modes au choix (réglage global, modifiable à tout moment) :

**1a. Mode saisie** (par défaut)
- Champ texte avec **autocomplétion** sur la liste des ingrédients connus (dérivée de `recipes.json`). Entrée = ajouter le premier résultat sous forme de puce ; Retour arrière sur champ vide = retirer la dernière puce.
- Grille des verres (raccourcis : Tab pour y aller, flèches + Entrée, ou chiffres).
- Ctrl+Entrée = valider.
- Correction : comparaison **d'ensemble** (l'ordre ne compte pas) sur tous les ingrédients (`dose`, `fill`, `presence`) + le verre. Afficher : justes (vert), manquants (rouge), en trop (barrés).
- L'autocomplétion doit tolérer accents et casse (« creme » trouve « Crème de Cassis »).

**1b. Mode flashcard**
- Nom affiché → l'utilisateur réfléchit → Espace = retourner la carte (ingrédients + verre) → auto-évaluation : **1 = raté**, **2 = juste mais hésitant**, **3 = immédiat**.

### Niveau 2 — Doses en QCM
- Affichage : nom + verre + liste des ingrédients (dans l'ordre de la carte).
- Le curseur passe d'un ingrédient `dose` au suivant. Pour chacun, **5 propositions** ; touches **1 à 5**.
- Ingrédients `fill` : affichés « auffüllen », pré-remplis, ignorés. `presence` : affichés « — », ignorés.
- **Génération des 4 leurres** : piocher en priorité parmi les doses de ce même ingrédient ailleurs dans `recipes.json`, compléter avec la bonne réponse ±0,5 / ±1 / ±2 (valeurs > 0 uniquement), sans doublon. Afficher les 5 options **triées par ordre croissant**. Pour une fourchette (`amountMax`), l'option juste s'affiche « 3–4 ». Afficher l'unité si elle n'est pas `cl` (ex. « 6 BL »).

### Niveau 3 — Doses en saisie libre
Même écran que le niveau 2, mais l'utilisateur tape le chiffre (virgule ou point acceptés) puis Entrée. Pour une fourchette, toute valeur dans l'intervalle est juste.

### Étiquettes de méthode aux niveaux 2 et 3
Sur chaque ligne d'ingrédient, un petit sélecteur d'étiquette optionnel (par défaut : aucune ; raccourci : `T` fait défiler les étiquettes sur la ligne active). Corrigé avec la dose : si la recette a une étiquette, elle doit être choisie ; si l'utilisateur en met une qui n'existe pas, c'est faux. Ne pas afficher à l'avance quels ingrédients ont une étiquette.

### Méthode et déco
Jamais interrogées. Affichées sur l'écran de correction (et sur la fiche du cocktail) : `garnish`, `notes`, étiquettes. Ajouter sur chaque fiche un champ **« Mes notes »** éditable, sauvegardé localement.

## 5. Répétition espacée et chrono

### 5.1 Système de boîtes (Leitner)
Pour chaque couple (cocktail, niveau) : une boîte de 0 à 5.
- Boîte 0 = jamais vu. Intervalles avant la prochaine révision : boîte 1 → même session (remis plus loin dans la file), 2 → 1 jour, 3 → 3 jours, 4 → 7 jours, 5 → 16 jours (« maîtrisé », revient tout de même à 16 jours).
- Résultat de chaque réponse, en 3 notes :
  - **Raté** (au moins une erreur) → retour en boîte 1.
  - **Juste mais lent** → reste dans sa boîte (ou monte en boîte 1 depuis 0), révisé à nouveau selon l'intervalle de la boîte.
  - **Juste et rapide** → boîte +1.
- En mode flashcard, les notes 1/2/3 correspondent directement à raté / lent / rapide.

### 5.2 Chrono : temps cible proportionnel au nombre d'éléments
Le temps est toujours mesuré et enregistré (de l'affichage à la validation). Pour ne pas pénaliser les cocktails à beaucoup d'ingrédients, le seuil « rapide » dépend du nombre d'éléments à donner :

$$T_{\text{cible}} = a + b \cdot n$$

| Niveau | $n$ | $a$ | $b$ |
|---|---|---|---|
| 1 (saisie) | nombre d'ingrédients + 1 (verre) | 3 s | 2,5 s |
| 2 (QCM) | nombre d'ingrédients `dose` | 2 s | 1,5 s |
| 3 (saisie libre) | nombre d'ingrédients `dose` | 2 s | 2,5 s |

Juste et temps ≤ $T_{\text{cible}}$ → « rapide » ; juste et temps > $T_{\text{cible}}$ → « lent ». Les constantes $a$ et $b$ sont modifiables dans les réglages.

### 5.3 Déblocage des niveaux
- Le niveau 2 d'un cocktail se débloque quand son niveau 1 atteint la **boîte 3**.
- Le niveau 3 se débloque quand son niveau 2 atteint la **boîte 3**.
- Réglage « Débloquer tous les niveaux » pour sauter directement aux doses (pour les cocktails déjà connus).

### 5.4 Construction de la session du jour
1. Les cartes dues (date de révision dépassée), en commençant par les plus en retard.
2. Puis des **nouveaux cocktails** : X par jour (réglage, défaut 8), **favoris d'abord**, puis ordre alphabétique.
3. Taille de session réglable (défaut 20 cartes). Mélanger les niveaux dans la session.

## 6. Écrans

1. **Accueil** : bouton « Session du jour » (avec le nombre de cartes dues), « Entraînement libre », « Catalogue », « Stats », « Réglages ».
2. **Session** : bandeau en haut (progression `12 / 20`, chrono en cours), puis l'écran du niveau correspondant (§4). Après validation → écran de correction.
3. **Correction** : chaque ingrédient avec ✔ / ✘, la bonne dose à côté de la réponse barrée, étiquettes, « auffüllen », verre, temps mis vs temps cible, puis encadré **Méthode** (notes + déco + mes notes). Boutons : « Suivant » (Entrée) et « Je me suis trompé de touche » (annule la note, ne compte pas).
4. **Entraînement libre** : filtres (favoris, lettre, verre, ingrédient contenu, sans alcool, « mes points faibles » = taux d'erreur le plus élevé), choix du niveau. Ne modifie pas les boîtes (option à cocher pour que si).
5. **Catalogue** : liste recherchable de toutes les recettes, fiche détaillée en lecture (format carte du bar), boîte actuelle par niveau.
6. **Stats** : nombre de cocktails maîtrisés par niveau, temps moyen par niveau (et son évolution sur 30 jours), série de jours consécutifs, top 10 des cocktails les plus ratés.
7. **Réglages** : mode niveau 1 (saisie / flashcard), constantes du chrono, nouveaux cocktails par jour, taille de session, déblocage des niveaux, export/import de la progression, réinitialisation.

Maquettes validées avec l'utilisateur :
- **Niveau 1** : nom du cocktail en grand, puces des ingrédients déjà ajoutés, champ avec liste d'autocomplétion juste en dessous, grille de verres en 4 colonnes, rappel des raccourcis clavier en petit.
- **Niveau 2** : nom + « Tumbler · 3 ingrédients », ingrédient actif surligné, 5 boutons de dose en ligne avec le chiffre du raccourci au-dessus.
- **Correction** : badge de score (ex. 2/3), lignes ✔/✘, étiquette en pastille (« oben drauf »), encadré méthode avec bordure à gauche.

Style : sobre, fond clair et mode sombre, gros caractères pour le nom du cocktail, retours couleur (vert = juste, rouge = faux, orange = lent).

## 7. Robustesse
- Si `recipes.json` est modifié (recette ajoutée, changée ou supprimée), conserver la progression des cocktails dont l'`id` n'a pas changé ; une recette dont les ingrédients ont changé repart en boîte 1 pour les niveaux 2 et 3.
- Comparaison des noms d'ingrédients insensible à la casse et aux accents.
- Tests unitaires (Vitest) pour : génération des leurres, correction des niveaux 1/2/3 (y compris fourchettes et étiquettes), calcul des boîtes et du temps cible, construction de la session.

## 8. Hors périmètre (V2 éventuelle)
- Mode « familles » : regrouper les cocktails par modèle commun (sours 6/2/3,5 ; trio de rhums 3/3/3 ; base « Zitronensaft + Ananas- & Orangensaft ») et apprendre les écarts au modèle.
- Mode « commande » : plusieurs cocktails d'affilée chronométrés, comme une vraie commande.
- Éditeur de recettes dans l'app.

## 9. Points à vérifier dans les données
Ces cas sont transcrits tels quels depuis la carte ; l'utilisateur pourra corriger `recipes.json` :
- « Mandel », « Vanille », « Kokos » ont été interprétés comme Mandelsirup, Vanillesirup, Kokossirup.
- « Watermelon » (Krebs, Sex on the Beach) : même produit que « Melone » ou un autre ? Gardé distinct pour l'instant.
- « Martini Rosso » et « Vermouth Rosso », « Cranberrysaft » et « Cranberrynektar » gardés distincts.
- Grabstein et St. Pauli Killer : le rhum est noté comme une seule ligne (5 × 2 cl et 6 × 2 cl de différents rhums).
