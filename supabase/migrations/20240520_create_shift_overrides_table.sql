-- Create shift_overrides table
CREATE TABLE IF NOT EXISTS public.shift_overrides (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    date DATE NOT NULL,
    shift_type TEXT NOT NULL,
    source TEXT, -- Optional field to track where the override came from (e.g., 'leave_sync')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('UTC', now()),
    UNIQUE(employee_id, date)
);

-- Add RLS policies
ALTER TABLE public.shift_overrides ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own shift_overrides
CREATE POLICY "Users can read own shift_overrides"
ON public.shift_overrides
FOR SELECT
TO authenticated
USING (auth.uid() = employee_id);

-- Create policy for users to insert their own shift_overrides
CREATE POLICY "Users can insert own shift_overrides"
ON public.shift_overrides
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = employee_id);

-- Create policy for users to update their own shift_overrides
CREATE POLICY "Users can update own shift_overrides"
ON public.shift_overrides
FOR UPDATE
TO authenticated
USING (auth.uid() = employee_id)
WITH CHECK (auth.uid() = employee_id);

-- Create policy for users to delete their own shift_overrides
CREATE POLICY "Users can delete own shift_overrides"
ON public.shift_overrides
FOR DELETE
TO authenticated
USING (auth.uid() = employee_id);

-- Create triggers for updated_at column
CREATE OR REPLACE FUNCTION update_shift_overrides_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shift_overrides_updated_at
BEFORE UPDATE ON public.shift_overrides
FOR EACH ROW
EXECUTE FUNCTION update_shift_overrides_updated_at_column();

-- Add source column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  -- Check if the column exists and add it if it doesn't
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'shift_overrides' 
    AND column_name = 'source'
  ) THEN
    ALTER TABLE public.shift_overrides ADD COLUMN source TEXT;
  END IF;
END $$;

-- Force a schema cache refresh
SELECT pg_notify('pgrst', 'reload schema'); 