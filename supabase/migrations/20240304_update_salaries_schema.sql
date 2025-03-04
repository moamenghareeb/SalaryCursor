-- Add missing columns to salaries table if they don't exist
ALTER TABLE public.salaries
ADD COLUMN IF NOT EXISTS absences NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sick_leave NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS act_as_pay NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pension_plan NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS retroactive_deduction NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS premium_card_deduction NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS mobile_deduction NUMERIC DEFAULT 0;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema'; 