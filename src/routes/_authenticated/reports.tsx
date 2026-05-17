import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listInterviews, listReports } from "@/lib/interviews.functions";
import { BarChart3, ArrowRight, Mic, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports · Vocalist" }] }),
});

function scoreTone(score: number) {
  if (score >= 80) return "text-accent border-accent/30 bg-accent/10";
  if (score >= 60) return "text-brand border-brand/30 bg-brand/10";
  if (score >= 40) return "text-warning border-warning/30 bg-warning/10";
  return "text-destructive border-destructive/30 bg-destructive/10";
}

function ReportsPage() {
  const navigate = useNavigate();
  const fetchReports = useServerFn(listReports);
  const fetchInterviews = useServerFn(listInterviews);

  const { data: reports = [], isLoading: loadingR } = useQuery({
    queryKey: ["reports"],
    queryFn: () => fetchReports(),
  });
  const { data: interviews = [], isLoading: loadingI } = useQuery({
    queryKey: ["interviews"],
    queryFn: () => fetchInterviews(),
  });

  const isLoading = loadingR || loadingI;
  const interviewById = new Map(interviews.map((i) => [i.id, i]));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-10 space-y-6 fade-in">
      <PageHeader
        icon={<BarChart3 className="size-5" />}
        title="Reports"
        subtitle="Every completed interview, scored and ready to revisit."
        actions={
          <Button
            onClick={() => navigate({ to: "/setup" })}
            className="bg-brand text-brand-foreground hover:opacity-90"
          >
            <Mic className="size-4 mr-1.5" /> New interview
          </Button>
        }
      />

      {isLoading ? (
        <ListSkeleton count={6} variant="card" />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="size-6" />}
          title="No reports yet."
          description="Finish an interview to get a full multi-agent breakdown."
          action={
            <Button
              onClick={() => navigate({ to: "/setup" })}
              className="bg-brand text-brand-foreground hover:opacity-90"
            >
              Start an interview
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {reports.map((r) => {
            const iv = interviewById.get(r.interview_id);
            const score = r.overall_score ?? 0;
            return (
              <Link
                key={r.id}
                to="/report/$id"
                params={{ id: r.interview_id }}
                className="group rounded-2xl border border-border bg-card p-5 transition hover:border-brand/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                      {iv?.mode ?? "interview"}
                    </div>
                    <h3 className="font-display text-base font-semibold truncate">
                      {iv?.role ?? "Interview"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {iv?.interviewer_persona} · {iv?.difficulty}
                    </p>
                  </div>
                  <div
                    className={`shrink-0 rounded-xl border px-3 py-2 text-center min-w-14 ${scoreTone(score)}`}
                  >
                    <div className="font-display text-2xl font-bold leading-none">{score}</div>
                    <div className="text-[9px] font-mono uppercase tracking-wider mt-0.5 opacity-75">/100</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  <span className="inline-flex items-center gap-1 text-foreground/80 group-hover:text-foreground">
                    Open <ArrowRight className="size-3 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
