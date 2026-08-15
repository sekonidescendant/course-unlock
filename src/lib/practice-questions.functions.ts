import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateQuestionsFromFile } from "@/lib/gemini.server";

// Student uploads their own material (lecture notes, a specific past question, etc.)
// to generate a PERSONAL set of questions, separate from the shared base bank.
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

    const { data: unlock } = await supabaseAdmin
      .from("course_unlocks")
      .select("id")
      .eq("course_id", data.courseId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!unlock) throw new Error("Unlock this course first.");

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

// Assembles a timed test: pulls from the shared base bank (owner_id null) PLUS the
// student's own personal-upload questions, then returns a genuinely random sample —
// not just "the most recent N" — so repeat tests actually vary.
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

    const { data: unlock } = await supabaseAdmin
      .from("course_unlocks")
      .select("id")
      .eq("course_id", data.courseId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!unlock) throw new Error("Unlock this course first.");

    // Pull a larger pool than needed (up to 300), then randomly sample from it —
    // avoids always serving the same "most recent" questions.
    const { data: rows, error } = await supabaseAdmin
      .from("practice_questions")
      .select("id, question_text, options, correct_index, explanation")
      .eq("course_id", data.courseId)
      .eq("difficulty", data.difficulty)
      .or(`owner_id.is.null,owner_id.eq.${userId}`)
      .limit(300);
    if (error) throw new Error(error.message);

    const pool = rows ?? [];
    // Fisher-Yates shuffle, then take what's needed.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    return pool.slice(0, data.limit);
  });
