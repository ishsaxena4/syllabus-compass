import { format } from 'date-fns';
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines';
import { TodaySection } from '@/components/dashboard/TodaySection';
import { AttentionNeeded } from '@/components/dashboard/AttentionNeeded';
import { ThemePicker } from '@/components/shared/ThemePicker';
import { mockCourses, mockAssignments, mockAttentionItems } from '@/data/mockData';

export default function Dashboard() {
  const today = new Date();
  const greeting = getGreeting();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up text-center">
        <p className="text-sm text-muted-foreground">{format(today, 'EEEE, MMMM d')}</p>
        <h1 className="text-2xl font-semibold text-foreground mt-1">
          {greeting}, Alex
        </h1>
        <div className="flex justify-center mt-4">
          <ThemePicker />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
            <UpcomingDeadlines assignments={mockAssignments} courses={mockCourses} />
          </div>
        </div>

        {/* Right Column - Secondary Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="animate-fade-up" style={{ animationDelay: '150ms' }}>
            <TodaySection assignments={mockAssignments} courses={mockCourses} />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
            <AttentionNeeded items={mockAttentionItems} courses={mockCourses} />
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
