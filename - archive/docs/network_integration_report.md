# Network Graph Layer Integration Technical Report

This report outlines the current technical state of the application and provides the necessary information for integrating a new network-based graph layer.

## 1. Current Technology Stack

### Frontend
- **Framework**: Next.js 15.3.6 (App Router)
- **UI Library**: React 19, TailwindCSS, Radix UI
- **Visualization**: React Flow (`reactflow` ^11.11.4)
- **State Management**: React Hooks (`useNodesState`, `useEdgesState`)
- **Icons**: Lucide React

### Backend (OPAL_SE)
- **Runtime**: Node.js / TypeScript
- **Core Domain**: Systems Engineering (SE) Graph
- **Types**: Strongly typed in `src/types/se.ts` and `src/types/core-se.ts`

### Data Source (FDS)
- **Runtime**: Python (Flask/FastAPI style)
- **Purpose**: Fake Data Service, Simulation, and Ingestion source
- **Capabilities**: Generates mock requirements, connects to external systems (Jama, Jira, Outlook)

## 2. Existing Data Models (Backend)

The backend already supports a graph-based system which should be the source of truth for your network layer.

### A. OPAL "System Graph" (`apps/OPAL_SE/src/types/se.ts`)
This is the most critical integration point. It defines a graph of "Engineering Artifacts".
- **Node Interface**: `SystemNode`
  - `id`, `project_id`, `type`, `name`, `status`.
  - **Relevance**: You can extend `NodeType` (currently `Requirement`, `Component`, etc.) to include `NetworkDevice` or `Interface`.
- **Edge Interface**: `SystemEdge`
  - `from_node_id`, `to_node_id`, `relation_type`.
  - **Relevance**: Existing `INTERFACES_WITH` relation type is perfect for network links.

### B. FDS Models (`FDS/models.py`)
FDS provides the mock data and already has a specific `TraceNode` model that includes **layout coordinates** (`x`, `y`), which TraceGraph likely uses or mimics.
- **TraceNode**: `id`, `label`, `type`, `x`, `y`.
- **TraceEdge**: `from_node`, `to_node`, `type`.

## 3. Existing Graph Capabilities (Frontend)

The application already implements two sophisticated graph visualizations using React Flow. These should serve as the foundation or reference for the new network layer.

### A. Impact Graph (`ImpactGraph.tsx`)
- **Purpose**: Visualizes impact analysis of strict connections (source -> affected).
- **Node Types**: `source` (blue), `affected`, `related`, `downstream`.
- **Styling**: Gradient backgrounds based on severity (Critical/Red, High/Orange, etc.).
- **Features**: 
  - Severity-based coloring.
  - Interactive selection showing details.
  - Animated edges for critical paths.
  - Minimap with severity color coding.

### B. Trace Graph (`TraceGraph.tsx`)
- **Purpose**: Shows traceability between requirements, design, code, and tests.
- **Node Types**: `requirement`, `design`, `code`, `test`, `component`, `certification`.
- **Features**:
  - CRUD operations for connections (Create Edge dialog).
  - Status-based visualization (verified, pending, failed).
  - "Swimlane" style organization logic (implied by layout).

## 3. Data Models

To integrate your network layer, your data must map to or extend the existing node structures.

### Node Interface (Reference)
Your new layer should likely adopt a similar interface to ensure compatibility with existing UI components:

```typescript
interface NetworkNode {
  id: string;
  type: string; // e.g., "network_device", "subnet", "firewall"
  title: string;
  status: "active" | "inactive" | "maintenance";
  position?: { x: number; y: number };
  data: {
    // Custom data relevant to network layer
    ipAddress?: string;
    bandwidth?: string;
    protocol?: string;
    metadata: {
        lastUpdated: string;
        owner: string;
    };
  };
}
```

### Edge Logic
Existing edges support:
- **Animation**: Boolean flag (used for active flows or critical paths).
- **Styling**: dashed vs solid lines, color coding by severity/strength.
- **Markers**: Arrowheads (`MarkerType.ArrowClosed`).

## 4. Integration Strategy

### Step 1: Backend Modeling (OPAL + FDS)
1.  **Extend OPAL Types**: 
    - Modify `apps/OPAL_SE/src/types/se.ts` to add `NetworkNode` to `NodeType` (or use `Component`).
    - Ensure `SystemNode` can carry IP/Subnet metadata.
2.  **Update FDS**:
    - Add `NetworkDevice` models to `FDS/models.py` if unique attributes are needed.
    - Update `data_generator.py` to produce mock network topology data.

### Step 2: Component Integration
You should create a new component `NetworkGraph.tsx` following the pattern of `TraceGraph.tsx`:
1.  Wrap with `ReactFlowProvider`.
2.  Define custom `NodeTypes` if you need specific network icons/visuals (e.g., Router, Switch icons).
3.  Use `useNodesState` and `useEdgesState` for interactive state.

### Step 3: API Integration
Create a new API route `apps/CORE_UI/frontend/src/app/api/network/topology/route.ts` that:
1.  Calls `OPAL_SE` to fetch the system graph (filtered by Network type).
2.  Or calls `FDS` directly if simulating a live feed.
3.  Transforms it into the `ReactFlow` node/edge format.

### Step 4: Page Implementation
Add a new page `apps/CORE_UI/frontend/src/app/network-layer/page.tsx` that fetches the data and renders your `NetworkGraph` component.

## 5. Key Reusable Assets
- **UI Components**: `Badge`, `Button`, `Panel` (from React Flow).
- **Utils**: `cn` (class merging).
- **Icons**: `lucide-react` (Usage: `<Network />`, `<Server />`, `<Wifi />`).

## 6. Recommendations
- **Leverage Existing Styles**: Use the gradient node styling from `TraceGraph` for consistency.
- **Auto-Layout**: If the network is complex, consider integrating a layout library (like `dagre` or `elkjs`) as the current graphs utilize manual or simple positioning.
- **Interactivity**: The codebase supports "Create Connection" flows; this can be reused for defining network links manually.
