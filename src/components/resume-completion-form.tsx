import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { upsertProfile } from "@/lib/interviews.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, X, Plus } from "lucide-react";

const LEVELS = [
  { id: "entry", label: "Entry (0-2 yrs)" },
  { id: "mid", label: "Mid (2-5 yrs)" },
  { id: "senior", label: "Senior (5-8 yrs)" },
  { id: "staff", label: "Staff (8-12 yrs)" },
  { id: "principal", label: "Principal (12+ yrs)" },
] as const;

type Level = (typeof LEVELS)[number]["id"];

export type ResumeCompletionMissing = {
  target_role: boolean;
  experience_level: boolean;
  skills: boolean;
};

type Props = {
  missing: ResumeCompletionMissing;
  initial: {
    target_role: string | null;
    experience_level: Level | null;
    skills: string[];
  };
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
};

export function ResumeCompletionForm({
  missing,
  initial,
  onComplete,
  onSkip,
  className,
}: Props) {
  const save = useServerFn(upsertProfile);
  const [role, setRole] = useState(initial.target_role ?? "");
  const [level, setLevel] = useState<Level | "">(initial.experience_level ?? "");
  const [skills, setSkills] = useState<string[]>(initial.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);

  function addSkill() {
    const v = skillInput.trim();
    if (!v) return;
    if (skills.includes(v)) {
      setSkillInput("");
      return;
    }
    setSkills([...skills, v]);
    setSkillInput("");
  }

  async function handleSave() {
    setSaving(true);
    try {
      await save({
        data: {
          target_role: missing.target_role ? role.trim() || null : undefined,
          experience_level: missing.experience_level ? (level || null) : undefined,
          skills: missing.skills ? skills : undefined,
        },
      });
      toast.success("Profile updated.");
      onComplete?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const nothingToShow = !missing.target_role && !missing.experience_level && !missing.skills;
  if (nothingToShow) return null;

  return (
    <div className={`rounded-2xl border border-brand/30 bg-brand/[0.04] p-5 space-y-4 ${className ?? ""}`}>
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-xl bg-brand/15 text-brand grid place-items-center shrink-0">
          <Sparkles className="size-4" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Sharpen your interviews</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            We couldn't extract everything from your resume. Filling in the rest helps the AI tailor questions to you.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {missing.target_role && (
          <div className="space-y-1.5">
            <Label className="text-xs">Target role</Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Senior Backend Engineer"
            />
          </div>
        )}

        {missing.experience_level && (
          <div className="space-y-1.5">
            <Label className="text-xs">Experience level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a level" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {missing.skills && (
          <div className="space-y-1.5">
            <Label className="text-xs">Skills (add at least 3)</Label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Type a skill and press Enter"
              />
              <Button type="button" variant="outline" size="icon" onClick={addSkill}>
                <Plus className="size-4" />
              </Button>
            </div>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand/15 text-brand text-[11px]"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => setSkills(skills.filter((x) => x !== s))}
                      className="hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={() => onSkip?.()} disabled={saving}>
          Skip for now
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="bg-brand text-brand-foreground hover:opacity-90"
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" /> Saving…
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}
