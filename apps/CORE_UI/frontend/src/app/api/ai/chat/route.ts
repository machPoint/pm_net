import { NextRequest, NextResponse } from 'next/server';

/**
 * AI Chat API Route
 * Routes requests through OPAL_SE to add system engineering context
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Route through OPAL_SE for system context
    const opalUrl = process.env.NEXT_PUBLIC_OPAL_URL || 'http://localhost:7788';
    const opalResponse = await fetch(`${opalUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!opalResponse.ok) {
      const error = await opalResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('OPAL AI error:', error);
      return NextResponse.json(
        { error: error.error || 'Failed to get AI response from OPAL' },
        { status: opalResponse.status }
      );
    }

    // Return OPAL's response with system context
    const data = await opalResponse.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('AI chat proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to OPAL AI service', details: error.message },
      { status: 500 }
    );
  }
}