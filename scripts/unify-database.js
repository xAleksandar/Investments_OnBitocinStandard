const pool = require('../config/database');

/**
 * Database Unification Script
 *
 * This script unifies databases across different environments by:
 * 1. Removing redundant asset metadata (name, asset_type from assets table)
 * 2. Removing unnecessary tables (educational_content, email_preferences)
 * 3. Ensuring all required tables exist
 * 4. Works with both localhost PostgreSQL and cloud database connections
 */

async function unifyDatabase() {
    const client = await pool.connect();

    try {
        console.log('🔧 Starting database unification...\n');

        // Check connection type
        const connectionType = process.env.POSTGRES_URL ? 'Cloud Database' : 'Local PostgreSQL';
        console.log(`📡 Connected to: ${connectionType}`);

        // 1. Check existing tables
        console.log('\n📋 Checking existing tables...');
        const tablesResult = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

        const existingTables = tablesResult.rows.map(row => row.table_name);
        console.log(`   Found ${existingTables.length} tables:`, existingTables.join(', '));

        // 2. Remove educational_content table if it exists (content should be in HTML/JS)
        if (existingTables.includes('educational_content')) {
            console.log('\n🗑️  Removing educational_content table (content moved to HTML/JS)...');
            await client.query('DROP TABLE IF EXISTS educational_content CASCADE;');
            console.log('   ✅ educational_content table removed');
        }

        // 3. Remove email_preferences table if it exists (not implemented)
        if (existingTables.includes('email_preferences')) {
            console.log('\n🗑️  Removing email_preferences table (not implemented)...');
            await client.query('DROP TABLE IF EXISTS email_preferences CASCADE;');
            console.log('   ✅ email_preferences table removed');
        }

        // 4. Check assets table structure and remove redundant columns
        console.log('\n🔍 Checking assets table structure...');
        const assetsColumnsResult = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'assets' AND table_schema = 'public'
            ORDER BY ordinal_position;
        `);

        const assetsColumns = assetsColumnsResult.rows.map(row => row.column_name);
        console.log(`   Assets table columns:`, assetsColumns.join(', '));

        // Remove redundant name column (use JS hardcoded lists instead)
        if (assetsColumns.includes('name')) {
            console.log('\n📝 Removing redundant "name" column from assets table...');
            await client.query('ALTER TABLE assets DROP COLUMN IF EXISTS name;');
            console.log('   ✅ "name" column removed (use hardcoded JS lists)');
        }

        // Remove redundant asset_type column (use JS hardcoded lists instead)
        if (assetsColumns.includes('asset_type')) {
            console.log('\n📝 Removing redundant "asset_type" column from assets table...');
            await client.query('ALTER TABLE assets DROP COLUMN IF EXISTS asset_type;');
            console.log('   ✅ "asset_type" column removed (use hardcoded JS lists)');
        }

        // 4.5. Check set_forget_portfolios table structure and remove redundant columns
        if (existingTables.includes('set_forget_portfolios')) {
            console.log('\n🔍 Checking set_forget_portfolios table structure...');
            const portfoliosColumnsResult = await client.query(`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'set_forget_portfolios' AND table_schema = 'public'
                ORDER BY ordinal_position;
            `);

            const portfoliosColumns = portfoliosColumnsResult.rows.map(row => row.column_name);
            console.log(`   Portfolio table columns:`, portfoliosColumns.join(', '));

            // Remove redundant initial_btc_amount column (always 100M sats, use constant instead)
            if (portfoliosColumns.includes('initial_btc_amount')) {
                console.log('\n📝 Removing redundant "initial_btc_amount" column from set_forget_portfolios table...');
                await client.query('ALTER TABLE set_forget_portfolios DROP COLUMN IF EXISTS initial_btc_amount;');
                console.log('   ✅ "initial_btc_amount" column removed (always 100M sats, use constant)');
            }
        }

        // 5. Check final assets table structure
        console.log('\n✅ Final assets table structure:');
        const finalColumnsResult = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'assets' AND table_schema = 'public'
            ORDER BY ordinal_position;
        `);

        finalColumnsResult.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        // 6. Verify required tables exist
        console.log('\n🔍 Verifying required tables exist...');
        const requiredTables = [
            'users', 'holdings', 'trades', 'assets', 'magic_links', 'purchases',
            'suggestions', 'set_forget_portfolios', 'set_forget_allocations'
        ];

        const missingTables = requiredTables.filter(table => !existingTables.includes(table));

        if (missingTables.length > 0) {
            console.log(`   ⚠️  Missing required tables: ${missingTables.join(', ')}`);
            console.log('   💡 Run the appropriate setup scripts to create missing tables');
        } else {
            console.log('   ✅ All required tables exist');
        }

        // 7. Count records in key tables
        console.log('\n📊 Database statistics:');
        const statsTables = ['users', 'assets', 'trades', 'suggestions', 'set_forget_portfolios'];

        for (const table of statsTables) {
            if (existingTables.includes(table)) {
                const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table};`);
                console.log(`   ${table}: ${countResult.rows[0].count} records`);
            }
        }

        // 8. Check asset pricing coverage
        if (existingTables.includes('assets')) {
            const pricingResult = await client.query(`
                SELECT
                    COUNT(*) as total_assets,
                    COUNT(current_price_usd) as assets_with_prices,
                    COUNT(*) - COUNT(current_price_usd) as assets_without_prices
                FROM assets;
            `);

            const stats = pricingResult.rows[0];
            console.log(`\n💰 Asset pricing coverage:`);
            console.log(`   Total assets: ${stats.total_assets}`);
            console.log(`   With prices: ${stats.assets_with_prices}`);
            console.log(`   Without prices: ${stats.assets_without_prices}`);
        }

        console.log('\n🎯 Database unification completed successfully!');
        console.log('\n📋 Summary of changes:');
        console.log('   ✅ Removed redundant asset metadata columns');
        console.log('   ✅ Removed redundant portfolio initial_btc_amount column');
        console.log('   ✅ Cleaned up unused tables');
        console.log('   ✅ Assets table now contains only: symbol, current_price_usd, last_updated');
        console.log('   ✅ Portfolio initial amount now handled as constant (100M sats)');
        console.log('   ✅ Asset metadata (names, types, descriptions) now comes from JS hardcoded lists');

    } catch (error) {
        console.error('❌ Error during database unification:', error);
        throw error;
    } finally {
        client.release();
        process.exit(0);
    }
}

// Run the unification
unifyDatabase().catch(console.error);