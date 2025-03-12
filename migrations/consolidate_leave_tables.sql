-- SQL Migration to consolidate leave tables
-- This migration will:
-- 1. Ensure the "leaves" table exists with all required columns
-- 2. Copy data from leave_requests to leaves if leave_requests exists
-- 3. Drop the leave_requests table when all data is migrated

-- First, check if the leaves table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leaves') THEN
        CREATE TABLE public.leaves (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            days_taken NUMERIC(5,1) NOT NULL,
            reason TEXT,
            leave_type TEXT NOT NULL,
            year INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'Approved',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Add RLS policies
        ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

        -- Policy for users to read their own leaves
        CREATE POLICY "Users can view their own leaves" 
            ON public.leaves FOR SELECT 
            USING (auth.uid() = employee_id);

        -- Policy for users to insert their own leaves
        CREATE POLICY "Users can insert their own leaves" 
            ON public.leaves FOR INSERT 
            WITH CHECK (auth.uid() = employee_id);

        -- Policy for users to update their own leaves
        CREATE POLICY "Users can update their own leaves" 
            ON public.leaves FOR UPDATE 
            USING (auth.uid() = employee_id);

        -- Policy for users to delete their own leaves
        CREATE POLICY "Users can delete their own leaves" 
            ON public.leaves FOR DELETE 
            USING (auth.uid() = employee_id);
            
        RAISE NOTICE 'Created leaves table';
    ELSE
        -- Ensure all required columns exist
        BEGIN
            ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column employee_id already exists in leaves';
        END;
        
        BEGIN
            ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS start_date DATE NOT NULL;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column start_date already exists in leaves';
        END;
        
        BEGIN
            ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS end_date DATE NOT NULL;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column end_date already exists in leaves';
        END;
        
        BEGIN
            ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS days_taken NUMERIC(5,1) NOT NULL;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column days_taken already exists in leaves';
        END;
        
        BEGIN
            ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS reason TEXT;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column reason already exists in leaves';
        END;
        
        BEGIN
            ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS leave_type TEXT NOT NULL;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column leave_type already exists in leaves';
        END;
        
        BEGIN
            ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS year INTEGER NOT NULL;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column year already exists in leaves';
        END;
        
        BEGIN
            ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Approved';
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column status already exists in leaves';
        END;
        
        BEGIN
            ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column created_at already exists in leaves';
        END;
        
        BEGIN
            ALTER TABLE public.leaves ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column updated_at already exists in leaves';
        END;
        
        RAISE NOTICE 'Updated leaves table with any missing columns';
    END IF;
END
$$;

-- Next, check if leave_requests table exists, if so migrate data to leaves
DO $$
DECLARE
    migration_count INTEGER;
    column_exists BOOLEAN;
    days_column_name TEXT;
    year_column_exists BOOLEAN;
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leave_requests') THEN
        -- Check the actual structure of the leave_requests table
        RAISE NOTICE 'Checking leave_requests table structure...';
        
        -- First, check if days column exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'leave_requests' 
            AND column_name = 'days'
        ) INTO column_exists;
        
        IF column_exists THEN
            days_column_name := 'days';
            RAISE NOTICE 'Found column: days';
        ELSE
            -- Check if days_taken exists
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'leave_requests' 
                AND column_name = 'days_taken'
            ) INTO column_exists;
            
            IF column_exists THEN
                days_column_name := 'days_taken';
                RAISE NOTICE 'Found column: days_taken';
            ELSE
                -- Check for duration
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = 'leave_requests' 
                    AND column_name = 'duration'
                ) INTO column_exists;
                
                IF column_exists THEN
                    days_column_name := 'duration';
                    RAISE NOTICE 'Found column: duration';
                ELSE
                    -- Default to 1 day if no column found
                    days_column_name := NULL;
                    RAISE NOTICE 'No days/duration column found - will use default of 1 day';
                END IF;
            END IF;
        END IF;
        
        -- Check if year column exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'leave_requests' 
            AND column_name = 'year'
        ) INTO year_column_exists;
        
        IF year_column_exists THEN
            RAISE NOTICE 'Found column: year';
        ELSE
            RAISE NOTICE 'Year column not found - will extract year from start_date';
        END IF;
        
        -- Insert data from leave_requests into leaves, using the correct column names or default values
        IF days_column_name IS NOT NULL AND year_column_exists THEN
            EXECUTE format('
                INSERT INTO public.leaves (
                    employee_id, start_date, end_date, days_taken, reason, leave_type, year, status
                )
                SELECT 
                    lr.employee_id, 
                    lr.start_date, 
                    lr.end_date, 
                    lr.%I, 
                    lr.reason, 
                    COALESCE(lr.leave_type, ''Annual''), 
                    lr.year, 
                    COALESCE(lr.status, ''Approved'')
                FROM 
                    public.leave_requests lr
                WHERE 
                    NOT EXISTS (
                        SELECT 1 FROM public.leaves l 
                        WHERE 
                            l.employee_id = lr.employee_id AND
                            l.start_date = lr.start_date AND
                            l.end_date = lr.end_date
                    )', days_column_name);
        ELSIF days_column_name IS NOT NULL AND NOT year_column_exists THEN
            EXECUTE format('
                INSERT INTO public.leaves (
                    employee_id, start_date, end_date, days_taken, reason, leave_type, year, status
                )
                SELECT 
                    lr.employee_id, 
                    lr.start_date, 
                    lr.end_date, 
                    lr.%I, 
                    lr.reason, 
                    COALESCE(lr.leave_type, ''Annual''), 
                    EXTRACT(YEAR FROM lr.start_date)::INTEGER, 
                    COALESCE(lr.status, ''Approved'')
                FROM 
                    public.leave_requests lr
                WHERE 
                    NOT EXISTS (
                        SELECT 1 FROM public.leaves l 
                        WHERE 
                            l.employee_id = lr.employee_id AND
                            l.start_date = lr.start_date AND
                            l.end_date = lr.end_date
                    )', days_column_name);
        ELSIF days_column_name IS NULL AND year_column_exists THEN
            EXECUTE '
                INSERT INTO public.leaves (
                    employee_id, start_date, end_date, days_taken, reason, leave_type, year, status
                )
                SELECT 
                    lr.employee_id, 
                    lr.start_date, 
                    lr.end_date, 
                    1, -- Default to 1 day
                    lr.reason, 
                    COALESCE(lr.leave_type, ''Annual''), 
                    lr.year, 
                    COALESCE(lr.status, ''Approved'')
                FROM 
                    public.leave_requests lr
                WHERE 
                    NOT EXISTS (
                        SELECT 1 FROM public.leaves l 
                        WHERE 
                            l.employee_id = lr.employee_id AND
                            l.start_date = lr.start_date AND
                            l.end_date = lr.end_date
                    )';
        ELSE
            -- No days column and no year column
            EXECUTE '
                INSERT INTO public.leaves (
                    employee_id, start_date, end_date, days_taken, reason, leave_type, year, status
                )
                SELECT 
                    lr.employee_id, 
                    lr.start_date, 
                    lr.end_date, 
                    1, -- Default to 1 day
                    lr.reason, 
                    COALESCE(lr.leave_type, ''Annual''), 
                    EXTRACT(YEAR FROM lr.start_date)::INTEGER, 
                    COALESCE(lr.status, ''Approved'')
                FROM 
                    public.leave_requests lr
                WHERE 
                    NOT EXISTS (
                        SELECT 1 FROM public.leaves l 
                        WHERE 
                            l.employee_id = lr.employee_id AND
                            l.start_date = lr.start_date AND
                            l.end_date = lr.end_date
                    )';
        END IF;
            
        GET DIAGNOSTICS migration_count = ROW_COUNT;
        RAISE NOTICE 'Migrated % records from leave_requests to leaves', migration_count;
        
        -- Optionally, drop the leave_requests table
        -- Uncomment the following line once you've verified the migration worked correctly
        -- DROP TABLE public.leave_requests;
        -- RAISE NOTICE 'Dropped leave_requests table';
    ELSE
        RAISE NOTICE 'leave_requests table does not exist, no migration needed';
    END IF;
END
$$; 