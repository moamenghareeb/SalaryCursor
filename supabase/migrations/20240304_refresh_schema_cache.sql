-- Force a schema cache refresh
SELECT pg_notify('pgrst', 'reload schema');

-- Verify columns exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'salaries' 
        AND column_name = 'absences'
    ) THEN
        RAISE EXCEPTION 'Column absences does not exist in salaries table';
    END IF;
END $$; 