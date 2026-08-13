import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, BrainCircuit, FileText, PlayCircle } from "lucide-react";
import { courseQuery } from "@/lib/queries";

export const Route = createFileRoute("/courses/$courseId/practice")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(courseQuery(params.courseId)),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Practice Questions — Course Correct" }, { name: "robots", content: "noindex" }] };
    }

    const title = `${loaderData.code} Practice Questions — Course Correct`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: `Practice questions and revision drills for ${loaderData.code} ${loaderData.title}.`,
        },
      ],
    };
  },
  component: CoursePracticePage,
});

function CoursePracticePage() {
  const { courseId } = Route.useParams();
  const { data: course } = useSuspenseQuery(courseQuery(courseId));

  const practiceModes = [
    {
      icon: BrainCircuit,
      title: "Mixed CBT recap",
      description: "Quick revision across the course and key topics from the outline.",
    },
    {
      icon: FileText,
      title: "Topic-based drill",
      description: "Work through the course in sections so you can target weak areas fast.",
    },
    {
      icon: PlayCircle,
      title: "Timed test",
      description: "Use a mock exam format to rehearse under pressure before the real thing.",
    },
  ];

  if (!course) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted-foreground">This practice course could not be found.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        to="/courses/$courseId"
        params={{ courseId }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to course
      </Link>

      <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-primary uppercase">{course.code}</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{course.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Practice questions and revision drills for {course.level} Level · {course.semester === "first" ? "First" : "Second"} Semester.
      </p>

      <div className="mt-8 space-y-3">
        {practiceModes.map((mode) => (
          <div key={mode.title} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <mode.icon className="size-4" />
            </span>
            <div className="flex-1">
              <p className="text-base font-semibold">{mode.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{mode.description}</p>
            </div>
            <Link
              to="/practice"
              className="self-center rounded-lg border border-border px-3 py-2 text-sm font-medium hover:border-primary"
            >
              Open
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
        The full CBT quiz flow is already connected elsewhere in the app. This page keeps the course-level path easy to reach and organized under the main Practice Questions section.
      </div>
    </div>
  );
}
