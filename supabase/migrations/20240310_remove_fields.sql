-- Migration to remove unused fields from salaries and salary_calculations tables

-- Check if tables exist before modifying
DO $$
BEGIN
    -- Remove columns from salaries table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'salaries') THEN
        -- Remove pension_plan column if it exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'salaries' 
            AND column_name = 'pension_plan'
        ) THEN
            ALTER TABLE salaries DROP COLUMN pension_plan;
            RAISE NOTICE 'Removed pension_plan column from salaries table';
        ELSE
            RAISE NOTICE 'pension_plan column does not exist in salaries table';
        END IF;
        
        -- Remove premium_card_deduction column if it exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'salaries' 
            AND column_name = 'premium_card_deduction'
        ) THEN
            ALTER TABLE salaries DROP COLUMN premium_card_deduction;
            RAISE NOTICE 'Removed premium_card_deduction column from salaries table';
        ELSE
            RAISE NOTICE 'premium_card_deduction column does not exist in salaries table';
        END IF;
        
        -- Remove mobile_deduction column if it exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'salaries' 
            AND column_name = 'mobile_deduction'
        ) THEN
            ALTER TABLE salaries DROP COLUMN mobile_deduction;
            RAISE NOTICE 'Removed mobile_deduction column from salaries table';
        ELSE
            RAISE NOTICE 'mobile_deduction column does not exist in salaries table';
        END IF;
        
        -- Remove absences column if it exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'salaries' 
            AND column_name = 'absences'
        ) THEN
            ALTER TABLE salaries DROP COLUMN absences;
            RAISE NOTICE 'Removed absences column from salaries table';
        ELSE
            RAISE NOTICE 'absences column does not exist in salaries table';
        END IF;
        
        -- Remove sick_leave column if it exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'salaries' 
            AND column_name = 'sick_leave'
        ) THEN
            ALTER TABLE salaries DROP COLUMN sick_leave;
            RAISE NOTICE 'Removed sick_leave column from salaries table';
        ELSE
            RAISE NOTICE 'sick_leave column does not exist in salaries table';
        END IF;
    ELSE
        RAISE NOTICE 'salaries table does not exist';
    END IF;
    
    -- Remove columns from salary_calculations table if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'salary_calculations'
    ) THEN
        -- Remove pension_plan column if it exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'salary_calculations' 
            AND column_name = 'pension_plan'
        ) THEN
            ALTER TABLE salary_calculations DROP COLUMN pension_plan;
            RAISE NOTICE 'Removed pension_plan column from salary_calculations table';
        ELSE
            RAISE NOTICE 'pension_plan column does not exist in salary_calculations table';
        END IF;
        
        -- Remove premium_card_deduction column if it exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'salary_calculations' 
            AND column_name = 'premium_card_deduction'
        ) THEN
            ALTER TABLE salary_calculations DROP COLUMN premium_card_deduction;
            RAISE NOTICE 'Removed premium_card_deduction column from salary_calculations table';
        ELSE
            RAISE NOTICE 'premium_card_deduction column does not exist in salary_calculations table';
        END IF;
        
        -- Remove mobile_deduction column if it exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'salary_calculations' 
            AND column_name = 'mobile_deduction'
        ) THEN
            ALTER TABLE salary_calculations DROP COLUMN mobile_deduction;
            RAISE NOTICE 'Removed mobile_deduction column from salary_calculations table';
        ELSE
            RAISE NOTICE 'mobile_deduction column does not exist in salary_calculations table';
        END IF;
        
        -- Remove absences column if it exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'salary_calculations' 
            AND column_name = 'absences'
        ) THEN
            ALTER TABLE salary_calculations DROP COLUMN absences;
            RAISE NOTICE 'Removed absences column from salary_calculations table';
        ELSE
            RAISE NOTICE 'absences column does not exist in salary_calculations table';
        END IF;
        
        -- Remove sick_leave column if it exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'salary_calculations' 
            AND column_name = 'sick_leave'
        ) THEN
            ALTER TABLE salary_calculations DROP COLUMN sick_leave;
            RAISE NOTICE 'Removed sick_leave column from salary_calculations table';
        ELSE
            RAISE NOTICE 'sick_leave column does not exist in salary_calculations table';
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
    
    -- Rename retroactive_deduction to deduction in salaries table
    ALTER TABLE IF EXISTS salaries RENAME COLUMN retroactive_deduction TO deduction;

    -- Rename retroactive_deduction to deduction in salary_calculations table
    ALTER TABLE IF EXISTS salary_calculations RENAME COLUMN retroactive_deduction TO deduction;

    -- Update any views or functions that refer to the old column
    -- (Add more statements as needed if there are views or functions referencing this column)
    
    RAISE NOTICE '✅ Migration completed successfully';
END;
$$; 