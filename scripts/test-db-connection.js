#!/usr/bin/env node
// Script to test the database connection and verify that the service role key works

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client with the service role key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('Testing database connection...');
  
  // Check if environment variables are set
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL is not set');
    process.exit(1);
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not set');
    process.exit(1);
  }
  
  console.log(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 5)}...`);
  
  try {
    // Test connection by fetching a single row from employees table
    const { data: userData, error: userError } = await supabase
      .from('employees')
      .select('id, email, first_name, last_name')
      .limit(1);
    
    if (userError) {
      console.error('Error accessing employees table:', userError);
      console.log('\nPossible issues:');
      console.log('1. The service role key might be incorrect');
      console.log('2. The employees table might not exist or have a different name');
      console.log('3. There might be network connectivity issues');
      process.exit(1);
    }
    
    console.log('\n✅ Successfully connected to the database!');
    console.log(`Found ${userData.length} employee(s) in the employees table`);
    
    // Test in_lieu_records table
    const { data: inLieuData, error: inLieuError } = await supabase
      .from('in_lieu_records')
      .select('id')
      .limit(1);
    
    if (inLieuError) {
      console.error('\n❌ Error accessing in_lieu_records table:', inLieuError);
      console.log('The in_lieu_records table might not exist or have a different name');
    } else {
      console.log(`\n✅ Successfully accessed in_lieu_records table (${inLieuData.length} records found)`);
    }
    
    // Test shift_overrides table
    const { data: shiftData, error: shiftError } = await supabase
      .from('shift_overrides')
      .select('id')
      .limit(1);
    
    if (shiftError) {
      console.error('\n❌ Error accessing shift_overrides table:', shiftError);
      console.log('The shift_overrides table might not exist or have a different name');
    } else {
      console.log(`\n✅ Successfully accessed shift_overrides table (${shiftData.length} records found)`);
    }
    
    // Test RLS helper function
    try {
      const { data: rlsData, error: rlsError } = await supabase
        .rpc('get_policies_for_table', { table_name: 'in_lieu_records' });
      
      if (rlsError) {
        console.error('\n❌ Error calling get_policies_for_table function:', rlsError);
        console.log('You need to run the setup-rls-helper.sql script in the Supabase SQL Editor');
      } else {
        console.log('\n✅ Successfully called get_policies_for_table function');
        console.log(`Found ${rlsData.length} RLS policies for in_lieu_records table`);
      }
    } catch (error) {
      console.error('\n❌ Error calling get_policies_for_table function:', error);
      console.log('You need to run the setup-rls-helper.sql script in the Supabase SQL Editor');
    }
    
    console.log('\nDatabase connection test completed successfully!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 