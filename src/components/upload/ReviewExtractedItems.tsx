import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Check, X, Pencil, Loader2, Sparkles,
  Mail, Clock, BookOpen, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePipeline, type ExtractedItem } from '@/lib/pipeline';

const ASSIGNMENT_TYPES = [
  'homework', 'quiz', 'exam', 'project', 'reading', 'lab', 'other',
] as const;

const WEEKDAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
] as const;

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={cn(
      'text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide',
      colors[confidence] || colors.low,
    )}>
      {confidence}
    </span>
  );
}

function formatDueAt(dueAt: string | null, timeInferred?: boolean): string {
  if (!dueAt) return 'No date set';
  try {
    const d = new Date(dueAt);
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${date} at ${time}${timeInferred ? ' (inferred)' : ''}`;
  } catch {
    return dueAt;
  }
}

interface Props {
  syllabusUploadId: string;
}

export function ReviewExtractedItems({ syllabusUploadId }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pipeline = usePipeline();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [acceptingAll, setAcceptingAll] = useState(false);

  useEffect(() => {
    load();
  }, [syllabusUploadId]);

  async function load() {
    setLoading(true);
    try {
      const data = await pipeline.fetchExtractedItems(syllabusUploadId);
      setItems(data);
    } catch {
      toast.error('Failed to load extracted items');
      setItems([]);
    }
    setLoading(false);
  }

  const assignments = items.filter(i => i.item_kind === 'assignment');
  const emails = items.filter(i => i.item_kind === 'professor_email');
  const meetings = items.filter(i => i.item_kind === 'meeting_time');
  const highCount = items.filter(i => i.confidence === 'high').length;

  function startEdit(item: ExtractedItem) {
    setEditingId(item.id);
    setEditData({ ...(item.payload as Record<string, any>) });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData({});
  }

  async function saveEdit(item: ExtractedItem) {
    const newTitle = editData.title || editData.email || item.title;
    try {
      await pipeline.updateItem(item.id, { payload: editData, title: newTitle });
      setItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, payload: editData, title: newTitle } : i)),
      );
      await queryClient.invalidateQueries({ queryKey: ['attention-items'] });
      setEditingId(null);
      setEditData({});
      toast.success('Item updated');
    } catch {
      toast.error('Failed to save changes');
    }
  }

  async function accept(item: ExtractedItem) {
    if (!user) return;
    setBusyIds(prev => new Set(prev).add(item.id));

    try {
      await pipeline.acceptItem(item, user.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assignments'] }),
        queryClient.invalidateQueries({ queryKey: ['courses'] }),
        queryClient.invalidateQueries({ queryKey: ['attention-items'] }),
      ]);
      toast.success(`Accepted: ${item.title || item.item_kind}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept item');
    } finally {
      setBusyIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function discard(id: string) {
    try {
      await pipeline.discardItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      await queryClient.invalidateQueries({ queryKey: ['attention-items'] });
      toast.info('Item discarded');
    } catch {
      toast.error('Failed to discard item');
    }
  }

  async function acceptAllHigh() {
    const highItems = items.filter(i => i.confidence === 'high');
    if (highItems.length === 0) return;
    setAcceptingAll(true);
    for (const item of highItems) {
      await accept(item);
    }
    setAcceptingAll(false);
  }

  function renderItemCard(item: ExtractedItem) {
    const isEditing = editingId === item.id;
    const isBusy = busyIds.has(item.id);
    const p = item.payload as any;
    const isHigh = item.confidence === 'high';

    return (
      <div
        key={item.id}
        className={cn(
          'card-elevated p-4 transition-all',
          isHigh && 'ring-1 ring-green-500/20',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-medium truncate max-w-[280px]">{item.title}</h4>
              <ConfidenceBadge confidence={item.confidence} />
              {isHigh && (
                <span className="text-[10px] font-medium text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Auto-confirm suggested
                </span>
              )}
            </div>

            {item.item_kind === 'assignment' && (
              <p className="text-xs text-muted-foreground mt-1">
                Type: {p.type} &middot; {formatDueAt(p.due_at, p.time_inferred)}
              </p>
            )}
            {item.item_kind === 'professor_email' && (
              <p className="text-xs text-muted-foreground mt-1">{p.email}</p>
            )}
            {item.item_kind === 'meeting_time' && (
              <p className="text-xs text-muted-foreground mt-1">
                {(p.days || []).map((d: string) => d.toUpperCase()).join('/')}{' '}
                {p.start_time}–{p.end_time}
                {p.location && ` · ${p.location}`}
              </p>
            )}

            {item.source_snippet && (
              <p className="text-xs text-muted-foreground/70 mt-2 italic line-clamp-2">
                &ldquo;{item.source_snippet}&rdquo;
              </p>
            )}
          </div>

          {!isEditing && (
            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                onClick={() => accept(item)}
                disabled={isBusy || acceptingAll}
              >
                {isBusy
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Check className="w-3 h-3 mr-1" />}
                Accept
              </Button>
              <Button size="sm" variant="ghost" onClick={() => startEdit(item)} disabled={isBusy}>
                <Pencil className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => discard(item.id)} disabled={isBusy}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            {item.item_kind === 'assignment' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={editData.title || ''}
                    onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={editData.type || 'other'}
                      onValueChange={v => setEditData(d => ({ ...d, type: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ASSIGNMENT_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Due date &amp; time</Label>
                    <Input
                      type="datetime-local"
                      value={editData.due_at ? editData.due_at.substring(0, 16) : ''}
                      onChange={e => {
                        const v = e.target.value;
                        setEditData(d => ({
                          ...d,
                          due_at: v ? (v.length === 16 ? v + ':00' : v) : null,
                          time_inferred: false,
                        }));
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {item.item_kind === 'professor_email' && (
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={editData.email || ''}
                  onChange={e => setEditData(d => ({ ...d, email: e.target.value }))}
                />
              </div>
            )}

            {item.item_kind === 'meeting_time' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Days</Label>
                  <div className="flex gap-3 flex-wrap">
                    {WEEKDAYS.map(d => (
                      <label key={d.value} className="flex items-center gap-1.5 text-xs">
                        <Checkbox
                          checked={(editData.days || []).includes(d.value)}
                          onCheckedChange={checked => {
                            setEditData(prev => ({
                              ...prev,
                              days: checked
                                ? [...(prev.days || []), d.value]
                                : (prev.days || []).filter((v: string) => v !== d.value),
                            }));
                          }}
                        />
                        {d.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Start time</Label>
                    <Input
                      type="time"
                      value={editData.start_time || ''}
                      onChange={e => setEditData(d => ({ ...d, start_time: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End time</Label>
                    <Input
                      type="time"
                      value={editData.end_time || ''}
                      onChange={e => setEditData(d => ({ ...d, end_time: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Location</Label>
                    <Input
                      value={editData.location || ''}
                      onChange={e => setEditData(d => ({ ...d, location: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => saveEdit(item)}>Save</Button>
              <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-4 animate-fade-up">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">All items reviewed!</h2>
        <p className="text-sm text-muted-foreground">
          No more pending items for this upload.
        </p>
        <Button variant="outline" onClick={() => navigate('/upload')}>
          Back to Upload
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/upload')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </div>

      <div className="text-center animate-fade-up">
        <h1 className="text-2xl font-semibold text-foreground">Review Extracted Items</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {items.length} item{items.length !== 1 ? 's' : ''} found &middot;{' '}
          {highCount} high confidence
        </p>
      </div>

      {highCount > 0 && (
        <div className="animate-fade-up" style={{ animationDelay: '50ms' }}>
          <Button
            onClick={acceptAllHigh}
            disabled={acceptingAll}
            className="w-full"
            variant="outline"
          >
            {acceptingAll
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <Sparkles className="w-4 h-4 mr-2" />}
            Accept All High-Confidence ({highCount})
          </Button>
        </div>
      )}

      {assignments.length > 0 && (
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">
              Assignments ({assignments.length})
            </h3>
          </div>
          {assignments.map(renderItemCard)}
        </div>
      )}

      {emails.length > 0 && (
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">
              Professor Email ({emails.length})
            </h3>
          </div>
          {emails.map(renderItemCard)}
        </div>
      )}

      {meetings.length > 0 && (
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">
              Meeting Times ({meetings.length})
            </h3>
          </div>
          {meetings.map(renderItemCard)}
        </div>
      )}
    </div>
  );
}
