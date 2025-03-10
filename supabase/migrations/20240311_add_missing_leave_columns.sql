-- Migration to add missing columns for leave functionality
-- This addresses the schema cache errors in the application

-- Add leave_type and status columns to leaves table
DO $$
BEGIN
    -- Add leave_type column if it doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leaves') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'leaves' 
            AND column_name = 'leave_type'
        ) THEN
            ALTER TABLE leaves ADD COLUMN leave_type VARCHAR(50) DEFAULT 'Annual';
            RAISE NOTICE 'Added leave_type column to leaves table';
        ELSE
            RAISE NOTICE 'leave_type column already exists in leaves table';
        END IF;
        
        -- Add status column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'leaves' 
            AND column_name = 'status'
        ) THEN
            ALTER TABLE leaves ADD COLUMN status VARCHAR(50) DEFAULT 'approved';
            RAISE NOTICE 'Added status column to leaves table';
        ELSE
            RAISE NOTICE 'status column already exists in leaves table';
        END IF;
        
        -- Update existing records to have default values
        UPDATE leaves SET 
            leave_type = 'Annual',
            status = 'approved'
        WHERE leave_type IS NULL OR status IS NULL;
    END IF;

    -- Add status column to in_lieu_records table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'in_lieu_records') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'in_lieu_records' 
            AND column_name = 'status'
        ) THEN
            ALTER TABLE in_lieu_records ADD COLUMN status VARCHAR(50) DEFAULT 'approved';
            RAISE NOTICE 'Added status column to in_lieu_records table';
        ELSE
            RAISE NOTICE 'status column already exists in in_lieu_records table';
        END IF;
        
        -- Update existing records to have default values
        UPDATE in_lieu_records SET status = 'approved' WHERE status IS NULL;
    END IF;

    -- Add leave_balance column to employees table if it doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'employees' 
            AND column_name = 'leave_balance'
        ) THEN
            ALTER TABLE employees ADD COLUMN leave_balance NUMERIC DEFAULT 0;
            RAISE NOTICE 'Added leave_balance column to employees table';
        ELSE
            RAISE NOTICE 'leave_balance column already exists in employees table';
        END IF;
    END IF;

    -- Make reason field nullable in leaves table
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'leaves'
        AND column_name = 'reason'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE leaves ALTER COLUMN reason DROP NOT NULL;
        RAISE NOTICE 'Modified reason column to be nullable in leaves table';
    ELSE
        RAISE NOTICE 'reason column is already nullable in leaves table';
    END IF;

    -- Refresh the schema cache to ensure changes are visible
    BEGIN
        -- Method 1: Direct notification
        PERFORM pg_notify('pgrst', 'reload schema');
        
        -- Method 2: Using function if it exists
        IF EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = 'refresh_schema_cache'
        ) THEN
            PERFORM refresh_schema_cache();
        END IF;
        
        RAISE NOTICE 'Schema cache refreshed';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error refreshing schema cache: %', SQLERRM;
    END;

    RAISE NOTICE '✅ Migration completed successfully';
END;
$$; 