import { NextRequest, NextResponse } from 'next/server';
import { requirementsService } from '@/services/database/requirements-service';
import { jamaService } from '@/services/integrations/jama-service';
import { jiraService } from '@/services/integrations/jira-service';
import { testService } from '@/services/database/test-service';

interface RequirementTrace {
  id: string;
  name: string;
  type: 'requirement' | 'design' | 'code' | 'test' | 'component' | 'jira' | 'jama';
  status: string;
  description?: string;
  metadata: Record<string, any>;
  connections: {
    id: string;
    type: 'depends_on' | 'produces' | 'assigned_to' | 'blocks' | 'mitigates' | 'requires_approval' | 'informs';
    target: string;
  }[];
}

interface RequirementImpactData {
  requirement: RequirementTrace;
  impactTree: RequirementTrace[];
  analytics: {
    totalArtifacts: number;
    coveragePercentage: number;
    testCoverage: number;
    designCoverage: number;
    implementationCoverage: number;
    traceabilityScore: number;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requirementId = searchParams.get('id');

  if (!requirementId) {
    return NextResponse.json(
      { error: 'Requirement ID is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`🔍 Tracing requirement impact for ID: ${requirementId}`);

    // Get the primary requirement
    const requirement = await requirementsService.getRequirement(requirementId);
    if (!requirement) {
      return NextResponse.json(
        { error: 'Requirement not found' },
        { status: 404 }
      );
    }

    // Initialize impact tree with the primary requirement
    const impactTree: RequirementTrace[] = [{
      id: requirement.id,
      name: requirement.title || requirement.name || 'Unknown Requirement',
      type: 'requirement',
      status: requirement.status || 'active',
      description: requirement.description,
      metadata: {
        source: requirement.source || 'system',
        priority: requirement.priority,
        category: requirement.category,
        version: requirement.version
      },
      connections: []
    }];

    // Trace through Jama items
    console.log('🔗 Tracing Jama connections...');
    try {
      const jamaItems = await jamaService.getRelatedItems(requirementId);
      for (const item of jamaItems) {
        const jamaTrace: RequirementTrace = {
          id: `jama-${item.id}`,
          name: item.fields?.name || `Jama Item ${item.id}`,
          type: 'jama',
          status: item.fields?.status || 'unknown',
          description: item.fields?.description,
          metadata: {
            jamaId: item.id,
            itemType: item.itemType,
            project: item.project?.name,
            createdDate: item.createdDate,
            modifiedDate: item.modifiedDate
          },
          connections: [{
            id: `conn-${requirement.id}-jama-${item.id}`,
            type: 'depends_on',
            target: item.id.toString()
          }]
        };
        impactTree.push(jamaTrace);
        
        // Add connection back to requirement
        impactTree[0].connections.push({
          id: `conn-req-jama-${item.id}`,
          type: 'depends_on',
          target: `jama-${item.id}`
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to trace Jama connections:', error);
    }

    // Trace through Jira issues
    console.log('🎫 Tracing Jira connections...');
    try {
      const jiraIssues = await jiraService.getIssuesForRequirement(requirementId);
      for (const issue of jiraIssues) {
        const jiraTrace: RequirementTrace = {
          id: `jira-${issue.key}`,
          name: issue.fields.summary,
          type: 'jira',
          status: issue.fields.status.name.toLowerCase(),
          description: issue.fields.description,
          metadata: {
            jiraKey: issue.key,
            issueType: issue.fields.issuetype.name,
            priority: issue.fields.priority?.name,
            assignee: issue.fields.assignee?.displayName,
            created: issue.fields.created,
            updated: issue.fields.updated,
            project: issue.fields.project.name
          },
          connections: [{
            id: `conn-${requirement.id}-jira-${issue.key}`,
            type: 'produces',
            target: issue.key
          }]
        };
        impactTree.push(jiraTrace);
        
        // Add connection back to requirement
        impactTree[0].connections.push({
          id: `conn-req-jira-${issue.key}`,
          type: 'produces',
          target: `jira-${issue.key}`
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to trace Jira connections:', error);
    }

    // Trace through tests
    console.log('🧪 Tracing test connections...');
    try {
      const tests = await testService.getTestsForRequirement(requirementId);
      for (const test of tests) {
        const testTrace: RequirementTrace = {
          id: `test-${test.id}`,
          name: test.name || `Test ${test.id}`,
          type: 'test',
          status: test.status || 'pending',
          description: test.description,
          metadata: {
            testType: test.type,
            framework: test.framework,
            lastRun: test.lastExecuted,
            result: test.lastResult,
            coverage: test.coverage
          },
          connections: [{
            id: `conn-${requirement.id}-test-${test.id}`,
            type: 'produces',
            target: test.id
          }]
        };
        impactTree.push(testTrace);
        
        // Add connection back to requirement
        impactTree[0].connections.push({
          id: `conn-req-test-${test.id}`,
          type: 'produces',
          target: `test-${test.id}`
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to trace test connections:', error);
    }

    // Calculate analytics
    const totalArtifacts = impactTree.length - 1; // Exclude the requirement itself
    const testNodes = impactTree.filter(node => node.type === 'test');
    const designNodes = impactTree.filter(node => node.type === 'design' || node.type === 'jama');
    const implementationNodes = impactTree.filter(node => node.type === 'code' || node.type === 'jira');
    
    const testCoverage = testNodes.length > 0 ? 100 : 0;
    const designCoverage = designNodes.length > 0 ? 100 : 0;
    const implementationCoverage = implementationNodes.length > 0 ? 100 : 0;
    const coveragePercentage = Math.round((testCoverage + designCoverage + implementationCoverage) / 3);
    
    // Traceability score based on connections and coverage
    const connectionScore = Math.min(100, (impactTree[0].connections.length / 5) * 100);
    const traceabilityScore = Math.round((coveragePercentage + connectionScore) / 2);

    const analytics = {
      totalArtifacts,
      coveragePercentage,
      testCoverage,
      designCoverage,
      implementationCoverage,
      traceabilityScore
    };

    const response: RequirementImpactData = {
      requirement: impactTree[0],
      impactTree,
      analytics
    };

    console.log(`✅ Successfully traced ${totalArtifacts} impact artifacts`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error tracing requirement impact:', error);
    return NextResponse.json(
      { error: 'Failed to trace requirement impact', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirementIds } = body;

    if (!Array.isArray(requirementIds) || requirementIds.length === 0) {
      return NextResponse.json(
        { error: 'Array of requirement IDs is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Batch tracing impact for ${requirementIds.length} requirements`);

    const batchResults = [];
    for (const requirementId of requirementIds) {
      try {
        // Reuse the GET logic for each requirement
        const url = new URL(`${request.url}?id=${requirementId}`);
        const getRequest = new NextRequest(url, { method: 'GET' });
        const result = await GET(getRequest);
        const data = await result.json();
        
        if (result.ok) {
          batchResults.push(data);
        } else {
          batchResults.push({
            requirementId,
            error: data.error
          });
        }
      } catch (error) {
        batchResults.push({
          requirementId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      results: batchResults,
      summary: {
        total: requirementIds.length,
        successful: batchResults.filter(r => !r.error).length,
        failed: batchResults.filter(r => r.error).length
      }
    });

  } catch (error) {
    console.error('❌ Error in batch impact tracing:', error);
    return NextResponse.json(
      { error: 'Failed to perform batch impact tracing', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}