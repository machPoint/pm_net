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
        id: 'REQ-GOES-001',
        title: 'GOES-R Satellite Communication Requirements',
        status: 'active',
        category: 'communication',
        criticality: 'DAL-A',
        description: 'Defines the communication protocols and data transmission requirements for GOES-R weather satellite system.',
        created_at: new Date().toISOString(),
        type: 'requirement'
      },
      {
        id: 'REQ-GOES-002', 
        title: 'Weather Data Processing Algorithms',
        status: 'verified',
        category: 'data-processing',
        criticality: 'DAL-B',
        description: 'Specifies the algorithms for processing meteorological data from satellite sensors.',
        created_at: new Date().toISOString(),
        type: 'requirement'
      },
      {
        id: 'REQ-GOES-003',
        title: 'Ground Station Interface Requirements',
        status: 'pending',
        category: 'interface',
        criticality: 'DAL-A',
        description: 'Requirements for ground station communication interfaces and protocols.',
        created_at: new Date().toISOString(),
        type: 'requirement'
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