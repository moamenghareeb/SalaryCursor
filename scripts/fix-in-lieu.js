#!/usr/bin/env node
// Script to diagnose and fix in-lieu time issues by bypassing RLS policies

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client with the service role key to bypass RLS
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const command = process.argv[2];
  const userId = process.argv[3];
  
  if (!command) {
    console.log('Usage: node fix-in-lieu.js <command> [userId] [options]');
    console.log('Commands:');
    console.log('  list-users                - List all users');
    console.log('  check-in-lieu <userId>    - Check in-lieu records for a user');
    console.log('  check-shifts <userId>     - Check shift overrides for a user');
    console.log('  create-in-lieu <userId>   - Create in-lieu record for a user');
    console.log('  check-permissions         - Check RLS policies');
    process.exit(1);
  }
  
  switch (command) {
    case 'list-users':
      await listUsers();
      break;
    case 'check-in-lieu':
      if (!userId) {
        console.error('Error: userId is required for this command');
        process.exit(1);
      }
      await checkInLieu(userId);
      break;
    case 'check-shifts':
      if (!userId) {
        console.error('Error: userId is required for this command');
        process.exit(1);
      }
      await checkShifts(userId);
      break;
    case 'create-in-lieu':
      if (!userId) {
        console.error('Error: userId is required for this command');
        process.exit(1);
      }
      await createInLieu(userId);
      break;
    case 'check-permissions':
      await checkPermissions();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

async function createInLieu(userId) {
  const startDate = process.argv[4];
  const endDate = process.argv[5];
  const notes = process.argv[6] || 'Added via admin script';
  
  if (!startDate || !endDate) {
    console.error('Error: startDate and endDate are required');
    console.log('Usage: node fix-in-lieu.js create-in-lieu <userId> <startDate> <endDate> [notes]');
    console.log('Example: node fix-in-lieu.js create-in-lieu abc123 2023-05-01 2023-05-03 "Public holiday"');
    process.exit(1);
  }
  
  // Validate dates
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    console.error('Error: Dates must be in YYYY-MM-DD format');
    process.exit(1);
  }
  
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  
  if (startDateObj > endDateObj) {
    console.error('Error: Start date must be before or equal to end date');
    process.exit(1);
  }
  
  // Generate date array
  const dateArray = generateDateRange(startDateObj, endDateObj);
  const daysCount = dateArray.length;
  const leaveAdded = parseFloat((daysCount * 0.667).toFixed(2));
  
  console.log(`Creating in-lieu record for user ${userId}`);
  console.log(`Date range: ${startDate} to ${endDate} (${daysCount} days)`);
  console.log(`Leave credit: ${leaveAdded} days`);
  
  try {
    // Step 1: Create in-lieu record
    const { data: inLieuData, error: inLieuError } = await supabase
      .from('in_lieu_records')
      .insert([
        {
          employee_id: userId,
          start_date: startDate,
          end_date: endDate,
          days_count: daysCount,
          leave_days_added: leaveAdded,
          notes: notes
        }
      ])
      .select();
    
    if (inLieuError) {
      console.error('Error creating in-lieu record:', inLieuError);
      process.exit(1);
    }
    
    console.log('✅ In-lieu record created successfully:', inLieuData[0]);
    
    // Step 2: Create shift overrides
    const shiftOverrides = dateArray.map(date => ({
      employee_id: userId,
      date,
      shift_type: 'InLieu',
      source: 'admin_script'
    }));
    
    const { data: shiftData, error: shiftError } = await supabase
      .from('shift_overrides')
      .upsert(shiftOverrides)
      .select();
    
    if (shiftError) {
      console.error('Error creating shift overrides:', shiftError);
      
      // Try to rollback the in-lieu record
      if (inLieuData?.[0]?.id) {
        console.log('Rolling back in-lieu record...');
        await supabase
          .from('in_lieu_records')
          .delete()
          .eq('id', inLieuData[0].id);
      }
      
      process.exit(1);
    }
    
    console.log(`✅ Created ${shiftData.length} shift overrides successfully`);
    console.log('Operation completed successfully!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

async function checkInLieu(userId) {
  console.log(`Checking in-lieu records for user ${userId}...`);
  
  const { data, error } = await supabase
    .from('in_lieu_records')
    .select('*')
    .eq('employee_id', userId);
  
  if (error) {
    console.error('Error fetching in-lieu records:', error);
    process.exit(1);
  }
  
  if (data.length === 0) {
    console.log('No in-lieu records found for this user');
  } else {
    console.log(`Found ${data.length} in-lieu records:`);
    data.forEach(record => {
      console.log(`ID: ${record.id}`);
      console.log(`  Start date: ${record.start_date}`);
      console.log(`  End date: ${record.end_date}`);
      console.log(`  Days count: ${record.days_count}`);
      console.log(`  Leave added: ${record.leave_days_added}`);
      console.log(`  Notes: ${record.notes}`);
      console.log(`  Created at: ${record.created_at}`);
      console.log('---');
    });
  }
}

async function checkShifts(userId) {
  const startDate = process.argv[4];
  const endDate = process.argv[5];
  
  let query = supabase
    .from('shift_overrides')
    .select('*')
    .eq('employee_id', userId)
    .eq('shift_type', 'InLieu');
  
  if (startDate && endDate) {
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      console.error('Error: Dates must be in YYYY-MM-DD format');
      process.exit(1);
    }
    
    query = query.gte('date', startDate).lte('date', endDate);
    console.log(`Checking InLieu shift overrides for user ${userId} from ${startDate} to ${endDate}...`);
  } else {
    console.log(`Checking all InLieu shift overrides for user ${userId}...`);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching shift overrides:', error);
    process.exit(1);
  }
  
  if (data.length === 0) {
    console.log('No InLieu shift overrides found for this user');
  } else {
    console.log(`Found ${data.length} InLieu shift overrides:`);
    data.forEach(shift => {
      console.log(`ID: ${shift.id}`);
      console.log(`  Date: ${shift.date}`);
      console.log(`  Source: ${shift.source}`);
      console.log(`  Created at: ${shift.created_at}`);
      console.log('---');
    });
  }
}

async function checkPermissions() {
  console.log('Checking RLS policies...');
  
  // Check in_lieu_records table policies
  const { data: inLieuPolicies, error: inLieuError } = await supabase
    .rpc('get_policies_for_table', { table_name: 'in_lieu_records' });
  
  if (inLieuError) {
    console.error('Error fetching in_lieu_records policies:', inLieuError);
  } else {
    console.log('in_lieu_records policies:');
    console.log(inLieuPolicies);
  }
  
  // Check shift_overrides table policies
  const { data: shiftPolicies, error: shiftError } = await supabase
    .rpc('get_policies_for_table', { table_name: 'shift_overrides' });
  
  if (shiftError) {
    console.error('Error fetching shift_overrides policies:', shiftError);
  } else {
    console.log('shift_overrides policies:');
    console.log(shiftPolicies);
  }
}

async function listUsers() {
  console.log('Listing all users...');
  
  const { data, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name')
    .order('email');
  
  if (error) {
    console.error('Error fetching users:', error);
    process.exit(1);
  }
  
  if (data.length === 0) {
    console.log('No users found');
  } else {
    console.log(`Found ${data.length} users:`);
    data.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.first_name} ${user.last_name}`);
      console.log('---');
    });
  }
}

// Helper function to validate date format (YYYY-MM-DD)
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

// Helper function to generate date range array
function generateDateRange(startDate, endDate) {
  const dateArray = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dateArray.push(new Date(currentDate).toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dateArray;
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 