/**
 * IRREVOCABLE HTTP Server
 * Express server for local development and Azure Functions deployment
 * 
 * Endpoints:
 *   POST /api/turn - Process a turn (decision or question)
 *   GET /api/session/:id - Get session status
 *   GET /api/health - Health check
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { processTurn, ProcessTurnRequest, getSessionStatus } from './functions';
import { DecisionInput } from './types/decision';
import { UserQuestion } from './types/question';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS configuration for development
// Allow multiple origins for local development flexibility
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost on any port for development
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:3000'
    ];
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in dev for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * Health check endpoint
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    service: 'IRREVOCABLE',
    timestamp: new Date().toISOString()
  });
});

/**
 * Process Turn endpoint
 * Handles both initial decisions (Turn 1) and questions (Turns 2-9)
 */
app.post('/api/turn', async (req: Request, res: Response) => {
  try {
    const { type, session_id, decision, question } = req.body;

    // Validate request type
    if (!type || !['decision', 'question'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request type. Must be "decision" or "question".'
      });
    }

    // Build the request
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
        context: decision.time_horizon // Map time_horizon to context for now
      };

      request = {
        type: 'decision',
        decision: decisionInput
      };
    } else {
      // Question type
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

    // Process the turn
    const result = await processTurn(request);

    if (result.success) {
      return res.json({
        success: true,
        response: result.response
      });
    } else {
      // Return refusal with appropriate status code
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
});

/**
 * Get session status endpoint
 */
app.get('/api/session/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = getSessionStatus(id);
    
    return res.json({
      success: true,
      session: status
    });
  } catch (error) {
    console.error('[API] Error getting session status:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   IRREVOCABLE - API Server                                    ║
║                                                               ║
║   "One decision. One future. No revision."                    ║
║                                                               ║
║   Server running on http://localhost:${PORT}                    ║
║                                                               ║
║   Endpoints:                                                  ║
║     POST /api/turn     - Process decision or question         ║
║     GET  /api/session/:id - Get session status                ║
║     GET  /api/health   - Health check                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  });
}

export default app;
