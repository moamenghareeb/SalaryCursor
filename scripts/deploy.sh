#!/bin/bash

# Fail on any error
set -e

# Print commands as they're executed
set -x

# Ensure we're on the main branch
git checkout main
git pull origin main

# Install dependencies
npm ci

# Run type checking and linting
npm run typecheck
npm run lint

# Run tests
npm test

# Build the application
npm run build

# Run database migrations
npx prisma migrate deploy

# Optional: Backup database before deployment
npx prisma db push --accept-data-loss

# Restart application (adjust for your hosting platform)
pm2 restart nextjs-app 