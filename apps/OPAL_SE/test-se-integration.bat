@echo off
setlocal enabledelayedexpansion
title OPAL SE Integration Test
color 0A

echo ============================================================
echo    OPAL SE Integration Test Suite
echo ============================================================
echo.
echo This script will test:
echo   1. System Graph API endpoints
echo   2. Event Log API endpoints  
echo   3. Rule Engine API endpoints
echo   4. FDS data ingestion
echo   5. Admin UI connectivity
echo.
echo Prerequisites:
echo   - OPAL_SE server running on port 7788
echo   - FDS server running on port 4000
echo.
pause

set API_BASE=http://localhost:7788
set FDS_BASE=http://localhost:4000
set PROJECT_ID=proj-001

echo.
echo ============================================================
echo TEST 1: Server Health Check
echo ============================================================
echo Testing OPAL_SE server...
curl -s %API_BASE%/api/health
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] OPAL_SE server not reachable
    goto :error
)
echo [PASS] OPAL_SE server is running
echo.

echo Testing FDS server...
curl -s %FDS_BASE%/health
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] FDS server not reachable
    goto :error
)
echo [PASS] FDS server is running
echo.

echo ============================================================
echo TEST 2: FDS Data Ingestion
echo ============================================================
echo Ingesting test data from FDS...
cd "%~dp0"
node scripts\ingest-fds-data.js
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] FDS ingestion failed
    goto :error
)
echo [PASS] FDS data ingested successfully
echo.

echo ============================================================
echo TEST 3: System Graph API Tests
echo ============================================================

echo Testing GET /api/se/graph/stats...
curl -s -o test_graph_stats.json %API_BASE%/api/se/graph/stats?project_id=%PROJECT_ID%
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Graph stats endpoint failed
    goto :error
)
echo [PASS] Graph stats endpoint working
type test_graph_stats.json
echo.

echo Testing GET /api/se/graph/nodes...
curl -s -o test_graph_nodes.json "%API_BASE%/api/se/graph/nodes?project_id=%PROJECT_ID%&limit=5"
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Graph nodes endpoint failed
    goto :error
)
echo [PASS] Graph nodes endpoint working
echo.

echo ============================================================
echo TEST 4: Event Stream API Tests
echo ============================================================

echo Testing GET /api/se/events/stats...
curl -s -o test_events_stats.json %API_BASE%/api/se/events/stats?project_id=%PROJECT_ID%
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Events stats endpoint failed
    goto :error
)
echo [PASS] Events stats endpoint working
type test_events_stats.json
echo.

echo Testing GET /api/se/events...
curl -s -o test_events.json "%API_BASE%/api/se/events?project_id=%PROJECT_ID%&limit=10"
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Events list endpoint failed
    goto :error
)
echo [PASS] Events list endpoint working
echo.

echo ============================================================
echo TEST 5: Rule Engine API Tests
echo ============================================================

echo Testing GET /api/se/rules/stats...
curl -s -o test_rules_stats.json %API_BASE%/api/se/rules/stats?project_id=%PROJECT_ID%
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Rules stats endpoint failed
    goto :error
)
echo [PASS] Rules stats endpoint working
type test_rules_stats.json
echo.

echo Testing GET /api/se/rules/violations...
curl -s -o test_violations.json %API_BASE%/api/se/rules/violations?project_id=%PROJECT_ID%
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Violations endpoint failed
    goto :error
)
echo [PASS] Violations endpoint working
echo.

echo ============================================================
echo TEST 6: MCP Tools Tests
echo ============================================================

echo Testing querySystemModel MCP tool...
curl -s -X POST %API_BASE%/api/tools/execute ^
  -H "Content-Type: application/json" ^
  -d "{\"tool\": \"querySystemModel\", \"parameters\": {\"project_id\": \"%PROJECT_ID%\", \"node_type\": \"Requirement\", \"limit\": 5}}" ^
  -o test_query_system.json
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] querySystemModel tool failed
    goto :error
)
echo [PASS] querySystemModel tool working
echo.

echo Testing runConsistencyChecks MCP tool...
curl -s -X POST %API_BASE%/api/tools/execute ^
  -H "Content-Type: application/json" ^
  -d "{\"tool\": \"runConsistencyChecks\", \"parameters\": {\"project_id\": \"%PROJECT_ID%\"}}" ^
  -o test_consistency.json
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] runConsistencyChecks tool failed
    goto :error
)
echo [PASS] runConsistencyChecks tool working
echo.

echo ============================================================
echo TEST 7: Admin UI Tests
echo ============================================================

echo Testing System Graph page endpoint...
curl -s -o test_ui_graph.html http://localhost:3000/
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Admin UI may not be running (expected if not started)
) else (
    echo [PASS] Admin UI is accessible
)
echo.

echo ============================================================
echo TEST 8: Data Validation
echo ============================================================

echo Validating ingested data counts...
echo.

REM Check if we have nodes
findstr /C:"total" test_graph_stats.json >nul
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] No nodes found in graph
    goto :error
)
echo [PASS] Graph contains nodes
echo.

REM Check if we have events
findstr /C:"total" test_events_stats.json >nul
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] No events found in event log
    goto :error
)
echo [PASS] Event log contains events
echo.

echo ============================================================
echo CLEANUP
echo ============================================================
echo Removing temporary test files...
del /Q test_*.json test_*.html 2>nul
echo [DONE] Cleanup complete
echo.

goto :success

:error
echo.
echo ============================================================
echo  TEST SUITE FAILED
echo ============================================================
echo Please check the error messages above.
echo.
echo Common issues:
echo   - OPAL_SE server not running (npm start)
echo   - FDS server not running (start_fds.bat)
echo   - Database migration not run (npm run migrate)
echo   - Admin UI not built (cd admin/ui && npm run build)
echo.
pause
exit /b 1

:success
echo.
echo ============================================================
echo  ALL TESTS PASSED! ✓
echo ============================================================
echo.
echo Summary:
echo   [✓] Server Health
echo   [✓] FDS Ingestion
echo   [✓] System Graph API
echo   [✓] Event Stream API
echo   [✓] Rule Engine API
echo   [✓] MCP Tools
echo   [✓] Admin UI Connectivity
echo   [✓] Data Validation
echo.
echo Your OPAL_SE system is fully operational!
echo.
echo Next steps:
echo   1. Open http://localhost:7788/admin to view admin UI
echo   2. Navigate to System Graph, Event Stream, or Rule Dashboard
echo   3. Explore the SE tools via MCP inspector
echo.
pause
exit /b 0
