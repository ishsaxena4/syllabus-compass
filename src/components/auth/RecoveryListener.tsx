import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { RESET_PASSWORD_PATH } from '@/lib/recoveryRedirect';

// Second line of defence after lib/recoveryRedirect: if Supabase reports a password
// recovery while the user is on any other page, take them to the reset form instead
// of leaving them signed in on the dashboard.
export function RecoveryListener() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== RESET_PASSWORD_PATH) {
        navigate(RESET_PASSWORD_PATH, { replace: true });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return null;
}
