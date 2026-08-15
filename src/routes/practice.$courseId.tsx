import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Clock, Sparkles, Upload, XCircle } from "lucide-react";
import { courseQuery } from "@/lib/queries";
import { listPracticeQuestionsForTest, generatePracticeQuestions } from "@/lib/practice-questions.functions";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/practice/$courseId")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(courseQuery(params.courseId)),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.code} Practice Test — Course Correct` : "Practice Test — Course Correct" }],
  }),
  component: PracticeTestPage,
});

type Difficulty = "easy" | "medium" | "hard";
type Preset = { questions: number; minutes: number; label: string };
const PRESETS: Preset[] = [
  { questions: 60, minutes: 25, label: "60 questions · 25 minutes" },
  { questions: 40, minutes: 15, label: "40 questions · 15 minutes" },
];

type Question = {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

type Phase = "setup" | "running" | "results";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PracticeTestPage() {
  const { courseId } = Route.useParams();
  const { data: course } = useSuspenseQuery(courseQuery(courseId));
  const fetchQuestions = useServerFn(listPracticeQuestionsForTest);
  const generateFn = useServerFn(generatePracticeQuestions);
  const [genOpen, setGenOpen] = useState(false);
  const [genFile, setGenFile] = useState<File | null>(null);
  const [genBusy, setGenBusy] = useState(false);

  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [preset, setPreset] = useState<Preset>(PRESETS[0]!);
  const [loading, setLoading] = useState(false);
  const [notUnlocked, setNotUnlocked] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const submittedRef = useRef(false);

  async function startTest() {
    setLoading(true);
    setNotUnlocked(false);
    try {
      const rows = (await fetchQuestions({
        data: { courseId, difficulty, limit: preset.questions },
      })) as Question[];

      if (rows.length === 0) {
        toast.error(`No ${difficulty} questions yet for this course — generate some first, or try another difficulty.`);
        setLoading(false);
        return;
      }

      let durationSeconds = preset.minutes * 60;
      if (rows.length < preset.questions) {
        durationSeconds = Math.round(durationSeconds * (rows.length / preset.questions));
        toast.info(`Only ${rows.length} ${difficulty} questions available — starting a ${rows.length}-question test instead.`);
      }

      setQuestions(rows);
      setAnswers({});
      setCurrent(0);
      submittedRef.current = false;
      setSecondsLeft(durationSeconds);
      setPhase("running");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start the test.";
      if (message.includes("Unlock")) {
        setNotUnlocked(true);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitGenerate() {
    if (!genFile) return;
    setGenBusy(true);
    try {
      const fileBase64 = await fileToBase64(genFile);
      const res = await generateFn({ data: { courseId, difficulty, fileBase64, fileName: genFile.name } });
      toast.success(`${res.count} personal questions added — they'll be included next time you start a test.`);
      setGenOpen(false);
      setGenFile(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not generate questions.";
      if (message.includes("Unlock")) {
        setNotUnlocked(true);
        setGenOpen(false);
      } else {
        toast.error(message);
      }
    } finally {
      setGenBusy(false);
    }
  }

  function finishTest() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setPhase("results");
  }

  useEffect(() => {
    if (phase !== "running") return;
    if (secondsLeft <= 0) {
      finishTest();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft]);

  const score = useMemo(
    () => questions.filter((q) => answers[q.id] === q.correct_index).length,
    [questions, answers],
  );

  function selectAnswer(qId: string, index: number) {
    setAnswers((a) => ({ ...a, [qId]: index }));
  }

  function timeLabel(total: number) {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // ---------- Setup ----------
  if (phase === "setup") {
    return (
      <>
      <div className="mx-auto max-w-xl px-4 py-8">
        <Link to="/practice" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to Practice Questions
        </Link>

        <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-primary uppercase">{course.code}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{course.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Set up your timed practice test.</p>

        {notUnlocked ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm">
            Unlock this course first —{" "}
            <Link to="/courses/$courseId" params={{ courseId }} className="font-medium text-primary">
              go to the course page
            </Link>{" "}
            to pay the one-time ₦1,000.
          </div>
        ) : (
          <div className="mt-6 space-y-6 rounded-2xl border border-border bg-card p-5">
            <div>
              <p className="mb-2 text-sm font-semibold">Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      difficulty === d ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Test format</p>
              <div className="space-y-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setPreset(p)}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors ${
                      preset.label === p.label ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={() => void startTest()} disabled={loading}>
              {loading ? "Loading…" : "Start test"}
            </Button>

            <div className="border-t border-border pt-4 text-center">
              <p className="mb-2 text-xs text-muted-foreground">
                Have your own notes or a past question? Add your own questions to the pool.
              </p>
              <Button variant="outline" size="sm" onClick={() => setGenOpen(true)}>
                <Sparkles className="size-3.5" /> Generate from material
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate practice questions from your material</DialogTitle>
            <DialogDescription>
              Upload a PDF or a clear photo of your notes/past questions for {difficulty} difficulty. You'll
              get 10 new questions added to your personal pool for this course.
            </DialogDescription>
          </DialogHeader>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground hover:bg-accent">
            <Upload className="size-5" />
            {genFile ? genFile.name : "Click to choose a file"}
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => setGenFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitGenerate()} disabled={!genFile || genBusy}>
              {genBusy ? "Generating…" : "Generate 10 questions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
    );
  }

  // ---------- Running ----------
  if (phase === "running") {
    const q = questions[current]!;
    const selected = answers[q.id];
    const isLast = current === questions.length - 1;
    const lowTime = secondsLeft <= 60;

    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            Question {current + 1} of {questions.length}
          </p>
          <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold ${lowTime ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
            <Clock className="size-4" />
            {timeLabel(secondsLeft)}
          </div>
        </div>
        <Progress value={((current + 1) / questions.length) * 100} className="mt-2 h-1.5" />

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="font-semibold">{q.question_text}</p>
          <RadioGroup className="mt-4 space-y-2" value={selected !== undefined ? String(selected) : undefined} onValueChange={(v) => selectAnswer(q.id, Number(v))}>
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm">
                <RadioGroupItem value={String(oi)} id={`${q.id}-${oi}`} />
                <Label htmlFor={`${q.id}-${oi}`} className="flex-1 cursor-pointer font-normal">
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
            Previous
          </Button>
          {isLast ? (
            <Button className="flex-1" onClick={finishTest}>
              Submit test
            </Button>
          ) : (
            <Button className="flex-1" onClick={() => setCurrent((c) => c + 1)}>
              Next
            </Button>
          )}
        </div>
        {!isLast ? (
          <button type="button" onClick={finishTest} className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground">
            Submit early
          </button>
        ) : null}
      </div>
    );
  }

  // ---------- Results ----------
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">{course.code}</p>
      <h1 className="mt-1 text-2xl font-bold">Test results</h1>
      <p className="mt-2 text-lg font-semibold">
        {score}/{questions.length} correct
      </p>

      <div className="mt-6 space-y-4">
        {questions.map((q, qi) => {
          const chosen = answers[q.id];
          const isCorrect = chosen === q.correct_index;
          return (
            <div key={q.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-semibold">
                {qi + 1}. {q.question_text}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => {
                  const isRight = oi === q.correct_index;
                  const isChosen = chosen === oi;
                  return (
                    <div
                      key={oi}
                      className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${
                        isRight ? "border-primary bg-primary/10" : isChosen ? "border-destructive bg-destructive/10" : "border-border"
                      }`}
                    >
                      {isRight ? <CheckCircle2 className="size-4 text-primary" /> : isChosen ? <XCircle className="size-4 text-destructive" /> : <span className="size-4" />}
                      {opt}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                {chosen === undefined ? "Not answered. " : isCorrect ? "" : "Not quite — "}
                {q.explanation}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setPhase("setup")}>
          Try another test
        </Button>
        <Link to="/practice" className="flex-1">
          <Button className="w-full">Back to Practice Questions</Button>
        </Link>
      </div>
    </div>
  );
}
