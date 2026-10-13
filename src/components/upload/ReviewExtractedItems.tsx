import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Check, X, Pencil, Loader2,
  Mail, Clock, BookOpen, CheckCircle2, AlertTriangle, CalendarX, Repeat, GraduationCap,
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
import { ASSIGNMENT_TYPES } from '@/types';
import {
  attentionReason, canAcceptItem, usePipeline, type ExtractedItem, type ExtractionSummary,
} from '@/lib/pipeline';
import { getFriendlySupabaseErrorMessage } from '@/lib/runtimeConfig';

const WEEKDAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
] as const;

const MEETING_KIND_LABELS: Record<string, string> = {
  lecture: 'Lecture',
  recitation: 'Recitation',
  lab: 'Lab',
  office_hours: 'Office hours',
  other: 'Meeting',
};

const STATUS_COLORS = {
  high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
} as const;

// One pill per item: the confidence, plus why it needs a look when it does ("Low – No date").
function StatusBadge({ confidence, reason }: { confidence: string; reason: string | null }) {
  const level = confidence in STATUS_COLORS ? (confidence as keyof typeof STATUS_COLORS) : 'low';
  // A flagged item never shows green, even if the model was confident.
  const color = reason && level === 'high' ? STATUS_COLORS.medium : STATUS_COLORS[level];
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap', color)}>
      {reason ? `${label} – ${reason}` : label}
    </span>
  );
}

function formatDueAt(dueAt: string | null, endAt?: string | null): string {
  if (!dueAt) return 'No date';
  const d = new Date(dueAt);
  if (Number.isNaN(d.getTime())) return dueAt;
  const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const end = endAt ? new Date(endAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
  return `${date} at ${time}${end ? `–${end}` : ''}`;
}

// Where the due time came from, so the student knows which times to double-check.
function timeBasisLabel(p: Record<string, any>): { text: string; warn: boolean } | null {
  if (!p.due_at) return null;
  if (p.edited) return { text: 'Edited by you', warn: false };
  if (p.time_inferred) return { text: 'No time given; set to 11:59 PM', warn: true };
  switch (p.time_basis) {
    case 'explicit': return { text: 'Time stated with the item', warn: false };
    case 'course_policy': return { text: 'Time from course policy', warn: false };
    case 'meeting': return { text: 'Time from class meeting', warn: false };
    default: return null;
  }
}

// datetime-local works in the browser's local time; due_at is stored as UTC.
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sortByDue(a: ExtractedItem, b: ExtractedItem): number {
  const da = (a.payload as any)?.due_at || '';
  const db = (b.payload as any)?.due_at || '';
  return new Date(da).getTime() - new Date(db).getTime();
}

interface Props {
  syllabusUploadIds: string[];
}

export function ReviewExtractedItems({ syllabusUploadIds }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pipeline = usePipeline();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [summary, setSummary] = useState<ExtractionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [acceptingSelected, setAcceptingSelected] = useState(false);

  const idsKey = syllabusUploadIds.join(',');
  useEffect(() => {
    load();
  }, [idsKey]);

  async function load() {
    setLoading(true);
    try {
      const [data, extraction] = await Promise.all([
        pipeline.fetchExtractedItems(syllabusUploadIds),
        pipeline.fetchExtractionSummary(syllabusUploadIds).catch(() => null),
      ]);
      setItems(data);
      setSummary(extraction);
      // Pre-select everything that can go in as-is; flagged items wait for a look.
      setSelected(new Set(data.filter(i => attentionReason(i) === null).map(i => i.id)));
    } catch (error) {
      toast.error(getFriendlySupabaseErrorMessage(error, 'Failed to load extracted items'));
      setItems([]);
    }
    setLoading(false);
  }

  const assignments = items.filter(i => i.item_kind === 'assignment');
  const dated = assignments.filter(i => (i.payload as any)?.due_at).sort(sortByDue);
  const undated = assignments.filter(i => !(i.payload as any)?.due_at);
  const emails = items.filter(i => i.item_kind === 'professor_email');
  const meetings = items.filter(i => i.item_kind === 'meeting_time');
  const flaggedCount = items.filter(i => attentionReason(i) !== null).length;
  const selectedItems = items.filter(i => selected.has(i.id));

  function toggleSelected(ids: string[], on: boolean) {
    setSelected(prev => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

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
      const updated = { ...item, payload: editData, title: newTitle };
      setItems(prev => prev.map(i => (i.id === item.id ? updated : i)));
      if (attentionReason(updated) === null) toggleSelected([item.id], true);
      await queryClient.invalidateQueries({ queryKey: ['attention-items'] });
      setEditingId(null);
      setEditData({});
      toast.success('Item updated');
    } catch (error) {
      toast.error(getFriendlySupabaseErrorMessage(error, 'Failed to save changes'));
    }
  }

  async function acceptMany(toAccept: ExtractedItem[]) {
    if (!user || toAccept.length === 0) return;
    const ids = toAccept.map(i => i.id);
    setBusyIds(prev => new Set([...prev, ...ids]));

    try {
      await pipeline.acceptItems(toAccept, user.id);
      setItems(prev => prev.filter(i => !ids.includes(i.id)));
      toggleSelected(ids, false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assignments'] }),
        queryClient.invalidateQueries({ queryKey: ['courses'] }),
        queryClient.invalidateQueries({ queryKey: ['attention-items'] }),
      ]);
      toast.success(
        toAccept.length === 1
          ? `Accepted: ${toAccept[0].title || toAccept[0].item_kind}`
          : `Accepted ${toAccept.length} items`,
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept items');
    } finally {
      setBusyIds(prev => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }
  }

  async function acceptSelected() {
    setAcceptingSelected(true);
    await acceptMany(selectedItems);
    setAcceptingSelected(false);
  }

  async function discard(id: string) {
    try {
      await pipeline.discardItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toggleSelected([id], false);
      await queryClient.invalidateQueries({ queryKey: ['attention-items'] });
      toast.info('Item discarded');
    } catch {
      toast.error('Failed to discard item');
    }
  }

  function renderItemCard(item: ExtractedItem) {
    const isEditing = editingId === item.id;
    const isBusy = busyIds.has(item.id);
    const p = item.payload as any;
    const basis = item.item_kind === 'assignment' ? timeBasisLabel(p) : null;
    const meetingKind = item.item_kind === 'meeting_time' ? MEETING_KIND_LABELS[p?.kind] : null;
    const reason = attentionReason(item);
    const acceptable = canAcceptItem(item);

    return (
      <div
        key={item.id}
        className={cn('card-elevated p-4 transition-all', selected.has(item.id) && 'ring-1 ring-primary/40')}
      >
        <div className="flex items-start justify-between gap-3">
          <Checkbox
            className="mt-0.5"
            checked={selected.has(item.id)}
            disabled={!acceptable || isBusy}
            onCheckedChange={checked => toggleSelected([item.id], checked === true)}
            aria-label={`Select ${item.title}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-medium truncate max-w-[280px]">{item.title}</h4>
              <StatusBadge confidence={item.confidence} reason={reason} />
            </div>

            {item.item_kind === 'assignment' && (
              <p className="text-xs text-muted-foreground mt-1">
                {ASSIGNMENT_TYPES.find(t => t.value === p.type)?.label ?? p.type}
                {' '}&middot; {formatDueAt(p.due_at, p.end_at)}
              </p>
            )}
            {basis && (
              <p className={cn(
                'text-[11px] mt-0.5 flex items-center gap-1',
                basis.warn ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
              )}>
                <Clock className="w-3 h-3" /> {basis.text}
              </p>
            )}
            {item.item_kind === 'professor_email' && (
              <p className="text-xs text-muted-foreground mt-1">
                {p.name ? `${p.name} · ` : ''}{p.email}
              </p>
            )}
            {item.item_kind === 'meeting_time' && (
              <p className="text-xs text-muted-foreground mt-1">
                {meetingKind && `${meetingKind} · `}
                {(p.days || []).length > 0
                  ? (p.days || []).map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join('/')
                  : 'Days not stated'}{' '}
                {p.start_time ? `${p.start_time}–${p.end_time ?? '?'}` : '· time not stated'}
                {p.location && ` · ${p.location}`}
              </p>
            )}

            {p?.ambiguity && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {p.ambiguity}
              </p>
            )}
            {item.source_snippet && (
              <p className="text-xs text-muted-foreground/70 mt-2 italic line-clamp-3">
                &ldquo;{item.source_snippet}&rdquo;
                {p?.parser_context?.file_name && (
                  <span className="not-italic"> &mdash; {p.parser_context.file_name}</span>
                )}
              </p>
            )}
          </div>

          {!isEditing && (
            <div className="flex gap-1 shrink-0">
              <Button size="sm" onClick={() => acceptMany([item])} disabled={!acceptable || isBusy || acceptingSelected}>
                {isBusy
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Check className="w-3 h-3 mr-1" />}
                Accept
              </Button>
              <Button size="sm" variant="ghost" onClick={() => startEdit(item)} disabled={isBusy} aria-label="Edit">
                <Pencil className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => discard(item.id)} disabled={isBusy} aria-label="Discard">
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
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Due date &amp; time</Label>
                    <Input
                      type="datetime-local"
                      value={toLocalInput(editData.due_at)}
                      onChange={e => {
                        const v = e.target.value;
                        setEditData(d => ({
                          ...d,
                          due_at: v ? new Date(v).toISOString() : null,
                          end_at: null,
                          time_inferred: false,
                          edited: true,
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

  function renderSection(
    title: string,
    icon: React.ReactNode,
    list: ExtractedItem[],
    description?: string,
  ) {
    if (list.length === 0) return null;
    const selectable = list.filter(canAcceptItem).map(i => i.id);
    const allSelected = selectable.length > 0 && selectable.every(id => selected.has(id));
    return (
      <div className="space-y-3 animate-fade-up">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-medium text-foreground">{title} ({list.length})</h3>
            {selectable.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto h-7 text-xs"
                onClick={() => toggleSelected(selectable, !allSelected)}
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </Button>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        {list.map(renderItemCard)}
      </div>
    );
  }

  function renderSummary() {
    if (!summary) return null;
    const { course, rules, warnings } = summary;
    const courseLine = [course.code, course.title].filter(Boolean).join(' · ');
    if (!courseLine && rules.length === 0 && warnings.length === 0) return null;

    return (
      <div className="space-y-3 animate-fade-up">
        {warnings.length > 0 && (
          <div className="card-elevated p-3 border border-amber-500/25 bg-amber-500/5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Check before you rely on this</p>
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        {(courseLine || rules.length > 0) && (
          <div className="card-elevated p-3 space-y-2">
            {courseLine && (
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                {courseLine}
                {course.term && <span className="text-xs text-muted-foreground font-normal">{course.term}</span>}
              </p>
            )}
            {rules.length > 0 && (
              <div>
                <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Repeat className="w-3 h-3" /> Recurring deadlines without listed dates
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  The syllabus describes these but never lists the dates, so they were not added.
                  Add them yourself once you know the dates.
                </p>
                <ul className="text-xs text-muted-foreground list-disc pl-4 mt-1 space-y-0.5">
                  {rules.map((r, i) => (
                    <li key={i}>
                      {r.text}
                      <span className="text-muted-foreground/60">
                        {' '}({ASSIGNMENT_TYPES.find(t => t.value === r.applies_to)?.label ?? r.applies_to})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center py-12 space-y-4 animate-fade-up">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">Nothing left to review</h2>
          <p className="text-sm text-muted-foreground">
            There are no pending items for this upload.
          </p>
          <Button variant="outline" onClick={() => navigate('/upload')}>
            Back to Upload
          </Button>
        </div>
        {renderSummary()}
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
          {items.length} item{items.length !== 1 ? 's' : ''} found
          {flaggedCount > 0 && <> &middot; {flaggedCount} flagged for a closer look</>}
        </p>
      </div>

      {renderSummary()}

      <p className="text-xs text-muted-foreground text-center -mt-3">
        Everything not flagged is already selected. Check the flagged items, then accept the selection.
      </p>

      {renderSection('Assignments', <BookOpen className="w-4 h-4 text-muted-foreground" />, dated)}
      {renderSection(
        'No date yet',
        <CalendarX className="w-4 h-4 text-muted-foreground" />,
        undated,
        'The documents mention these but give no date (TBA, set by the registrar, and so on). Add a date now, or accept them and fill it in later.',
      )}
      {renderSection('Meeting times', <Clock className="w-4 h-4 text-muted-foreground" />, meetings)}
      {renderSection('Instructor email', <Mail className="w-4 h-4 text-muted-foreground" />, emails)}

      {selected.size > 0 && (
        <div className="sticky bottom-4 z-10 card-elevated p-3 flex items-center gap-3 shadow-lg border border-border">
          <span className="text-sm text-foreground">{selectedItems.length} selected</span>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={acceptingSelected}>
            Clear
          </Button>
          <Button size="sm" className="ml-auto" onClick={acceptSelected} disabled={acceptingSelected}>
            {acceptingSelected
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <Check className="w-4 h-4 mr-2" />}
            Accept {selectedItems.length} selected
          </Button>
        </div>
      )}
    </div>
  );
}
