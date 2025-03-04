-- Add missing absences column to salaries table
ALTER TABLE salaries ADD COLUMN IF NOT EXISTS absences DECIMAL(10, 2) DEFAULT 0;

-- Force refresh schema cache
SELECT refresh_schema_cache();

-- Create a temporary table to force schema cache refresh
CREATE TABLE IF NOT EXISTS _temp_forced_refresh (id SERIAL PRIMARY KEY);
INSERT INTO _temp_forced_refresh (id) VALUES (1) ON CONFLICT (id) DO NOTHING; 