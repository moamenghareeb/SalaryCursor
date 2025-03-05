-- Create leave_requests table
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INTEGER NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now())
);

-- Add RLS policies
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own leave requests
CREATE POLICY "Users can read own leave_requests"
ON public.leave_requests
FOR SELECT
TO authenticated
USING (auth.uid() = employee_id);

-- Create policy for users to insert their own leave requests
CREATE POLICY "Users can insert own leave_requests"
ON public.leave_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = employee_id);

-- Create policy for users to update their own leave requests
CREATE POLICY "Users can update own leave_requests"
ON public.leave_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = employee_id)
WITH CHECK (auth.uid() = employee_id);

-- Create policy for users to delete their own leave requests
CREATE POLICY "Users can delete own leave_requests"
ON public.leave_requests
FOR DELETE
TO authenticated
USING (auth.uid() = employee_id);

-- Create triggers for updated_at column
CREATE OR REPLACE FUNCTION update_leave_requests_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION update_leave_requests_updated_at_column();

-- Force a schema cache refresh
SELECT pg_notify('pgrst', 'reload schema'); 