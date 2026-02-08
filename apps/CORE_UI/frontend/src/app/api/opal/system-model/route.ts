import { NextRequest, NextResponse } from 'next/server';
import { opalClient } from '@/services/opal-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = {
      project_id: searchParams.get('project_id') || 'proj-001',
      node_type: searchParams.get('node_type') || undefined,
      source: searchParams.get('source') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    // Remove undefined values
    Object.keys(params).forEach(key => 
      params[key as keyof typeof params] === undefined && delete params[key as keyof typeof params]
    );

    const result = await opalClient.querySystemModel(params);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('Error querying system model:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to query system model',
      message: error.message,
      nodes: [],
      total: 0
    }, { status: error.message.includes('unreachable') ? 503 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await opalClient.querySystemModel(body);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('Error querying system model:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to query system model',
      message: error.message,
      nodes: [],
      total: 0
    }, { status: 500 });
  }
}
