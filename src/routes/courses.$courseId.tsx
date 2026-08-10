import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronLeft, Download, Lock, Upload, FileText, CheckCircle2, Flag, Sparkles, BookOpenCheck } from "lucide-react";
import { toast } from "sonner";
import { courseQuery, assignmentsQuery, unlockQuery, courseProgressQuery, UNLOCK_PRICE_NAIRA } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { startCourseUnlock, verifyCourseUnlock } from "@/lib/payments.functions";
import { getAssignmentDownloadUrl } from "@/lib/assignments.functions";
import { solveAssignment, checkMyAnswer } from "@/lib/assignment-ai.functions";

export const Route = createFileRoute("/courses/$courseId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(courseQuery(params.courseId)),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Course — Course Correct" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.code} ${loaderData.title} — Course Correct`;
    const description = `Free 10-week outline for ${loaderData.code} ${loaderData.title} at FUOYE, plus assignments uploaded by students.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CoursePage,
});

function CoursePage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: course } = useSuspenseQuery(courseQuery(courseId));
  const { data: assignments = [] } = useQuery(assignmentsQuery(courseId));
  const { data: unlocked = false } = useQuery(unlockQuery(courseId, user?.id));
  const { data: progress } = useQuery(courseProgressQuery(courseId, user?.id));
  const completedWeeks = progress?.completed_weeks ?? [];

  async function toggleWeek(weekNumber: number) {
    if (!user) return;
    const next = completedWeeks.includes(weekNumber)
      ? completedWeeks.filter((w) => w !== weekNumber)
      : [...completedWeeks, weekNumber];
    const { error } = await supabase
      .from("course_progress")
      .upsert(
        { user_id: user.id, course_id: courseId, completed_weeks: next, updated_at: new Date().toISOString() },
        { onConflict: "user_id,course_id" },
      );
    if (!error) {
      queryClient.setQueryData(["progress", courseId, user.id], {
        id: progress?.id ?? "",
        course_id: courseId,
        completed_weeks: next,
      });
      void queryClient.invalidateQueries({ queryKey: ["progress", "all", user.id] });
    }
  }

  async function submitReport() {
    if (!user || !reportTarget) return;
    setReportBusy(true);
    try {
      const { error } = await supabase.from("assignment_reports").insert({
        assignment_id: reportTarget,
        reporter_id: user.id,
        reason: reportReason.trim(),
      });
      if (error) throw error;
      toast.success("Thanks — this has been flagged for review.");
      setReportTarget(null);
      setReportReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the report");
    } finally {
      setReportBusy(false);
    }
  }
  const startUnlock = useServerFn(startCourseUnlock);
  const verifyUnlock = useServerFn(verifyCourseUnlock);
  const queryClient = useQueryClient();
  const getDownload = useServerFn(getAssignmentDownloadUrl);
  const [paying, setPaying] = useState(false);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);

  const solveFn = useServerFn(solveAssignment);
  const checkFn = useServerFn(checkMyAnswer);
  const [aiPanel, setAiPanel] = useState<{ assignmentId: string; mode: "solve" | "check" } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [checkDraft, setCheckDraft] = useState("");

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground">
        This course could not be found.
      </div>
    );
  }

  const outline = Array.isArray(course.outline) ? course.outline : [];

  async function handleUnlock() {
    if (!user) {
      void navigate({ to: "/auth", search: { redirect: `/courses/${courseId}` } });
      return;
    }
    setPaying(true);
    try {
      const res = await startUnlock({
        data: { courseId, origin: window.location.origin },
      });
      const { default: PaystackPop } = await import("@paystack/inline-js");
      const popup = new PaystackPop();
      popup.resumeTransaction(res.accessCode, {
        onSuccess: (tx: { reference: string }) => {
          void (async () => {
            try {
              const verified = await verifyUnlock({ data: { reference: tx.reference } });
              if (!verified.ok) throw new Error("Payment could not be confirmed.");
              await queryClient.invalidateQueries({ queryKey: ["unlock"] });
              toast.success("Course unlocked. Downloads are open.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Verification failed.");
            } finally {
              setPaying(false);
            }
          })();
        },
        onCancel: () => {
          setPaying(false);
          toast.info("Payment cancelled.");
        },
        onError: () => {
          setPaying(false);
          toast.error("Payment failed. Please try again.");
        },
      });
    } catch (err) {
      setPaying(false);
      toast.error(err instanceof Error ? err.message : "Could not start the payment.");
    }
  }

  async function handleDownload(assignmentId: string) {
    try {
      const res = await getDownload({ data: { assignmentId } });
      window.open(res.url, "_blank", "noopener");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed.");
    }
  }

  function openSolve(assignmentId: string) {
    setAiPanel({ assignmentId, mode: "solve" });
    setAiResult(null);
    setAiBusy(true);
    solveFn({ data: { assignmentId } })
      .then((res) => setAiResult(res.solution))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not solve this right now.");
        setAiPanel(null);
      })
      .finally(() => setAiBusy(false));
  }

  function openCheck(assignmentId: string) {
    setAiPanel({ assignmentId, mode: "check" });
    setAiResult(null);
    setCheckDraft("");
  }

  async function submitCheck() {
    if (!aiPanel) return;
    setAiBusy(true);
    try {
      const res = await checkFn({ data: { assignmentId: aiPanel.assignmentId, draft: checkDraft } });
      setAiResult(res.feedback);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not check this right now.");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        to="/levels/$level/$semester"
        params={{ level: String(course.level), semester: course.semester }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Back to courses
      </Link>

      <p className="mt-4 text-xs font-semibold tracking-wide text-primary">{course.code}</p>
      <h1 className="mt-1 text-2xl font-bold">{course.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {course.level} Level · {course.semester === "first" ? "First" : "Second"} Semester ·{" "}
        {course.credit_units} credit unit{course.credit_units === 1 ? "" : "s"}
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">10-week outline</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Free to read. Not downloadable — it lives here so it stays up to date.
        </p>
        {user && outline.length > 0 ? (
          <div className="mt-3 flex items-center gap-3">
            <Progress value={(completedWeeks.length / outline.length) * 100} className="h-2 flex-1" />
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {completedWeeks.length}/{outline.length} weeks read
            </span>
          </div>
        ) : null}
        {outline.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            The outline for this course is being written and will appear here soon.
          </div>
        ) : (
          <ol className="mt-4 space-y-3">
            {outline.map((week, i) => (
              <li key={i} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                {user ? (
                  <Checkbox
                    className="mt-1"
                    checked={completedWeeks.includes(i + 1)}
                    onCheckedChange={() => void toggleWeek(i + 1)}
                    aria-label={`Mark week ${i + 1} as read`}
                  />
                ) : null}
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Week {i + 1}
                  </p>
                  <p className="mt-1 font-semibold">{week.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {week.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Assignments</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Uploaded by students taking this course.
            </p>
          </div>
          <Link to="/upload" search={{ courseId }}>
            <Button size="sm" variant="outline">
              <Upload className="size-4" /> Upload
            </Button>
          </Link>
        </div>

        {!unlocked && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-primary" />
              <p className="font-semibold">Downloads locked</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Pay ₦{UNLOCK_PRICE_NAIRA.toLocaleString()} once for {course.code} and download every
              assignment uploaded for this course — including ones added later.
            </p>
            <Button className="mt-4 w-full" onClick={() => void handleUnlock()} disabled={paying}>
              {paying ? "Opening Paystack…" : `Unlock for ₦${UNLOCK_PRICE_NAIRA.toLocaleString()}`}
            </Button>
          </div>
        )}

        {unlocked && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-accent p-4 text-sm font-medium text-accent-foreground">
            <CheckCircle2 className="size-4" /> You've unlocked downloads for this course.
          </div>
        )}

        <div className="mt-4 space-y-3">
          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              No assignments uploaded for this course yet. Be the first to add one.
            </div>
          ) : (
            assignments.map((a) => (
              <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <FileText className="size-4 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold break-words">{a.title}</p>
                    {a.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {a.uploader_name ? ` · ${a.uploader_name}` : ""}
                    </p>
                  </div>
                  {user ? (
                    <button
                      type="button"
                      onClick={() => setReportTarget(a.id)}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                      aria-label="Report this assignment"
                      title="Report this assignment"
                    >
                      <Flag className="size-4" />
                    </button>
                  ) : null}
                </div>
                <Button
                  className="mt-3 w-full"
                  variant={unlocked ? "default" : "secondary"}
                  onClick={() => (unlocked ? void handleDownload(a.id) : void handleUnlock())}
                >
                  {unlocked ? (
                    <>
                      <Download className="size-4" /> Download
                    </>
                  ) : (
                    <>
                      <Lock className="size-4" /> Locked
                    </>
                  )}
                </Button>
                {unlocked ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => openSolve(a.id)}>
                      <Sparkles className="size-3.5" /> Solve it
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openCheck(a.id)}>
                      <BookOpenCheck className="size-3.5" /> Check my answer
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <Dialog open={!!reportTarget} onOpenChange={(v) => !v && setReportTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report this assignment</DialogTitle>
            <DialogDescription>
              Let us know what's wrong — wrong course, spam, or anything else. Only admins see this.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="What's the issue? (optional)"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => void submitReport()} disabled={reportBusy}>
              {reportBusy ? "Sending…" : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aiPanel} onOpenChange={(v) => !v && setAiPanel(null)}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {aiPanel?.mode === "solve" ? "Worked solution" : "Check my answer"}
            </DialogTitle>
            <DialogDescription>
              {aiPanel?.mode === "solve"
                ? "Read through the reasoning, then write your own answer in your own words — don't just copy this in."
                : "Paste in your own attempt first. The AI will tell you what's working and what to fix, not rewrite it for you."}
            </DialogDescription>
          </DialogHeader>

          {aiPanel?.mode === "check" && !aiResult ? (
            <div className="space-y-3">
              <Textarea
                placeholder="Paste or type your own answer here…"
                rows={8}
                value={checkDraft}
                onChange={(e) => setCheckDraft(e.target.value)}
              />
              <Button className="w-full" onClick={() => void submitCheck()} disabled={aiBusy || checkDraft.trim().length < 10}>
                {aiBusy ? "Checking…" : "Get feedback"}
              </Button>
            </div>
          ) : null}

          {aiBusy && aiPanel?.mode === "solve" ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Reading the assignment and working through it — a moment…
            </p>
          ) : null}

          {aiResult ? (
            <div className="whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed">
              {aiResult}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
