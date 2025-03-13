#!/bin/bash

# Script to run test-db-connection.js with the correct environment variables

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

# Run the test-db-connection.js script
node scripts/test-db-connection.js 