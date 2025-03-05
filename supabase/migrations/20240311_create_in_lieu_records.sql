-- Create in_lieu_records table
CREATE TABLE IF NOT EXISTS public.in_lieu_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INTEGER NOT NULL,
    leave_days_added DECIMAL(10,3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now())
);

-- Add RLS policies
ALTER TABLE public.in_lieu_records ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own records
CREATE POLICY "Users can read own in_lieu_records"
    ON public.in_lieu_records
    FOR SELECT
    TO authenticated
    USING (auth.uid() = employee_id);

-- Allow users to insert their own records
CREATE POLICY "Users can insert own in_lieu_records"
    ON public.in_lieu_records
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = employee_id); 