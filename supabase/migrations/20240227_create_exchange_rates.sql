-- Create exchange_rates table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rate DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now())
);

-- Add RLS policies
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anyone to read exchange rates" ON public.exchange_rates;
DROP POLICY IF EXISTS "Allow admins to insert exchange rates" ON public.exchange_rates;

-- Allow anyone to read exchange rates
CREATE POLICY "Allow anyone to read exchange rates"
    ON public.exchange_rates
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow only admins to insert exchange rates
CREATE POLICY "Allow admins to insert exchange rates"
    ON public.exchange_rates
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE id = auth.uid()
            AND is_admin = true
        )
    ); 