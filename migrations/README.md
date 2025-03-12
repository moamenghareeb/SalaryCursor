# Database Migration Instructions

## Consolidating Leave Tables

To consolidate the `leave_requests` and `leaves` tables, follow these steps:

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of the `consolidate_leave_tables.sql` file
4. Paste it into the SQL Editor
5. Click "Run" to execute the migration

The migration script will:
1. Ensure the `leaves` table exists with all required columns
2. Migrate data from `leave_requests` to `leaves` if the `leave_requests` table exists
3. Leave the `leave_requests` table in place initially (you can manually drop it later when you confirm everything is working)

## After Migration

After running the migration:

1. Test the application to make sure leave functionality is working correctly
2. Once confirmed, you can drop the `leave_requests` table by running:

```sql
DROP TABLE IF EXISTS public.leave_requests;
```

## Troubleshooting

If you encounter any issues after migration:
- Check the browser console for any errors
- Verify that all leave data was properly migrated
- Make sure the table has the correct permissions (RLS policies) 