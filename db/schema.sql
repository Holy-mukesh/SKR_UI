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

-- Admin accounts. place = the one property this admin manages; NULL = superadmin (all properties).
-- Passwords are scrypt hashes, never plain text. Add or change accounts with:
--   node --env-file=.env scripts/db.mjs admin <username> <password> [place]
CREATE TABLE IF NOT EXISTS admins (
  username      text PRIMARY KEY,
  password_hash text NOT NULL,
  place         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Signed-in admin sessions, kept in the database so restarts and deploys don't sign staff out
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash text PRIMARY KEY,
  username   text NOT NULL REFERENCES admins (username) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_sessions_expiry_idx ON admin_sessions (expires_at);
