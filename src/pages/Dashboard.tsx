import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines';
import { TodaySection } from '@/components/dashboard/TodaySection';
import { AttentionNeeded } from '@/components/dashboard/AttentionNeeded';
import { AddAssignmentCard } from '@/components/shared/AddAssignmentCard';
import { supabase } from '@/integrations/supabase/client';
import { useAttentionItems, useLiveAssignments, useLiveCourses, useNeedsOnboarding } from '@/hooks/useAcademicData';

// Check sessionStorage synchronously to determine initial phase
function getInitialPhase(): 'centered' | 'transitioning' | 'complete' {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('justSignedIn') === 'true' ? 'centered' : 'complete';
  }
  return 'complete';
}

function getInitialDisplayName(): string {
  if (typeof window !== 'undefined') {
    const storedName = sessionStorage.getItem('displayName');
    return storedName || '';
  }
  return '';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const today = new Date();
  const greeting = getGreeting();
  const { data: courses = [], isLoading: coursesLoading } = useLiveCourses();
  const { data: assignments = [], isLoading: assignmentsLoading } = useLiveAssignments();
  const { data: attentionItems = [] } = useAttentionItems();
  const { data: needsOnboarding, isLoading: onboardingLoading } = useNeedsOnboarding();
  
  // Initialize phase synchronously to prevent flash
  const [phase, setPhase] = useState<'centered' | 'transitioning' | 'complete'>(getInitialPhase);
  const [displayName, setDisplayName] = useState(getInitialDisplayName);

  useEffect(() => {
    if (onboardingLoading) return;
    if (needsOnboarding) {
      navigate('/onboarding', { replace: true });
    }
  }, [needsOnboarding, onboardingLoading, navigate]);

  // Fetch profile if displayName not already set (returning users)
  useEffect(() => {
    async function fetchProfile() {
      if (displayName) return; // Already have a name from sessionStorage
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profile?.first_name) {
        setDisplayName(profile.first_name);
      } else {
        setDisplayName('there');
      }
    }
    
    fetchProfile();
  }, [displayName]);

  useEffect(() => {
    // Only run animation if we started in 'centered' phase
    if (phase === 'centered') {
      // Clear the flags immediately
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

  if (onboardingLoading || coursesLoading || assignmentsLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Loading your workspace...
      </div>
    );
  }

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
                <UpcomingDeadlines assignments={assignments} courses={courses} />
              </motion.div>
            </div>

            {/* Right Column - Secondary Content */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <TodaySection assignments={assignments} courses={courses} />
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <AttentionNeeded items={attentionItems} courses={courses} />
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                <AddAssignmentCard courses={courses.map(c => ({ id: c.id, name: c.name, section: c.section }))} />
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
