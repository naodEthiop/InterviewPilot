import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createInterview, analyzeResume, createResumeRecord, listResumes } from "@/lib/interviews.functions";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Loader2, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/setup")({
  component: Setup,
  head: () => ({ meta: [{ title: "New interview · Vocalist" }] }),
});

const MODES = [
  { id: "hr", label: "HR" },
  { id: "technical", label: "Technical" },
  { id: "behavioral", label: "Behavioral" },
  { id: "system_design", label: "System Design" },
] as const;

const PERSONAS = [
  { id: "friendly", label: "Friendly", desc: "Warm, encouraging" },
  { id: "strict", label: "Strict", desc: "Direct, exacting" },
  { id: "faang", label: "FAANG", desc: "Structured deep-dive" },
  { id: "founder", label: "Founder", desc: "Scrappy, impact-first" },
] as const;

const DIFF = ["easy", "medium", "hard"] as const;

function Setup() {
  const navigate = useNavigate();
  const create = useServerFn(createInterview);
  const analyze = useServerFn(analyzeResume);
  const createResume = useServerFn(createResumeRecord);
  const fetchResumes = useServerFn(listResumes);

  const { data: resumes = [], refetch } = useQuery({ queryKey: ["resumes"], queryFn: () => fetchResumes() });

  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("technical");
  const [persona, setPersona] = useState<(typeof PERSONAS)[number]["id"]>("friendly");
  const [difficulty, setDifficulty] = useState<(typeof DIFF)[number]>("medium");
  const [role, setRole] = useState("Senior Backend Engineer");
  const [resumeText, setResumeText] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [starting, setStarting] = useState(false);

  async function handleAnalyzeText() {
    if (resumeText.trim().length < 50) {
      toast.error("Paste at least a short resume (50+ characters).");
      return;
    }
    setAnalyzing(true);
    try {
      const record = await createResume({ data: { fileName: "Pasted resume" } });
      const analyzed = await analyze({ data: { resumeId: record.id, rawText: resumeText } });
      setSelectedResumeId(analyzed.id);
      toast.success("Resume analyzed.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resume analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "text/plain") {
      toast.message("For best results paste resume text. Reading file as text…");
    }
    const text = await file.text();
    setResumeText(text);
  }

  async function handleStart() {
    if (!role.trim()) { toast.error("Enter a target role."); return; }
    setStarting(true);
    try {
      const interview = await create({ data: { mode, role, persona, difficulty, resumeId: selectedResumeId ?? undefined } });
      navigate({ to: "/interview/$id", params: { id: interview.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start interview");
      setStarting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-8 py-10">
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">New session</p>
      <h1 className="font-display text-3xl font-bold mb-8">Configure your interview.</h1>

      <div className="space-y-8">
        <Section title="01 · Target role">
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Senior Frontend Engineer" />
        </Section>

        <Section title="02 · Interview mode">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`p-3 rounded-lg border text-sm font-medium transition ${mode === m.id ? "border-brand bg-brand/10 text-brand" : "border-border hover:border-brand/30"}`}>
                {m.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="03 · Interviewer persona">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PERSONAS.map((p) => (
              <button key={p.id} onClick={() => setPersona(p.id)}
                className={`p-3 rounded-lg border text-left transition ${persona === p.id ? "border-brand bg-brand/10" : "border-border hover:border-brand/30"}`}>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="04 · Difficulty">
          <div className="grid grid-cols-3 gap-2 max-w-md">
            {DIFF.map((d) => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`p-2.5 rounded-lg border text-sm capitalize transition ${difficulty === d ? "border-brand bg-brand/10 text-brand" : "border-border hover:border-brand/30"}`}>
                {d}
              </button>
            ))}
          </div>
        </Section>

        <Section title="05 · Resume (optional but recommended)" subtitle="Personalizes questions to your background.">
          {resumes.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {resumes.map((r) => (
                <button key={r.id} onClick={() => setSelectedResumeId(r.id === selectedResumeId ? null : r.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition ${selectedResumeId === r.id ? "border-brand bg-brand/10" : "border-border hover:border-brand/30"}`}>
                  <div className="flex items-center gap-2.5">
                    <FileText className="size-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm">{r.file_name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{r.summary ?? "Not analyzed"}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="p-4 rounded-lg border border-dashed border-border space-y-3">
            <Label className="text-xs text-muted-foreground">Paste resume text, or upload a .txt file</Label>
            <textarea
              value={resumeText} onChange={(e) => setResumeText(e.target.value)}
              rows={6} className="w-full bg-input border border-border rounded-md p-3 text-sm font-mono"
              placeholder="Paste your resume here…"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                <Upload className="size-3.5" /> Upload .txt
                <input type="file" accept=".txt,text/plain" className="hidden" onChange={handleFile} />
              </label>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={handleAnalyzeText} disabled={analyzing}>
                {analyzing ? <Loader2 className="size-4 animate-spin" /> : "Analyze with AI"}
              </Button>
            </div>
          </div>
        </Section>

        <div className="pt-4 flex justify-end">
          <Button onClick={handleStart} disabled={starting} size="lg" className="bg-brand text-brand-foreground hover:opacity-90 glow-brand rounded-xl">
            {starting ? <><Loader2 className="size-4 animate-spin mr-2" /> Preparing questions…</> : "Begin interview →"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}
