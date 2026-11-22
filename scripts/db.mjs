/*
  Database helper for Neon.
    node --env-file=.env scripts/db.mjs setup    creates the tables (safe to run again)
    node --env-file=.env scripts/db.mjs import   copies data/db.json into Neon (skips ids already there)
    node --env-file=.env scripts/db.mjs admin <username> <password> [place]
        creates an admin, or changes their password and property.
        place: kodaikanal | arapalayam | kochadai — leave it out for a superadmin (all properties).
*/
import { randomBytes, scryptSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const PLACES = ['kodaikanal', 'arapalayam', 'kochadai'];

/* Same format the server checks in src/lib/server/auth.ts: scrypt$<salt>$<hash> */
const hashPassword = password => {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
};

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Add your Neon connection string to .env.');
  process.exit(1);
}
const sql = postgres(url, { ssl: 'require', max: 1, prepare: false, onnotice: () => {} });
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
  } else if (command === 'admin') {
    const [name, password, place = null] = process.argv.slice(3);
    if (!name || !password) throw new Error('Usage: scripts/db.mjs admin <username> <password> [place]');
    if (place && !PLACES.includes(place)) throw new Error(`Unknown place "${place}". Use one of: ${PLACES.join(', ')}`);
    const username = name.toLowerCase();
    await sql`
      INSERT INTO admins (username, password_hash, place) VALUES (${username}, ${hashPassword(password)}, ${place})
      ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, place = EXCLUDED.place`;
    // A password or property change signs that admin out everywhere
    await sql`DELETE FROM admin_sessions WHERE username = ${username}`;
    console.log(`Admin "${username}" saved: ${place ? `manages ${place}` : 'superadmin (all properties)'}.`);
  } else {
    console.log('Usage: node --env-file=.env scripts/db.mjs setup|import|admin');
  }
} finally {
  await sql.end();
}
