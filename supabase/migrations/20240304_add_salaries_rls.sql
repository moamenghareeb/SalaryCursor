-- Enable RLS on salaries table
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

-- Allow users to delete their own salaries
CREATE POLICY "Users can delete own salaries"
    ON public.salaries
    FOR DELETE
    TO authenticated
    USING (auth.uid() = employee_id); 