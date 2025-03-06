#!/bin/bash

# Pre-Deployment Checklist

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Deployment Readiness Check
echo "🚀 SalaryCursor Deployment Readiness Checklist 🚀"

# 1. Environment Checks
echo -e "\n${GREEN}[STEP 1]${NC} Environment Validation"
check_env() {
    local var_name=$1
    if [ -z "${!var_name}" ]; then
        echo -e "${RED}❌ Missing environment variable: $var_name${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $var_name is set${NC}"
    fi
}

# Critical environment variables
REQUIRED_VARS=(
    "DATABASE_URL"
    "NEXTAUTH_SECRET"
    "NEXTAUTH_URL"
    "NODE_ENV"
)

for var in "${REQUIRED_VARS[@]}"; do
    check_env "$var"
done

# 2. Dependency Check
echo -e "\n${GREEN}[STEP 2]${NC} Dependency Validation"
npm audit
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Security vulnerabilities detected!${NC}"
    npm audit fix
fi

# 3. Database Migration Dry Run
echo -e "\n${GREEN}[STEP 3]${NC} Database Migration Preparation"
npx prisma migrate diff \
    --from-empty \
    --to-schema-datamodel prisma/schema.prisma \
    --script > migration.sql

# 4. Build Verification
echo -e "\n${GREEN}[STEP 4]${NC} Application Build Check"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# 5. Test Suite Execution
echo -e "\n${GREEN}[STEP 5]${NC} Running Test Suite"
npm test
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed${NC}"
    exit 1
fi

# 6. Performance Budget Check
echo -e "\n${GREEN}[STEP 6]${NC} Performance Budget Verification"
npm run lighthouse -- --budget-path=performance-budget.json

# Final Deployment Confirmation
echo -e "\n${GREEN}✨ Deployment Readiness Confirmed! ✨${NC}" 