INSERT INTO users (
  id,
  name,
  email,
  password_hash,
  credits,
  created_at
)
VALUES (
  1,
  'Test User',
  'test@example.com',
  'hashedpassword',
  0,
  datetime('now')
)
ON CONFLICT(id) DO UPDATE SET
  name=excluded.name,
  email=excluded.email,
  password_hash=excluded.password_hash,
  credits=excluded.credits,
  created_at=excluded.created_at;

INSERT INTO deeds (user_id, title, proof_url, status)
VALUES (1, 'Delivered groceries', 'https://photos.app/test.jpg', 'pending')
ON CONFLICT DO NOTHING;

-- Rollback
DELETE FROM deeds WHERE user_id = 1 AND title = 'Delivered groceries' AND proof_url = 'https://photos.app/test.jpg';
DELETE FROM users WHERE id = 1 AND email = 'test@example.com';
