import { useState } from 'react';
import { Plus, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CourseOption {
  id: string;
  name: string;
  section?: string;
}

interface AddAssignmentCardProps {
  courses?: CourseOption[];
  fixedCourseId?: string;
  onAssignmentAdded?: () => void;
}

const ASSIGNMENT_TYPES = [
  { value: 'homework', label: 'Homework' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'exam', label: 'Exam' },
  { value: 'project', label: 'Project' },
  { value: 'reading', label: 'Reading' },
  { value: 'lab', label: 'Lab' },
  { value: 'other', label: 'Other' },
] as const;


export function AddAssignmentCard({ courses, fixedCourseId, onAssignmentAdded }: AddAssignmentCardProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState(fixedCourseId || '');
  const [type, setType] = useState<string>('homework');
  const [dueDate, setDueDate] = useState<Date>();
  const [dueTime, setDueTime] = useState('23:59');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setTitle('');
    setCourseId(fixedCourseId || '');
    setType('homework');
    setDueDate(undefined);
    setDueTime('23:59');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!courseId && !fixedCourseId) {
      toast.error('Please select a course');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be signed in');
        return;
      }

      let dueAt: string | null = null;
      if (dueDate) {
        const [hours, minutes] = dueTime.split(':').map(Number);
        const d = new Date(dueDate);
        d.setHours(hours, minutes, 0, 0);
        dueAt = d.toISOString();
      }

      const { error } = await supabase.from('assignments').insert({
        title: title.trim(),
        course_id: fixedCourseId || courseId,
        type: type as any,
        due_at: dueAt,
        notes: notes.trim() || null,
        user_id: user.id,
        confirmed: true,
        confidence: 'high',
      });

      if (error) throw error;

      toast.success('Assignment added');
      resetForm();
      setOpen(false);
      onAssignmentAdded?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <button className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 card-elevated">
          <Plus className="w-4 h-4" />
          Add Assignment
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] p-0 gap-0 rounded-2xl border-border bg-card overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-primary" />
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">New Assignment</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="assignment-title" className="text-xs text-muted-foreground">Title</Label>
            <Input
              id="assignment-title"
              placeholder="e.g. Problem Set 8"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              autoFocus
            />
          </div>

          {/* Course selector (only if not fixed) */}
          {!fixedCourseId && courses && courses.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.section ? `${c.section} — ${c.name}` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date & Time — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-10',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
                    {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Due Time</Label>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="h-10"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
            <Textarea
              placeholder="Any extra details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2 bg-secondary/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { resetForm(); setOpen(false); }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="sm"
          >
            {isSubmitting ? 'Adding...' : 'Add Assignment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
