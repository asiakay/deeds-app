ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1));

INSERT INTO users (
  id,
  name,
  email,
  password_hash,
  credits,
  is_admin,
  created_at
)
VALUES (
  2,
  'Admin User',
  'admin@deeds.local',
  '790f48e3ba51e2d0762e7d4a74d4076a62cfb34d44e3dfbc43798fe9ff399602',
  0,
  1,
  datetime('now')
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  email = excluded.email,
  password_hash = excluded.password_hash,
  credits = excluded.credits,
  is_admin = excluded.is_admin,
  created_at = excluded.created_at;

-- Rollback
DELETE FROM users WHERE id = 2 AND email = 'admin@deeds.local';
