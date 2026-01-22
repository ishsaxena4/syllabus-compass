import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines';
import { TodaySection } from '@/components/dashboard/TodaySection';
import { AttentionNeeded } from '@/components/dashboard/AttentionNeeded';
import { mockCourses, mockAssignments, mockAttentionItems } from '@/data/mockData';

export default function Dashboard() {
  const today = new Date();
  const greeting = getGreeting();
  
  const [phase, setPhase] = useState<'centered' | 'transitioning' | 'complete'>('complete');
  const [displayName, setDisplayName] = useState('Alex');

  useEffect(() => {
    const justSignedIn = sessionStorage.getItem('justSignedIn');
    const storedName = sessionStorage.getItem('displayName');
    
    if (justSignedIn === 'true') {
      setDisplayName(storedName || 'Alex');
      setPhase('centered');
      
      // Clear the flags
      sessionStorage.removeItem('justSignedIn');
      sessionStorage.removeItem('displayName');
      
      // After 2 seconds, start transition
      const timer1 = setTimeout(() => {
        setPhase('transitioning');
      }, 2000);
      
      // Complete the transition
      const timer2 = setTimeout(() => {
        setPhase('complete');
      }, 2600);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, []);

  return (
    <div className="space-y-8 relative">
      {/* Centered greeting overlay - shown initially after sign in */}
      <AnimatePresence>
        {phase === 'centered' && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ 
                y: '-40vh',
                scale: 0.7,
                opacity: 0
              }}
              transition={{ 
                duration: 0.6,
                ease: [0.4, 0, 0.2, 1]
              }}
            >
              <motion.p 
                className="text-sm text-muted-foreground mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {format(today, 'EEEE, MMMM d')}
              </motion.p>
              <h1 className="text-4xl md:text-5xl font-display font-light tracking-tight text-foreground">
                {greeting}, <span className="font-medium">{displayName}</span>
              </h1>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Normal header - appears after transition */}
      <motion.div 
        className="text-center"
        initial={phase !== 'complete' ? { opacity: 0 } : { opacity: 1 }}
        animate={{ opacity: phase === 'complete' ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-sm text-muted-foreground">
          {format(today, 'EEEE, MMMM d')}
        </p>
        <h1 className="text-3xl font-display font-light tracking-tight text-foreground mt-1">
          {greeting}, <span className="font-medium">{displayName}</span>
        </h1>
      </motion.div>

      {/* Main Grid - appears after greeting animation */}
      <AnimatePresence>
        {phase === 'complete' && (
          <motion.div 
            className="grid gap-6 lg:grid-cols-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Left Column - Main Content */}
            <div className="lg:col-span-3 space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <UpcomingDeadlines assignments={mockAssignments} courses={mockCourses} />
              </motion.div>
            </div>

            {/* Right Column - Secondary Content */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <TodaySection assignments={mockAssignments} courses={mockCourses} />
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <AttentionNeeded items={mockAttentionItems} courses={mockCourses} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
