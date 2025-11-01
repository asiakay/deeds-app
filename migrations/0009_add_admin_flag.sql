ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1));

INSERT INTO users (
  name,
  email,
  password_hash,
  credits,
  is_admin,
  created_at
)
VALUES (
  'Admin User',
  'admin@deeds.local',
  '790f48e3ba51e2d0762e7d4a74d4076a62cfb34d44e3dfbc43798fe9ff399602',
  0,
  1,
  datetime('now')
)
ON CONFLICT(email) DO UPDATE SET
  name = excluded.name,
  password_hash = excluded.password_hash,
  credits = excluded.credits,
  is_admin = excluded.is_admin;

DELETE FROM users WHERE email = 'admin@deeds.local';
