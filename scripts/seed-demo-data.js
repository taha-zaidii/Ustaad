#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Seed demo data into the live Supabase project.
 *
 * Idempotent-ish: it inserts new jobs every run, but it does NOT touch
 * the profiles table — so it will not overwrite real users' data.
 * It will look for an existing client and freelancer profile and create
 * jobs, skills, and an example proposal between them. If no client
 * profile exists yet, it tells you to sign up first.
 *
 * Usage:
 *   npm run db:seed
 *
 * Safety:
 *   - Never deletes data.
 *   - Never modifies the profile of a real signed-in user.
 *   - All seeded jobs are tagged with title prefix "[DEMO]" so you can
 *     find and clean them up later via the SQL editor.
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
  console.error(
    "DATABASE_URL is missing. Add it to .env.local (Supabase pooler string)."
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const DEMO_JOBS = [
  {
    title: "[DEMO] Bathroom mein leak hai — fix karna hai",
    description:
      "Master bathroom ke pipe se pani leak ho raha hai. Sunday se pehle theek karna hai. Ghar par aakar dekhna hoga, photos attached.",
    category_slug: "plumbing",
    budget_min: 1500,
    budget_max: 4000,
    budget_type: "fixed",
    location: "Karachi — Defence Phase 5",
    duration: "1 day",
    is_urgent: true,
    skills: ["leak-repair", "pipe-installation"],
  },
  {
    title: "[DEMO] AC service + gas refill karwana hai (2 split units)",
    description:
      "Do split AC hain, dono ki service aur gas refill chahiye. Karachi ki garmi shuru ho rahi hai — jaldi chahiye.",
    category_slug: "ac-refrigeration",
    budget_min: 3500,
    budget_max: 8000,
    budget_type: "fixed",
    location: "Karachi — Gulshan-e-Iqbal",
    duration: "1 day",
    is_urgent: false,
    skills: ["ac-installation", "ac-gas-refilling"],
  },
  {
    title: "[DEMO] Generator repair — petrol generator nahi chal raha",
    description:
      "5KVA petrol generator hai. Start karta hai phir off ho jata hai. Mechanic chahiye jo ghar par aakar dekhe.",
    category_slug: "electrician",
    budget_min: 2000,
    budget_max: 6000,
    budget_type: "fixed",
    location: "Karachi — North Nazimabad",
    duration: "2 days",
    is_urgent: true,
    skills: ["generator-repair", "wiring"],
  },
  {
    title: "[DEMO] Drawing room paint karwana hai (15x20)",
    description:
      "Drawing room ki diwarein paint karwani hain. Texture wala finish chahiye. Apna saamaan le aaiye, paint ka kharcha alag.",
    category_slug: "painting",
    budget_min: 12000,
    budget_max: 22000,
    budget_type: "fixed",
    location: "Karachi — DHA Phase 6",
    duration: "3 days",
    is_urgent: false,
    skills: ["wall-painting", "texture-painting"],
  },
  {
    title: "[DEMO] Wooden almari banwani hai (custom design)",
    description:
      "6ft x 7ft ki sliding wardrobe banwani hai. Custom design. Lakri hum supply kar denge — sirf labour aur fitting chahiye.",
    category_slug: "carpentry",
    budget_min: 18000,
    budget_max: 35000,
    budget_type: "fixed",
    location: "Karachi — Clifton",
    duration: "5 days",
    is_urgent: false,
    skills: ["furniture-making", "wood-polishing"],
  },
  {
    title: "[DEMO] Ghar ki deep cleaning chahiye — Eid se pehle",
    description:
      "3 BHK flat. Pura ghar deep cleaning. Kitchen + bathrooms + windows. Eid se 2 din pehle complete hona chahiye.",
    category_slug: "cleaning",
    budget_min: 4500,
    budget_max: 9000,
    budget_type: "fixed",
    location: "Karachi — PECHS",
    duration: "1 day",
    is_urgent: true,
    skills: ["deep-cleaning", "house-cleaning"],
  },
];

async function main() {
  // 1. Map slug → id for categories and skills.
  const cats = await pool.query("select id, slug from public.categories");
  const skills = await pool.query("select id, slug from public.skills");
  const catMap = Object.fromEntries(cats.rows.map((r) => [r.slug, r.id]));
  const skillMap = Object.fromEntries(skills.rows.map((r) => [r.slug, r.id]));

  // 2. Find an existing client to attach jobs to.
  const client = (
    await pool.query(
      `select id, full_name from public.profiles
        where user_type = 'client'
        order by created_at asc
        limit 1`
    )
  ).rows[0];

  if (!client) {
    console.error(
      "No client profile found in the database. Please sign up as a client first via /sign-up, " +
        "complete the onboarding flow as 'Client', then re-run this script."
    );
    await pool.end();
    process.exit(1);
  }

  console.log(`Seeding ${DEMO_JOBS.length} demo jobs as client ${client.full_name}…`);

  let inserted = 0;
  for (const j of DEMO_JOBS) {
    const cat = catMap[j.category_slug];
    if (!cat) {
      console.warn(`  · skip ${j.title} — category '${j.category_slug}' not found`);
      continue;
    }
    const r = await pool.query(
      `insert into public.jobs
         (client_id, title, description, category_id, budget_min, budget_max,
          budget_type, location, duration, status, is_urgent)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10)
       returning id`,
      [
        client.id,
        j.title,
        j.description,
        cat,
        j.budget_min,
        j.budget_max,
        j.budget_type,
        j.location,
        j.duration,
        j.is_urgent,
      ]
    );
    const jobId = r.rows[0].id;
    for (const s of j.skills) {
      const sid = skillMap[s];
      if (sid) {
        await pool.query(
          `insert into public.job_skills (job_id, skill_id)
              values ($1,$2)
           on conflict do nothing`,
          [jobId, sid]
        );
      }
    }
    inserted++;
    console.log(`  ✓ ${j.title}`);
  }

  console.log(`\nDone. Inserted ${inserted} demo jobs (status='open').`);
  console.log("Visit http://localhost:3000/browse-jobs to see them.");
  console.log(
    "All seeded titles are prefixed '[DEMO]' so you can clean them up later " +
      "by running the SQL `DELETE FROM jobs WHERE title LIKE '[DEMO]%';`"
  );

  await pool.end();
}

main().catch((e) => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
