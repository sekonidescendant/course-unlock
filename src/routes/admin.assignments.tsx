import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { listAssignmentsAdmin, deleteAssignmentAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export const Route = createFileRoute("/admin/assignments")({
  component: AdminAssignmentsPage,
});

type Row = {
  id: string;
  title: string;
  uploader_name: string | null;
  file_name: string;
  created_at: string;
  courses: { code: string; title: string } | null;
};

function AdminAssignmentsPage() {
  const list = useServerFn(listAssignmentsAdmin);
  const del = useServerFn(deleteAssignmentAdmin);
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "assignments"],
    queryFn: () => list() as Promise<Row[]>,
  });
  const [target, setTarget] = useState<Row | null>(null);

  async function confirmDelete() {
    if (!target) return;
    try {
      await del({ data: { id: target.id } });
      await queryClient.invalidateQueries({ queryKey: ["admin", "assignments"] });
      toast.success("Assignment deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete it");
    } finally {
      setTarget(null);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Assignments</h1>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Uploaded by</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No assignments uploaded yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.courses?.code ?? "—"}</TableCell>
                <TableCell>{r.title}</TableCell>
                <TableCell>{r.uploader_name ?? "Unknown"}</TableCell>
                <TableCell className="max-w-40 truncate">{r.file_name}</TableCell>
                <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setTarget(r)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!target} onOpenChange={(v) => !v && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes the file and its listing permanently. Students who already downloaded it keep their copy.
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
