# Stack technique recommandee

## Frontend
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 pour un design system rapide et maintenable
- Lucide React pour l'iconographie

## Backend
- Route Handlers Next.js pour API interne
- Prisma ORM pour la couche d'acces donnees
- PostgreSQL comme base principale (adaptateur @prisma/adapter-pg)
- Zod pour la validation d'entrees
- jose + bcryptjs pour une couche auth JWT securisee

## Authentification et securite
- Option 1 (recommandee production): Supabase Auth (RBAC role-based + policies)
- Option 2 (self-hosted): Auth maison JWT (refresh token + httpOnly cookies)
- Hash mot de passe via bcrypt
- Logs d'audit pour signatures, remboursements et actions admin

## Integrations
- Webhook Discord pour rappels de paiement et notifications de signature
- Stockage objet (Supabase Storage ou S3) pour PDF et pieces jointes de sinistre

## Observabilite / DevOps
- Sentry pour erreurs applicatives
- OpenTelemetry + logs structurels (pino)
- Deploiement Railway (application + base PostgreSQL manageee)
