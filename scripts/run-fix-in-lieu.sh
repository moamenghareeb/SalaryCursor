#!/bin/bash

# Script to run fix-in-lieu.js with the correct environment variables
# This ensures the script has access to the necessary environment variables

# Change to the project root directory
cd "$(dirname "$0")/.."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found in project root"
  echo "Please create a .env file with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Check if required environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "Error: NEXT_PUBLIC_SUPABASE_URL is not set in .env file"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_SERVICE_ROLE_KEY is not set in .env file"
  exit 1
fi

# Run the fix-in-lieu.js script with all arguments passed to this script
node scripts/fix-in-lieu.js "$@" 