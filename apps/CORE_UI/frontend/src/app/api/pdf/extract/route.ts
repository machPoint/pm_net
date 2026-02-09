import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'PDF extraction not yet implemented' },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json({ requirementFiles: [] });
}