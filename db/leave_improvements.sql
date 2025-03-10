-- SQL improvements for leave data management

-- 1. Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests (employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_date_range ON leave_requests (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests (status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_type ON leave_requests (leave_type);

-- 2. Create a dedicated leave_allocations table if it doesn't exist already
CREATE TABLE IF NOT EXISTS leave_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year INT NOT NULL,
  type VARCHAR(20) NOT NULL,
  allocated_days DECIMAL(5,2) NOT NULL DEFAULT 0,
  carried_over_days DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure the combination of employee_id, year, and type is unique
  CONSTRAINT unique_allocation UNIQUE (employee_id, year, type)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leave_allocations_employee_id ON leave_allocations (employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_allocations_year ON leave_allocations (year);

-- 3. Create a view to calculate leave balances more efficiently
CREATE OR REPLACE VIEW employee_leave_balances AS
SELECT 
  e.id AS employee_id,
  e.name AS employee_name,
  EXTRACT(YEAR FROM CURRENT_DATE) AS year,
  COALESCE(la.allocated_days, 
    CASE 
      WHEN e.years_of_service >= 10 THEN 24.67 
      ELSE 18.67 
    END
  ) AS base_allocation,
  COALESCE(la.carried_over_days, 0) AS carried_over,
  COALESCE(
    (
      SELECT SUM(duration) 
      FROM leave_requests 
      WHERE employee_id = e.id 
        AND leave_type = 'annual' 
        AND status = 'approved'
        AND start_date >= make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 1, 1)
        AND end_date <= make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 12, 31)
    ), 
    0
  ) AS days_taken,
  COALESCE(
    (
      SELECT SUM(days_added) 
      FROM in_lieu_records 
      WHERE employee_id = e.id
    ), 
    0
  ) AS in_lieu_added,
  (
    COALESCE(la.allocated_days, 
      CASE 
        WHEN e.years_of_service >= 10 THEN 24.67 
        ELSE 18.67 
      END
    ) +
    COALESCE(la.carried_over_days, 0) +
    COALESCE(
      (
        SELECT SUM(days_added) 
        FROM in_lieu_records 
        WHERE employee_id = e.id
      ), 
      0
    ) -
    COALESCE(
      (
        SELECT SUM(duration) 
        FROM leave_requests 
        WHERE employee_id = e.id 
          AND leave_type = 'annual' 
          AND status = 'approved'
          AND start_date >= make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 1, 1)
          AND end_date <= make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 12, 31)
      ), 
      0
    )
  ) AS current_balance
FROM employees e
LEFT JOIN leave_allocations la ON 
  e.id = la.employee_id AND 
  la.year = EXTRACT(YEAR FROM CURRENT_DATE) AND
  la.type = 'annual';

-- 4. Create a trigger function to update leave_taken automatically
CREATE OR REPLACE FUNCTION update_leave_taken_function()
RETURNS TRIGGER AS $$
BEGIN
  -- When a leave request is added, updated, or deleted
  -- This will recalculate leave taken for dashboard summary
  IF TG_OP = 'DELETE' THEN
    -- Leave request was deleted, so no need to do anything to it
    RETURN OLD;
  ELSE
    -- Make sure duration is set correctly
    IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
      -- Simple duration calculation (can be made more complex with working days)
      NEW.duration := (NEW.end_date - NEW.start_date + 1)::DECIMAL;
    END IF;
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger to the leave_requests table
DROP TRIGGER IF EXISTS update_leave_taken ON leave_requests;
CREATE TRIGGER update_leave_taken
BEFORE INSERT OR UPDATE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION update_leave_taken_function();

-- 5. Populate initial allocations for current year (only if not already set)
INSERT INTO leave_allocations (employee_id, year, type, allocated_days)
SELECT 
  id AS employee_id,
  EXTRACT(YEAR FROM CURRENT_DATE)::INT AS year,
  'annual' AS type,
  CASE 
    WHEN years_of_service >= 10 THEN 24.67 
    ELSE 18.67 
  END AS allocated_days
FROM employees
WHERE NOT EXISTS (
  SELECT 1 FROM leave_allocations
  WHERE leave_allocations.employee_id = employees.id
  AND leave_allocations.year = EXTRACT(YEAR FROM CURRENT_DATE)::INT
  AND leave_allocations.type = 'annual'
);

-- 6. Create a monthly leave summary materialized view for faster dashboard loading
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_leave_summary AS
SELECT
  employee_id,
  EXTRACT(YEAR FROM start_date) AS year,
  EXTRACT(MONTH FROM start_date) AS month,
  leave_type,
  SUM(duration) AS total_days
FROM leave_requests
WHERE status = 'approved'
GROUP BY 
  employee_id, 
  EXTRACT(YEAR FROM start_date),
  EXTRACT(MONTH FROM start_date),
  leave_type;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_monthly_leave_summary_employee ON monthly_leave_summary (employee_id);
CREATE INDEX IF NOT EXISTS idx_monthly_leave_summary_year_month ON monthly_leave_summary (year, month);

-- 7. Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_leave_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_leave_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to refresh materialized view when leave_requests change
DROP TRIGGER IF EXISTS refresh_leave_summary_trigger ON leave_requests;
CREATE TRIGGER refresh_leave_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON leave_requests
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_leave_summary();

-- Instructions for running this SQL in Supabase:
--
-- This SQL script can be run from the Supabase SQL Editor.
-- 1. Go to the Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire script
-- 3. Run the script
-- 
-- Note: Some operations may require owner privileges.
-- If you encounter permissions issues, contact your database administrator. 