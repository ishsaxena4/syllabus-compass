import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CourseColor } from '@/types';

const COURSE_COLORS: { value: CourseColor; label: string }[] = [
  { value: 'sage', label: 'Sage' },
  { value: 'coral', label: 'Coral' },
  { value: 'sky', label: 'Sky' },
  { value: 'amber', label: 'Amber' },
  { value: 'lavender', label: 'Lavender' },
  { value: 'rose', label: 'Rose' },
];

const DAYS = ['Monday', 'Wednesday', 'Friday', 'Tuesday', 'Thursday', 'Saturday', 'Sunday'];

interface AddCourseDialogProps {
  onCourseAdded?: () => void;
}

export function AddCourseDialog({ onCourseAdded }: AddCourseDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [professor, setProfessor] = useState('');
  const [professorEmail, setProfessorEmail] = useState('');
  const [color, setColor] = useState<CourseColor>('sage');

  const resetForm = () => {
    setName('');
    setSection('');
    setProfessor('');
    setProfessorEmail('');
    setColor('sage');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a course name');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be signed in');
        return;
      }

      const { error } = await supabase.from('courses').insert({
        name: name.trim(),
        section: section.trim() || null,
        professor_name: professor.trim() || null,
        professor_email: professorEmail.trim() || null,
        color,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success('Course added');
      resetForm();
      setOpen(false);
      onCourseAdded?.();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">Add Course</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] p-0 gap-0 rounded-2xl border-border bg-card overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-primary" />
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">New Course</DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Course Name</Label>
            <Input
              placeholder="e.g. Introduction to Psychology"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              autoFocus
            />
          </div>

          {/* Section */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Section / Code (optional)</Label>
            <Input
              placeholder="e.g. PSY 101"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Professor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Professor</Label>
              <Input
                placeholder="e.g. Dr. Smith"
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Professor Email</Label>
              <Input
                type="email"
                placeholder="email@university.edu"
                value={professorEmail}
                onChange={(e) => setProfessorEmail(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Color</Label>
            <div className="flex items-center gap-2">
              {COURSE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: `hsl(var(--course-${c.value}))` }}
                  title={c.label}
                />
              ))}
            </div>
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
            {isSubmitting ? 'Adding...' : 'Add Course'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}