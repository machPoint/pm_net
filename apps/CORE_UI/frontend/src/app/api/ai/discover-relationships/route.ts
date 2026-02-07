import { NextRequest, NextResponse } from 'next/server';

interface DataSource {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata: {
    owner?: string;
    date?: string;
    system?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sources } = body;

    if (!sources || !Array.isArray(sources) || sources.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 data sources are required' },
        { status: 400 }
      );
    }

    // Build the analysis prompt
    const sourcesText = sources.map((source: DataSource, idx: number) => 
      `[Source ${idx + 1}]\nType: ${source.type.toUpperCase()}\nTitle: ${source.title}\nSystem: ${source.metadata.system || 'Unknown'}\nContent: ${source.content}\n`
    ).join('\n---\n\n');

    const systemPrompt = `You are an expert aerospace systems engineer specializing in cross-system integration analysis. Your task is to analyze multiple data sources (requirements, Jira tickets, emails, documents) and discover hidden relationships, dependencies, and integration points between different systems.

Focus on identifying:
1. Shared resources (e.g., oxygen supply used by both propulsion and life support)
2. Dependencies (one system relies on another)
3. Integration points (systems that must work together)
4. Potential conflicts (competing requirements or resource constraints)
5. Opportunities (synergies that could be leveraged)

For each relationship discovered:
- Provide a clear, technical description
- Explain the engineering significance
- Identify potential risks
- Recommend specific actions

Be thorough and precise. Look for subtle connections that might not be obvious.`;

    const userPrompt = `Analyze these aerospace engineering data sources and discover all cross-system relationships, dependencies, and integration points:

${sourcesText}

Return your analysis as a JSON array of relationship objects. Each object must have:
{
  "relationshipType": "shared-resource" | "dependency" | "integration" | "conflict" | "opportunity",
  "confidence": number (0-100),
  "description": "Brief description of the relationship",
  "aiInsight": "Detailed technical explanation of the relationship and why it's important",
  "potentialRisks": ["risk 1", "risk 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "systemsInvolved": ["system 1", "system 2", ...],
  "sourceIndices": [0, 1] // Which sources are connected (0-indexed)
}

Return ONLY valid JSON. No markdown, no explanations outside the JSON.`;

    // Proxy through OPAL_SE
    const opalUrl = process.env.NEXT_PUBLIC_OPAL_URL || 'http://localhost:7788';
    const openaiResponse = await fetch(`${opalUrl}/api/ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        max_tokens: 2000,
        response_format: 'json_object'
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OPAL_SE API error:', error);
      return NextResponse.json(
        { error: 'Failed to get AI analysis', details: error },
        { status: 500 }
      );
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.message || openaiData.content;

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let relationships;
    try {
      const parsed = JSON.parse(aiResponse);
      // Handle both direct array and wrapped object formats
      relationships = Array.isArray(parsed) ? parsed : (parsed.relationships || []);
      console.log(`Parsed ${relationships.length} relationships from AI`);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      return NextResponse.json(
        { error: 'Invalid AI response format', details: aiResponse },
        { status: 500 }
      );
    }

    // Map source indices back to actual sources
    const enrichedRelationships = relationships.map((rel: any, idx: number) => {
      const sourceIndices = rel.sourceIndices || [0, 1];
      
      // Ensure indices are valid
      const sourceA = sources[sourceIndices[0]] || sources[0];
      const sourceB = sources[sourceIndices[1]] || sources[1] || sources[0];
      
      return {
        id: `rel-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
        sourceA,
        sourceB,
        relationshipType: rel.relationshipType || 'integration',
        confidence: rel.confidence || 75,
        description: rel.description || 'Related systems',
        aiInsight: rel.aiInsight || rel.description || 'AI analysis pending',
        potentialRisks: rel.potentialRisks || [],
        recommendations: rel.recommendations || [],
        systemsInvolved: rel.systemsInvolved || []
      };
    }).filter((rel: any) => rel.sourceA && rel.sourceB); // Remove any relationships with missing sources

    return NextResponse.json({
      relationships: enrichedRelationships,
      analysisTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('Relationship discovery error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to discover relationships',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
