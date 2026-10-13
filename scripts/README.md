# Garde-fou statique

```bash
npm run check          # src/ — code de sortie 1 si quelque chose est à corriger
npm run check:strict   # les avertissements comptent aussi
```

`scripts/check-code.js` analyse l'AST de `src/` (via `@babel/parser`, déjà là
avec Metro) et remonte sept familles d'erreurs qui, sinon, n'apparaissent qu'à
l'exécution — sur un écran, pas dans la console Metro :

1. `[libre]` identifiant non déclaré → `ReferenceError` au rendu
2. `[composant]` `<Composant />` ni importé ni défini → *Element type is invalid*
3. `[style]` `styles.x` absent du `StyleSheet` → style ignoré en silence
4. `[import]` import nommé absent du module cible → `undefined`
5. `[arite]` `createStyles()` appelé avec moins d'arguments que sa signature
6. `[contexte]` clé demandée à `useFinance()`/`useAuth()`… absente du `Provider`
7. `[props]` prop requise d'un composant local, jamais passée

À lancer après chaque refonte d'écran : un écran qui plante au rendu est
presque toujours l'une de ces sept lignes.

## Traductions

`scripts/add-auth-translations.js` ajoute un bloc de clés aux 66 dictionnaires
de `src/utils/LanguageManager.js`, sans toucher au reste du fichier (traduction
via Google Translate, MyMemory en secours).

```bash
node scripts/add-auth-translations.js --dry-run   # voir sans écrire
node scripts/add-auth-translations.js             # écrire
```

`scripts/generate-translations.js` régénère le fichier **entier** depuis la
liste `FRENCH_ENTRIES` : ne l'utilisez que si le dictionnaire doit être reconstruit
— il écrase les blocs ajoutés à la main.
