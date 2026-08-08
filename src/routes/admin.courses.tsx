import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { allCoursesQuery, type Course, type WeekEntry } from "@/lib/queries";
import { upsertCourseAdmin, deleteCourseAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/courses")({
  component: AdminCoursesPage,
});

const emptyForm = {
  id: undefined as string | undefined,
  code: "",
  title: "",
  level: "100",
  semester: "first" as "first" | "second",
  credit_units: "2",
  outline: [] as WeekEntry[],
};

function AdminCoursesPage() {
  const { data: courses = [], isLoading } = useQuery(allCoursesQuery());
  const queryClient = useQueryClient();
  const upsert = useServerFn(upsertCourseAdmin);
  const del = useServerFn(deleteCourseAdmin);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

  function openNew() {
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: Course) {
    setForm({
      id: c.id,
      code: c.code,
      title: c.title,
      level: String(c.level),
      semester: String(c.semester) as "first" | "second",
      credit_units: String(c.credit_units),
      outline: c.outline?.length ? c.outline : [],
    });
    setOpen(true);
  }

  function updateWeek(i: number, field: keyof WeekEntry, value: string) {
    setForm((f) => {
      const outline = [...f.outline];
      outline[i] = { ...outline[i], [field]: value };
      return { ...f, outline };
    });
  }

  function addWeek() {
    setForm((f) => ({
      ...f,
      outline: [...f.outline, { title: "", description: "" }],
    }));
  }

  function removeWeek(i: number) {
    setForm((f) => ({ ...f, outline: f.outline.filter((_, idx) => idx !== i) }));
  }

  async function save() {
    setBusy(true);
    try {
      await upsert({
        data: {
          id: form.id,
          code: form.code,
          title: form.title,
          level: Number(form.level),
          semester: form.semester,
          credit_units: Number(form.credit_units),
          outline: form.outline.filter((w) => w.title.trim() && w.description.trim()),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success(form.id ? "Course updated" : "Course added");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the course");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await del({ data: { id: deleteTarget.id } });
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the course");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Courses</h1>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Add course
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>Outline</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {courses.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.code}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell>{c.level}L</TableCell>
                <TableCell>{c.semester === "first" ? "First" : "Second"}</TableCell>
                <TableCell>{c.credit_units}</TableCell>
                <TableCell>
                  {c.outline?.length ? `${c.outline.length}/10 weeks` : "None yet"}
                </TableCell>
                <TableCell className="flex justify-end gap-1 text-right">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteTarget(c)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit course" : "Add course"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Course code</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="MCM101" />
            </div>
            <div className="space-y-1.5">
              <Label>Credit units</Label>
              <Input type="number" min={1} max={6} value={form.credit_units} onChange={(e) => setForm((f) => ({ ...f, credit_units: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Foundations of Broadcasting and Film" />
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
              >
                {[100, 200, 300, 400].map((l) => (
                  <option key={l} value={l}>{l}L</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Semester</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.semester}
                onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value as "first" | "second" }))}
              >
                <option value="first">First</option>
                <option value="second">Second</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <Label>10-week outline</Label>
              <Button size="sm" variant="outline" type="button" onClick={addWeek} disabled={form.outline.length >= 10}>
                <Plus className="size-3.5" />
                Add week
              </Button>
            </div>
            <div className="space-y-3">
              {form.outline.map((w, i) => (
                <div key={i} className="rounded-xl border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Week {i + 1}</span>
                    <button type="button" onClick={() => removeWeek(i)} className="text-xs text-destructive">
                      Remove
                    </button>
                  </div>
                  <Input
                    className="mb-2"
                    placeholder="Week title"
                    value={w.title}
                    onChange={(e) => updateWeek(i, "title", e.target.value)}
                  />
                  <Textarea
                    placeholder="Week description, in plain English"
                    rows={2}
                    value={w.description}
                    onChange={(e) => updateWeek(i, "description", e.target.value)}
                  />
                </div>
              ))}
              {form.outline.length === 0 && (
                <p className="text-sm text-muted-foreground">No weeks yet — add up to 10.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? "Saving…" : "Save course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the course and its outline permanently. Uploaded assignments and unlocks tied to it may also be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
