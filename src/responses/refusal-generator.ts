/**
 * Refusal Generator
 * Generates appropriate refusal responses for various rejection scenarios
 */

import { RefusalResponse, RefusalReason } from '../types/refusal';
import { DecisionGravityScore } from '../types/decision';
import { QuestionRejection } from '../types/question';
import { ConsequenceDepthScore } from '../types/reflection';

/**
 * Generate refusal for trivial decision (Decision Gravity Gate)
 */
export function generateDecisionRefusal(
  gravityScore: DecisionGravityScore
): RefusalResponse {
  const weakestDimension = getWeakestDimension(gravityScore.dimensions);
  
  return {
    refused: true,
    reason: 'trivial_decision',
    message: getDecisionRefusalMessage(gravityScore.score),
    guidance: getDecisionGuidance(weakestDimension),
    metadata: {
      gravity_score: gravityScore.score,
      threshold: gravityScore.threshold,
      dimensions: gravityScore.dimensions,
      weakest_dimension: weakestDimension
    }
  };
}

/**
 * Generate refusal for shallow question (Question Depth Gate)
 */
export function generateQuestionRefusal(
  rejection: QuestionRejection
): RefusalResponse {
  return {
    refused: true,
    reason: mapQuestionRejectionReason(rejection.reason),
    message: rejection.message,
    guidance: rejection.guidance,
    example_reframe: rejection.example_reframe,
    metadata: {
      depth_score: rejection.depth_score,
      threshold: rejection.threshold,
      rejection_type: rejection.reason
    }
  };
}

/**
 * Generate termination response for shallow output (Consequence Depth Gate)
 */
export function generateTerminationResponse(
  consequenceScore: ConsequenceDepthScore,
  sessionId: string
): RefusalResponse {
  const weakestDimension = getWeakestConsequenceDimension(consequenceScore.dimensions);
  
  return {
    refused: true,
    reason: 'shallow_response',
    message: getTerminationMessage(weakestDimension),
    guidance: "The session has ended. This is not a failure—it indicates that the reflective depth required could not be achieved for this particular exploration.",
    metadata: {
      session_id: sessionId,
      consequence_score: consequenceScore.score,
      threshold: consequenceScore.threshold,
      dimensions: consequenceScore.dimensions,
      terminated: true
    }
  };
}

/**
 * Generate refusal for forbidden content
 */
export function generateForbiddenContentRefusal(
  category: 'medical' | 'legal' | 'financial' | 'harm'
): RefusalResponse {
  const messages: Record<string, { message: string; guidance: string }> = {
    medical: {
      message: "This decision involves medical considerations that require professional guidance.",
      guidance: "Please consult with healthcare professionals for medical decisions. This instrument is not designed for health-related choices."
    },
    legal: {
      message: "This decision involves legal matters that require professional counsel.",
      guidance: "Please consult with legal professionals for decisions with legal implications. This instrument cannot provide legal guidance."
    },
    financial: {
      message: "This decision involves significant financial considerations that require professional advice.",
      guidance: "Please consult with financial advisors for major financial decisions. This instrument is not designed for financial planning."
    },
    harm: {
      message: "This input contains content that cannot be processed.",
      guidance: "If you're experiencing thoughts of self-harm, please reach out to a mental health professional or crisis helpline."
    }
  };
  
  const content = messages[category];
  
  return {
    refused: true,
    reason: 'forbidden_content',
    message: content.message,
    guidance: content.guidance,
    metadata: {
      category: category
    }
  };
}

/**
 * Generate refusal for session already terminated
 */
export function generateSessionTerminatedRefusal(
  sessionId: string
): RefusalResponse {
  return {
    refused: true,
    reason: 'session_terminated',
    message: "This reflection session has ended.",
    guidance: "The session reached its natural conclusion or was terminated due to depth requirements. You may start a new session with a different decision.",
    metadata: {
      session_id: sessionId
    }
  };
}

/**
 * Generate refusal for max turns reached
 */
export function generateMaxTurnsRefusal(
  sessionId: string
): RefusalResponse {
  return {
    refused: true,
    reason: 'max_turns_reached',
    message: "This reflection arc is complete.",
    guidance: "You have explored this future context through all 9 turns. The instrument has fulfilled its purpose. What you do with these reflections is yours to decide.",
    metadata: {
      session_id: sessionId,
      turns_completed: 9
    }
  };
}

// --- Helper Functions ---

function getWeakestDimension(dimensions: DecisionGravityScore['dimensions']): string {
  const entries = Object.entries(dimensions);
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

function getWeakestConsequenceDimension(dimensions: ConsequenceDepthScore['dimensions']): string {
  const entries = Object.entries(dimensions);
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

function getDecisionRefusalMessage(score: number): string {
  if (score < 0.2) {
    return "This decision doesn't carry the weight that warrants deep reflection through this instrument. The Future Context Snapshot is designed for irreversible, life-altering decisions.";
  }
  if (score < 0.35) {
    return "This decision, while meaningful, may not require the depth of reflection this instrument provides. Consider whether this choice will significantly alter your life trajectory.";
  }
  return "This decision is approaching the threshold for meaningful reflection, but may benefit from being framed with more clarity about its long-term implications.";
}

function getDecisionGuidance(weakestDimension: string): string {
  const guidance: Record<string, string> = {
    irreversibility: "Consider: Can this decision be undone? What makes it permanent? Frame your decision in terms of what cannot be reversed.",
    life_impact: "Consider: How many areas of your life will this affect? Career, relationships, identity, finances? Articulate the breadth of impact.",
    temporal_consequence: "Consider: How far into the future will this decision's effects extend? Frame the time horizon explicitly."
  };
  return guidance[weakestDimension] || "Try framing your decision in terms of its permanence, breadth of impact, and long-term consequences.";
}

function getTerminationMessage(weakestDimension: string): string {
  const messages: Record<string, string> = {
    emotional_specificity: "The reflection could not achieve sufficient emotional depth to provide meaningful insight.",
    concrete_reasoning: "The reflection remained too abstract to ground the experience in tangible reality.",
    narrative_depth: "The reflection did not reach the narrative depth required for genuine self-examination."
  };
  return messages[weakestDimension] || "The reflection did not meet the depth threshold required for this instrument.";
}

function mapQuestionRejectionReason(reason: QuestionRejection['reason']): RefusalReason {
  const mapping: Record<QuestionRejection['reason'], RefusalReason> = {
    'advice_seeking': 'advice_seeking_question',
    'predictive': 'predictive_question',
    'leading': 'leading_question',
    'too_generic': 'generic_question',
    'lacks_depth': 'shallow_question'
  };
  return mapping[reason] || 'shallow_question';
}
