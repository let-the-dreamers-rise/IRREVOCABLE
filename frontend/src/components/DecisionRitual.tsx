/**
 * Decision Ritual
 * The sacred entry point where the user commits their decision
 * Full-screen, deliberate, irreversible feeling
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore, generateFutureTimestamp } from '../store/sessionStore';
import { submitDecision } from '../api';
import './DecisionRitual.css';

export function DecisionRitual() {
  const { 
    phase, 
    decision, 
    decisionGravityScore,
    gravityVerdict,
    setPhase, 
    setDecision, 
    setGravityScore,
    acceptDecision,
    addReflection,
    rejectDecision
  } = useSessionStore();
  
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [gravityLabel, setGravityLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simulate gravity evaluation as user types
  useEffect(() => {
    if (decision.length > 20) {
      const timer = setTimeout(() => {
        evaluateGravity(decision);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setGravityLabel(null);
      setGravityScore(0);
    }
  }, [decision]);

  const evaluateGravity = async (text: string) => {
    setIsEvaluating(true);
    
    // Simulate ML evaluation (in production, call backend)
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Simple heuristic for demo (backend has real ML)
    let score = 0.3;
    const lower = text.toLowerCase();
    
    if (/quit|leave|resign|career|job|company/i.test(lower)) score += 0.25;
    if (/move|relocate|country|city/i.test(lower)) score += 0.2;
    if (/marry|divorce|relationship|partner/i.test(lower)) score += 0.25;
    if (/years|decade|permanent|forever/i.test(lower)) score += 0.15;
    if (/family|child|parent/i.test(lower)) score += 0.15;
    if (/start|found|build/i.test(lower)) score += 0.1;
    
    score = Math.min(score, 1);
    setGravityScore(score);
    
    // Set label based on score
    if (score >= 0.7) {
      setGravityLabel('This decision carries significant weight');
    } else if (score >= 0.5) {
      setGravityLabel('This decision warrants deep reflection');
    } else if (score >= 0.3) {
      setGravityLabel('Consider framing the permanence more clearly');
    } else {
      setGravityLabel('This may not require this level of reflection');
    }
    
    setIsEvaluating(false);
  };

  const handleSubmit = async () => {
    if (gravityVerdict !== 'accepted' || decision.length < 20) return;
    
    setPhase('weighing');
    setError(null);
    
    try {
      // Call the real API
      const result = await submitDecision(decision);
      
      if (result.success && result.response) {
        // Decision accepted - extract session ID and first reflection
        const response = result.response;
        
        // Accept the decision with the real session ID
        // Session ID is in metadata.session_id
        const sessionId = response.metadata?.session_id || response.session_id || '';
        
        // Update gravity score from backend
        const gravityScore = response.metadata?.decision_gravity_score || 
                            response.scores?.gravity_score;
        if (gravityScore) {
          setGravityScore(gravityScore);
        }
        
        // Store the reflection data to be added after crossing animation
        const turnNum = response.turn_number || 1;
        console.log('[DecisionRitual] Backend returned turn_number:', response.turn_number, 'using:', turnNum);
        
        const reflectionData = {
          turnNumber: turnNum,
          content: typeof response.reflection === 'string' 
            ? response.reflection 
            : (response.reflection as any)?.content || '',
          timestamp: generateFutureTimestamp(turnNum),
          consequenceScore: response.metadata?.consequence_depth_score || 
                           response.scores?.consequence_depth_score || 0
        };
        
        console.log('[DecisionRitual] Storing reflection data:', reflectionData);
        
        // Store in sessionStorage for CrossingTransition to pick up
        sessionStorage.setItem('pendingReflection', JSON.stringify(reflectionData));
        
        // Accept decision - this sets phase to 'crossing' for the animation
        acceptDecision(sessionId);
      } else if (result.refusal) {
        // Decision rejected
        console.log('[DecisionRitual] Decision rejected:', result.refusal);
        
        // Update gravity score if provided
        if (result.refusal.metadata?.gravity_score !== undefined) {
          setGravityScore(result.refusal.metadata.gravity_score);
        }
        
        setError(result.refusal.message);
        rejectDecision();
      } else {
        // Unknown error
        setError(result.error || 'An unexpected error occurred');
        setPhase('decision');
      }
    } catch (err) {
      console.error('[DecisionRitual] Error:', err);
      setError('Unable to connect to the server. Please try again.');
      setPhase('decision');
    }
  };

  const canSubmit = gravityVerdict === 'accepted' && decision.length >= 20;

  return (
    <motion.div 
      className="ritual-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
    >
      <div className="ritual-content">
        {/* Instruction */}
        <motion.div 
          className="ritual-instruction"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          <span className="instruction-label">THE DECISION</span>
        </motion.div>

        {/* Main prompt */}
        <motion.h2 
          className="ritual-prompt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1.2 }}
        >
          Describe a decision you believe cannot be undone.
        </motion.h2>

        {/* Decision input */}
        <motion.div 
          className="ritual-input-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 1 }}
        >
          <textarea
            className="ritual-input"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            placeholder="I am considering..."
            maxLength={500}
            rows={4}
            disabled={phase === 'weighing'}
          />
          
          {/* Character count */}
          <div className="ritual-meta">
            <span className="char-count">{decision.length} / 500</span>
          </div>
        </motion.div>

        {/* Gravity indicator */}
        <AnimatePresence>
          {gravityLabel && (
            <motion.div 
              className={`gravity-indicator ${gravityVerdict}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="gravity-bar-container">
                <motion.div 
                  className="gravity-bar"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: decisionGravityScore || 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                <div className="gravity-threshold" />
              </div>
              <p className="gravity-label">
                {isEvaluating ? 'Evaluating decision weight...' : gravityLabel}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              className="ritual-error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="error-message">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit button */}
        <motion.div 
          className="ritual-submit-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          <button
            className={`ritual-submit ${canSubmit ? 'active' : 'disabled'}`}
            onClick={handleSubmit}
            disabled={!canSubmit || phase === 'weighing'}
          >
            {phase === 'weighing' ? (
              <span className="submit-text">Crossing the threshold...</span>
            ) : (
              <>
                <span className="submit-text">Commit to this future</span>
                <span className="submit-warning">This cannot be revised</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Bottom guidance */}
        <motion.p 
          className="ritual-guidance"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 2, duration: 1 }}
        >
          The system will only engage with decisions of genuine weight.<br />
          Trivial choices do not warrant this depth of reflection.
        </motion.p>
      </div>
    </motion.div>
  );
}
