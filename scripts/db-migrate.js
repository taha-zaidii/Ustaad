#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Apply every SQL file in database/migrations/ in lexicographic order.
 *
 * All migrations in this repo are idempotent + additive-only, so it is
 * safe to re-run this script — already-applied statements are no-ops.
 *
 * Usage:
 *   npm run db:migrate
 *
 * Reads DATABASE_URL from .env.local (same as the seed script).
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// ── Load .env.local ────────────────────────────────────────────────────────
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^([^=#]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim();
      }
    });
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const dir = path.join(__dirname, "..", "database", "migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No migrations found.");
    await pool.end();
    return;
  }

  console.log(`Applying ${files.length} migration(s)…`);
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    process.stdout.write(`  · ${file} …`);
    try {
      await pool.query(sql);
      console.log(" ok");
    } catch (e) {
      console.log(" FAILED");
      console.error(`    ${e.message}`);
      await pool.end();
      process.exit(1);
    }
  }

  console.log("\nDone. All migrations applied.");
  await pool.end();
}

main().catch(async (e) => {
  console.error("migrate failed:", e.message);
  await pool.end();
  process.exit(1);
});
