import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const ADMIN_EMAIL = "bolajigold17@gmail.com";

// Stacks on top of requireSupabaseAuth — only lets the single admin account through.
const requireAdmin = createMiddleware({ type: "function" }).server(
  async ({ next, context }) => {
    const email = (context as { claims?: { email?: string } }).claims?.email;
    if (email !== ADMIN_EMAIL) {
      throw new Error("You don't have access to this.");
    }
    return next();
  },
);

const weekEntry = z.object({ title: z.string().trim().min(1), description: z.string().trim().min(1) });

// ---------- Courses ----------

export const upsertCourseAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        code: z.string().trim().min(1).max(30),
        title: z.string().trim().min(1).max(200),
        level: z.coerce.number().int().min(100).max(500),
        semester: z.enum(["first", "second"]),
        credit_units: z.coerce.number().int().min(1).max(6),
        outline: z.array(weekEntry).max(12).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      code: data.code,
      title: data.title,
      level: data.level,
      semester: data.semester,
      credit_units: data.credit_units,
      outline: data.outline,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("courses").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("courses").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteCourseAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("courses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Assignments ----------

export const listAssignmentsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("assignments")
      .select("id, title, uploader_name, file_name, created_at, course_id, courses(code, title)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteAssignmentAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("assignments")
      .select("file_path")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.file_path) {
      await supabaseAdmin.storage.from("assignments").remove([row.file_path]);
    }
    const { error } = await supabaseAdmin.from("assignments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Students ----------

export const listStudentsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Payments ----------

export const listPaymentsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireAdmin])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: unlocks, error } = await supabaseAdmin
      .from("course_unlocks")
      .select("id, amount_kobo, created_at, reference, user_id, course_id, courses(code, title)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((unlocks ?? []).map((u) => u.user_id)));
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds)
      : { data: [] as { id: string; full_name: string; email: string | null }[] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    const rows = (unlocks ?? []).map((u) => ({
      ...u,
      student: byId.get(u.user_id) ?? null,
    }));
    const totalKobo = rows.reduce((sum, r) => sum + (r.amount_kobo ?? 0), 0);
    return { rows, totalKobo };
  });
