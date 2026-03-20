import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Upload, CheckCircle, AlertCircle, Loader2, Beaker,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { usePipeline, type UploadStep } from '@/lib/pipeline';
import { ReviewExtractedItems } from '@/components/upload/ReviewExtractedItems';
import { AddCourseDialog } from '@/components/shared/AddCourseDialog';
import type { Tables } from '@/integrations/supabase/types';

const PIPELINE_LABELS: Record<UploadStep, string> = {
  idle: '',
  uploading: 'Uploading file…',
  extracting: 'Extracting text from PDF…',
  processing: 'Analyzing syllabus…',
  ready: 'Ready for review!',
  error: 'Something went wrong',
};

const DEMO_TEXT = `CS 301 - Data Structures and Algorithms
Spring 2026

Instructor: Dr. Sarah Johnson
Email: sjohnson@university.edu
Office: Room 301, CS Building
Office Hours: MWF 2:00-3:00 PM

Class Schedule: MWF 10:30-11:20 AM
Location: Room 204, Engineering Hall

Course Schedule and Assignments:

Homework 1: Arrays and Linked Lists - Due January 27, 2026
Quiz 1: Basic Data Structures - February 3, 2026
Homework 2: Stacks and Queues - Due February 10, 2026
Midterm Exam - February 24, 2026 at 10:30 AM
Project Proposal - Due March 10, 2026
Lab 1: Binary Search Trees - Due March 17, 2026
Homework 3: Graph Algorithms - Due April 7, 2026
Reading: Chapter 12 Dynamic Programming - Due April 14, 2026
Final Project Presentation - TBD (Week 15)
Final Exam - May 4, 2026 at 8:00 AM`;

export default function UploadPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const pipeline = usePipeline();

  const reviewId = searchParams.get('review');

  const [courses, setCourses] = useState<Tables<'courses'>[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [step, setStep] = useState<UploadStep>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [demoText, setDemoText] = useState(DEMO_TEXT);

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

  if (reviewId) {
    return <ReviewExtractedItems syllabusUploadId={reviewId} />;
  }

  async function processUpload(file: File | null, textOverride?: string) {
    if (!user) {
      toast.error('Please sign in');
      return;
    }
    if (!selectedCourseId) {
      toast.error('Please select a course first');
      return;
    }

    setErrorMsg('');
    setFileName(file?.name || 'demo-seed.txt');

    try {
      const result = await pipeline.processUpload({
        file,
        courseId: selectedCourseId,
        userId: user.id,
        textOverride,
        onProgress: (s, msg) => {
          setStep(s);
          if (s === 'ready' && msg) toast.success(msg);
        },
      });

      setTimeout(() => {
        navigate(`/upload?review=${result.uploadId}`);
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
    const file = Array.from(e.dataTransfer.files).find(
      f => f.type === 'application/pdf',
    );
    if (file) {
      processUpload(file);
    } else {
      toast.error('Please drop a PDF file');
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processUpload(file);
  }

  const isProcessing = step !== 'idle' && step !== 'error' && step !== 'ready';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center animate-fade-up">
        <h1 className="text-2xl font-semibold text-foreground">Upload Syllabus</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Upload your syllabus and we&rsquo;ll extract assignments, due dates, and course info
          automatically
        </p>
      </div>

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
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
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
          'card-elevated p-12 border-2 border-dashed transition-all duration-200 animate-fade-up relative',
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

          {step === 'idle' && (
            <>
              <h3 className="text-base font-medium text-foreground">
                {isDragging ? 'Drop your file here' : 'Drag & drop your syllabus PDF'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              <p className="text-xs text-muted-foreground mt-3">PDF files only</p>
            </>
          )}

          {isProcessing && (
            <div className="space-y-2">
              <h3 className="text-base font-medium text-foreground">
                {PIPELINE_LABELS[step]}
              </h3>
              {fileName && (
                <p className="text-xs text-muted-foreground">{fileName}</p>
              )}
            </div>
          )}

          {step === 'ready' && (
            <h3 className="text-base font-medium text-green-600">
              {PIPELINE_LABELS.ready}
            </h3>
          )}

          {step === 'error' && (
            <div className="space-y-2">
              <h3 className="text-base font-medium text-red-500">Error</h3>
              <p className="text-xs text-red-400 max-w-sm">{errorMsg}</p>
              <Button size="sm" variant="outline" onClick={() => setStep('idle')}>
                Try Again
              </Button>
            </div>
          )}

          {step === 'idle' && (
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          )}
        </div>
      </div>

      {/* Demo / Seed Tool */}
      <div className="animate-fade-up" style={{ animationDelay: '150ms' }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDemo(!showDemo)}
          className="text-xs text-muted-foreground"
        >
          <Beaker className="w-3 h-3 mr-1" />
          {showDemo ? 'Hide' : 'Show'} demo / seed tool
        </Button>

        {showDemo && (
          <div className="mt-3 space-y-3 card-elevated p-4">
            <p className="text-xs text-muted-foreground">
              Paste or edit sample syllabus text below, then click &ldquo;Process&rdquo; to
              test the pipeline without uploading a PDF.
            </p>
            <Textarea
              value={demoText}
              onChange={e => setDemoText(e.target.value)}
              rows={10}
              className="text-xs font-mono"
            />
            <Button
              size="sm"
              disabled={isProcessing || !selectedCourseId || !demoText.trim()}
              onClick={() => processUpload(null, demoText)}
            >
              {isProcessing ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : null}
              Process Demo Text
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
