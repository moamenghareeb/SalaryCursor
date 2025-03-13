# In-Lieu Time Fix Script

This script helps diagnose and fix issues with in-lieu time records by bypassing Row Level Security (RLS) policies in the database. It uses the Supabase service role key to directly access and modify the database.

## Prerequisites

1. Make sure you have Node.js installed
2. Ensure your `.env` file contains the following variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (admin access)
3. Run the SQL helper script in the Supabase SQL Editor to create the necessary functions (see setup-rls-helper.sql)

## Usage

You can run the script in two ways:

### Using the Shell Script (Recommended)

The shell script automatically loads environment variables from your `.env` file:

```bash
./scripts/run-fix-in-lieu.sh <command> [userId] [options]
```

### Using Node Directly

If you prefer to run the script directly with Node:

```bash
node scripts/fix-in-lieu.js <command> [userId] [options]
```

Note: When using Node directly, make sure your environment variables are properly set.

## Available Commands

1. **List Users**
   ```bash
   ./scripts/run-fix-in-lieu.sh list-users
   ```
   Lists all users in the system with their IDs, which you'll need for other commands.

2. **Check In-Lieu Records**
   ```bash
   ./scripts/run-fix-in-lieu.sh check-in-lieu <userId>
   ```
   Checks for existing in-lieu records for the specified user.

3. **Check Shift Overrides**
   ```bash
   ./scripts/run-fix-in-lieu.sh check-shifts <userId> [startDate] [endDate]
   ```
   Checks for InLieu shift overrides for the specified user, optionally within a date range.

4. **Create In-Lieu Record**
   ```bash
   ./scripts/run-fix-in-lieu.sh create-in-lieu <userId> <startDate> <endDate> [notes]
   ```
   Creates an in-lieu record and corresponding shift overrides for the specified user and date range.

5. **Check Permissions**
   ```bash
   ./scripts/run-fix-in-lieu.sh check-permissions
   ```
   Checks the RLS policies for the in_lieu_records and shift_overrides tables.

## Examples

1. List all users to find the user ID:
   ```bash
   ./scripts/run-fix-in-lieu.sh list-users
   ```

2. Check if a user has any in-lieu records:
   ```bash
   ./scripts/run-fix-in-lieu.sh check-in-lieu abc123
   ```

3. Create an in-lieu record for a user:
   ```bash
   ./scripts/run-fix-in-lieu.sh create-in-lieu abc123 2023-05-01 2023-05-03 "Public holiday"
   ```

4. Check shift overrides for a specific date range:
   ```bash
   ./scripts/run-fix-in-lieu.sh check-shifts abc123 2023-05-01 2023-05-03
   ```

## Setting Up the SQL Helper

Before using the script, you need to set up the SQL helper function in your Supabase database:

1. Go to the Supabase dashboard for your project
2. Navigate to the SQL Editor
3. Copy the contents of `setup-rls-helper.sql` and run it
4. You should see a notice that the function was created successfully

## Troubleshooting

If you encounter any issues:

1. Make sure your `.env` file contains the correct Supabase URL and service role key
2. Check that the user ID exists in the database
3. Verify that dates are in the correct format (YYYY-MM-DD)
4. Run the `check-permissions` command to verify that the script has the necessary database access
5. If you get an error about the `get_policies_for_table` function, make sure you've run the SQL helper script

## Security Warning

This script uses the Supabase service role key, which has admin privileges and bypasses RLS policies. Use it carefully and never expose this key in client-side code or public repositories. 