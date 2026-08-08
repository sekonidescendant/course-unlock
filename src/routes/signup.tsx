import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/signup")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Create your account — Course Correct" },
      {
        name: "description",
        content:
          "Create a free Course Correct student account with just your name, email and password.",
      },
      { property: "og:title", content: "Create your account — Course Correct" },
      {
        property: "og:description",
        content: "Free student account for FUOYE Mass Communication prep.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const dest = search.redirect && search.redirect.startsWith("/") ? search.redirect : "/";

  useEffect(() => {
    if (user) void navigate({ to: dest });
  }, [user, dest, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const parsed = z
        .object({
          name: z.string().trim().min(2, "Enter your name").max(80),
          email: z.string().trim().email("Enter a valid email").max(255),
          password: z.string().min(8, "Password must be at least 8 characters").max(72),
        })
        .safeParse({ name, email, password });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Check your details");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: parsed.data.name },
        },
      });
      if (error) throw error;

      if (data.user) {
        // Profile row is created by a database trigger; make sure the name is saved.
        await supabase
          .from("profiles")
          .upsert(
            { id: data.user.id, full_name: parsed.data.name, email: parsed.data.email },
            { onConflict: "id" },
          );
      }

      toast.success("Account created. You're signed in.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Name, email and a password — that's it. Course outlines stay free either way.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Obi"
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Please wait…" : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" search={{ redirect: dest }} className="font-medium text-primary">
          Log in
        </Link>
      </p>
    </div>
  );
}
