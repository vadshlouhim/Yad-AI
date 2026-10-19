# Préparation de l’anglais

Audit réalisé le 19 octobre 2026. La source de vérité des langues actives est `SUPPORTED_LOCALES` dans `src/i18n/config.ts`. `OutputLocale` en dérive désormais directement. Les correspondances de langue éditoriale et de locale `Intl` contiennent déjà `en`, sans l’activer dans l’interface.

## Ce qui est prêt

- `Template.languages` accepte `fr`, `he` et `en`; l’interface admin n’affiche que les langues présentes dans `SUPPORTED_LOCALES`.
- Les galeries Banque d’affiches, Horaires de Chabbat et Horaires des fêtes filtrent côté serveur sur la langue active.
- Les appels Hebcal, les dates du calendrier hébraïque et les dates du feuillet utilisent `outputIntlLocale()`.
- Les libellés religieux communs possèdent déjà une variante anglaise.
- L’IA possède déjà une directive éditoriale anglaise.

Pour activer l’anglais : ajouter `en` à `SUPPORTED_LOCALES`, créer `messages/en.json`, étendre la contrainte de `profiles.locale`, afficher EN dans le sélecteur de langue et relire les textes anglais. La case English de l’admin apparaîtra automatiquement.

## Valeurs FR/HE encore codées en dur

Le scan couvre les tableaux `fr/he`, les branches `locale === "he"`, `fr-FR`, `he-IL`, `lang=fr` et les en-têtes `Accept-Language`. Ces occurrences ne bloquent pas l’ajout structurel de `en`, mais devront être traduites outil par outil.

### IA, assistant et formats de contenu

- `src/lib/ai/output-locale.ts` — table centrale intentionnelle `fr-FR`, `he-IL`, `en-GB`.
- `src/lib/ai/time-context.ts`
- `src/lib/ai/prompts.ts`
- `src/lib/ai/assistant/tools/shared.ts`
- `src/lib/ai/assistant/tools/events.ts`
- `src/app/api/ai/chat/route.ts`
- `src/app/api/daily-assistant/event/route.ts`
- `src/app/dashboard/assistant/page.tsx`
- `src/components/assistant/assistant-client.tsx` — reconnaissance vocale française.

### Newsletter, PDF et contenus religieux

- `scripts/fixtures/newsletter-layout-browser.js` — fixture visuelle FR/HE.
- `src/app/api/newsletter/sicha/route.ts` — source actuellement demandée en français.
- `src/lib/newsletter/kiddush.ts`
- `src/lib/newsletter/shabbat-study.ts`
- `src/lib/automation/jewish-holidays.ts`
- `src/lib/automation/shabbat-poster.ts` — ancien pipeline de remplacement de texte français.
- `src/lib/torah-pdf.ts`

### Automatisations et outils dashboard pas encore traduits

- `src/lib/automation/monthly-program-recap.ts`
- `src/app/api/monthly-program-recap-auto/config/route.ts`
- `src/components/monthly-program-recap/monthly-templates.tsx`
- `src/components/recap-auto/recap-auto-client.tsx`
- `src/app/api/event-reminders-auto/config/route.ts`
- `src/components/event-reminders/event-reminders-auto-client.tsx`
- `src/components/weekly-images/weekly-images-auto-client.tsx`
- `src/components/hayom-yom-sefer-hamitsvot/hayom-yom-sefer-hamitsvot-client.tsx`
- `src/components/jewish-birthdays/jewish-birthdays-client.tsx`
- `src/components/events/events-client.tsx`
- `src/app/dashboard/events/[id]/edit/page.tsx`
- `src/components/email/email-client.tsx`
- `src/lib/email/ai-settings.ts`
- `src/lib/email/gmail-fetch.ts`
- `src/lib/gmb/reviews.ts`

### Publication, dons, bibliothèque et facturation

- `src/components/publish/manual-publish-client.tsx`
- `src/app/api/donation-campaign/config/route.ts`
- `src/app/dashboard/donation-campaign/visuals/page.tsx`
- `src/components/donation-campaign/donation-campaign-client.tsx`
- `src/components/donation-campaign/donation-campaign-visuals-client.tsx`
- `src/components/media-library/personal-media-library-client.tsx`
- `src/lib/articles/shared.ts`
- `src/lib/community-marketplace.ts`
- `src/lib/billing.ts`
- `src/components/billing/upgrade-modal.tsx`

### Pages publiques, métadonnées, démo et administration

- `src/app/layout.tsx` — métadonnée SEO française.
- `src/app/blog/[slug]/page.tsx` — métadonnée SEO française.
- `src/app/api/contact/route.ts` — e-mail interne daté en français.
- `src/components/demo/demo-events-client.tsx`
- `src/components/admin/admin-console-client.tsx` — console interne actuellement française.

## Règle pour les prochaines étapes

Pour toute nouvelle date visible, utiliser `useFormatter()` / `getFormatter()` ou `outputIntlLocale(locale)`. Pour toute logique de langue, utiliser `Locale`, `isSupportedLocale()` et `SUPPORTED_LOCALES`; ne pas recréer un union type `"fr" | "he"`.
