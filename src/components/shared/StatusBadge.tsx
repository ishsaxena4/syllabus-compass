import { cn } from '@/lib/utils';

type Status = 'upcoming' | 'due-soon' | 'overdue' | 'completed' | 'attention';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'status-upcoming' },
  'due-soon': { label: 'Due Soon', className: 'status-due-soon' },
  overdue: { label: 'Past due', className: 'status-attention' },
  completed: { label: 'Done', className: 'status-completed' },
  attention: { label: 'Needs Review', className: 'status-attention' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn(config.className, className)}>
      {config.label}
    </span>
  );
}
