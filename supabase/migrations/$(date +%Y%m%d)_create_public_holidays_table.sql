-- Create public_holidays table
CREATE TABLE public_holidays (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT,
  leave_credit NUMERIC(5,2) NOT NULL DEFAULT 0.67,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;

-- Policy for employees to manage their own public holidays
CREATE POLICY "Employees can manage their own public holidays" 
ON public_holidays 
FOR ALL 
USING (auth.uid() = employee_id);

-- Optional: Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_public_holidays_modtime
BEFORE UPDATE ON public_holidays
FOR EACH ROW
EXECUTE FUNCTION update_modified_column(); 