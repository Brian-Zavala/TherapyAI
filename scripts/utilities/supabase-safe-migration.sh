#!/bin/bash

# Supabase-Safe Enhanced Database Migration Script
# Follows Prisma best practices for production Supabase databases

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Supabase Enhanced Database Migration Script     ║${NC}"
echo -e "${BLUE}║  Following Prisma + Supabase Best Practices      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
MIGRATION_LOG="./migration_${TIMESTAMP}.log"

# Function to log messages
log() {
    echo -e "$1" | tee -a "$MIGRATION_LOG"
}

# Function to check prerequisites
check_prerequisites() {
    log "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        log "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
        exit 1
    fi
    
    # Check if DIRECT_URL is set (required for migrations)
    if [ -z "$DIRECT_URL" ]; then
        log "${YELLOW}WARNING: DIRECT_URL not set. Using DATABASE_URL for migrations.${NC}"
        log "${YELLOW}For production, set DIRECT_URL to bypass Supavisor pooling.${NC}"
        export DIRECT_URL="$DATABASE_URL"
    fi
    
    # Check for Prisma
    if ! command -v npx &> /dev/null; then
        log "${RED}ERROR: npx not found. Please install Node.js${NC}"
        exit 1
    fi
    
    # Check for psql
    if ! command -v psql &> /dev/null; then
        log "${RED}ERROR: psql not found. Please install PostgreSQL client${NC}"
        exit 1
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    log "${GREEN}✓ Prerequisites checked${NC}"
}

# Function to create backup
create_backup() {
    log "\n${YELLOW}Step 1: Creating database backup...${NC}"
    
    local backup_file="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"
    
    # Use pg_dump with proper options for Supabase
    pg_dump "$DATABASE_URL" \
        --no-owner \
        --no-privileges \
        --no-tablespaces \
        --if-exists \
        --clean \
        --quote-all-identifiers \
        > "$backup_file" 2>&1
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✓ Backup created: $backup_file${NC}"
        log "  Size: $(du -h "$backup_file" | cut -f1)"
        echo "$backup_file" # Return backup file path
    else
        log "${RED}✗ Backup failed!${NC}"
        exit 1
    fi
}

# Function to analyze current schema
analyze_current_schema() {
    log "\n${YELLOW}Step 2: Analyzing current database schema...${NC}"
    
    # Check for existing enhanced tables
    local enhanced_tables=(
        "UserProfile"
        "FamilyMember"
        "SessionFamilyMember"
        "CommunicationMetric"
        "Notification"
    )
    
    log "Checking for enhanced schema tables:"
    for table in "${enhanced_tables[@]}"; do
        local exists=$(psql "$DATABASE_URL" -t -c "
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '$table'
            );
        " 2>/dev/null | xargs)
        
        if [ "$exists" = "t" ]; then
            log "  ${GREEN}✓${NC} $table exists"
        else
            log "  ${RED}✗${NC} $table missing"
        fi
    done
    
    # Get current statistics
    log "\nCurrent database statistics:"
    psql "$DATABASE_URL" -c "
        SELECT 
            'Users' as entity, COUNT(*) as count FROM \"User\"
        UNION ALL
        SELECT 'Sessions', COUNT(*) FROM \"Session\"
        UNION ALL
        SELECT 'Transcripts', COUNT(*) FROM \"TranscriptEntry\"
        UNION ALL
        SELECT 'Progress Tracking', COUNT(*) FROM \"ProgressTracking\";
    " 2>&1 | tee -a "$MIGRATION_LOG"
}

# Function to create Prisma migration
create_prisma_migration() {
    log "\n${YELLOW}Step 3: Creating Prisma migration...${NC}"
    
    # First, backup current schema
    cp prisma/schema.prisma "prisma/schema.backup.${TIMESTAMP}.prisma"
    log "${GREEN}✓ Current schema backed up${NC}"
    
    # Copy enhanced schema
    if [ ! -f "prisma/schema.enhanced.prisma" ]; then
        log "${RED}ERROR: Enhanced schema file not found at prisma/schema.enhanced.prisma${NC}"
        exit 1
    fi
    
    cp prisma/schema.enhanced.prisma prisma/schema.prisma
    log "${GREEN}✓ Enhanced schema copied${NC}"
    
    # Create migration without applying (for review)
    log "Creating migration (without applying)..."
    npx prisma migrate dev --create-only --name enhanced_schema_migration 2>&1 | tee -a "$MIGRATION_LOG"
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✓ Migration created successfully${NC}"
        
        # Show migration preview
        local migration_dir=$(ls -t prisma/migrations | head -1)
        log "\n${YELLOW}Migration preview:${NC}"
        head -50 "prisma/migrations/${migration_dir}/migration.sql" | tee -a "$MIGRATION_LOG"
        log "\n... (truncated for preview)"
    else
        log "${RED}✗ Migration creation failed${NC}"
        exit 1
    fi
}

# Function to apply custom SQL migration
apply_custom_migration() {
    log "\n${YELLOW}Step 4: Applying custom migration for data preservation...${NC}"
    
    # Apply our custom migration that preserves data
    if [ -f "prisma/migrations/enhanced-schema-migration.sql" ]; then
        log "Applying custom migration script..."
        psql "$DATABASE_URL" < "prisma/migrations/enhanced-schema-migration.sql" 2>&1 | tee -a "$MIGRATION_LOG"
        
        if [ $? -eq 0 ]; then
            log "${GREEN}✓ Custom migration applied successfully${NC}"
        else
            log "${RED}✗ Custom migration failed${NC}"
            return 1
        fi
    else
        log "${YELLOW}No custom migration script found, using Prisma migration only${NC}"
    fi
}

# Function to deploy migration
deploy_migration() {
    log "\n${YELLOW}Step 5: Deploying migration to database...${NC}"
    
    # For production, use migrate deploy instead of migrate dev
    log "Running prisma migrate deploy..."
    npx prisma migrate deploy 2>&1 | tee -a "$MIGRATION_LOG"
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✓ Migration deployed successfully${NC}"
    else
        log "${RED}✗ Migration deployment failed${NC}"
        return 1
    fi
}

# Function to verify migration
verify_migration() {
    log "\n${YELLOW}Step 6: Verifying migration...${NC}"
    
    # Check new tables
    log "Checking enhanced tables:"
    for table in "UserProfile" "FamilyMember" "CommunicationMetric" "SessionFamilyMember" "Notification"; do
        local count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null | xargs)
        if [ -n "$count" ]; then
            log "  ${GREEN}✓${NC} $table: $count records"
        else
            log "  ${RED}✗${NC} $table: Not found or error"
        fi
    done
    
    # Check family member migration
    log "\nChecking family member migration:"
    local fm_stats=$(psql "$DATABASE_URL" -t -c "
        SELECT 
            COUNT(DISTINCT \"userId\") as users_with_family,
            COUNT(*) as total_family_members,
            ROUND(AVG(member_count), 2) as avg_members_per_user
        FROM (
            SELECT \"userId\", COUNT(*) as member_count 
            FROM \"FamilyMember\" 
            GROUP BY \"userId\"
        ) AS family_stats;
    " 2>/dev/null)
    log "Family member statistics: $fm_stats"
    
    # Check data integrity
    log "\nChecking data integrity:"
    local orphaned_sessions=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM \"Session\" s
        WHERE NOT EXISTS (
            SELECT 1 FROM \"User\" u WHERE u.id = s.\"userId\"
        );
    " 2>/dev/null | xargs)
    log "  Orphaned sessions: $orphaned_sessions"
    
    # Generate Prisma client
    log "\nGenerating Prisma client..."
    npx prisma generate 2>&1 | tee -a "$MIGRATION_LOG"
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✓ Prisma client generated${NC}"
    else
        log "${RED}✗ Failed to generate Prisma client${NC}"
    fi
}

# Function to create rollback script
create_rollback_script() {
    local backup_file=$1
    local rollback_script="./rollback_${TIMESTAMP}.sh"
    
    cat > "$rollback_script" << EOF
#!/bin/bash
# Rollback script for migration ${TIMESTAMP}

echo "Starting rollback for migration ${TIMESTAMP}..."

# Restore from backup
psql \$DATABASE_URL < $backup_file

# Restore Prisma schema
cp prisma/schema.backup.${TIMESTAMP}.prisma prisma/schema.prisma

# Regenerate Prisma client
npx prisma generate

echo "Rollback completed. Please restart your application."
EOF
    
    chmod +x "$rollback_script"
    log "${GREEN}✓ Rollback script created: $rollback_script${NC}"
}

# Main execution
main() {
    log "Starting migration at $(date)"
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup
    BACKUP_FILE=$(create_backup)
    
    # Analyze current schema
    analyze_current_schema
    
    # Ask for confirmation
    echo ""
    log "${YELLOW}This migration will:${NC}"
    log "  - Create new tables: UserProfile, FamilyMember, CommunicationMetric, etc."
    log "  - Migrate data from denormalized to normalized structure"
    log "  - Add new indexes and constraints"
    log "  - Update existing tables with new columns"
    echo ""
    read -p "Do you want to proceed? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "${YELLOW}Migration cancelled by user${NC}"
        exit 0
    fi
    
    # Create Prisma migration
    create_prisma_migration
    
    # Apply custom migration (if exists)
    apply_custom_migration
    
    # Deploy migration
    if deploy_migration; then
        # Verify migration
        verify_migration
        
        # Create rollback script
        create_rollback_script "$BACKUP_FILE"
        
        # Final summary
        log "\n${GREEN}╔══════════════════════════════════════════════════╗${NC}"
        log "${GREEN}║          Migration Completed Successfully        ║${NC}"
        log "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
        log ""
        log "${GREEN}Summary:${NC}"
        log "  - Backup saved to: $BACKUP_FILE"
        log "  - Migration log: $MIGRATION_LOG"
        log "  - Rollback script: ./rollback_${TIMESTAMP}.sh"
        log ""
        log "${YELLOW}Next steps:${NC}"
        log "  1. Test your application thoroughly"
        log "  2. Monitor for any errors in logs"
        log "  3. Run integration tests"
        log "  4. Deploy updated application code"
        log ""
        log "${YELLOW}Important notes:${NC}"
        log "  - The old denormalized fields are still present for backward compatibility"
        log "  - Update your application code to use the new normalized structure"
        log "  - Consider removing old fields after confirming everything works"
    else
        log "\n${RED}Migration failed! Attempting automatic rollback...${NC}"
        psql "$DATABASE_URL" < "$BACKUP_FILE"
        cp "prisma/schema.backup.${TIMESTAMP}.prisma" prisma/schema.prisma
        npx prisma generate
        log "${YELLOW}Rollback completed. Please check the logs for errors.${NC}"
        exit 1
    fi
    
    log "\nMigration completed at $(date)"
}

# Run main function
main