# Configuration Stripe — un seul abonnement : 7 jours gratuits, puis 12,99 EUR/mois ou 99 EUR/an

Une seule offre, définie dans `src/lib/billing/subscription-policy.ts` :

- **Essai gratuit de 7 jours, sans carte bancaire.** Il démarre à la création de la
  communauté. Aucun passage par Stripe n'est nécessaire pour essayer.
- **Ensuite :** 12,99 EUR/mois ou 99 EUR/an, au choix, sur la page « Abonnement et paiement ».
- **Si l'abonnement est pris pendant l'essai**, Stripe ne prélève qu'à la fin des 7 jours
  (`trial_end` calculé par `/api/billing/checkout`).
- **Sans abonnement après l'essai**, le compte passe en lecture seule : tout reste
  consultable, mais les actions de création renvoient le paywall.

## Environnement de test

1. Mettre une clé `sk_test_...` dans `.env.local`.
2. Créer les deux prix : `npx tsx scripts/stripe-create-prices.ts --apply`. Le script
   affiche les lignes `STRIPE_PRICE_MONTHLY=` et `STRIPE_PRICE_YEARLY=` à copier dans
   `.env.local`.
3. Activer le Customer Portal (mise à jour de la carte, résiliation, et passage
   mensuel ↔ annuel avec les deux prix) et renseigner son identifiant `bpc_...`.
4. Configurer le webhook avec les événements listés ci-dessous et renseigner son secret.

## Événements du webhook

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `invoice.paid`
- `invoice.payment_failed`

## Variables

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_MONTHLY=price_...   # 12,99 EUR / mois
STRIPE_PRICE_YEARLY=price_...    # 99 EUR / an
STRIPE_WEBHOOK_SECRET=<secret de signature du webhook Stripe>
STRIPE_PORTAL_CONFIGURATION_ID=bpc_...
```

Les anciennes variables (`STRIPE_PRICE_MONTHLY_1999`, `STRIPE_PRO_PRICE_ID`,
`STRIPE_STARTER_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID`) ne servent plus à vendre. Le
webhook les accepte encore tant que des abonnés y sont facturés : gardez-les jusqu'à la
fin de la migration ci-dessous.

## Mise en production

1. Avec la clé `sk_live_...`, lancer `npx tsx scripts/stripe-create-prices.ts` (simulation),
   puis avec `--apply`. Reporter `STRIPE_PRICE_MONTHLY` et `STRIPE_PRICE_YEARLY` sur Netlify.
2. Dans le Customer Portal live, proposer les deux nouveaux prix.
3. Déployer.
4. Passer les abonnés existants à 12,99 EUR :
   `npx tsx scripts/migrate-subscriptions-to-current-price.ts` (liste, sans rien changer),
   puis avec `--apply`. Aucun prorata : le nouveau montant s'applique à la prochaine
   facture, et le webhook met la base à jour.
5. Une fois la migration vérifiée dans Stripe, les anciennes variables de prix peuvent
   être retirées de Netlify.

Ne jamais utiliser une clé live pour les tests locaux.
