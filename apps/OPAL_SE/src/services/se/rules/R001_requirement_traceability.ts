/**
 * Rule R001: Requirement Traceability
 * 
 * Every L2 requirement must trace to at least one L3 requirement or test.
 */

import { Rule, RuleContext, Violation } from '../../../types/se';
import { getNodesByFilter, getEdgesByFilter } from '../systemGraphService';

export const R001_RequirementTraceability: Rule = {
  id: 'R001',
  name: 'Requirement Traceability',
  description: 'Every L2 requirement must trace to at least one L3 requirement or test',
  severity: 'error',
  check: async (context: RuleContext): Promise<Violation[]> => {
    const violations: Violation[] = [];

    // Get L2 requirements in scope
    const requirements = await getNodesByFilter({
      project_id: context.project_id,
      type: 'Requirement',
      ...(context.subsystem ? { subsystem: context.subsystem } : {})
    });

    const l2Requirements = requirements.filter(r => r.metadata?.level === 'L2');

    for (const req of l2Requirements) {
      // Check traces to L3 requirements
      const traceEdges = await getEdgesByFilter({
        from_node_id: req.id,
        relation_type: 'TRACES_TO'
      });

      const verifiesEdges = await getEdgesByFilter({
        from_node_id: req.id,
        relation_type: 'VERIFIED_BY'
      });

      if (traceEdges.length === 0 && verifiesEdges.length === 0) {
        violations.push({
          rule_id: 'R001',
          severity: 'error',
          message: `L2 requirement ${req.name} has no downstream traces or tests`,
          affected_nodes: [req.id],
          details: {
            requirement_id: req.id,
            level: 'L2'
          }
        });
      }
    }

    return violations;
  }
};