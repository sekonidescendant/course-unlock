import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callGeminiWithFile, SOLVE_PROMPT, CHECK_PROMPT_PREFIX } from "@/lib/gemini.server";

// Shared: confirms the caller has actually unlocked the course this assignment
// belongs to (or is the uploader), then returns the assignment row.
async function loadUnlockedAssignment(supabaseAdmin: any, assignmentId: string, userId: string) {
  const { data: assignment, error } = await supabaseAdmin
    .from("assignments")
    .select("id, course_id, file_path, file_name, uploaded_by")
    .eq("id", assignmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!assignment) throw new Error("Assignment not found.");

  if (assignment.uploaded_by !== userId) {
    // A single ₦1,000 payment unlocks every course — any unlock row qualifies.
    const { data: unlock } = await supabaseAdmin
      .from("course_unlocks")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!unlock) throw new Error("Unlock your account first.");
  }
  return assignment;
}

export const solveAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ assignmentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as { userId: string }).userId;

    // Cached — a solved assignment is solved once and reused for everyone.
    const { data: cached } = await supabaseAdmin
      .from("assignment_solutions")
      .select("solution_text")
      .eq("assignment_id", data.assignmentId)
      .maybeSingle();
    if (cached) return { solution: cached.solution_text, cached: true };

    const assignment = await loadUnlockedAssignment(supabaseAdmin, data.assignmentId, userId);

    const { data: fileBlob, error: dlError } = await supabaseAdmin.storage
      .from("assignments")
      .download(assignment.file_path);
    if (dlError || !fileBlob) throw new Error("Couldn't read the uploaded file.");
    const fileBytes = await fileBlob.arrayBuffer();

    const solution = await callGeminiWithFile({
      fileBytes,
      fileName: assignment.file_name,
      prompt: SOLVE_PROMPT,
    });

    await supabaseAdmin
      .from("assignment_solutions")
      .upsert({ assignment_id: data.assignmentId, solution_text: solution }, { onConflict: "assignment_id" });

    return { solution, cached: false };
  });

export const checkMyAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ assignmentId: z.string().uuid(), draft: z.string().trim().min(10).max(8000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as { userId: string }).userId;

    const assignment = await loadUnlockedAssignment(supabaseAdmin, data.assignmentId, userId);

    const { data: fileBlob, error: dlError } = await supabaseAdmin.storage
      .from("assignments")
      .download(assignment.file_path);
    if (dlError || !fileBlob) throw new Error("Couldn't read the uploaded file.");
    const fileBytes = await fileBlob.arrayBuffer();

    const feedback = await callGeminiWithFile({
      fileBytes,
      fileName: assignment.file_name,
      prompt: `${CHECK_PROMPT_PREFIX}${data.draft}"""`,
    });

    return { feedback };
  });
