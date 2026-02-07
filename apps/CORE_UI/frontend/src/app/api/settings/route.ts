import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { openaiApiKey, openaiModel } = body;

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is required' },
        { status: 400 }
      );
    }

    // Path to .env file (root of project)
    const envPath = join(process.cwd(), '.env');

    // Read existing .env file
    let envContent = '';
    try {
      envContent = await readFile(envPath, 'utf-8');
    } catch (error) {
      // File doesn't exist, create new content
      envContent = '# OpenAI Configuration\n';
    }

    // Parse existing env vars
    const envLines = envContent.split('\n');
    const updatedLines: string[] = [];
    let foundApiKey = false;
    let foundModel = false;

    // Update existing values or keep other lines
    for (const line of envLines) {
      if (line.startsWith('OPENAI_API_KEY=')) {
        updatedLines.push(`OPENAI_API_KEY=${openaiApiKey}`);
        foundApiKey = true;
      } else if (line.startsWith('MODEL=')) {
        updatedLines.push(`MODEL=${openaiModel || 'gpt-4o'}`);
        foundModel = true;
      } else {
        updatedLines.push(line);
      }
    }

    // Add new values if they didn't exist
    if (!foundApiKey) {
      updatedLines.push(`OPENAI_API_KEY=${openaiApiKey}`);
    }
    if (!foundModel) {
      updatedLines.push(`MODEL=${openaiModel || 'gpt-4o'}`);
    }

    // Write back to .env file
    const newEnvContent = updatedLines.join('\n');
    await writeFile(envPath, newEnvContent, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    });

  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Path to .env file
    const envPath = join(process.cwd(), '.env');

    // Read .env file
    let envContent = '';
    try {
      envContent = await readFile(envPath, 'utf-8');
    } catch (error) {
      // File doesn't exist, return defaults
      return NextResponse.json({
        openaiApiKey: '',
        openaiModel: 'gpt-4o'
      });
    }

    // Parse env vars
    const envLines = envContent.split('\n');
    let apiKey = '';
    let model = 'gpt-4o';

    for (const line of envLines) {
      if (line.startsWith('OPENAI_API_KEY=')) {
        apiKey = line.substring('OPENAI_API_KEY='.length).trim();
      } else if (line.startsWith('MODEL=')) {
        model = line.substring('MODEL='.length).trim();
      }
    }

    // Mask the API key for security (show only last 4 characters)
    const maskedApiKey = apiKey ? `sk-...${apiKey.slice(-4)}` : '';

    return NextResponse.json({
      openaiApiKey: maskedApiKey,
      openaiModel: model,
      hasApiKey: !!apiKey
    });

  } catch (error) {
    console.error('Error loading settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}
