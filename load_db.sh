#!/bin/bash

# Script to load SQL file into local PostgreSQL database
# Usage: 
#   ./load_db.sh <sql_file>
#   cat <sql_file> | ./load_db.sh

# Configuration - modify these as needed
DB_NAME="${DB_NAME:-cc}"
DB_USER="${DB_USER:-ccdev}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 [sql_file]"
    echo "  or pipe SQL content: cat backup.sql | $0"
    echo ""
    echo "Environment variables (optional):"
    echo "  DB_NAME   - Database name (default: cc)"
    echo "  DB_USER   - Database user (default: ccdev)"
    echo "  DB_HOST   - Database host (default: localhost)"
    echo "  DB_PORT   - Database port (default: 5432)"
    exit 1
}

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not installed or not in PATH${NC}"
    exit 1
fi

# Function to clear database
clear_database() {
    echo -e "${YELLOW}Clearing database...${NC}"
    
    # Drop all tables, views, sequences, and other objects
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        DO \$\$ DECLARE
            r RECORD;
        BEGIN
            -- Drop all tables
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
            
            -- Drop all sequences
            FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
                EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
            END LOOP;
            
            -- Drop all views
            FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
            END LOOP;
        END \$\$;
    " > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database cleared${NC}"
    else
        echo -e "${RED}✗ Error clearing database${NC}"
        exit 1
    fi
}

# Function to confirm action
confirm_clear() {
    echo -e "${YELLOW} WARNING: This will clear all data in database '$DB_NAME'${NC}"
    read -p "Do you want to proceed? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        return 0
    else
        echo -e "${YELLOW}Operation cancelled${NC}"
        exit 0
    fi
}

# Check if data is being piped or file is provided
if [ -t 0 ]; then
    # Not piped, expect file argument
    if [ $# -eq 0 ]; then
        echo -e "${RED}Error: No SQL file provided${NC}"
        usage
    fi
    
    SQL_FILE="$1"
    
    if [ ! -f "$SQL_FILE" ]; then
        echo -e "${RED}Error: File '$SQL_FILE' not found${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Loading SQL file: $SQL_FILE${NC}"
    echo -e "${YELLOW}Database: $DB_NAME @ $DB_HOST:$DB_PORT${NC}"
    echo -e "${YELLOW}User: $DB_USER${NC}"
    echo ""
    
    # Confirm and clear database
    confirm_clear
    clear_database
    
    # Load from file
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"
    
else
    # Data is being piped
    echo -e "${YELLOW}Loading SQL from stdin...${NC}"
    echo -e "${YELLOW}Database: $DB_NAME @ $DB_HOST:$DB_PORT${NC}"
    echo -e "${YELLOW}User: $DB_USER${NC}"
    echo ""
    
    # Confirm and clear database
    confirm_clear
    clear_database
    
    # Load from stdin
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
fi

# Check exit status
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✓ Database loaded successfully${NC}"
else
    echo -e "\n${RED}✗ Error loading database${NC}"
    exit 1
fi
