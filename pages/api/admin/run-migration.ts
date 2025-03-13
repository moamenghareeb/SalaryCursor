import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authentication token' });
    }

    // Extract the token
    const token = authHeader.substring(7);

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Optional: Check if user has admin role (you can implement this check)
    // For now, we'll just proceed with any authenticated user for testing

    // Get migration file parameter
    const { migrationFile } = req.body;
    
    // Default to shift_overrides fix if no specific file is specified
    const filename = migrationFile || 'fix_shift_overrides_rls.sql';
    
    // Validate the filename (basic security check)
    if (!/^[a-zA-Z0-9_.-]+\.sql$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid migration filename' });
    }

    // Get path to migration file
    const filePath = path.join(process.cwd(), 'migrations', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `Migration file ${filename} not found` });
    }

    // Read migration file
    const sqlContent = fs.readFileSync(filePath, 'utf8');

    // Execute the SQL (using service role for admin access)
    const { error: executeError } = await supabase.rpc('execute_sql', {
      sql: sqlContent
    });

    if (executeError) {
      console.error('SQL execution error:', executeError);
      
      // Check if the execute_sql function doesn't exist
      if (executeError.message.includes('does not exist')) {
        // Try to create the execute_sql function first
        const createFunctionSql = `
          CREATE OR REPLACE FUNCTION execute_sql(sql text)
          RETURNS void
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE sql;
          END;
          $$;
        `;
        
        // Execute the SQL to create the function
        const { error: createFunctionError } = await supabase.rpc('execute_sql', {
          sql: createFunctionSql
        });
        
        if (createFunctionError) {
          console.error('Failed to create execute_sql function:', createFunctionError);
          return res.status(500).json({ 
            error: 'Failed to create SQL execution function',
            details: createFunctionError
          });
        }
        
        // Now try again with the migration SQL
        const { error: retryError } = await supabase.rpc('execute_sql', {
          sql: sqlContent
        });
        
        if (retryError) {
          console.error('SQL execution error after creating function:', retryError);
          return res.status(500).json({ 
            error: 'Failed to execute migration SQL after creating function',
            details: retryError
          });
        }
      } else {
        // Some other error occurred
        return res.status(500).json({ 
          error: 'Failed to execute migration SQL',
          details: executeError
        });
      }
    }

    // Return success
    return res.status(200).json({ 
      success: true,
      message: `Successfully executed migration: ${filename}` 
    });
    
  } catch (error) {
    console.error('Error running migration:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 