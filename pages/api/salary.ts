import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

// Define SalaryData interface
interface SalaryData {
  employee_id: string;
  month: string;
  basic_salary: number;
  cost_of_living: number;
  shift_allowance: number;
  overtime_hours: number;
  overtime_pay: number;
  variable_pay: number;
  deduction: number;
  total_salary: number;
  exchange_rate: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check for token in Authorization header (Bearer token)
  let token = null;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('Using token from Authorization header');
  } else {
    console.log('No valid Authorization header found');
  }
  
  // If no token in header, try cookies
  if (!token) {
    // Get auth token from request cookies
    const authCookie = req.cookies['sb-access-token'] || req.cookies['supabase-auth-token'];
    
    if (authCookie) {
      console.log('Found auth cookie:', authCookie ? 'yes' : 'no');
      
      // Try to extract token from the cookie
      try {
        // Handle both direct token and JSON format
        if (authCookie.startsWith('[')) {
          // Parse JSON format (['token', 'refresh'])
          const parsed = JSON.parse(authCookie);
          token = parsed[0];
          console.log('Using token from cookie (JSON format)');
        } else {
          token = authCookie;
          console.log('Using token from cookie (direct format)');
        }
      } catch (e) {
        console.error('Error parsing auth cookie:', e);
      }
    } else {
      console.log('No auth cookie found');
    }
  }
  
  // Check auth from token OR from session
  let userSession = null;
  
  // If we have a token, set it for this request
  if (token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('Token validation error:', error.message);
    } else if (user) {
      userSession = user;
      console.log('User authenticated via token:', user.email);
    }
  }
  
  // If no token or token invalid, try session-based auth as fallback
  if (!userSession) {
    console.log('Falling back to session-based auth');
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Session auth error:', error.message);
    } else if (session?.user) {
      userSession = session.user;
      console.log('User authenticated via session:', session.user.email);
    } else {
      console.log('No session user found');
    }
  }
  
  if (!userSession) {
    console.log('Authentication failed');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Handle GET request to fetch salary data
  if (req.method === 'GET') {
    const { employee_id, month } = req.query;
    
    if (!employee_id) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }
    
    try {
      let query = supabase
        .from('salaries')
        .select('*')
        .eq('employee_id', employee_id);
      
      // If month is provided, filter by month
      if (month) {
        query = query.eq('month', month);
      }
      
      // Order by month descending (newest first)
      query = query.order('month', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Database error on GET:', error);
        return res.status(500).json({ 
          error: error.message, 
          details: error.details || 'Database query failed', 
          hint: error.hint || 'Check database connection and permissions'
        });
      }
      
      if (!data) {
        console.log('No salary data found for employee:', employee_id);
        // Return empty array instead of null
        return res.status(200).json([]);
      }
      
      // Log success for debugging
      console.log(`Successfully fetched ${data.length} salary records for employee_id: ${employee_id}`);
      
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching salary data:', error);
      return res.status(500).json({ error: 'Failed to fetch salary data' });
    }
  }
  
  // Handle POST request to save salary data
  if (req.method === 'POST') {
    try {
      // Validate request body
      const { employee_id, month, ...salaryData } = req.body;
      
      if (!employee_id || !month) {
        return res.status(400).json({ error: 'Employee ID and month are required' });
      }
      
      // Create sanitized data object with proper defaults for any missing fields
      const sanitizedData: SalaryData = {
        employee_id,
        month,
        basic_salary: salaryData.basic_salary || 0,
        cost_of_living: salaryData.cost_of_living || 0,
        shift_allowance: salaryData.shift_allowance || 0,
        overtime_hours: salaryData.overtime_hours || 0,
        overtime_pay: salaryData.overtime_pay || 0,
        variable_pay: salaryData.variable_pay || 0,
        deduction: salaryData.deduction || 0,
        total_salary: salaryData.total_salary || 0,
        exchange_rate: salaryData.exchange_rate || 0,
      };
      
      // Check if a record already exists for this employee and month
      let existingRecord = null;
      const { data: recordData, error: checkError } = await supabase
        .from('salaries')
        .select('id')
        .eq('employee_id', sanitizedData.employee_id)
        .eq('month', sanitizedData.month)
        .single();
      
      if (recordData) {
        existingRecord = recordData;
      }
      
      // Handle schema cache errors or missing column errors
      if (checkError) {
        let isSchemaError = checkError.message.includes('schema cache');
        let isMissingAbsencesError = checkError.message.includes('absences') && checkError.message.includes('column');
        
        if (isSchemaError || isMissingAbsencesError) {
          console.log(`Schema issue detected: ${checkError.message}`);
          
          // In production (especially Vercel), we can't modify schema directly
          // Instead, return a clear error with instructions
          if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
            return res.status(500).json({ 
              error: `Database schema error: The 'absences' column is missing from the 'salaries' table.`,
              details: `This is a production environment. Please run the migration script manually in your Supabase project.`,
              instructions: `Run "ALTER TABLE salaries ADD COLUMN IF NOT EXISTS absences DECIMAL(10, 2) DEFAULT 0;" in SQL Editor`,
              missingColumn: 'absences',
              isProduction: true
            });
          }

          // Try schema refresh but don't attempt schema modifications in production
          try {
            // Force schema cache refresh with direct SQL
            const { error: refreshError } = await supabase.rpc('refresh_schema_cache');
            
            if (refreshError) {
              console.error('Error refreshing schema cache via RPC:', refreshError);
            }
            
            // Wait longer for cache to update (3 seconds)
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Remove problematic field if it's causing errors
            if (isMissingAbsencesError && 'absences' in sanitizedData) {
              console.log('Removing absences field from data due to schema issue');
              delete sanitizedData.absences;
            }
            
          } catch (refreshErr) {
            console.error('Error during schema refresh attempt:', refreshErr);
          }
          
          // Try checking again after refresh
          const { data: recheckedRecord, error: recheckError } = await supabase
            .from('salaries')
            .select('id')
            .eq('employee_id', sanitizedData.employee_id)
            .eq('month', sanitizedData.month)
            .single();
          
          if (recheckError && recheckError.code !== 'PGRST116') {
            console.error('Error rechecking after schema refresh:', recheckError);
            
            if (recheckError.message.includes('absences')) {
              return res.status(500).json({ 
                error: `Database schema error: The 'absences' column is missing from the 'salaries' table.`,
                details: `Please run the migration script to add this column to your database.`,
                instructions: `Run "ALTER TABLE salaries ADD COLUMN IF NOT EXISTS absences DECIMAL(10, 2) DEFAULT 0;" in SQL Editor`,
                missingColumn: 'absences'
              });
            }
            
            return res.status(500).json({ 
              error: `Database error: ${recheckError.message}`,
              details: 'Schema refresh failed to resolve the issue.'
            });
          }
          
          if (recheckedRecord) {
            existingRecord = recheckedRecord;
          }
        } else if (checkError.code !== 'PGRST116') {
          // PGRST116 means no rows returned, which is expected if no record exists
          console.error('Error checking existing record:', checkError);
          return res.status(500).json({ 
            error: `Database error: ${checkError.message}`,
            details: 'Error occurred while checking for existing records.'
          });
        }
      }
      
      let result;
      
      try {
        if (existingRecord) {
          // Update existing record
          result = await supabase
            .from('salaries')
            .update(sanitizedData)
            .eq('id', existingRecord.id);
        } else {
          // Insert new record
          result = await supabase
            .from('salaries')
            .insert(sanitizedData);
        }
        
        if (result.error) {
          console.error('Error saving salary data:', result.error);
          
          // Special handling for absences column errors
          if (result.error.message.includes('absences')) {
            return res.status(500).json({ 
              error: `Failed to save salary data: Could not find the 'absences' column of 'salaries' in the schema cache`,
              details: 'The database schema is missing the absences column. Please apply the 20240305_add_absences_column.sql migration.',
              missingColumn: 'absences'
            });
          }
          
          return res.status(500).json({ 
            error: `Failed to save salary data: ${result.error.message}`,
            details: 'Error occurred during the save operation.'
          });
        }
        
        return res.status(200).json({ 
          message: 'Salary data saved successfully',
          operation: existingRecord ? 'updated' : 'inserted'
        });
      } catch (saveError) {
        console.error('Exception during save operation:', saveError);
        return res.status(500).json({ 
          error: 'An unexpected error occurred while saving salary data',
          details: saveError instanceof Error ? saveError.message : String(saveError),
          suggestion: 'Check server logs for more information'
        });
      }
    } catch (error) {
      console.error('Unexpected error in salary API:', error);
      return res.status(500).json({ 
        error: 'An unexpected error occurred while processing the request',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ error: 'Method not allowed' });
} 