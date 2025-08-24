#!/bin/bash

# Pre-Migration Validation Script
# Run this before attempting any database migration

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Pre-Migration Validation${NC}"
echo "========================"

# Validation results
ERRORS=0
WARNINGS=0

# Function to check condition
check() {
    local condition=$1
    local description=$2
    local severity=$3  # error or warning
    
    if eval "$condition"; then
        echo -e "${GREEN}✓${NC} $description"
    else
        if [ "$severity" = "error" ]; then
            echo -e "${RED}✗${NC} $description"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠${NC} $description"
            ((WARNINGS++))
        fi
    fi
}

# 1. Environment checks
echo -e "\n${YELLOW}1. Environment Configuration${NC}"
check '[ -n "$DATABASE_URL" ]' "DATABASE_URL is set" "error"
check '[ -n "$DIRECT_URL" ]' "DIRECT_URL is set (for migrations)" "warning"
check '[ -f ".env" ]' ".env file exists" "error"
check '[ -f "prisma/schema.prisma" ]' "Prisma schema exists" "error"
check '[ -f "prisma/schema.enhanced.prisma" ]' "Enhanced schema exists" "error"

# 2. Database connectivity
echo -e "\n${YELLOW}2. Database Connectivity${NC}"
if [ -n "$DATABASE_URL" ]; then
    check 'psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1' "Can connect to database" "error"
    
    # Check if it's a Supabase URL
    if [[ "$DATABASE_URL" == *"supabase"* ]]; then
        echo -e "${GREEN}✓${NC} Detected Supabase database"
        
        # Check pooler vs direct connection
        if [[ "$DATABASE_URL" == *"pooler.supabase.com"* ]]; then
            echo -e "${GREEN}✓${NC} Using pooled connection for app"
        else
            echo -e "${YELLOW}⚠${NC} Not using pooled connection"
            ((WARNINGS++))
        fi
    fi
fi

# 3. Current schema analysis
echo -e "\n${YELLOW}3. Current Schema Analysis${NC}"
if [ -n "$DATABASE_URL" ]; then
    # Check for denormalized fields that need migration
    DENORM_COUNT=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'User' 
        AND column_name LIKE 'familyMember%'
    " 2>/dev/null | xargs)
    
    if [ "$DENORM_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}⚠${NC} Found $DENORM_COUNT denormalized family member fields"
        ((WARNINGS++))
    fi
    
    # Check for existing enhanced tables
    for table in "UserProfile" "FamilyMember" "CommunicationMetric" "SessionFamilyMember"; do
        EXISTS=$(psql "$DATABASE_URL" -t -c "
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '$table'
            )
        " 2>/dev/null | xargs)
        
        if [ "$EXISTS" = "t" ]; then
            echo -e "${YELLOW}⚠${NC} Table $table already exists"
            ((WARNINGS++))
        fi
    done
fi

# 4. Data integrity checks
echo -e "\n${YELLOW}4. Data Integrity${NC}"
if [ -n "$DATABASE_URL" ]; then
    # Check for orphaned sessions
    ORPHANED=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM \"Session\" s
        LEFT JOIN \"User\" u ON s.\"userId\" = u.id
        WHERE u.id IS NULL
    " 2>/dev/null | xargs)
    
    check '[ "$ORPHANED" = "0" ]' "No orphaned sessions (found: $ORPHANED)" "warning"
    
    # Check for users with family members
    FAMILY_USERS=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM \"User\"
        WHERE \"familyMember1\" IS NOT NULL 
        OR \"familyMember2\" IS NOT NULL
    " 2>/dev/null | xargs)
    
    if [ "$FAMILY_USERS" -gt 0 ]; then
        echo -e "${BLUE}ℹ${NC} $FAMILY_USERS users have family member data to migrate"
    fi
fi

# 5. Prisma checks
echo -e "\n${YELLOW}5. Prisma Configuration${NC}"
check 'command -v npx > /dev/null' "npx is available" "error"
check '[ -f "package.json" ]' "package.json exists" "error"
check '[ -d "node_modules/@prisma/client" ]' "Prisma client installed" "warning"

# Check if migrations directory exists
if [ -d "prisma/migrations" ]; then
    MIGRATION_COUNT=$(ls -1 prisma/migrations 2>/dev/null | wc -l)
    echo -e "${BLUE}ℹ${NC} Found $MIGRATION_COUNT existing migrations"
fi

# 6. Backup capability
echo -e "\n${YELLOW}6. Backup Capability${NC}"
check 'command -v pg_dump > /dev/null' "pg_dump is available" "error"
check '[ -w "." ]' "Can write to current directory" "error"
check '[ -d "backups" ] || mkdir -p backups 2>/dev/null' "Backup directory accessible" "error"

# 7. Application checks
echo -e "\n${YELLOW}7. Application Readiness${NC}"
check '[ -f "src/lib/prisma-enhanced.ts" ]' "Enhanced Prisma client exists" "warning"
check '[ -f "src/lib/database-operations.ts" ]' "Database operations wrapper exists" "warning"

# Final summary
echo -e "\n${BLUE}Validation Summary${NC}"
echo "=================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "Ready to proceed with migration."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ No errors, but $WARNINGS warning(s) found.${NC}"
    echo "Review warnings before proceeding."
    exit 0
else
    echo -e "${RED}✗ Found $ERRORS error(s) and $WARNINGS warning(s).${NC}"
    echo "Fix errors before proceeding with migration."
    exit 1
fi