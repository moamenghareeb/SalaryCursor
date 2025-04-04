# SalaryCursor

A streamlined application for managing salary and leave information.

## Features

- **Salary Management**: View and track your salary history
- **Leave Tracking**: Manage leave requests and track your balance
- **Dark Mode Support**: Comfortable viewing in any lighting condition

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: React Hooks + Context API
- **Data Fetching**: SWR
- **Error Tracking**: Sentry
- **PDF Generation**: React-PDF

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
- `in_lieu_records` - For storing in-lieu time records

## Project Structure

- `/components` - Reusable UI components
- `/lib` - Core utilities and context providers
- `/pages` - Next.js pages and API routes
- `/styles` - Global styles and TailwindCSS config
- `/utils` - Helper functions and utilities
- `/db` - Database schema and migrations

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run the development server: `npm run dev`

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Deployment

The application is configured for deployment on Vercel.

```bash
npm run build
```

For production builds, or use the continuous deployment workflow with GitHub.

## Troubleshooting

### In-Lieu Time Issues

If you're experiencing issues with in-lieu time not appearing in your schedule, we've created a set of scripts to help diagnose and fix these problems:

1. **Test Database Connection**:
   ```bash
   ./scripts/run-test-db.sh
   ```
   This script tests the connection to the database and verifies that all required tables are accessible.

2. **Fix In-Lieu Time Records**:
   ```bash
   ./scripts/run-fix-in-lieu.sh <command> [userId] [options]
   ```
   This script provides several commands to diagnose and fix in-lieu time issues:
   - `list-users`: List all users in the system
   - `check-in-lieu <userId>`: Check in-lieu records for a user
   - `check-shifts <userId> [startDate] [endDate]`: Check shift overrides for a user
   - `create-in-lieu <userId> <startDate> <endDate> [notes]`: Create an in-lieu record for a user
   - `check-permissions`: Check RLS policies

For more detailed information, see the [scripts README](./scripts/README.md). 