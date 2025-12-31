/**
 * IRREVOCABLE
 * A Bounded Reflective AI Instrument
 * 
 * "One decision. One future. No revision."
 */

import { AnimatePresence } from 'framer-motion';
import { useSessionStore } from './store/sessionStore';
import { VoidState } from './components/VoidState';
import { DecisionRitual } from './components/DecisionRitual';
import { CrossingTransition } from './components/CrossingTransition';
import { ReflectionChamber } from './components/ReflectionChamber';
import { TerminalState } from './components/TerminalState';
import { AmbientBackground } from './components/AmbientBackground';

function App() {
  const phase = useSessionStore((state) => state.phase);

  return (
    <div className="instrument-container">
      <AmbientBackground />
      
      <AnimatePresence mode="wait">
        {phase === 'void' && <VoidState key="void" />}
        
        {(phase === 'awakening' || phase === 'decision' || phase === 'weighing') && (
          <DecisionRitual key="decision" />
        )}
        
        {phase === 'crossing' && <CrossingTransition key="crossing" />}
        
        {(phase === 'reflection' || phase === 'questioning' || phase === 'processing') && (
          <ReflectionChamber key="reflection" />
        )}
        
        {phase === 'terminal' && <TerminalState key="terminal" />}
      </AnimatePresence>
    </div>
  );
}

export default App;
