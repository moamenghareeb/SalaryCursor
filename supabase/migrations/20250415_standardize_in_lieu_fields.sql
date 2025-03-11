-- Migration to standardize in-lieu record fields
-- Specifically focusing on using leave_days_added as the standard field

DO $$
BEGIN
    -- Ensure consistent field naming in in_lieu_records
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'in_lieu_records' AND column_name = 'days_added'
    ) THEN
        -- If both fields exist, transfer days_added to leave_days_added if the latter is null
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'in_lieu_records' AND column_name = 'leave_days_added'
        ) THEN
            UPDATE in_lieu_records
            SET leave_days_added = days_added
            WHERE leave_days_added IS NULL AND days_added IS NOT NULL;
            
            -- Add constraint: leave_days_added must be populated
            ALTER TABLE in_lieu_records
            ALTER COLUMN leave_days_added SET NOT NULL;
            
            -- Log the change
            RAISE NOTICE 'Transferred data from days_added to leave_days_added where needed';
        ELSE
            -- If leave_days_added doesn't exist, create it
            ALTER TABLE in_lieu_records ADD COLUMN leave_days_added DECIMAL(10,2);
            
            -- Copy data from days_added to leave_days_added
            UPDATE in_lieu_records SET leave_days_added = days_added;
            
            -- Add not null constraint
            ALTER TABLE in_lieu_records ALTER COLUMN leave_days_added SET NOT NULL;
            
            RAISE NOTICE 'Created leave_days_added and copied data from days_added';
        END IF;
    END IF;
    
    -- Ensure status column exists and has proper default
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'in_lieu_records' AND column_name = 'status'
    ) THEN
        ALTER TABLE in_lieu_records ADD COLUMN status VARCHAR(50) DEFAULT 'approved';
        UPDATE in_lieu_records SET status = 'approved' WHERE status IS NULL;
        RAISE NOTICE 'Added status column to in_lieu_records';
    END IF;
    
    -- Refresh the schema cache to ensure changes are visible
    BEGIN
        NOTIFY pgrst, 'reload schema';
        
        IF EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = 'refresh_schema_cache'
        ) THEN
            PERFORM refresh_schema_cache();
            RAISE NOTICE 'Schema cache refreshed';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error refreshing schema cache: %', SQLERRM;
    END;

    RAISE NOTICE '✅ In-lieu records migration completed successfully';
END;
$$; 