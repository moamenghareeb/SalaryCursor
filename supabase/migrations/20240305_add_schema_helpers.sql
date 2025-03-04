-- Create helper function to check if another function exists
CREATE OR REPLACE FUNCTION function_exists(func_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = func_name
  );
END;
$$;

-- Check if a column exists in a table
CREATE OR REPLACE FUNCTION column_exists(table_name TEXT, column_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = column_exists.table_name 
    AND column_name = column_exists.column_name
  );
END;
$$;

-- Create execute_sql function for admin use (if it doesn't exist)
CREATE OR REPLACE FUNCTION execute_sql(sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Make refresh_schema_cache function more robust
CREATE OR REPLACE FUNCTION refresh_schema_cache()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Method 1: Send postgrest notification
  NOTIFY pgrst, 'reload schema';
  
  -- Method 2: Create and drop a temp table to force refresh
  CREATE TEMP TABLE _force_schema_refresh ON COMMIT DROP AS SELECT 1;
  DROP TABLE _force_schema_refresh;
END;
$$; 