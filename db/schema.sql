-- SKR Sivabhagya database (Neon Postgres).
-- Each record keeps its full JSON in `data`; the columns beside it are copies used for lookups.
-- Run with: npm run db:setup  (safe to run again)

CREATE TABLE IF NOT EXISTS bookings (
  id         text PRIMARY KEY,
  place      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  data       jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS reservations (
  id         text PRIMARY KEY,
  place      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  data       jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS blocks (
  id         text PRIMARY KEY,
  place      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  data       jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id         text PRIMARY KEY,
  place      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  data       jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS bookings_place_idx     ON bookings (place);
CREATE INDEX IF NOT EXISTS reservations_place_idx ON reservations (place);
CREATE INDEX IF NOT EXISTS blocks_place_idx       ON blocks (place);
CREATE INDEX IF NOT EXISTS reviews_place_idx      ON reviews (place);
