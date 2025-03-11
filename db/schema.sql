-- SalaryCursor Database Schema
-- This file contains all the necessary tables and indexes for the application

-- =========================
-- NOTIFICATION SYSTEM TABLES
-- =========================

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read BOOLEAN DEFAULT false,
  category VARCHAR(50),
  link VARCHAR(255)
);

-- Add indexes to the notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- =========================
-- API RATE LIMITING
-- =========================

-- Create rate_limits table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(255) NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON public.rate_limits(expires_at);

-- =========================
-- LEAVE MANAGEMENT TABLES
-- =========================

-- Create leave_allocations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.leave_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'annual',
  allocated_days DECIMAL(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes to the leave_allocations table
CREATE INDEX IF NOT EXISTS idx_leave_allocations_employee_id ON public.leave_allocations(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_allocations_year ON public.leave_allocations(year);

-- Create in_lieu_records table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.in_lieu_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_days_added DECIMAL(8,2) NOT NULL DEFAULT 0,
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM created_at)) STORED
);

-- Add indexes to the in_lieu_records table
CREATE INDEX IF NOT EXISTS idx_in_lieu_records_employee_id ON public.in_lieu_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_in_lieu_records_year ON public.in_lieu_records(year);

-- =========================
-- RLS POLICIES
-- =========================

-- Enable Row Level Security on all tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_lieu_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage rate limits" ON public.rate_limits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own leave allocations" ON public.leave_allocations
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "Admin can manage leave allocations" ON public.leave_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own in-lieu records" ON public.in_lieu_records
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "Users can create their own in-lieu records" ON public.in_lieu_records
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Admin can manage in-lieu records" ON public.in_lieu_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = auth.uid() AND role = 'admin'
    )
  ); 