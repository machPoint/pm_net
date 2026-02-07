/**
 * Seed: SEO Project Demo Data
 * 
 * Creates a sample SEO project with:
 * - Users & Agents
 * - Project Plan
 * - Tasks with dependencies
 * - Decisions & Risks
 * 
 * Run with: npx knex seed:run --specific=seo_demo_project.js
 */

const { v4: uuid } = require('uuid');

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

// Pre-generated UUIDs for consistent references
const IDS = {
	// Users
	projectManager: 'a1000000-0000-0000-0000-000000000001',
	seoSpecialist: 'a1000000-0000-0000-0000-000000000002',
	contentWriter: 'a1000000-0000-0000-0000-000000000003',

	// Agents
	keywordAgent: 'b1000000-0000-0000-0000-000000000001',
	contentAgent: 'b1000000-0000-0000-0000-000000000002',
	analyticsAgent: 'b1000000-0000-0000-0000-000000000003',

	// Plan
	seoPlan: 'c1000000-0000-0000-0000-000000000001',

	// Tasks
	taskAudit: 'd1000000-0000-0000-0000-000000000001',
	taskKeywords: 'd1000000-0000-0000-0000-000000000002',
	taskOnPage: 'd1000000-0000-0000-0000-000000000003',
	taskContent: 'd1000000-0000-0000-0000-000000000004',
	taskBacklinks: 'd1000000-0000-0000-0000-000000000005',
	taskTechnical: 'd1000000-0000-0000-0000-000000000006',
	taskAnalytics: 'd1000000-0000-0000-0000-000000000007',

	// Decisions
	decisionKeywordStrategy: 'e1000000-0000-0000-0000-000000000001',
	decisionContentFormat: 'e1000000-0000-0000-0000-000000000002',

	// Risks
	riskAlgorithm: 'f1000000-0000-0000-0000-000000000001',
	riskCompetition: 'f1000000-0000-0000-0000-000000000002',
};

exports.seed = async function (knex) {
	const now = new Date().toISOString();

	console.log('Seeding SEO Demo Project...');

	// Clear existing demo data (optional - keeps system user)
	await knex('edges').whereNot('source_node_id', SYSTEM_USER_ID).del();
	await knex('nodes').whereNot('id', SYSTEM_USER_ID).del();

	// ============================================================================
	// 1. USERS
	// ============================================================================
	const users = [
		{
			id: IDS.projectManager,
			node_type: 'user',
			schema_layer: 'pm_core',
			title: 'Alex Chen',
			description: 'Project Manager - SEO Campaign Lead',
			status: 'active',
			metadata: JSON.stringify({
				email: 'alex@company.com',
				role: 'project_manager',
				authority_levels: ['task_approval', 'plan_approval']
			}),
			created_by: SYSTEM_USER_ID,
			created_at: now,
			updated_at: now,
			version: 1
		},
		{
			id: IDS.seoSpecialist,
			node_type: 'user',
			schema_layer: 'pm_core',
			title: 'Jordan Kim',
			description: 'SEO Specialist',
			status: 'active',
			metadata: JSON.stringify({
				email: 'jordan@company.com',
				role: 'specialist',
				authority_levels: ['task_execution']
			}),
			created_by: SYSTEM_USER_ID,
			created_at: now,
			updated_at: now,
			version: 1
		},
		{
			id: IDS.contentWriter,
			node_type: 'user',
			schema_layer: 'pm_core',
			title: 'Sam Rivera',
			description: 'Content Writer',
			status: 'active',
			metadata: JSON.stringify({
				email: 'sam@company.com',
				role: 'content_creator',
				authority_levels: ['task_execution']
			}),
			created_by: SYSTEM_USER_ID,
			created_at: now,
			updated_at: now,
			version: 1
		}
	];

	// ============================================================================
	// 2. AGENTS
	// ============================================================================
	const agents = [
		{
			id: IDS.keywordAgent,
			node_type: 'agent',
			schema_layer: 'pm_core',
			title: 'Keyword Research Agent',
			description: 'AI agent specialized in keyword research, search volume analysis, and competitor keyword gaps',
			status: 'active',
			metadata: JSON.stringify({
				capabilities: ['keyword_research', 'serp_analysis', 'competitor_analysis'],
				model: 'gpt-4',
				authority_level: 'task_execution'
			}),
			created_by: SYSTEM_USER_ID,
			created_at: now,
			updated_at: now,
			version: 1
		},
		{
			id: IDS.contentAgent,
			node_type: 'agent',
			schema_layer: 'pm_core',
			title: 'Content Optimization Agent',
			description: 'AI agent for content analysis, readability scoring, and SEO content suggestions',
			status: 'active',
			metadata: JSON.stringify({
				capabilities: ['content_analysis', 'readability_scoring', 'meta_optimization'],
				model: 'gpt-4',
				authority_level: 'task_execution'
			}),
			created_by: SYSTEM_USER_ID,
			created_at: now,
			updated_at: now,
			version: 1
		},
		{
			id: IDS.analyticsAgent,
			node_type: 'agent',
			schema_layer: 'pm_core',
			title: 'Analytics Agent',
			description: 'AI agent for tracking rankings, traffic analysis, and performance reporting',
			status: 'active',
			metadata: JSON.stringify({
				capabilities: ['rank_tracking', 'traffic_analysis', 'reporting'],
				model: 'gpt-4',
				authority_level: 'task_execution'
			}),
			created_by: SYSTEM_USER_ID,
			created_at: now,
			updated_at: now,
			version: 1
		}
	];

	// ============================================================================
	// 3. PLAN
	// ============================================================================
	const plans = [
		{
			id: IDS.seoPlan,
			node_type: 'plan',
			schema_layer: 'pm_core',
			title: 'Q1 SEO Campaign Plan',
			description: 'Comprehensive SEO improvement plan targeting 50% organic traffic increase',
			status: 'approved',
			metadata: JSON.stringify({
				target_metric: 'organic_traffic',
				target_increase: '50%',
				timeline: '90 days',
				budget: '$15,000',
				kpis: [
					'Domain Authority: 35 → 45',
					'Organic Traffic: 10k → 15k monthly',
					'Keyword Rankings: 50 first-page keywords'
				]
			}),
			created_by: IDS.projectManager,
			created_at: now,
			updated_at: now,
			version: 1
		}
	];

	// ============================================================================
	// 4. TASKS
	// ============================================================================
	const tasks = [
		{
			id: IDS.taskAudit,
			node_type: 'task',
			schema_layer: 'pm_core',
			title: 'Site Audit & Analysis',
			description: 'Comprehensive technical and content audit of current website',
			status: 'completed',
			metadata: JSON.stringify({
				priority: 'high',
				due_date: '2026-02-10',
				estimated_hours: 8,
				acceptance_criteria: [
					'Full crawl report generated',
					'Broken links identified',
					'Page speed analysis complete',
					'Mobile usability checked'
				]
			}),
			created_by: IDS.projectManager,
			created_at: now,
			updated_at: now,
			version: 1
		},
		{
			id: IDS.taskKeywords,
			node_type: 'task',
			schema_layer: 'pm_core',
			title: 'Keyword Research & Strategy',
			description: 'Identify target keywords based on search volume, competition, and relevance',
			status: 'in_progress',
			metadata: JSON.stringify({
				priority: 'high',
				due_date: '2026-02-15',
				estimated_hours: 12,
				acceptance_criteria: [
					'Primary keywords list (20)',
					'Long-tail keywords list (50)',
					'Competitor keyword gap analysis',
					'Search intent mapping'
				]
			}),
			created_by: IDS.projectManager,
			created_at: now,
			updated_at: now,
			version: 1
		},
		{
			id: IDS.taskOnPage,
			node_type: 'task',
			schema_layer: 'pm_core',
			title: 'On-Page Optimization',
			description: 'Optimize meta tags, headers, and content structure for target keywords',
			status: 'backlog',
			metadata: JSON.stringify({
				priority: 'high',
				due_date: '2026-02-25',
				estimated_hours: 16,
				acceptance_criteria: [
					'Title tags optimized',
					'Meta descriptions written',
					'H1-H6 hierarchy fixed',
					'Internal linking improved'
				]
			}),
			created_by: IDS.projectManager,
			created_at: now,
			updated_at: now,
			version: 1
		},
		{
			id: IDS.taskContent,
			node_type: 'task',
			schema_layer: 'pm_core',
			title: 'Content Creation & Optimization',
			description: 'Create new SEO-optimized content and improve existing pages',
			status: 'backlog',
			metadata: JSON.stringify({
				priority: 'medium',
				due_date: '2026-03-15',
				estimated_hours: 40,
				acceptance_criteria: [
					'10 new blog posts',
					'5 landing pages updated',
					'All content passes readability check',
					'Images optimized with alt tags'
				]
			}),
			created_by: IDS.projectManager,
			created_at: now,
			updated_at: now,
			version: 1
		},
		{
			id: IDS.taskBacklinks,
			node_type: 'task',
			schema_layer: 'pm_core',
			title: 'Link Building Campaign',
			description: 'Acquire high-quality backlinks through outreach and content marketing',
			status: 'backlog',
			metadata: JSON.stringify({
				priority: 'medium',
				due_date: '2026-03-30',
				estimated_hours: 30,
				acceptance_criteria: [
					'20 quality backlinks acquired',
					'Guest posts on 5 sites',
					'Broken link reclamation done',
					'Competitor backlink analysis'
				]
			}),
			created_by: IDS.projectManager,
			created_at: now,
			updated_at: now,
			version: 1
		},
		{
			id: IDS.taskTechnical,
			node_type: 'task',
			schema_layer: 'pm_core',
			title: 'Technical SEO Fixes',
			description: 'Implement technical improvements for crawlability and indexation',
			status: 'backlog',
			metadata: JSON.stringify({
				priority: 'high',
				due_date: '2026-02-20',
				estimated_hours: 20,
				acceptance_criteria: [
					'XML sitemap updated',
					'Robots.txt optimized',
					'Page speed improved to 90+',
					'Structured data implemented'
				]
			}),
			created_by: IDS.projectManager,
			created_at: now,
			updated_at: now,
			version: 1
		},
		{
			id: IDS.taskAnalytics,
			node_type: 'task',
			schema_layer: 'pm_core',
			title: 'Setup Tracking & Reporting',
			description: 'Configure analytics and create reporting dashboard',
			status: 'in_progress',
			metadata: JSON.stringify({
				priority: 'medium',
				due_date: '2026-02-12',
				estimated_hours: 6,
				acceptance_criteria: [
					'GA4 configured',
					'Search Console connected',
					'Rank tracking setup',
					'Weekly report template'
				]
			}),
			created_by: IDS.projectManager,
			created_at: now,
			updated_at: now,
			version: 1
		}
	];

	// ============================================================================
	// 5. DECISIONS
	// ============================================================================
	const decisions = [
		{
			id: IDS.decisionKeywordStrategy,
			node_type: 'decision',
			schema_layer: 'pm_core',
			title: 'Keyword Targeting Strategy',
			description: 'Decision on whether to focus on high-volume competitive keywords or long-tail niche keywords',
			status: 'approved',
			metadata: JSON.stringify({
				decision_type: 'strategy',
				options_considered: [
					'High-volume competitive keywords',
					'Long-tail niche keywords',
					'Hybrid approach'
				],
				chosen_option: 'Hybrid approach',
				rationale: 'Target 20% high-volume for brand visibility and 80% long-tail for quick wins and conversions',
				decided_by: IDS.projectManager,
				decided_at: now
			}),
			created_by: IDS.projectManager,
			created_at: now,
			updated_at: now,
			version: 1
		},
		{
			id: IDS.decisionContentFormat,
			node_type: 'decision',
			schema_layer: 'pm_core',
			title: 'Content Format Priority',
			description: 'Decision on primary content format for SEO campaign',
			status: 'pending',
			metadata: JSON.stringify({
				decision_type: 'tactical',
				options_considered: [
					'Long-form blog posts (2000+ words)',
					'Short actionable guides (800-1200 words)',
					'Video content with transcripts',
					'Interactive tools and calculators'
				],
				rationale_needed: 'Need data on competitor content performance'
			}),
			created_by: IDS.seoSpecialist,
			created_at: now,
			updated_at: now,
			version: 1
		}
	];

	// ============================================================================
	// 6. RISKS
	// ============================================================================
	const risks = [
		{
			id: IDS.riskAlgorithm,
			node_type: 'risk',
			schema_layer: 'pm_core',
			title: 'Algorithm Update Impact',
			description: 'Risk of Google algorithm update negatively impacting rankings mid-campaign',
			status: 'active',
			metadata: JSON.stringify({
				severity: 'high',
				probability: 'medium',
				impact: 'Could reset progress on keyword rankings',
				mitigation: 'Follow white-hat practices, diversify traffic sources, monitor Search Console alerts'
			}),
			created_by: IDS.seoSpecialist,
			created_at: now,
			updated_at: now,
			version: 1
		},
		{
			id: IDS.riskCompetition,
			node_type: 'risk',
			schema_layer: 'pm_core',
			title: 'Competitor SEO Response',
			description: 'Competitors may increase their SEO efforts in response to our campaign',
			status: 'active',
			metadata: JSON.stringify({
				severity: 'medium',
				probability: 'high',
				impact: 'Harder to achieve ranking goals for competitive keywords',
				mitigation: 'Monitor competitor activities weekly, focus on differentiated content'
			}),
			created_by: IDS.seoSpecialist,
			created_at: now,
			updated_at: now,
			version: 1
		}
	];

	// Insert all nodes
	await knex('nodes').insert([...users, ...agents, ...plans, ...tasks, ...decisions, ...risks]);
	console.log('✓ Inserted nodes: users, agents, plan, tasks, decisions, risks');

	// ============================================================================
	// 7. EDGES (Relationships with Weights)
	// ============================================================================
	const edges = [
		// Plan contains tasks
		{ id: uuid(), edge_type: 'has_task', source_node_id: IDS.seoPlan, target_node_id: IDS.taskAudit, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'has_task', source_node_id: IDS.seoPlan, target_node_id: IDS.taskKeywords, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'has_task', source_node_id: IDS.seoPlan, target_node_id: IDS.taskOnPage, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'has_task', source_node_id: IDS.seoPlan, target_node_id: IDS.taskContent, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'has_task', source_node_id: IDS.seoPlan, target_node_id: IDS.taskBacklinks, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'has_task', source_node_id: IDS.seoPlan, target_node_id: IDS.taskTechnical, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'has_task', source_node_id: IDS.seoPlan, target_node_id: IDS.taskAnalytics, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },

		// Task dependencies (high weight = critical dependency)
		{ id: uuid(), edge_type: 'depends_on', source_node_id: IDS.taskKeywords, target_node_id: IDS.taskAudit, weight: 0.9, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'depends_on', source_node_id: IDS.taskOnPage, target_node_id: IDS.taskKeywords, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'depends_on', source_node_id: IDS.taskContent, target_node_id: IDS.taskKeywords, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'depends_on', source_node_id: IDS.taskContent, target_node_id: IDS.taskOnPage, weight: 0.5, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'depends_on', source_node_id: IDS.taskBacklinks, target_node_id: IDS.taskContent, weight: 0.8, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'depends_on', source_node_id: IDS.taskTechnical, target_node_id: IDS.taskAudit, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },

		// Task assignments (weight = involvement level)
		{ id: uuid(), edge_type: 'assigned_to', source_node_id: IDS.taskAudit, target_node_id: IDS.seoSpecialist, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'assigned_to', source_node_id: IDS.taskKeywords, target_node_id: IDS.keywordAgent, weight: 0.7, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'assigned_to', source_node_id: IDS.taskKeywords, target_node_id: IDS.seoSpecialist, weight: 0.3, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'assigned_to', source_node_id: IDS.taskOnPage, target_node_id: IDS.contentAgent, weight: 0.6, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'assigned_to', source_node_id: IDS.taskOnPage, target_node_id: IDS.seoSpecialist, weight: 0.4, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'assigned_to', source_node_id: IDS.taskContent, target_node_id: IDS.contentWriter, weight: 0.7, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'assigned_to', source_node_id: IDS.taskContent, target_node_id: IDS.contentAgent, weight: 0.3, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'assigned_to', source_node_id: IDS.taskBacklinks, target_node_id: IDS.seoSpecialist, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'assigned_to', source_node_id: IDS.taskTechnical, target_node_id: IDS.seoSpecialist, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'assigned_to', source_node_id: IDS.taskAnalytics, target_node_id: IDS.analyticsAgent, weight: 0.8, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'assigned_to', source_node_id: IDS.taskAnalytics, target_node_id: IDS.projectManager, weight: 0.2, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },

		// Decisions relate to tasks
		{ id: uuid(), edge_type: 'relates_to', source_node_id: IDS.decisionKeywordStrategy, target_node_id: IDS.taskKeywords, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'relates_to', source_node_id: IDS.decisionContentFormat, target_node_id: IDS.taskContent, weight: 1.0, created_by: IDS.seoSpecialist, created_at: now, updated_at: now, version: 1 },

		// Risks relate to tasks (weight = impact severity)
		{ id: uuid(), edge_type: 'impacts', source_node_id: IDS.riskAlgorithm, target_node_id: IDS.taskKeywords, weight: 0.8, created_by: IDS.seoSpecialist, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'impacts', source_node_id: IDS.riskAlgorithm, target_node_id: IDS.taskOnPage, weight: 0.9, created_by: IDS.seoSpecialist, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'impacts', source_node_id: IDS.riskAlgorithm, target_node_id: IDS.taskBacklinks, weight: 0.95, created_by: IDS.seoSpecialist, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'impacts', source_node_id: IDS.riskCompetition, target_node_id: IDS.taskKeywords, weight: 0.7, created_by: IDS.seoSpecialist, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'impacts', source_node_id: IDS.riskCompetition, target_node_id: IDS.taskBacklinks, weight: 0.6, created_by: IDS.seoSpecialist, created_at: now, updated_at: now, version: 1 },

		// Agent supervisions
		{ id: uuid(), edge_type: 'supervised_by', source_node_id: IDS.keywordAgent, target_node_id: IDS.seoSpecialist, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'supervised_by', source_node_id: IDS.contentAgent, target_node_id: IDS.contentWriter, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
		{ id: uuid(), edge_type: 'supervised_by', source_node_id: IDS.analyticsAgent, target_node_id: IDS.projectManager, weight: 1.0, created_by: IDS.projectManager, created_at: now, updated_at: now, version: 1 },
	];

	await knex('edges').insert(edges);
	console.log(`✓ Inserted ${edges.length} edges (relationships)`);

	console.log('✅ SEO Demo Project seeded successfully!');
	console.log(`   - 3 users, 3 agents, 1 plan, 7 tasks, 2 decisions, 2 risks`);
	console.log(`   - ${edges.length} relationships with weights`);
};
