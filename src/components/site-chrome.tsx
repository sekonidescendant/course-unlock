import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, LogOut, Menu, UserRound, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", label: "Home", exact: true },
  { to: "/courses", label: "Browse Courses", exact: false },
  { to: "/my-downloads", label: "My Downloads", exact: false },
] as const;

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-navy text-navy-foreground">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary">
            <GraduationCap className="size-4 text-primary-foreground" />
          </span>
          <span className="text-base font-semibold tracking-tight">Course Correct</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-navy-muted transition-colors hover:text-navy-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <div className="ml-2 flex items-center gap-1">
              <Link to="/upload">
                <Button size="sm" className="rounded-xl">
                  Upload
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="text-navy-muted hover:bg-navy-foreground/10 hover:text-navy-foreground"
                onClick={() => void signOut()}
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : (
            <Link to="/auth" className="ml-2" aria-label="Sign in">
              <Button size="sm" className="rounded-xl">
                <UserRound className="size-4" />
                Sign in
              </Button>
            </Link>
          )}
        </nav>

        <button
          type="button"
          className="rounded-lg p-2 text-navy-foreground sm:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-navy-foreground/10 px-4 pt-2 pb-4 sm:hidden">
          <div className="mx-auto flex max-w-5xl flex-col">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-sm font-medium text-navy-muted"
                activeProps={{ className: "text-primary" }}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  to="/upload"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-3 text-sm font-medium text-navy-muted"
                  activeProps={{ className: "text-primary" }}
                >
                  Upload an assignment
                </Link>
                <button
                  type="button"
                  className="rounded-lg px-2 py-3 text-left text-sm font-medium text-navy-muted"
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-xl bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-navy px-4 py-10 text-navy-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div>
          <p className="text-sm font-semibold">Course Correct</p>
          <p className="mt-2 text-xs text-navy-muted">
            Built for Mass Communication students at Federal University Oye-Ekiti. Course outlines
            are free to read. Assignments are uploaded by students.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-navy-muted">
          <Link to="/">Home</Link>
          <Link to="/courses">Browse Courses</Link>
          <Link to="/my-downloads">My Downloads</Link>
          <Link to="/upload">Upload</Link>
        </div>
      </div>
    </footer>
  );
}
