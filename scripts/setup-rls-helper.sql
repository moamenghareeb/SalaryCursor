-- This script creates a helper function to get RLS policies for a table
-- Run this in the Supabase SQL Editor if the get_policies_for_table function doesn't exist

-- Check if the function already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_policies_for_table'
    ) THEN
        -- Create the function if it doesn't exist
        CREATE OR REPLACE FUNCTION get_policies_for_table(table_name text)
        RETURNS TABLE (
            policyname text,
            tablename text,
            schemaname text,
            roles text[],
            cmd text,
            qual text,
            with_check text
        )
        LANGUAGE sql
        SECURITY DEFINER
        AS $func$
            SELECT
                p.policyname,
                p.tablename,
                p.schemaname,
                p.roles,
                p.cmd,
                p.qual::text,
                p.with_check::text
            FROM
                pg_policies p
            WHERE
                p.tablename = table_name
        $func$;
        
        RAISE NOTICE 'Created get_policies_for_table function successfully';
    ELSE
        RAISE NOTICE 'get_policies_for_table function already exists';
    END IF;
END
$$; 