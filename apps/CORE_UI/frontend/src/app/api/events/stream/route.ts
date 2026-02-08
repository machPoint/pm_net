import { NextRequest } from 'next/server';

/**
 * SSE Proxy Route
 * Proxies the OPAL_SE event stream to the browser.
 * This keeps the browser from needing direct access to OPAL_SE.
 */
export async function GET(request: NextRequest) {
  const opalUrl = process.env.NEXT_PUBLIC_OPAL_URL || 'http://localhost:7788';

  try {
    const upstream = await fetch(`${opalUrl}/api/events/stream`, {
      headers: { 'Accept': 'text/event-stream' },
      // @ts-ignore - Next.js extended fetch supports this
      cache: 'no-store',
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(JSON.stringify({ error: 'Failed to connect to event stream' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Pipe the upstream SSE stream directly to the client
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: `Event stream proxy error: ${error.message}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
