/**
 * Seed: SEO Vertical - Aerospace Materials Topic Cluster
 * 
 * Populates the graph with a realistic SEO topic cluster for an aerospace engineering firm.
 * 
 * Cluster Theme: "Aerospace Composites"
 * Pillar Page: "Ultimate Guide to Aerospace Composite Materials"
 * Keywords: high-intent, high-volume terms
 */

const { v4: uuid } = require('uuid');

// References to existing PM Core nodes (from seo_demo_project.js)
const IDS = {
	// Plan
	seoPlan: 'c1000000-0000-0000-0000-000000000001',
	// Users/Agents (creators)
	projectManager: 'a1000000-0000-0000-0000-000000000001',
	seoSpecialist: 'a1000000-0000-0000-0000-000000000002',
	contentAgent: 'b1000000-0000-0000-0000-000000000002',
	keywordAgent: 'b1000000-0000-0000-0000-000000000001',
};

exports.seed = async function (knex) {
	const now = new Date().toISOString();
	console.log('Seeding SEO Vertical: Aerospace Materials Cluster...');

	// Clear existing SEO vertical data
	await knex('nodes').where('schema_layer', 'seo_vertical').del();

	const nodes = [];
	const edges = [];

	// ============================================================================
	// 1. TOPIC CLUSTER
	// ============================================================================
	const clusterId = uuid();
	nodes.push({
		id: clusterId,
		node_type: 'topic_cluster',
		schema_layer: 'seo_vertical',
		title: 'Aerospace Composite Materials',
		description: 'Core topic cluster focusing on carbon fiber, matrix composites, and lightweight materials',
		status: 'active',
		metadata: JSON.stringify({
			primary_keyword: 'aerospace composites',
			authority_score: 45,
			content_count: 5
		}),
		created_by: IDS.seoSpecialist,
		created_at: now,
		updated_at: now,
		version: 1
	});

	// ============================================================================
	// 2. PILLAR PAGE (Content Piece)
	// ============================================================================
	const pillarId = uuid();
	nodes.push({
		id: pillarId,
		node_type: 'content_piece',
		schema_layer: 'seo_vertical',
		title: 'The Ultimate Guide to Aerospace Composite Materials',
		description: 'Comprehensive guide covering types, manufacturing, and applications',
		status: 'published',
		metadata: JSON.stringify({
			url: '/materials/aerospace-composites-guide',
			type: 'pillar_page',
			word_count: 3500,
			last_crawled: '2026-02-01T10:00:00Z',
			target_primary_keyword: 'aerospace composite materials'
		}),
		created_by: IDS.contentAgent,
		created_at: now,
		updated_at: now,
		version: 1
	});

	// Link: Cluster -> Pillar (pillar_of)
	edges.push({
		id: uuid(), edge_type: 'pillar_of', source_node_id: clusterId, target_node_id: pillarId,
		schema_layer: 'seo_vertical', weight: 1.0, created_by: IDS.seoSpecialist, created_at: now, updated_at: now, version: 1
	});

	// ============================================================================
	// 3. SUPPORTING CONTENT (Spokes)
	// ============================================================================
	const spoke1Id = uuid(); // Carbon Fiber
	nodes.push({
		id: spoke1Id,
		node_type: 'content_piece',
		schema_layer: 'seo_vertical',
		title: 'Carbon Fiber vs Titanium in Aircraft Design',
		status: 'published',
		metadata: JSON.stringify({
			url: '/materials/carbon-fiber-vs-titanium',
			type: 'blog_post',
			word_count: 1200,
			target_primary_keyword: 'carbon fiber vs titanium'
		}),
		created_by: IDS.contentAgent,
		created_at: now,
		updated_at: now,
		version: 1
	});

	const spoke2Id = uuid(); // Thermoplastics
	nodes.push({
		id: spoke2Id,
		node_type: 'content_piece',
		schema_layer: 'seo_vertical',
		title: 'Advances in Aerospace Thermoplastics',
		status: 'drafted',
		metadata: JSON.stringify({
			url: '/materials/thermoplastics-trends-2026',
			type: 'blog_post',
			word_count: 1500,
			target_primary_keyword: 'aerospace thermoplastics'
		}),
		created_by: IDS.contentAgent,
		created_at: now,
		updated_at: now,
		version: 1
	});

	// Link: Spokes -> Cluster (belongs_to)
	edges.push({
		id: uuid(), edge_type: 'belongs_to', source_node_id: spoke1Id, target_node_id: clusterId,
		schema_layer: 'seo_vertical', weight: 0.9, created_by: IDS.seoSpecialist, created_at: now, updated_at: now, version: 1
	});
	edges.push({
		id: uuid(), edge_type: 'belongs_to', source_node_id: spoke2Id, target_node_id: clusterId,
		schema_layer: 'seo_vertical', weight: 0.8, created_by: IDS.seoSpecialist, created_at: now, updated_at: now, version: 1
	});

	// Link: Internal Linking (links_to)
	edges.push({
		id: uuid(), edge_type: 'links_to', source_node_id: spoke1Id, target_node_id: pillarId,
		schema_layer: 'seo_vertical', weight: 1.0, metadata: JSON.stringify({ anchor_text: 'aerospace composite materials', link_type: 'internal' }),
		created_by: IDS.seoSpecialist, created_at: now, updated_at: now, version: 1
	});

	// ============================================================================
	// 4. KEYWORDS
	// ============================================================================
	const keywords = [
		{ text: 'aerospace composite materials', vol: 4500, diff: 65, intent: 'informational' },
		{ text: 'carbon fiber aircraft parts', vol: 2300, diff: 54, intent: 'commercial' },
		{ text: 'aerospace thermoplastics market', vol: 800, diff: 40, intent: 'informational' },
		{ text: 'titanium vs carbon fiber weight', vol: 1200, diff: 35, intent: 'informational' }
	];

	for (const kw of keywords) {
		const kwId = uuid();
		nodes.push({
			id: kwId,
			node_type: 'keyword',
			schema_layer: 'seo_vertical',
			title: kw.text,
			status: 'active',
			metadata: JSON.stringify({
				volume: kw.vol,
				difficulty: kw.diff,
				intent: kw.intent,
				competitor_rankings: [
					{ domain: 'boeing.com', position: 1, url: 'https://boeing.com/materials' },
					{ domain: 'airbus.com', position: 3, url: 'https://airbus.com/innovation' }
				]
			}),
			created_by: IDS.keywordAgent,
			created_at: now,
			updated_at: now,
			version: 1
		});

		// Calculate relevance and link to content
		if (kw.text === 'aerospace composite materials') {
			edges.push({ id: uuid(), edge_type: 'targets', source_node_id: pillarId, target_node_id: kwId, schema_layer: 'seo_vertical', weight: 1.0, created_by: IDS.seoSpecialist, created_at: now, updated_at: now, version: 1 });
		} else if (kw.text === 'carbon fiber aircraft parts') {
			edges.push({ id: uuid(), edge_type: 'targets', source_node_id: pillarId, target_node_id: kwId, schema_layer: 'seo_vertical', weight: 0.8, created_by: IDS.seoSpecialist, created_at: now, updated_at: now, version: 1 });
		} else if (kw.text.includes('titanium')) {
			edges.push({ id: uuid(), edge_type: 'targets', source_node_id: spoke1Id, target_node_id: kwId, schema_layer: 'seo_vertical', weight: 1.0, created_by: IDS.seoSpecialist, created_at: now, updated_at: now, version: 1 });
		} else if (kw.text.includes('thermoplastics')) {
			edges.push({ id: uuid(), edge_type: 'targets', source_node_id: spoke2Id, target_node_id: kwId, schema_layer: 'seo_vertical', weight: 1.0, created_by: IDS.seoSpecialist, created_at: now, updated_at: now, version: 1 });
		}
	}

	// ============================================================================
	// 5. PM CORE INTEGRATION (Task -> Content)
	// ============================================================================
	// Task: "Content Creation" (from demo seed) affects Spoke 2 (Drafted)
	edges.push({
		id: uuid(),
		edge_type: 'affects',
		schema_layer: 'pm_core', // Cross-layer edge
		source_node_id: 'd1000000-0000-0000-0000-000000000004', // taskContent
		target_node_id: spoke2Id,
		weight: 1.0,
		metadata: JSON.stringify({ action: 'drafting' }),
		created_by: IDS.projectManager,
		created_at: now,
		updated_at: now,
		version: 1
	});

	// Task: "On-Page Optimization" affects Pillar Page
	edges.push({
		id: uuid(),
		edge_type: 'affects',
		schema_layer: 'pm_core',
		source_node_id: 'd1000000-0000-0000-0000-000000000003', // taskOnPage
		target_node_id: pillarId,
		weight: 1.0,
		metadata: JSON.stringify({ action: 'optimizing' }),
		created_by: IDS.projectManager,
		created_at: now,
		updated_at: now,
		version: 1
	});

	// Insert all
	await knex('nodes').insert(nodes);
	await knex('edges').insert(edges);

	console.log(`✓ Inserted ${nodes.length} SEO nodes (cluster, content, keywords)`);
	console.log(`✓ Inserted ${edges.length} SEO relationships`);
};
