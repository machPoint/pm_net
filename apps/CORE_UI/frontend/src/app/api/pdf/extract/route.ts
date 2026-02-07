import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), '..', 'backend', 'fds', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save the uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadsDir, fileName);
    
    await writeFile(filePath, buffer);

    // Upload to database service via FDS API
    try {
      // First, upload the document to the database
      const uploadResponse = await fetch('http://localhost:8001/mock/admin/upload-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: fileName,
          original_filename: file.name,
          file_content: buffer.toString('base64'),
          uploaded_by: 'web_user'
        })
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }
      
      const uploadResult = await uploadResponse.json();
      const documentId = uploadResult.document_id;
      
      // Process the document to extract requirements
      const processResponse = await fetch(`http://localhost:8001/mock/admin/documents/${documentId}/process`, {
        method: 'POST'
      });
      
      if (!processResponse.ok) {
        throw new Error(`Processing failed: ${processResponse.status}`);
      }
      
      const processResult = await processResponse.json();
      
      if (processResult.status === 'completed') {
        return NextResponse.json({
          success: true,
          message: `Successfully extracted ${processResult.requirements_count} requirements from ${file.name}`,
          fileName: fileName,
          documentId: documentId,
          extractedCount: processResult.requirements_count,
          documentType: processResult.document_type,
          mission: processResult.mission
        });
      } else {
        throw new Error(processResult.error || 'Processing failed');
      }
      
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Failed to process PDF via database service',
          details: error instanceof Error ? error.message : 'Unknown error',
          fileName: fileName
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process PDF upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return list of extracted requirements files
  const uploadsDir = path.join(process.cwd(), '..', 'backend', 'fds', 'uploads');
  
  try {
    const { readdir } = await import('fs/promises');
    const files = await readdir(uploadsDir);
    const requirementFiles = files.filter(file => file.endsWith('_requirements.json'));
    
    return NextResponse.json({
      requirementFiles: requirementFiles.map(file => ({
        filename: file,
        originalPdf: file.replace('_requirements.json', '').replace(/^\d+_/, ''),
        created: new Date().toISOString() // Could get actual file stats
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { requirementFiles: [] }
    );
  }
}