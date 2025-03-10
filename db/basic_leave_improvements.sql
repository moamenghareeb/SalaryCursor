-- Basic Leave System Improvements
-- Step 1: Add essential indexes

-- Add indexes to leaves table to improve performance
CREATE INDEX IF NOT EXISTS idx_leaves_employee_id ON public.leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_year ON public.leaves(year);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON public.leaves(start_date, end_date);

-- Step 2: Create simple leave balance view
CREATE OR REPLACE VIEW public.employee_leave_balances AS
WITH leave_taken AS (
    SELECT 
        employee_id,
        EXTRACT(YEAR FROM start_date) as year,
        SUM(days_taken) as total_days_taken
    FROM public.leaves
    GROUP BY employee_id, EXTRACT(YEAR FROM start_date)
),
in_lieu_days AS (
    SELECT 
        employee_id,
        EXTRACT(YEAR FROM start_date) as year,
        SUM(leave_days_added) as total_in_lieu_days
    FROM public.in_lieu_records
    GROUP BY employee_id, EXTRACT(YEAR FROM start_date)
)
SELECT 
    e.id as employee_id,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    e.annual_leave_balance as allocated_days,
    COALESCE(lt.total_days_taken, 0) as days_taken,
    COALESCE(il.total_in_lieu_days, 0) as in_lieu_days_added,
    e.annual_leave_balance + COALESCE(il.total_in_lieu_days, 0) - COALESCE(lt.total_days_taken, 0) as current_balance
FROM 
    public.employees e
LEFT JOIN leave_taken lt ON 
    e.id = lt.employee_id 
    AND lt.year = EXTRACT(YEAR FROM CURRENT_DATE)
LEFT JOIN in_lieu_days il ON 
    e.id = il.employee_id 
    AND il.year = EXTRACT(YEAR FROM CURRENT_DATE);
    
-- Step 3: Update function to ensure days_taken is calculated
CREATE OR REPLACE FUNCTION public.update_leave_days_taken()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate days_taken if not provided or zero
    IF NEW.days_taken IS NULL OR NEW.days_taken = 0 THEN
        NEW.days_taken = (NEW.end_date - NEW.start_date + 1)::decimal;
    END IF;
    
    -- Set year if not provided
    IF NEW.year IS NULL THEN
        NEW.year = EXTRACT(YEAR FROM NEW.start_date)::integer;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_leave_days_taken ON public.leaves;
CREATE TRIGGER update_leave_days_taken
    BEFORE INSERT OR UPDATE ON public.leaves
    FOR EACH ROW
    EXECUTE FUNCTION public.update_leave_days_taken();

-- Refresh the schema cache
DO $$
BEGIN
    -- Method 1: Direct notification
    NOTIFY pgrst, 'reload schema';
    
    -- Method 2: Using function if it exists
    IF EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'refresh_schema_cache'
    ) THEN
        PERFORM refresh_schema_cache();
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error refreshing schema cache: %', SQLERRM;
END;
$$; 