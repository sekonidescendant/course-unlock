// Server-only helper — never import this from client code.
// Reads a file straight out of Supabase Storage and sends it to Gemini for
// understanding. Gemini natively reads PDFs and images; plain .doc/.docx
// files are NOT parsed reliably by Gemini's file understanding, so uploads
// used with "Solve it" / "Check my answer" should be PDF or an image scan.

const MODEL = "gemini-3.6-flash";

function mimeTypeFor(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

export async function callGeminiWithFile(params: {
  fileBytes: ArrayBuffer;
  fileName: string;
  prompt: string;
}): Promise<string> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("AI solving isn't configured yet.");

  const base64 = Buffer.from(params.fileBytes).toString("base64");
  const mimeType = mimeTypeFor(params.fileName);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: params.prompt },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}). ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("The AI didn't return a readable answer — try again.");
  return text.trim();
}

export const FORMAT_RULES = `Formatting rules — your response is shown as plain text, NOT rendered Markdown, so:
- Never use **, ##, ###, or --- — those will show up as literal symbols, not bold/headings/dividers.
- For emphasis, just write the word plainly, or put it on its own short line.
- For section breaks, use a blank line, or a plain label like "Step 1:" written normally.
- For lists, use a plain dash "-" or a number like "1." followed by a space — nothing fancier.`;

export const SOLVE_PROMPT = `You are a patient, encouraging tutor helping a first-year (100 level) Mass Communication student at a Nigerian university who is new to university-level assignments.

Read the attached assignment carefully, then fully solve it. Requirements:
- Show your reasoning step by step, not just a final answer — the student needs to learn HOW to approach assignments like this, not just copy an answer.
- Use simple, warm, plain English. Avoid jargon; where you must use an academic term, briefly explain it.
- Keep the tone like a helpful senior student explaining it to a junior, not a textbook.
- Structure it clearly with short paragraphs or numbered points where useful.
- At the end, add a short "Why this approach works" note summarizing the key idea, so it transfers to future assignments.

${FORMAT_RULES}`;

export const CHECK_PROMPT_PREFIX = `You are a patient, encouraging tutor for a first-year (100 level) Mass Communication student at a Nigerian university.

The attached file is the assignment. Below is the student's OWN attempt at answering it. Do NOT just give a fresh full answer — instead:
- Say clearly what they got right.
- Point out specific gaps, mistakes, or weak spots in THEIR draft.
- Give concrete suggestions on how to improve it, in plain, encouraging language.
- Keep it constructive and specific to what they actually wrote, like a lecturer giving feedback in office hours.

${FORMAT_RULES}

The student's draft answer:
"""`;
export type GeneratedQuestion = {
  question_text: string;
  options: [string, string, string, string];
  correct_index: 0 | 1 | 2 | 3;
  explanation: string;
};

const QUESTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question_text: { type: "STRING" },
          options: { type: "ARRAY", items: { type: "STRING" }, minItems: 4, maxItems: 4 },
          correct_index: { type: "INTEGER" },
          explanation: { type: "STRING" },
        },
        required: ["question_text", "options", "correct_index", "explanation"],
      },
    },
  },
  required: ["questions"],
};

function mimeTypeForGen(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

export async function generateQuestionsFromFile(params: {
  fileBytes: ArrayBuffer;
  fileName: string;
  difficulty: "easy" | "medium" | "hard";
  count: number;
  courseTitle: string;
}): Promise<GeneratedQuestion[]> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("AI question generation isn't configured yet.");

  const base64 = Buffer.from(params.fileBytes).toString("base64");
  const mimeType = mimeTypeForGen(params.fileName);

  const difficultyGuide: Record<string, string> = {
    easy: "Straightforward recall and basic understanding — checks whether a student read and understood the material at a surface level.",
    medium: "Requires connecting two or more ideas from the material, or applying a concept to a slightly new situation.",
    hard: "Requires deeper reasoning, comparing/contrasting concepts, or applying the material to an unfamiliar scenario — exam-level difficulty.",
  };

  const prompt = `You are writing ${params.count} multiple-choice CBT (computer-based test) practice questions for a first-year (100 level) Mass Communication student studying "${params.courseTitle}" at a Nigerian university.

Base every question strictly on the attached material — don't invent facts not supported by it.

Difficulty level: ${params.difficulty}. ${difficultyGuide[params.difficulty]}

Each question needs exactly 4 answer options, only one correct. Write a short explanation for why the correct answer is right — plain, encouraging, 100-level-friendly language, no jargon left unexplained. Do not use Markdown (**, ##, etc.) anywhere in the text.

Return ONLY structured JSON matching the given schema — no extra commentary.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] },
        ],
        generationConfig: { responseMimeType: "application/json", responseSchema: QUESTION_SCHEMA },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI request failed (${res.status}). ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const raw = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  let parsed: { questions?: GeneratedQuestion[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The AI didn't return readable questions — try again.");
  }
  const questions = parsed.questions ?? [];
  if (questions.length === 0) throw new Error("No questions came back — try a clearer file.");
  return questions;
}
