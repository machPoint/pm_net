import { NextRequest, NextResponse } from 'next/server';
import { opalClient } from '@/services/opal-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = {
      project_id: searchParams.get('project_id') || 'proj-001',
      rule_ids: searchParams.get('rule_ids')?.split(',') || undefined
    };

    // Remove undefined values
    if (!params.rule_ids) {
      delete params.rule_ids;
    }

    const result = await opalClient.runConsistencyChecks(params);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('Error running consistency checks:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to run consistency checks',
      message: error.message,
      violations: [],
      total_violations: 0
    }, { status: error.message.includes('unreachable') ? 503 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await opalClient.runConsistencyChecks(body);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('Error running consistency checks:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to run consistency checks',
      message: error.message,
      violations: [],
      total_violations: 0
    }, { status: 500 });
  }
}
