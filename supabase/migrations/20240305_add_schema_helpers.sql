-- Create helper function to check if another function exists
CREATE OR REPLACE FUNCTION function_exists(function_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  exists BOOLEAN;
BEGIN
  SELECT COUNT(*) > 0 INTO exists
  FROM pg_proc
  WHERE proname = function_name;
  
  RETURN exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create execute_sql function for admin use (if it doesn't exist)
CREATE OR REPLACE FUNCTION execute_sql(sql TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make refresh_schema_cache function more robust
CREATE OR REPLACE FUNCTION refresh_schema_cache()
RETURNS VOID AS $$
BEGIN
  -- Use pg_notify to trigger a schema reload
  PERFORM pg_notify('pgrst', 'reload schema');
  
  -- Add an entry to the temp table to force cache refresh
  CREATE TABLE IF NOT EXISTS _temp_forced_refresh (id SERIAL PRIMARY KEY);
  INSERT INTO _temp_forced_refresh (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 