/**
 * Refusal Types
 * Handles system refusals and rejections
 */

export interface RefusalResponse {
  refused: boolean;
  reason: RefusalReason;
  message: string;
  guidance?: string;
  example_reframe?: string;       // For question rejections
  metadata?: Record<string, any>;
}

export type RefusalReason =
  | 'trivial_decision'            // Decision Gravity Gate
  | 'forbidden_content'           // Medical, legal, financial, harm
  | 'advice_seeking_question'     // Question seeks advice
  | 'predictive_question'         // Question seeks prediction
  | 'leading_question'            // Question contains assumption
  | 'generic_question'            // Question too vague
  | 'shallow_question'            // Question lacks depth
  | 'shallow_response'            // Generated response too shallow
  | 'session_terminated'          // Session already ended
  | 'max_turns_reached'           // All 9 turns completed
  | 'validation_failed'           // Schema validation
  | 'system_error';               // Technical failure

export interface ResourceLink {
  name: string;
  url?: string;
  phone?: string;
  text_line?: string;
}

export const CRISIS_RESOURCES: ResourceLink[] = [
  { 
    name: 'National Suicide Prevention Lifeline', 
    url: 'https://988lifeline.org', 
    phone: '988' 
  },
  { 
    name: 'Crisis Text Line', 
    text_line: 'HOME to 741741' 
  }
];
