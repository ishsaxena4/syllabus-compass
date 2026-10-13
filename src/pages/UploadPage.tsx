import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Upload, CheckCircle, AlertCircle, Loader2, FileText, X, ChevronRight, ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePendingReviews } from '@/hooks/useAcademicData';
import { toast } from 'sonner';
import { usePipeline, type UploadStep } from '@/lib/pipeline';
import { ReviewExtractedItems } from '@/components/upload/ReviewExtractedItems';
import { AddCourseDialog } from '@/components/shared/AddCourseDialog';
import type { Tables } from '@/integrations/supabase/types';

const PIPELINE_LABELS: Record<UploadStep, string> = {
  idle: '',
  uploading: 'Uploading files…',
  processing: 'Reading your syllabus…',
  ready: 'Ready for review!',
  error: 'Something went wrong',
};

const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp'];

function isSupportedSyllabusFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const pipeline = usePipeline();
  const { data: pendingReviews = [] } = usePendingReviews();

  const reviewId = searchParams.get('review');
  const reviewIds = reviewId
    ? reviewId.split(',').map(v => v.trim()).filter(Boolean)
    : [];

  const [courses, setCourses] = useState<Tables<'courses'>[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<UploadStep>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (user) refreshCourses();
  }, [user]);

  async function refreshCourses() {
    if (!user) return;
    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setCourses(data);
  }

  if (reviewIds.length > 0) {
    return <ReviewExtractedItems syllabusUploadIds={reviewIds} />;
  }

  function addFiles(incoming: File[]) {
    const supported = incoming.filter(isSupportedSyllabusFile);
    if (supported.length < incoming.length) {
      toast.error('Some files were skipped. Supported: PDF, DOCX, PNG, JPG, WEBP');
    }
    const tooBig = supported.filter(f => f.size > MAX_FILE_BYTES);
    if (tooBig.length > 0) {
      toast.error(`Files must be under 25 MB: ${tooBig.map(f => f.name).join(', ')}`);
    }
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      const next = [...prev, ...supported.filter(f => f.size <= MAX_FILE_BYTES && !names.has(f.name))];
      if (next.length > MAX_FILES) toast.error(`Up to ${MAX_FILES} files per course`);
      return next.slice(0, MAX_FILES);
    });
  }

  function removeFile(name: string) {
    setFiles(prev => prev.filter(f => f.name !== name));
  }

  async function extract() {
    if (!user) {
      toast.error('Please sign in');
      return;
    }
    if (!selectedCourseId) {
      toast.error('Please select a course first');
      return;
    }
    if (files.length === 0) {
      toast.error('Please add at least one file');
      return;
    }

    setErrorMsg('');
    try {
      const result = await pipeline.processUploads({
        files,
        courseId: selectedCourseId,
        userId: user.id,
        studentNotes: notes,
        onProgress: (s, msg) => {
          setStep(s);
          setProgressMsg(msg || '');
        },
      });

      if (result.createdCount === 0) {
        toast.warning('No items were found. Check the warnings on the next screen.');
      } else {
        toast.success(`Found ${result.createdCount} items.`);
      }
      setTimeout(() => {
        navigate(`/upload?review=${result.uploadIds.join(',')}`);
      }, 600);
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err.message || 'An unknown error occurred');
      toast.error(err.message || 'Upload failed');
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  }

  const isProcessing = step === 'uploading' || step === 'processing';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center animate-fade-up">
        <h1 className="text-2xl font-semibold text-foreground">Upload Syllabus</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Add a course&rsquo;s syllabus and schedule. We&rsquo;ll read them together and pull out
          every deadline, meeting time, and instructor email for you to review.
        </p>
      </div>

      {/* Reviews left part-way through */}
      {pendingReviews.length > 0 && !isProcessing && (
        <div className="card-elevated divide-y divide-border animate-fade-up">
          {pendingReviews.map(p => {
            const course = courses.find(c => c.id === p.courseId);
            return (
              <button
                key={p.courseId}
                type="button"
                onClick={() => navigate(`/upload?review=${p.uploadIds.join(',')}`)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                <ListChecks className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">
                  {course ? course.name : 'A course'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {p.count} item{p.count === 1 ? '' : 's'} still to review
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {/* Course Selector */}
      <div className="animate-fade-up" style={{ animationDelay: '50ms' }}>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Select Course
        </label>
        {courses.length === 0 ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">No courses yet.</p>
            <AddCourseDialog onCourseAdded={refreshCourses} />
          </div>
        ) : (
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId} disabled={isProcessing}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a course…" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.section ? ` (${c.section})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'card-elevated p-10 border-2 border-dashed transition-all duration-200 animate-fade-up relative',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-muted-foreground/50',
          isProcessing && 'pointer-events-none opacity-60',
        )}
        style={{ animationDelay: '100ms' }}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors',
              isDragging ? 'bg-primary/10' : 'bg-secondary',
            )}
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : step === 'ready' ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : step === 'error' ? (
              <AlertCircle className="w-8 h-8 text-red-500" />
            ) : (
              <Upload
                className={cn(
                  'w-8 h-8 transition-colors',
                  isDragging ? 'text-primary' : 'text-muted-foreground',
                )}
              />
            )}
          </div>

          {(step === 'idle' || step === 'error') && (
            <>
              <h3 className="text-base font-medium text-foreground">
                {isDragging ? 'Drop your files here' : 'Drag & drop your syllabus and schedule'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              <p className="text-xs text-muted-foreground mt-3">
                PDF, DOCX, PNG, JPG, WEBP &middot; up to {MAX_FILES} files
              </p>
            </>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <h3 className="text-base font-medium text-foreground">{PIPELINE_LABELS[step]}</h3>
              {progressMsg && <p className="text-xs text-muted-foreground">{progressMsg}</p>}
            </div>
          )}

          {step === 'ready' && (
            <h3 className="text-base font-medium text-green-600">{PIPELINE_LABELS.ready}</h3>
          )}

          {(step === 'idle' || step === 'error') && (
            <input
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp"
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          )}
        </div>
      </div>

      {step === 'error' && (
        <div className="card-elevated p-3 border border-red-500/25 bg-red-500/5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
          <p className="text-xs text-red-500">{errorMsg}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-4 animate-fade-up">
          <ul className="space-y-2">
            {files.map(f => (
              <li key={f.name} className="card-elevated px-3 py-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{f.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatSize(f.size)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFile(f.name)}
                  disabled={isProcessing}
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </li>
            ))}
          </ul>

          <div>
            <label htmlFor="student-notes" className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Anything we should know? (optional)
            </label>
            <Textarea
              id="student-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. My recitation is Thursdays 2:30–3:20pm. I'm in section 018."
              rows={3}
              maxLength={2000}
              disabled={isProcessing}
            />
          </div>

          <Button
            className="w-full"
            onClick={extract}
            disabled={isProcessing || !selectedCourseId}
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {selectedCourseId
              ? `Extract from ${files.length} file${files.length === 1 ? '' : 's'}`
              : 'Select a course to continue'}
          </Button>
        </div>
      )}
    </div>
  );
}
