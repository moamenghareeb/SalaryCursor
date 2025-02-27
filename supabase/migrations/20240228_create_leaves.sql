-- Create leaves table
CREATE TABLE IF NOT EXISTS public.leaves (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_taken DECIMAL(5,2) NOT NULL,
    reason TEXT NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now())
);

-- Add RLS policies
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own leaves" ON public.leaves;
DROP POLICY IF EXISTS "Users can insert own leaves" ON public.leaves;
DROP POLICY IF EXISTS "Users can update own leaves" ON public.leaves;

-- Allow users to read their own leaves
CREATE POLICY "Users can read own leaves"
    ON public.leaves
    FOR SELECT
    TO authenticated
    USING (auth.uid() = employee_id);

-- Allow users to insert their own leaves
CREATE POLICY "Users can insert own leaves"
    ON public.leaves
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = employee_id);

-- Allow users to update their own leaves
CREATE POLICY "Users can update own leaves"
    ON public.leaves
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = employee_id)
    WITH CHECK (auth.uid() = employee_id);

-- Create function to update updated_at on changes
CREATE OR REPLACE FUNCTION update_leaves_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('UTC', now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_leaves_updated_at
    BEFORE UPDATE ON public.leaves
    FOR EACH ROW
    EXECUTE FUNCTION update_leaves_updated_at_column(); 