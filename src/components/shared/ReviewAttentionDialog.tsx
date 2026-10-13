import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarIcon, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { AttentionItem, Course } from '@/types';
import { CoursePill } from '@/components/shared/CoursePill';
import { AssignmentTypeIcon } from '@/components/shared/AssignmentTypeIcon';
import { useResolveAttentionItem } from '@/hooks/useAcademicData';
import { toast } from 'sonner';

interface ReviewAttentionDialogProps {
  item: AttentionItem | null;
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: (itemId: string) => void;
}

const ATTENTION_LABELS: Record<AttentionItem['type'], string> = {
  'missing-date': 'No date yet',
  'low-confidence': 'Low confidence',
  unconfirmed: 'Needs confirmation',
};

const DEFAULT_TIME = '23:59';

export function ReviewAttentionDialog({ item, course, open, onOpenChange, onResolved }: ReviewAttentionDialogProps) {
  const { mutateAsync, isPending } = useResolveAttentionItem();
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState(DEFAULT_TIME);

  // Start from the item's current date and time each time a new item opens.
  useEffect(() => {
    setDate(item?.dueDate ?? undefined);
    setTime(item?.dueDate ? format(item.dueDate, 'HH:mm') : DEFAULT_TIME);
  }, [item]);

  if (!item) return null;

  const needsDate = item.type === 'missing-date';

  async function run(action: 'save' | 'dismiss') {
    if (!item) return;
    try {
      if (action === 'dismiss') {
        await mutateAsync({ id: item.id, action: 'dismiss' });
        toast('Dismissed');
      } else {
        let dueAt: string | null = null;
        if (date) {
          const [h, m] = (time || DEFAULT_TIME).split(':').map(Number);
          const local = new Date(date);
          local.setHours(h, m, 0, 0);
          dueAt = local.toISOString();
        }
        await mutateAsync({ id: item.id, action: 'save', dueAt });
        toast.success(dueAt ? `Saved for ${format(new Date(dueAt), 'MMM d, h:mm a')}` : 'Confirmed');
      }
      onOpenChange(false);
      onResolved?.(item.id);
    } catch {
      toast.error('Could not save. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 rounded-2xl border-border bg-card overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-course-coral/10 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-course-coral" />
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">{item.title}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">Review this assignment</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-course-coral/10 text-course-coral">
                {ATTENTION_LABELS[item.type]}
              </span>
              {course && <CoursePill name={course.section || course.name} color={course.color} />}
              <AssignmentTypeIcon type={item.assignmentType} />
            </div>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal h-10', !date && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
                    {date ? format(date, 'EEE, MMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10 w-[130px]" />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-secondary/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => run('dismiss')}
            disabled={isPending}
            className="text-muted-foreground"
          >
            Dismiss
          </Button>
          <Button size="sm" onClick={() => run('save')} disabled={isPending || (needsDate && !date)}>
            {isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
            {needsDate ? 'Save date' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
