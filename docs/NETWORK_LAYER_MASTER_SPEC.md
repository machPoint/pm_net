# Network Graph Layer Master Spec (Consolidated)

This document defines how the **Network Layer** fits into the CORE-SE platform as an additional graph domain, while staying compatible with the existing SE system graph, tool contracts, and UI graph components.

---

## 1. What the Network Layer is

The Network Layer is a **typed subgraph** inside OPAL_SE’s system graph that models:
- network devices and logical constructs (subnets, VLANs, links)
- relationships between devices (interfaces, routes, dependencies)
- optional coupling edges to SE artifacts (requirements, components, issues)

It is not a separate database or visualization-only feature. It is a first-class graph domain.

---

## 2. Data model (recommended baseline)

### 2.1 Node types (additive)
Extend the existing node typing with network-focused types, such as:
- NetworkDevice (router/switch/firewall/server)
- NetworkInterface (optional, if you model ports explicitly)
- Subnet / VLAN (optional, if needed)
- NetworkService (DNS, auth, logging, etc.)

Each node should support:
- id, project_id, type, name/title, status
- metadata (ip, hostname, vendor, role, environment, owner, lastSeen, etc.)
- optional position (x,y) for deterministic layouts in demos

### 2.2 Edge types (reuse first)
Prefer reusing existing relationship vocabulary when possible:
- INTERFACES_WITH (physical/logical link)
- DEPENDS_ON (service dependency)
- CONNECTED_TO (if you need an explicit link type)

Edges should support:
- from_node_id, to_node_id, relation_type
- metadata for bandwidth, protocol, directionality, confidence, source

---

## 3. Ingestion strategy

### 3.1 First ingestion (dev)
Use FDS to generate a mock network topology endpoint and ingest it through OPAL_SE’s ingestion path.

### 3.2 Production ingestion (real)
Add a connector sidecar (or extend an existing one) for network sources, e.g.:
- CMDB
- network controller APIs
- asset inventory tools

All network ingestion must:
1) mutate the graph, and
2) emit normalized events (for pulse/history).

---

## 4. Tool surface (minimal, compatible)

### 4.1 Reuse existing tools where possible
If the network layer lives in the same system graph, your existing tools already work:
- `querySystemModel` filtered by network node types
- `getSystemSlice` centered on a device
- `traceDownstreamImpact` to propagate outage impacts across coupled edges

### 4.2 Optional network-specific tools (only if needed)
Add only if the UI/agents need domain-specific outputs:
- `getNetworkTopology` (bounded, returns device/link set)
- `simulateOutageImpact` (specialized impact scoring)

Any new tools must follow:
- tool registry first
- schema.ts + handler.ts pattern
- deterministic outputs

---

## 5. UI integration

### 5.1 Reuse existing graph components
The platform already has mature React Flow patterns (Trace/Impact graphs). The Network Graph should:
- use ReactFlowProvider
- use the same node/edge conventions where possible
- optionally add network icons and styles, but keep interaction patterns consistent

### 5.2 Data transformation path
The UI should fetch network graph data from OPAL_SE (preferred) and transform to React Flow nodes/edges.

Avoid “UI calls FDS directly” as the long-term pattern; do it only for dev shortcuts.

---

## 6. Coupling network and SE artifacts (why this is worth it)

You get “real” value when you connect domains:
- A network device failure can trace to affected components, tests, and requirements.
- Requirements can declare “depends on” network services, enabling verification and impact analysis.

This is where the platform becomes a cross-domain systems intelligence tool rather than “yet another network map.”

---

## 7. Boundaries and anti-patterns

- Do not build a separate network graph database that diverges from the system graph.
- Do not add network logic into the UI that should live in OPAL tools.
- Do not bypass sidecars for real external network systems.

