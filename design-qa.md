# Design QA — Fonctionnalités à venir

Date : 2026-10-16

## Référence et captures comparées

- Référence : `C:\Users\chlom\Downloads\12_Fonctionnalites-a-venir.mp4` (59,2 s), contrôlée à 4 s, 26 s et 48 s.
- Implémentation mobile : `C:\Users\chlom\AppData\Local\Temp\easycom-coming-soon-qa\coming-mobile-final.png` (375 × 900).
- État du panneau mobile : `C:\Users\chlom\AppData\Local\Temp\easycom-coming-soon-qa\coming-modal-mobile.png` (375 × 900).
- Implémentation desktop : `C:\Users\chlom\AppData\Local\Temp\easycom-coming-soon-qa\coming-desktop-final.png` (1440 × 1200).
- État de la fenêtre desktop : `C:\Users\chlom\AppData\Local\Temp\easycom-coming-soon-qa\coming-modal-desktop.png` (1440 × 1200).
- Accès depuis l’accueil : `C:\Users\chlom\AppData\Local\Temp\easycom-coming-soon-qa\home-mobile.png` (375 × 900).

## Contrôles

- Fidélité : hero violet/rose, titre doré, trois indicateurs, cartes blanches colorées, CTA idée et panneau de détail alignés sur la référence.
- Typographie : hiérarchie, graisses, tailles, interlignage et retours contrôlés à 375 px et 1440 px.
- Responsive : aucune largeur débordante (`scrollWidth = 375` pour un viewport de 375 px), grille 1/2/3 colonnes.
- Interactions : ouverture des six cartes, fermeture par bouton, fond, Échap et glissement mobile ; focus initial sur « J’ai compris ».
- Accessibilité : contrôles sémantiques, libellés, focus visible, contraste, réduction des animations et cibles tactiles.
- Accès : pastille visible sans défilement sur l’accueil ; bannière présente en bas du dashboard authentifié, absente du mode démo.
- Qualité : ESLint ciblé et build de production réussis.

## Résultat

final result: passed
