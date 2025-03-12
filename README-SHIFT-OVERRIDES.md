# Shift Overrides Implementation Guide

This document explains how to implement bidirectional leave management between the Schedule page and the Leave page.

## Database Setup

First, you need to create the `shift_overrides` table in your Supabase database. Run the SQL statement found in `/Users/moamenghareeb/SalaryCursor/supabase/migrations/20240520_create_shift_overrides_table.sql`.

## How It Works

1. **Schedule Page to Leave Page**:
   - When a user marks a day as "Leave" in the schedule page, a leave request is automatically created
   - If the leave request is approved, it will appear in the leave page

2. **Leave Page to Schedule Page**:
   - When a user submits a leave request from the leave page, shift overrides are automatically created
   - These shift overrides will appear as "Leave" days in the schedule page

3. **Cancellation**:
   - When a user cancels a leave request from either page, the corresponding entries are removed from both

## Implementation Details

The implementation includes:

1. An updated `handleEditShift` function in the schedule page that creates leave requests
2. A modified `fetchLeaveRecords` function that syncs leave records to shift overrides
3. New `handleLeaveRequest` and `syncLeaveToShiftOverrides` functions for bidirectional integration
4. A database migration file for the `shift_overrides` table

The code has been implemented to be backward compatible, with graceful fallbacks if the database tables don't exist yet.