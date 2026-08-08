import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Course Correct" },
      { name: "description", content: "View your Course Correct student account details." },
      { property: "og:title", content: "Your profile — Course Correct" },
      { property: "og:description", content: "Your Course Correct student account." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/login", search: { redirect: "/profile" } });
  }, [loading, user, navigate]);

  if (!user) return null;

  const fullName = (user.user_metadata?.["full_name"] as string | undefined) ?? "";

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">Your profile</h1>
      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Name</p>
          <p className="text-sm font-medium">{fullName || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Email</p>
          <p className="text-sm font-medium">{user.email}</p>
        </div>
        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={() => {
            void signOut().then(() => navigate({ to: "/" }));
          }}
        >
          Log out
        </Button>
      </div>
    </div>
  );
}
