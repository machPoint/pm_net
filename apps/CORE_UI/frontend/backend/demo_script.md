# CORE-SE Demo Script

## Services Running

1. **Fake Data Service (FDS)**: http://localhost:8001
2. **Backend API**: http://localhost:8000
3. **Frontend**: http://localhost:3000 (needs dependency fixes)

## Test the Backend APIs

### 1. Health Checks
```bash
# FDS Health
curl http://localhost:8001/health

# Backend Health  
curl http://localhost:8000/health
```

### 2. Configuration
```bash
# Get feature flags and themes
curl http://localhost:8000/api/config
```

### 3. Pulse Feed (with auth)
```bash
# Get recent activity feed
curl -H "Authorization: Bearer demo-token-123" \
     "http://localhost:8000/api/pulse?limit=10"

# Filter by source
curl -H "Authorization: Bearer demo-token-123" \
     "http://localhost:8000/api/pulse?sources=jama,jira&limit=5"
```

### 4. Impact Analysis
```bash
# Analyze impact of a requirement
curl -H "Authorization: Bearer demo-token-123" \
     "http://localhost:8000/api/impact/JAMA-REQ-001"
```

### 5. Tasks Management
```bash
# Get all tasks
curl -H "Authorization: Bearer demo-token-123" \
     http://localhost:8000/api/tasks

# Create a new task
curl -X POST \
     -H "Authorization: Bearer demo-token-123" \
     -H "Content-Type: application/json" \
     -d '{"title": "Review ECN-24-001", "description": "Review engineering change notice", "priority": "high"}' \
     http://localhost:8000/api/tasks
```

### 6. Knowledge Search
```bash
# Search knowledge base
curl -H "Authorization: Bearer demo-token-123" \
     "http://localhost:8000/api/knowledge?q=requirements&limit=5"
```

### 7. Window Links
```bash
# Get link to external system
curl -H "Authorization: Bearer demo-token-123" \
     http://localhost:8000/api/windows/jama/JAMA-REQ-001
```

### 8. AI Microcalls (requires OpenAI API key)
```bash
# Generate summary
curl -X POST \
     -H "Authorization: Bearer demo-token-123" \
     -H "Content-Type: application/json" \
     -d '{"text": "This is a complex engineering requirement that needs to be broken down into manageable components for implementation and testing."}' \
     http://localhost:8000/ai/summarize

# Generate subtasks
curl -X POST \
     -H "Authorization: Bearer demo-token-123" \
     -H "Content-Type: application/json" \
     -d '{"text": "Implement user authentication system"}' \
     http://localhost:8000/ai/subtasks
```

## Test FDS Directly

### Mock Data Generation
```bash
# Get Jama requirements
curl "http://localhost:8001/mock/jama/items?type=requirement&limit=5"

# Get Jira issues
curl "http://localhost:8001/mock/jira/issues?limit=5"

# Get Outlook messages
curl "http://localhost:8001/mock/outlook/messages?limit=3"

# Get trace graph data
curl "http://localhost:8001/mock/graph/trace"

# Reseed data
curl -X POST http://localhost:8001/mock/admin/seed
```

### Window Views
Open in browser:
- http://localhost:8001/mock/windows/jama/JAMA-REQ-001
- http://localhost:8001/mock/windows/outlook/OUTLOOK-MSG-001
- http://localhost:8001/mock/windows/windchill/ECN-24-001

## Data Generated

The FDS generates:
- **80-100 Jama requirements** (JAMA-REQ-001 to JAMA-REQ-XXX)
- **40-60 Jama test cases** (JAMA-TC-001 to JAMA-TC-XXX)
- **25-35 Jira issues** (JIRA-ENG-001 to JIRA-ENG-XXX)
- **15-25 Windchill parts** (PN-00001 to PN-00XXX)
- **4-6 ECNs** (ECN-24-001 to ECN-24-XXX)
- **10 email messages** (EMAIL-001 to EMAIL-010)
- **10 Outlook messages** (OUTLOOK-MSG-001 to OUTLOOK-MSG-010)

With ~15% traceability gaps as specified in the requirements.

## Next Steps

1. **Fix frontend dependencies** - resolve React version conflicts
2. **Add OpenAI API key** to backend/.env for AI features
3. **Configure frontend** to call backend APIs
4. **Test end-to-end** workflow from UI

## Features Working

✅ **Backend FastAPI**: All endpoints operational  
✅ **Fake Data Service**: Comprehensive mock data generation  
✅ **Authentication**: Demo token-based auth  
✅ **Database**: SQLite with tasks and notes  
✅ **API Contracts**: All endpoints match PRD specifications  
✅ **Mock Windows**: Read-only HTML views for external systems  
✅ **Configuration**: Feature flags and themes support  

🔄 **AI Microcalls**: Ready (needs OpenAI API key)  
🔄 **Frontend Integration**: In progress (dependency issues to resolve)
