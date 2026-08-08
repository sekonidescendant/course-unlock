import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpen, FileText, LayoutDashboard, Users, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ADMIN_EMAIL } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Course Correct" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const links = [
  { to: "/admin/courses", label: "Courses", icon: BookOpen },
  { to: "/admin/assignments", label: "Assignments", icon: FileText },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/payments", label: "Payments", icon: Wallet },
] as const;

function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!loading && !isAdmin) {
      void navigate({ to: "/" });
    }
  }, [loading, isAdmin, navigate]);

  if (loading) {
    return <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row">
      <aside className="shrink-0 sm:w-48">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy">
          <LayoutDashboard className="size-4" />
          Admin
        </div>
        <nav className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-primary/10 text-primary" }}
            >
              <l.icon className="size-4" />
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
