-- Add new columns to salaries table
ALTER TABLE salaries
ADD COLUMN act_as_pay NUMERIC DEFAULT 0,
ADD COLUMN pension_plan NUMERIC DEFAULT 0,
ADD COLUMN retroactive_deduction NUMERIC DEFAULT 0,
ADD COLUMN premium_card_deduction NUMERIC DEFAULT 0,
ADD COLUMN mobile_deduction NUMERIC DEFAULT 0,
ADD COLUMN absences NUMERIC DEFAULT 0,
ADD COLUMN sick_leave NUMERIC DEFAULT 0; 