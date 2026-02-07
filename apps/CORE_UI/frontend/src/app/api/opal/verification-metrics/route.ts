import { NextRequest, NextResponse } from 'next/server';
import { opalClient } from '@/services/opal-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = {
      project_id: searchParams.get('project_id') || 'proj-001',
      subsystem: searchParams.get('subsystem') || undefined
    };

    if (!params.subsystem) {
      delete params.subsystem;
    }

    const result = await opalClient.getVerificationCoverageMetrics(params);

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
