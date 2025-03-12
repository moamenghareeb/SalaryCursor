import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { applyRateLimit, RateLimitType } from '../../../lib/rateLimit';
import { logger } from '../../../lib/logger';

// Helper for input validation
function validateInput(input: any) {
  const errors: string[] = [];
  
  // Validate name
  if (!input.name || typeof input.name !== 'string' || input.name.trim().length < 2) {
    errors.push('Full name is required and must be at least 2 characters');
  }
  
  // Validate employee ID
  const employeeIdRegex = /^[a-zA-Z0-9]{4,20}$/;
  if (!input.employeeId || !employeeIdRegex.test(input.employeeId)) {
    errors.push('Employee ID must be 4-20 alphanumeric characters');
  }
  
  // Validate position
  const validPositions = [
    'Junior DCS Engineer', 
    'DCS Engineer', 
    'Senior DCS Engineer', 
    'Shift Engineer', 
    'Shift Superintendent', 
    'Operator', 
    'Operator I', 
    'Senior Operator', 
    'Field Supervisor'
  ];
  
  if (!input.position || !validPositions.includes(input.position)) {
    errors.push('Please select a valid position');
  }
  
  // Validate password
  if (!input.password || typeof input.password !== 'string' || input.password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  const hasUppercase = /[A-Z]/.test(input.password || '');
  const hasLowercase = /[a-z]/.test(input.password || '');
  const hasNumber = /[0-9]/.test(input.password || '');
  
  if (!(hasUppercase && hasLowercase && hasNumber)) {
    errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
  }
  
  return errors;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Apply rate limiting for signup
  if (applyRateLimit(req, res, RateLimitType.AUTH)) {
    logger.warn('Signup attempt rate limited', { 
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress 
    });
    return; // Response already sent by applyRateLimit
  }
  
  try {
    const { name, employeeId, position, password } = req.body;
    
    // Validate inputs
    const validationErrors = validateInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationErrors 
      });
    }
    
    // Create email from employee ID
    const email = `${employeeId}@company.local`;
    
    // Check if user with this employee ID already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_id', employeeId)
      .single();
    
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this Employee ID already exists' });
    }
    
    // Create the user account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          employee_id: employeeId,
          position
        }
      }
    });
    
    if (error) {
      logger.error('Signup error', { 
        error: error.message,
        employeeId
      });
      return res.status(400).json({ error: error.message });
    }
    
    // Store additional employee information in custom table
    if (data.user) {
      try {
        const { error: profileError } = await supabase
          .from('employees')
          .insert({
            id: data.user.id, // Use the same ID from auth.users
            name,
            employee_id: employeeId,
            position,
            email: email,
            created_at: new Date()
          });
          
        if (profileError) {
          logger.error('Error creating employee profile', { 
            error: profileError.message,
            userId: data.user.id
          });
          
          // Don't fail the request, but log the error
          // The user can still sign in, they'll just be missing profile data
        }
      } catch (profileError: any) {
        logger.error('Exception creating employee profile', {
          error: profileError.message,
          userId: data.user.id
        });
      }
    }
    
    // Log successful signup
    logger.info('User registered successfully', {
      userId: data.user?.id,
      employeeId
    });
    
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        employeeId
      }
    });
  } catch (error: any) {
    logger.error('Signup exception', { error: error.message });
    return res.status(500).json({ error: 'Registration failed' });
  }
} 