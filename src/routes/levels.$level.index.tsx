import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/levels/$level/")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.level} Level — Choose a semester | Course Correct` },
      {
        name: "description",
        content: `Pick a semester to see ${params.level} level FUOYE Mass Communication courses and free 10-week outlines.`,
      },
      { property: "og:title", content: `${params.level} Level courses — Course Correct` },
      {
        property: "og:description",
        content: `First and second semester ${params.level} level Mass Communication courses at FUOYE.`,
      },
    ],
  }),
  component: LevelPage,
});

function LevelPage() {
  const { level } = Route.useParams();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Home
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{level} Level</h1>
      <p className="mt-1 text-sm text-muted-foreground">Which semester are you preparing for?</p>

      <div className="mt-5 space-y-3">
        {[
          { key: "first", label: "First Semester" },
          { key: "second", label: "Second Semester" },
        ].map((s) => (
          <Link
            key={s.key}
            to="/levels/$level/$semester"
            params={{ level, semester: s.key }}
            className="block rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
          >
            <p className="font-semibold">{s.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Courses, outlines and uploaded assignments
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
