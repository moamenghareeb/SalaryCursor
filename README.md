## Database Setup

If you encounter errors about missing database tables, you can run the SQL schema file to create them:

1. Make sure you have your Supabase project set up and linked to your local environment
2. Run the following command to apply the schema:

```bash
supabase db reset
```

Or manually execute the SQL in `db/schema.sql` using the Supabase dashboard SQL editor.

The schema file creates the following tables if they don't exist:
- `notifications` - For storing user notifications
- `rate_limits` - For API rate limiting functionality
- `leave_allocations` - For storing annual leave allocations by year 