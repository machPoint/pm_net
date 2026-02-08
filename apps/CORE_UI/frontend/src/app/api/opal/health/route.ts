import { NextRequest, NextResponse } from 'next/server';
import { opalClient } from '@/services/opal-client';

export async function GET(request: NextRequest) {
  try {
    const health = await opalClient.healthCheck();

    return NextResponse.json({
      success: true,
      opal: {
        ...health,
        status: 'online' // Override OPAL's 'healthy' with 'online' for UI consistency
      }
    });

  } catch (error: any) {
    console.error('Error checking OPAL health:', error);
    
    return NextResponse.json({
      success: false,
      opal: {
        status: 'offline',
        error: error.message
      }
    }, { status: 503 });
  }
}
