import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Authenticate request
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  
  const token = authHeader.substring(7);
  
  // Verify the token and check if user is admin
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  
  if (userError || !userData.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Check if user has admin role (modify this based on your role structure)
  const isAdmin = userData.user.app_metadata?.role === 'admin';
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    // Get the fix type from request body
    const { fix, migration } = req.body;
    
    if (fix === 'add_absences_column') {
      const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
      
      // In production environments, we'll provide the SQL to run manually
      if (isProduction) {
        return res.status(200).json({
          message: 'Production environment detected',
          isProduction: true,
          instructions: `
In a production environment, you need to run the SQL manually in the Supabase SQL Editor.

Copy and paste this SQL into your Supabase SQL Editor and click "Run":

-- Add the absences column with error handling
DO $$
BEGIN
    BEGIN
        ALTER TABLE salaries ADD COLUMN absences DECIMAL(10, 2) DEFAULT 0;
        RAISE NOTICE 'Successfully added the absences column.';
    EXCEPTION WHEN duplicate_column THEN
        RAISE NOTICE 'The absences column already exists.';
    END;
    
    BEGIN
        NOTIFY pgrst, 'reload schema';
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_schema_cache') THEN
            PERFORM refresh_schema_cache();
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Schema refresh error: %', SQLERRM;
    END;
END;
$$;
          `,
          sqlToRun: "DO $$ BEGIN BEGIN ALTER TABLE salaries ADD COLUMN absences DECIMAL(10, 2) DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END; BEGIN NOTIFY pgrst, 'reload schema'; IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_schema_cache') THEN PERFORM refresh_schema_cache(); END IF; EXCEPTION WHEN OTHERS THEN NULL; END; END; $$;"
        });
      }
      
      // For non-production environments, attempt to fix automatically
      
      // Check if the RPC function exists
      const { data: functionExists, error: functionCheckError } = await supabase.rpc('function_exists', { 
        func_name: 'execute_sql' 
      }).single();
      
      if (functionCheckError || !functionExists) {
        console.log('The execute_sql function is not available, attempting direct SQL execution');
        
        try {
          // Execute the SQL directly through the migration file (less secure)
          let sql = '';
          
          if (migration) {
            // Try to read the migration file contents
            try {
              const fs = require('fs');
              const path = require('path');
              
              // Construct path to the migration file
              const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', migration);
              
              // Check if file exists
              if (fs.existsSync(migrationPath)) {
                sql = fs.readFileSync(migrationPath, 'utf8');
                console.log(`Read migration file: ${migration}`);
              } else {
                throw new Error(`Migration file not found: ${migration}`);
              }
            } catch (fileError) {
              console.error('Failed to read migration file:', fileError);
              sql = 'ALTER TABLE salaries ADD COLUMN IF NOT EXISTS absences DECIMAL(10, 2) DEFAULT 0; SELECT refresh_schema_cache();';
            }
          } else {
            // Default SQL if no migration file specified
            sql = 'ALTER TABLE salaries ADD COLUMN IF NOT EXISTS absences DECIMAL(10, 2) DEFAULT 0; SELECT refresh_schema_cache();';
          }
          
          // Execute the SQL directly (this will only work in development)
          const { error: sqlError } = await supabase.rpc('execute_sql', { sql });
          
          if (sqlError) {
            console.error('Error executing SQL directly:', sqlError);
            return res.status(500).json({
              error: 'Failed to execute SQL',
              details: sqlError.message,
              recommendedAction: 'Please run the SQL manually in the Supabase SQL Editor',
              sql
            });
          }
          
          return res.status(200).json({
            message: 'Successfully added absences column to salaries table',
            details: 'The schema has been updated and the cache has been refreshed.'
          });
        } catch (executionError) {
          console.error('Error during direct SQL execution:', executionError);
          return res.status(500).json({
            error: 'Failed to fix schema',
            details: executionError instanceof Error ? executionError.message : String(executionError),
            recommendedAction: 'Please run the SQL manually in the Supabase SQL Editor',
            sql: 'ALTER TABLE salaries ADD COLUMN IF NOT EXISTS absences DECIMAL(10, 2) DEFAULT 0; SELECT refresh_schema_cache();'
          });
        }
      } else {
        // Use the RPC function to execute SQL
        const sql = 'ALTER TABLE salaries ADD COLUMN IF NOT EXISTS absences DECIMAL(10, 2) DEFAULT 0; SELECT refresh_schema_cache();';
        
        const { error: executeError } = await supabase.rpc('execute_sql', { sql });
        
        if (executeError) {
          console.error('Error executing SQL via RPC:', executeError);
          return res.status(500).json({
            error: 'Failed to execute SQL via RPC',
            details: executeError.message,
            recommendedAction: 'Please run the SQL manually in the Supabase SQL Editor',
            sql
          });
        }
        
        // Wait a moment for the schema to update
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify the column exists
        const { data: verifyData, error: verifyError } = await supabase.rpc('column_exists', {
          table_name: 'salaries',
          column_name: 'absences'
        }).single();
        
        if (verifyError || !verifyData) {
          console.error('Error verifying column existence:', verifyError);
          return res.status(200).json({
            message: 'SQL executed, but unable to verify column existence',
            details: 'The SQL was executed successfully, but we could not verify if the column exists.',
            status: 'unknown'
          });
        }
        
        return res.status(200).json({
          message: 'Successfully added absences column to salaries table',
          details: 'The schema has been updated and the cache has been refreshed.',
          verified: true
        });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported fix type' });
    }
  } catch (error) {
    console.error('Error in fix-schema API:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : String(error),
    });
  }
} 