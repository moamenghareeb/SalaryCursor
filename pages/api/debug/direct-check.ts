import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import Cors from 'cors';

// Initialize the cors middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  origin: '*', // For debugging purposes, allow all origins
  credentials: true,
});

// Helper method to run middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

/**
 * Special debug endpoint that can directly check and fix shift overrides
 * This endpoint supports several operations:
 * 1. check - Verify if in-lieu shifts exist for a date range
 * 2. force-create - Force create in-lieu shifts for a date range
 * 3. force-delete - Force delete in-lieu shifts for a date range
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable cors for all requests to this endpoint
  await runMiddleware(req, res, cors);

  // This is a debugging endpoint, only available in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    console.log('[DEBUG API] Processing request:', req.query);
    console.log('[DEBUG API] Headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Not present',
      cookie: req.headers.cookie ? 'Present' : 'Not present',
    });
    
    // Get auth token from various sources
    const tokenFromQuery = req.query.token as string;
    const tokenFromHeader = req.headers.authorization?.replace('Bearer ', '') || null;
    
    // Try multiple auth methods to ensure we get a valid session
    let userId: string | null = null;
    let authDebugInfo: any = {
      tokenSources: {
        query: !!tokenFromQuery,
        header: !!tokenFromHeader,
      }
    };
    
    // Method 1: Get session from supabase auth - try to acquire an admin session if needed
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        userId = sessionData.session.user.id;
        authDebugInfo.method = 'supabase_session';
        console.log('[DEBUG API] Found user via supabase session:', userId);
      } else {
        authDebugInfo.sessionError = sessionError?.message || 'No session found';
        console.log('[DEBUG API] No session from supabase auth:', sessionError);
      }
    } catch (sessionExtractionError: any) {
      authDebugInfo.sessionExtractionError = sessionExtractionError.message;
      console.log('[DEBUG API] Error extracting session:', sessionExtractionError);
    }
      
    // Method 2: Try with token from query or header (debug only)
    if (!userId) {
      const tokenToTry = tokenFromQuery || tokenFromHeader;
      if (tokenToTry) {
        try {
          const { data: tokenData, error: tokenError } = await supabase.auth.getUser(tokenToTry);
          if (tokenData?.user?.id) {
            userId = tokenData.user.id;
            authDebugInfo.method = tokenFromQuery ? 'query_token' : 'header_token';
            console.log('[DEBUG API] Found user via token:', userId);
          } else {
            authDebugInfo.tokenError = tokenError?.message || 'Invalid token';
            console.log('[DEBUG API] Invalid token from query/header:', tokenError);
          }
        } catch (tokenExtractionError: any) {
          authDebugInfo.tokenExtractionError = tokenExtractionError.message;
          console.log('[DEBUG API] Error extracting user from token:', tokenExtractionError);
        }
      }
    }
      
    // Method 3: Hard-coded test user ID for debugging (only in development)
    if (!userId && process.env.NODE_ENV === 'development') {
      // Check for specific query flag to allow test user
      if (req.query.testMode === 'true') {
        // 1. Try to get the first user from the database as a fallback
        try {
          const { data: firstUser, error: userError } = await supabase
            .from('employees')
            .select('id')
            .limit(1)
            .single();
              
          if (firstUser?.id) {
            userId = firstUser.id;
            authDebugInfo.method = 'first_user_fallback';
            console.log('[DEBUG API] Using first user as fallback:', userId);
          } else {
            authDebugInfo.firstUserError = userError?.message || 'No users found';
          }
        } catch (employeeError: any) {
          authDebugInfo.employeeQueryError = employeeError.message;
          console.log('[DEBUG API] Error querying employees table:', employeeError);
          
          // Last resort - manual override with test user ID if provided
          if (req.query.forceUserId) {
            userId = req.query.forceUserId as string;
            authDebugInfo.method = 'force_user_id';
            console.log('[DEBUG API] Using forced user ID:', userId);
          }
        }
      }
    }
    
    // If no authentication, return error with debug info
    if (!userId) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'You must be logged in to use this endpoint',
        tip: 'Try logging in through the application first or provide a token via query param or header',
        authDebugInfo,
        headers: {
          authorization: req.headers.authorization ? 'Present' : 'Not present',
          cookie: req.headers.cookie ? 'Present' : 'Not present',
          'content-type': req.headers['content-type'],
        },
        helpUrl: '/schedule?debug=true' // Direct the user to the schedule page with debug enabled
      });
    }
    
    // Parse query parameters
    const operation = req.query.op as string || 'check';
    const startDate = req.query.start as string;
    const endDate = req.query.end as string;
    
    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Missing parameters', 
        message: 'Both start and end dates are required',
        example: '/api/debug/direct-check?start=2025-03-01&end=2025-03-05&op=check'
      });
    }
    
    // Ensure dates are valid
    const startDateObj = parseISO(startDate);
    const endDateObj = parseISO(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format', 
        message: 'Dates must be in YYYY-MM-DD format'
      });
    }
    
    // Generate array of all days in the date range
    const days = eachDayOfInterval({
      start: startDateObj,
      end: endDateObj
    }).map(date => format(date, 'yyyy-MM-dd'));
    
    console.log(`[DEBUG API] Processing ${operation} for user ${userId} from ${startDate} to ${endDate} (${days.length} days)`);
    
    // Execute the requested operation
    let result: any = {};
    
    if (operation === 'check') {
      // Check if in-lieu shifts exist for the specified dates
      const { data: existingOverrides, error: checkError } = await supabase
        .from('shift_overrides')
        .select('*')
        .eq('employee_id', userId)
        .in('date', days);
        
      if (checkError) {
        console.error('[DEBUG API] Database error in check operation:', checkError);
        return res.status(500).json({ 
          error: 'Database error', 
          message: checkError.message,
          operation: 'check'
        });
      }
      
      // Filter for in-lieu shifts
      const inLieuShifts = (existingOverrides || []).filter(o => o.shift_type === 'InLieu');
      const otherShifts = (existingOverrides || []).filter(o => o.shift_type !== 'InLieu');
      
      console.log(`[DEBUG API] Found ${inLieuShifts.length} in-lieu shifts out of ${existingOverrides?.length || 0} total overrides`);
      
      // Check for days with no override
      const daysWithOverrides = (existingOverrides || []).map(o => o.date);
      const daysWithoutOverrides = days.filter(day => !daysWithOverrides.includes(day));
      
      // Also check for in-lieu records in the in_lieu_records table
      const { data: inLieuRecords, error: inLieuRecordsError } = await supabase
        .from('in_lieu_records')
        .select('*')
        .eq('employee_id', userId)
        .lte('start_date', endDate)
        .gte('end_date', startDate);
        
      if (inLieuRecordsError) {
        console.error('[DEBUG API] Database error checking in-lieu records:', inLieuRecordsError);
      }
      
      result = {
        dateRange: { startDate, endDate },
        totalDays: days.length,
        daysWithOverrides: daysWithOverrides.length,
        daysWithoutOverrides: daysWithoutOverrides.length,
        inLieuShifts: {
          count: inLieuShifts.length,
          details: inLieuShifts
        },
        inLieuRecords: {
          count: inLieuRecords?.length || 0,
          details: inLieuRecords || []
        },
        otherShifts: {
          count: otherShifts.length,
          details: otherShifts
        },
        missingDays: daysWithoutOverrides,
        userId: userId,
        authMethod: authDebugInfo.method
      };
    } 
    else if (operation === 'force-create') {
      // First, check which days already have overrides
      const { data: existingOverrides, error: checkError } = await supabase
        .from('shift_overrides')
        .select('date')
        .eq('employee_id', userId)
        .in('date', days);
        
      if (checkError) {
        console.error('[DEBUG API] Database error checking existing overrides:', checkError);
        return res.status(500).json({ 
          error: 'Database error', 
          message: checkError.message,
          operation: 'force-create',
          step: 'checking existing overrides'
        });
      }
      
      // Create array of days that don't have overrides yet
      const existingDates = (existingOverrides || []).map(o => o.date);
      const daysToCreate = days.filter(day => !existingDates.includes(day));
      
      console.log(`[DEBUG API] Creating shifts for ${daysToCreate.length} days (${existingDates.length} already exist)`);
      
      // Create new shift overrides
      const newOverrides = daysToCreate.map(day => ({
        employee_id: userId,
        date: day,
        shift_type: 'InLieu',
        source: 'debug_endpoint'
      }));
      
      // Insert them if any exist
      let createResult = null;
      if (newOverrides.length > 0) {
        const { data, error: createError } = await supabase
          .from('shift_overrides')
          .insert(newOverrides)
          .select();
          
        if (createError) {
          console.error('[DEBUG API] Database error inserting new overrides:', createError);
          return res.status(500).json({ 
            error: 'Database error', 
            message: createError.message,
            operation: 'force-create',
            step: 'inserting new overrides'
          });
        }
        
        createResult = data;
        console.log(`[DEBUG API] Successfully created ${data?.length || 0} new shift overrides`);
      }
      
      // Also create an in-lieu record for the entire range
      const daysCount = days.length;
      const leaveAdded = parseFloat((daysCount * 0.667).toFixed(2)); // 2/3 day credit per day
      
      const { data: inLieuRecord, error: inLieuError } = await supabase
        .from('in_lieu_records')
        .insert([{
          employee_id: userId,
          start_date: startDate,
          end_date: endDate,
          days_count: daysCount,
          leave_days_added: leaveAdded,
          notes: 'Created via debug endpoint',
          status: 'Approved' // Make sure it's approved
        }])
        .select();
        
        if (inLieuError) {
          console.error('[DEBUG API] Database error creating in-lieu record:', inLieuError);
          return res.status(500).json({ 
            error: 'Database error', 
            message: inLieuError.message,
            operation: 'force-create',
            step: 'creating in-lieu record'
          });
        }
        
        console.log(`[DEBUG API] Successfully created in-lieu record: ${inLieuRecord?.length || 0}`);
        
        // Verify the creation worked
        const { data: verifyOverrides, error: verifyError } = await supabase
          .from('shift_overrides')
          .select('*')
          .eq('employee_id', userId)
          .in('date', days)
          .eq('shift_type', 'InLieu');
          
        if (verifyError) {
          console.error('[DEBUG API] Database error verifying creation:', verifyError);
          return res.status(500).json({ 
            error: 'Database error', 
            message: verifyError.message,
            operation: 'force-create',
            step: 'verifying creation'
          });
        }
        
        console.log(`[DEBUG API] Verification found ${verifyOverrides?.length || 0} in-lieu shifts`);
        
        // Force invalidate queries by calling the refresh endpoint if it exists
        try {
          const refreshEvent = new Event('refresh-schedule');
          console.log('[DEBUG API] Triggering refresh event');
        } catch (refreshError) {
          console.log('[DEBUG API] Could not trigger refresh event:', refreshError);
        }
        
        result = {
          operation: 'force-create',
          dateRange: { startDate, endDate },
          totalDays: days.length,
          created: {
            shiftsCreated: newOverrides.length,
            shiftsVerified: verifyOverrides?.length || 0,
            inLieuRecordCreated: !!inLieuRecord
          },
          details: {
            newOverrides: createResult,
            inLieuRecord
          },
          userId: userId,
          authMethod: authDebugInfo.method,
          nextSteps: [
            "Return to the schedule page and use the 'Refresh Schedule' button",
            "Check if the in-lieu shifts appear in the calendar",
            "If not, check the browser console for any errors"
          ]
        };
    }
    else if (operation === 'force-delete') {
      // Delete shift overrides for the date range
      const { data: deleteData, error: deleteError } = await supabase
        .from('shift_overrides')
        .delete()
        .eq('employee_id', userId)
        .in('date', days)
        .eq('shift_type', 'InLieu')
        .select();
        
      if (deleteError) {
        console.error('[DEBUG API] Database error deleting shift overrides:', deleteError);
        return res.status(500).json({ 
          error: 'Database error', 
          message: deleteError.message,
          operation: 'force-delete',
          step: 'deleting shift overrides'
        });
      }
      
      console.log(`[DEBUG API] Deleted ${deleteData?.length || 0} shift overrides`);
      
      // Also delete any in-lieu records that overlap with this date range
      const { data: inLieuRecords, error: findError } = await supabase
        .from('in_lieu_records')
        .select('id')
        .eq('employee_id', userId)
        .lte('start_date', endDate)
        .gte('end_date', startDate);
        
      if (findError) {
        console.error('[DEBUG API] Database error finding in-lieu records:', findError);
        return res.status(500).json({ 
          error: 'Database error', 
          message: findError.message,
          operation: 'force-delete',
          step: 'finding in-lieu records'
        });
      }
      
      console.log(`[DEBUG API] Found ${inLieuRecords?.length || 0} in-lieu records to delete`);
      
      // Delete found in-lieu records
      let deletedInLieuRecords = null;
      if (inLieuRecords && inLieuRecords.length > 0) {
        const inLieuIds = inLieuRecords.map(record => record.id);
        
        const { data: inLieuDeleteData, error: inLieuDeleteError } = await supabase
          .from('in_lieu_records')
          .delete()
          .in('id', inLieuIds)
          .select();
          
        if (inLieuDeleteError) {
          console.error('[DEBUG API] Database error deleting in-lieu records:', inLieuDeleteError);
          return res.status(500).json({ 
            error: 'Database error', 
            message: inLieuDeleteError.message,
            operation: 'force-delete',
            step: 'deleting in-lieu records'
          });
        }
        
        deletedInLieuRecords = inLieuDeleteData;
        console.log(`[DEBUG API] Successfully deleted ${inLieuDeleteData?.length || 0} in-lieu records`);
      }
      
      result = {
        operation: 'force-delete',
        dateRange: { startDate, endDate },
        totalDays: days.length,
        deleted: {
          shiftsDeleted: deleteData?.length || 0,
          inLieuRecordsDeleted: deletedInLieuRecords?.length || 0
        },
        details: {
          deletedShifts: deleteData,
          deletedInLieuRecords: deletedInLieuRecords
        },
        userId: userId,
        authMethod: authDebugInfo.method
      };
    }
    else if (operation === 'auth-test') {
      // Special operation to just test authentication
      result = {
        operation: 'auth-test',
        authenticated: true,
        userId: userId,
        authMethod: authDebugInfo.method,
        authDetails: authDebugInfo
      };
    }
    else {
      return res.status(400).json({ 
        error: 'Invalid operation', 
        message: `Operation '${operation}' not supported`,
        supportedOperations: ['check', 'force-create', 'force-delete', 'auth-test']
      });
    }
    
    console.log(`[DEBUG API] Operation ${operation} completed successfully`);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[DEBUG API] Unexpected error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 