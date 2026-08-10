import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { listReportsAdmin, dismissReportAdmin, deleteAssignmentAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReportsPage,
});

type Row = {
  id: string;
  reason: string;
  created_at: string;
  assignment_id: string;
  assignments: { title: string; courses: { code: string } | null } | null;
  reporter: { full_name: string; email: string | null } | null;
};

function AdminReportsPage() {
  const listFn = useServerFn(listReportsAdmin);
  const dismissFn = useServerFn(dismissReportAdmin);
  const deleteAssignmentFn = useServerFn(deleteAssignmentAdmin);
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: () => listFn() as Promise<Row[]>,
  });

  async function dismiss(id: string) {
    try {
      await dismissFn({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      toast.success("Dismissed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not dismiss it");
    }
  }

  async function removeAssignment(row: Row) {
    try {
      await deleteAssignmentFn({ data: { id: row.assignment_id } });
      await dismissFn({ data: { id: row.id } });
      await queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      toast.success("Assignment removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove it");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Reports</h1>
        <span className="text-sm text-muted-foreground">{rows.length} open</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Assignment</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Reported by</TableHead>
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
                  Nothing reported. All clear.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.assignments?.courses?.code ?? "—"}</TableCell>
                <TableCell>{r.assignments?.title ?? "(deleted)"}</TableCell>
                <TableCell className="max-w-48 text-sm text-muted-foreground">
                  {r.reason || <span className="italic">No reason given</span>}
                </TableCell>
                <TableCell>{r.reporter?.full_name ?? "Unknown"}</TableCell>
                <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="flex justify-end gap-1 text-right">
                  <Button size="sm" variant="outline" onClick={() => void dismiss(r.id)} title="Dismiss report">
                    <X className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void removeAssignment(r)}
                    title="Delete the assignment"
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
