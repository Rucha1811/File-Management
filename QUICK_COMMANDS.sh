#!/bin/bash
# ONGC Portal - Quick Commands Reference
# Make executable with: chmod +x QUICK_COMMANDS.sh

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}ONGC Portal - Quick Commands${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# 1. START POSTGRESQL
echo -e "${YELLOW}1. Start PostgreSQL Database${NC}"
echo "   brew services start postgresql@14"
echo "   OR"
echo "   pg_ctl -D /usr/local/var/postgres start"
echo ""

# 2. CREATE DATABASE (if doesn't exist)
echo -e "${YELLOW}2. Create Database (if doesn't exist)${NC}"
echo '   psql postgres -c "CREATE DATABASE ongc_db;"'
echo '   psql postgres -c "CREATE USER ongc_user WITH PASSWORD '"'"'ongc_pass'"'"';"'
echo '   psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE ongc_db TO ongc_user;"'
echo ""

# 3. RUN MIGRATION
echo -e "${YELLOW}3. Run Database Migration (REQUIRED FIRST TIME)${NC}"
echo '   cd "/Users/ruchatejaskumargandhi/Desktop/ONGC 3/ongc-portal/backend"'
echo "   alembic upgrade head"
echo ""

# 4. START BACKEND
echo -e "${YELLOW}4. Start Backend Server${NC}"
echo '   cd "/Users/ruchatejaskumargandhi/Desktop/ONGC 3/ongc-portal/backend"'
echo "   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo "   → Backend: http://localhost:8000"
echo "   → API Docs: http://localhost:8000/docs"
echo ""

# 5. START FRONTEND
echo -e "${YELLOW}5. Start Frontend Server (in new terminal)${NC}"
echo '   cd "/Users/ruchatejaskumargandhi/Desktop/ONGC 3/ongc-portal"'
echo "   npm install  # if first time"
echo "   npm run dev"
echo "   → Frontend: http://localhost:5173"
echo ""

# 6. TEST API
echo -e "${YELLOW}6. Test API Endpoints${NC}"
echo "   # Visit Swagger docs:"
echo "   open http://localhost:8000/docs"
echo ""
echo "   # Or use curl:"
echo "   curl http://localhost:8000/api/fund-management/expense-categories"
echo "   curl http://localhost:8000/api/hse-certificates/expiring-certificates"
echo "   curl http://localhost:8000/api/hse-audits/pending-actions-summary"
echo ""

# 7. CHECK LOGS
echo -e "${YELLOW}7. Check Logs${NC}"
echo "   Backend logs: Check terminal where backend is running"
echo "   Frontend logs: Check terminal where frontend is running"
echo "   Browser console: F12 → Console tab"
echo ""

# 8. VERIFY UPLOAD DIRECTORY
echo -e "${YELLOW}8. Verify Upload Directory${NC}"
echo "   mkdir -p /Users/ruchatejaskumargandhi/Downloads/Myuploads/progress_reports"
echo "   chmod 755 /Users/ruchatejaskumargandhi/Downloads/Myuploads"
echo "   ls -la /Users/ruchatejaskumargandhi/Downloads/Myuploads"
echo ""

# 9. DATABASE COMMANDS
echo -e "${YELLOW}9. Useful Database Commands${NC}"
echo "   # Connect to database:"
echo "   psql -U ongc_user -d ongc_db"
echo ""
echo "   # Check migration status:"
echo "   cd backend && alembic current"
echo ""
echo "   # Show migration history:"
echo "   cd backend && alembic history"
echo ""
echo "   # Rollback one migration:"
echo "   cd backend && alembic downgrade -1"
echo ""

# 10. TROUBLESHOOTING
echo -e "${YELLOW}10. Troubleshooting${NC}"
echo "   # Cannot connect to database?"
echo "   brew services list  # Check if postgresql is running"
echo ""
echo "   # Migration fails with 'column already exists'?"
echo "   cd backend && alembic stamp 0006"
echo ""
echo "   # Port already in use?"
echo "   lsof -ti:8000 | xargs kill -9  # Kill process on port 8000"
echo "   lsof -ti:5173 | xargs kill -9  # Kill process on port 5173"
echo ""
echo "   # Clear npm cache if frontend issues:"
echo "   cd ongc-portal && rm -rf node_modules package-lock.json"
echo "   npm install"
echo ""

# 11. QUICK TEST SEQUENCE
echo -e "${YELLOW}11. Quick Test Sequence (Copy-Paste)${NC}"
echo "   # Terminal 1 - Database & Backend:"
echo '   brew services start postgresql@14'
echo '   cd "/Users/ruchatejaskumargandhi/Desktop/ONGC 3/ongc-portal/backend"'
echo '   alembic upgrade head'
echo '   uvicorn app.main:app --reload'
echo ""
echo "   # Terminal 2 - Frontend:"
echo '   cd "/Users/ruchatejaskumargandhi/Desktop/ONGC 3/ongc-portal"'
echo '   npm run dev'
echo ""

# 12. API TESTING EXAMPLES
echo -e "${YELLOW}12. API Testing Examples (curl)${NC}"
echo '   # Get auth token (replace CPF and password):'
echo '   TOKEN=$(curl -s -X POST "http://localhost:8000/api/auth/login" \'
echo '     -H "Content-Type: application/x-www-form-urlencoded" \'
echo '     -d "cpf=admin123&password=admin" | jq -r .token)'
echo ""
echo '   # Create fund record:'
echo '   curl -X POST "http://localhost:8000/api/fund-management/create" \'
echo '     -H "Authorization: Bearer $TOKEN" \'
echo '     -F "head=Test Equipment" \'
echo '     -F "allocated=100" \'
echo '     -F "spent=50" \'
echo '     -F "fy=2026-27" \'
echo '     -F "expense_type=Store"'
echo ""
echo '   # Upload progress report image:'
echo '   curl -X POST "http://localhost:8000/api/progress-reports/upload-image" \'
echo '     -H "Authorization: Bearer $TOKEN" \'
echo '     -F "file=@/path/to/image.jpg" \'
echo '     -F "project_name=Test Project" \'
echo '     -F "year=2026"'
echo ""

# 13. DOCUMENTATION
echo -e "${YELLOW}13. Documentation Files${NC}"
echo "   README_ENHANCEMENTS.md      - Overview and quick start"
echo "   CHANGES_COMPLETED.md        - Complete changes summary"
echo "   SETUP_AND_RUN_GUIDE.md     - Detailed setup guide"
echo "   FRONTEND_EXAMPLES.md       - React component examples"
echo "   IMPLEMENTATION_SUMMARY.md  - Technical details"
echo "   TODO_CHECKLIST.md          - Task checklist"
echo ""

# 14. USEFUL SHORTCUTS
echo -e "${YELLOW}14. Useful Shortcuts${NC}"
echo "   View this file: cat QUICK_COMMANDS.sh"
echo "   Edit backend route: code backend/app/routes/fund_management.py"
echo "   Edit frontend component: code src/components/modules/FundManagement.jsx"
echo "   View API logs: tail -f backend/logs/app.log"
echo ""

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Ready to start! Begin with step 1-5${NC}"
echo -e "${GREEN}======================================${NC}"
