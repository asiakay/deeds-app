UPDATE users
SET
  sector = 'Community Services',
  region = 'Caribbean',
  verification_status = 'pending'
WHERE id = 1;

-- Rollback
UPDATE users
SET
  sector = NULL,
  region = NULL,
  verification_status = 'pending'
WHERE id = 1;
