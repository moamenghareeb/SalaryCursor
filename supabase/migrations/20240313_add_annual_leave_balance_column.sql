-- Add annual_leave_balance column to employees table
DO $$
BEGIN
    -- Add annual_leave_balance column to employees table if it doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'employees' 
            AND column_name = 'annual_leave_balance'
        ) THEN
            ALTER TABLE employees ADD COLUMN annual_leave_balance NUMERIC DEFAULT 0;
            
            -- If leave_balance exists, copy data from that column to annual_leave_balance
            IF EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'employees' 
                AND column_name = 'leave_balance'
            ) THEN
                UPDATE employees SET annual_leave_balance = leave_balance;
                RAISE NOTICE 'Copied data from leave_balance to annual_leave_balance';
            END IF;
            
            RAISE NOTICE 'Added annual_leave_balance column to employees table';
        ELSE
            RAISE NOTICE 'annual_leave_balance column already exists in employees table';
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