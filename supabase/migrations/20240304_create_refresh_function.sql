-- Create a function to refresh the schema cache
CREATE OR REPLACE FUNCTION refresh_schema_cache()
RETURNS boolean AS $$
BEGIN
    -- Force a schema cache refresh by notifying the PostgREST server
    PERFORM pg_notify('pgrst', 'reload schema');
    
    -- Make sure the 'absences' column exists in the 'salaries' table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'absences'
    ) THEN
        ALTER TABLE salaries ADD COLUMN absences NUMERIC DEFAULT 0;
    END IF;

    -- Make sure the 'sick_leave' column exists in the 'salaries' table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'sick_leave'
    ) THEN
        ALTER TABLE salaries ADD COLUMN sick_leave NUMERIC DEFAULT 0;
    END IF;

    -- Make sure the 'act_as_pay' column exists in the 'salaries' table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'act_as_pay'
    ) THEN
        ALTER TABLE salaries ADD COLUMN act_as_pay NUMERIC DEFAULT 0;
    END IF;

    -- Make sure the 'pension_plan' column exists in the 'salaries' table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'pension_plan'
    ) THEN
        ALTER TABLE salaries ADD COLUMN pension_plan NUMERIC DEFAULT 0;
    END IF;

    -- Make sure the 'retroactive_deduction' column exists in the 'salaries' table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'retroactive_deduction'
    ) THEN
        ALTER TABLE salaries ADD COLUMN retroactive_deduction NUMERIC DEFAULT 0;
    END IF;

    -- Make sure the 'premium_card_deduction' column exists in the 'salaries' table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'premium_card_deduction'
    ) THEN
        ALTER TABLE salaries ADD COLUMN premium_card_deduction NUMERIC DEFAULT 0;
    END IF;

    -- Make sure the 'mobile_deduction' column exists in the 'salaries' table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'mobile_deduction'
    ) THEN
        ALTER TABLE salaries ADD COLUMN mobile_deduction NUMERIC DEFAULT 0;
    END IF;

    -- Force another schema cache refresh to ensure changes are picked up
    PERFORM pg_notify('pgrst', 'reload schema');
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 