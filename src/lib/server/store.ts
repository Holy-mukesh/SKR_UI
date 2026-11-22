import postgres from 'postgres';
import type { Booking, Review, RoomBlock, FrontDeskReservation } from '@/types';

/*
  Records live in Neon Postgres (see db/schema.sql). Each table keeps the full record as JSON in `data`,
  so API responses look exactly as they did with the old db.json file.
*/

type Sql = postgres.Sql<{}> | postgres.TransactionSql<{}>;
type Table = 'bookings' | 'reservations' | 'blocks' | 'reviews';

export interface Collection<T extends { id: string }> {
  all: (place?: string) => Promise<T[]>;
  get: (id: string) => Promise<T | null>;
  add: (item: T) => Promise<T>;
  update: (id: string, changes: Partial<T>) => Promise<T | null>;
  remove: (id: string) => Promise<boolean>;
}

export interface StoreInstance {
  reviews: Collection<Review>;
  bookings: Collection<Booking>;
  blocks: Collection<RoomBlock>;
  reservations: Collection<FrontDeskReservation>;
}

function connect(): postgres.Sql<{}> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Add your Neon connection string to .env.');
  // prepare: false keeps it working through Neon's pooled (-pooler) connection string
  return postgres(url, { ssl: 'require', max: 5, prepare: false, idle_timeout: 20 });
}

// One connection pool per server process (survives Next.js hot reloads in dev)
const g = globalThis as any;
const db = (): postgres.Sql<{}> => (g.__skrSql ||= connect());

function collection<T extends { id: string; place?: string }>(sql: Sql, table: Table): Collection<T> {
  const t = sql(table);
  return {
    async all(place) {
      const rows = place
        ? await sql`SELECT data FROM ${t} WHERE place = ${place} ORDER BY created_at DESC`
        : await sql`SELECT data FROM ${t} ORDER BY created_at DESC`;
      return rows.map(r => r.data as T);
    },
    async get(id) {
      const [row] = await sql`SELECT data FROM ${t} WHERE id = ${id}`;
      return row ? (row.data as T) : null;
    },
    async add(item) {
      await sql`INSERT INTO ${t} (id, place, data) VALUES (${item.id}, ${item.place || ''}, ${sql.json(item as any)})`;
      return item;
    },
    async update(id, changes) {
      const [row] = await sql`UPDATE ${t} SET data = data || ${sql.json(changes as any)} WHERE id = ${id} RETURNING data`;
      return row ? (row.data as T) : null;
    },
    async remove(id) {
      const rows = await sql`DELETE FROM ${t} WHERE id = ${id} RETURNING id`;
      return rows.length > 0;
    }
  };
}

const storeFor = (sql: Sql): StoreInstance => ({
  reviews: collection<Review>(sql, 'reviews'),
  bookings: collection<Booking>(sql, 'bookings'),
  blocks: collection<RoomBlock>(sql, 'blocks'),
  reservations: collection<FrontDeskReservation>(sql, 'reservations')
});

export const getStore = (): StoreInstance => storeFor(db());

/*
  Run `fn` in a transaction that holds a lock for one place, so two people booking the same
  place at the same moment are checked and saved one after the other (no double bookings).
*/
export async function withPlaceLock<R>(place: string, fn: (store: StoreInstance) => Promise<R>): Promise<R> {
  return (await db().begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${'place:' + place}))`;
    return fn(storeFor(tx));
  })) as R;
}
