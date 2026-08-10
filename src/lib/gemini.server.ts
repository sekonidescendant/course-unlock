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

export const SOLVE_PROMPT = `You are a patient, encouraging tutor helping a first-year (100 level) Mass Communication student at a Nigerian university who is new to university-level assignments.

Read the attached assignment carefully, then fully solve it. Requirements:
- Show your reasoning step by step, not just a final answer — the student needs to learn HOW to approach assignments like this, not just copy an answer.
- Use simple, warm, plain English. Avoid jargon; where you must use an academic term, briefly explain it.
- Keep the tone like a helpful senior student explaining it to a junior, not a textbook.
- Structure it clearly with short paragraphs or numbered points where useful.
- At the end, add a short "Why this approach works" note summarizing the key idea, so it transfers to future assignments.`;

export const CHECK_PROMPT_PREFIX = `You are a patient, encouraging tutor for a first-year (100 level) Mass Communication student at a Nigerian university.

The attached file is the assignment. Below is the student's OWN attempt at answering it. Do NOT just give a fresh full answer — instead:
- Say clearly what they got right.
- Point out specific gaps, mistakes, or weak spots in THEIR draft.
- Give concrete suggestions on how to improve it, in plain, encouraging language.
- Keep it constructive and specific to what they actually wrote, like a lecturer giving feedback in office hours.

The student's draft answer:
"""`;
