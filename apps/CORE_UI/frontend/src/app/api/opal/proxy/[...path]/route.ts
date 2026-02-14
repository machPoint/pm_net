import { NextRequest, NextResponse } from 'next/server';

/**
 * Catch-all OPAL Proxy Route
 * Forwards any /api/opal/proxy/* request to OPAL_SE backend.
 * This prevents browser-side code from needing direct access to OPAL_SE.
 */

const OPAL_URL = process.env.NEXT_PUBLIC_OPAL_URL || 'http://localhost:7788';

async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = `/${path.join('/')}`;
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${OPAL_URL}${targetPath}${searchParams ? '?' + searchParams : ''}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': request.headers.get('content-type') || 'application/json',
    };

    const auth = request.headers.get('authorization');
    if (auth) headers['Authorization'] = auth;

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      fetchOptions.body = await request.text();
    }

    const response = await fetch(url, fetchOptions);

    const responseHeaders = new Headers();
    const contentType = response.headers.get('content-type');
    if (contentType) responseHeaders.set('Content-Type', contentType);

    const mcpSessionId = response.headers.get('mcp-session-id');
    if (mcpSessionId) responseHeaders.set('Mcp-Session-Id', mcpSessionId);

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `OPAL proxy error: ${error.message}` },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
