import { Bell, Calendar, Shield, User } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
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
        
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-xl font-medium text-secondary-foreground">
            A
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Alex Johnson</p>
            <p className="text-xs text-muted-foreground">alex.johnson@university.edu</p>
            <p className="text-xs text-muted-foreground mt-1">Spring 2025 · 4 courses</p>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="card-elevated p-5 animate-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Notifications</h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-foreground">Push Notifications</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive reminders on your device
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-foreground">Email Notifications</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive reminders via email
              </p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium text-foreground">Default Reminder Time</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When to send assignment reminders
              </p>
            </div>
            <Select defaultValue="24h">
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 hour before</SelectItem>
                <SelectItem value="3h">3 hours before</SelectItem>
                <SelectItem value="24h">24 hours before</SelectItem>
                <SelectItem value="48h">48 hours before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Calendar Sync Section */}
      <div className="card-elevated p-5 animate-fade-up" style={{ animationDelay: '150ms' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Calendar Sync</h2>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sync your class schedule to your external calendar. Assignment due dates stay in SyllabusOS.
          </p>
          
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1">
              Connect Google Calendar
            </Button>
            <Button variant="outline" className="flex-1">
              Connect Apple Calendar
            </Button>
          </div>
        </div>
      </div>

      {/* Privacy Section */}
      <div className="card-elevated p-5 animate-fade-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <Shield className="w-4 h-4 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Privacy & Data</h2>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your syllabi and academic data are stored securely and never shared with third parties.
          </p>
          
          <div className="flex gap-3">
            <Button variant="outline">Export My Data</Button>
            <Button variant="outline" className="text-destructive hover:text-destructive">
              Delete All Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
