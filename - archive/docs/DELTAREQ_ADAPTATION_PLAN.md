# DeltaReq Adaptation Plan
## Adapting CORE-SE Codebase for Requirements Change Management

**Created**: January 19, 2026  
**Status**: Planning Phase

---

## 1. OVERVIEW

### Current State
- **Codebase**: CORE-SE (Systems Engineering platform with OPAL_SE, CORE_UI, FDS)
- **Target**: DeltaReq (AI-Powered Requirements Change Management System)
- **Approach**: Adapt existing architecture, reuse UI/visualization components

### Key Insight: FDS Already Has Jama Mock Data ✅
- FDS provides `/mock/jama/items` endpoint with requirements data
- FDS provides `/mock/jama/relationships` endpoint for traceability
- Perfect for MVP/Demo without needing real Jama integration

---

## 2. ARCHITECTURE MAPPING

### CORE-SE → DeltaReq Component Mapping

| CORE-SE Component | DeltaReq Usage | Adaptation Needed |
|-------------------|----------------|-------------------|
| **FDS (Fake Data Server)** | Mock Jama requirements data | ✅ Already has Jama endpoints - extend with change scenarios |
| **CORE_UI Frontend** | DeltaReq UI | Rebrand, simplify to focus on change analysis |
| **CORE_UI Backend** | Change analysis API | Replace SE tools with change impact analysis |
| **OPAL_SE** | AI/ML engine for impact prediction | Adapt graph analysis, add NLP for requirements |
| **System Model Graph** | Requirements dependency graph | ✅ Perfect fit - requirements are nodes, relationships are edges |
| **Traceability Visualization** | Impact visualization | ✅ Reuse React Flow graph components |

---

## 3. FDS ENHANCEMENTS FOR DELTAREQ

### Current FDS Jama Capabilities
- ✅ `/mock/jama/items` - Get requirements (with pagination, filtering)
- ✅ `/mock/jama/relationships` - Get traceability links
- ✅ Generates realistic aerospace requirements data

### Required FDS Extensions for MVP

#### 3.1 Change Scenarios Endpoint
```python
@app.post("/mock/jama/analyze-change")
async def analyze_change(change_description: str):
    """
    Analyze a proposed requirements change
    Returns: affected requirements, downstream impacts, confidence scores
    """
    # Use AI to parse change description
    # Identify affected baseline requirements
    # Map downstream dependencies
    # Return impact analysis
```

#### 3.2 Enhanced Requirements Data
- Add requirement criticality levels (safety-critical, performance-critical, normal)
- Add verification methods (test, analysis, inspection, demonstration)
- Add subsystem/system hierarchy
- Add more realistic traceability relationships

#### 3.3 Historical Change Data
- Mock Change Request database
- Past changes with actual vs predicted impacts
- Training data for AI model calibration

---

## 4. UI ADAPTATION STRATEGY

### Phase 1: Minimal Rebrand (Week 1)
- [ ] Rename "CORE-SE" → "DeltaReq" throughout UI
- [ ] Update branding (logo, colors, terminology)
- [ ] Simplify navigation to focus on:
  - Dashboard (active changes)
  - Change Analysis (main view)
  - Traceability Explorer
  - History

### Phase 2: Change Analysis View (Week 2-3)
- [ ] Create main "Analyze Change" input form
  - Natural language text area
  - "Analyze Impact" button
- [ ] Results display:
  - Affected requirements list with confidence scores
  - Visual dependency graph (reuse System Model viz)
  - Impact summary dashboard (schedule, cost, risk)
  - Export options (PDF, Excel, PowerPoint)

### Phase 3: Polish (Week 4)
- [ ] Add scenario comparison view
- [ ] Historical change search
- [ ] Demo data and walkthrough

### Components to Reuse from CORE_UI
- ✅ **SystemModelSection.tsx** → Adapt for requirements dependency graph
- ✅ **Graph visualization** (React Flow) → Perfect for impact visualization
- ✅ **Impact Analysis view** → Adapt for change impact
- ✅ **Dashboard layout** → Reuse for DeltaReq dashboard
- ✅ **Export functionality** → Reuse for documentation generation

---

## 5. BACKEND ADAPTATION

### Current CORE_UI Backend (FastAPI)
- Located: `apps/CORE_UI/backend/`
- Has routers for: pulse, impact, tasks, notes, system_model

### DeltaReq Backend Changes

#### 5.1 New Routers Needed
```
apps/CORE_UI/backend/app/routers/
├── change_analysis.py      (NEW) - Main change analysis endpoint
├── requirements.py          (NEW) - Requirements CRUD, import
├── traceability.py          (NEW) - Traceability matrix generation
├── scenarios.py             (NEW) - Compare change scenarios
└── change_history.py        (NEW) - Historical changes, learning
```

#### 5.2 Remove/Archive CORE-SE Specific
- Archive: pulse.py, tasks.py, notes.py, knowledge.py
- Keep: system_model.py (adapt for requirements graph)
- Keep: impact.py (adapt for change impact)

---

## 6. AI/ML INTEGRATION

### OPAL_SE Adaptation for DeltaReq

#### 6.1 Requirements Understanding (NLP)
**Location**: `apps/OPAL_SE/src/ai/requirements_nlp.ts` (NEW)

**Capabilities**:
- Parse requirement text to extract entities
- Semantic similarity using embeddings
- Identify requirement type, criticality, subsystem

**Tech Stack**:
- OpenAI GPT-4 API for parsing
- sentence-transformers for embeddings
- Store embeddings in PostgreSQL with pgvector

#### 6.2 Dependency Prediction
**Location**: `apps/OPAL_SE/src/ai/dependency_predictor.ts` (NEW)

**Approach**:
1. Semantic similarity (embedding distance)
2. Graph analysis (NetworkX-style traversal)
3. Co-occurrence in design documents
4. Explicit traceability links

**Output**: Confidence-scored list of impacted requirements

#### 6.3 Impact Scoring
**Location**: `apps/OPAL_SE/src/ai/impact_scorer.ts` (NEW)

**Inputs**:
- Number of downstream requirements
- Criticality levels
- Type of change
- Historical data (if available)

**Outputs**:
- Schedule impact (days/weeks)
- Cost impact ($K)
- Technical risk (low/med/high)
- Overall score (1-10)

---

## 7. DATA MODEL

### PostgreSQL Schema for DeltaReq

```sql
-- Requirements table
CREATE TABLE requirements (
    id VARCHAR(50) PRIMARY KEY,
    text TEXT NOT NULL,
    parent_id VARCHAR(50),
    system VARCHAR(100),
    subsystem VARCHAR(100),
    type VARCHAR(50),
    criticality VARCHAR(50),
    verification_method VARCHAR(50),
    embedding VECTOR(768),  -- For semantic search
    status VARCHAR(50),
    created_date TIMESTAMP,
    modified_date TIMESTAMP
);

-- Traceability links
CREATE TABLE traceability_links (
    id SERIAL PRIMARY KEY,
    source_req_id VARCHAR(50),
    target_req_id VARCHAR(50),
    relationship_type VARCHAR(50),
    confidence FLOAT,
    source VARCHAR(20),  -- 'manual', 'ai', 'import'
    rationale TEXT,
    FOREIGN KEY (source_req_id) REFERENCES requirements(id),
    FOREIGN KEY (target_req_id) REFERENCES requirements(id)
);

-- Change requests
CREATE TABLE change_requests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    affected_req_ids TEXT[],
    impact_analysis JSONB,
    status VARCHAR(50),
    submitted_by VARCHAR(100),
    submitted_date TIMESTAMP,
    ccb_decision TEXT,
    actual_impact JSONB
);

-- Design artifacts
CREATE TABLE design_artifacts (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50),
    title VARCHAR(255),
    file_path TEXT,
    linked_req_ids TEXT[],
    content_summary TEXT,
    last_modified TIMESTAMP
);

-- Vector search index
CREATE INDEX ON requirements USING ivfflat (embedding vector_cosine_ops);
```

---

## 8. MVP DEVELOPMENT ROADMAP (4 Weeks)

### Week 1: Foundation & FDS Enhancement
- [x] Clean up docs folder
- [x] Review DeltaReq PRD
- [x] Create adaptation plan (this document)
- [ ] Extend FDS with change analysis endpoint
- [ ] Add enhanced Jama requirements data (criticality, verification)
- [ ] Test FDS endpoints with realistic aerospace requirements

### Week 2: Backend Development
- [ ] Create PostgreSQL schema for DeltaReq
- [ ] Implement requirements import from FDS/Jama
- [ ] Build change analysis API endpoint
- [ ] Implement basic AI impact prediction (semantic similarity)
- [ ] Add confidence scoring

### Week 3: Frontend Development
- [ ] Rebrand CORE_UI → DeltaReq
- [ ] Create Change Analysis view (input + results)
- [ ] Adapt System Model graph for requirements dependencies
- [ ] Build impact summary dashboard
- [ ] Add export functionality (PDF)

### Week 4: Integration & Demo Polish
- [ ] End-to-end testing (UI → Backend → FDS)
- [ ] Create demo scenario (HALO cabin pressure change)
- [ ] Polish visualizations
- [ ] Create demo video (3-5 minutes)
- [ ] Prepare C-suite presentation deck

---

## 9. DEMO SCENARIO: HALO Cabin Pressure Change

### Scenario Details (from PRD)
**Change Description**:
```
"We need to increase HALO cabin pressure from 8.2 to 10.2 psi 
to support EVA operations without pre-breathe protocol"
```

### Expected Demo Flow
1. User opens DeltaReq
2. Clicks "New Change Analysis"
3. Pastes change description
4. Clicks "Analyze Impact"
5. **Results appear in <30 seconds**:
   - Primary requirement affected: REQ-HALO-ENV-001
   - 5 downstream requirements impacted (with confidence scores)
   - Visual dependency graph showing impact propagation
   - Impact summary: 6-8 weeks, $180K-$250K, MEDIUM risk
   - Affected design elements, tests, documents
6. User clicks on specific requirement to see rationale
7. User exports to PDF for CCB presentation

### FDS Mock Data Needed
- REQ-HALO-ENV-001: Cabin nominal pressure (8.2 ± 0.3 psi)
- REQ-HALO-STRUCT-015: Pressure vessel design load
- REQ-HALO-ECLSS-042: O2/N2 gas storage capacity
- REQ-HALO-ECLSS-038: Pressure regulator range
- REQ-HALO-SAFE-019: Emergency depressurization rate
- REQ-HALO-POWER-023: Gas pressurization power budget
- Traceability relationships between them

---

## 10. KEY DECISIONS

### Technology Choices
- ✅ **Frontend**: Keep React/Next.js from CORE_UI
- ✅ **Backend**: Keep Python/FastAPI from CORE_UI backend
- ✅ **Database**: PostgreSQL with pgvector extension
- ✅ **AI**: OpenAI GPT-4 API for MVP (consider local models later)
- ✅ **Visualization**: React Flow (already in CORE_UI)
- ✅ **Mock Data**: FDS with enhanced Jama endpoints

### What to Keep from CORE-SE
- ✅ Overall architecture (UI → Backend → AI Engine)
- ✅ Graph visualization components
- ✅ FDS mock data infrastructure
- ✅ UI framework and styling
- ✅ Export functionality

### What to Remove/Archive
- ❌ Pulse feed (not needed for DeltaReq)
- ❌ Tasks/Notes (not core to change management)
- ❌ Knowledge base (future enhancement)
- ❌ OPAL_SE MCP tools (replace with change analysis tools)
- ❌ Sidecar services (not needed for MVP)

---

## 11. RISKS & MITIGATIONS

### Risk 1: AI Accuracy
**Mitigation**: Start with high confidence threshold (80%+), always show confidence scores, human-in-the-loop

### Risk 2: FDS Data Quality
**Mitigation**: Curate high-quality aerospace requirements for demo, focus on HALO ECLSS subsystem

### Risk 3: Timeline (4 weeks is tight)
**Mitigation**: 
- Reuse maximum components from CORE-SE
- Focus on core MVP features only
- Cut scope if needed (scenario comparison can wait)

### Risk 4: Demo Impact
**Mitigation**: 
- Create compelling visual output
- Use realistic aerospace scenario
- Practice demo multiple times
- Have backup plan if live demo fails

---

## 12. SUCCESS CRITERIA FOR MVP

### Technical
- [ ] Change analysis completes in <30 seconds
- [ ] Visual dependency graph renders correctly
- [ ] AI identifies 80%+ of obvious dependencies
- [ ] Export to PDF works reliably
- [ ] No crashes during demo

### Business
- [ ] Demo impresses C-suite
- [ ] Clear value proposition (3 hours → 30 seconds)
- [ ] Realistic aerospace scenario
- [ ] Professional, polished UI
- [ ] Generates excitement for pilot phase

---

## 13. NEXT IMMEDIATE STEPS

1. **Extend FDS** (Priority 1)
   - Add HALO ECLSS requirements to FDS
   - Create traceability relationships
   - Build `/mock/jama/analyze-change` endpoint

2. **Database Setup** (Priority 2)
   - Create PostgreSQL database
   - Run schema migrations
   - Import FDS requirements

3. **Backend API** (Priority 3)
   - Create change_analysis.py router
   - Implement basic impact prediction
   - Connect to FDS

4. **Frontend Rebrand** (Priority 4)
   - Rename CORE-SE → DeltaReq
   - Create Change Analysis view
   - Test end-to-end flow

---

## APPENDIX: File Structure

```
DELTA_REQ/
├── FDS/                              ← Fake Data Server (Jama mock)
│   ├── main.py                       ← Extend with change analysis
│   ├── data_generator.py             ← Add HALO requirements
│   └── models.py                     ← Add change analysis models
├── apps/
│   ├── OPAL_SE/                      ← AI/ML engine
│   │   └── src/
│   │       └── ai/                   ← NEW: NLP, dependency prediction
│   └── CORE_UI/                      ← DeltaReq UI
│       ├── frontend/
│       │   └── src/
│       │       └── components/
│       │           ├── ChangeAnalysis.tsx  (NEW)
│       │           └── SystemModelSection.tsx (ADAPT)
│       └── backend/
│           └── app/
│               └── routers/
│                   ├── change_analysis.py  (NEW)
│                   └── requirements.py     (NEW)
└── docs/
    ├── DeltaReqPRD                   ← Product requirements
    └── DELTAREQ_ADAPTATION_PLAN.md   ← This document
```

---

**Status**: Ready to begin implementation
**Next Action**: Extend FDS with HALO ECLSS requirements and change analysis endpoint
