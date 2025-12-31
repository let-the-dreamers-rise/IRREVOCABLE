/**
 * Void State
 * The initial empty state before the user begins
 * A moment of stillness before the irreversible commitment
 */

import { motion } from 'framer-motion';
import { useSessionStore } from '../store/sessionStore';
import './VoidState.css';

export function VoidState() {
  const setPhase = useSessionStore((state) => state.setPhase);

  const handleBegin = () => {
    setPhase('awakening');
  };

  return (
    <motion.div 
      className="void-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2 }}
    >
      <div className="void-content">
        {/* Subtle breathing circle */}
        <motion.div 
          className="void-circle"
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Title */}
        <motion.h1 
          className="void-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1.5 }}
        >
          IRREVOCABLE
        </motion.h1>
        
        {/* Subtitle */}
        <motion.p 
          className="void-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1.5, duration: 1.5 }}
        >
          A bounded reflective instrument for irreversible decisions
        </motion.p>
        
        {/* Warning text */}
        <motion.p 
          className="void-warning"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 2.5, duration: 1.5 }}
        >
          This is not a conversation. This is not advice.<br />
          This is a mirror into one possible future.
        </motion.p>
        
        {/* Enter button */}
        <motion.button
          className="void-enter"
          onClick={handleBegin}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4, duration: 1 }}
          whileHover={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            transition: { duration: 0.3 }
          }}
        >
          <span className="enter-text">Enter</span>
          <span className="enter-subtext">There is no return</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
