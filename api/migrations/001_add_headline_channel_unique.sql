-- Migration: Add unique constraint on (headline, channel)
-- This prevents duplicate alerts at the database level
-- Applied: 2026-02-09

-- First clean any existing duplicates (keep most recent)
DELETE FROM alerts a
USING (
  SELECT alert_id, 
         ROW_NUMBER() OVER (PARTITION BY headline, channel ORDER BY timestamp DESC) as rn
  FROM alerts
) b
WHERE a.alert_id = b.alert_id AND b.rn > 1;

-- Add the constraint
ALTER TABLE alerts 
ADD CONSTRAINT alerts_headline_channel_unique 
UNIQUE (headline, channel);
