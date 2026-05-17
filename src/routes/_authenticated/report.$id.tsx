import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  generateReport,
  getInterviewBundle,
  type InterviewQuestionsBlob,
} from "@/lib/interviews.functions";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Target,
  BookOpen,
  Lightbulb,
  BarChart3,
  Sparkles,
  Brain,
  ScrollText,
  type LucideIcon,
  Shield,
} from "lucide-react";

function asReportQ(q: unknown): InterviewQuestionsBlob {
  return q && typeof q === "object" && !Array.isArray(q) ? (q as InterviewQuestionsBlob) : {};
}

function fmtMmSs(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export const Route = createFileRoute("/_authenticated/report/$id")({
  component: Report,
  head: () => ({ meta: [{ title: "Report · Vocalist" }] }),
});

function Report() {
  const { id } = Route.useParams();
  const bundle = useServerFn(getInterviewBundle);
  const gen = useServerFn(generateReport);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["bundle", id],
    queryFn: async () => {
      let b = await bundle({ data: { interviewId: id } });
      if (!b.report) {
        await gen({ data: { interviewId: id } });
        b = await bundle({ data: { interviewId: id } });
      }
      return b;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-center fade-in">
        <div className="size-14 rounded-2xl bg-brand/10 text-brand grid place-items-center mx-auto mb-4">
          <Brain className="size-6 animate-pulse" />
        </div>
        <p className="text-sm font-medium">Running multi-agent analysis…</p>
        <p className="text-xs text-muted-foreground mt-1">
          Evaluator · Coach · Report Agent
        </p>
      </div>
    );
  }

  const r = data.report;
  if (!r) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-center fade-in">
        <p className="text-muted-foreground mb-4">No report yet.</p>
        <Button onClick={() => refetch()}>Generate now</Button>
      </div>
    );
  }

  const ideals =
    (r.ideal_answers as Array<{ question: string; ideal: string }>) ?? [];
  const recs =
    (r.recommendations as Array<{ title: string; type: string; note: string }>) ?? [];

  const iv = data.interview;
  const rq = asReportQ(iv?.questions);
  const runModeLabel = rq.run_mode === "real" ? "Real" : "Practice";
  const limitSec = rq.time_limit_seconds ?? 1800;
  const endReason = rq.end_reason ?? "completed";
  const usedSec =
    iv?.started_at && iv?.completed_at
      ? (new Date(iv.completed_at).getTime() - new Date(iv.started_at).getTime()) / 1000
      : 0;
  const integrityFlags = rq.integrity_flags ?? [];

  const endReasonLabel =
    endReason === "time_up"
      ? "Time up"
      : endReason === "forfeit"
        ? "Forfeit"
        : "Completed";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-10 space-y-6 fade-in">
      <Link
        to="/reports"
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 -mb-2"
      >
        <ArrowLeft className="size-3" /> All reports
      </Link>

      <div className="flex items-end justify-between flex-wrap gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-1">
            <BarChart3 className="size-3 text-brand" /> Performance report
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold truncate">
            {data.interview?.role}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">
            {data.interview?.mode} · {data.interview?.interviewer_persona} ·{" "}
            {data.interview?.difficulty}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
            Overall
          </div>
          <div className="font-display text-5xl md:text-6xl font-bold text-brand leading-none">
            {r.overall_score}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">/100</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        <AgentBadge label="Evaluator" />
        <AgentBadge label="Coach" />
        <AgentBadge label="Report Agent" />
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {runModeLabel}
        </span>
        {iv?.started_at && iv?.completed_at ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
            Time {fmtMmSs(usedSec)} / {fmtMmSs(limitSec)}
          </span>
        ) : null}
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
            endReason === "forfeit"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : endReason === "time_up"
                ? "border-warning/40 bg-warning/10 text-warning"
                : "border-accent/40 bg-accent/10 text-accent"
          }`}
        >
          {endReasonLabel}
        </span>
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
          <TabsTrigger value="overview" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="coach" className="gap-1.5">
            <Lightbulb className="size-3.5" />
            <span className="hidden sm:inline">Strengths &amp; Gaps</span>
            <span className="sm:hidden">Coach</span>
          </TabsTrigger>
          <TabsTrigger value="ideal" className="gap-1.5">
            <ScrollText className="size-3.5" />
            Ideal
          </TabsTrigger>
          <TabsTrigger value="learn" className="gap-1.5">
            <BookOpen className="size-3.5" />
            Learn
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Verdict
            </h3>
            <p className="text-base leading-relaxed">{r.summary}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Score label="Communication" value={r.communication_score} />
            <Score label="Technical" value={r.technical_score} />
            <Score label="Confidence" value={r.confidence_score} />
            <Score label="Clarity" value={r.clarity_score} />
          </div>

          {rq.run_mode === "real" ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="size-4 text-brand" />
                <h3 className="text-sm font-semibold">Integrity</h3>
              </div>
              {integrityFlags.length === 0 ? (
                <p className="text-sm text-muted-foreground">Clean run, no violations.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {integrityFlags.map((f, i) => (
                    <li key={i} className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
                      <span className="font-mono text-xs text-muted-foreground uppercase">{f.kind}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(f.at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="coach" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card title="Strengths" icon={CheckCircle2} color="text-accent">
              {(r.strengths ?? []).map((s: string, i: number) => (
                <Bullet key={i}>{s}</Bullet>
              ))}
            </Card>
            <Card title="Weaknesses" icon={AlertTriangle} color="text-warning">
              {(r.weaknesses ?? []).map((s: string, i: number) => (
                <Bullet key={i}>{s}</Bullet>
              ))}
            </Card>
            <Card title="Missed opportunities" icon={Target} color="text-brand">
              {(r.missed_opportunities ?? []).map((s: string, i: number) => (
                <Bullet key={i}>{s}</Bullet>
              ))}
            </Card>
            <Card title="Roadmap" icon={BookOpen} color="text-brand">
              {(r.improvement_roadmap ?? []).map((s: string, i: number) => (
                <div key={i} className="flex gap-2 text-sm py-1.5">
                  <span className="font-mono text-xs text-muted-foreground mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed">{s}</span>
                </div>
              ))}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ideal">
          {ideals.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-4">
                Ideal answers
              </h3>
              <div className="space-y-5">
                {ideals.map((ia, i) => (
                  <div key={i} className="border-l-2 border-brand/30 pl-4">
                    <p className="text-sm font-semibold mb-1.5">{ia.question}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      {ia.ideal}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              No ideal answers were synthesized for this interview.
            </div>
          )}
        </TabsContent>

        <TabsContent value="learn">
          {recs.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-4">
                Recommended learning
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {recs.map((rec, i) => (
                  <div
                    key={i}
                    className="p-4 bg-secondary/40 border border-border rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium">{rec.title}</p>
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">
                        {rec.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {rec.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
              No learning recommendations yet.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AgentBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 border border-brand/20 text-[10px] font-mono uppercase tracking-wider text-brand">
      <Sparkles className="size-3" /> {label}
    </span>
  );
}

function Score({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="font-display text-3xl font-bold">{v}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-accent transition-[width] duration-500"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  color,
  children,
}: {
  title: string;
  icon: LucideIcon;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`size-4 ${color}`} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm py-1.5">
      <span className="text-muted-foreground mt-1.5">•</span>
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
