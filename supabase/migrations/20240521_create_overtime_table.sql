-- Create overtime table
CREATE TABLE IF NOT EXISTS public.overtime (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    date DATE NOT NULL,
    hours DECIMAL(10,2) NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'schedule' or 'manual'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
    UNIQUE(employee_id, date)
);

-- Add RLS policies
ALTER TABLE public.overtime ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own overtime records
CREATE POLICY "Users can read own overtime records"
    ON public.overtime
    FOR SELECT
    TO authenticated
    USING (auth.uid() = employee_id);

-- Allow users to insert their own overtime records
CREATE POLICY "Users can insert own overtime records"
    ON public.overtime
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = employee_id);

-- Allow users to update their own overtime records
CREATE POLICY "Users can update own overtime records"
    ON public.overtime
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = employee_id)
    WITH CHECK (auth.uid() = employee_id);

-- Create function to update updated_at on changes
CREATE OR REPLACE FUNCTION update_overtime_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('UTC', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_overtime_updated_at
    BEFORE UPDATE ON public.overtime
    FOR EACH ROW
    EXECUTE FUNCTION update_overtime_updated_at_column();

-- Create function to calculate monthly overtime total
CREATE OR REPLACE FUNCTION calculate_monthly_overtime_total(
    p_employee_id UUID,
    p_month DATE
)
RETURNS DECIMAL AS $$
DECLARE
    v_total DECIMAL;
BEGIN
    SELECT COALESCE(SUM(hours), 0)
    INTO v_total
    FROM public.overtime
    WHERE employee_id = p_employee_id
    AND date >= date_trunc('month', p_month)
    AND date < date_trunc('month', p_month) + interval '1 month';
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql; 