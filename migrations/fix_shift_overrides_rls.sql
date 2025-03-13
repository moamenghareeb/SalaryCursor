-- Function to fix RLS policies for shift_overrides table
CREATE OR REPLACE FUNCTION fix_shift_overrides_rls()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view their own shift overrides" ON public.shift_overrides;
  DROP POLICY IF EXISTS "Users can insert their own shift overrides" ON public.shift_overrides;
  DROP POLICY IF EXISTS "Users can update their own shift overrides" ON public.shift_overrides;
  DROP POLICY IF EXISTS "Users can delete their own shift overrides" ON public.shift_overrides;
  
  -- Create new policies
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
    
  RETURN 'RLS policies fixed successfully';
END;
$$;

-- Call the function to fix the policies
SELECT fix_shift_overrides_rls();

-- Make sure Row Level Security is enabled on the table
ALTER TABLE public.shift_overrides ENABLE ROW LEVEL SECURITY;

-- Create an admin policy for the service_role to bypass RLS
CREATE POLICY "Service role can access all shift_overrides"
  ON public.shift_overrides
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role'); 