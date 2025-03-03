-- Create permanent_deductions table
CREATE TABLE permanent_deductions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  custom_name VARCHAR(255),
  amount NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE permanent_deductions ENABLE ROW LEVEL SECURITY;

-- Policy for employees to manage their own permanent deductions
CREATE POLICY "Employees can manage their own permanent deductions" 
ON permanent_deductions 
FOR ALL 
USING (auth.uid() = employee_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_permanent_deductions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_permanent_deductions_modtime
BEFORE UPDATE ON permanent_deductions
FOR EACH ROW
EXECUTE FUNCTION update_permanent_deductions_timestamp(); 