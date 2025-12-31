/**
 * Reflection Types
 * Handles generated reflections and consequence depth scoring
 */

export interface ReflectionResponse {
  success: boolean;
  reflection: string;
  turn_number: number;          // 1-9
  is_final: boolean;
  remaining_turns: number;
  metadata: {
    session_id: string;
    decision_gravity_score?: number;
    consequence_depth_score: number;
    timestamp: string;
    session_complete?: boolean;
  };
  disclaimers: string[];
  guidance?: string;            // For initial snapshot
  closure_message?: string;     // For final turn
}

export interface ConsequenceDepthScore {
  score: number;                // 0.0-1.0
  dimensions: {
    emotional_specificity: number;  // Names specific feelings?
    concrete_reasoning: number;     // Tangible consequences?
    narrative_depth: number;        // Beyond surface reflection?
  };
  threshold: number;
  passed: boolean;
}

export interface ReflectionDisclaimers {
  non_predictive: string;
  non_advisory: string;
  single_future: string;
}

export const DEFAULT_DISCLAIMERS: ReflectionDisclaimers = {
  non_predictive: 'This reflection represents one possible perspective, not a prediction of what will happen.',
  non_advisory: 'This is not advice. It is a subjective reflection from a hypothetical future self.',
  single_future: 'All reflections in this session explore the same future context. No alternatives are generated.'
};

export interface ReflectionTurn {
  turn_number: number;
  turn_type: 'INITIAL_SNAPSHOT' | 'USER_QUESTION';
  user_question?: string;
  question_depth_score?: QuestionDepthScore;
  response_content: string;
  consequence_depth_score: ConsequenceDepthScore;
  timestamp: string;
}

// Import for type reference
import { QuestionDepthScore } from './question';