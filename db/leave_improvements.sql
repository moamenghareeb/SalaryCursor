-- SQL improvements for leave data management

-- 1. Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_leaves_employee_id ON leaves (employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_date_range ON leaves (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves (status);
CREATE INDEX IF NOT EXISTS idx_leaves_year ON leaves (year);

-- 2. Create a dedicated leave_allocations table if it doesn't exist already
CREATE TABLE IF NOT EXISTS leave_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year INT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'annual',
  days_allocated DECIMAL(8,2) NOT NULL DEFAULT 0,
  days_carried_over DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure the combination of employee_id, year, and type is unique
  CONSTRAINT unique_employee_year_type UNIQUE (employee_id, year, type)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leave_allocations_employee_id ON leave_allocations (employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_allocations_year ON leave_allocations (year);

-- 3. Create a view to calculate leave balances more efficiently
CREATE OR REPLACE VIEW employee_leave_balances AS
WITH 
-- Get all allocations
allocations AS (
    SELECT 
        employee_id,
        year,
        SUM(days_allocated + COALESCE(days_carried_over, 0)) as total_allocated
    FROM 
        leave_allocations
    WHERE 
        type = 'annual'
    GROUP BY 
        employee_id, year
),
-- Get all leave taken
taken AS (
    SELECT 
        employee_id,
        year,
        SUM(days_taken) as total_taken
    FROM 
        leaves
    WHERE 
        status = 'approved' OR status IS NULL -- Include leaves without explicit status (legacy data)
    GROUP BY 
        employee_id, year
),
-- Get all in-lieu days added
in_lieu AS (
    SELECT 
        employee_id,
        year,
        SUM(leave_days_added) as days_added
    FROM 
        in_lieu_records
    WHERE 
        status = 'approved' OR status IS NULL -- Include in-lieu without explicit status (legacy data)
    GROUP BY 
        employee_id, year
)
-- Combine all data
SELECT 
    e.id as employee_id,
    e.name as employee_name,
    EXTRACT(YEAR FROM CURRENT_DATE) as year,
    COALESCE(a.total_allocated, 
        CASE 
            WHEN e.years_of_service < 1 THEN 15
            WHEN e.years_of_service < 5 THEN 18
            WHEN e.years_of_service < 10 THEN 21
            ELSE 25
        END
    ) as annual_leave_allocated,
    COALESCE(t.total_taken, 0) as annual_leave_taken,
    COALESCE(i.days_added, 0) as in_lieu_days_added,
    COALESCE(a.total_allocated, 
        CASE 
            WHEN e.years_of_service < 1 THEN 15
            WHEN e.years_of_service < 5 THEN 18
            WHEN e.years_of_service < 10 THEN 21
            ELSE 25
        END
    ) + COALESCE(i.days_added, 0) - COALESCE(t.total_taken, 0) as current_balance,
    e.years_of_service,
    e.hire_date
FROM 
    employees e
LEFT JOIN 
    allocations a ON e.id = a.employee_id AND a.year = EXTRACT(YEAR FROM CURRENT_DATE)
LEFT JOIN 
    taken t ON e.id = t.employee_id AND t.year = EXTRACT(YEAR FROM CURRENT_DATE)
LEFT JOIN 
    in_lieu i ON e.id = i.employee_id AND i.year = EXTRACT(YEAR FROM CURRENT_DATE);

-- 4. Create a trigger function to update leave_taken automatically
CREATE OR REPLACE FUNCTION update_leave_taken_function()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate the number of days based on start and end date
    IF NEW.days_taken IS NULL OR NEW.days_taken = 0 THEN
        -- Calculate working days between start and end dates
        NEW.days_taken = (
            SELECT COUNT(*)::decimal 
            FROM generate_series(
                NEW.start_date::date, 
                NEW.end_date::date, 
                '1 day'::interval
            ) AS date
            WHERE EXTRACT(DOW FROM date) NOT IN (0, 6) -- Exclude weekends (0=Sunday, 6=Saturday)
        );
    END IF;
    
    -- Set the year if not provided
    IF NEW.year IS NULL THEN
        NEW.year := EXTRACT(YEAR FROM NEW.start_date);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger to the leave_requests table
DROP TRIGGER IF EXISTS update_leave_taken ON leaves;
CREATE TRIGGER update_leave_taken
BEFORE INSERT OR UPDATE ON leaves
FOR EACH ROW
EXECUTE FUNCTION update_leave_taken_function();

-- 5. Populate initial allocations for current year (only if not already set)
DO $$
DECLARE
    current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
BEGIN
    -- Insert allocations for employees who don't have one for the current year
    INSERT INTO leave_allocations (employee_id, year, type, days_allocated)
    SELECT 
        e.id, 
        current_year, 
        'annual',
        CASE 
            WHEN e.years_of_service < 1 THEN 15
            WHEN e.years_of_service < 5 THEN 18
            WHEN e.years_of_service < 10 THEN 21
            ELSE 25
        END
    FROM 
        employees e
    LEFT JOIN 
        leave_allocations la 
        ON e.id = la.employee_id 
        AND la.year = current_year
        AND la.type = 'annual'
    WHERE 
        la.id IS NULL;
END;
$$;

-- 6. Create a monthly leave summary materialized view for faster dashboard loading
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_leave_summary AS
SELECT 
    employee_id,
    EXTRACT(YEAR FROM start_date)::INT as year,
    EXTRACT(MONTH FROM start_date)::INT as month,
    leave_type,
    COUNT(*) as request_count,
    SUM(days_taken) as days_taken
FROM 
    leaves
WHERE 
    status = 'approved' OR status IS NULL
GROUP BY 
    employee_id, 
    EXTRACT(YEAR FROM start_date)::INT,
    EXTRACT(MONTH FROM start_date)::INT,
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
DROP TRIGGER IF EXISTS refresh_leave_summary_trigger ON leaves;
CREATE TRIGGER refresh_leave_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON leaves
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