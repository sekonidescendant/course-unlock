import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "Practice Questions — Course Correct" },
      {
        name: "description",
        content: "Choose a FUOYE Mass Communication course and start a timed CBT-style practice test.",
      },
    ],
  }),
  component: PracticeLayout,
});

function PracticeLayout() {
  return <Outlet />;
}
