# Yad.ia — Communication communautaire assistée par IA

> Copilote IA de communication pour communautés religieuses et associatives.
> Centralisez, générez et diffusez votre communication sur tous vos canaux.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 15 App Router (TypeScript) |
| Base de données | Supabase PostgreSQL + Prisma ORM |
| Authentification | Supabase Auth (email + Google OAuth) |
| IA | Anthropic Claude Sonnet 4.6 (streaming) |
| Email | Resend |
| Paiements | Stripe |
| Médias | Cloudinary |
| Calendrier hébraïque | Hebcal API |
| Déploiement | Vercel |

## Démarrage rapide

### 1. Configuration Supabase

1. Créez un projet sur https://supabase.com
2. Activez Google OAuth : Authentication > Providers > Google
3. Ajoutez callback URL : `https://votre-domaine.com/auth/callback`
4. Exécutez `supabase/bootstrap.sql` dans l'éditeur SQL
5. Récupérez vos clés dans Settings > API

### 2. Variables d'environnement

```bash
cp .env.example .env.local
# Remplissez les valeurs obligatoires
```

Variables minimales pour démarrer :
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- DATABASE_URL (Supabase, mode Transaction port 6543)
- DIRECT_URL (Supabase, mode Session port 5432)
- ANTHROPIC_API_KEY

### 3. Installation

```bash
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

## Structure du projet

```
src/
├── app/
│   ├── auth/            # Login, register, callback, error
│   ├── dashboard/       # Application principale
│   ├── onboarding/      # Wizard configuration
│   └── api/             # Routes API (ai, events, publications, webhooks, cron)
├── components/
│   ├── ui/              # Design system
│   ├── layout/          # Sidebar, TopBar
│   ├── auth/            # Formulaires auth
│   ├── onboarding/      # Wizard + étapes
│   ├── dashboard/       # Dashboard + assistant IA
│   └── events/          # Module événements
└── lib/
    ├── supabase/        # Clients Supabase
    ├── ai/              # Moteur IA (prompts + engine)
    ├── publishing/      # Diffusion multicanale
    ├── automation/      # Automatisations + Hebcal
    ├── auth.ts          # Helpers auth
    └── stripe.ts        # Stripe
```

## Déploiement Vercel

Le fichier vercel.json configure un cron toutes les 30 minutes pour les automatisations.
Configurez CRON_SECRET dans les variables Vercel.

## Roadmap V2

- Multi-communautés
- Génération visuels IA
- WhatsApp Business API directe
- Application mobile
- Analytics avancés
