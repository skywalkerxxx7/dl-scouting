CREATE TABLE IF NOT EXISTS scouted_players (
  account_id   BIGINT PRIMARY KEY,
  persona_name TEXT NOT NULL,
  avatar_url   TEXT,
  country_code TEXT,
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
