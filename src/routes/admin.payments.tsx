import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPaymentsAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPaymentsPage,
});

type Row = {
  id: string;
  amount_kobo: number;
  created_at: string;
  reference: string;
  courses: { code: string; title: string } | null;
  student: { full_name: string; email: string | null } | null;
};

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

function AdminPaymentsPage() {
  const list = useServerFn(listPaymentsAdmin);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: () => list() as Promise<{ rows: Row[]; totalKobo: number }>,
  });
  const rows = data?.rows ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Payments</h1>
        <div className="rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          Total: {naira(data?.totalKobo ?? 0)}
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No payments yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.student?.full_name ?? "Unknown"}</TableCell>
                <TableCell>{r.courses?.code ?? "—"}</TableCell>
                <TableCell>{naira(r.amount_kobo)}</TableCell>
                <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="max-w-32 truncate text-xs text-muted-foreground">{r.reference}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
