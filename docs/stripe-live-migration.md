# Configuration Stripe — offre 30 jours gratuits puis 19,99 EUR/mois

Le code utilise un seul Price mensuel récurrent. L'essai de 30 jours est créé par
Checkout et ne modifie jamais les abonnements déjà existants.

## Environnement de test

1. Créer ou sélectionner un Product EasyCom IA dans un Sandbox Stripe.
2. Créer un Price récurrent mensuel de 19,99 EUR.
3. Configurer `STRIPE_PRICE_MONTHLY_1999` avec son identifiant `price_...`.
4. Activer le Customer Portal pour permettre la mise à jour de la carte et la résiliation.
5. Configurer le webhook avec les événements listés ci-dessous et renseigner son secret.

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
STRIPE_PRICE_MONTHLY_1999=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PORTAL_CONFIGURATION_ID=bpc_...
```

Ne jamais utiliser une clé live pour les tests locaux. Avant la mise en production,
recréer le même Product et le même Price dans l'environnement live, puis remplacer
uniquement les variables d'environnement de production.
