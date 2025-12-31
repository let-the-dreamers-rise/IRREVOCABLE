/**
 * Session Controller
 * Manages session state, turn tracking, coherence anchors, and hard termination
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SessionState,
  CoherenceAnchors,
  SilentMetrics,
  TurnData,
  SessionStatus
} from '../types/session';

// Maximum turns allowed (hard termination after Turn 9)
const MAX_TURNS = 9;

// In-memory session store (for MVP - would be Redis/DB in production)
const sessions = new Map<string, SessionState>();

/**
 * Create a new session
 */
export function createSession(): SessionState {
  const sessionId = uuidv4();
  const now = new Date().toISOString();
  
  const session: SessionState = {
    session_id: sessionId,
    status: 'active',
    current_turn: 0,
    max_turns: MAX_TURNS,
    created_at: now,
    updated_at: now,
    coherence_anchors: null,
    turns: [],
    silent_metrics: {
      decision_gravity_score: null,
      question_depth_scores: [],
      consequence_depth_scores: [],
      question_rejection_count: 0,
      abandonment_turn: null
    }
  };
  
  sessions.set(sessionId, session);
  return session;
}

/**
 * Get session by ID
 */
export function getSession(sessionId: string): SessionState | null {
  return sessions.get(sessionId) || null;
}

/**
 * Check if session can accept more turns
 */
export function canContinue(session: SessionState): boolean {
  return session.status === 'active' && session.current_turn < MAX_TURNS;
}

/**
 * Check if this is the initial turn (Turn 1)
 */
export function isInitialTurn(session: SessionState): boolean {
  return session.current_turn === 0;
}

/**
 * Check if this is the final turn (Turn 9)
 */
export function isFinalTurn(session: SessionState): boolean {
  return session.current_turn === MAX_TURNS - 1;
}

/**
 * Advance to next turn
 */
export function advanceTurn(session: SessionState): number {
  if (!canContinue(session)) {
    throw new Error('Session cannot continue - already terminated or at max turns');
  }
  
  session.current_turn += 1;
  session.updated_at = new Date().toISOString();
  
  // Check for hard termination
  if (session.current_turn >= MAX_TURNS) {
    session.status = 'completed';
  }
  
  return session.current_turn;
}

/**
 * Record turn data
 */
export function recordTurn(
  session: SessionState,
  turnData: Omit<TurnData, 'turn_number' | 'timestamp'>
): void {
  const turn: TurnData = {
    ...turnData,
    turn_number: session.current_turn,
    timestamp: new Date().toISOString()
  };
  
  session.turns.push(turn);
  session.updated_at = new Date().toISOString();
}

/**
 * Extract coherence anchors from initial snapshot (Turn 1)
 * These anchors maintain narrative continuity without storing raw user data
 */
export function extractCoherenceAnchors(
  decisionText: string,
  initialReflection: string
): CoherenceAnchors {
  // Extract life tensions (themes of conflict/uncertainty)
  const lifeTensions = extractLifeTensions(initialReflection);
  
  // Extract identity markers (self-concept elements)
  const identityMarkers = extractIdentityMarkers(initialReflection);
  
  // Determine temporal frame
  const temporalFrame = extractTemporalFrame(decisionText, initialReflection);
  
  // Distill decision essence (abstract, no raw text)
  const decisionEssence = extractDecisionEssence(decisionText);
  
  return {
    life_tensions: lifeTensions,
    identity_markers: identityMarkers,
    temporal_frame: temporalFrame,
    decision_essence: decisionEssence
  };
}

/**
 * Set coherence anchors for session (Turn 1 only)
 */
export function setCoherenceAnchors(
  session: SessionState,
  anchors: CoherenceAnchors
): void {
  if (session.current_turn !== 1) {
    throw new Error('Coherence anchors can only be set during Turn 1');
  }
  
  session.coherence_anchors = anchors;
  session.updated_at = new Date().toISOString();
}

/**
 * Get coherence anchors for prompt injection (Turns 2-9)
 */
export function getCoherenceAnchors(session: SessionState): CoherenceAnchors | null {
  return session.coherence_anchors;
}

// --- Silent Metrics ---

/**
 * Record decision gravity score
 */
export function recordDecisionGravity(session: SessionState, score: number): void {
  session.silent_metrics.decision_gravity_score = score;
  session.updated_at = new Date().toISOString();
}

/**
 * Record question depth score
 */
export function recordQuestionDepth(session: SessionState, score: number): void {
  session.silent_metrics.question_depth_scores.push(score);
  session.updated_at = new Date().toISOString();
}

/**
 * Record consequence depth score
 */
export function recordConsequenceDepth(session: SessionState, score: number): void {
  session.silent_metrics.consequence_depth_scores.push(score);
  session.updated_at = new Date().toISOString();
}

/**
 * Record question rejection
 */
export function recordQuestionRejection(session: SessionState): void {
  session.silent_metrics.question_rejection_count += 1;
  session.updated_at = new Date().toISOString();
}

/**
 * Terminate session (shallow response or user abandonment)
 */
export function terminateSession(
  session: SessionState,
  reason: 'shallow_response' | 'user_abandoned' | 'error'
): void {
  session.status = 'terminated';
  session.silent_metrics.abandonment_turn = session.current_turn;
  session.updated_at = new Date().toISOString();
}

/**
 * Get session metrics summary
 */
export function getMetricsSummary(session: SessionState): {
  completed: boolean;
  turns_completed: number;
  avg_question_depth: number | null;
  avg_consequence_depth: number | null;
  rejection_rate: number;
} {
  const questionScores = session.silent_metrics.question_depth_scores;
  const consequenceScores = session.silent_metrics.consequence_depth_scores;
  const rejections = session.silent_metrics.question_rejection_count;
  
  const avgQuestionDepth = questionScores.length > 0
    ? questionScores.reduce((a, b) => a + b, 0) / questionScores.length
    : null;
    
  const avgConsequenceDepth = consequenceScores.length > 0
    ? consequenceScores.reduce((a, b) => a + b, 0) / consequenceScores.length
    : null;
    
  const totalQuestionAttempts = questionScores.length + rejections;
  const rejectionRate = totalQuestionAttempts > 0
    ? rejections / totalQuestionAttempts
    : 0;
  
  return {
    completed: session.status === 'completed',
    turns_completed: session.current_turn,
    avg_question_depth: avgQuestionDepth,
    avg_consequence_depth: avgConsequenceDepth,
    rejection_rate: rejectionRate
  };
}

// --- Helper Functions for Anchor Extraction ---

function extractLifeTensions(reflection: string): string[] {
  // Extract themes of conflict, uncertainty, or tension from the reflection
  // These are abstract patterns, not raw text
  const tensions: string[] = [];
  
  const tensionPatterns = [
    { pattern: /security|stability|safe/i, tension: 'security_vs_growth' },
    { pattern: /freedom|autonomy|independence/i, tension: 'autonomy_vs_belonging' },
    { pattern: /family|relationship|loved ones/i, tension: 'self_vs_others' },
    { pattern: /career|work|profession/i, tension: 'career_identity' },
    { pattern: /money|financial|income/i, tension: 'financial_security' },
    { pattern: /time|years|age/i, tension: 'temporal_pressure' },
    { pattern: /fear|afraid|worry/i, tension: 'fear_of_unknown' },
    { pattern: /regret|miss|lose/i, tension: 'loss_aversion' },
    { pattern: /dream|aspiration|goal/i, tension: 'aspiration_gap' },
    { pattern: /identity|who I am|self/i, tension: 'identity_continuity' }
  ];
  
  for (const { pattern, tension } of tensionPatterns) {
    if (pattern.test(reflection) && !tensions.includes(tension)) {
      tensions.push(tension);
    }
  }
  
  // Limit to 5 most relevant tensions
  return tensions.slice(0, 5);
}

function extractIdentityMarkers(reflection: string): string[] {
  // Extract self-concept elements (abstract, not personal data)
  const markers: string[] = [];
  
  const identityPatterns = [
    { pattern: /professional|career|work/i, marker: 'professional_identity' },
    { pattern: /parent|mother|father|family/i, marker: 'family_role' },
    { pattern: /partner|spouse|relationship/i, marker: 'relational_identity' },
    { pattern: /creative|artist|maker/i, marker: 'creative_identity' },
    { pattern: /leader|manager|responsible/i, marker: 'leadership_identity' },
    { pattern: /learner|student|growth/i, marker: 'growth_orientation' },
    { pattern: /provider|support|care/i, marker: 'caretaker_identity' },
    { pattern: /independent|self-reliant/i, marker: 'autonomy_identity' }
  ];
  
  for (const { pattern, marker } of identityPatterns) {
    if (pattern.test(reflection) && !markers.includes(marker)) {
      markers.push(marker);
    }
  }
  
  return markers.slice(0, 4);
}

function extractTemporalFrame(decision: string, reflection: string): string {
  // Determine the time horizon being considered
  const combined = `${decision} ${reflection}`.toLowerCase();
  
  if (/decade|10 years|long.?term|retirement/i.test(combined)) {
    return 'decade_plus';
  }
  if (/years|5 years|several years/i.test(combined)) {
    return 'multi_year';
  }
  if (/year|12 months|next year/i.test(combined)) {
    return 'one_year';
  }
  if (/months|few months|half year/i.test(combined)) {
    return 'months';
  }
  
  return 'undefined_horizon';
}

function extractDecisionEssence(decision: string): string {
  // Abstract the decision into a category (no raw text stored)
  const lower = decision.toLowerCase();
  
  if (/career|job|work|profession|quit|leave.*job|start.*company/i.test(lower)) {
    return 'career_transition';
  }
  if (/move|relocate|city|country|home/i.test(lower)) {
    return 'geographic_change';
  }
  if (/relationship|marry|divorce|partner|break.?up/i.test(lower)) {
    return 'relationship_change';
  }
  if (/education|school|degree|study/i.test(lower)) {
    return 'educational_pursuit';
  }
  if (/health|medical|treatment|surgery/i.test(lower)) {
    return 'health_decision';
  }
  if (/family|child|parent|care/i.test(lower)) {
    return 'family_commitment';
  }
  if (/financial|invest|money|buy|sell/i.test(lower)) {
    return 'financial_commitment';
  }
  
  return 'life_direction_change';
}

// Export session store for testing
export const _sessionStore = sessions;
