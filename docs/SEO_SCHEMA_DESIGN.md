# SEO Vertical Schema Design (v2)

This document details the graph schema for the SEO capabilities within the PM_NET system.
It utilizes the flexible `nodes` and `edges` structure, distinguished by `schema_layer = 'seo_vertical'`.

## 1. Node Types

### `keyword`
Represents a search query we want to rank for.
*   **Title:** The keyword text (e.g., "best running shoes")
*   **Metadata:**
    *   `volume`: Monthly search volume (number)
    *   `difficulty`: Keyword Difficulty 0-100 (number)
    *   `intent`: informational | commercial | transactional | navigational
    *   `cpc`: Cost Per Click (number)
    *   `serp_features`: JSON array (e.g., ["snippet", "people_also_ask"])
    *   `competitor_rankings`: JSON array `[{domain, position, url}]` (MVP replacement for competitor node)

### `content_piece`
Represents a specific page or asset on the website.
*   **Title:** Page Title or H1
*   **Metadata:**
    *   `url`: Relative or absolute URL
    *   `type`: blog_post | landing_page | product_page | pillar_page
    *   `status`: planned | drafted | review | published | updating | archived
    *   `word_count`: number
    *   `last_crawled`: ISO Date
    *   `target_primary_keyword`: string (keyword text)

### `topic_cluster` (New)
Represents a thematic group of content (Pillar/Spoke model).
*   **Title:** Cluster Theme (e.g., "Running Shoes Guide")
*   **Metadata:**
    *   `primary_keyword`: string
    *   `authority_score`: number (computed aggregate)

### `rank_snapshot` (New)
Point-in-time ranking data for tracking progress.
*   **Title:** "Rank #[pos] for [keyword]"
*   **Metadata:**
    *   `keyword_id`: uuid
    *   `position`: number
    *   `url`: string (ranking URL)
    *   `captured_at`: ISO date
    *   `serp_features_present`: [string]

### `backlink`
Represents an external link target or obtained link.
*   **Title:** Domain or Page Title of source
*   **Metadata:**
    *   `source_url`: URL of the linking page
    *   `domain_authority`: 0-100 score
    *   `rel`: dofollow | nofollow
    *   `status`: prospect | outreach_sent | negotiated | live | lost

*(Removed `audit_issue` -> Use pm_core `Task` with tags=["audit", "technical"])*
*(Removed `competitor` -> Store as metadata on `keyword` for MVP)*

## 2. Edge Types

### `targets`
*   **Source:** `content_piece`
*   **Target:** `keyword`
*   **Meaning:** The content is optimized for this keyword.
*   **Weight:**
    *   `1.0`: Primary target (1 per content)
    *   `0.7-0.9`: Secondary targets
    *   `0.3-0.6`: Tertiary/Related
    *   `< 0.3`: Incidental mention

### `pillar_of`
*   **Source:** `topic_cluster`
*   **Target:** `content_piece`
*   **Meaning:** This content piece is the main **Pillar Page** for the cluster.
*   **Weight:** 1.0

### `belongs_to`
*   **Source:** `content_piece` (Supporting content)
*   **Target:** `topic_cluster`
*   **Meaning:** This content supports the cluster (Spoke).
*   **Weight:** 0.5 - 1.0 (Relevance)

### `links_to`
*   **Source:** `content_piece` (internal) OR `backlink` (external)
*   **Target:** `content_piece`
*   **Meaning:** Hyperlink connection.
*   **Metadata:**
    *   `anchor_text`: string
    *   `link_type`: internal | external | footer | nav

### `cannibalizes`
*   **Source:** `content_piece`
*   **Target:** `content_piece`
*   **Meaning:** Both pages compete for the same keyword, hurting SEO.
*   **Weight:** Severity (0.0 - 1.0)

### `snapshot_of`
*   **Source:** `rank_snapshot`
*   **Target:** `keyword`
*   **Meaning:** Historical record of ranking.

### `affects` (was `has_issue`)
*   **Source:** `task` (pm_core)
*   **Target:** `content_piece`
*   **Meaning:** Task identifies/fixes an issue on this content.
*   **Metadata:**
    *   `issue_type`: technical | content | ux

### `produced_content`
*   **Source:** `run` (Agent Run)
*   **Target:** `content_piece`
*   **Meaning:** Agent run created or updated this content.

### `analyzed`
*   **Source:** `run` (Agent Run)
*   **Target:** `keyword`
*   **Meaning:** Agent run performed analysis on this keyword.

## 3. Implementation Plan
1.  Create `seeds/seo_vertical_seed.js`.
2.  Populate with:
    *   **Topic Cluster:** "Aerospace Materials"
    *   **Pillar Page:** "Ultimate Guide to Aerospace Composites"
    *   **Supporting Content:** "Carbon Fiber vs Titanium", "Heat Shield Materials"
    *   **Keywords:** mapped with weights
    *   **Tasks:** "Fix broken links" linked via `affects`
3.  Link to pm_core Agents/Tasks.
