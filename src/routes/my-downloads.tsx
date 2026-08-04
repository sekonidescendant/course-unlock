import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

type UnlockRow = {
  course_id: string;
  created_at: string;
  courses: { id: string; code: string; title: string; level: number } | null;
};

function MyDownloads() {
  const { user, loading } = useAuth();

  const { data: unlocks = [], isLoading } = useQuery({
    queryKey: ["my-unlocks", user?.id ?? "anon"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_unlocks")
        .select("course_id, created_at, courses(id, code, title, level)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as UnlockRow[];
    },
  });

  if (loading) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <Lock className="mx-auto size-5 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold">Sign in to see your downloads</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your unlocked courses are tied to your account.
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
        Courses you have unlocked. Open a course to download its assignments.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : unlocks.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            You haven't unlocked any course yet. Outlines are always free — unlock a course when you
            need its assignments.
          </p>
          <Link to="/courses" className="mt-4 inline-block">
            <Button className="rounded-xl">Browse courses</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {unlocks.map((row) => (
            <Link
              key={row.course_id}
              to="/courses/$courseId"
              params={{ courseId: row.course_id }}
              className="block rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Unlock className="size-4 text-primary" />
                <span className="text-sm font-semibold">{row.courses?.code ?? "Course"}</span>
              </div>
              <p className="mt-1 text-sm">{row.courses?.title}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Unlocked {new Date(row.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
