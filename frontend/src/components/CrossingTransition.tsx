/**
 * Crossing Transition
 * The moment of crossing from present to future
 * A dramatic, slow transition that feels like time passing
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore, generateFutureTimestamp } from '../store/sessionStore';
import './CrossingTransition.css';

export function CrossingTransition() {
  const { addReflection } = useSessionStore();

  useEffect(() => {
    let isMounted = true;
    
    // Wait for the visual transition, then add the real reflection from backend
    const completeTransition = async () => {
      // Wait for the visual transition animation
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      if (!isMounted) return;
      
      // Get the pending reflection from sessionStorage (set by DecisionRitual)
      const pendingReflectionJson = sessionStorage.getItem('pendingReflection');
      
      if (pendingReflectionJson) {
        try {
          const reflectionData = JSON.parse(pendingReflectionJson);
          sessionStorage.removeItem('pendingReflection');
          
          console.log('[CrossingTransition] Adding reflection with turnNumber:', reflectionData.turnNumber);
          
          // Add the real reflection from backend
          addReflection(reflectionData);
        } catch (e) {
          console.error('[CrossingTransition] Error parsing pending reflection:', e);
          // Fallback to mock if something went wrong
          addReflection({
            turnNumber: 1,
            content: generateMockInitialReflectionText(),
            timestamp: generateFutureTimestamp(1),
            consequenceScore: 0.72
          });
        }
      } else {
        console.log('[CrossingTransition] No pending reflection found, using fallback');
        // Fallback if no pending reflection (shouldn't happen in normal flow)
        addReflection({
          turnNumber: 1,
          content: generateMockInitialReflectionText(),
          timestamp: generateFutureTimestamp(1),
          consequenceScore: 0.72
        });
      }
    };

    completeTransition();
    
    return () => {
      isMounted = false;
    };
  }, [addReflection]);

  return (
    <motion.div 
      className="crossing-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
    >
      {/* Expanding circle */}
      <motion.div 
        className="crossing-circle"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: [0, 1, 20],
          opacity: [0, 0.3, 0]
        }}
        transition={{ 
          duration: 4,
          times: [0, 0.3, 1],
          ease: "easeInOut"
        }}
      />
      
      {/* Crossing text */}
      <motion.div 
        className="crossing-text"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ 
          duration: 4,
          times: [0, 0.2, 0.7, 1]
        }}
      >
        <motion.p 
          className="crossing-label"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ duration: 1 }}
        >
          Crossing into the future
        </motion.p>
        
        <motion.div 
          className="crossing-line"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
        />
        
        <motion.p 
          className="crossing-subtext"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          There is no return from here
        </motion.p>
      </motion.div>

      {/* Particle effect */}
      <div className="crossing-particles">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="crossing-particle"
            initial={{ 
              x: 0, 
              y: 0, 
              opacity: 0,
              scale: 0
            }}
            animate={{ 
              x: (Math.random() - 0.5) * 400,
              y: (Math.random() - 0.5) * 400,
              opacity: [0, 0.5, 0],
              scale: [0, 1, 0]
            }}
            transition={{ 
              duration: 3,
              delay: 0.5 + i * 0.1,
              ease: "easeOut"
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Mock reflection generator (fallback only, real reflections come from backend)
function generateMockInitialReflectionText(): string {
  return `Looking back at this moment of decision, I find myself holding a complex tapestry of feelings. There's a quiet grief for the path I didn't take, mixed with something that might be relief—or perhaps it's just the absence of that particular uncertainty.

I notice I've changed in ways I couldn't have predicted. The person who made this choice feels both familiar and distant, like looking at an old photograph. Some days I catch myself wondering about the other version of me, the one who chose differently. Not with regret, exactly, but with a kind of tender curiosity.

The weight of this decision hasn't disappeared—it's transformed. What once felt like a burden has become part of my foundation, something I've built upon rather than carried. There are mornings when I wake with a sense of rightness, and others when the old doubts surface like memories of a dream.

I've learned that certainty was never the goal. The peace I've found isn't about knowing I made the "right" choice—it's about accepting that I made a choice, fully and completely, and allowed myself to become whoever that choice would shape me into.`;
}
