import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Upload, Lock } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Course Correct — Prep before your FUOYE semester starts" },
      {
        name: "description",
        content:
          "Free 10-week outlines for FUOYE Mass Communication courses, plus real assignments uploaded by students.",
      },
      { property: "og:title", content: "Course Correct — FUOYE Mass Comm prep" },
      {
        property: "og:description",
        content: "Read free course outlines and unlock student-uploaded assignments for ₦1000 a course.",
      },
    ],
  }),
  component: Index,
});

const levels = [100, 200, 300, 400];

function Index() {
  return (
    <div>
      <section className="bg-navy px-4 pt-12 pb-14 text-navy-foreground">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            FUOYE Mass Communication
          </p>
          <h1 className="mt-3 text-3xl leading-tight font-bold sm:text-4xl">
            Walk into your semester already prepared.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-navy-muted sm:text-base">
            Course Correct gives you a plain-English, week-by-week breakdown of what each course
            actually covers — before the lecturer says a word. Read every outline free. See the real
            assignments other students were given, and unlock a course's downloads once for ₦1000.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10">
        <h2 className="text-lg font-semibold">Pick your level</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your level, then the semester you're preparing for.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {levels.map((level) => (
            <Link
              key={level}
              to="/levels/$level"
              params={{ level: String(level) }}
              className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
            >
              <span className="text-2xl font-bold">{level}</span>
              <span className="ml-1 text-lg font-semibold text-muted-foreground">L</span>
              <p className="mt-1 text-xs text-muted-foreground">
                {level === 100 ? "Outlines available" : "Coming as students add them"}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-4">
        <h2 className="text-lg font-semibold">How it works</h2>
        <div className="mt-4 space-y-3">
          {[
            {
              icon: BookOpen,
              title: "Read the 10-week outline free",
              body: "Every course has a week-by-week plan written in plain English. Always free, always read-only.",
            },
            {
              icon: Upload,
              title: "Students upload real assignments",
              body: "Got an assignment from your lecturer? Upload it and it's filed automatically under that course.",
            },
            {
              icon: Lock,
              title: "₦1000 unlocks a whole course",
              body: "Pay once per course and download every assignment uploaded for it — now and later.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent">
                <item.icon className="size-4 text-accent-foreground" />
              </span>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
