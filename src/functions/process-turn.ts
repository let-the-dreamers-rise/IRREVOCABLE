/**
 * Process Turn Orchestration Endpoint
 * Main entry point for the FCS reflection arc
 * 
 * Turn 1 Flow:
 *   Validate decision → Decision Gravity Gate (ML) → Generate → 
 *   Consequence Depth Gate (ML) → Extract anchors → Respond
 * 
 * Turns 2-9 Flow:
 *   Validate question → Question Depth Gate (ML) → Generate with anchors → 
 *   Consequence Depth Gate (ML) → Respond
 * 
 * Turn 9: Hard terminate, disable all further requests
 */

import { DecisionInput } from '../types/decision';
import { UserQuestion } from '../types/question';
import { ReflectionResponse } from '../types/reflection';
import { RefusalResponse } from '../types/refusal';
import { MAX_TURNS } from '../types/session';

// Validators
import { validateDecisionInput, getDecisionRejectionMessage, requiresCrisisResources } from '../validators/decision-validator';
import { validateQuestion, getQuestionRejectionMessage } from '../validators/question-validator';

// ML Gates
import { checkDecisionGravityGate } from '../gates/decision-gravity-gate';
import { checkQuestionDepthGate } from '../gates/question-depth-gate';
import { checkConsequenceDepthGate } from '../gates/consequence-depth-gate';

// Generation
import { generateInitialReflection, generateQuestionReflection, generateMockReflection } from '../generation/reflection-generator';

// Response Formatting
import { formatInitialSnapshotResponse, formatReflectionResponse, formatFinalResponse } from '../responses/response-formatter';
import { 
  generateQuestionRefusal, 
  generateTerminationResponse,
  generateSessionTerminatedRefusal,
  generateMaxTurnsRefusal 
} from '../responses/refusal-generator';

// Session Management
import {
  createSession,
  getSession,
  canContinue,
  advanceTurn,
  recordTurn,
  extractCoherenceAnchors,
  setCoherenceAnchors,
  getCoherenceAnchors,
  recordDecisionGravity,
  recordQuestionDepth,
  recordConsequenceDepth,
  recordQuestionRejection,
  terminateSession
} from '../session/session-controller';

// Configuration
const USE_MOCK_GENERATION = process.env.USE_MOCK_GENERATION === 'true' || !process.env.AZURE_OPENAI_ENDPOINT;

/**
 * Request types for the orchestration endpoint
 */
export interface ProcessTurnRequest {
  type: 'decision' | 'question';
  session_id?: string;
  decision?: DecisionInput;
  question?: UserQuestion;
}

/**
 * Response types from the orchestration endpoint
 */
export type ProcessTurnResponse = 
  | { success: true; response: ReflectionResponse }
  | { success: false; refusal: RefusalResponse };

/**
 * Main orchestration function
 * Routes to Turn 1 or Turns 2-9 flow based on request type
 */
export async function processTurn(request: ProcessTurnRequest): Promise<ProcessTurnResponse> {
  try {
    if (request.type === 'decision') {
      return await processTurn1(request.decision!);
    } else {
      return await processTurns2to9(request.session_id!, request.question!);
    }
  } catch (error) {
    console.error('[Process Turn] Error:', error);
    return {
      success: false,
      refusal: {
        refused: true,
        reason: 'system_error',
        message: 'An unexpected error occurred. Please try again.',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    };
  }
}

/**
 * Turn 1 Flow: Process initial decision
 * Validate → Gravity Gate → Generate → Consequence Gate → Extract Anchors → Respond
 */
async function processTurn1(decision: DecisionInput): Promise<ProcessTurnResponse> {
  // Step 1: Create session
  const session = createSession();
  console.log(`[Turn 1] Session created: ${session.session_id}`);

  // Step 2: Validate decision input
  const validationResult = validateDecisionInput(decision);
  if (!validationResult.is_valid) {
    console.log(`[Turn 1] Validation failed: ${validationResult.rejection_reason}`);
    
    const refusal: RefusalResponse = {
      refused: true,
      reason: 'validation_failed',
      message: getDecisionRejectionMessage(validationResult.rejection_reason!),
      metadata: {
        session_id: session.session_id,
        rejection_reason: validationResult.rejection_reason
      }
    };

    // Add crisis resources if needed
    if (requiresCrisisResources(validationResult.rejection_reason!)) {
      refusal.metadata!.crisis_resources = true;
    }

    terminateSession(session, 'error');
    return { success: false, refusal };
  }

  // Step 3: Decision Gravity Gate (ML)
  const gravityResult = await checkDecisionGravityGate({
    decision_text: validationResult.sanitized_input!,
    session_id: session.session_id
  });

  if (!gravityResult.passed) {
    console.log(`[Turn 1] Decision Gravity Gate REJECTED: ${gravityResult.refusal.metadata?.gravity_score}`);
    recordDecisionGravity(session, gravityResult.refusal.metadata?.gravity_score || 0);
    terminateSession(session, 'shallow_response');
    
    return { 
      success: false, 
      refusal: {
        ...gravityResult.refusal,
        metadata: {
          ...gravityResult.refusal.metadata,
          session_id: session.session_id
        }
      }
    };
  }

  console.log(`[Turn 1] Decision Gravity Gate PASSED: ${gravityResult.score.score}`);
  recordDecisionGravity(session, gravityResult.score.score);

  // Step 4: Generate initial reflection
  let reflection: string;
  try {
    if (USE_MOCK_GENERATION) {
      const mockResult = await generateMockReflection(true, {
        decision_text: validationResult.sanitized_input!,
        session_id: session.session_id
      });
      reflection = mockResult.reflection;
    } else {
      const genResult = await generateInitialReflection({
        decision_text: validationResult.sanitized_input!,
        session_id: session.session_id
      });
      reflection = genResult.reflection;
    }
  } catch (error) {
    console.error('[Turn 1] Generation failed:', error);
    terminateSession(session, 'error');
    return {
      success: false,
      refusal: {
        refused: true,
        reason: 'system_error',
        message: 'Unable to generate reflection. Please try again.',
        metadata: { session_id: session.session_id }
      }
    };
  }

  // Step 5: Consequence Depth Gate (ML)
  const consequenceResult = await checkConsequenceDepthGate(reflection);
  recordConsequenceDepth(session, consequenceResult.score.score);

  if (!consequenceResult.passed) {
    console.log(`[Turn 1] Consequence Depth Gate FAILED: ${consequenceResult.score.score}`);
    terminateSession(session, 'shallow_response');
    
    return {
      success: false,
      refusal: generateTerminationResponse(consequenceResult.score, session.session_id)
    };
  }

  console.log(`[Turn 1] Consequence Depth Gate PASSED: ${consequenceResult.score.score}`);

  // Step 6: Extract and set coherence anchors
  const anchors = extractCoherenceAnchors(validationResult.sanitized_input!, reflection);
  advanceTurn(session); // Move to turn 1
  setCoherenceAnchors(session, anchors);

  // Step 7: Record turn data
  recordTurn(session, {
    type: 'initial_snapshot',
    content: reflection,
    consequence_depth_score: consequenceResult.score.score
  });

  // Step 8: Format and return response
  const response = formatInitialSnapshotResponse(
    reflection,
    session,
    consequenceResult.score,
    gravityResult.score.score
  );

  console.log(`[Turn 1] Complete. Session ${session.session_id} ready for questions.`);
  
  return { success: true, response };
}

/**
 * Turns 2-9 Flow: Process user question
 * Validate → Question Depth Gate → Generate with Anchors → Consequence Gate → Respond
 */
async function processTurns2to9(
  sessionId: string,
  question: UserQuestion
): Promise<ProcessTurnResponse> {
  // Step 1: Get and validate session
  const session = getSession(sessionId);
  
  if (!session) {
    console.log(`[Turns 2-9] Session not found: ${sessionId}`);
    return {
      success: false,
      refusal: {
        refused: true,
        reason: 'session_terminated',
        message: 'Session not found. Please start a new reflection.',
        metadata: { session_id: sessionId }
      }
    };
  }

  // Check if session can continue
  if (!canContinue(session)) {
    console.log(`[Turns 2-9] Session cannot continue: ${session.status}`);
    
    if (session.status === 'completed') {
      return { success: false, refusal: generateMaxTurnsRefusal(sessionId) };
    }
    
    return { success: false, refusal: generateSessionTerminatedRefusal(sessionId) };
  }

  const nextTurn = session.current_turn + 1;
  console.log(`[Turn ${nextTurn}] Processing question for session ${sessionId}`);

  // Step 2: Validate question
  const questionWithMeta: UserQuestion = {
    ...question,
    session_id: sessionId,
    turn_number: nextTurn
  };

  const validationResult = validateQuestion(questionWithMeta);
  
  if (!validationResult.is_valid) {
    console.log(`[Turn ${nextTurn}] Question validation failed: ${validationResult.rejection_reason}`);
    recordQuestionRejection(session);
    
    return {
      success: false,
      refusal: {
        refused: true,
        reason: mapQuestionRejectionToRefusalReason(validationResult.rejection_reason!),
        message: getQuestionRejectionMessage(validationResult.rejection_reason!),
        guidance: validationResult.guidance,
        metadata: {
          session_id: sessionId,
          turn_number: nextTurn,
          rejection_reason: validationResult.rejection_reason
        }
      }
    };
  }

  // Step 3: Question Depth Gate (ML)
  const depthResult = await checkQuestionDepthGate(questionWithMeta);

  if (!depthResult.passed) {
    console.log(`[Turn ${nextTurn}] Question Depth Gate REJECTED: ${depthResult.rejection.depth_score}`);
    recordQuestionRejection(session);
    
    const refusal = generateQuestionRefusal(depthResult.rejection);
    refusal.metadata = {
      ...refusal.metadata,
      session_id: sessionId,
      turn_number: nextTurn
    };
    
    return { success: false, refusal };
  }

  console.log(`[Turn ${nextTurn}] Question Depth Gate PASSED: ${depthResult.score.score}`);
  recordQuestionDepth(session, depthResult.score.score);

  // Step 4: Get coherence anchors
  const anchors = getCoherenceAnchors(session);
  if (!anchors) {
    console.error(`[Turn ${nextTurn}] No coherence anchors found`);
    return {
      success: false,
      refusal: {
        refused: true,
        reason: 'system_error',
        message: 'Session state error. Please start a new reflection.',
        metadata: { session_id: sessionId }
      }
    };
  }

  // Step 5: Generate reflection with anchors
  let reflection: string;
  try {
    if (USE_MOCK_GENERATION) {
      const mockResult = await generateMockReflection(false, undefined, questionWithMeta);
      reflection = mockResult.reflection;
    } else {
      const genResult = await generateQuestionReflection(questionWithMeta, anchors, nextTurn);
      reflection = genResult.reflection;
    }
  } catch (error) {
    console.error(`[Turn ${nextTurn}] Generation failed:`, error);
    return {
      success: false,
      refusal: {
        refused: true,
        reason: 'system_error',
        message: 'Unable to generate reflection. Please try again.',
        metadata: { session_id: sessionId, turn_number: nextTurn }
      }
    };
  }

  // Step 6: Consequence Depth Gate (ML)
  const consequenceResult = await checkConsequenceDepthGate(reflection);
  recordConsequenceDepth(session, consequenceResult.score.score);

  if (!consequenceResult.passed) {
    console.log(`[Turn ${nextTurn}] Consequence Depth Gate FAILED: ${consequenceResult.score.score}`);
    terminateSession(session, 'shallow_response');
    
    return {
      success: false,
      refusal: generateTerminationResponse(consequenceResult.score, sessionId)
    };
  }

  console.log(`[Turn ${nextTurn}] Consequence Depth Gate PASSED: ${consequenceResult.score.score}`);

  // Step 7: Advance turn and record
  advanceTurn(session);
  recordTurn(session, {
    type: 'user_question',
    question: validationResult.sanitized_question,
    content: reflection,
    question_depth_score: depthResult.score.score,
    consequence_depth_score: consequenceResult.score.score
  });

  // Step 8: Format response (check if final turn)
  let response: ReflectionResponse;
  
  if (session.current_turn >= MAX_TURNS) {
    console.log(`[Turn ${session.current_turn}] FINAL TURN - Session complete`);
    response = formatFinalResponse(reflection, session, consequenceResult.score);
  } else {
    response = formatReflectionResponse(reflection, session, consequenceResult.score);
  }

  console.log(`[Turn ${session.current_turn}] Complete. ${MAX_TURNS - session.current_turn} turns remaining.`);
  
  return { success: true, response };
}

/**
 * Helper: Map question rejection reason to refusal reason
 */
function mapQuestionRejectionToRefusalReason(reason: string): RefusalResponse['reason'] {
  const mapping: Record<string, RefusalResponse['reason']> = {
    'ADVICE_SEEKING': 'advice_seeking_question',
    'PREDICTIVE_FRAMING': 'predictive_question',
    'LEADING_QUESTION': 'leading_question',
    'TOO_GENERIC': 'generic_question',
    'TOO_SHORT': 'shallow_question',
    'FORBIDDEN_CONTENT': 'forbidden_content'
  };
  return mapping[reason] || 'validation_failed';
}

/**
 * Get session status (for frontend polling)
 */
export function getSessionStatus(sessionId: string): {
  exists: boolean;
  status?: string;
  currentTurn?: number;
  canContinue?: boolean;
} {
  const session = getSession(sessionId);
  
  if (!session) {
    return { exists: false };
  }
  
  return {
    exists: true,
    status: session.status,
    currentTurn: session.current_turn,
    canContinue: canContinue(session)
  };
}

/**
 * Export for Azure Functions HTTP trigger
 */
export default processTurn;
