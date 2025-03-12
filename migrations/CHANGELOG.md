# Database Migration Changelog

## March 12, 2025: Consolidate Leave Tables

### Changes Made:

1. Created a migration script to consolidate `leave_requests` and `leaves` tables:
   - Ensures `leaves` table exists with all required columns
   - Migrates data from `leave_requests` to `leaves` if needed
   - Adds appropriate RLS policies to maintain security

2. Updated application code to use a consistent table schema:
   - Modified all references to `leave_requests` in `pages/schedule.tsx` to use `leaves` instead
   - Updated API code in `pages/api/leave/calendar.ts` to use `leaves` table
   - Updated annual leave management page (`pages/annual-leave.tsx`) to use `leaves` table
   - Removed redundant `fetchLeavesFromLeavesTable` function in `schedule.tsx`
   - Added data mapping for backward compatibility where needed

### Benefits:

- Consistent database schema across the application
- Simplified code with single source of truth for leave data
- Better data integrity with consolidated records
- Eliminated errors related to missing tables or columns

### Notes:

- The `leave_requests` table is not automatically dropped by the migration
- Manual verification should be done before dropping the table
- Execute `DROP TABLE IF EXISTS public.leave_requests;` in SQL Editor when ready 