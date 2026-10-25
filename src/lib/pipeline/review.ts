import type { ExtractedItem, ItemPayload } from './types';

export function payloadOf(item: ExtractedItem): ItemPayload {
  return (item.payload ?? {}) as ItemPayload;
}

// Whether an item has everything its destination table needs.
export function canAcceptItem(item: ExtractedItem): boolean {
  if (!item.course_id) return false;
  const p = payloadOf(item);
  if (item.item_kind === 'meeting_time' && p.kind !== 'office_hours') {
    return Boolean(p.days?.length && p.start_time && p.end_time);
  }
  return true;
}

// Why the student should look at an item before accepting it, or null if it can be
// accepted as-is. Confidence alone is not used: "medium" also covers items whose date
// and time came from different documents, which is normal and reliable.
export function attentionReason(item: ExtractedItem): string | null {
  const p = payloadOf(item);
  if (!canAcceptItem(item)) return 'Missing days or times';
  if (item.confidence === 'low') return 'Low confidence';
  if (item.item_kind === 'assignment') {
    if (!p.due_at) return 'No date';
    if (p.time_inferred && !p.edited) return 'No time given';
    if (p.ambiguity && !p.edited) return 'Flagged for review';
  }
  return null;
}
