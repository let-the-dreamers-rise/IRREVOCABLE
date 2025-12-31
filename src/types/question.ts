/**
 * Question Types
 * Handles user question submission and depth scoring
 */

export interface UserQuestion {
  question_text: string;        // Required: 1-200 characters
  session_id?: string;          // Required: must match active session
  turn_number?: number;         // 2-9 (Turn 1 is Initial Snapshot)
}

export interface QuestionDepthScore {
  score: number;                // 0.0-1.0
  dimensions: {
    specificity: number;        // Concrete vs. vague
    introspective_depth: number; // Probes internal experience?
    non_leading: number;        // Avoids advice/prediction seeking?
  };
  threshold: number;
  passed: boolean;
}

export interface QuestionRejection {
  rejected: boolean;
  reason: 'advice_seeking' | 'predictive' | 'leading' | 'too_generic' | 'lacks_depth';
  message: string;
  guidance: string;
  example_reframe: string;
  depth_score: number;
  threshold: number;
}

export enum QuestionRejectionReason {
  TOO_GENERIC = 'TOO_GENERIC',
  ADVICE_SEEKING = 'ADVICE_SEEKING',
  PREDICTIVE_FRAMING = 'PREDICTIVE_FRAMING',
  LEADING_QUESTION = 'LEADING_QUESTION',
  TOO_SHORT = 'TOO_SHORT',
  FORBIDDEN_CONTENT = 'FORBIDDEN_CONTENT'
}

export const QUESTION_REJECTION_GUIDANCE: Record<QuestionRejectionReason, string> = {
  [QuestionRejectionReason.TOO_GENERIC]: 
    'Your question is too broad. Try asking about a specific aspect of daily life, relationships, or identity in this future.',
  [QuestionRejectionReason.ADVICE_SEEKING]: 
    'This question seeks advice. Instead, ask how your future self might feel or what they might notice.',
  [QuestionRejectionReason.PREDICTIVE_FRAMING]: 
    'This question asks for predictions. Reframe to explore subjective experience rather than outcomes.',
  [QuestionRejectionReason.LEADING_QUESTION]: 
    'This question assumes an answer. Ask an open question about your future self\'s inner experience.',
  [QuestionRejectionReason.TOO_SHORT]: 
    'Your question needs more specificity. What particular dimension of this future are you curious about?',
  [QuestionRejectionReason.FORBIDDEN_CONTENT]: 
    'This question touches on topics outside the system\'s scope. Focus on personal reflection.'
};
