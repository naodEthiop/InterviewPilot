import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listResumes, deleteResume, getProfile } from "@/lib/interviews.functions";
import { FileText, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { PdfDropzone, type PdfParseSuccess } from "@/components/pdf-dropzone";
import {
  ResumeCompletionForm,
  type ResumeCompletionMissing,
} from "@/components/resume-completion-form";

export const Route = createFileRoute("/_authenticated/resumes")({
  component: ResumesPage,
  head: () => ({ meta: [{ title: "Resumes · Vocalist" }] }),
});

function ResumesPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listResumes);
  const fetchProfile = useServerFn(getProfile);
  const del = useServerFn(deleteResume);

  const { data: resumes = [], isLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => fetchList(),
  });
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  const [lastUpload, setLastUpload] = useState<PdfParseSuccess | null>(null);
  const [missing, setMissing] = useState<ResumeCompletionMissing | null>(null);

  const removeMut = useMutation({
    mutationFn: (id: string) => del({ data: { resumeId: id } }),
    onSuccess: () => {
      toast.success("Resume deleted.");
      qc.invalidateQueries({ queryKey: ["resumes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  function onUpload(result: PdfParseSuccess) {
    setLastUpload(result);
    setMissing(result.missing);
    qc.invalidateQueries({ queryKey: ["resumes"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  const showCompletion =
    missing && (missing.target_role || missing.experience_level || missing.skills);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-10 space-y-6 fade-in">
      <PageHeader
        icon={<FileText className="size-5" />}
        title="Resumes"
        subtitle="Upload a PDF and we'll extract your skills, experience, and gaps for the AI to use."
      />

      <PdfDropzone onSuccess={onUpload} />

      {showCompletion && lastUpload ? (
        <ResumeCompletionForm
          missing={missing}
          initial={{
            target_role: lastUpload.profile.target_role ?? profile?.target_role ?? null,
            experience_level: (lastUpload.profile.experience_level ?? profile?.experience_level ?? null) as
              | "entry" | "mid" | "senior" | "staff" | "principal" | null,
            skills: lastUpload.profile.skills ?? profile?.skills ?? [],
          }}
          onComplete={() => {
            setMissing(null);
            qc.invalidateQueries({ queryKey: ["profile"] });
          }}
          onSkip={() => setMissing(null)}
        />
      ) : null}

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Your library</h2>
          <span className="text-xs font-mono text-muted-foreground">{resumes.length} total</span>
        </div>
        {isLoading ? (
          <ListSkeleton count={3} variant="card" />
        ) : resumes.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-6" />}
            title="No resumes uploaded."
            description="Drop a PDF above to get started."
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {resumes.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-border bg-card p-5 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{r.file_name ?? "Resume"}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMut.mutate(r.id)}
                    disabled={removeMut.isPending}
                    aria-label="Delete resume"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {removeMut.isPending && removeMut.variables === r.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
                {r.summary ? (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {r.summary}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No summary available.</p>
                )}
                {r.extracted_skills && r.extracted_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {r.extracted_skills.slice(0, 8).map((s) => (
                      <span
                        key={s}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                    {r.extracted_skills.length > 8 ? (
                      <span className="text-[10px] text-muted-foreground">
                        +{r.extracted_skills.length - 8} more
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
