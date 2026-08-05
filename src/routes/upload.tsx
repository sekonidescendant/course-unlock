import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { allCoursesQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const searchSchema = z.object({ courseId: z.string().optional() });

export const Route = createFileRoute("/upload")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Upload an assignment — Course Correct" },
      {
        name: "description",
        content:
          "Upload the assignment your lecturer gave you and it is filed automatically under the right FUOYE course.",
      },
      { property: "og:title", content: "Upload an assignment — Course Correct" },
      {
        property: "og:description",
        content: "Share real assignments with other FUOYE Mass Comm students.",
      },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const search = Route.useSearch();
  const { data: courses = [] } = useQuery(allCoursesQuery());
  const [courseId, setCourseId] = useState(search.courseId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="text-xl font-bold">Sign in to upload</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need a free account so other students know who shared the assignment.
        </p>
        <Link to="/auth" search={{ redirect: "/upload" }} className="mt-5 inline-block">
          <Button>Sign in or create an account</Button>
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = z
      .object({
        courseId: z.string().uuid("Pick a course"),
        title: z.string().trim().min(3, "Give the assignment a title").max(120),
        description: z.string().trim().max(500).optional(),
      })
      .safeParse({ courseId, title, description });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    if (!file) {
      toast.error("Attach the assignment file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File must be under 15MB");
      return;
    }

    setBusy(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${parsed.data.courseId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("assignments").upload(path, file);
      if (upErr) throw upErr;

      const { error } = await supabase.from("assignments").insert({
        course_id: parsed.data.courseId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        uploaded_by: user.id,
        uploader_name:
          (user.user_metadata?.["full_name"] as string | undefined) ||
          user.email?.split("@")[0] ||
          "A student",
        file_path: path,
        file_name: file.name,
      });
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["assignments", parsed.data.courseId] });
      toast.success("Uploaded. It's now filed under that course.");
      void navigate({ to: "/courses/$courseId", params: { courseId: parsed.data.courseId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">Upload an assignment</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick the course it belongs to and we'll file it under that course automatically.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-1.5">
          <Label htmlFor="course">Course</Label>
          <select
            id="course"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select a course…</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title">Assignment title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Week 4 group assignment"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">Short note (optional)</Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Due date, lecturer, what's required…"
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="file">Assignment file</Label>
          <Input
            id="file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
          />
          <p className="text-xs text-muted-foreground">PDF, Word, image or text. Max 15MB.</p>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Uploading…" : "Upload assignment"}
        </Button>
      </form>
    </div>
  );
}
