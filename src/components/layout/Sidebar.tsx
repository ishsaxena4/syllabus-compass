import { NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, BookOpen, Upload, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/calendar' },
  { id: 'courses', label: 'Courses', icon: BookOpen, path: '/courses' },
  { id: 'upload', label: 'Upload', icon: Upload, path: '/upload' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

interface Profile {
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
}

export function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, organization')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data) {
          setProfile(data);
        }
      };
      fetchProfile();
    }
  }, [user]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Sign out failed',
        description: error.message,
      });
    }
  };

  // Get user initial from profile name or email
  const userInitial = profile?.first_name?.charAt(0).toUpperCase() || 
    user?.email?.charAt(0).toUpperCase() || 'U';
  
  // Display name: prefer profile name, fall back to email
  const displayName = profile?.first_name 
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`
    : user?.email || 'User';
  
  // Organization from profile
  const organization = profile?.organization || 'Academic Planning';

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          SyllabusOS
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5 truncate" title={organization}>
          {organization}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer with user info and logout */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-secondary-foreground">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground">Spring 2025</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}