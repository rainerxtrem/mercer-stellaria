# Mercer & Stellaria Insurance - SaaS RP (GTA V / FiveM)

Application web SaaS complete pour la gestion immersive d'une compagnie d'assurance en environnement roleplay.

## Fonctionnalites incluses (fonctionnelles)

- Authentification Discord OAuth avec sessions JWT
- RBAC complet (PUBLIC, CLIENT, COLLABORATOR, ADMIN) avec middleware
- Espace Client (contrats, signature persistante, PDF, facturation, sinistres)
- Espace Collaborateur (CRM, creation de contrats, rappels de paiement)
- Espace Administrateur (KPI Prisma en temps reel, gestion des collaborateurs, supervision sinistres)
- API Prisma CRUD reelles (plus de mode maquette)

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Prisma ORM + SQLite
- Zod, jose, bcryptjs

Voir le detail dans [docs/STACK_TECHNIQUE.md](docs/STACK_TECHNIQUE.md).

## Architecture

Voir [docs/ARCHITECTURE_PROJET.md](docs/ARCHITECTURE_PROJET.md).

## Demarrage

1. Installer les dependances:

```bash
npm install
```

2. Configurer la base SQLite dans `.env`:

```env
DATABASE_URL="file:./dev.db"
```

3. Configurer OAuth Discord dans `.env`:

```env
AUTH_SECRET="your-random-secret"
AUTH_DISCORD_ID="your-discord-client-id"
AUTH_DISCORD_SECRET="your-discord-client-secret"
```

Redirect URI a configurer dans l'app Discord:

```text
http://localhost:3000/api/auth/callback/discord
```

Pour synchroniser les roles Discord -> roles applicatifs, ajouter aussi:

```env
DISCORD_GUILD_ID="your-discord-server-id"
DISCORD_ROLE_ADMIN_IDS="111111111111111111"
DISCORD_ROLE_COLLABORATOR_IDS="222222222222222222"
DISCORD_ROLE_CLIENT_IDS="333333333333333333"
```

Notes:
- les IDs sont des IDs de roles Discord (mode developpeur active dans Discord)
- plusieurs IDs possibles: separes par des virgules
- priorite appliquee: `ADMIN` > `COLLABORATOR` > `CLIENT`
- si aucun role Discord mappe, l'application conserve le role existant (ou met `CLIENT` par defaut)

4. Generer le client Prisma puis migrer:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

5. Lancer le serveur:

```bash
npm run dev
```

## Endpoints API de base

- `GET /api/clients`
- `GET /api/contracts`
- `GET /api/invoices`
- `GET /api/claims`
- `GET /api/admin/kpis`

## Signature electronique + PDF

- Signature certifiee par clic ou dessin via canvas
- Persistance de la signature et activation du contrat
- Generation PDF serveur et stockage local dans `public/storage/contracts`

## Charte visuelle

- Bleu Marine profond: `#0F2043`
- Blanc casse: `#fafbfc`
- Accents: dore et bleu clair
