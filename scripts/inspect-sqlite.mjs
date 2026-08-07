import Database from "better-sqlite3";

const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/inspect-sqlite.mjs <chemin.db>");
  process.exit(1);
}

const db = new Database(path, { readonly: true });

const integrity = db.prepare("PRAGMA integrity_check").get();
console.log("integrity_check:", integrity.integrity_check);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((row) => row.name);

console.log(`tables: ${tables.length}`);

let total = 0;
const inventory = {};

for (const table of tables) {
  const { c } = db.prepare(`SELECT COUNT(*) AS c FROM "${table}"`).get();
  inventory[table] = c;
  total += c;
  if (c > 0) {
    console.log(`  ${table.padEnd(32)} ${c}`);
  }
}

console.log(`lignes totales: ${total}`);
console.log("JSON_INVENTORY_START");
console.log(JSON.stringify(inventory));
console.log("JSON_INVENTORY_END");
