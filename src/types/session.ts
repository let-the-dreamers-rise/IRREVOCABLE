/**
 * Session Types
 * Handles session state, coherence anchors, and silent metrics
 */

import { QuestionRejectionReason } from './question';

/**
 * Turn Data
 * Records data for each turn in the reflection arc
 */
export interface TurnData {
  turn_number: number;
  timestamp: string;
  type: 'initial_snapshot' | 'user_question';
  question?: string;
  content: string;
  question_depth_score?: number;
  consequence_depth_score: number;
}

export interface SessionState {
  session_id: string;
  created_at: string;
  updated_at: string;
  current_turn: number;           // 0-9 (0 = not started, 1-9 = turns)
  max_turns: number;
  turns: TurnData[];
  coherence_anchors: CoherenceAnchors | null;
  silent_metrics: SilentMetrics;
  status: SessionStatus;
  terminated_at?: string;
  termination_reason?: SessionTerminationReason;
}

export type SessionStatus = 
  | 'active'            // Reflection arc in progress
  | 'completed'         // All 9 turns delivered
  | 'terminated'        // Ended early (shallow response or error)
  | 'error';            // System error

export type SessionTerminationReason =
  | 'COMPLETED_ARC'           // Normal completion after Turn 9
  | 'SHALLOW_RESPONSE'        // Consequence depth below threshold
  | 'DECISION_REFUSED'        // Decision gravity below threshold
  | 'SYSTEM_ERROR'            // Technical failure
  | 'USER_ABANDONED';         // User left before completion

/**
 * Coherence Anchors
 * Extracted from Turn 1 to maintain narrative continuity
 * Session-scoped only, not persisted beyond session
 */
export interface CoherenceAnchors {
  life_tensions: string[];        // 3-5 latent tensions identified
  identity_markers: string[];     // Key self-concept elements
  temporal_frame: string;         // Established time horizon
  decision_essence: string;       // Core of decision (abstracted, no raw text)
  emotional_baseline?: string;    // Initial emotional state (optional)
}

/**
 * Silent Metrics
 * Tracked for judge credibility, NOT shown to users
 */
export interface SilentMetrics {
  decision_gravity_score: number | null;
  question_depth_scores: number[];      // Per turn (turns 2-9)
  consequence_depth_scores: number[];   // Per turn (all turns)
  question_rejection_count: number;
  rejection_reasons?: QuestionRejectionReason[];
  completion_status?: 'COMPLETED' | 'ABANDONED' | 'TERMINATED';
  abandonment_turn: number | null;
  total_session_duration_ms?: number;
}

export const INITIAL_SILENT_METRICS: SilentMetrics = {
  decision_gravity_score: null,
  question_depth_scores: [],
  consequence_depth_scores: [],
  question_rejection_count: 0,
  rejection_reasons: [],
  abandonment_turn: null
};

export const MAX_TURNS = 9;
export const DECISION_GRAVITY_THRESHOLD = 0.5;
export const QUESTION_DEPTH_THRESHOLD = 0.6;
export const CONSEQUENCE_DEPTH_THRESHOLD = 0.5;
