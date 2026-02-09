import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    requirements: [],
    total: 0,
    pagination: { limit: 50, offset: 0, hasMore: false }
  });
}