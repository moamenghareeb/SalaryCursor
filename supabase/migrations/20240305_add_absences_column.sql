-- Add absences column to the salaries table (version 2)
-- This improved migration checks if the column exists first and provides better error handling

DO $$
BEGIN
    -- Check if the absences column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'salaries' 
        AND column_name = 'absences'
    ) THEN
        -- If the column doesn't exist, add it
        ALTER TABLE salaries ADD COLUMN absences DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Added absences column to salaries table';
    ELSE
        RAISE NOTICE 'absences column already exists in salaries table';
    END IF;
    
    -- Refresh the schema cache
    PERFORM refresh_schema_cache();
    RAISE NOTICE 'Schema cache refreshed';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error adding absences column: %', SQLERRM;
END;
$$;

-- Verify the column exists after migration
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'salaries' 
        AND column_name = 'absences'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE 'Migration verified: absences column exists';
    ELSE
        RAISE EXCEPTION 'Migration failed: absences column does not exist';
    END IF;
END;
$$;

-- Create a temporary table to force schema cache refresh
CREATE TABLE IF NOT EXISTS _temp_forced_refresh (id SERIAL PRIMARY KEY);
INSERT INTO _temp_forced_refresh (id) VALUES (1) ON CONFLICT (id) DO NOTHING; 