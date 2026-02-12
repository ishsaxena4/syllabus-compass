import { useState } from 'react';
import { AlertTriangle, CalendarIcon, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
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
import { toast } from 'sonner';

interface ReviewAttentionDialogProps {
  item: AttentionItem | null;
  course: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: (itemId: string) => void;
}

export function ReviewAttentionDialog({ item, course, open, onOpenChange, onResolved }: ReviewAttentionDialogProps) {
  const [confirmedDate, setConfirmedDate] = useState<Date>();
  const [resolution, setResolution] = useState('');

  const resetForm = () => {
    setConfirmedDate(undefined);
    setResolution('');
  };

  const handleResolve = () => {
    if (!item) return;
    toast.success('Item resolved');
    resetForm();
    onOpenChange(false);
    onResolved?.(item.id);
  };

  const handleDismiss = () => {
    if (!item) return;
    toast('Item dismissed');
    resetForm();
    onOpenChange(false);
    onResolved?.(item.id);
  };

  if (!item) return null;

  const typeLabels: Record<AttentionItem['type'], string> = {
    'ambiguous-date': 'Ambiguous Date',
    'missing-date': 'Missing Date',
    'conflict': 'Schedule Conflict',
    'low-confidence': 'Low Confidence',
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 rounded-2xl border-border bg-card overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-course-coral/10 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-course-coral" />
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">Review Item</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Item info */}
          <div className="p-4 rounded-xl bg-secondary/50 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-course-coral/10 text-course-coral">
                {typeLabels[item.type]}
              </span>
              {course && (
                <CoursePill name={course.section || course.name} color={course.color} />
              )}
            </div>
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>

          {/* Confirm date (for ambiguous/missing date types) */}
          {(item.type === 'ambiguous-date' || item.type === 'missing-date') && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Confirm Correct Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-10',
                      !confirmedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
                    {confirmedDate ? format(confirmedDate, 'MMM d, yyyy') : 'Select the correct date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={confirmedDate}
                    onSelect={setConfirmedDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Resolution notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
            <Textarea
              placeholder="Add any clarification or notes..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-secondary/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-muted-foreground"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Dismiss
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { resetForm(); onOpenChange(false); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              size="sm"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Resolve
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}