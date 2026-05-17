import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateReport, getInterviewBundle } from "@/lib/interviews.functions";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, CheckCircle2, AlertTriangle, Target, BookOpen } from "lucide-react";

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
      <div className="max-w-5xl mx-auto px-6 py-20 text-center">
        <Loader2 className="size-8 animate-spin mx-auto mb-4 text-brand" />
        <p className="text-muted-foreground">Running multi-agent analysis…</p>
      </div>
    );
  }

  const r = data.report;
  if (!r) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-center">
        <p className="text-muted-foreground mb-4">No report yet.</p>
        <Button onClick={() => refetch()}>Generate now</Button>
      </div>
    );
  }

  const ideals = (r.ideal_answers as Array<{ question: string; ideal: string }>) ?? [];
  const recs = (r.recommendations as Array<{ title: string; type: string; note: string }>) ?? [];

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-8 py-10">
      <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4"><ArrowLeft className="size-3" /> Dashboard</Link>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Performance report</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold">{data.interview?.role}</h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">{data.interview?.mode} · {data.interview?.interviewer_persona} · {data.interview?.difficulty}</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-muted-foreground uppercase">Overall</div>
          <div className="font-display text-6xl font-bold text-brand">{r.overall_score}</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <p className="text-base leading-relaxed">{r.summary}</p>
      </div>

      <div className="grid md:grid-cols-4 gap-3 mb-8">
        <Score label="Communication" value={r.communication_score} />
        <Score label="Technical" value={r.technical_score} />
        <Score label="Confidence" value={r.confidence_score} />
        <Score label="Clarity" value={r.clarity_score} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Card title="Strengths" icon={CheckCircle2} color="text-accent">
          {(r.strengths ?? []).map((s: string, i: number) => <Bullet key={i}>{s}</Bullet>)}
        </Card>
        <Card title="Weaknesses" icon={AlertTriangle} color="text-warning">
          {(r.weaknesses ?? []).map((s: string, i: number) => <Bullet key={i}>{s}</Bullet>)}
        </Card>
        <Card title="Missed opportunities" icon={Target} color="text-brand">
          {(r.missed_opportunities ?? []).map((s: string, i: number) => <Bullet key={i}>{s}</Bullet>)}
        </Card>
        <Card title="Improvement roadmap" icon={BookOpen} color="text-brand">
          {(r.improvement_roadmap ?? []).map((s: string, i: number) => (
            <div key={i} className="flex gap-2 text-sm py-1.5">
              <span className="font-mono text-xs text-muted-foreground mt-0.5">{String(i + 1).padStart(2, "0")}</span>
              <span className="leading-relaxed">{s}</span>
            </div>
          ))}
        </Card>
      </div>

      {ideals.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Ideal answers</h3>
          <div className="space-y-5">
            {ideals.map((ia, i) => (
              <div key={i} className="border-l-2 border-brand/30 pl-4">
                <p className="text-sm font-semibold mb-1.5">{ia.question}</p>
                <p className="text-sm text-muted-foreground leading-relaxed italic">{ia.ideal}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Recommended learning</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {recs.map((rec, i) => (
              <div key={i} className="p-4 bg-secondary/40 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium">{rec.title}</p>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">{rec.type}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{rec.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Score({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-xs font-mono text-muted-foreground uppercase mb-2">{label}</div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="font-display text-3xl font-bold">{v}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
      <div className="h-1 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full bg-brand" style={{ width: `${v}%` }} /></div>
    </div>
  );
}

function Card({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
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
