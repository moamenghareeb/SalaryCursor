# In-Lieu Time Troubleshooting Guide

If you're experiencing issues with in-lieu time not appearing in your schedule, this guide will help you diagnose and fix the problem.

## Common Issues

1. **Authentication Issues**: The most common cause of in-lieu time not appearing is authentication problems. The system needs a valid authentication token to access your records.

2. **Row Level Security (RLS)**: The database uses RLS to ensure users can only access their own data. Sometimes these policies can prevent proper access.

3. **Missing Records**: In some cases, the in-lieu records might be missing from the database entirely.

## Step-by-Step Troubleshooting

### 1. Check Authentication

First, make sure you're properly authenticated:

1. Log out and log back in to refresh your authentication token
2. Clear your browser cache and cookies
3. Try using the application in an incognito/private browsing window

### 2. Use the Debug Tools

The application includes built-in debugging tools:

1. Navigate to the Schedule page
2. Look for the "Debug" button or panel
3. Click "Refresh Auth" to refresh your authentication token
4. Click "Test Auth" to verify your authentication is working
5. Check the console logs for any error messages (press F12 to open developer tools)

### 3. Check for Existing In-Lieu Records

You can check if you have any existing in-lieu records:

1. Navigate to the Leave page
2. Look for the "In-Lieu Time" section
3. Check if there are any existing records listed

### 4. Contact an Administrator

If you're still experiencing issues, contact an administrator who can use the fix-in-lieu.js script to:

1. Check if your in-lieu records exist in the database
2. Verify that shift overrides are properly created
3. Create missing in-lieu records if necessary

## For Administrators

If you're an administrator helping a user with in-lieu time issues, follow these steps:

### 1. Test Database Connection

First, test the database connection:

```bash
./scripts/run-test-db.sh
```

### 2. List Users

Find the user's ID:

```bash
./scripts/run-fix-in-lieu.sh list-users
```

### 3. Check In-Lieu Records

Check if the user has any in-lieu records:

```bash
./scripts/run-fix-in-lieu.sh check-in-lieu <userId>
```

### 4. Check Shift Overrides

Check if the user has any InLieu shift overrides:

```bash
./scripts/run-fix-in-lieu.sh check-shifts <userId>
```

### 5. Create In-Lieu Record

If needed, create a new in-lieu record:

```bash
./scripts/run-fix-in-lieu.sh create-in-lieu <userId> <startDate> <endDate> "Reason for in-lieu time"
```

Example:
```bash
./scripts/run-fix-in-lieu.sh create-in-lieu abc123 2023-05-01 2023-05-03 "Public holiday"
```

## Technical Details

The in-lieu time system works by:

1. Creating a record in the `in_lieu_records` table with the date range and leave credit
2. Creating shift overrides in the `shift_overrides` table for each day in the range
3. These shift overrides are then displayed on the calendar

If any part of this process fails, the in-lieu time may not appear correctly in the schedule.

## Need More Help?

If you're still experiencing issues after following this guide, please contact technical support with the following information:

1. Your user ID
2. The dates of the in-lieu time you're trying to add
3. Any error messages you're seeing
4. Screenshots of the issue 