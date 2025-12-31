/**
 * Reflection Chamber
 * The main space where reflections are displayed and questions are asked
 * Static panels, deliberate input, no chat metaphors
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore, generateFutureTimestamp } from '../store/sessionStore';
import { submitQuestion } from '../api';
import './ReflectionChamber.css';

export function ReflectionChamber() {
  const {
    reflections,
    currentTurn,
    maxTurns,
    currentQuestion,
    questionRejection,
    setCurrentQuestion,
    setPhase,
    addReflection,
    rejectQuestion,
    clearQuestionRejection
  } = useSessionStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chamberRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest reflection
  useEffect(() => {
    if (chamberRef.current) {
      chamberRef.current.scrollTo({
        top: chamberRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [reflections]);

  const handleQuestionSubmit = async () => {
    if (!currentQuestion.trim() || currentQuestion.length < 10) return;
    if (currentTurn >= maxTurns) return;

    const sessionId = useSessionStore.getState().sessionId;
    if (!sessionId) {
      console.error('[ReflectionChamber] No session ID');
      return;
    }

    setPhase('processing');
    setIsGenerating(true);
    clearQuestionRejection();

    try {
      // Call the real API
      const result = await submitQuestion(sessionId, currentQuestion, currentTurn + 1);

      if (result.success && result.response) {
        // Question accepted - add the reflection
        const response = result.response;
        
        // Backend returns reflection as string directly
        addReflection({
          turnNumber: response.turn_number,
          content: typeof response.reflection === 'string' 
            ? response.reflection 
            : (response.reflection as any)?.content || '',
          timestamp: generateFutureTimestamp(response.turn_number),
          question: currentQuestion,
          consequenceScore: response.metadata?.consequence_depth_score || 
                           response.scores?.consequence_depth_score || 0
        });

        setCurrentQuestion('');
      } else if (result.refusal) {
        // Question rejected
        console.log('[ReflectionChamber] Question rejected:', result.refusal);
        rejectQuestion(
          result.refusal.message,
          result.refusal.guidance || 'Try asking about specific feelings or experiences.'
        );
        setPhase('reflection');
      } else {
        // Unknown error
        rejectQuestion(
          result.error || 'An unexpected error occurred',
          'Please try again.'
        );
        setPhase('reflection');
      }
    } catch (err) {
      console.error('[ReflectionChamber] Error:', err);
      rejectQuestion(
        'Unable to connect to the server',
        'Please try again.'
      );
      setPhase('reflection');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuestionSubmit();
    }
  };

  const remainingTurns = maxTurns - currentTurn;
  const canAskQuestion = currentTurn < maxTurns && !isGenerating;

  return (
    <motion.div 
      className="chamber-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
    >
      {/* Progress indicator */}
      <div className="chamber-progress">
        <span className="progress-text">
          You have explored {currentTurn} of {maxTurns} perspectives of this future
        </span>
        <div className="progress-bar">
          <motion.div 
            className="progress-fill"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: currentTurn / maxTurns }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </div>

      {/* Reflections scroll area */}
      <div className="chamber-scroll" ref={chamberRef}>
        <div className="reflections-container">
          {reflections.map((reflection, index) => (
            <motion.div
              key={index}
              className="reflection-panel"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: index === reflections.length - 1 ? 0.3 : 0 }}
            >
              {/* Timestamp from the future */}
              <div className="reflection-header">
                <span className="reflection-timestamp">{reflection.timestamp}</span>
                <span className="reflection-turn">Reflection {reflection.turnNumber}</span>
              </div>

              {/* User's question (if turns 2-9) */}
              {reflection.question && (
                <div className="reflection-question">
                  <span className="question-label">You asked:</span>
                  <p className="question-text">"{reflection.question}"</p>
                </div>
              )}

              {/* The reflection content */}
              <div className="reflection-content">
                {reflection.content.split('\n\n').map((paragraph, pIndex) => (
                  <p key={pIndex} className="reflection-paragraph">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Subtle depth indicator */}
              <div className="reflection-meta">
                <div className="depth-indicator">
                  <div 
                    className="depth-fill" 
                    style={{ width: `${reflection.consequenceScore * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}

          {/* Generation state */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                className="generating-indicator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="generating-pulse" />
                <span className="generating-text">
                  Reaching across time...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Question input area */}
      {canAskQuestion && (
        <motion.div 
          className="question-area"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          {/* Rejection feedback */}
          <AnimatePresence>
            {questionRejection && (
              <motion.div
                className="rejection-feedback"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <p className="rejection-message">{questionRejection.message}</p>
                <p className="rejection-guidance">{questionRejection.guidance}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="question-input-container">
            <div className="question-prompt">
              <span className="prompt-label">Your question to your future self</span>
              <span className="prompt-remaining">{remainingTurns} questions remain</span>
            </div>
            
            <textarea
              ref={inputRef}
              className="question-input"
              value={currentQuestion}
              onChange={(e) => setCurrentQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What might I feel when..."
              maxLength={200}
              rows={2}
              disabled={isGenerating}
            />

            <div className="question-actions">
              <span className="char-count">{currentQuestion.length} / 200</span>
              <button
                className={`question-submit ${currentQuestion.length >= 10 ? 'active' : ''}`}
                onClick={handleQuestionSubmit}
                disabled={currentQuestion.length < 10 || isGenerating}
              >
                Ask
              </button>
            </div>
          </div>

          <p className="question-guidance">
            Ask about feelings, tensions, identity shifts, or specific moments.<br />
            Questions seeking advice or predictions will be rejected.
          </p>
        </motion.div>
      )}

      {/* Final turn indicator */}
      {currentTurn >= maxTurns && (
        <motion.div 
          className="final-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
        >
          <p>This reflection arc is complete.</p>
        </motion.div>
      )}
    </motion.div>
  );
}

