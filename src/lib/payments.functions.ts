import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const UNLOCK_AMOUNT_KOBO = 100000;

export const startCourseUnlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ courseId: z.string().uuid(), origin: z.string().url() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const secret = process.env["PAYSTACK_SECRET_KEY"];
    if (!secret) throw new Error("Payments are not configured yet.");

    const { data: course, error } = await context.supabase
      .from("courses")
      .select("id, code")
      .eq("id", data.courseId)
      .maybeSingle();
    if (error || !course) throw new Error("Course not found");

    const email =
      (context.claims["email"] as string | undefined) ?? `${context.userId}@student.local`;

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: UNLOCK_AMOUNT_KOBO,
        callback_url: `${data.origin}/payment/callback`,
        metadata: {
          course_id: course.id,
          course_code: course.code,
          user_id: context.userId,
        },
      }),
    });

    const json = (await res.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string; access_code?: string };
    };

    if (!res.ok || !json.status || !json.data?.authorization_url || !json.data?.access_code) {
      console.error("Paystack init failed", json.message);
      throw new Error("Could not start the payment. Please try again.");
    }

    return {
      authorizationUrl: json.data.authorization_url,
      accessCode: json.data.access_code,
      reference: json.data.reference ?? "",
    };
  });

export const verifyCourseUnlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ reference: z.string().min(4).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const secret = process.env["PAYSTACK_SECRET_KEY"];
    if (!secret) throw new Error("Payments are not configured yet.");

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const json = (await res.json()) as {
      status?: boolean;
      data?: {
        status?: string;
        amount?: number;
        metadata?: { course_id?: string; user_id?: string };
      };
    };

    const tx = json.data;
    if (!res.ok || !json.status || tx?.status !== "success") {
      return { ok: false as const, courseId: null };
    }
    const courseId = tx.metadata?.course_id;
    if (!courseId || tx.metadata?.user_id !== context.userId) {
      return { ok: false as const, courseId: null };
    }
    if ((tx.amount ?? 0) < UNLOCK_AMOUNT_KOBO) {
      return { ok: false as const, courseId: null };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("course_unlocks").upsert(
      {
        user_id: context.userId,
        course_id: courseId,
        reference: data.reference,
        amount_kobo: tx.amount ?? UNLOCK_AMOUNT_KOBO,
      },
      { onConflict: "user_id,course_id" },
    );
    if (error) {
      console.error("unlock insert failed", error.message);
      throw new Error("Payment verified but unlocking failed. Contact support.");
    }

    return { ok: true as const, courseId };
  });
