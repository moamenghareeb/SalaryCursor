-- Create a public holidays table
CREATE TABLE IF NOT EXISTS public_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  description TEXT NOT NULL,
  leave_credit NUMERIC(4,2) DEFAULT 0.67,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Add a unique constraint to prevent duplicate entries for the same employee and date
  UNIQUE(employee_id, holiday_date)
);

-- Create an index for faster queries by employee_id
CREATE INDEX IF NOT EXISTS idx_public_holidays_employee_id ON public_holidays(employee_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;

-- Policy for users to select only their own public holidays
CREATE POLICY select_own_holidays ON public_holidays
  FOR SELECT USING (
    auth.uid() = employee_id
  );

-- Policy for users to insert only their own public holidays
CREATE POLICY insert_own_holidays ON public_holidays
  FOR INSERT WITH CHECK (
    auth.uid() = employee_id
  );

-- Policy for users to update only their own public holidays
CREATE POLICY update_own_holidays ON public_holidays
  FOR UPDATE USING (
    auth.uid() = employee_id
  );

-- Policy for users to delete only their own public holidays
CREATE POLICY delete_own_holidays ON public_holidays
  FOR DELETE USING (
    auth.uid() = employee_id
  );

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_public_holidays_updated_at
BEFORE UPDATE ON public_holidays
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
