-- Create a deductions table for storing all types of deductions
CREATE TABLE IF NOT EXISTS deductions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  salary_id UUID REFERENCES public.salary_calculations(id) ON DELETE CASCADE,
  deduction_name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  deduction_type TEXT NOT NULL,
  is_permanent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create an index for faster queries by employee_id
CREATE INDEX IF NOT EXISTS idx_deductions_employee_id ON deductions(employee_id);

-- Create an index for faster queries by salary_id
CREATE INDEX IF NOT EXISTS idx_deductions_salary_id ON deductions(salary_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE deductions ENABLE ROW LEVEL SECURITY;

-- Policy for users to select only their own deductions
CREATE POLICY select_own_deductions ON deductions
  FOR SELECT USING (
    auth.uid() = employee_id
  );

-- Policy for users to insert only their own deductions
CREATE POLICY insert_own_deductions ON deductions
  FOR INSERT WITH CHECK (
    auth.uid() = employee_id
  );

-- Policy for users to update only their own deductions
CREATE POLICY update_own_deductions ON deductions
  FOR UPDATE USING (
    auth.uid() = employee_id
  );

-- Policy for users to delete only their own deductions
CREATE POLICY delete_own_deductions ON deductions
  FOR DELETE USING (
    auth.uid() = employee_id
  );

-- Create a trigger to update the updated_at timestamp
CREATE TRIGGER update_deductions_updated_at
BEFORE UPDATE ON deductions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
