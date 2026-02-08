import { NextRequest, NextResponse } from 'next/server';

interface ContextSearchRequest {
  query: string;
  context_type: string;
  filters?: {
    status?: string;
    category?: string;
    criticality?: string;
  };
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ContextSearchRequest = await request.json();
    
    // For now, return mock search results since we don't have a database connection in this API route
    // In a real implementation, this would connect to your requirements database
    const mockResults = [
      {
        id: 'TASK-001',
        title: 'Data Ingestion Pipeline Throughput',
        status: 'active',
        category: 'data-processing',
        criticality: 'Critical',
        description: 'Defines throughput and latency requirements for the data ingestion pipeline.',
        created_at: new Date().toISOString(),
        type: 'task'
      },
      {
        id: 'TASK-002',
        title: 'Agent Health Monitoring',
        status: 'validated',
        category: 'monitoring',
        criticality: 'High',
        description: 'Specifies health check intervals and alerting thresholds for all active agents.',
        created_at: new Date().toISOString(),
        type: 'task'
      },
      {
        id: 'TASK-003',
        title: 'External API Rate Limiting',
        status: 'pending',
        category: 'interface',
        criticality: 'Critical',
        description: 'Defines rate limiting and retry policies for external API integrations.',
        created_at: new Date().toISOString(),
        type: 'task'
      }
    ];

    // Filter results based on query and filters
    let filteredResults = mockResults;
    
    if (body.query) {
      const queryLower = body.query.toLowerCase();
      filteredResults = filteredResults.filter(result => 
        result.title.toLowerCase().includes(queryLower) ||
        result.id.toLowerCase().includes(queryLower) ||
        result.description.toLowerCase().includes(queryLower)
      );
    }

    if (body.filters?.status) {
      filteredResults = filteredResults.filter(result => 
        result.status === body.filters?.status
      );
    }

    if (body.filters?.category) {
      filteredResults = filteredResults.filter(result => 
        result.category === body.filters?.category
      );
    }

    if (body.filters?.criticality) {
      filteredResults = filteredResults.filter(result => 
        result.criticality === body.filters?.criticality
      );
    }

    // Apply limit
    const limit = Math.min(body.limit || 10, 50);
    const limitedResults = filteredResults.slice(0, limit);

    return NextResponse.json({
      results: limitedResults,
      total_count: filteredResults.length,
      context_type: body.context_type
    });

  } catch (error) {
    console.error('Context search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}