#!/usr/bin/env node
/**
 * Déploiement de schéma sans perte de données.
 *
 * La base de production a été créée avec `prisma db push` : elle possède le
 * schéma mais pas l'historique de migrations. On tente donc `migrate deploy`,
 * et si Prisma répond P3005 (« schema is not empty »), on marque les migrations
 * comme déjà appliquées (baseline) avant de réessayer. Aucune donnée n'est
 * jamais supprimée.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

function runPrisma(args) {
  try {
    const stdout = execFileSync("npx", ["prisma", ...args], { stdio: "pipe", encoding: "utf8", shell: true });
    return { ok: true, output: stdout ?? "" };
  } catch (error) {
    return { ok: false, output: `${error.stdout ?? ""}\n${error.stderr ?? ""}` };
  }
}

function listMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

const migrations = listMigrations();

if (migrations.length === 0) {
  console.log("[db-deploy] Aucune migration à appliquer.");
  process.exit(0);
}

console.log(`[db-deploy] ${migrations.length} migration(s) détectée(s).`);

let result = runPrisma(["migrate", "deploy"]);

if (!result.ok && /P3005|schema is not empty/i.test(result.output)) {
  console.log("[db-deploy] P3005 : base existante sans historique, baseline en cours.");

  for (const migration of migrations) {
    const resolved = runPrisma(["migrate", "resolve", "--applied", migration]);
    console.log(`[db-deploy]   ${resolved.ok ? "marquée appliquée" : "déjà enregistrée"} : ${migration}`);
  }

  result = runPrisma(["migrate", "deploy"]);
}

if (!result.ok) {
  console.error("[db-deploy] Échec du déploiement de schéma :");
  console.error(result.output);
  process.exit(1);
}

process.stdout.write(result.output);
console.log("[db-deploy] Schéma à jour.");
