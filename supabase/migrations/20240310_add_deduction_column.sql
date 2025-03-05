-- Add deduction column to salaries and salary_calculations tables
DO $$
BEGIN
    -- Add deduction column to salaries table if it doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'salaries') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'salaries' 
            AND column_name = 'deduction'
        ) THEN
            ALTER TABLE salaries ADD COLUMN deduction NUMERIC DEFAULT 0;
            RAISE NOTICE 'Added deduction column to salaries table';
        ELSE
            RAISE NOTICE 'deduction column already exists in salaries table';
        END IF;
    END IF;

    -- Add deduction column to salary_calculations table if it doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'salary_calculations') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'salary_calculations' 
            AND column_name = 'deduction'
        ) THEN
            ALTER TABLE salary_calculations ADD COLUMN deduction NUMERIC DEFAULT 0;
            RAISE NOTICE 'Added deduction column to salary_calculations table';
        ELSE
            RAISE NOTICE 'deduction column already exists in salary_calculations table';
        END IF;
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

    RAISE NOTICE '✅ Migration completed successfully';
END;
$$; 