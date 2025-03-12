const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local file
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Starting database migration...');
    
    // Read migration SQL file
    const migrationFile = path.join(__dirname, '..', 'migrations', 'consolidate_leave_tables.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Execute SQL migration
    console.log('Applying migration...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error applying migration:', error);
      process.exit(1);
    }
    
    console.log('Migration completed successfully!');
    console.log('Notes:');
    console.log('1. The "leaves" table has been consolidated with all required columns');
    console.log('2. Data from "leave_requests" has been migrated to "leaves" if needed');
    console.log('3. The "leave_requests" table has not been dropped yet - uncomment that line in the SQL when ready');
    
  } catch (error) {
    console.error('Error running migration script:', error);
    process.exit(1);
  }
}

applyMigration(); 