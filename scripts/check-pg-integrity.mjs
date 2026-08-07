#!/usr/bin/env node
/** Contrôles d'intégrité rapides côté PostgreSQL après migration. */
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows: tables } = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
  ORDER BY table_name
`);

let total = 0;
console.log("--- decomptes PostgreSQL ---");
for (const { table_name } of tables) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM "${table_name}"`);
  total += rows[0].n;
  if (rows[0].n > 0) {
    console.log(`${table_name.padEnd(30)} ${rows[0].n}`);
  }
}
console.log(`TOTAL ${total}`);

console.log("\n--- integrite referentielle ---");
const fkChecks = [
  ['Contract -> User(client)', 'SELECT COUNT(*)::int AS n FROM "Contract" c LEFT JOIN "User" u ON u.id=c."clientId" WHERE u.id IS NULL'],
  ['LawMatter -> User(client)', 'SELECT COUNT(*)::int AS n FROM "LawMatter" m LEFT JOIN "User" u ON u.id=m."clientId" WHERE u.id IS NULL'],
  ['LawMatterMessage -> LawMatter', 'SELECT COUNT(*)::int AS n FROM "LawMatterMessage" m LEFT JOIN "LawMatter" l ON l.id=m."matterId" WHERE l.id IS NULL'],
  ['ContactMessage -> User(client)', 'SELECT COUNT(*)::int AS n FROM "ContactMessage" m LEFT JOIN "User" u ON u.id=m."clientId" WHERE u.id IS NULL'],
  ['Invoice -> Contract', 'SELECT COUNT(*)::int AS n FROM "Invoice" i LEFT JOIN "Contract" c ON c.id=i."contractId" WHERE c.id IS NULL'],
  ['UserGrade -> Grade', 'SELECT COUNT(*)::int AS n FROM "UserGrade" ug LEFT JOIN "Grade" g ON g.id=ug."gradeId" WHERE g.id IS NULL'],
];

let orphans = 0;
for (const [label, sql] of fkChecks) {
  const { rows } = await client.query(sql);
  orphans += rows[0].n;
  console.log(`${label.padEnd(34)} orphelins: ${rows[0].n}`);
}

console.log("\n--- types et valeurs ---");
const { rows: u } = await client.query(`SELECT email, role, "isActive", "profileCompleted", "createdAt" FROM "User" ORDER BY "createdAt" LIMIT 3`);
for (const row of u) {
  console.log(`${row.email} | role=${row.role} | isActive=${row.isActive} (${typeof row.isActive}) | profileCompleted=${row.profileCompleted} | createdAt=${row.createdAt?.toISOString?.() ?? row.createdAt}`);
}

const { rows: c } = await client.query(`SELECT "contractNumber", category, status, "weeklyPremium", "coverageSummary" FROM "Contract" LIMIT 2`);
for (const row of c) {
  console.log(`${row.contractNumber} | ${row.category} | ${row.status} | premium=${row.weeklyPremium} | json=${typeof row.coverageSummary}`);
}

await client.end();
console.log(orphans === 0 ? "\nRESULTAT: aucune reference orpheline." : `\nRESULTAT: ${orphans} orphelin(s).`);
process.exit(orphans === 0 ? 0 : 1);
