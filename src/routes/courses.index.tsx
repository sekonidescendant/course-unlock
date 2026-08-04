import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { allCoursesQuery, type Course } from "@/lib/queries";

export const Route = createFileRoute("/courses/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(allCoursesQuery()),
  head: () => ({
    meta: [
      { title: "Browse Courses — Course Correct" },
      {
        name: "description",
        content:
          "Every FUOYE Mass Communication course on Course Correct, grouped by level and semester with free week-by-week outlines.",
      },
      { property: "og:title", content: "Browse FUOYE Mass Comm courses" },
      {
        property: "og:description",
        content: "Free 10-week outlines and student-uploaded assignments, course by course.",
      },
    ],
  }),
  component: BrowseCourses,
});

function semesterLabel(semester: string) {
  return semester === "2" || semester.toLowerCase().startsWith("second")
    ? "Second semester"
    : "First semester";
}

function BrowseCourses() {
  const { data: courses } = useSuspenseQuery(allCoursesQuery());

  const groups = new Map<string, Course[]>();
  for (const course of courses) {
    const key = `${course.level}|${course.semester}`;
    groups.set(key, [...(groups.get(key) ?? []), course]);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Browse courses</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every outline is free to read. Assignments unlock per course.
      </p>

      {groups.size === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No courses have been added yet.</p>
      ) : null}

      <div className="mt-8 space-y-10">
        {[...groups.entries()].map(([key, list]) => (
          <section key={key}>
            <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
              {list[0].level} Level · {semesterLabel(list[0].semester)}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {list.map((course) => (
                <Link
                  key={course.id}
                  to="/courses/$courseId"
                  params={{ courseId: course.id }}
                  className="block rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-4 text-primary" />
                    <span className="text-sm font-semibold">{course.code}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{course.title}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {course.credit_units} units ·{" "}
                    {Array.isArray(course.outline) ? course.outline.length : 0} weeks outlined
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
