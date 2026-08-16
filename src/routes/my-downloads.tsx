import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { allCoursesQuery } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/my-downloads")({
  head: () => ({
    meta: [
      { title: "My Downloads — Course Correct" },
      {
        name: "description",
        content: "The FUOYE Mass Communication courses you have unlocked assignment downloads for.",
      },
      { property: "og:title", content: "My unlocked courses — Course Correct" },
      {
        property: "og:description",
        content: "Jump straight back into the course assignments you already paid to unlock.",
      },
    ],
  }),
  component: MyDownloads,
});

function MyDownloads() {
  const { user, loading } = useAuth();

  // One ₦1,000 payment unlocks every course — so this just checks whether ANY
  // unlock row exists for this student, then (if so) lists every course, since
  // all of them are accessible either way.
  const { data: unlockInfo, isLoading: unlockLoading } = useQuery({
    queryKey: ["my-unlocks", "any", user?.id ?? "anon"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_unlocks")
        .select("created_at")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? { unlocked: true, since: data.created_at as string } : { unlocked: false, since: null };
    },
  });

  const { data: allCourses = [], isLoading: coursesLoading } = useQuery({
    ...allCoursesQuery(),
    enabled: Boolean(unlockInfo?.unlocked),
  });

  const isLoading = unlockLoading || (unlockInfo?.unlocked && coursesLoading);

  if (loading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <Lock className="mx-auto size-5 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold">Sign in to see your downloads</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your unlock is tied to your account.
          </p>
          <Link to="/auth" className="mt-4 inline-block">
            <Button className="rounded-xl">Sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My downloads</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {unlockInfo?.unlocked
          ? "Your ₦1,000 payment unlocked every course below — open any of them for downloads, Solve It, Check My Answer, and Practice Questions."
          : "Outlines are always free — unlock once for ₦1,000 to get downloads, AI help, and practice tests across every course."}
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : !unlockInfo?.unlocked ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            You haven't unlocked yet. One payment of ₦1,000 unlocks every course on Course Correct.
          </p>
          <Link to="/courses" className="mt-4 inline-block">
            <Button className="rounded-xl">Browse courses</Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs text-muted-foreground">
            Unlocked since {unlockInfo.since ? new Date(unlockInfo.since).toLocaleDateString() : ""}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {allCourses.map((course) => (
              <Link
                key={course.id}
                to="/courses/$courseId"
                params={{ courseId: course.id }}
                className="block rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Unlock className="size-4 text-primary" />
                  <span className="text-sm font-semibold">{course.code}</span>
                </div>
                <p className="mt-1 text-sm">{course.title}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
