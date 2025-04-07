// Script to create missing overtime table
console.log('Running database schema migration...');

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to execute SQL
async function executeSQL(sql) {
  try {
    console.log(`Executing SQL: ${sql.substring(0, 100)}...`);
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('SQL execution error:', error);
      return false;
    }
    
    console.log('SQL executed successfully');
    return true;
  } catch (err) {
    console.error('Exception during SQL execution:', err);
    return false;
  }
}

// Overtime table creation SQL
const overtimeTableSQL = `
-- Create overtime table
CREATE TABLE IF NOT EXISTS public.overtime (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    date DATE NOT NULL,
    hours DECIMAL(10,2) NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'schedule' or 'manual'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
    UNIQUE(employee_id, date)
);

-- Add RLS policies
ALTER TABLE public.overtime ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own overtime records
CREATE POLICY "Users can read own overtime records"
    ON public.overtime
    FOR SELECT
    TO authenticated
    USING (auth.uid() = employee_id);

-- Allow users to insert their own overtime records
CREATE POLICY "Users can insert own overtime records"
    ON public.overtime
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = employee_id);

-- Allow users to update their own overtime records
CREATE POLICY "Users can update own overtime records"
    ON public.overtime
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = employee_id)
    WITH CHECK (auth.uid() = employee_id);

-- Create function to update updated_at on changes
CREATE OR REPLACE FUNCTION update_overtime_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('UTC', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_overtime_updated_at
    BEFORE UPDATE ON public.overtime
    FOR EACH ROW
    EXECUTE FUNCTION update_overtime_updated_at_column();

-- Force a schema cache refresh
SELECT pg_notify('pgrst', 'reload schema');
`;

// Run the migration
async function runMigration() {
  console.log('Creating overtime table...');
  const success = await executeSQL(overtimeTableSQL);
  
  if (success) {
    console.log('Migration completed successfully');
  } else {
    console.error('Migration failed');
  }
}

runMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
}); 