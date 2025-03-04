-- Create salary_calculations table
CREATE TABLE salary_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
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
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_salary_calculations_modtime
BEFORE UPDATE ON salary_calculations
FOR EACH ROW
EXECUTE FUNCTION update_modified_column(); 