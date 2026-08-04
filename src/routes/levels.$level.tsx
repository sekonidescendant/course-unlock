import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/levels/$level")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.level} Level — Course Correct` },
      {
        name: "description",
        content: `Pick a semester to see ${params.level} level FUOYE Mass Communication courses and outlines.`,
      },
      { property: "og:title", content: `${params.level} Level courses — Course Correct` },
      {
        property: "og:description",
        content: `First and second semester ${params.level} level Mass Communication courses at FUOYE.`,
      },
    ],
  }),
  component: LevelLayout,
});

function LevelLayout() {
  return <Outlet />;
}
