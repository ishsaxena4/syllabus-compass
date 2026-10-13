import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInHours } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isAssignmentType, type AttentionItem, type Assignment, type AssignmentStatus, type Course, type CourseColor } from "@/types";

const COURSE_COLORS: CourseColor[] = ["sage", "coral", "sky", "amber", "lavender", "rose"];

function normalizeColor(color: string | null, idx: number): CourseColor {
  if (color && COURSE_COLORS.includes(color as CourseColor)) {
    return color as CourseColor;
  }
  return COURSE_COLORS[idx % COURSE_COLORS.length];
}

function weekdayToLabel(day: string): string {
  const map: Record<string, string> = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
  };
  return map[day] || day;
}

export function useLiveCourses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["courses", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Course[]> => {
      if (!user) return [];

      const [{ data: courses, error: coursesError }, { data: meetings, error: meetingsError }] =
        await Promise.all([
          supabase.from("courses").select("*").eq("user_id", user.id).order("name"),
          supabase.from("course_meetings").select("*").eq("user_id", user.id),
        ]);

      if (coursesError) throw coursesError;
      if (meetingsError) throw meetingsError;

      const meetingByCourse = new Map<string, (typeof meetings)[number]>();
      for (const m of meetings || []) {
        if (!meetingByCourse.has(m.course_id)) {
          meetingByCourse.set(m.course_id, m);
        }
      }

      return (courses || []).map((c, idx) => {
        const meeting = meetingByCourse.get(c.id);
        return {
          id: c.id,
          name: c.name,
          section: c.section || undefined,
          professor: c.professor_name || "Instructor",
          professorEmail: c.professor_email || undefined,
          color: normalizeColor(c.color, idx),
          schedule: meeting
            ? {
                days: meeting.days.map(weekdayToLabel),
                startTime: meeting.start_time,
                endTime: meeting.end_time,
                location: meeting.location || undefined,
              }
            : undefined,
        };
      });
    },
  });
}

function deriveStatus(dueAt: Date | null, rawStatus: "upcoming" | "completed"): AssignmentStatus {
  if (rawStatus === "completed") return "completed";
  if (!dueAt) return "upcoming";
  const hours = differenceInHours(dueAt, new Date());
  if (hours < 0) return "overdue";
  if (hours <= 48) return "due-soon";
  return "upcoming";
}

export function useLiveAssignments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["assignments", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Assignment[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("user_id", user.id)
        .order("due_at", { ascending: true, nullsFirst: false });

      if (error) throw error;

      return (data || []).map((a) => {
        const dueDate = a.due_at ? new Date(a.due_at) : null;
        return {
          id: a.id,
          title: a.title,
          courseId: a.course_id,
          type: a.type,
          dueDate,
          status: deriveStatus(dueDate, a.status),
          notes: a.notes || undefined,
          confidence: a.confidence,
        };
      });
    },
  });
}

const ATTENTION_DEFAULT_TEXT: Record<AttentionItem["type"], string> = {
  "missing-date": "The syllabus doesn't give a date yet. Add it once it's announced.",
  "low-confidence": "The date or time may be off. Check it against the syllabus.",
  unconfirmed: "Confirm the date and time are right.",
};

export function useAttentionItems() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["attention-items", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AttentionItem[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("v_risky_items")
        .select("*")
        .eq("user_id", user.id)
        .limit(10);

      if (error) throw error;

      return (data || []).map((row) => {
        const type: AttentionItem["type"] =
          row.risk_reason === "missing-date" || row.risk_reason === "low-confidence"
            ? row.risk_reason
            : "unconfirmed";
        return {
          id: row.entity_id || crypto.randomUUID(),
          type,
          title: row.label || "Untitled",
          courseId: row.course_id || undefined,
          description: row.notes || ATTENTION_DEFAULT_TEXT[type],
          dueDate: row.due_at ? new Date(row.due_at) : null,
          assignmentType: isAssignmentType(row.type) ? row.type : "other",
        };
      });
    },
  });
}

export function useNeedsOnboarding() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["needs-onboarding", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      const onboardingFlag = localStorage.getItem(`onboardingComplete:${user.id}`) === "true";
      if (onboardingFlag) return false;

      const semesterValue = localStorage.getItem(`activeSemester:${user.id}`);
      if (!semesterValue) return true;

      const { count, error } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) throw error;
      return (count || 0) === 0;
    },
  });
}

export function useDeleteCourse() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) {
        throw new Error("You must be signed in to delete a course.");
      }

      const { error } = await supabase.rpc("delete_course_cascade", {
        p_course_id: courseId,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["courses", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["assignments", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["attention-items", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["needs-onboarding", user?.id] }),
      ]);
    },
  });
}

// Marks assignments done or not done. Updates the cache first so the checkbox
// responds instantly, and rolls back if the save fails.
export function useSetAssignmentsCompleted() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["assignments", user?.id];

  return useMutation({
    mutationFn: async ({ ids, completed }: { ids: string[]; completed: boolean }) => {
      const { error } = await supabase
        .from("assignments")
        .update({ status: completed ? "completed" : "upcoming" })
        .in("id", ids);
      if (error) throw error;
    },
    onMutate: async ({ ids, completed }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Assignment[]>(key);
      queryClient.setQueryData<Assignment[]>(key, (old = []) =>
        old.map((a) =>
          ids.includes(a.id)
            ? { ...a, status: deriveStatus(a.dueDate, completed ? "completed" : "upcoming") }
            : a,
        ),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

// Resolves an attention item: saving sets the date (if given) and confirms the
// assignment; dismissing hides it from the list without changing it.
export function useResolveAttentionItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      params: { id: string; action: "save"; dueAt: string | null } | { id: string; action: "dismiss" },
    ) => {
      const update =
        params.action === "dismiss"
          ? { attention_dismissed_at: new Date().toISOString() }
          : { confirmed: true, ...(params.dueAt ? { due_at: params.dueAt } : {}) };
      const { error } = await supabase.from("assignments").update(update).eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attention-items", user?.id] }),
        queryClient.invalidateQueries({ queryKey: ["assignments", user?.id] }),
      ]),
  });
}

export interface PendingReview {
  courseId: string;
  count: number;
  // Uploads that still have pending items; the review screen takes these as ?review=.
  uploadIds: string[];
}

// Extracted items the student has not accepted or discarded yet, per course, so they
// can get back to a review they left part-way through.
export function usePendingReviews() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["pending-reviews", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PendingReview[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("extracted_items")
        .select("course_id, syllabus_upload_id")
        .eq("user_id", user.id)
        .eq("status", "pending");
      if (error) throw error;

      const byCourse = new Map<string, PendingReview>();
      for (const row of data || []) {
        if (!row.course_id) continue;
        const entry = byCourse.get(row.course_id) ?? { courseId: row.course_id, count: 0, uploadIds: [] };
        entry.count += 1;
        if (!entry.uploadIds.includes(row.syllabus_upload_id)) entry.uploadIds.push(row.syllabus_upload_id);
        byCourse.set(row.course_id, entry);
      }
      return [...byCourse.values()];
    },
  });
}
