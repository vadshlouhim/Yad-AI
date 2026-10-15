# Newsletter : révision IA, articles entiers et légendes

## Fonctionnement

- Le bouton coloré « Modifier ce feuillet avec l’IA » remplace les anciens boutons
  Modifier/Imprimer du bas. Le téléchargement PDF et les étapes de personnalisation restent accessibles.
- Les consignes produisent des préférences d'ordre, de colonnes, de police et de
  placement des photos. Le moteur mesure ces préférences et les adapte si nécessaire.
- Aucun texte n'est réécrit par défaut. Les rubriques explicitement cochées sont
  les seules dont le serveur et le navigateur acceptent une modification IA.
- La proposition est composée avant toute application. Échec réseau, texte protégé,
  réponse invalide ou contenu trop grand : la version existante est conservée.
- La version précédente est enregistrée avec le brouillon et restaurable après
  rechargement. Aucune migration, aucun changement des autorisations de communauté.
- Chaque article reste dans un bloc unique sur une seule page. Le moteur peut
  réordonner les rubriques et déplacer les photos, mais jamais créer une « suite »,
  tronquer un texte, masquer une image ou dépasser deux pages.
- Légendes facultatives de 180 caractères maximum par photo ou groupe de photos
  consécutives. Une légende commune apparaît une seule fois sous le groupe ; les
  légendes individuelles éventuelles restent conservées.
- Chaque page est isolée pendant la capture PDF pour éviter le rognage des en-têtes
  de pages initialement hors écran dans Chromium.

## Vérifications reproductibles

```powershell
npx tsx scripts/test-newsletter.ts
node scripts/test-newsletter-revision.mjs
$env:CHROME_PATH='C:\Users\chlom\AppData\Local\ms-playwright\chromium_headless_shell-1248\chrome-headless-shell-win64\chrome-headless-shell.exe'
node scripts/test-newsletter-browser.mjs
node scripts/test-newsletter-revision-browser.mjs
```

25 compositions dans Chromium : 0–8 photos et affiches, formats mixtes, articles
entiers, texte exact, légendes exactes, groupe non répété, proportions, quatre
images par ligne, absence de chevauchement, deux pages maximum, refus d'une étude
du vendredi à la place du samedi et refus explicite du contenu impossible.

Parcours UI à 390 et 1440 px : action IA explicite, retour après rechargement,
protection des textes, réécriture autorisée, erreur réseau, proposition trop longue,
saisie des légendes et sauvegarde. Tests API avec modèles et base simulés :
authentification, abonnement, contexte de communauté, validation, aller-retour des
brouillons et conflit de révision. Aucune donnée de production modifiée, aucun
appel payant au modèle effectué par ces tests.

Trois PDF fictifs exportés via html-to-image/jsPDF, deux pages chacun, puis rendus
avec PyMuPDF pour inspection visuelle dans `tmp/pdfs/newsletter-revision/`.
Ces fichiers de test ne sont pas des feuillets éditoriaux validés.

ESLint ciblé passe. Le contrôle TypeScript global signale les erreurs préexistantes
hors newsletter : donation-campaign/config, email/classify, donation-campaign/visuals,
assistant-client, whatsapp-client, email/ai-settings. Aucun diagnostic newsletter.

Le parcours réel connecté et la qualité des réponses du modèle restent à vérifier
avec un compte autorisé. Les préférences de mise en page sont des préférences, pas
des contraintes qui primeraient sur la lisibilité et la conservation du contenu.
