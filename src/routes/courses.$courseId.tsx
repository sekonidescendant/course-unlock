import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronLeft, Download, Lock, Upload, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { courseQuery, assignmentsQuery, unlockQuery, UNLOCK_PRICE_NAIRA } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { startCourseUnlock, verifyCourseUnlock } from "@/lib/payments.functions";
import { getAssignmentDownloadUrl } from "@/lib/assignments.functions";

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
  const startUnlock = useServerFn(startCourseUnlock);
  const verifyUnlock = useServerFn(verifyCourseUnlock);
  const queryClient = useQueryClient();
  const getDownload = useServerFn(getAssignmentDownloadUrl);
  const [paying, setPaying] = useState(false);

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
        {outline.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            The outline for this course is being written and will appear here soon.
          </div>
        ) : (
          <ol className="mt-4 space-y-3">
            {outline.map((week, i) => (
              <li key={i} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Week {i + 1}
                </p>
                <p className="mt-1 font-semibold">{week.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {week.description}
                </p>
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
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
