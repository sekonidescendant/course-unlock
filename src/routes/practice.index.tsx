import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen } from "lucide-react";
import { allCoursesQuery, type Course } from "@/lib/queries";

export const Route = createFileRoute("/practice/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(allCoursesQuery()),
  head: () => ({
    meta: [
      { title: "Practice Questions — Course Correct" },
      {
        name: "description",
        content:
          "Choose a FUOYE Mass Communication course and open a CBT-style practice session before your semester starts.",
      },
      { property: "og:title", content: "Practice Questions — Course Correct" },
      {
        property: "og:description",
        content: "Pick a course and start your revision with CBT-style practice questions.",
      },
    ],
  }),
  component: PracticeLandingPage,
});

function semesterLabel(semester: string) {
  return semester === "2" || semester.toLowerCase().startsWith("second")
    ? "Second semester"
    : "First semester";
}

function PracticeLandingPage() {
  const { data: courses } = useSuspenseQuery(allCoursesQuery());

  const groups = new Map<string, Course[]>();
  for (const course of courses) {
    const key = `${course.level}|${course.semester}`;
    groups.set(key, [...(groups.get(key) ?? []), course]);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Practice</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Practice Questions</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
        Pick a course and start a revision session before your next test or exam.
      </p>

      {groups.size === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No practice courses are available yet.</p>
      ) : null}

      <div className="mt-8 space-y-10">
        {[...groups.entries()].map(([key, list]) => (
          <section key={key}>
            <h2 className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {list[0]!.level} Level · {semesterLabel(list[0]!.semester)}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {list.map((course) => (
                <Link
                  key={course.id}
                  to="/practice/$courseId"
                  params={{ courseId: course.id }}
                  className="group block rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-4 text-primary" />
                    <span className="text-sm font-semibold">{course.code}</span>
                  </div>
                  <p className="mt-2 text-base font-medium text-foreground">{course.title}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {course.credit_units} units · {Array.isArray(course.outline) ? course.outline.length : 0} week outline
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open practice set
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
