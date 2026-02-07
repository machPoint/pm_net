/**
 * Schema for getSystemSlice tool
 */

export type EntityId = string;

export interface Node {
  id: string;
  label: string;
  type: string;      // "system" | "subsystem" | "component" | "requirement" | ...
  metadata?: Record<string, any>;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  relation: string;  // "CONTAINS" | "SATISFIES" | "INTERFACES" | ...
  metadata?: Record<string, any>;
}

export interface SystemSlice {
  nodes: Node[];
  edges: Edge[];
}

export interface GetSystemSliceInput {
  entityIds: EntityId[];  // Required, non-empty
  radius?: number;        // Optional, default 1, minimum 0
  includeTypes?: string[]; // Optional; node types to include
}

export interface GetSystemSliceOutput {
  slice: SystemSlice;
  summary: string;
}

/**
 * Validate input parameters
 */
export function validateInput(input: GetSystemSliceInput): { valid: boolean; error?: string } {
  if (!input.entityIds || input.entityIds.length === 0) {
    return { valid: false, error: 'entityIds must be a non-empty array' };
  }

  if (input.radius !== undefined && input.radius < 0) {
    return { valid: false, error: 'radius must be non-negative' };
  }

  return { valid: true };
}
