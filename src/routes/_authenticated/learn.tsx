import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllRecommendations } from "@/lib/interviews.functions";
import {
  GraduationCap,
  BookOpen,
  Video,
  Dumbbell,
  Sparkles,
  Mic,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/learn")({
  component: LearnPage,
  head: () => ({ meta: [{ title: "Learn · Vocalist" }] }),
});

type RecType = "course" | "video" | "exercise" | "reading";

const ICONS: Record<RecType, LucideIcon> = {
  course: GraduationCap,
  video: Video,
  exercise: Dumbbell,
  reading: BookOpen,
};

const ORDER: RecType[] = ["course", "video", "exercise", "reading"];

function LearnPage() {
  const navigate = useNavigate();
  const fetch = useServerFn(listAllRecommendations);
  const { data, isLoading } = useQuery({
    queryKey: ["learn"],
    queryFn: () => fetch(),
  });

  const recs = data?.recommendations ?? [];
  const roadmap = data?.roadmap ?? [];

  const grouped: Record<RecType, typeof recs> = {
    course: [],
    video: [],
    exercise: [],
    reading: [],
  };
  for (const r of recs) {
    const t = (ORDER.includes(r.type) ? r.type : "reading") as RecType;
    grouped[t].push(r);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-10 space-y-8 fade-in">
      <PageHeader
        icon={<GraduationCap className="size-5" />}
        title="Learn"
        subtitle="A unified study plan built from every report you've generated."
      />

      {isLoading ? (
        <ListSkeleton count={6} variant="card" />
      ) : recs.length === 0 && roadmap.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="size-6" />}
          title="No recommendations yet."
          description="Complete a few interviews and we'll synthesize your personalized study plan here."
          action={
            <Button
              onClick={() => navigate({ to: "/setup" })}
              className="bg-brand text-brand-foreground hover:opacity-90"
            >
              <Mic className="size-4 mr-1.5" /> Start an interview
            </Button>
          }
        />
      ) : (
        <>
          {roadmap.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold mb-3">Improvement roadmap</h2>
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                {roadmap.slice(0, 12).map((r, i) => (
                  <Link
                    key={`${r.reportId}-${i}`}
                    to="/report/$id"
                    params={{ id: r.interviewId }}
                    className="group flex items-start gap-3 -mx-1.5 px-1.5 py-1.5 rounded-lg hover:bg-secondary/40 transition"
                  >
                    <span className="font-mono text-xs text-muted-foreground mt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm leading-relaxed flex-1">{r.step}</span>
                    <ExternalLink className="size-3.5 text-muted-foreground/60 mt-1 opacity-0 group-hover:opacity-100 transition" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {ORDER.map((type) => {
            const list = grouped[type];
            if (list.length === 0) return null;
            const Icon = ICONS[type];
            return (
              <section key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="size-4 text-brand" />
                  <h2 className="font-display text-lg font-semibold capitalize">{type}s</h2>
                  <span className="text-xs font-mono text-muted-foreground">{list.length}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {list.map((r, i) => (
                    <Link
                      key={`${r.reportId}-${type}-${i}`}
                      to="/report/$id"
                      params={{ id: r.interviewId }}
                      className="group rounded-xl border border-border bg-card p-4 transition hover:border-brand/30"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium leading-tight">{r.title}</p>
                        <span className="text-[10px] font-mono uppercase text-muted-foreground shrink-0">
                          {type}
                        </span>
                      </div>
                      {r.note ? (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {r.note}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
