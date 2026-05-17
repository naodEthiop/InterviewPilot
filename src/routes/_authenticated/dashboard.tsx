import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listInterviews } from "@/lib/interviews.functions";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard · Vocalist" }] }),
});

function Dashboard() {
  const navigate = useNavigate();
  const fetchList = useServerFn(listInterviews);
  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ["interviews"],
    queryFn: () => fetchList(),
  });

  const completed = interviews.filter((i) => i.status === "completed").length;

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 py-10">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Your training ground</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Welcome back.</h1>
        </div>
        <Button onClick={() => navigate({ to: "/setup" })} size="lg" className="bg-brand text-brand-foreground hover:opacity-90 glow-brand rounded-xl">
          <Mic className="size-4 mr-2" /> Start new interview
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-10">
        <StatCard icon={Mic} label="Total interviews" value={String(interviews.length)} />
        <StatCard icon={Sparkles} label="Completed" value={String(completed)} />
        <StatCard icon={TrendingUp} label="In progress" value={String(interviews.length - completed)} />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Interview history</h2>
          <span className="text-xs font-mono text-muted-foreground">{interviews.length} total</span>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading…</div>
        ) : interviews.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground text-sm mb-4">No interviews yet. Run your first one.</p>
            <Button onClick={() => navigate({ to: "/setup" })} className="bg-brand text-brand-foreground hover:opacity-90">
              Start <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {interviews.map((i) => (
              <Link
                key={i.id}
                to={i.status === "completed" ? "/report/$id" : "/interview/$id"}
                params={{ id: i.id }}
                className="flex items-center justify-between p-5 hover:bg-secondary/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-brand/15 text-brand">{i.mode}</span>
                    <span className="text-sm font-medium">{i.role}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {i.interviewer_persona} · {i.difficulty} · {new Date(i.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono uppercase px-2 py-1 rounded ${
                    i.status === "completed" ? "bg-accent/15 text-accent" :
                    i.status === "active" ? "bg-brand/15 text-brand" : "bg-secondary text-muted-foreground"
                  }`}>{i.status}</span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">{label}</span>
        <Icon className="size-4 text-brand" />
      </div>
      <div className="font-display text-3xl font-bold">{value}</div>
    </div>
  );
}
