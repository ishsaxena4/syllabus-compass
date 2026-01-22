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
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const [displayName, setDisplayName] = useState('Alex');

  useEffect(() => {
    const justSignedIn = sessionStorage.getItem('justSignedIn');
    const storedName = sessionStorage.getItem('displayName');
    
    if (justSignedIn === 'true') {
      setDisplayName(storedName || 'Alex');
      setIsAnimating(true);
      setShowContent(false);
      
      // Clear the flag
      sessionStorage.removeItem('justSignedIn');
      sessionStorage.removeItem('displayName');
      
      // After 1 second, move greeting to top and show content
      const timer = setTimeout(() => {
        setIsAnimating(false);
        // Small delay before showing content for smooth transition
        setTimeout(() => setShowContent(true), 300);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="space-y-8 relative">
      {/* Header - animates from center to top */}
      <motion.div
        className="text-center"
        initial={isAnimating ? { 
          position: 'fixed',
          top: '50%',
          left: '50%',
          x: '-50%',
          y: '-50%',
          zIndex: 50
        } : false}
        animate={isAnimating ? {
          position: 'fixed',
          top: '50%',
          left: '50%',
          x: '-50%',
          y: '-50%',
          zIndex: 50
        } : {
          position: 'relative',
          top: 'auto',
          left: 'auto',
          x: 0,
          y: 0,
          zIndex: 1
        }}
        transition={{
          duration: 0.6,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        <motion.p 
          className="text-sm text-muted-foreground"
          initial={isAnimating ? { opacity: 0 } : { opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ delay: isAnimating ? 0.6 : 0 }}
        >
          {format(today, 'EEEE, MMMM d')}
        </motion.p>
        <motion.h1 
          className="text-3xl font-display font-light tracking-tight text-foreground mt-1"
          initial={isAnimating ? { scale: 1.2 } : { scale: 1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          {greeting}, <span className="font-medium">{displayName}</span>
        </motion.h1>
      </motion.div>

      {/* Main Grid - appears after greeting animation */}
      <AnimatePresence>
        {showContent && (
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
