/**
 * Rule R002: Safety-Critical Verification
 * 
 * Every requirement marked safety-critical must have at least one test.
 */

import { Rule, RuleContext, Violation } from '../../../types/se';
import { getNodesByFilter, getEdgesByFilter } from '../systemGraphService';

export const R002_SafetyCriticalVerification: Rule = {
  id: 'R002',
  name: 'Safety-Critical Verification',
  description: 'Every requirement marked safety-critical must have at least one test',
  severity: 'error',
  check: async (context: RuleContext): Promise<Violation[]> => {
    const violations: Violation[] = [];

    // Get all requirements in scope
    const requirements = await getNodesByFilter({
      project_id: context.project_id,
      type: 'Requirement',
      ...(context.subsystem ? { subsystem: context.subsystem } : {})
    });

    // Filter to safety-critical requirements
    const safetyCritical = requirements.filter(
      r => r.metadata?.safety_critical === true
    );

    for (const req of safetyCritical) {
      // Check for VERIFIED_BY edges to TestCase nodes
      const verifiesEdges = await getEdgesByFilter({
        from_node_id: req.id,
        relation_type: 'VERIFIED_BY'
      });

      if (verifiesEdges.length === 0) {
        violations.push({
          rule_id: 'R002',
          severity: 'error',
          message: `Safety-critical requirement ${req.name} has no test verification`,
          affected_nodes: [req.id],
          details: {
            requirement_id: req.id,
            safety_critical: true
          }
        });
      }
    }

    return violations;
  }
};