import { NextResponse } from 'next/server';

const OPAL_URL = process.env.NEXT_PUBLIC_OPAL_URL || 'http://localhost:7788';

export async function GET() {
  try {
    const response = await fetch(`${OPAL_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const health = await response.json();
      return NextResponse.json({
        success: true,
        opal: {
          ...health,
          status: 'online'
        }
      });
    }

    return NextResponse.json({
      success: false,
      opal: {
        status: 'offline',
        error: `OPAL returned ${response.status}`
      }
    }, { status: 503 });

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
