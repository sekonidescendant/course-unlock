import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { allCoursesQuery } from "@/lib/queries";
import { getBaseQuestionCountsAdmin, generateBaseQuestionsBatchAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/admin/practice-bank")({
  component: AdminPracticeBankPage,
});

const TARGET = 500;
type Difficulty = "easy" | "medium" | "hard";

function AdminPracticeBankPage() {
  const { data: courses = [] } = useSuspenseQuery(allCoursesQuery());
  const [courseId, setCourseId] = useState<string>(courses[0]?.id ?? "");
  const countsFn = useServerFn(getBaseQuestionCountsAdmin);
  const generateFn = useServerFn(generateBaseQuestionsBatchAdmin);

  const { data: counts, refetch } = useQuery({
    queryKey: ["admin", "base-question-counts", courseId],
    queryFn: () => countsFn({ data: { courseId } }) as Promise<Record<Difficulty, number>>,
    enabled: !!courseId,
  });

  const [generating, setGenerating] = useState<Difficulty | null>(null);

  async function generateMore(difficulty: Difficulty) {
    setGenerating(difficulty);
    try {
      const res = await generateFn({ data: { courseId, difficulty } });
      toast.success(`+${res.inserted} ${difficulty} questions added.`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenerating(null);
    }
  }

  const selectedCourse = courses.find((c) => c.id === courseId);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Practice question bank</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Build up the shared base question pool per course — every student draws from this randomly
        when they start a test, on top of anything they generate themselves from their own uploads.
        Target: {TARGET} per difficulty. Each click adds roughly 30–45.
      </p>

      <select
        className="mb-6 h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code} — {c.title}
          </option>
        ))}
      </select>

      {selectedCourse ? (
        <div className="max-w-md space-y-5 rounded-2xl border border-border bg-card p-5">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
            const count = counts?.[d] ?? 0;
            const pct = Math.min(100, (count / TARGET) * 100);
            return (
              <div key={d}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{d}</span>
                  <span className="text-muted-foreground">
                    {count}/{TARGET}
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => void generateMore(d)}
                  disabled={generating === d}
                >
                  <Sparkles className="size-3.5" />
                  {generating === d ? "Generating…" : "Generate more"}
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
