import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Attempting to refresh schema cache via API');
    
    // First, try to use the function if it exists
    try {
      const { data, error } = await supabase.rpc('refresh_schema_cache');
      
      if (!error) {
        console.log('Schema cache refreshed successfully using RPC function');
        return res.status(200).json({ success: true, message: 'Schema cache refreshed successfully using function' });
      } else {
        console.error('Error using RPC function:', error);
        // Fall through to the direct SQL method
      }
    } catch (rpcError) {
      console.error('RPC function call failed:', rpcError);
      // Fall through to the direct SQL method
    }
    
    // If the function call fails, try direct SQL
    console.log('Attempting direct SQL for schema cache refresh');
    
    // 1. Force a schema cache refresh
    const { error: notifyError } = await supabase.from('_dummy_query_for_notify').select('*').limit(1);
    if (notifyError) {
      console.log('Dummy query error (expected):', notifyError);
    }
    
    // 2. Check and add missing columns directly
    const columns = [
      'absences',
      'sick_leave',
      'act_as_pay',
      'pension_plan',
      'retroactive_deduction',
      'premium_card_deduction',
      'mobile_deduction'
    ];
    
    for (const column of columns) {
      try {
        // Check if column exists first (this will fail if schema cache is stale, but that's okay)
        try {
          await supabase.from('salaries').select(column).limit(1);
          console.log(`Column ${column} exists in salaries table`);
        } catch (columnCheckError) {
          console.log(`Column check for ${column} failed (may not exist or schema cache issue)`);
        }
        
        // Try to add the column (will fail if it already exists, but that's okay)
        const { error: alterError } = await supabase.rpc('add_column_if_not_exists', { 
          table_name: 'salaries',
          column_name: column
        });
        
        if (alterError) {
          console.log(`Failed to add column ${column} - it might already exist:`, alterError);
        } else {
          console.log(`Added column ${column} to salaries table`);
        }
      } catch (columnError) {
        console.error(`Error handling column ${column}:`, columnError);
      }
    }
    
    // 3. Force another schema cache refresh
    const { error: finalNotifyError } = await supabase.rpc('pg_notify', { 
      channel: 'pgrst',
      payload: 'reload schema'
    });
    
    if (finalNotifyError) {
      console.error('Error in final notify:', finalNotifyError);
    } else {
      console.log('Final schema cache refresh notification sent');
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Schema cache refresh attempted via direct SQL' 
    });
  } catch (error) {
    console.error('Error in refresh-schema-cache API:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
} 