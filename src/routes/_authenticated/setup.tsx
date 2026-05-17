import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  createInterview,
  getProfile,
  listResumes,
} from "@/lib/interviews.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, Loader2, Mic, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PdfDropzone, type PdfParseSuccess } from "@/components/pdf-dropzone";
import {
  ResumeCompletionForm,
  type ResumeCompletionMissing,
} from "@/components/resume-completion-form";

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

const VOICE_GENDERS = [
  { id: "female", label: "Female voice" },
  { id: "male", label: "Male voice" },
] as const;

const DURATIONS = [
  { sec: 900, label: "15 min" },
  { sec: 1800, label: "30 min" },
  { sec: 2700, label: "45 min" },
  { sec: 3600, label: "60 min" },
] as const;

function Setup() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createInterview);
  const fetchResumes = useServerFn(listResumes);
  const fetchProfile = useServerFn(getProfile);

  const { data: resumes = [], refetch: refetchResumes } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => fetchResumes(),
  });
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("technical");
  const [persona, setPersona] = useState<(typeof PERSONAS)[number]["id"]>("friendly");
  const [voiceGender, setVoiceGender] = useState<(typeof VOICE_GENDERS)[number]["id"]>("female");
  const [difficulty, setDifficulty] = useState<(typeof DIFF)[number]>("medium");
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<(typeof DURATIONS)[number]["sec"]>(1800);
  const [runMode, setRunMode] = useState<"practice" | "real">("practice");
  const [role, setRole] = useState(profile?.target_role ?? "");
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [lastUpload, setLastUpload] = useState<PdfParseSuccess | null>(null);
  const [missing, setMissing] = useState<ResumeCompletionMissing | null>(null);

  useEffect(() => {
    if (profile?.target_role && !role) setRole(profile.target_role);
  }, [profile, role]);

  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      setSelectedResumeId(resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  const showCompletion = useMemo(
    () => missing && (missing.target_role || missing.experience_level || missing.skills),
    [missing],
  );

  function onUpload(result: PdfParseSuccess) {
    setLastUpload(result);
    setMissing(result.missing);
    setSelectedResumeId(result.resume.id);
    if (!role && result.profile.target_role) setRole(result.profile.target_role);
    refetchResumes();
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function handleStart() {
    if (!role.trim()) {
      toast.error("Enter a target role.");
      return;
    }
    setStarting(true);
    try {
      const interview = await create({
        data: {
          mode,
          role,
          persona,
          difficulty,
          voiceGender,
          resumeId: selectedResumeId ?? undefined,
          timeLimitSeconds,
          runMode,
        },
      });
      navigate({ to: "/interview/$id", params: { id: interview.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start interview");
      setStarting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-10 space-y-8 fade-in">
      <PageHeader
        icon={<Mic className="size-5" />}
        title="New interview"
        subtitle="Configure your mode, persona, and resume — then go."
      />

      <Section title="01 · Target role">
        <Input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Senior Frontend Engineer"
        />
      </Section>

      <Section title="02 · Interview mode">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {MODES.map((m) => (
            <PillButton key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>
              {m.label}
            </PillButton>
          ))}
        </div>
      </Section>

      <Section title="03 · Interviewer persona">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPersona(p.id)}
              className={`p-3 rounded-xl border text-left transition ${
                persona === p.id
                  ? "border-brand bg-brand/10"
                  : "border-border hover:border-brand/30"
              }`}
            >
              <div className="text-sm font-medium">{p.label}</div>
              <div className="text-xs text-muted-foreground">{p.desc}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="04 · Interviewer voice">
        <div className="grid grid-cols-2 gap-2 max-w-md">
          {VOICE_GENDERS.map((v) => (
            <PillButton key={v.id} active={voiceGender === v.id} onClick={() => setVoiceGender(v.id)}>
              {v.label}
            </PillButton>
          ))}
        </div>
      </Section>

      <Section title="05 · Difficulty">
        <div className="grid grid-cols-3 gap-2 max-w-md">
          {DIFF.map((d) => (
            <PillButton key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              <span className="capitalize">{d}</span>
            </PillButton>
          ))}
        </div>
      </Section>

      <Section title="06 · Duration" subtitle="Hard cap — the interview ends automatically when time is up.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
          {DURATIONS.map((d) => (
            <PillButton
              key={d.sec}
              active={timeLimitSeconds === d.sec}
              onClick={() => setTimeLimitSeconds(d.sec)}
            >
              {d.label}
            </PillButton>
          ))}
        </div>
      </Section>

      <Section
        title="07 · Run mode"
        subtitle="Real mode enforces fullscreen and strict focus. Desktop only."
      >
        <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
          <button
            type="button"
            onClick={() => setRunMode("practice")}
            className={`p-4 rounded-xl border text-left transition ${
              runMode === "practice"
                ? "border-brand bg-brand/10"
                : "border-border hover:border-brand/30"
            }`}
          >
            <div className="text-sm font-semibold mb-1">Practice</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Free-form. No fullscreen lock or tab-switch checks.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setRunMode("real")}
            className={`p-4 rounded-xl border text-left transition ${
              runMode === "real"
                ? "border-brand bg-brand/10"
                : "border-border hover:border-brand/30"
            }`}
          >
            <div className="text-sm font-semibold mb-1">Real</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fullscreen required. Tab switch or leaving fullscreen counts as a strike — two
              strikes and the interview forfeits.
            </p>
          </button>
        </div>
      </Section>

      <Section
        title="08 · Resume"
        subtitle="Personalizes questions to your background. PDF only."
      >
        {resumes.length > 0 && (
          <div className="mb-4 space-y-1.5">
            {resumes.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedResumeId(r.id === selectedResumeId ? null : r.id)}
                className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition ${
                  selectedResumeId === r.id
                    ? "border-brand bg-brand/10"
                    : "border-border hover:border-brand/30"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{r.file_name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {r.summary ?? "Not analyzed"}
                    </div>
                  </div>
                </div>
                {selectedResumeId === r.id ? (
                  <CheckCircle2 className="size-4 text-brand shrink-0" />
                ) : null}
              </button>
            ))}
          </div>
        )}

        <PdfDropzone onSuccess={onUpload} />

        {showCompletion && lastUpload && missing ? (
          <ResumeCompletionForm
            className="mt-4"
            missing={missing}
            initial={{
              target_role: lastUpload.profile.target_role ?? role ?? null,
              experience_level: (lastUpload.profile.experience_level ?? null) as
                | "entry" | "mid" | "senior" | "staff" | "principal" | null,
              skills: lastUpload.profile.skills ?? [],
            }}
            onComplete={() => {
              setMissing(null);
              qc.invalidateQueries({ queryKey: ["profile"] });
            }}
            onSkip={() => setMissing(null)}
          />
        ) : null}
      </Section>

      <div className="pt-2 flex justify-end">
        <Button
          onClick={handleStart}
          disabled={starting}
          size="lg"
          className="bg-brand text-brand-foreground hover:opacity-90 glow-brand rounded-xl"
        >
          {starting ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" /> Preparing questions…
            </>
          ) : (
            "Begin interview →"
          )}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-1">
        {title}
      </h2>
      {subtitle && <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl border text-sm font-medium transition ${
        active
          ? "border-brand bg-brand/10 text-brand"
          : "border-border hover:border-brand/30"
      }`}
    >
      {children}
    </button>
  );
}
