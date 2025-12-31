import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processTurn, ProcessTurnRequest } from '../src/functions';
import { DecisionInput } from '../src/types/decision';
import { UserQuestion } from '../src/types/question';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, session_id, decision, question } = req.body;

    if (!type || !['decision', 'question'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request type. Must be "decision" or "question".'
      });
    }

    let request: ProcessTurnRequest;

    if (type === 'decision') {
      if (!decision || !decision.decision_text) {
        return res.status(400).json({
          success: false,
          error: 'Decision text is required for decision type.'
        });
      }

      const decisionInput: DecisionInput = {
        decision_text: decision.decision_text,
        context: decision.time_horizon
      };

      request = {
        type: 'decision',
        decision: decisionInput
      };
    } else {
      if (!session_id) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required for question type.'
        });
      }

      if (!question || !question.question_text) {
        return res.status(400).json({
          success: false,
          error: 'Question text is required for question type.'
        });
      }

      const userQuestion: UserQuestion = {
        question_text: question.question_text,
        session_id: session_id,
        turn_number: question.turn_number
      };

      request = {
        type: 'question',
        session_id: session_id,
        question: userQuestion
      };
    }

    const result = await processTurn(request);

    if (result.success) {
      return res.json({
        success: true,
        response: result.response
      });
    } else {
      const statusCode = result.refusal.reason === 'system_error' ? 500 : 200;
      return res.status(statusCode).json({
        success: false,
        refusal: result.refusal
      });
    }
  } catch (error) {
    console.error('[API] Error processing turn:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
