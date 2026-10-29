# R Ledger : plan du projet

## Objectif
Journal de trading qui importe les trades d'une base Notion vers Supabase, et affiche ce que Notion fait mal : statistiques, croisements de données, graphiques, galerie de captures. Développé en local, publié en ligne avec un mode démo en lecture seule.

## Source : Notion (lecture seule)
- Base : "NQ1! NY am v2", source de données "The range within the range"
- ID de la base : 1f5377d030ad4979af1ef526b1535a83
- ID de la source de données : 9ba90cc1-0197-4413-aa38-91dfe86c1cb8
- Intégration Notion "R-Ledger" : droit de lecture uniquement, accès donné à cette base seulement
- Le jeton est dans .env (NOTION_TOKEN) et dans les secrets de la fonction Supabase, jamais dans le code
- Environ 23 lignes depuis mai 2026

Colonnes :
- Instrument (titre) : NQ1!, ES1!, YM1!...
- BUY/SELL (sélection)
- Date et heure BE (date, heures saisies en heure belge ; stockée en UTC, affichée en heure de Bruxelles)
- Day (texte)
- NY hour (sélection) : NY-1, NY-2, NY-3, London, Outside Wo0
- HTF range TF (sélection) : H4, H1, 15min
- LTF retracement TF (sélection) : 15min, 5min, 1min
- FVG against present (case à cocher)
- SL placement (sélection) : Wick of entry candle, Body of entry candle
- TP (sélection) : Within LTF range, Above LTF range
- Result (sélection) : Full Win, Loss, Breakeven, Not taken - data
- RR closed (nombre)
- Achievable RR (texte libre, parfois non numérique, ex. "Full at 2, Runner at 3")
- BE (sélection) : No BE setup, No affect on result, Prevented loss, Missed win
- Emotions (sélection) : Not taken, 1 - calme, 2 - légère tension, 3 - charge émotionnelle
- Trade narrative (texte)

Contenu des pages : captures TradingView (images) et parfois une review écrite, dans le corps de chaque page.

## Règles de données
- Le résultat se déduit de RR closed pour toutes les lignes : positif = gain, négatif = perte, 0 = BE
- Les "Not taken - data" comptent comme des trades dans toutes les stats ; un champ "pris / non pris" permet de filtrer
- Tout est en R, aucun montant en dollars
- Certaines dates n'ont pas d'heure : elles comptent partout sauf dans les stats par heure exacte (la colonne NY hour reste utilisable)
- Les liens d'images Notion expirent rapidement : à l'import, chaque capture est téléchargée et stockée dans Supabase Storage

## Architecture
- Front : React + TypeScript + Vite
- Supabase : base de données (trades), Storage (captures), Auth (e-mail et mot de passe ; inscriptions fermées ; un compte propriétaire et un compte démo)
- Sécurité : Row Level Security activée, lecture seule pour les comptes connectés ; écriture réservée à la fonction de synchronisation
- La synchronisation Notion ne s'exécute jamais dans le navigateur (le jeton Notion y serait visible) : elle passe par une fonction côté serveur (Supabase Edge Function), déclenchée par un bouton "Synchroniser", et réservée au propriétaire (secret OWNER_USER_ID)
- La synchronisation est relançable : elle ajoute les nouveaux trades et met à jour ceux modifiés, en se basant sur l'ID de page Notion

## Écrans
1. Vue d'ensemble : total, indicateurs, constats automatiques, courbe des R cumulés
2. Analyses : croisements sur chaque colonne, jour × session, répartition des R, calendrier, RR atteignable, effet du BE, setups, Monte-Carlo
3. Galerie des captures, regroupées par jour
4. Fiche trade : propriétés, captures, review ; comparaison de deux trades ; recherche Ctrl+K

## Design
Bleu marine, bleu électrique, noir, avec un accent mauve électrique (#a855f7) utilisé en duo avec le bleu
(dégradés de la courbe, halo de fond, logo, onglet actif, titres de section, zone mise en avant).
Gains en vert, pertes en rouge (le mauve ne sert jamais pour un gain ou une perte).
Page large (jusqu'à 1 880 px) : courbe des R en vedette à gauche, cartes Performance et Risque à droite.
Ligne directrice : interface dynamique (transitions fluides, éléments cliquables).

## Étapes
1. Préparation : intégration Notion, projet Supabase "r-ledger", projet Vite. FAIT
2. Tables Supabase, compte utilisateur, import Notion (trades et captures). FAIT
3. Écran de connexion (avec bouton "Synchroniser"). FAIT
4. Première vue d'ensemble : chiffres clés + courbe des R cumulés. FAIT
5. Feuille de route ci-dessous, phase par phase. FAIT

## Feuille de route
Objectif : une interface riche ET un code de qualité professionnelle. Phases menées dans l'ordre A → B → C → D → E.

### Phase A : fondations. FAIT
Commandes : `npm test` (tests), `npm run types` (régénère les types après une modification de la base).
1. Une adresse par écran (React Router) : /, /analyses, /galerie, /trade/:id
2. Filtre global sous forme de menu déroulant : période, instrument, session, BUY/SELL, pris / non pris ; gardé dans l'adresse de la page
3. Cache de données (TanStack Query), rafraîchi après une synchro
4. Tests automatiques des calculs (Vitest)
5. Types générés depuis la base Supabase

### Phase B : tableau de bord. FAIT
Indicateurs avancés (espérance, profit factor, gain/perte moyens, SQN, recovery factor, meilleur/pire trade, % BE) ;
comparaison avec la période précédente ; courbe des R enrichie (drawdown dessous, zoom, séries surlignées, clic → fiche) ;
stats glissantes sur les derniers trades ; animations.
Retouches ensuite : barre de zoom refaite (glisse d'un bout à l'autre, fenêtre déplaçable, double-clic, clavier) ;
page plus large avec la courbe en vedette ; accent mauve.

### Phase C : analyses poussées. FAIT
Écran Analyses (/analyses), en deux parties (C1, C2).
- C1 : croisements sur chaque colonne (clic sur une barre = filtre, clic sur une ligne = liste des trades) ;
  carte jour × session ou heure ; histogramme des R ; calendrier façon GitHub avec totaux par mois ;
  mention « peu fiable » sous 5 trades.
- C2 : RR closed contre Achievable RR ; effet du BE ; chercheur de setups avec classement ; Monte-Carlo.
- Le filtre global accepte aussi les autres colonnes (jour, HTF, LTF, FVG, SL, TP, émotions, BE),
  affichées en pastilles sous la barre du haut.
Règles de calcul :
- "Achievable RR" (texte libre) : on garde le plus grand nombre écrit ("RR4" = 4, "Full at 2, Runner at 3" = 3).
- R laissés sur la table = atteignable − encaissé (une perte avec un atteignable de 0 ne laisse rien).
- Effet du BE : perte évitée = 1 R sauvé ; gain manqué = son Achievable RR, sinon le gain moyen (estimation).
- Le jour de la semaine est calculé depuis la date (heure de Bruxelles), pas depuis la colonne texte "Day".

### Phase D : galerie et fiches trade. FAIT
- Galerie (/galerie) : une carte par jour (aperçu + nombre de captures + total R du jour), tri, gains / pertes / BE ;
  un clic ouvre toutes les captures du jour en plein écran.
- Plein écran : flèches ← →, Échap, zoom au clic ou Espace, bande de miniatures.
- Fiche trade : précédent / suivant (boutons et flèches du clavier), place dans la courbe, captures, textes.
- Comparer (/comparer/:a/:b) : deux trades côte à côte, différences surlignées en mauve.
- Recherche rapide Ctrl+K : écrans, actions (synchro, retirer les filtres) et trades.
- Les captures viennent du Storage privé via des liens signés valables 1 h, renouvelés automatiquement.

### Phase E : finitions. FAIT
- E1 : découpage du code par écran et par bibliothèque (plus aucun fichier au-dessus de 500 kB) ;
  constats automatiques sur la vue d'ensemble (cliquables : filtre ou section des Analyses) ;
  export CSV (séparateur « ; », virgule décimale, pour Excel) et PDF (impression du navigateur, mise en page dédiée) ;
  téléphone (barre du haut compacte, rien ne dépasse de l'écran) ; lien « Aller au contenu » pour le clavier.
- E2 : tests de bout en bout Playwright (`npm run test:e2e`) sur la version construite, avec une fausse
  adresse Supabase et des données fictives (e2e/fixtures.ts) : jamais de mot de passe ni de vraie base ;
  vérifie aussi qu'aucun montant ($, €) n'apparaît. README de présentation avec captures (docs/screenshots) et GIF (docs/demo.gif).

### Mise en ligne. FAIT
Site : https://r-ledger-seven.vercel.app (Vercel, déployé automatiquement à chaque envoi sur la branche main).
- FAIT : synchronisation réservée au propriétaire (secret OWNER_USER_ID dans la fonction sync-notion).
- FAIT : compte démo en lecture seule + bouton « Voir la démo » (VITE_DEMO_EMAIL / VITE_DEMO_PASSWORD dans .env et sur Vercel).
- FAIT : vérification des secrets (aucun dans le code ni l'historique) ; e-mail des commits remplacé par l'adresse anonyme GitHub.
- FAIT : dépôt public https://github.com/Nico21350/r-ledger
- FAIT : visite automatique anti-pause de Supabase (GitHub Actions tous les 3 jours, fonction SQL ping(),
  secrets GitHub SUPABASE_URL et SUPABASE_PUBLISHABLE_KEY).
- FAIT : hébergement Vercel (variables VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_DEMO_EMAIL, VITE_DEMO_PASSWORD),
  Site URL et Redirect URLs réglés dans Supabase Auth.
