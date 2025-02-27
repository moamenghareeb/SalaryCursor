-- Create salary_calculations table
CREATE TABLE IF NOT EXISTS public.salary_calculations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    basic_salary DECIMAL(10,2) NOT NULL,
    cost_of_living DECIMAL(10,2) NOT NULL,
    shift_allowance DECIMAL(10,2) NOT NULL,
    overtime_hours DECIMAL(10,2) NOT NULL,
    overtime_pay DECIMAL(10,2) NOT NULL,
    variable_pay DECIMAL(10,2) NOT NULL,
    total_salary DECIMAL(10,2) NOT NULL,
    exchange_rate DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now())
);

-- Add RLS policies
ALTER TABLE public.salary_calculations ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own calculations
CREATE POLICY "Users can read own salary calculations"
    ON public.salary_calculations
    FOR SELECT
    TO authenticated
    USING (auth.uid() = employee_id);

-- Allow users to insert their own calculations
CREATE POLICY "Users can insert own salary calculations"
    ON public.salary_calculations
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = employee_id);

-- Allow users to update their own calculations
CREATE POLICY "Users can update own salary calculations"
    ON public.salary_calculations
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = employee_id)
    WITH CHECK (auth.uid() = employee_id);

-- Create function to update updated_at on changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('UTC', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_salary_calculations_updated_at
    BEFORE UPDATE ON public.salary_calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 