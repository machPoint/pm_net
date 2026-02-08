import { NextResponse } from 'next/server';

/**
 * AI Test Connection API Route
 * Proxies connection test through OPAL_SE backend (never exposes API key to browser)
 */
export async function GET() {
  try {
    const opalUrl = process.env.NEXT_PUBLIC_OPAL_URL || 'http://localhost:7788';
    const response = await fetch(`${opalUrl}/api/ai/test-connection`);

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { status: 'error', error: `OPAL returned ${response.status}: ${error}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', error: `Failed to connect to OPAL: ${error.message}` },
      { status: 500 }
    );
  }
}
