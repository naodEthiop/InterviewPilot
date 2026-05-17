import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { uploadAndParseResume } from "@/lib/interviews.functions";
import { CheckCircle2, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;

type ParseResult = Awaited<ReturnType<ReturnType<typeof useServerFn<typeof uploadAndParseResume>>>>;
export type PdfParseSuccess = Extract<ParseResult, { ok: true }>;

type Props = {
  onSuccess: (result: PdfParseSuccess) => void;
  className?: string;
};

type Stage = "idle" | "uploading" | "parsing" | "analyzing" | "done" | "error";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== "string") return reject(new Error("Read failed"));
      const idx = r.indexOf(",");
      resolve(idx >= 0 ? r.slice(idx + 1) : r);
    };
    reader.onerror = () => reject(new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

export function PdfDropzone({ onSuccess, className }: Props) {
  const upload = useServerFn(uploadAndParseResume);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are accepted.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("PDF exceeds the 5MB limit.");
      return;
    }
    setFileName(file.name);
    setStage("uploading");
    try {
      const base64 = await readFileAsBase64(file);
      setStage("parsing");
      const res = await upload({ data: { fileBase64: base64, fileName: file.name } });
      if (!res.ok) {
        setStage("error");
        toast.error(res.message || "PDF couldn't be read. Try a text-based PDF.");
        return;
      }
      setStage("done");
      toast.success("Resume analyzed.");
      onSuccess(res);
    } catch (err) {
      setStage("error");
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function reset() {
    setStage("idle");
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const busy = stage === "uploading" || stage === "parsing" || stage === "analyzing";

  return (
    <div className={cn("space-y-3", className)}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (busy) return;
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition cursor-pointer",
          dragOver
            ? "border-brand bg-brand/5"
            : "border-border hover:border-brand/40 hover:bg-card/40",
          busy && "pointer-events-none opacity-80",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <div className="size-12 rounded-2xl bg-brand/10 text-brand grid place-items-center">
          {busy ? (
            <Loader2 className="size-5 animate-spin" />
          ) : stage === "done" ? (
            <CheckCircle2 className="size-5 text-accent" />
          ) : (
            <UploadCloud className="size-5" />
          )}
        </div>
        <div>
          <div className="text-sm font-medium">
            {fileName ? fileName : "Drop your PDF resume here, or click to browse"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            PDF only · max 5MB · text-based files work best
          </div>
        </div>
        {stage === "done" && fileName ? (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              reset();
            }}
            className="text-xs gap-1"
          >
            <X className="size-3" /> Upload another
          </Button>
        ) : null}
      </label>

      {stage !== "idle" && stage !== "done" ? (
        <div className="rounded-xl border border-border bg-card/50 p-3">
          <ProgressStep
            label="Uploading"
            active={stage === "uploading"}
            done={stage !== "uploading" && stage !== "error"}
            error={stage === "error"}
          />
          <ProgressStep
            label="Reading PDF"
            active={stage === "parsing"}
            done={stage === "analyzing"}
            error={stage === "error"}
          />
          <ProgressStep
            label="Analyzing with AI"
            active={stage === "parsing" || stage === "analyzing"}
            done={false}
            error={stage === "error"}
          />
        </div>
      ) : null}
    </div>
  );
}

function ProgressStep({
  label,
  active,
  done,
  error,
}: {
  label: string;
  active: boolean;
  done: boolean;
  error: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 text-xs">
      <div
        className={cn(
          "size-5 rounded-full grid place-items-center transition",
          error
            ? "bg-destructive/15 text-destructive"
            : done
              ? "bg-accent/15 text-accent"
              : active
                ? "bg-brand/15 text-brand"
                : "bg-muted text-muted-foreground",
        )}
      >
        {error ? (
          <X className="size-3" />
        ) : done ? (
          <CheckCircle2 className="size-3" />
        ) : active ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <FileText className="size-3" />
        )}
      </div>
      <span className={cn(done ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );
}
