#!/usr/bin/env node
/**
 * Cleanup duplicate alerts from the database
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." node cleanup-duplicates.js
 * 
 * Or in Railway console:
 *   railway run node scripts/cleanup-duplicates.js
 */

const knex = require('knex');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    console.error('Usage: DATABASE_URL="postgresql://..." node cleanup-duplicates.js');
    process.exit(1);
  }

  const db = knex({
    client: 'pg',
    connection: databaseUrl
  });

  try {
    console.log('🔌 Connected to database\n');

    // Step 1: Count duplicates
    const duplicateGroups = await db.raw(`
      SELECT headline, channel, COUNT(*) as cnt
      FROM alerts
      GROUP BY headline, channel
      HAVING COUNT(*) > 1
    `);

    const totalDuplicates = duplicateGroups.rows.reduce((sum, r) => sum + (parseInt(r.cnt) - 1), 0);
    console.log(`📊 Found ${duplicateGroups.rows.length} groups with duplicates`);
    console.log(`📊 Total duplicate records to delete: ${totalDuplicates}\n`);

    if (totalDuplicates === 0) {
      console.log('✅ No duplicates found!');
      await db.destroy();
      return;
    }

    // Step 2: Delete duplicates (keep most recent)
    console.log('🗑️  Deleting duplicates (keeping most recent per headline+channel)...');
    
    const deleteResult = await db.raw(`
      DELETE FROM alerts a
      USING (
        SELECT alert_id, 
               ROW_NUMBER() OVER (PARTITION BY headline, channel ORDER BY timestamp DESC) as rn
        FROM alerts
      ) b
      WHERE a.alert_id = b.alert_id 
        AND b.rn > 1
    `);
    
    console.log(`✅ Deleted ${deleteResult.rowCount || totalDuplicates} duplicate alerts\n`);

    // Step 3: Clean up bad hashes
    console.log('🧹 Cleaning up invalid hashes...');
    const badHashResult = await db('alert_hashes')
      .whereRaw('LENGTH(hash) > 64')
      .del();
    console.log(`✅ Deleted ${badHashResult} invalid hashes\n`);

    // Step 4: Truncate and let system rebuild hashes
    console.log('🔄 Truncating alert_hashes table (will rebuild on next ingestion)...');
    await db.raw('TRUNCATE alert_hashes');
    console.log('✅ Hash table cleared\n');

    // Step 5: Final stats
    const [alertCount] = await db('alerts').count('* as count');
    const [uniqueCount] = await db.raw(`
      SELECT COUNT(DISTINCT (headline, channel)) as count FROM alerts
    `);

    console.log('📈 Final Statistics:');
    console.log(`   Total alerts: ${alertCount.count}`);
    console.log(`   Unique headline+channel: ${uniqueCount.rows[0].count}`);
    console.log(`   Duplicates remaining: ${parseInt(alertCount.count) - parseInt(uniqueCount.rows[0].count)}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await db.destroy();
    console.log('\n🔌 Database connection closed');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
