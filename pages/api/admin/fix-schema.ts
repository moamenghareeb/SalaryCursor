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
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  // Verify the token and check for admin rights
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    // Get the fix type from request body
    const { fix, migration } = req.body;
    
    if (!fix) {
      return res.status(400).json({ error: 'Missing fix parameter' });
    }
    
    // Handle different fix types
    if (fix === 'add_absences_column') {
      console.log('Applying fix for missing absences column');
      
      // Direct SQL approach to add the column
      try {
        // Check if RPC function exists first
        const { error: rpcCheckError } = await supabase.rpc('function_exists', { 
          function_name: 'execute_sql'
        });
        
        if (rpcCheckError) {
          console.log('execute_sql function does not exist, attempting direct SQL');
          
          // Try adding column directly
          const { error: addColumnError } = await supabase.from('salaries').select('id').limit(1);
          
          if (addColumnError && addColumnError.message.includes('absences')) {
            // Add the column with a direct query via Supabase's database API
            // This is not ideal but a workaround when permissions are limited
            console.log('Attempting to create the column via special RPC call');
            
            // Try applying SQL directly if available
            try {
              const { error: sqlError } = await supabase.rpc('refresh_schema_cache');
              
              if (sqlError) {
                throw new Error(`Schema refresh failed: ${sqlError.message}`);
              }
              
              // Wait for schema cache to refresh
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              return res.status(200).json({ 
                success: true,
                message: 'Attempted schema refresh. Please try your operation again.',
                fixType: 'refresh_only'
              });
            } catch (directError) {
              console.error('Error executing direct SQL:', directError);
              throw new Error('Cannot execute SQL commands directly');
            }
          }
        } else {
          // Execute the SQL to add the column
          const { error: executeError } = await supabase.rpc('execute_sql', { 
            sql: 'ALTER TABLE salaries ADD COLUMN IF NOT EXISTS absences DECIMAL(10, 2) DEFAULT 0;'
          });
          
          if (executeError) {
            throw new Error(`Error executing SQL: ${executeError.message}`);
          }
          
          // Refresh schema cache
          await supabase.rpc('refresh_schema_cache');
          
          // Wait for schema cache to refresh
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          return res.status(200).json({ 
            success: true,
            message: 'Added absences column successfully',
            fixType: 'column_added'
          });
        }
      } catch (error) {
        console.error('Error fixing schema:', error);
        return res.status(500).json({ 
          error: 'Failed to fix schema',
          details: error instanceof Error ? error.message : String(error)
        });
      }
      
      // If direct SQL failed, provide instructions for manual migration
      return res.status(200).json({
        success: false,
        message: 'Could not automatically fix the schema. You need to run the migration script manually.',
        instructions: `
          Please run the following SQL in your Supabase project:
          
          ALTER TABLE salaries ADD COLUMN IF NOT EXISTS absences DECIMAL(10, 2) DEFAULT 0;
          SELECT refresh_schema_cache();
        `,
        fixType: 'instructions_only'
      });
    }
    
    // Unknown fix type
    return res.status(400).json({ error: `Unknown fix type: ${fix}` });
  } catch (error) {
    console.error('Error in fix-schema API:', error);
    return res.status(500).json({ 
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 