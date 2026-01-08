import { useState, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface FileItem {
  id: string;
  name: string;
  size: number;
  state: UploadState;
  progress?: number;
}

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(
      (f) => f.type === 'application/pdf' || 
             f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    if (validFiles.length > 0) {
      addFiles(validFiles);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
  }, []);

  const addFiles = (newFiles: File[]) => {
    const fileItems: FileItem[] = newFiles.map((file) => ({
      id: Math.random().toString(36).slice(2),
      name: file.name,
      size: file.size,
      state: 'uploading' as UploadState,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...fileItems]);

    // Simulate upload progress
    fileItems.forEach((fileItem) => {
      simulateUpload(fileItem.id);
    });
  };

  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        clearInterval(interval);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, state: 'success', progress: 100 } : f
          )
        );
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, progress: Math.min(progress, 95) } : f
          )
        );
      }
    }, 200);
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const successfulFiles = files.filter((f) => f.state === 'success');

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center animate-fade-up">
        <h1 className="text-2xl font-semibold text-foreground">Upload Syllabus</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Upload your syllabus and we'll extract assignments, due dates, and course info automatically
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'card-elevated p-12 border-2 border-dashed transition-all duration-200 animate-fade-up',
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-muted-foreground/50',
        )}
        style={{ animationDelay: '100ms' }}
      >
        <div className="flex flex-col items-center text-center">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors',
            isDragging ? 'bg-primary/10' : 'bg-secondary'
          )}>
            <Upload className={cn(
              'w-8 h-8 transition-colors',
              isDragging ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>
          
          <h3 className="text-base font-medium text-foreground">
            {isDragging ? 'Drop your files here' : 'Drag & drop your syllabus'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Supports PDF and DOCX files
          </p>

          <input
            type="file"
            accept=".pdf,.docx"
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: '150ms' }}>
          <h3 className="text-sm font-medium text-foreground">Uploaded Files</h3>
          
          {files.map((file) => (
            <div
              key={file.id}
              className="card-elevated p-4 flex items-center gap-4"
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                file.state === 'success' ? 'bg-course-sage/10' : 'bg-secondary'
              )}>
                {file.state === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-course-sage" />
                ) : file.state === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-course-coral" />
                ) : (
                  <FileText className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  {file.state === 'uploading' && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(file.progress || 0)}%
                      </span>
                    </>
                  )}
                  {file.state === 'success' && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-course-sage">Ready for review</span>
                    </>
                  )}
                </div>
                
                {file.state === 'uploading' && (
                  <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${file.progress || 0}%` }}
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => removeFile(file.id)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}

          {successfulFiles.length > 0 && (
            <Button className="w-full mt-4" size="lg">
              Review & Confirm Extraction
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
