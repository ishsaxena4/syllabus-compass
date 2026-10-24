import { useState, useEffect } from 'react';
import { User, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Profile {
  first_name: string;
  last_name: string;
  organization: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>({ first_name: '', last_name: '', organization: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, organization')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          organization: data.organization || '',
        });
      }
      setLoading(false);
    }
    
    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    
    // Check if profile exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    let error;
    if (existing) {
      // Update existing profile
      const result = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name || null,
          last_name: profile.last_name || null,
          organization: profile.organization || null,
        })
        .eq('user_id', user.id);
      error = result.error;
    } else {
      // Insert new profile
      const result = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          first_name: profile.first_name || null,
          last_name: profile.last_name || null,
          organization: profile.organization || null,
        });
      error = result.error;
    }
    
    setSaving(false);
    
    if (error) {
      toast.error('Failed to save profile');
      console.error(error);
    } else {
      toast.success('Profile saved successfully');
      // Update sessionStorage so dashboard greeting updates
      if (profile.first_name) {
        sessionStorage.setItem('user_first_name', profile.first_name);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your preferences and integrations
        </p>
      </div>

      {/* Profile Section */}
      <div className="card-elevated p-5 animate-fade-up" style={{ animationDelay: '50ms' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Profile</h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Enter your first name"
                  value={profile.first_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Enter your last name"
                  value={profile.last_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                placeholder="Your school, university, or company"
                value={profile.organization}
                onChange={(e) => setProfile(prev => ({ ...prev, organization: e.target.value }))}
              />
            </div>
            
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-3">
                {user?.email}
              </p>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Profile
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
