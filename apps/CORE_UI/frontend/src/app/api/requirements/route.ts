import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    
    // Check if FDS is running
    let healthCheck;
    const fdsUrls = ['http://127.0.0.1:4000', 'http://localhost:4000'];
    let lastError = null;
    
    for (const fdsUrl of fdsUrls) {
      try {
        console.log(`Trying FDS at: ${fdsUrl}`);
        healthCheck = await fetch(`${fdsUrl}/health`, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
      
        if (!healthCheck.ok) {
          throw new Error(`Health check failed with status: ${healthCheck.status}`);
        }
        
        const healthData = await healthCheck.json();
        console.log(`FDS Health Check successful at ${fdsUrl}:`, healthData);
        break; // Successfully connected, exit loop
        
      } catch (error) {
        console.error(`FDS Health Check Error for ${fdsUrl}:`, error);
        lastError = error;
        healthCheck = null;
      }
    }
    
    // If no URL worked, return error
    if (!healthCheck) {
      return NextResponse.json({
        error: 'Data engine is not running',
        message: `Cannot connect to data engine: ${lastError instanceof Error ? lastError.message : 'All connection attempts failed'}`,
        requirements: [],
        total: 0
      }, { status: 503 });
    }

    // Determine which FDS URL worked from health check
    const fdsBaseUrl = healthCheck.url.replace('/health', '');
    console.log(`Using FDS base URL: ${fdsBaseUrl}`);
    
    // Fetch from the FDS Jama endpoint which has mock requirements data
    // Note: Endpoint returns 50 items by default, no parameters needed
    const response = await fetch(`${fdsBaseUrl}/mock/jama/items`);
    
    if (!response.ok) {
      throw new Error(`FDS responded with status: ${response.status}`);
    }

    const jamaItems = await response.json();
    
    // Apply category filter if provided
    let filteredRequirements = Array.isArray(jamaItems) ? jamaItems : [];
    if (category) {
      filteredRequirements = filteredRequirements.filter((req: any) => 
        req.document_key?.toLowerCase().includes(category.toLowerCase()) ||
        req.fields?.certification_basis?.toLowerCase().includes(category.toLowerCase())
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRequirements = filteredRequirements.filter((req: any) => 
        req.title?.toLowerCase().includes(searchLower) ||
        req.text?.toLowerCase().includes(searchLower) ||
        req.requirement_id?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply pagination on frontend
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedRequirements = filteredRequirements.slice(startIndex, endIndex);
    
    // Transform the Jama data to match the frontend interface
    const requirements = paginatedRequirements.map((req: any) => ({
      id: req.id || req.global_id,
      title: req.name || req.global_id,
      type: "requirement" as const,
      status: req.status === "approved" ? "active" : 
              req.status === "validated" ? "completed" : "pending",
      lastUpdated: req.modified_date ? new Date(req.modified_date).toLocaleString() : "Unknown",
      owner: req.modified_by || req.created_by || "System",
      tags: [req.document_key, req.fields?.safety_level, req.fields?.certification_basis].filter(Boolean),
      category: req.document_key || "system",
      priority: req.fields?.priority || "medium",
      verification_method: req.fields?.verification_method,
      text: req.description,
      source_document: req.document_key,
      source_page: undefined,
      confidence: undefined
    })) || [];

    return NextResponse.json({
      success: true,
      requirements,
      total: filteredRequirements.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + requirements.length) < filteredRequirements.length
      }
    });

  } catch (error) {
    console.error('Error fetching requirements:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch requirements',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      requirements: [],
      total: 0
    }, { status: 500 });
  }
}