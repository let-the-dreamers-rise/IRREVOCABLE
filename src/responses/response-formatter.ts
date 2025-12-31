/**
 * Response Formatter
 * Attaches metadata, disclaimers, and formats final responses
 */

import { ReflectionResponse, ConsequenceDepthScore } from '../types/reflection';
import { SessionState } from '../types/session';

// Standard disclaimers (always attached)
const DISCLAIMERS = {
  non_predictive: "This reflection represents one possible internal experience, not a prediction of what will happen.",
  non_advisory: "This is not advice. It is a mirror for self-reflection.",
  uncertainty: "All statements are possibilities, not certainties."
};

/**
 * Format a successful reflection response
 */
export function formatReflectionResponse(
  reflection: string,
  session: SessionState,
  consequenceScore: ConsequenceDepthScore
): ReflectionResponse {
  const isFinal = session.current_turn >= session.max_turns;
  
  return {
    success: true,
    reflection: reflection,
    turn_number: session.current_turn,
    is_final: isFinal,
    remaining_turns: Math.max(0, session.max_turns - session.current_turn),
    metadata: {
      session_id: session.session_id,
      consequence_depth_score: consequenceScore.score,
      timestamp: new Date().toISOString()
    },
    disclaimers: [
      DISCLAIMERS.non_predictive,
      DISCLAIMERS.non_advisory
    ]
  };
}

/**
 * Format the initial snapshot response (Turn 1)
 */
export function formatInitialSnapshotResponse(
  reflection: string,
  session: SessionState,
  consequenceScore: ConsequenceDepthScore,
  gravityScore: number
): ReflectionResponse {
  return {
    success: true,
    reflection: reflection,
    turn_number: 1,
    is_final: false,
    remaining_turns: session.max_turns - 1,
    metadata: {
      session_id: session.session_id,
      decision_gravity_score: gravityScore,
      consequence_depth_score: consequenceScore.score,
      timestamp: new Date().toISOString()
    },
    disclaimers: [
      DISCLAIMERS.non_predictive,
      DISCLAIMERS.non_advisory,
      DISCLAIMERS.uncertainty
    ],
    guidance: "You may now ask questions to explore this future context. Questions should probe your internal experience—feelings, tensions, identity shifts—not seek advice or predictions."
  };
}

/**
 * Format the final turn response (Turn 9)
 */
export function formatFinalResponse(
  reflection: string,
  session: SessionState,
  consequenceScore: ConsequenceDepthScore
): ReflectionResponse {
  return {
    success: true,
    reflection: reflection,
    turn_number: session.max_turns,
    is_final: true,
    remaining_turns: 0,
    metadata: {
      session_id: session.session_id,
      consequence_depth_score: consequenceScore.score,
      timestamp: new Date().toISOString(),
      session_complete: true
    },
    disclaimers: [
      DISCLAIMERS.non_predictive,
      DISCLAIMERS.non_advisory
    ],
    closure_message: "This reflection arc is now complete. The future context has been fully explored within the bounds of this instrument. What you do with these reflections is entirely yours to decide."
  };
}

/**
 * Format session metrics for internal logging (not shown to user)
 */
export function formatSessionMetrics(session: SessionState): {
  session_id: string;
  completed: boolean;
  turns_completed: number;
  decision_gravity: number | null;
  avg_question_depth: number | null;
  avg_consequence_depth: number | null;
  question_rejection_rate: number;
  abandonment_turn: number | null;
} {
  const metrics = session.silent_metrics;
  
  const avgQuestionDepth = metrics.question_depth_scores.length > 0
    ? metrics.question_depth_scores.reduce((a, b) => a + b, 0) / metrics.question_depth_scores.length
    : null;
    
  const avgConsequenceDepth = metrics.consequence_depth_scores.length > 0
    ? metrics.consequence_depth_scores.reduce((a, b) => a + b, 0) / metrics.consequence_depth_scores.length
    : null;
    
  const totalQuestionAttempts = metrics.question_depth_scores.length + metrics.question_rejection_count;
  const rejectionRate = totalQuestionAttempts > 0
    ? metrics.question_rejection_count / totalQuestionAttempts
    : 0;
  
  return {
    session_id: session.session_id,
    completed: session.status === 'completed',
    turns_completed: session.current_turn,
    decision_gravity: metrics.decision_gravity_score,
    avg_question_depth: avgQuestionDepth ? Math.round(avgQuestionDepth * 100) / 100 : null,
    avg_consequence_depth: avgConsequenceDepth ? Math.round(avgConsequenceDepth * 100) / 100 : null,
    question_rejection_rate: Math.round(rejectionRate * 100) / 100,
    abandonment_turn: metrics.abandonment_turn
  };
}

export { DISCLAIMERS };
