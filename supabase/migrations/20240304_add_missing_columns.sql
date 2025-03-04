-- Add missing columns to salaries table if they don't exist
DO $$ 
BEGIN
    -- Add absences column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'absences'
    ) THEN
        ALTER TABLE salaries ADD COLUMN absences NUMERIC DEFAULT 0;
    END IF;

    -- Add sick_leave column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'sick_leave'
    ) THEN
        ALTER TABLE salaries ADD COLUMN sick_leave NUMERIC DEFAULT 0;
    END IF;

    -- Add act_as_pay column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'act_as_pay'
    ) THEN
        ALTER TABLE salaries ADD COLUMN act_as_pay NUMERIC DEFAULT 0;
    END IF;

    -- Add pension_plan column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'pension_plan'
    ) THEN
        ALTER TABLE salaries ADD COLUMN pension_plan NUMERIC DEFAULT 0;
    END IF;

    -- Add retroactive_deduction column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'retroactive_deduction'
    ) THEN
        ALTER TABLE salaries ADD COLUMN retroactive_deduction NUMERIC DEFAULT 0;
    END IF;

    -- Add premium_card_deduction column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'premium_card_deduction'
    ) THEN
        ALTER TABLE salaries ADD COLUMN premium_card_deduction NUMERIC DEFAULT 0;
    END IF;

    -- Add mobile_deduction column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'mobile_deduction'
    ) THEN
        ALTER TABLE salaries ADD COLUMN mobile_deduction NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Force a schema cache refresh
SELECT pg_notify('pgrst', 'reload schema'); 