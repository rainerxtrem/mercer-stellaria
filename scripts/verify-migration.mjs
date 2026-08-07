#!/usr/bin/env node
/**
 * Contrôle d'intégrité après migration : compare table par table les décomptes
 * SQLite (source) et PostgreSQL (cible), et vérifie quelques valeurs métier.
 */
import Database from "better-sqlite3";
import pg from "pg";

const SQLITE_PATH = process.env.SQLITE_PATH ?? "/data/production.db";
const DATABASE_URL = process.env.DATABASE_URL;

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const client = new pg.Client({ connectionString: DATABASE_URL });

const tables = sqlite
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations' ORDER BY name")
  .all()
  .map((row) => row.name);

await client.connect();

let mismatches = 0;
let sqliteTotal = 0;
let pgTotal = 0;

console.log("table                          sqlite     pg   etat");
console.log("-".repeat(58));

for (const table of tables) {
  const { c: source } = sqlite.prepare(`SELECT COUNT(*) AS c FROM "${table}"`).get();

  let target = 0;
  try {
    const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
    target = rows[0].c;
  } catch {
    target = -1;
  }

  sqliteTotal += source;
  pgTotal += Math.max(0, target);

  const ok = source === target;
  if (!ok) mismatches += 1;

  if (source > 0 || !ok) {
    console.log(`${table.padEnd(30)} ${String(source).padStart(6)} ${String(target).padStart(6)}   ${ok ? "OK" : "ECART"}`);
  }
}

console.log("-".repeat(58));
console.log(`TOTAL                          ${String(sqliteTotal).padStart(6)} ${String(pgTotal).padStart(6)}`);

// Contrôles métier ciblés
const { rows: users } = await client.query(`SELECT "email", "role" FROM "User" ORDER BY "createdAt" LIMIT 3`);
console.log("\nEchantillon utilisateurs :", users.map((u) => `${u.email}(${u.role})`).join(", "));

const { rows: fk } = await client.query(`
  SELECT COUNT(*)::int AS c FROM "Contract" ct
  LEFT JOIN "User" u ON u."id" = ct."clientId"
  WHERE u."id" IS NULL
`);
console.log("Contrats orphelins (FK cassee) :", fk[0].c);

const { rows: json } = await client.query(`SELECT "coverageSummary" FROM "Contract" LIMIT 1`);
console.log("JSON relu depuis PostgreSQL :", json[0] ? typeof json[0].coverageSummary : "aucune ligne");

await client.end();

if (mismatches === 0 && fk[0].c === 0) {
  console.log("\nRESULTAT: integrite verifiee, aucun ecart.");
  process.exit(0);
}

console.error(`\nRESULTAT: ${mismatches} ecart(s) de decompte.`);
process.exit(1);
