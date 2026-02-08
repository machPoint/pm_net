/**
 * Rule Engine Service
 * 
 * Framework for defining and executing systems engineering consistency rules.
 * Rules check the system graph for violations and gaps.
 */

import logger from '../../logger';
import {
  Rule,
  RuleContext,
  Violation,
  RuleSummary,
  RuleSeverity,
  RunConsistencyChecksParams,
  RunConsistencyChecksResult
} from '../../types/se';

// Import individual rules
import { R001_RequirementTraceability } from './rules/R001_requirement_traceability';
import { R002_SafetyCriticalVerification } from './rules/R002_safety_critical_verification';
import { R003_InterfaceEndpoints } from './rules/R003_interface_endpoints';

// ============================================================================
// Rule Registry
// ============================================================================

/**
 * Global rule registry
 */
const RULE_REGISTRY = new Map<string, Rule>();

/**
 * Register a rule
 */
export function registerRule(rule: Rule): void {
  RULE_REGISTRY.set(rule.id, rule);
  logger.info(`Registered rule: ${rule.id} - ${rule.name}`);
}

/**
 * Get a rule by ID
 */
export function getRule(rule_id: string): Rule | undefined {
  return RULE_REGISTRY.get(rule_id);
}

/**
 * Get all registered rules
 */
export function getAllRules(): Rule[] {
  return Array.from(RULE_REGISTRY.values());
}

/**
 * Initialize rule engine with default rules
 */
export function initializeRuleEngine(): void {
  logger.info('Initializing rule engine...');
  
  // Register all default rules
  registerRule(R001_RequirementTraceability);
  registerRule(R002_SafetyCriticalVerification);
  registerRule(R003_InterfaceEndpoints);
  
  logger.info(`Rule engine initialized with ${RULE_REGISTRY.size} rules`);
}

// ============================================================================
// Rule Execution
// ============================================================================

/**
 * Run a single rule
 */
export async function runRule(
  rule_id: string,
  context: RuleContext
): Promise<Violation[]> {
  try {
    const rule = getRule(rule_id);
    
    if (!rule) {
      throw new Error(`Rule not found: ${rule_id}`);
    }
    
    logger.info(`Running rule: ${rule.id} - ${rule.name}`);
    const violations = await rule.check(context);
    
    logger.info(`Rule ${rule.id} found ${violations.length} violations`);
    return violations;
  } catch (error: any) {
    logger.error(`Error running rule ${rule_id}:`, error);
    throw new Error(`Failed to run rule ${rule_id}: ${error.message}`);
  }
}

/**
 * Run multiple rules
 */
export async function runRules(
  project_id: string,
  scope?: { domain?: string; rule_ids?: string[] }
): Promise<Violation[]> {
  try {
    const context: RuleContext = {
      project_id,
      domain: scope?.domain
    };
    
    // Determine which rules to run
    let rulesToRun: Rule[];
    
    if (scope?.rule_ids && scope.rule_ids.length > 0) {
      // Run specific rules
      rulesToRun = scope.rule_ids
        .map(id => getRule(id))
        .filter(rule => rule !== undefined) as Rule[];
    } else {
      // Run all rules
      rulesToRun = getAllRules();
    }
    
    logger.info(`Running ${rulesToRun.length} rules for project ${project_id}`);
    
    // Execute all rules
    const allViolations: Violation[] = [];
    
    for (const rule of rulesToRun) {
      try {
        const violations = await rule.check(context);
        allViolations.push(...violations);
      } catch (error: any) {
        logger.error(`Error in rule ${rule.id}:`, error);
        // Continue with other rules even if one fails
      }
    }
    
    logger.info(`Total violations found: ${allViolations.length}`);
    return allViolations;
  } catch (error: any) {
    logger.error('Error running rules:', error);
    throw new Error(`Failed to run rules: ${error.message}`);
  }
}

// ============================================================================
// Rule Summary & Analysis
// ============================================================================

/**
 * Compute summary statistics for violations
 */
export function computeViolationSummary(violations: Violation[]): RuleSummary {
  const summary: RuleSummary = {
    total_violations: violations.length,
    by_severity: {
      error: 0,
      warning: 0,
      info: 0
    },
    by_rule: {}
  };
  
  for (const violation of violations) {
    // Count by severity
    summary.by_severity[violation.severity]++;
    
    // Count by rule
    if (!summary.by_rule[violation.rule_id]) {
      summary.by_rule[violation.rule_id] = 0;
    }
    summary.by_rule[violation.rule_id]++;
  }
  
  return summary;
}

/**
 * Filter violations by severity
 */
export function filterViolationsBySeverity(
  violations: Violation[],
  severity: RuleSeverity
): Violation[] {
  return violations.filter(v => v.severity === severity);
}

/**
 * Filter violations by rule
 */
export function filterViolationsByRule(
  violations: Violation[],
  rule_id: string
): Violation[] {
  return violations.filter(v => v.rule_id === rule_id);
}

/**
 * Get critical violations (errors only)
 */
export function getCriticalViolations(violations: Violation[]): Violation[] {
  return filterViolationsBySeverity(violations, 'error');
}

// ============================================================================
// MCP Tool: runConsistencyChecks
// ============================================================================

/**
 * Run consistency checks and return formatted results
 * This is the MCP tool implementation
 */
export async function runConsistencyChecks(
  params: RunConsistencyChecksParams
): Promise<RunConsistencyChecksResult> {
  try {
    logger.info(`Running consistency checks for project ${params.project_id}`);
    
    // Run rules
    const violations = await runRules(params.project_id, {
      domain: params.domain,
      rule_ids: params.rule_ids
    });
    
    // Compute summary
    const summary = computeViolationSummary(violations);
    
    logger.info(`Consistency checks complete: ${summary.total_violations} violations (${summary.by_severity.error} errors, ${summary.by_severity.warning} warnings)`);
    
    return {
      violations,
      summary
    };
  } catch (error: any) {
    logger.error('Error in runConsistencyChecks:', error);
    throw new Error(`Failed to run consistency checks: ${error.message}`);
  }
}

// ============================================================================
// Rule Health Monitoring
// ============================================================================

/**
 * Get rule execution statistics
 */
export function getRuleHealthMetrics(project_id: string): {
  rules_registered: number;
  rules_available: Rule[];
  last_run?: Date;
} {
  return {
    rules_registered: RULE_REGISTRY.size,
    rules_available: getAllRules()
  };
}

/**
 * Validate rule configuration
 */
export function validateRules(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  for (const rule of getAllRules()) {
    // Check required fields
    if (!rule.id) {
      errors.push(`Rule missing ID`);
    }
    if (!rule.name) {
      errors.push(`Rule ${rule.id} missing name`);
    }
    if (!rule.check || typeof rule.check !== 'function') {
      errors.push(`Rule ${rule.id} missing or invalid check function`);
    }
    if (!rule.severity || !['error', 'warning', 'info'].includes(rule.severity)) {
      errors.push(`Rule ${rule.id} has invalid severity: ${rule.severity}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
