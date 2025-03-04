-- Create a function to add a column if it doesn't exist
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
  table_name text,
  column_name text,
  column_type text DEFAULT 'NUMERIC',
  default_value text DEFAULT '0'
)
RETURNS boolean AS $$
DECLARE
  column_exists boolean;
BEGIN
  -- Check if the column already exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = table_name
    AND column_name = column_name
  ) INTO column_exists;
  
  -- If the column doesn't exist, add it
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s DEFAULT %s', 
                   table_name, column_name, column_type, default_value);
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to force a schema cache refresh
CREATE OR REPLACE FUNCTION refresh_schema_cache()
RETURNS boolean AS $$
BEGIN
    -- Force a schema cache refresh by notifying the PostgREST server
    PERFORM pg_notify('pgrst', 'reload schema');
    
    -- Add all required columns to the salaries table
    PERFORM add_column_if_not_exists('salaries', 'absences');
    PERFORM add_column_if_not_exists('salaries', 'sick_leave');
    PERFORM add_column_if_not_exists('salaries', 'act_as_pay');
    PERFORM add_column_if_not_exists('salaries', 'pension_plan');
    PERFORM add_column_if_not_exists('salaries', 'retroactive_deduction');
    PERFORM add_column_if_not_exists('salaries', 'premium_card_deduction');
    PERFORM add_column_if_not_exists('salaries', 'mobile_deduction');
    
    -- Force another schema cache refresh to ensure changes are picked up
    PERFORM pg_notify('pgrst', 'reload schema');
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 