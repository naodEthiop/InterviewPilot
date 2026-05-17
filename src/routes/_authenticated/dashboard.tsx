import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listInterviews,
  listReports,
} from "@/lib/interviews.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Mic,
  Sparkles,
  TrendingUp,
  Flame,
  BarChart3,
  Play,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatSkeleton } from "@/components/list-skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Home · Vocalist" }] }),
});

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates.map((d) => new Date(d).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (set.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fetchList = useServerFn(listInterviews);
  const fetchReports = useServerFn(listReports);

  const { data: interviews = [], isLoading: loadingInts } = useQuery({
    queryKey: ["interviews"],
    queryFn: () => fetchList(),
  });
  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ["reports"],
    queryFn: () => fetchReports(),
  });

  const loading = loadingInts || loadingReports;
  const completed = interviews.filter((i) => i.status === "completed").length;
  const active = interviews.find((i) => i.status === "active");
  const lastReport = reports[0];
  const lastReportInterview = lastReport
    ? interviews.find((i) => i.id === lastReport.interview_id)
    : undefined;
  const avgScore = reports.length
    ? Math.round(
        reports.reduce((acc, r) => acc + (r.overall_score ?? 0), 0) /
          reports.length,
      )
    : 0;
  const streak = computeStreak(interviews.map((i) => i.created_at));

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "there";
  const hour = new Date().getHours();
  const greet = hour < 5 ? "Up late," : hour < 12 ? "Good morning," : hour < 18 ? "Good afternoon," : "Good evening,";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-10 space-y-8 fade-in">
      <PageHeader
        eyebrow={greet}
        title={`Welcome back, ${displayName}.`}
        subtitle="Pick up where you left off, or run a fresh interview from scratch."
        actions={
          <Button
            onClick={() => navigate({ to: "/setup" })}
            size="lg"
            className="bg-brand text-brand-foreground hover:opacity-90 glow-brand rounded-xl"
          >
            <Mic className="size-4 mr-2" /> Start new interview
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <StatCard icon={Mic} label="Total interviews" value={String(interviews.length)} />
            <StatCard icon={CheckCircle2} label="Completed" value={String(completed)} />
            <StatCard icon={BarChart3} label="Avg overall" value={`${avgScore}`} suffix="/100" tone="brand" />
            <StatCard icon={Flame} label="Streak" value={`${streak}`} suffix="d" tone="accent" />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {active ? (
          <Link
            to="/interview/$id"
            params={{ id: active.id }}
            className="group rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 to-accent/5 p-6 transition hover:border-brand hover:shadow-lg hover:shadow-brand/10"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-brand">
                <Play className="size-3.5" /> Resume in progress
              </div>
              <ArrowRight className="size-4 text-brand transition group-hover:translate-x-1" />
            </div>
            <h3 className="font-display text-xl font-bold mb-1">{active.role}</h3>
            <p className="text-sm text-muted-foreground capitalize">
              {active.mode} · {active.interviewer_persona} · {active.difficulty}
            </p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
              <Sparkles className="size-3.5 text-brand" /> Ready when you are
            </div>
            <h3 className="font-display text-xl font-bold mb-1">No active session.</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure a new interview to start training.
            </p>
            <Button
              onClick={() => navigate({ to: "/setup" })}
              size="sm"
              className="bg-brand text-brand-foreground hover:opacity-90 rounded-lg"
            >
              <Mic className="size-4 mr-1.5" /> New interview
            </Button>
          </div>
        )}

        {lastReport && lastReportInterview ? (
          <Link
            to="/report/$id"
            params={{ id: lastReport.interview_id }}
            className="group rounded-2xl border border-border bg-card p-6 transition hover:border-brand/40 hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                <BarChart3 className="size-3.5 text-brand" /> Last report
              </div>
              <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
            </div>
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-display text-xl font-bold truncate">{lastReportInterview.role}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {lastReportInterview.mode} · {lastReportInterview.interviewer_persona}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-4xl font-bold text-brand leading-none">
                  {lastReport.overall_score ?? 0}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mt-1">overall</div>
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
              <TrendingUp className="size-3.5 text-brand" /> Reports
            </div>
            <h3 className="font-display text-xl font-bold mb-1">No reports yet.</h3>
            <p className="text-sm text-muted-foreground">
              Finish an interview to get a full multi-agent breakdown.
            </p>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-end justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Recent activity</h2>
          <Link
            to="/history"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            View all <ArrowRight className="size-3" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/40 shimmer" />
            ))}
          </div>
        ) : interviews.length === 0 ? (
          <EmptyState
            icon={<Mic className="size-6" />}
            title="No interviews yet."
            description="Configure a target role, persona, and voice—then start practicing in under 30 seconds."
            action={
              <Button
                onClick={() => navigate({ to: "/setup" })}
                className="bg-brand text-brand-foreground hover:opacity-90 rounded-lg"
              >
                Start your first interview
              </Button>
            }
          />
        ) : (
          <div className="grid gap-2">
            {interviews.slice(0, 4).map((i) => (
              <Link
                key={i.id}
                to={i.status === "completed" ? "/report/$id" : "/interview/$id"}
                params={{ id: i.id }}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-brand/30 hover:bg-card/80"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
                    <Mic className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        {i.mode}
                      </span>
                      <span className="text-sm font-medium truncate">{i.role}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {i.interviewer_persona} · {i.difficulty} · {new Date(i.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-1 rounded ${
                      i.status === "completed"
                        ? "bg-accent/15 text-accent"
                        : i.status === "active"
                          ? "bg-brand/15 text-brand"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {i.status}
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone = "muted",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  suffix?: string;
  tone?: "muted" | "brand" | "accent";
}) {
  const toneClass =
    tone === "brand" ? "text-brand" : tone === "accent" ? "text-accent" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition hover:border-brand/30">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-mono">
          {label}
        </span>
        <Icon className="size-4 text-brand" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`font-display text-3xl font-bold ${toneClass}`}>{value}</span>
        {suffix ? (
          <span className="text-xs text-muted-foreground font-mono">{suffix}</span>
        ) : null}
      </div>
    </div>
  );
}
