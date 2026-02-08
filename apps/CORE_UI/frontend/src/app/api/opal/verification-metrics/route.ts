import { NextRequest, NextResponse } from 'next/server';
import { opalClient } from '@/services/opal-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = {
      project_id: searchParams.get('project_id') || 'proj-001',
      domain: searchParams.get('domain') || undefined
    };

    if (!params.domain) {
      delete params.domain;
    }

    const result = await opalClient.getValidationCoverageMetrics(params);

    return NextResponse.json({
      success: true,
      metrics: result
    });

  } catch (error: any) {
    console.error('Error getting verification metrics:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get verification metrics',
      message: error.message,
      metrics: null
    }, { status: error.message.includes('unreachable') ? 503 : 500 });
  }
}
