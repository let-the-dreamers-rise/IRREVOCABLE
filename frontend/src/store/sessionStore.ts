/**
 * Session State Management
 * Zustand store for the reflective instrument
 */

import { create } from 'zustand';

export type SessionPhase = 
  | 'void'           // Initial empty state
  | 'awakening'      // Transition into decision input
  | 'decision'       // User entering decision
  | 'weighing'       // Evaluating decision gravity
  | 'crossing'       // Transition into future context
  | 'reflection'     // Viewing reflection / asking questions
  | 'questioning'    // User typing question
  | 'processing'     // Generating response
  | 'terminal';      // Session complete - no return

export interface Reflection {
  turnNumber: number;
  content: string;
  timestamp: string;        // Future timestamp (e.g., "7 years later")
  question?: string;        // User's question (turns 2-9)
  consequenceScore: number;
}

export interface SessionState {
  // Core State
  phase: SessionPhase;
  sessionId: string | null;
  
  // Decision
  decision: string;
  decisionGravityScore: number | null;
  gravityVerdict: 'pending' | 'accepted' | 'rejected';
  
  // Reflections
  reflections: Reflection[];
  currentTurn: number;
  maxTurns: number;
  
  // Question State
  currentQuestion: string;
  questionRejection: {
    rejected: boolean;
    message: string;
    guidance: string;
  } | null;
  
  // Actions
  setPhase: (phase: SessionPhase) => void;
  setDecision: (decision: string) => void;
  setGravityScore: (score: number) => void;
  acceptDecision: (sessionId: string) => void;
  rejectDecision: () => void;
  addReflection: (reflection: Reflection) => void;
  setCurrentQuestion: (question: string) => void;
  rejectQuestion: (message: string, guidance: string) => void;
  clearQuestionRejection: () => void;
  advanceTurn: () => void;
  terminate: () => void;
  reset: () => void;
}

const initialState = {
  phase: 'void' as SessionPhase,
  sessionId: null,
  decision: '',
  decisionGravityScore: null,
  gravityVerdict: 'pending' as const,
  reflections: [],
  currentTurn: 0,
  maxTurns: 9,
  currentQuestion: '',
  questionRejection: null,
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,
  
  setPhase: (phase) => set({ phase }),
  
  setDecision: (decision) => set({ decision }),
  
  setGravityScore: (score) => set({ 
    decisionGravityScore: score,
    gravityVerdict: score >= 0.5 ? 'accepted' : 'rejected'
  }),
  
  acceptDecision: (sessionId) => set({ 
    sessionId,
    gravityVerdict: 'accepted',
    phase: 'crossing'
  }),
  
  rejectDecision: () => set({ 
    gravityVerdict: 'rejected',
    phase: 'decision'
  }),
  
  addReflection: (reflection) => set((state) => {
    console.log('[SessionStore] addReflection called with turnNumber:', reflection.turnNumber, 'maxTurns:', state.maxTurns);
    const newPhase = reflection.turnNumber >= state.maxTurns ? 'terminal' : 'reflection';
    console.log('[SessionStore] Setting phase to:', newPhase);
    return {
      reflections: [...state.reflections, reflection],
      currentTurn: reflection.turnNumber,
      phase: newPhase
    };
  }),
  
  setCurrentQuestion: (question) => set({ 
    currentQuestion: question,
    questionRejection: null
  }),
  
  rejectQuestion: (message, guidance) => set({
    questionRejection: { rejected: true, message, guidance }
  }),
  
  clearQuestionRejection: () => set({ questionRejection: null }),
  
  advanceTurn: () => set((state) => ({
    currentTurn: state.currentTurn + 1
  })),
  
  terminate: () => set({ phase: 'terminal' }),
  
  reset: () => set(initialState)
}));

// Temporal timestamp generator
export function generateFutureTimestamp(turnNumber: number): string {
  const timestamps = [
    'The moment of crossing',
    '3 months later',
    '1 year later',
    '2 years later',
    '4 years later',
    '7 years later',
    '12 years later',
    '20 years later',
    'Looking back across a lifetime'
  ];
  return timestamps[Math.min(turnNumber - 1, timestamps.length - 1)];
}
