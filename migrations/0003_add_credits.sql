ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 0;

-- Rollback
-- ALTER TABLE users DROP COLUMN credits; -- Not supported in SQLite/D1; recreate table if needed.
