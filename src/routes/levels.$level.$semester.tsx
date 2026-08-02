import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { coursesQuery } from "@/lib/queries";

export const Route = createFileRoute("/levels/$level/$semester")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(coursesQuery(Number(params.level), params.semester)),
  head: ({ params }) => ({
    meta: [
      {
        title: `${params.level}L ${params.semester === "first" ? "First" : "Second"} Semester — Course Correct`,
      },
      {
        name: "description",
        content: `All ${params.level} level ${params.semester} semester FUOYE Mass Communication courses with free 10-week outlines.`,
      },
      {
        property: "og:title",
        content: `${params.level}L ${params.semester} semester courses — Course Correct`,
      },
      {
        property: "og:description",
        content: "Browse course outlines and student-uploaded assignments.",
      },
    ],
  }),
  component: SemesterPage,
});

function SemesterPage() {
  const { level, semester } = Route.useParams();
  const { data: courses } = useSuspenseQuery(coursesQuery(Number(level), semester));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        to="/levels/$level"
        params={{ level }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> {level} Level
      </Link>
      <h1 className="mt-4 text-2xl font-bold">
        {semester === "first" ? "First" : "Second"} Semester
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {courses.length} course{courses.length === 1 ? "" : "s"} · {level} Level Mass Communication
      </p>

      {courses.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No courses have been added for this semester yet.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              to="/courses/$courseId"
              params={{ courseId: course.id }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
            >
              <div>
                <p className="text-xs font-semibold tracking-wide text-primary">{course.code}</p>
                <p className="mt-0.5 font-semibold">{course.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {course.credit_units} credit unit{course.credit_units === 1 ? "" : "s"}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
