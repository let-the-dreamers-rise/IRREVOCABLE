/**
 * Ambient Background
 * Subtle, slow-moving atmospheric elements
 * Creates the feeling of being in a temporal chamber
 */

import { motion } from 'framer-motion';
import './AmbientBackground.css';

export function AmbientBackground() {
  return (
    <div className="ambient-container">
      {/* Grain overlay for texture */}
      <div className="temporal-grain" />
      
      {/* Slow-moving ambient orbs */}
      <motion.div 
        className="ambient-orb ambient-orb-1"
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 30, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div 
        className="ambient-orb ambient-orb-2"
        animate={{
          x: [0, -40, 20, 0],
          y: [0, 30, -40, 0],
          scale: [1, 0.9, 1.05, 1],
        }}
        transition={{
          duration: 80,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div 
        className="ambient-orb ambient-orb-3"
        animate={{
          x: [0, 20, -30, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.05, 0.92, 1],
        }}
        transition={{
          duration: 70,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Horizontal temporal lines */}
      <div className="temporal-lines">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="temporal-line"
            style={{ top: `${20 + i * 15}%` }}
            animate={{
              opacity: [0.02, 0.05, 0.02],
              scaleX: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 20 + i * 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 3
            }}
          />
        ))}
      </div>
    </div>
  );
}
