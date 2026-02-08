import { NextRequest, NextResponse } from 'next/server';

/**
 * MCP Proxy Route
 * Proxies MCP JSON-RPC requests from the browser to OPAL_SE backend.
 * This prevents the browser from needing direct access to OPAL_SE.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const opalUrl = process.env.NEXT_PUBLIC_OPAL_URL || 'http://localhost:7788';

    const response = await fetch(`${opalUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'MCP-Protocol-Version': '2025-06-18',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { jsonrpc: '2.0', error: { code: -32000, message: `OPAL error: ${response.status}`, data: errorText }, id: body.id },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32603, message: `Proxy error: ${error.message}` }, id: null },
      { status: 502 }
    );
  }
}
