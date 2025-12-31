/**
 * Decision Input Types
 * Handles user decision submission and gravity scoring
 */

export interface DecisionInput {
  decision_text: string;        // Required: 1-500 characters
  context?: string;             // Optional context
  session_id?: string;          // System-generated if not provided
}

export interface DecisionGravityScore {
  score: number;                // 0.0-1.0
  dimensions: {
    irreversibility: number;    // Can this decision be undone?
    life_impact: number;        // How many life domains affected?
    temporal_consequence: number; // How far do effects extend?
  };
  threshold: number;
  passed: boolean;
}

export interface DecisionValidationResult {
  is_valid: boolean;
  session_id: string;
  rejection_reason?: DecisionRejectionReason;
  sanitized_input?: string;
  gravity_score?: DecisionGravityScore;
}

export enum DecisionRejectionReason {
  EMPTY_INPUT = 'EMPTY_INPUT',
  EXCEEDS_LENGTH = 'EXCEEDS_LENGTH',
  FORBIDDEN_MEDICAL = 'FORBIDDEN_MEDICAL',
  FORBIDDEN_LEGAL = 'FORBIDDEN_LEGAL',
  FORBIDDEN_FINANCIAL = 'FORBIDDEN_FINANCIAL',
  FORBIDDEN_HARM = 'FORBIDDEN_HARM',
  PROMPT_INJECTION = 'PROMPT_INJECTION',
  INSUFFICIENT_GRAVITY = 'INSUFFICIENT_GRAVITY'
}
