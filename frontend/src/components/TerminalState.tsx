/**
 * Terminal State
 * The final, irreversible end of the reflection arc
 * No restart, no share, no navigation - only stillness
 */

import { motion } from 'framer-motion';
import { useSessionStore } from '../store/sessionStore';
import './TerminalState.css';

export function TerminalState() {
  const { reflections } = useSessionStore();
  const finalReflection = reflections[reflections.length - 1];

  return (
    <motion.div 
      className="terminal-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2 }}
    >
      {/* Ambient stillness effect */}
      <div className="terminal-vignette" />
      
      <div className="terminal-content">
        {/* Terminal header */}
        <motion.div 
          className="terminal-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1.5 }}
        >
          <div className="terminal-line" />
          <span className="terminal-label">Reflection Complete</span>
          <div className="terminal-line" />
        </motion.div>

        {/* Final reflection display */}
        <motion.div 
          className="terminal-reflection"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1.5 }}
        >
          <div className="final-timestamp">
            {finalReflection?.timestamp || 'Looking back across a lifetime'}
          </div>
          
          <div className="final-content">
            {finalReflection?.content.split('\n\n').map((paragraph, index) => (
              <motion.p 
                key={index}
                className="final-paragraph"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 + index * 0.3, duration: 1 }}
              >
                {paragraph}
              </motion.p>
            ))}
          </div>
        </motion.div>

        {/* Terminal message */}
        <motion.div 
          className="terminal-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 1.5 }}
        >
          <p className="message-primary">
            This reflection is complete.
          </p>
          <p className="message-secondary">
            This future cannot be revisited.
          </p>
        </motion.div>

        {/* Closing statement */}
        <motion.div 
          className="terminal-closing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 4, duration: 1.5 }}
        >
          <p>
            What you do with these reflections is entirely yours to decide.
          </p>
          <p className="closing-note">
            The instrument has fulfilled its purpose.
          </p>
        </motion.div>

        {/* Session metadata */}
        <motion.div 
          className="terminal-meta"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 5, duration: 1 }}
        >
          <span>9 perspectives explored</span>
          <span className="meta-separator">·</span>
          <span>One future examined</span>
          <span className="meta-separator">·</span>
          <span>No alternatives generated</span>
        </motion.div>
      </div>

      {/* Subtle breathing animation */}
      <motion.div 
        className="terminal-breath"
        animate={{
          opacity: [0.02, 0.05, 0.02],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
}
