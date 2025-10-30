ALTER TABLE deeds ADD COLUMN deed_date TEXT;
ALTER TABLE deeds ADD COLUMN duration TEXT;
ALTER TABLE deeds ADD COLUMN impact_area TEXT;
ALTER TABLE deeds ADD COLUMN description TEXT;
ALTER TABLE deeds ADD COLUMN partners TEXT;

-- Rollback
-- ALTER TABLE deeds DROP COLUMN deed_date;
-- ALTER TABLE deeds DROP COLUMN duration;
-- ALTER TABLE deeds DROP COLUMN impact_area;
-- ALTER TABLE deeds DROP COLUMN description;
-- ALTER TABLE deeds DROP COLUMN partners;
