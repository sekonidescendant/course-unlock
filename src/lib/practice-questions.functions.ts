import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateQuestionsFromFile, generateQuestionsFromText } from "@/lib/gemini.server";

const AUTO_FILL_THRESHOLD = 20; // below this many existing questions, auto-generate more
const AUTO_FILL_BATCH_CALLS = 2; // chained AI calls per auto-fill, ~15 each

async function autoFillIfLow(
  supabaseAdmin: any,
  courseId: string,
  difficulty: "easy" | "medium" | "hard",
  existingCount: number,
) {
  if (existingCount >= AUTO_FILL_THRESHOLD) return;

  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("title, outline")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) return;

  const outline = (course.outline as { title: string; description: string }[]) ?? [];
  if (outline.length === 0) return; // nothing to generate from yet
  const sourceText = outline.map((w: any, i: number) => `Week ${i + 1}: ${w.title} — ${w.description}`).join("\n");

  for (let i = 0; i < AUTO_FILL_BATCH_CALLS; i++) {
    try {
      const questions = await generateQuestionsFromText({
        sourceText,
        difficulty,
        count: 15,
        courseTitle: course.title,
      });
      const rows = questions.map((q) => ({
        course_id: courseId,
        owner_id: null,
        difficulty,
        question_text: q.question_text,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
      }));
      await supabaseAdmin.from("practice_questions").insert(rows);
    } catch {
      break; // don't let one failed sub-batch block the student from testing with what exists
    }
  }
}

// Student uploads their own material to generate a PERSONAL set of questions,
// separate from the shared, auto-filled base bank.
export const generatePracticeQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        courseId: z.string().uuid(),
        difficulty: z.enum(["easy", "medium", "hard"]),
        fileBase64: z.string().min(1),
        fileName: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as { userId: string }).userId;

    // A single ₦1,000 payment unlocks every course — any unlock row qualifies.
    const { data: unlock } = await supabaseAdmin
      .from("course_unlocks")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!unlock) throw new Error("Unlock your account first.");

    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("title")
      .eq("id", data.courseId)
      .maybeSingle();
    if (!course) throw new Error("Course not found.");

    const fileBytes = Buffer.from(data.fileBase64, "base64").buffer;

    const questions = await generateQuestionsFromFile({
      fileBytes,
      fileName: data.fileName,
      difficulty: data.difficulty,
      count: 10,
      courseTitle: course.title,
    });

    const rows = questions.map((q) => ({
      course_id: data.courseId,
      owner_id: userId,
      difficulty: data.difficulty,
      question_text: q.question_text,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation,
    }));

    const { error } = await supabaseAdmin.from("practice_questions").insert(rows);
    if (error) throw new Error(error.message);

    return { count: rows.length };
  });

// Assembles a timed test. If the shared base bank for this course+difficulty is thin,
// automatically tops it up first (sourced from the course's own outline — no admin
// action needed), then returns a random sample from base + the student's own uploads.
export const listPracticeQuestionsForTest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        courseId: z.string().uuid(),
        difficulty: z.enum(["easy", "medium", "hard"]),
        limit: z.number().int().min(1).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as { userId: string }).userId;

    // A single ₦1,000 payment unlocks every course — any unlock row qualifies.
    const { data: unlock } = await supabaseAdmin
      .from("course_unlocks")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!unlock) throw new Error("Unlock your account first.");

    const { count: baseCount } = await supabaseAdmin
      .from("practice_questions")
      .select("id", { count: "exact", head: true })
      .eq("course_id", data.courseId)
      .eq("difficulty", data.difficulty)
      .is("owner_id", null);

    await autoFillIfLow(supabaseAdmin, data.courseId, data.difficulty, baseCount ?? 0);

    const { data: rows, error } = await supabaseAdmin
      .from("practice_questions")
      .select("id, question_text, options, correct_index, explanation")
      .eq("course_id", data.courseId)
      .eq("difficulty", data.difficulty)
      .or(`owner_id.is.null,owner_id.eq.${userId}`)
      .limit(300);
    if (error) throw new Error(error.message);

    const pool = rows ?? [];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    return pool.slice(0, data.limit);
  });
