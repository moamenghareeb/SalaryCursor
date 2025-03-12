-- Create shift_overrides table
CREATE TABLE IF NOT EXISTS public.shift_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift_type TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
  
  -- Check if updated_at column exists and add it if it doesn't
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'shift_overrides' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.shift_overrides ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$; 