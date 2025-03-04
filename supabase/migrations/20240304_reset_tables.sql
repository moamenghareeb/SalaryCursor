-- This migration completely resets and recreates both tables with the correct structure
-- First, drop any triggers
DROP TRIGGER IF EXISTS update_salaries_modtime ON salaries;
DROP TRIGGER IF EXISTS update_salary_calculations_modtime ON salary_calculations;

-- Make sure the function exists
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the salaries table
DROP TABLE IF EXISTS salaries CASCADE;

CREATE TABLE salaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    month DATE NOT NULL,
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

-- Add trigger for updated_at
CREATE TRIGGER update_salaries_modtime
BEFORE UPDATE ON salaries
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Create an index on employee_id and month to optimize lookups
CREATE INDEX idx_salaries_employee_month ON salaries(employee_id, month);

-- Force a schema cache refresh
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the structure directly (this will show in logs)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'salaries' 
ORDER BY ordinal_position; 