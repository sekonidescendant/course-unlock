import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyCourseUnlock } from "@/lib/payments.functions";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({ reference: z.string().optional(), trxref: z.string().optional() });

export const Route = createFileRoute("/payment/callback")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Payment status — Course Correct" },
      { name: "description", content: "Confirming your Course Correct unlock payment." },
      { property: "og:title", content: "Payment status — Course Correct" },
      { property: "og:description", content: "Confirming your course unlock." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentCallback,
});

function PaymentCallback() {
  const search = Route.useSearch();
  const verify = useServerFn(verifyCourseUnlock);
  const queryClient = useQueryClient();
  const [state, setState] = useState<"checking" | "ok" | "failed">("checking");
  const [courseId, setCourseId] = useState<string | null>(null);

  const reference = search.reference ?? search.trxref;

  useEffect(() => {
    if (!reference) {
      setState("failed");
      return;
    }
    verify({ data: { reference } })
      .then((res) => {
        if (res.ok) {
          setCourseId(res.courseId);
          void queryClient.invalidateQueries({ queryKey: ["unlock"] });
          setState("ok");
        } else {
          setState("failed");
        }
      })
      .catch(() => setState("failed"));
  }, [reference, verify, queryClient]);

  return (
    <div className="mx-auto max-w-md px-4 py-14 text-center">
      {state === "checking" && (
        <p className="text-sm text-muted-foreground">Confirming your payment…</p>
      )}
      {state === "ok" && (
        <>
          <CheckCircle2 className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 text-xl font-bold">Course unlocked</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You can now download every assignment uploaded for this course.
          </p>
          {courseId && (
            <Link to="/courses/$courseId" params={{ courseId }} className="mt-5 inline-block">
              <Button>Go to the course</Button>
            </Link>
          )}
        </>
      )}
      {state === "failed" && (
        <>
          <XCircle className="mx-auto size-10 text-destructive" />
          <h1 className="mt-4 text-xl font-bold">Payment not confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't confirm this payment. If money left your account, try again in a minute or
            contact support.
          </p>
          <Link to="/" className="mt-5 inline-block">
            <Button variant="outline">Back home</Button>
          </Link>
        </>
      )}
    </div>
  );
}
