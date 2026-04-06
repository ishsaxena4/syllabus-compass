import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInHours } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { AttentionItem, Assignment, Course, CourseColor } from "@/types";

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

function deriveStatus(dueAt: Date, rawStatus: "upcoming" | "completed"): Assignment["status"] {
  if (rawStatus === "completed") return "completed";
  const hours = differenceInHours(dueAt, new Date());
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
        const dueDate = a.due_at ? new Date(a.due_at) : new Date(a.created_at);
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

      return (data || []).map((row) => ({
        id: row.entity_id || crypto.randomUUID(),
        type: row.risk_reason === "low-confidence" ? "low-confidence" : "ambiguous-date",
        title: row.label || "Needs review",
        courseId: row.course_id || undefined,
        description: row.risk_reason || "Please review this extracted item.",
      }));
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
