#!/usr/bin/env node
/**
 * Transfert des données SQLite -> PostgreSQL.
 *
 * Exécuté dans le conteneur Railway : la base SQLite est sur le volume
 * (/data/production.db) et PostgreSQL est joignable via le réseau interne.
 * Le script est idempotent (TRUNCATE des tables cibles avant chargement) et
 * ne touche jamais au fichier SQLite, ouvert en lecture seule.
 *
 *   SQLITE_PATH=/data/production.db DATABASE_URL=postgres://... node scripts/migrate-sqlite-to-pg.mjs
 */
import Database from "better-sqlite3";
import pg from "pg";

const SQLITE_PATH = process.env.SQLITE_PATH ?? "/data/production.db";
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL || !DATABASE_URL.startsWith("postgres")) {
  console.error("[migrate] DATABASE_URL doit pointer vers PostgreSQL.");
  process.exit(1);
}

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const client = new pg.Client({ connectionString: DATABASE_URL });

function sqliteTables() {
  return sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations' ORDER BY name")
    .all()
    .map((row) => row.name);
}

async function pgTableColumns() {
  const { rows } = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.table_name)) {
      map.set(row.table_name, new Map());
    }
    map.get(row.table_name).set(row.column_name, row.data_type);
  }
  return map;
}

function convert(value, dataType) {
  if (value === null || value === undefined) {
    return null;
  }

  if (dataType === "boolean") {
    return typeof value === "number" ? value === 1 : Boolean(value);
  }

  // Les dates SQLite sont des chaînes ISO : PostgreSQL les accepte telles quelles.
  return value;
}

async function main() {
  await client.connect();

  const pgColumns = await pgTableColumns();
  const tables = sqliteTables().filter((table) => pgColumns.has(table));
  const skipped = sqliteTables().filter((table) => !pgColumns.has(table));

  if (skipped.length > 0) {
    console.log(`[migrate] tables ignorées (absentes de PostgreSQL) : ${skipped.join(", ")}`);
  }

  console.log(`[migrate] ${tables.length} table(s) à transférer.`);

  await client.query("BEGIN");
  // Désactive les contraintes FK le temps du chargement : l'ordre d'insertion
  // n'a plus d'importance et la cohérence est revalidée au COMMIT.
  await client.query("SET session_replication_role = replica");

  const report = {};

  try {
    for (const table of [...tables].reverse()) {
      await client.query(`TRUNCATE TABLE "${table}" CASCADE`);
    }

    for (const table of tables) {
      const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all();
      const columnTypes = pgColumns.get(table);

      if (rows.length === 0) {
        report[table] = 0;
        continue;
      }

      const columns = Object.keys(rows[0]).filter((column) => columnTypes.has(column));
      const quoted = columns.map((column) => `"${column}"`).join(", ");

      for (const row of rows) {
        const values = columns.map((column) => convert(row[column], columnTypes.get(column)));
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
        await client.query(`INSERT INTO "${table}" (${quoted}) VALUES (${placeholders})`, values);
      }

      report[table] = rows.length;
      console.log(`[migrate]   ${table.padEnd(30)} ${rows.length}`);
    }

    await client.query("SET session_replication_role = DEFAULT");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[migrate] Échec, transaction annulée :", error.message);
    throw error;
  }

  console.log("[migrate] Vérification des décomptes côté PostgreSQL :");
  let mismatches = 0;
  let total = 0;

  for (const table of tables) {
    const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
    const actual = rows[0].c;
    const expected = report[table];
    total += actual;

    if (actual !== expected) {
      mismatches += 1;
      console.error(`[migrate]   ECART ${table}: attendu ${expected}, obtenu ${actual}`);
    }
  }

  console.log(`[migrate] lignes transférées: ${total}`);
  console.log(mismatches === 0 ? "[migrate] OK — aucun écart." : `[migrate] ${mismatches} écart(s) détecté(s).`);

  await client.end();
  process.exit(mismatches === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
