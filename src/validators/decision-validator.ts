/**
 * Decision Input Validator
 * Validates and sanitizes user decision input before processing
 * 
 * Validation Steps:
 * 1. Schema validation (non-empty, ≤500 chars)
 * 2. Forbidden pattern check (medical, legal, financial, harm)
 * 3. Prompt injection sanitization
 * 
 * Note: Gravity scoring is handled separately by the ML gate
 */

import { v4 as uuidv4 } from 'uuid';
import {
  DecisionInput,
  DecisionValidationResult,
  DecisionRejectionReason
} from '../types/decision';
import {
  checkForbiddenInputPatterns,
  ForbiddenInputCategory,
  FORBIDDEN_INPUT_MESSAGES
} from '../patterns/forbidden-input';

// Constants
const MAX_DECISION_LENGTH = 500;
const MIN_DECISION_LENGTH = 1;

/**
 * Prompt injection patterns to detect and sanitize
 */
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)\s+(instructions?|prompts?)/i,
  /disregard\s+(previous|all|above)/i,
  /forget\s+(everything|all|previous)/i,
  /you\s+are\s+now/i,
  /act\s+as\s+(if|a|an)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /system\s*:\s*/i,
  /assistant\s*:\s*/i,
  /user\s*:\s*/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /```\s*(system|assistant|user)/i
];

/**
 * Map forbidden input category to rejection reason
 */
const CATEGORY_TO_REJECTION: Record<ForbiddenInputCategory, DecisionRejectionReason> = {
  medical: DecisionRejectionReason.FORBIDDEN_MEDICAL,
  legal: DecisionRejectionReason.FORBIDDEN_LEGAL,
  financial: DecisionRejectionReason.FORBIDDEN_FINANCIAL,
  harm: DecisionRejectionReason.FORBIDDEN_HARM,
  selfHarm: DecisionRejectionReason.FORBIDDEN_HARM
};


/**
 * Check if input contains prompt injection attempts
 */
function detectPromptInjection(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Sanitize input text to prevent prompt injection
 * Removes or escapes potentially dangerous patterns
 */
function sanitizeInput(text: string): string {
  let sanitized = text;
  
  // Remove common injection delimiters
  sanitized = sanitized.replace(/```/g, '');
  sanitized = sanitized.replace(/<\|[^|]+\|>/g, '');
  sanitized = sanitized.replace(/\[INST\]|\[\/INST\]/gi, '');
  
  // Escape special characters that could be used for injection
  sanitized = sanitized.replace(/[<>]/g, '');
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * Validate decision input schema
 */
function validateSchema(input: DecisionInput): {
  isValid: boolean;
  reason?: DecisionRejectionReason;
} {
  const text = input.decision_text?.trim() || '';
  
  // Check for empty input
  if (text.length < MIN_DECISION_LENGTH) {
    return {
      isValid: false,
      reason: DecisionRejectionReason.EMPTY_INPUT
    };
  }
  
  // Check for length limit
  if (text.length > MAX_DECISION_LENGTH) {
    return {
      isValid: false,
      reason: DecisionRejectionReason.EXCEEDS_LENGTH
    };
  }
  
  return { isValid: true };
}

/**
 * Main validation function
 * Validates decision input and returns validation result
 */
export function validateDecisionInput(input: DecisionInput): DecisionValidationResult {
  const sessionId = input.session_id || uuidv4();
  const text = input.decision_text?.trim() || '';
  
  // Step 1: Schema validation
  const schemaResult = validateSchema(input);
  if (!schemaResult.isValid) {
    return {
      is_valid: false,
      session_id: sessionId,
      rejection_reason: schemaResult.reason
    };
  }
  
  // Step 2: Prompt injection detection
  if (detectPromptInjection(text)) {
    return {
      is_valid: false,
      session_id: sessionId,
      rejection_reason: DecisionRejectionReason.PROMPT_INJECTION
    };
  }
  
  // Step 3: Forbidden pattern check
  const forbiddenCheck = checkForbiddenInputPatterns(text);
  if (forbiddenCheck.hasForbiddenContent && forbiddenCheck.category) {
    return {
      is_valid: false,
      session_id: sessionId,
      rejection_reason: CATEGORY_TO_REJECTION[forbiddenCheck.category]
    };
  }
  
  // Step 4: Sanitize input
  const sanitizedInput = sanitizeInput(text);
  
  // Validation passed
  return {
    is_valid: true,
    session_id: sessionId,
    sanitized_input: sanitizedInput
  };
}

/**
 * Get user-friendly error message for rejection reason
 */
export function getDecisionRejectionMessage(reason: DecisionRejectionReason): string {
  switch (reason) {
    case DecisionRejectionReason.EMPTY_INPUT:
      return 'Please describe the decision you are contemplating.';
    
    case DecisionRejectionReason.EXCEEDS_LENGTH:
      return `Please keep your decision description under ${MAX_DECISION_LENGTH} characters.`;
    
    case DecisionRejectionReason.FORBIDDEN_MEDICAL:
      return FORBIDDEN_INPUT_MESSAGES.medical;
    
    case DecisionRejectionReason.FORBIDDEN_LEGAL:
      return FORBIDDEN_INPUT_MESSAGES.legal;
    
    case DecisionRejectionReason.FORBIDDEN_FINANCIAL:
      return FORBIDDEN_INPUT_MESSAGES.financial;
    
    case DecisionRejectionReason.FORBIDDEN_HARM:
      return FORBIDDEN_INPUT_MESSAGES.harm;
    
    case DecisionRejectionReason.PROMPT_INJECTION:
      return 'Your input could not be processed. Please rephrase your decision.';
    
    case DecisionRejectionReason.INSUFFICIENT_GRAVITY:
      return 'This system is designed for significant, irreversible decisions. The decision you described may not benefit from this type of reflection.';
    
    default:
      return 'Your input could not be processed. Please try again.';
  }
}

/**
 * Check if rejection requires crisis resources
 */
export function requiresCrisisResources(reason: DecisionRejectionReason): boolean {
  return reason === DecisionRejectionReason.FORBIDDEN_HARM;
}
