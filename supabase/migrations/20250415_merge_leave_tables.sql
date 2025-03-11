-- Migration to merge leaves and leave_requests tables
-- This will ensure all leave requests are properly recorded in the leaves table

DO $$
DECLARE
    leave_requests_exists BOOLEAN;
BEGIN
    -- Check if leave_requests table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'leave_requests'
    ) INTO leave_requests_exists;
    
    IF leave_requests_exists THEN
        -- Insert missing records from leave_requests into leaves
        INSERT INTO leaves (
            employee_id,
            days_taken,
            leave_type,
            status,
            start_date,
            end_date,
            created_at,
            updated_at
        )
        SELECT 
            lr.employee_id,
            lr.days_requested as days_taken,
            COALESCE(lr.leave_type, 'Annual') as leave_type,
            lr.status,
            lr.start_date,
            lr.end_date,
            lr.created_at,
            lr.updated_at
        FROM leave_requests lr
        WHERE NOT EXISTS (
            SELECT 1 FROM leaves l
            WHERE l.employee_id = lr.employee_id
            AND l.start_date = lr.start_date
            AND l.end_date = lr.end_date
        );
        
        -- Create backup of leave_requests table
        CREATE TABLE IF NOT EXISTS leave_requests_backup AS
        SELECT * FROM leave_requests;
        
        -- Drop the original leave_requests table
        DROP TABLE leave_requests;
        
        RAISE NOTICE '✅ Successfully merged leave_requests into leaves and created backup';
    ELSE
        RAISE NOTICE 'leave_requests table does not exist, no merge needed';
    END IF;
    
    -- Add indexes to improve query performance
    CREATE INDEX IF NOT EXISTS idx_leaves_employee_id ON leaves(employee_id);
    CREATE INDEX IF NOT EXISTS idx_leaves_dates ON leaves(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
    
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

    RAISE NOTICE '✅ Leave tables merge migration completed successfully';
END;
$$; 