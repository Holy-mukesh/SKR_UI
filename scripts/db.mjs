/*
  Database helper for Neon.
    node --env-file=.env scripts/db.mjs setup    creates the tables (safe to run again)
    node --env-file=.env scripts/db.mjs import   copies data/db.json into Neon (skips ids already there)
*/
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Add your Neon connection string to .env.');
  process.exit(1);
}
const sql = postgres(url, { ssl: 'require', max: 1, prepare: false });
const command = process.argv[2];

try {
  if (command === 'setup') {
    await sql.unsafe(readFileSync(join(process.cwd(), 'db', 'schema.sql'), 'utf8'));
    console.log('Tables ready.');
  } else if (command === 'import') {
    const file = join(process.cwd(), process.env.DATA_DIR || 'data', 'db.json');
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    for (const table of ['bookings', 'reservations', 'blocks', 'reviews']) {
      const items = Array.isArray(saved[table]) ? saved[table] : [];
      let added = 0;
      for (const item of items) {
        const created = item.created || item.createdAt || new Date().toISOString();
        const rows = await sql`
          INSERT INTO ${sql(table)} (id, place, created_at, data)
          VALUES (${item.id}, ${item.place || ''}, ${created}, ${sql.json(item)})
          ON CONFLICT (id) DO NOTHING RETURNING id`;
        added += rows.length;
      }
      console.log(`${table}: ${added} added, ${items.length - added} already there`);
    }
  } else {
    console.log('Usage: node --env-file=.env scripts/db.mjs setup|import');
  }
} finally {
  await sql.end();
}
