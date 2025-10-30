ALTER TABLE users ADD COLUMN sector TEXT;
ALTER TABLE users ADD COLUMN region TEXT;
ALTER TABLE users ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'pending';

-- Rollback
-- SQLite/D1 does not support dropping columns with ALTER TABLE.
-- To rollback, recreate the table without the added columns and copy data over if necessary.
