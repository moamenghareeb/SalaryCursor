-- Migration to remove act_as_pay column from salaries and salary_calculations tables

-- Check if tables exist before modifying
DO $$
BEGIN
    -- Remove column from salaries table
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'salaries' 
        AND column_name = 'act_as_pay'
    ) THEN
        ALTER TABLE salaries DROP COLUMN act_as_pay;
        RAISE NOTICE 'Removed act_as_pay column from salaries table';
    ELSE
        RAISE NOTICE 'act_as_pay column does not exist in salaries table';
    END IF;
    
    -- Remove column from salary_calculations table if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'salary_calculations'
    ) THEN
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'salary_calculations' 
            AND column_name = 'act_as_pay'
        ) THEN
            ALTER TABLE salary_calculations DROP COLUMN act_as_pay;
            RAISE NOTICE 'Removed act_as_pay column from salary_calculations table';
        ELSE
            RAISE NOTICE 'act_as_pay column does not exist in salary_calculations table';
        END IF;
    ELSE
        RAISE NOTICE 'salary_calculations table does not exist';
    END IF;
    
    -- Refresh the schema cache to ensure changes are visible
    BEGIN
        -- Method 1: Direct notification
        NOTIFY pgrst, 'reload schema';
        
        -- Method 2: Using function if it exists
        IF EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = 'refresh_schema_cache'
        ) THEN
            PERFORM refresh_schema_cache();
            RAISE NOTICE 'Schema cache refreshed';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error refreshing schema cache: %', SQLERRM;
    END;
END;
$$; 