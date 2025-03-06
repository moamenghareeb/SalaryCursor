#!/bin/bash

# Deployment Script for SalaryCursor

# Exit on any error
set -e

# Variables
REPO_DIR="/path/to/salarycursor"
REMOTE_SERVER="user@your-server.com"
DEPLOY_PATH="/var/www/salarycursor"

# 1. Local Preparations
cd $REPO_DIR
git pull origin main
npm ci
npm run build

# 2. Run Tests
npm test

# 3. Remote Deployment
ssh $REMOTE_SERVER << DEPLOY_COMMANDS
  cd $DEPLOY_PATH
  
  # Stop current services
  docker-compose down
  
  # Pull latest images
  docker-compose pull
  
  # Run database migrations
  docker-compose run --rm nextjs-app npx prisma migrate deploy
  
  # Start services
  docker-compose up -d
  
  # Cleanup old images
  docker image prune -f
DEPLOY_COMMANDS

echo "🚀 Deployment Successful!" 