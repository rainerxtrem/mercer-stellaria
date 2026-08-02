# Architecture du projet

```text
mercer-stellaria/
  docs/
    STACK_TECHNIQUE.md
    ARCHITECTURE_PROJET.md
  prisma/
    schema.prisma
  src/
    app/
      page.tsx                    # Landing page publique
      connexion/page.tsx          # Login
      inscription/page.tsx        # Register
      client/page.tsx             # Dashboard client
      collaborateur/page.tsx      # Dashboard agent/courtier
      admin/page.tsx              # Dashboard direction
      api/
        auth/
        clients/
        contracts/
        invoices/
        claims/
        admin/
    components/
      dashboard/
        stat-card.tsx
        section-block.tsx
    lib/
      prisma.ts
      mock-data.ts
```

## Logique d'acces (RBAC)
- PUBLIC: acces landing + inscription + connexion
- CLIENT: ses contrats, ses factures, ses sinistres
- COLLABORATOR: CRM clients du portefeuille, contrats, rappels
- ADMIN: supervision globale, KPI, equipe, validation sinistres lourds

## Separation recommandees
- app/(public): landing, auth
- app/(portal): client, collaborateur, admin
- app/api: endpoints proteges par role
- lib/rbac.ts: middleware role-check centralise
- lib/services/*: logique metier (contrat, facturation, sinistre)

## Base de donnees
- SQLite via Prisma (`DATABASE_URL="file:./dev.db"`)
