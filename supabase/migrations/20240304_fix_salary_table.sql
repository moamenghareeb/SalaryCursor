-- Check if salaries table exists, if not create it based on salary_calculations
DO $$ 
BEGIN
    -- Create salaries table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'salaries') THEN
        CREATE TABLE salaries (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            employee_id UUID REFERENCES employees(id),
            month DATE,
            basic_salary NUMERIC DEFAULT 0,
            cost_of_living NUMERIC DEFAULT 0,
            shift_allowance NUMERIC DEFAULT 0,
            overtime_hours NUMERIC DEFAULT 0,
            overtime_pay NUMERIC DEFAULT 0,
            variable_pay NUMERIC DEFAULT 0,
            act_as_pay NUMERIC DEFAULT 0,
            pension_plan NUMERIC DEFAULT 0,
            retroactive_deduction NUMERIC DEFAULT 0,
            premium_card_deduction NUMERIC DEFAULT 0,
            mobile_deduction NUMERIC DEFAULT 0,
            absences NUMERIC DEFAULT 0,
            sick_leave NUMERIC DEFAULT 0,
            total_salary NUMERIC DEFAULT 0,
            exchange_rate NUMERIC DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add a trigger to update the updated_at column
        CREATE TRIGGER update_salaries_modtime
        BEFORE UPDATE ON salaries
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();
    ELSE
        -- If table exists, make sure all required columns exist
        DO $$ 
        BEGIN
            -- Add all columns that might be missing
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'salaries' AND column_name = 'absences') THEN
                ALTER TABLE salaries ADD COLUMN absences NUMERIC DEFAULT 0;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'salaries' AND column_name = 'sick_leave') THEN
                ALTER TABLE salaries ADD COLUMN sick_leave NUMERIC DEFAULT 0;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'salaries' AND column_name = 'act_as_pay') THEN
                ALTER TABLE salaries ADD COLUMN act_as_pay NUMERIC DEFAULT 0;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'salaries' AND column_name = 'pension_plan') THEN
                ALTER TABLE salaries ADD COLUMN pension_plan NUMERIC DEFAULT 0;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'salaries' AND column_name = 'retroactive_deduction') THEN
                ALTER TABLE salaries ADD COLUMN retroactive_deduction NUMERIC DEFAULT 0;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'salaries' AND column_name = 'premium_card_deduction') THEN
                ALTER TABLE salaries ADD COLUMN premium_card_deduction NUMERIC DEFAULT 0;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'salaries' AND column_name = 'mobile_deduction') THEN
                ALTER TABLE salaries ADD COLUMN mobile_deduction NUMERIC DEFAULT 0;
            END IF;
        END $$;
    END IF;
END $$;

-- Force a schema cache refresh
SELECT pg_notify('pgrst', 'reload schema'); 