/**
 * Lessons Learned MCP Tools Registration
 * Register lessons sidecar tools with OPAL
 */

import { createTool } from '../toolsService';
import logger from '../../logger';

const LESSONS_SERVICE_URL = process.env.LESSONS_SERVICE_URL || 'http://localhost:7070';

/**
 * Tool 1: Search Lessons
 * Search lessons learned with filters and semantic search
 */
createTool({
  name: 'search_lessons',
  description: 'Search lessons learned with filters and semantic search. Use this to find relevant lessons from past projects based on disciplines, subsystems, failure modes, or free text queries.',
  inputSchema: {
    type: 'object',
    properties: {
      disciplines: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by disciplines (e.g., Systems, Thermal, EE, V&V, Safety)'
      },
      subsystems: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by subsystems (e.g., ECLSS, GNC, Power, Avionics)'
      },
      entity_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by related entity IDs (requirements, components, etc.)'
      },
      failure_modes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by failure modes (e.g., leakage, schedule_slip, missing_test_coverage)'
      },
      phase: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by project phase (e.g., Concept, PDR, CDR, Verification)'
      },
      severity: {
        type: 'array',
        items: { type: 'string', enum: ['low', 'medium', 'high', 'catastrophic'] },
        description: 'Filter by severity level'
      },
      free_text_query: {
        type: 'string',
        description: 'Free text query for semantic search (e.g., "valve failure during thermal testing")'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10)'
      }
    }
  },
  _internal: {
    path: '/lessons/search',
    processor: async (params: any) => {
      try {
        logger.info('Searching lessons', { params });
        
        const response = await fetch(`${LESSONS_SERVICE_URL}/api/lessons/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
        
        if (!response.ok) {
          throw new Error(`Lessons service error: ${response.status}`);
        }
        
        const result = await response.json();
        logger.info('Lessons search completed', { count: result.total_count });
        
        return result;
      } catch (error: any) {
        logger.error('Failed to search lessons:', error);
        throw new Error(`Failed to search lessons: ${error.message}`);
      }
    }
  }
});

/**
 * Tool 2: Get Lesson Detail
 * Get full details for a specific lesson by ID
 */
createTool({
  name: 'get_lesson_detail',
  description: 'Get full details for a specific lesson learned, including complete text, root causes, failure modes, and recommendations.',
  inputSchema: {
    type: 'object',
    properties: {
      lesson_id: {
        type: 'string',
        description: 'The unique ID of the lesson to retrieve'
      }
    },
    required: ['lesson_id']
  },
  _internal: {
    path: '/lessons/detail',
    processor: async (params: any) => {
      try {
        logger.info('Getting lesson detail', { lesson_id: params.lesson_id });
        
        const response = await fetch(`${LESSONS_SERVICE_URL}/api/lessons/${params.lesson_id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Lesson not found: ${params.lesson_id}`);
          }
          throw new Error(`Lessons service error: ${response.status}`);
        }
        
        const result = await response.json();
        logger.info('Lesson detail retrieved', { lesson_id: params.lesson_id });
        
        return result;
      } catch (error: any) {
        logger.error('Failed to get lesson detail:', error);
        throw new Error(`Failed to get lesson detail: ${error.message}`);
      }
    }
  }
});

/**
 * Tool 3: Suggest Lessons for Activity
 * Suggest relevant lessons for an activity or entity (orchestration tool)
 */
createTool({
  name: 'suggest_lessons_for_activity',
  description: 'Suggest relevant lessons learned for a specific activity or entity. This tool automatically gathers context from the system and finds the most relevant lessons.',
  inputSchema: {
    type: 'object',
    properties: {
      activity_id: {
        type: 'string',
        description: 'Activity ID to get lessons for'
      },
      entity_id: {
        type: 'string',
        description: 'Entity ID (requirement, component, etc.) to get lessons for'
      },
      context: {
        type: 'object',
        description: 'Optional context override',
        properties: {
          disciplines: { type: 'array', items: { type: 'string' } },
          subsystems: { type: 'array', items: { type: 'string' } },
          phase: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' }
        }
      }
    }
  },
  _internal: {
    path: '/lessons/suggest',
    processor: async (params: any) => {
      try {
        logger.info('Suggesting lessons for activity', { params });
        
        // Build context from entity if provided
        let context = params.context || {};
        
        if (params.entity_id && !params.context) {
          // TODO: Fetch entity details from system graph
          // For now, use empty context
          logger.warn('Entity context fetching not yet implemented, using provided context');
        }
        
        // Build search parameters
        const searchParams: any = {
          limit: 5
        };
        
        if (context.disciplines && context.disciplines.length > 0) {
          searchParams.disciplines = context.disciplines;
        }
        if (context.subsystems && context.subsystems.length > 0) {
          searchParams.subsystems = context.subsystems;
        }
        if (context.phase && context.phase.length > 0) {
          searchParams.phase = context.phase;
        }
        if (context.description) {
          searchParams.free_text_query = context.description;
        }
        
        // Call lessons service
        const response = await fetch(`${LESSONS_SERVICE_URL}/api/lessons/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(searchParams)
        });
        
        if (!response.ok) {
          throw new Error(`Lessons service error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Format response
        const subsystemsText = context.subsystems?.join(', ') || 'this activity';
        const summary = result.total_count > 0
          ? `Found ${result.total_count} lesson${result.total_count === 1 ? '' : 's'} related to ${subsystemsText}`
          : `No lessons found for ${subsystemsText}`;
        
        logger.info('Lessons suggested', { count: result.total_count });
        
        return {
          summary,
          lessons: result.lessons,
          query_info: result.query_info
        };
      } catch (error: any) {
        logger.error('Failed to suggest lessons:', error);
        throw new Error(`Failed to suggest lessons: ${error.message}`);
      }
    }
  }
});

/**
 * Tool 4: Log Lesson (optional for v0.1)
 * Create a new lesson programmatically
 */
createTool({
  name: 'log_lesson',
  description: 'Log a new lesson learned. Use this to capture lessons from incidents, retrospectives, or change analysis.',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short, descriptive title' },
      summary: { type: 'string', description: '1-3 sentence summary' },
      full_text: { type: 'string', description: 'Full lesson description with recommendations' },
      source_system: { type: 'string', description: 'Source system (e.g., manual, jira, confluence)' },
      source_link: { type: 'string', description: 'URL back to original source' },
      author: { type: 'string', description: 'Author name' },
      team: { type: 'string', description: 'Team name' },
      disciplines: { type: 'array', items: { type: 'string' } },
      subsystems: { type: 'array', items: { type: 'string' } },
      entity_ids: { type: 'array', items: { type: 'string' } },
      failure_modes: { type: 'array', items: { type: 'string' } },
      root_causes: { type: 'array', items: { type: 'string' } },
      phase: { type: 'array', items: { type: 'string' } },
      severity: { type: 'string', enum: ['low', 'medium', 'high', 'catastrophic'] },
      tags: { type: 'array', items: { type: 'string' } },
      is_canonical: { type: 'boolean', description: 'True if curated, false if raw/draft' }
    },
    required: ['title', 'summary', 'full_text', 'source_system', 'author', 'team', 'disciplines', 'subsystems', 'severity']
  },
  _internal: {
    path: '/lessons/log',
    processor: async (params: any) => {
      try {
        logger.info('Logging new lesson', { title: params.title });
        
        const response = await fetch(`${LESSONS_SERVICE_URL}/api/lessons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params)
        });
        
        if (!response.ok) {
          throw new Error(`Lessons service error: ${response.status}`);
        }
        
        const result = await response.json();
        logger.info('Lesson logged successfully', { id: result.id });
        
        return result;
      } catch (error: any) {
        logger.error('Failed to log lesson:', error);
        throw new Error(`Failed to log lesson: ${error.message}`);
      }
    }
  }
});

logger.info('✅ Lessons Learned tools registered');
