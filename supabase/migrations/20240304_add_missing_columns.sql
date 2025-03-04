-- Add missing columns to salaries table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salaries' AND column_name = 'absences') THEN
        ALTER TABLE salaries ADD COLUMN absences numeric DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salaries' AND column_name = 'sick_leave') THEN
        ALTER TABLE salaries ADD COLUMN sick_leave numeric DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salaries' AND column_name = 'act_as_pay') THEN
        ALTER TABLE salaries ADD COLUMN act_as_pay numeric DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salaries' AND column_name = 'pension_plan') THEN
        ALTER TABLE salaries ADD COLUMN pension_plan numeric DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salaries' AND column_name = 'retroactive_deduction') THEN
        ALTER TABLE salaries ADD COLUMN retroactive_deduction numeric DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salaries' AND column_name = 'premium_card_deduction') THEN
        ALTER TABLE salaries ADD COLUMN premium_card_deduction numeric DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salaries' AND column_name = 'mobile_deduction') THEN
        ALTER TABLE salaries ADD COLUMN mobile_deduction numeric DEFAULT 0;
    END IF;
END $$;

-- Force a schema cache refresh
SELECT pg_notify('pgrst', 'reload schema'); 