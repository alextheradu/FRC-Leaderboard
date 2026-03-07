CREATE TABLE IF NOT EXISTS teams (
  team_number INTEGER PRIMARY KEY,
  nickname TEXT,
  city TEXT,
  state_prov TEXT,
  country TEXT,
  website TEXT,
  rookie_year INTEGER,
  avatar_base64 TEXT,
  last_updated INTEGER
);

CREATE TABLE IF NOT EXISTS events (
  event_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  city TEXT,
  state_prov TEXT,
  country TEXT,
  year INTEGER NOT NULL,
  start_date TEXT,
  end_date TEXT,
  event_type INTEGER,
  last_updated INTEGER
);

CREATE TABLE IF NOT EXISTS matches (
  match_key TEXT PRIMARY KEY,
  event_key TEXT NOT NULL,
  comp_level TEXT NOT NULL,
  match_number INTEGER NOT NULL,
  set_number INTEGER NOT NULL DEFAULT 1,
  red_score INTEGER,
  blue_score INTEGER,
  red_teams TEXT NOT NULL,
  blue_teams TEXT NOT NULL,
  winning_alliance TEXT,
  actual_time INTEGER,
  post_result_time INTEGER,
  video_url TEXT,
  FOREIGN KEY (event_key) REFERENCES events(event_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_key TEXT NOT NULL UNIQUE,
  event_key TEXT NOT NULL,
  alliance TEXT NOT NULL,
  score INTEGER NOT NULL,
  team_numbers TEXT NOT NULL,
  achieved_at INTEGER NOT NULL,
  FOREIGN KEY (match_key) REFERENCES matches(match_key) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC, achieved_at ASC);
CREATE INDEX IF NOT EXISTS idx_matches_event ON matches(event_key);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  events_synced INTEGER DEFAULT 0,
  matches_synced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',
  error_message TEXT
);
