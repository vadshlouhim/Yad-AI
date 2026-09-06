# Migration Stripe TEST vers LIVE

Audit du 2 septembre 2026.

## Offre commerciale de référence

- Premier mois : 9,99 EUR TTC.
- Renouvellements suivants : 19,99 EUR TTC par mois.
- Aucun coupon Stripe.
- Une seule offre payante : `PROFESSIONAL` / EasyCom IA.

Le Checkout démarre l'abonnement avec le Price de lancement. Après
`checkout.session.completed`, le webhook remplace la ligne par le Price standard
avec `proration_behavior: none`. La première facture reste donc à 9,99 EUR et la
facture suivante est de 19,99 EUR.

## Stripe TEST vérifié

- Product : `prod_Uim2PBlFLNZVrG` — EasyCom IA - Abonnement payant.
- Price lancement : `price_1TjKU7PerDifDSWlDwlJK6Ro` — 9,99 EUR/mois.
- Price standard : `price_1TjKU6PerDifDSWlmvnFmpJd` — 19,99 EUR/mois.
- Customer Portal : `bpc_1UBKyGPerDifDSWldm13XPdP`.
- Aucun endpoint webhook permanent n'était configuré dans TEST lors de l'audit.

La configuration Portal autorise la mise à jour du client et du moyen de
paiement, l'historique des factures et l'annulation en fin de période. Le
changement d'offre est désactivé puisqu'EasyCom ne propose qu'une offre payante.

## Configuration LIVE requise sur Netlify

Configurer dans l'environnement Production de Netlify :

- `NEXT_PUBLIC_APP_URL=https://easycom-ai.com`
- `STRIPE_SECRET_KEY` avec la clé secrète LIVE copiée depuis Stripe Workbench
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` avec la clé publique LIVE associée
- `STRIPE_LAUNCH_PRICE_ID` avec le Price LIVE à 9,99 EUR/mois
- `STRIPE_PAID_PRICE_ID` avec le Price LIVE à 19,99 EUR/mois
- `STRIPE_WEBHOOK_SECRET` avec le signing secret LIVE
- `STRIPE_PORTAL_CONFIGURATION_ID` avec la configuration Portal LIVE

Endpoint webhook LIVE :

`https://easycom-ai.com/api/webhooks/stripe`

Événements nécessaires :

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

## État de la base auditée

- 12 communautés.
- Aucun `stripeCustomerId` enregistré.
- Trois abonnements manuels `ENTERPRISE`, sans ID Stripe TEST/LIVE.
- Aucun article payant enregistré.
- La table `PlatformSetting` n'existe pas encore dans le schéma Supabase exposé.
- `DATABASE_URL` et `DIRECT_URL` contiennent des placeholders : les migrations
  Prisma ne peuvent pas être appliquées depuis cet environnement.

Les références Stripe TEST existantes ne doivent pas être supprimées. Le code
ignore désormais une Subscription Stripe introuvable avec la clé du mode actif,
ce qui permet à un ancien ID TEST de ne pas bloquer un nouveau Checkout LIVE.

## Stripe LIVE configuré

- Compte : `acct_1TjJxTBBd05bvnVz` — EasyCom AI.
- Product : `prod_UsAjYA31WrFEoA` — EasyCom IA - Abonnement payant.
- Price lancement : `price_1UBLJCBBd05bvnVz2JCGZhL7` — 9,99 EUR/mois TTC.
- Price standard : `price_1UBLJDBBd05bvnVzFzDv5Lzo` — 19,99 EUR/mois TTC.
- Customer Portal : `bpc_1UBLJaBBd05bvnVzbIlQrKbY`.
- Webhook : `we_1UBLMeBBd05bvnVz4Qk5cNNn`.

L'ancien Price LIVE à 29,99 EUR (`price_1U12qPBBd05bvnVzjZUMUAEY`) a été
désactivé après vérification de l'absence de Customer et de Subscription LIVE.
Aucun coupon n'est configuré ni utilisé.

Le webhook LIVE cible `https://easycom-ai.com/api/webhooks/stripe`, utilise la
version d'API `2026-03-25.dahlia` et écoute uniquement les cinq événements
documentés ci-dessus.

## Finalisation de production

Les sept variables LIVE ont été installées dans le contexte Production de
Netlify le 2 septembre 2026. Les autres contextes conservent leurs valeurs
préexistantes afin de ne pas mélanger TEST et LIVE.

Après le déploiement du code, effectuer un achat réel avec une
carte bancaire réelle, puis vérifier la première facture à 9,99 EUR, le passage
automatique du Price de la Subscription à 19,99 EUR et l'accès au portail client.
