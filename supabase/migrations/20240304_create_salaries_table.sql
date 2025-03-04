-- Create salaries table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.salaries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id),
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
    UNIQUE(employee_id, month)
);

-- Add RLS policies
ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own salaries
CREATE POLICY "Users can read own salaries"
    ON public.salaries
    FOR SELECT
    TO authenticated
    USING (auth.uid() = employee_id);

-- Allow users to insert their own salaries
CREATE POLICY "Users can insert own salaries"
    ON public.salaries
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = employee_id);

-- Allow users to update their own salaries
CREATE POLICY "Users can update own salaries"
    ON public.salaries
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = employee_id)
    WITH CHECK (auth.uid() = employee_id);

-- Create function to update updated_at on changes
CREATE OR REPLACE FUNCTION update_salaries_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('UTC', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_salaries_updated_at
    BEFORE UPDATE ON public.salaries
    FOR EACH ROW
    EXECUTE FUNCTION update_salaries_updated_at_column();

-- Force a schema cache refresh
SELECT pg_notify('pgrst', 'reload schema'); 