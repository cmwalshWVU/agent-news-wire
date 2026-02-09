-- Agent News Wire: Cleanup Duplicate Alerts
-- Run this in Railway PostgreSQL console

-- Step 1: See how many duplicates exist
SELECT 
  headline, 
  channel, 
  COUNT(*) as duplicate_count
FROM alerts
GROUP BY headline, channel
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- Step 2: Delete duplicates, keeping only the most recent one per headline+channel
DELETE FROM alerts a
USING (
  SELECT alert_id, 
         ROW_NUMBER() OVER (PARTITION BY headline, channel ORDER BY timestamp DESC) as rn
  FROM alerts
) b
WHERE a.alert_id = b.alert_id 
  AND b.rn > 1;

-- Step 3: Clean up invalid hashes (too long)
DELETE FROM alert_hashes WHERE LENGTH(hash) > 64;

-- Step 4: Rebuild alert_hashes with proper SHA256 hashes
-- First, clear the table
TRUNCATE alert_hashes;

-- Step 5: Verify cleanup
SELECT 'Alerts remaining:' as metric, COUNT(*)::text as value FROM alerts
UNION ALL
SELECT 'Unique headline+channel combos:', COUNT(DISTINCT (headline, channel))::text FROM alerts
UNION ALL  
SELECT 'Hash entries:', COUNT(*)::text FROM alert_hashes;

-- Step 6: Add unique constraint on content_hash if not exists
-- (This will fail if duplicates still exist)
-- ALTER TABLE alerts ADD CONSTRAINT alerts_content_hash_unique UNIQUE (content_hash);
