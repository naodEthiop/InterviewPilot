import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listInterviews } from "@/lib/interviews.functions";
import { ArrowRight, History, Mic } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "History · Vocalist" }] }),
});

function HistoryPage() {
  const navigate = useNavigate();
  const fetchList = useServerFn(listInterviews);
  const { data: interviews = [], isLoading } = useQuery({
    queryKey: ["interviews"],
    queryFn: () => fetchList(),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-10 space-y-6 fade-in">
      <PageHeader
        icon={<History className="size-5" />}
        title="History"
        subtitle="Every interview you've started — pending, active, and completed."
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
        <ListSkeleton count={5} />
      ) : interviews.length === 0 ? (
        <EmptyState
          icon={<History className="size-6" />}
          title="No interviews yet."
          description="Run your first interview to build your history."
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
        <div className="space-y-2">
          {interviews.map((i) => (
            <Link
              key={i.id}
              to={i.status === "completed" ? "/report/$id" : "/interview/$id"}
              params={{ id: i.id }}
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-brand/30"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
                  <Mic className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {i.mode}
                    </span>
                    <span className="text-sm font-medium truncate">{i.role}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {i.interviewer_persona} · {i.difficulty} · {new Date(i.created_at).toLocaleString()}
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
  );
}
