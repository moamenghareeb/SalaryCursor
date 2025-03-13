# Debug Components Archive

This folder contains debugging components that were used to fix issues with Row Level Security (RLS) policies in the Supabase database, particularly related to in-lieu time not appearing in the schedule.

## Components

1. **FixRLSButton.tsx**: A button component that fixes RLS policies by creating a test record and refreshing permissions.
2. **TestInLieuCreator.tsx**: A component that creates test in-lieu shifts for debugging purposes.
3. **ScheduleDebugger.tsx**: A comprehensive debugging tool that can check, create, and delete shift overrides.

## How to Use

If you encounter issues with in-lieu time not appearing in the schedule or other RLS-related problems, you can:

1. Import these components in your pages:
   ```typescript
   import ScheduleDebugger from '../components/debug_archive/ScheduleDebugger';
   import TestInLieuCreator from '../components/debug_archive/TestInLieuCreator';
   import FixRLSButton from '../components/debug_archive/FixRLSButton';
   ```

2. Add them to your page:
   ```jsx
   {process.env.NODE_ENV === 'development' && (
     <div className="mb-6">
       <ScheduleDebugger userId={userId} />
       <TestInLieuCreator />
       <FixRLSButton />
     </div>
   )}
   ```

3. Use the FixRLSButton to fix RLS policies if in-lieu time is not appearing.
4. Use TestInLieuCreator to create test in-lieu shifts.
5. Use ScheduleDebugger for more advanced diagnostics and fixes.

## Issue Background

The original issue was that Row Level Security (RLS) policies in the Supabase database were preventing the application from reading in-lieu shifts, even though they could be created. The FixRLSButton component fixes this by creating a test record, which forces a refresh of permissions.

These components are archived here in case similar issues occur in the future. 