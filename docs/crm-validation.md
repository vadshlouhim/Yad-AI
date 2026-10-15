# CRM intelligent — validation de la refonte

## Changements

Tableau éditable de huit colonnes, pagination de 50 après recherche/filtres/tri,
navigation mobile, outils secondaires repliés. Les groupes sont dédoublonnés sans
fusionner les contacts. Le nom complet historique n'est jamais découpé.

Les PATCH n'envoient que les champs modifiés. Les sauvegardes d'un contact sont
sérialisées ; une erreur conserve la saisie et bloque sa file jusqu'à « Réessayer ».
Les dates utilisent les règles Hebcal existantes, avec aller-retour après coucher
du soleil. Aucune migration ni modification du modèle de données.

## Tests reproductibles

```powershell
node scripts/test-crm.mjs
node scripts/test-crm-api.mjs
$env:CHROME_PATH = 'C:\Users\chlom\AppData\Local\ms-playwright\chromium_headless_shell-1248\chrome-headless-shell-win64\chrome-headless-shell.exe'
node scripts/test-crm-browser.mjs
```

- Logique : propriétés absentes, effacement explicite, noms personnalisés et
  historiques, consentements, dates invalides, coucher du soleil, Adar I/II,
  changement d'année, recherche accentuée, file séquentielle et reprise.
- API réelle avec adaptateur Supabase en mémoire : authentification, restriction
  par communauté sur lecture/modification/suppression, conservation des champs,
  erreurs de validation et de suppression. Aucune écriture dans la base réelle.
- Chromium, 360/390/430/1440 px, CSS réel : pagination, recherche, filtres, édition,
  Échap et focus, sauvegarde partielle, réseau coupé/reprise, groupes, dates,
  résultats IA périmés, ajout/fiche complète/suppression, chargement différé Unisoft,
  absence de débordement du document et protection de navigation.
- Captures : `.tmp/crm-review/`, téléphone et ordinateur, examinées visuellement.

## Limites de la vérification

Le parcours connecté réel et les services Unisoft/carnet du téléphone restent à
essayer avec un compte autorisé. Les tests n'exercent pas les politiques RLS de
production, mais les restrictions des routes serveur. Les avertissements de
navigation couvrent les liens, le menu mobile, les onglets des paramètres et la
fermeture de page ; Retour/Suivant utilise la Navigation API lorsqu'elle est disponible.

ESLint ciblé passe. TypeScript global reste bloqué par des erreurs préexistantes
hors CRM : donation-campaign/config, email/classify, donation-campaign/visuals,
assistant-client, whatsapp-client et email/ai-settings. Aucun diagnostic CRM lors
de la vérification. Les tests utilisent des données fictives.

Le calendrier civil reporte un anniversaire du 29 février au 1er mars les années
non bissextiles. La fenêtre de 30 jours inclut aujourd'hui ; le calendrier hébraïque
est sélectionné par défaut. Le fuseau utilisé reste Europe/Paris, comme le formulaire
existant. Le serveur renvoie tous les contacts par lots internes, sans changer le
format public de GET, pour éviter la coupure par défaut à 1 000 résultats.
