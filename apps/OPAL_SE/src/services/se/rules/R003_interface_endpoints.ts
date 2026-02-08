/**
 * Rule R003: Interface Endpoints
 * 
 * Every interface must connect exactly two components.
 */

import { Rule, RuleContext, Violation } from '../../../types/se';
import { getNodesByFilter, getEdgesByFilter } from '../systemGraphService';

export const R003_InterfaceEndpoints: Rule = {
  id: 'R003',
  name: 'Interface Endpoints',
  description: 'Every interface must connect exactly two components',
  severity: 'warning',
  check: async (context: RuleContext): Promise<Violation[]> => {
    const violations: Violation[] = [];

    // Get all interfaces in scope
    const interfaces = await getNodesByFilter({
      project_id: context.project_id,
      type: 'Interface',
      ...(context.domain ? { source: context.domain } : {})
    });

    for (const iface of interfaces) {
      // Count edges with CONNECTS_TO relation type
      const connectsTo = await getEdgesByFilter({
        from_node_id: iface.id,
        relation_type: 'CONNECTS_TO'
      });

      const connectsFrom = await getEdgesByFilter({
        to_node_id: iface.id,
        relation_type: 'CONNECTS_TO'
      });

      const totalConnections = connectsTo.length + connectsFrom.length;

      if (totalConnections !== 2) {
        violations.push({
          rule_id: 'R003',
          severity: 'warning',
          message: `Interface ${iface.title} has ${totalConnections} connections instead of 2`,
          affected_nodes: [iface.id],
          details: {
            interface_id: iface.id,
            connection_count: totalConnections,
            expected: 2
          }
        });
      }
    }

    return violations;
  }
};