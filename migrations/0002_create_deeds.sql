CREATE TABLE deeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  date TEXT,
  time_spent TEXT,
  impact_area TEXT,
  description TEXT,
  collaborators TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 0;
