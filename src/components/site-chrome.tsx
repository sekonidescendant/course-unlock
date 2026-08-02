import { Link } from "@tanstack/react-router";
import { GraduationCap, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary">
            <GraduationCap className="size-4 text-primary-foreground" />
          </span>
          <span className="text-base font-semibold tracking-tight">Course Correct</span>
        </Link>
        {user ? (
          <div className="flex items-center gap-1">
            <Link to="/upload">
              <Button variant="ghost" size="sm">
                Upload
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => void signOut()} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        ) : (
          <Link to="/auth">
            <Button size="sm">Sign in</Button>
          </Link>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-navy px-4 py-10 text-navy-foreground">
      <div className="mx-auto max-w-3xl space-y-2">
        <p className="text-sm font-semibold">Course Correct</p>
        <p className="text-xs text-navy-muted">
          Built for Mass Communication students at Federal University Oye-Ekiti. Course outlines are
          free to read. Assignments are uploaded by students.
        </p>
      </div>
    </footer>
  );
}
