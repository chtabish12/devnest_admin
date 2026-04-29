import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("✓ Connected to Supabase Postgres");

const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  const path = join(migrationsDir, file);
  const sql = readFileSync(path, "utf8");
  console.log(`\n→ Applying ${file}…`);
  try {
    await client.query(sql);
    console.log(`  ✓ ${file} applied`);
  } catch (err) {
    console.error(`  ✗ ${file} FAILED:`, err.message);
    process.exit(1);
  }
}

const { rows: tables } = await client.query(
  `select tablename from pg_tables where schemaname = 'public' order by tablename;`,
);
console.log("\nPublic tables now in DB:");
for (const t of tables) console.log("  •", t.tablename);

await client.end();
console.log("\nDone.");
