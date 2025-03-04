-- SALARY CURSOR: ONE-CLICK FIX FOR MISSING ABSENCES COLUMN
-- Copy and paste this entire file into your Supabase SQL Editor and click "Run"

-- STEP 1: Add the absences column with a safe error handler
DO $$
BEGIN
    -- Try to add the column (will fail silently if it already exists)
    BEGIN
        ALTER TABLE salaries ADD COLUMN absences DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Successfully added the absences column.';
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'The absences column already exists.';
    END;

    -- Refresh the schema cache to make the new column visible to the API
    BEGIN
        -- Method 1: Using direct notify
        NOTIFY pgrst, 'reload schema';
        RAISE NOTICE 'Sent schema reload notification.';
        
        -- Method 2: Using function if it exists
        IF EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = 'refresh_schema_cache'
        ) THEN
            PERFORM refresh_schema_cache();
            RAISE NOTICE 'Called refresh_schema_cache() function.';
        END IF;
        
        -- Method 3: Force cache refresh with temp table
        CREATE TEMP TABLE _force_schema_refresh ON COMMIT DROP AS SELECT 1;
        DROP TABLE _force_schema_refresh;
        RAISE NOTICE 'Created and dropped temporary table to force refresh.';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Schema refresh attempt encountered an error: %', SQLERRM;
        RAISE NOTICE 'This is not critical - your column has been added successfully.';
    END;
END;
$$;

-- STEP 2: Verify the column exists
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
        RAISE NOTICE '✅ SUCCESS: The absences column exists and is ready to use!';
        RAISE NOTICE 'You can now return to the Salary Cursor application and try again.';
    ELSE
        RAISE EXCEPTION '❌ ERROR: The absences column was not added successfully.';
    END IF;
END;
$$; 