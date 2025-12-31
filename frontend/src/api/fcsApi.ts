/**
 * IRREVOCABLE API Service
 * Client for communicating with the IRREVOCABLE backend
 */

// @ts-ignore - Vite provides import.meta.env
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

/**
 * API Response types
 */
export interface ApiResponse<T> {
  success: boolean;
  response?: T;
  refusal?: RefusalResponse;
  error?: string;
}

export interface RefusalResponse {
  refused: boolean;
  reason: string;
  message: string;
  guidance?: string;
  metadata?: {
    session_id?: string;
    turn_number?: number;
    gravity_score?: number;
    depth_score?: number;
    rejection_reason?: string;
    crisis_resources?: boolean;
  };
}

export interface ReflectionResponse {
  success: boolean;
  session_id?: string;
  turn_number: number;
  is_final: boolean;
  remaining_turns: number;
  reflection: string;  // Backend returns string directly, not object
  metadata: {
    session_id: string;
    decision_gravity_score?: number;
    consequence_depth_score: number;
    timestamp: string;
    session_complete?: boolean;
  };
  disclaimers: string[];
  guidance?: string;
  closure_message?: string;
  // Legacy fields for compatibility
  scores?: {
    gravity_score?: number;
    question_depth_score?: number;
    consequence_depth_score: number;
  };
  progress?: {
    current: number;
    total: number;
    remaining: number;
  };
}

export interface SessionStatus {
  exists: boolean;
  status?: string;
  currentTurn?: number;
  canContinue?: boolean;
}

/**
 * Submit a decision (Turn 1)
 */
export async function submitDecision(
  decisionText: string,
  timeHorizon?: string
): Promise<ApiResponse<ReflectionResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/turn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'decision',
        decision: {
          decision_text: decisionText,
          time_horizon: timeHorizon
        }
      })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[FCS API] Error submitting decision:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Submit a question (Turns 2-9)
 */
export async function submitQuestion(
  sessionId: string,
  questionText: string,
  turnNumber: number
): Promise<ApiResponse<ReflectionResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/turn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'question',
        session_id: sessionId,
        question: {
          question_text: questionText,
          turn_number: turnNumber
        }
      })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[FCS API] Error submitting question:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Get session status
 */
export async function getSessionStatus(sessionId: string): Promise<ApiResponse<SessionStatus>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/session/${sessionId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[FCS API] Error getting session status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}
