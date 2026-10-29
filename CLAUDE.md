# R Ledger

Journal de trading personnel.

## Le projet

- **Source des trades** : une base Notion, utilisée **en lecture seule** (on ne modifie jamais rien dans Notion).
- **Stockage** : les trades sont importés de Notion vers **Supabase**.
- **Statistiques et graphiques** : exprimés **uniquement en R** (multiples du risque initial), **jamais en dollars** ni dans une autre devise. Aucun montant monétaire ne doit apparaître dans l'interface.

## Stack technique

- React + TypeScript, avec Vite
- Lancer en local : `npm run dev`
- Vérifications : `npx tsc -b`, `npm run lint`, `npm test`, `npm run test:e2e`

## Design

- Thème : bleu marine, bleu électrique et noir, avec un accent mauve électrique.
- Gains (R positif) en **vert**, pertes (R négatif) en **rouge**.

## Règles de travail

1. **Explique chaque modification simplement**, sans jargon (ou en expliquant le jargon).
2. **Propose un plan avant toute modification importante**, et attends l'accord avant de l'appliquer.
3. **Ne mets jamais de clé secrète directement dans le code.** Les clés vont dans le fichier `.env`, qui est exclu de Git.
4. **Ne publie jamais rien en ligne** (pas de déploiement, pas de `git push`, pas d'envoi vers un service externe) sans demande explicite.
5. **Lis `PLAN.md` au début de chaque session**, et mets-le à jour quand une étape est terminée.
6. Des consignes personnelles peuvent compléter ce fichier dans `CLAUDE.local.md` (fichier local, exclu de Git).
