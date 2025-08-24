#!/bin/bash

# Enhanced Database Schema Migration Script
# This script safely migrates the database to the enhanced schema

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

echo -e "${GREEN}Enhanced Database Schema Migration${NC}"
echo "===================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Step 1: Backup current database
echo -e "\n${YELLOW}Step 1: Creating database backup...${NC}"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
    echo "  Size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo -e "${RED}✗ Backup failed!${NC}"
    exit 1
fi

# Step 2: Test connection and current state
echo -e "\n${YELLOW}Step 2: Checking current database state...${NC}"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as user_count FROM \"User\";" > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Cannot connect to database!${NC}"
    exit 1
fi

# Show current stats
echo "Current database statistics:"
psql "$DATABASE_URL" -t -c "
  SELECT 
    'Users: ' || COUNT(*) FROM \"User\"
  UNION ALL
  SELECT 'Sessions: ' || COUNT(*) FROM \"Session\"
  UNION ALL
  SELECT 'Transcripts: ' || COUNT(*) FROM \"TranscriptEntry\";
"

# Step 3: Ask for confirmation
echo -e "\n${YELLOW}This migration will:${NC}"
echo "  - Create new tables: UserProfile, FamilyMember, CommunicationMetric, etc."
echo "  - Migrate data from denormalized to normalized structure"
echo "  - Add new indexes for performance"
echo "  - Update existing tables with new columns"

read -p "Do you want to proceed? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi

# Step 4: Run migration
echo -e "\n${YELLOW}Step 4: Running migration...${NC}"
psql "$DATABASE_URL" < prisma/migrations/enhanced-schema-migration.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migration completed successfully${NC}"
else
    echo -e "${RED}✗ Migration failed!${NC}"
    echo -e "${YELLOW}To restore from backup, run:${NC}"
    echo "  psql \$DATABASE_URL < $BACKUP_FILE"
    exit 1
fi

# Step 5: Verify migration
echo -e "\n${YELLOW}Step 5: Verifying migration...${NC}"

# Check new tables
echo "Checking new tables..."
for table in "UserProfile" "FamilyMember" "CommunicationMetric" "SessionFamilyMember"; do
    count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null | xargs)
    if [ -n "$count" ]; then
        echo -e "  ${GREEN}✓${NC} $table: $count records"
    else
        echo -e "  ${RED}✗${NC} $table: Not found or empty"
    fi
done

# Check family member migration
echo -e "\nChecking family member migration..."
fm_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"FamilyMember\";" | xargs)
if [ "$fm_count" -gt 0 ]; then
    echo -e "${GREEN}✓ Successfully migrated $fm_count family members${NC}"
else
    echo -e "${YELLOW}⚠ No family members found (this may be normal)${NC}"
fi

# Step 6: Update Prisma
echo -e "\n${YELLOW}Step 6: Updating Prisma schema...${NC}"

# Backup current schema
cp prisma/schema.prisma "prisma/schema.backup.${TIMESTAMP}.prisma"
echo -e "${GREEN}✓ Current schema backed up${NC}"

# Copy enhanced schema
if [ -f "prisma/schema.enhanced.prisma" ]; then
    cp prisma/schema.enhanced.prisma prisma/schema.prisma
    echo -e "${GREEN}✓ Enhanced schema copied${NC}"
    
    # Generate Prisma client
    echo "Generating Prisma client..."
    npm run prisma:generate
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Prisma client generated${NC}"
    else
        echo -e "${RED}✗ Failed to generate Prisma client${NC}"
        echo -e "${YELLOW}Manual intervention required${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Enhanced schema file not found${NC}"
    echo "  Please manually update prisma/schema.prisma"
fi

# Step 7: Final summary
echo -e "\n${GREEN}Migration Summary${NC}"
echo "================="
echo -e "${GREEN}✓ Database migrated successfully${NC}"
echo -e "${GREEN}✓ Backup saved to: $BACKUP_FILE${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Test the application thoroughly"
echo "2. Monitor for any errors"
echo "3. Deploy updated application code"

echo -e "\n${YELLOW}If you need to rollback:${NC}"
echo "1. psql \$DATABASE_URL < $BACKUP_FILE"
echo "2. cp prisma/schema.backup.${TIMESTAMP}.prisma prisma/schema.prisma"
echo "3. npm run prisma:generate"

echo -e "\n${GREEN}Migration completed!${NC}"