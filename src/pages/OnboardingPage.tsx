import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Sparkles, Plus, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useNeedsOnboarding } from "@/hooks/useAcademicData";
import { supabase } from "@/integrations/supabase/client";
import type { CourseColor } from "@/types";
import { toast } from "sonner";

type Step = 1 | 2 | 3;

type DraftCourse = {
  id: string;
  name: string;
  section: string;
};

const COURSE_COLORS: CourseColor[] = ["sage", "coral", "sky", "amber", "lavender", "rose"];
const TERM_OPTIONS = ["Spring", "Summer", "Fall", "Winter"];

function currentYear() {
  return new Date().getFullYear();
}

function makeDraftCourse(): DraftCourse {
  return { id: crypto.randomUUID(), name: "", section: "" };
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: needsOnboarding, isLoading } = useNeedsOnboarding();
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  const [term, setTerm] = useState("Fall");
  const [year, setYear] = useState(String(currentYear()));
  const [courses, setCourses] = useState<DraftCourse[]>([makeDraftCourse(), makeDraftCourse()]);

  useEffect(() => {
    if (!isLoading && needsOnboarding === false) {
      navigate("/", { replace: true });
    }
  }, [isLoading, needsOnboarding, navigate]);

  const semesterLabel = useMemo(() => `${term} ${year}`.trim(), [term, year]);

  function updateCourse(id: string, patch: Partial<DraftCourse>) {
    setCourses((prev) => prev.map((course) => (course.id === id ? { ...course, ...patch } : course)));
  }

  function addCourseRow() {
    setCourses((prev) => [...prev, makeDraftCourse()]);
  }

  function removeCourseRow(id: string) {
    setCourses((prev) => prev.filter((course) => course.id !== id));
  }

  async function saveOnboarding() {
    if (!user) return;

    const cleanCourses = courses
      .map((course) => ({
        name: course.name.trim(),
        section: course.section.trim(),
      }))
      .filter((course) => course.name.length > 0);

    if (!semesterLabel || !year.trim()) {
      toast.error("Please select a semester and year.");
      return;
    }

    if (cleanCourses.length === 0) {
      toast.error("Add at least one course to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const rows = cleanCourses.map((course, idx) => ({
        user_id: user.id,
        name: course.name,
        section: course.section || null,
        color: COURSE_COLORS[idx % COURSE_COLORS.length],
      }));

      const { error } = await supabase.from("courses").insert(rows);
      if (error) throw error;

      localStorage.setItem(`activeSemester:${user.id}`, semesterLabel);
      localStorage.setItem(`onboardingComplete:${user.id}`, "true");

      setStep(3);
      toast.success("Semester and courses saved.");
    } catch (err: any) {
      toast.error(err.message || "Failed to finish onboarding.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="py-12 text-sm text-muted-foreground">Preparing onboarding...</div>;
  }

  if (needsOnboarding === false) return null;

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5" />
          Personalized setup for your semester
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Let's build your semester dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Quick setup now, then SyllabusOS takes over the heavy lifting.
        </p>
      </motion.div>

      <div className="card-elevated p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {step} of 3</span>
          <span>{step === 1 ? "Semester" : step === 2 ? "Courses" : "Ready"}</span>
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="flex items-center gap-2 text-foreground">
              <GraduationCap className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Choose your active semester</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Term</Label>
                <Select value={term} onValueChange={setTerm}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TERM_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input value={year} onChange={(e) => setYear(e.target.value)} maxLength={4} />
              </div>
            </div>
            <div className="rounded-lg bg-secondary/40 border border-border p-3 text-sm">
              Current semester: <span className="font-medium text-foreground">{semesterLabel}</span>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>
                Continue
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add your courses</h2>
              <Button variant="outline" size="sm" onClick={addCourseRow}>
                <Plus className="w-4 h-4 mr-1" />
                Add row
              </Button>
            </div>
            <div className="space-y-3">
              {courses.map((course, idx) => (
                <div key={course.id} className="grid grid-cols-12 gap-2">
                  <Input
                    className="col-span-7"
                    placeholder={`Course name #${idx + 1}`}
                    value={course.name}
                    onChange={(e) => updateCourse(course.id, { name: e.target.value })}
                  />
                  <Input
                    className="col-span-4"
                    placeholder="Code (optional)"
                    value={course.section}
                    onChange={(e) => updateCourse(course.id, { section: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    className="col-span-1 px-0"
                    onClick={() => removeCourseRow(course.id)}
                    disabled={courses.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => void saveOnboarding()} disabled={submitting}>
                {submitting ? "Saving..." : "Finish setup"}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-center py-6">
            <h2 className="text-2xl font-semibold">Your semester is ready</h2>
            <p className="text-sm text-muted-foreground">
              Upload your first syllabus and we will auto-fill assignments, due dates, and class info.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => navigate("/upload")}>Upload first syllabus</Button>
              <Button variant="outline" onClick={() => navigate("/")}>Go to dashboard</Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
