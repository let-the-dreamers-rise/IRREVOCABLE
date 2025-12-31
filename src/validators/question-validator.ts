/**
 * Question Validator
 * Validates user questions during the reflection arc (Turns 2-9)
 * 
 * Validation Steps:
 * 1. Schema validation (non-empty, ≤200 chars)
 * 2. Forbidden question pattern check (advice-seeking, predictive, leading)
 * 3. Prepare for ML depth evaluation
 * 
 * Note: Depth scoring is handled separately by the ML gate
 */

import {
  UserQuestion,
  QuestionRejectionReason,
  QUESTION_REJECTION_GUIDANCE
} from '../types/question';
import {
  checkForbiddenQuestionPatterns,
  ForbiddenQuestionCategory
} from '../patterns/forbidden-questions';

// Constants
const MAX_QUESTION_LENGTH = 200;
const MIN_QUESTION_LENGTH = 5;
const MIN_WORD_COUNT = 3;

/**
 * Question validation result
 */
export interface QuestionValidationResult {
  is_valid: boolean;
  session_id?: string;
  turn_number?: number;
  rejection_reason?: QuestionRejectionReason;
  guidance?: string;
  sanitized_question?: string;
}

/**
 * Map forbidden question category to rejection reason
 */
const CATEGORY_TO_REJECTION: Record<ForbiddenQuestionCategory, QuestionRejectionReason> = {
  adviceSeeking: QuestionRejectionReason.ADVICE_SEEKING,
  predictive: QuestionRejectionReason.PREDICTIVE_FRAMING,
  leading: QuestionRejectionReason.LEADING_QUESTION,
  binary: QuestionRejectionReason.TOO_GENERIC,
  comparison: QuestionRejectionReason.FORBIDDEN_CONTENT
};


/**
 * Sanitize question text
 */
function sanitizeQuestion(text: string): string {
  let sanitized = text;
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Ensure ends with question mark if it's a question
  if (!sanitized.endsWith('?') && !sanitized.endsWith('.')) {
    sanitized += '?';
  }
  
  return sanitized;
}

/**
 * Validate question schema
 */
function validateSchema(question: UserQuestion): {
  isValid: boolean;
  reason?: QuestionRejectionReason;
} {
  const text = question.question_text?.trim() || '';
  
  // Check for empty/too short input
  if (text.length < MIN_QUESTION_LENGTH) {
    return {
      isValid: false,
      reason: QuestionRejectionReason.TOO_SHORT
    };
  }
  
  // Check word count
  const wordCount = text.split(/\s+/).length;
  if (wordCount < MIN_WORD_COUNT) {
    return {
      isValid: false,
      reason: QuestionRejectionReason.TOO_SHORT
    };
  }
  
  // Check for length limit
  if (text.length > MAX_QUESTION_LENGTH) {
    return {
      isValid: false,
      reason: QuestionRejectionReason.TOO_GENERIC // Too long often means unfocused
    };
  }
  
  // Validate turn number
  if (question.turn_number !== undefined && (question.turn_number < 2 || question.turn_number > 9)) {
    return {
      isValid: false,
      reason: QuestionRejectionReason.FORBIDDEN_CONTENT
    };
  }
  
  return { isValid: true };
}

/**
 * Main validation function
 * Validates question input and returns validation result
 */
export function validateQuestion(question: UserQuestion): QuestionValidationResult {
  const text = question.question_text?.trim() || '';
  
  // Step 1: Schema validation
  const schemaResult = validateSchema(question);
  if (!schemaResult.isValid && schemaResult.reason) {
    return {
      is_valid: false,
      session_id: question.session_id,
      turn_number: question.turn_number,
      rejection_reason: schemaResult.reason,
      guidance: QUESTION_REJECTION_GUIDANCE[schemaResult.reason]
    };
  }
  
  // Step 2: Forbidden pattern check
  const forbiddenCheck = checkForbiddenQuestionPatterns(text);
  if (forbiddenCheck.isRejected && forbiddenCheck.category) {
    const rejectionReason = CATEGORY_TO_REJECTION[forbiddenCheck.category];
    return {
      is_valid: false,
      session_id: question.session_id,
      turn_number: question.turn_number,
      rejection_reason: rejectionReason,
      guidance: forbiddenCheck.guidance || QUESTION_REJECTION_GUIDANCE[rejectionReason]
    };
  }
  
  // Step 3: Sanitize question
  const sanitizedQuestion = sanitizeQuestion(text);
  
  // Validation passed - ready for ML depth evaluation
  return {
    is_valid: true,
    session_id: question.session_id,
    turn_number: question.turn_number,
    sanitized_question: sanitizedQuestion
  };
}

/**
 * Get user-friendly error message for rejection reason
 */
export function getQuestionRejectionMessage(reason: QuestionRejectionReason): string {
  return QUESTION_REJECTION_GUIDANCE[reason] || 
    'Your question could not be processed. Please try rephrasing.';
}

/**
 * Check if question is likely to pass ML depth gate
 * This is a heuristic pre-check, not a replacement for ML scoring
 */
export function estimateQuestionQuality(text: string): {
  likelyToPass: boolean;
  suggestions: string[];
} {
  const suggestions: string[] = [];
  const wordCount = text.split(/\s+/).length;
  
  // Check for hedging language (good sign)
  const hasHedging = /\b(might|could|may|perhaps|wonder)\b/i.test(text);
  if (!hasHedging) {
    suggestions.push('Consider using hedging language like "might" or "could"');
  }
  
  // Check for introspective focus (good sign)
  const hasIntrospective = /\b(feel|think|notice|sense|experience|discover)\b/i.test(text);
  if (!hasIntrospective) {
    suggestions.push('Focus on internal experience (feelings, thoughts, discoveries)');
  }
  
  // Check for specificity (good sign)
  const hasSpecificity = wordCount >= 8;
  if (!hasSpecificity) {
    suggestions.push('Add more specificity to your question');
  }
  
  // Estimate likelihood
  const positiveSignals = [hasHedging, hasIntrospective, hasSpecificity].filter(Boolean).length;
  
  return {
    likelyToPass: positiveSignals >= 2,
    suggestions
  };
}
