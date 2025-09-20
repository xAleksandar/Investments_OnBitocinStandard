const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.PRISMA_DATABASE_URL,
  // Fallback to individual credentials if no connection string
  ...((!process.env.POSTGRES_URL && !process.env.PRISMA_DATABASE_URL) && {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  })
});

async function backupDatabase() {
  try {
    console.log('🔄 Starting database backup...\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', 'backups');

    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('📁 Created backups directory');
    }

    const backupFile = path.join(backupDir, `database-backup-${timestamp}.sql`);
    let backupContent = `-- Database Backup Created: ${new Date().toISOString()}\n`;
    backupContent += `-- Environment: ${process.env.POSTGRES_URL ? 'Cloud' : 'Local'}\n\n`;

    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`📋 Found ${tablesResult.rows.length} tables to backup`);

    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      console.log(`   Backing up table: ${tableName}`);

      // Get table schema
      const schemaResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);

      // Get table data
      const dataResult = await pool.query(`SELECT * FROM ${tableName}`);

      backupContent += `-- Table: ${tableName}\n`;
      backupContent += `-- Columns: ${schemaResult.rows.map(r => r.column_name).join(', ')}\n`;
      backupContent += `-- Record count: ${dataResult.rows.length}\n\n`;

      if (dataResult.rows.length > 0) {
        const columns = schemaResult.rows.map(r => r.column_name);

        for (const row of dataResult.rows) {
          const values = columns.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            if (value instanceof Date) return `'${value.toISOString()}'`;
            return value.toString();
          });

          backupContent += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        backupContent += '\n';
      }
    }

    // Write backup file
    fs.writeFileSync(backupFile, backupContent);

    console.log(`\n✅ Database backup completed successfully!`);
    console.log(`📄 Backup saved to: ${backupFile}`);
    console.log(`📊 Backup size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);

    // Also create a quick restore script
    const restoreScript = `#!/bin/bash
# Quick restore script for database backup
# Usage: ./restore-backup.sh

echo "⚠️  This will restore the database from backup"
echo "   Make sure you have a current backup before proceeding!"
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Restoring database..."
    psql $POSTGRES_URL < "${path.basename(backupFile)}"
    echo "✅ Restore completed"
else
    echo "❌ Restore cancelled"
fi
`;

    const restoreScriptPath = path.join(backupDir, `restore-${timestamp}.sh`);
    fs.writeFileSync(restoreScriptPath, restoreScript);
    fs.chmodSync(restoreScriptPath, '755');

    console.log(`🔧 Restore script created: ${restoreScriptPath}`);

  } catch (error) {
    console.error('❌ Error creating backup:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run backup
backupDatabase()
  .then(() => {
    console.log('\n🎯 Backup process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  });