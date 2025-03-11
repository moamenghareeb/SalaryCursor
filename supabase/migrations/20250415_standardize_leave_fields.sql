-- Migration to standardize leave record fields
-- Specifically focusing on using days_taken as the standard field

DO $$
BEGIN
    -- Ensure consistent field naming in leaves table
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leaves' AND column_name = 'days'
    ) THEN
        -- If both fields exist, transfer days to days_taken if the latter is null
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'leaves' AND column_name = 'days_taken'
        ) THEN
            UPDATE leaves
            SET days_taken = days
            WHERE days_taken IS NULL AND days IS NOT NULL;
            
            -- Add constraint: days_taken must be populated
            ALTER TABLE leaves
            ALTER COLUMN days_taken SET NOT NULL;
            
            RAISE NOTICE 'Transferred data from days to days_taken where needed';
        ELSE
            -- If days_taken doesn't exist, create it
            ALTER TABLE leaves ADD COLUMN days_taken DECIMAL(10,2);
            
            -- Copy data from days to days_taken
            UPDATE leaves SET days_taken = days;
            
            -- Add not null constraint
            ALTER TABLE leaves ALTER COLUMN days_taken SET NOT NULL;
            
            RAISE NOTICE 'Created days_taken and copied data from days';
        END IF;
    END IF;
    
    -- Ensure leave_type column exists and has proper default
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leaves' AND column_name = 'leave_type'
    ) THEN
        ALTER TABLE leaves ADD COLUMN leave_type VARCHAR(50) DEFAULT 'Annual';
        UPDATE leaves SET leave_type = 'Annual' WHERE leave_type IS NULL;
        RAISE NOTICE 'Added leave_type column to leaves';
    END IF;
    
    -- Ensure status column exists and has proper default
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leaves' AND column_name = 'status'
    ) THEN
        ALTER TABLE leaves ADD COLUMN status VARCHAR(50) DEFAULT 'approved';
        UPDATE leaves SET status = 'approved' WHERE status IS NULL;
        RAISE NOTICE 'Added status column to leaves';
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

    RAISE NOTICE '✅ Leave records migration completed successfully';
END;
$$; 