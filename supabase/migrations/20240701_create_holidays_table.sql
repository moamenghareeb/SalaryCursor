-- Create a standardized holidays table for the application
CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_official BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Add a unique constraint on date to prevent duplicate entries
  UNIQUE(date)
);

-- Create index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(date);

-- Populate with Egyptian 2025 holidays
INSERT INTO public.holidays (date, name, description, is_official)
VALUES 
  ('2025-01-07', 'Coptic Christmas', 'Coptic Orthodox Christmas Day', TRUE),
  ('2025-01-25', 'Revolution Day', 'Revolution Day / Police Day', TRUE),
  ('2025-03-31', 'Eid el-Fitr (Day 1)', 'First day of Eid el-Fitr', TRUE),
  ('2025-04-01', 'Eid el-Fitr (Day 2)', 'Second day of Eid el-Fitr', TRUE),
  ('2025-04-02', 'Eid el-Fitr (Day 3)', 'Third day of Eid el-Fitr', TRUE),
  ('2025-04-19', 'Coptic Easter', 'Coptic Orthodox Easter', TRUE),
  ('2025-04-20', 'Sham El-Nessim', 'Ancient Egyptian spring festival', TRUE),
  ('2025-04-25', 'Sinai Liberation Day', 'Sinai Liberation Day', TRUE),
  ('2025-05-01', 'Labor Day', 'International Workers'' Day', TRUE),
  ('2025-06-30', 'June 30 Revolution', 'June 30 Revolution Day', TRUE),
  ('2025-07-07', 'Eid al-Adha (Day 1)', 'First day of Eid al-Adha', TRUE),
  ('2025-07-08', 'Eid al-Adha (Day 2)', 'Second day of Eid al-Adha', TRUE),
  ('2025-07-09', 'Eid al-Adha (Day 3)', 'Third day of Eid al-Adha', TRUE),
  ('2025-07-23', 'Revolution Day', 'July 23 Revolution Day', TRUE),
  ('2025-08-06', 'Islamic New Year', 'Islamic New Year', TRUE),
  ('2025-10-06', 'Armed Forces Day', 'Armed Forces Day', TRUE),
  ('2025-10-15', 'Prophet''s Birthday', 'Prophet Muhammad''s Birthday', TRUE),
  ('2025-12-25', 'Christmas Day', 'Christmas Day', TRUE)
ON CONFLICT (date) DO NOTHING;

-- Try to migrate data from the old tables if they exist
DO $$
BEGIN
  -- Check if the old holidays table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'holidays_old') THEN
    -- Copy data from old table to new table
    INSERT INTO public.holidays (date, name, description, is_official)
    SELECT 
      date, 
      name, 
      name as description, 
      TRUE as is_official
    FROM 
      public.holidays_old
    ON CONFLICT (date) DO NOTHING;
    
    -- Optionally drop the old table
    -- DROP TABLE public.holidays_old;
  END IF;
  
  -- Check if the public_holidays table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'public_holidays') THEN
    -- Copy data from public_holidays to holidays
    INSERT INTO public.holidays (date, name, description, is_official)
    SELECT DISTINCT
      holiday_date, 
      description, 
      description, 
      TRUE as is_official
    FROM 
      public.public_holidays
    ON CONFLICT (date) DO NOTHING;
    
    -- We don't drop the public_holidays table since it contains employee-specific data
  END IF;
END $$;

-- Create a function to keep updated_at current
CREATE OR REPLACE FUNCTION update_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_holidays_updated_at_trigger ON public.holidays;
CREATE TRIGGER update_holidays_updated_at_trigger
BEFORE UPDATE ON public.holidays
FOR EACH ROW
EXECUTE FUNCTION update_holidays_updated_at();

-- Force a schema cache refresh
SELECT pg_notify('pgrst', 'reload schema'); 