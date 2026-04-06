/**
 * Script de traduction en masse des questions via DeepL.
 *
 * Usage:
 *   npx ts-node scripts/translate-questions.ts
 *   npx ts-node scripts/translate-questions.ts --module truthDare
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { Translator } from 'deepl-node';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Charger .env manuellement (évite les problèmes dotenv/esm) ──────────────
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    try {
      const content = readFileSync(join(__dirname, '..', file), 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!(key in process.env)) process.env[key] = value;
      }
    } catch {
      // file doesn't exist, skip
    }
  }
}
loadEnv();

// ─── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const MODULE_FILTER = (() => {
  const idx = process.argv.indexOf('--module');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const BATCH_SIZE = 50;
const TARGET_LOCALE = 'en';

// ─── Vérifications ───────────────────────────────────────────────────────────

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
if (!DEEPL_API_KEY) {
  console.error('❌ DEEPL_API_KEY manquant dans .env');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const translator = new Translator(DEEPL_API_KEY);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

async function translateTexts(texts: string[], retries = 3): Promise<string[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const results = await translator.translateText(texts, 'fr', 'en-US');
      return (Array.isArray(results) ? results : [results]).map((r) => r.text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      if (attempt < retries) {
        console.error(`\n  ⚠️  DeepL erreur tentative ${attempt}/${retries} : ${msg}. Retry dans 3s...`);
        await new Promise((r) => setTimeout(r, 3000));
      } else {
        throw new Error(`DeepL a échoué après ${retries} tentatives : ${msg}`);
      }
    }
  }
  throw new Error('unreachable');
}

// ─── Modules ─────────────────────────────────────────────────────────────────

async function translateTruthDare(): Promise<void> {
  console.log('\n📋 TruthDare...');

  const result1 = await pool.query(`
    SELECT td.id, tdt.question
    FROM "truth-dare" td
    JOIN "truth-dare-translation" tdt ON tdt."truthDareId" = td.id AND tdt.locale = 'fr'
    WHERE NOT EXISTS (
      SELECT 1 FROM "truth-dare-translation" x
      WHERE x."truthDareId" = td.id AND x.locale = $1
    )
  `, [TARGET_LOCALE]);
  const rows1 = result1.rows as { id: string; question: string }[];

  console.log(`  → ${rows1.length} questions à traduire`);
  if (rows1.length === 0) return;

  let done = 0;
  for (const batch of chunks(rows1, BATCH_SIZE)) {
    const translated = await translateTexts(batch.map((r) => r.question));

    if (!DRY_RUN) {
      for (let i = 0; i < batch.length; i++) {
        await pool.query(
          `INSERT INTO "truth-dare-translation" ("truthDareId", locale, question)
           VALUES ($1, $2, $3)
           ON CONFLICT ("truthDareId", locale) DO UPDATE SET question = EXCLUDED.question`,
          [batch[i].id, TARGET_LOCALE, translated[i]],
        );
      }
    } else {
      batch.slice(0, 3).forEach((r, i) =>
        console.log(`  [dry-run] ${r.question.slice(0, 60)} → ${translated[i].slice(0, 60)}`),
      );
    }

    done += batch.length;
    process.stdout.write(`\r  ✅ ${done}/${rows1.length} (${Math.round((done / rows1.length) * 100)}%)`);
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log('\n  TruthDare terminé.');
}

async function translateNeverHave(): Promise<void> {
  console.log('\n📋 NeverHave...');

  const result2 = await pool.query(`
    SELECT nh.id, nht.question
    FROM "never-have" nh
    JOIN "never-have-translation" nht ON nht."neverHaveId" = nh.id AND nht.locale = 'fr'
    WHERE NOT EXISTS (
      SELECT 1 FROM "never-have-translation" x
      WHERE x."neverHaveId" = nh.id AND x.locale = $1
    )
  `, [TARGET_LOCALE]);
  const rows2 = result2.rows as { id: string; question: string }[];

  console.log(`  → ${rows2.length} questions à traduire`);
  if (rows2.length === 0) return;

  let done = 0;
  for (const batch of chunks(rows2, BATCH_SIZE)) {
    const translated = await translateTexts(batch.map((r) => r.question));

    if (!DRY_RUN) {
      for (let i = 0; i < batch.length; i++) {
        await pool.query(
          `INSERT INTO "never-have-translation" ("neverHaveId", locale, question)
           VALUES ($1, $2, $3)
           ON CONFLICT ("neverHaveId", locale) DO UPDATE SET question = EXCLUDED.question`,
          [batch[i].id, TARGET_LOCALE, translated[i]],
        );
      }
    } else {
      batch.slice(0, 3).forEach((r, i) =>
        console.log(`  [dry-run] ${r.question.slice(0, 60)} → ${translated[i].slice(0, 60)}`),
      );
    }

    done += batch.length;
    process.stdout.write(`\r  ✅ ${done}/${rows2.length} (${Math.round((done / rows2.length) * 100)}%)`);
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log('\n  NeverHave terminé.');
}

async function translatePrefer(): Promise<void> {
  console.log('\n📋 Prefer...');

  const result3 = await pool.query(`
    SELECT p.id, pt."choiceOne", pt."choiceTwo"
    FROM "prefer" p
    JOIN "prefer-translation" pt ON pt."preferId" = p.id AND pt.locale = 'fr'
    WHERE NOT EXISTS (
      SELECT 1 FROM "prefer-translation" x
      WHERE x."preferId" = p.id AND x.locale = $1
    )
  `, [TARGET_LOCALE]);
  const rows3 = result3.rows as { id: string; choiceOne: string; choiceTwo: string }[];

  console.log(`  → ${rows3.length} questions à traduire`);
  if (rows3.length === 0) return;

  let done = 0;
  for (const batch of chunks(rows3, BATCH_SIZE)) {
    const texts = batch.flatMap((r) => [r.choiceOne, r.choiceTwo]);
    const translated = await translateTexts(texts);

    if (!DRY_RUN) {
      for (let i = 0; i < batch.length; i++) {
        await pool.query(
          `INSERT INTO "prefer-translation" ("preferId", locale, "choiceOne", "choiceTwo")
           VALUES ($1, $2, $3, $4)
           ON CONFLICT ("preferId", locale) DO UPDATE SET "choiceOne" = EXCLUDED."choiceOne", "choiceTwo" = EXCLUDED."choiceTwo"`,
          [batch[i].id, TARGET_LOCALE, translated[i * 2], translated[i * 2 + 1]],
        );
      }
    } else {
      batch.slice(0, 3).forEach((r, i) =>
        console.log(`  [dry-run] "${r.choiceOne}" vs "${r.choiceTwo}" → "${translated[i * 2]}" vs "${translated[i * 2 + 1]}"`),
      );
    }

    done += batch.length;
    process.stdout.write(`\r  ✅ ${done}/${rows3.length} (${Math.round((done / rows3.length) * 100)}%)`);
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log('\n  Prefer terminé.');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🚀 Traduction en masse${DRY_RUN ? ' (DRY RUN — rien ne sera écrit)' : ''}${MODULE_FILTER ? ` — module: ${MODULE_FILTER}` : ''}`);

  // Test connexion DB
  await pool.query('SELECT 1');
  console.log('✅ DB connectée');

  // Check quota DeepL
  const usage = await translator.getUsage();
  const used = usage.character?.count ?? 0;
  const limit = usage.character?.limit ?? 0;
  console.log(`📊 DeepL : ${used.toLocaleString()} / ${limit.toLocaleString()} chars utilisés (${Math.round((used / limit) * 100)}%)`);

  if (!MODULE_FILTER || MODULE_FILTER === 'truthDare') await translateTruthDare();
  if (!MODULE_FILTER || MODULE_FILTER === 'neverHave') await translateNeverHave();
  if (!MODULE_FILTER || MODULE_FILTER === 'prefer') await translatePrefer();

  console.log('\n🎉 Terminé !');
}

main()
  .catch((err: unknown) => {
    const msg = err instanceof Error ? err.stack ?? err.message : JSON.stringify(err);
    console.error('\n❌ Erreur fatale :', msg);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
