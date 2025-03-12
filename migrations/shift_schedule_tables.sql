-- Create shift_overrides table
CREATE TABLE IF NOT EXISTS public.shift_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- Add shift_group and schedule_type columns to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS shift_group TEXT,
ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'regular';

-- Create RLS policies
ALTER TABLE public.shift_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shift overrides"
  ON public.shift_overrides
  FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Users can insert their own shift overrides"
  ON public.shift_overrides
  FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Users can update their own shift overrides"
  ON public.shift_overrides
  FOR UPDATE
  USING (auth.uid() = employee_id);

CREATE POLICY "Users can delete their own shift overrides"
  ON public.shift_overrides
  FOR DELETE
  USING (auth.uid() = employee_id); 