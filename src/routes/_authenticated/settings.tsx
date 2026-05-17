import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getProfile, upsertProfile } from "@/lib/interviews.functions";
import { useAuth, signOut } from "@/hooks/use-auth";
import { useTheme, type Theme } from "@/components/theme-provider";
import { PageHeader } from "@/components/page-header";
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
import { Settings as SettingsIcon, Loader2, LogOut, Sun, Moon, Monitor, X, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings · Vocalist" }] }),
});

const LEVELS = [
  { id: "entry", label: "Entry" },
  { id: "mid", label: "Mid" },
  { id: "senior", label: "Senior" },
  { id: "staff", label: "Staff" },
  { id: "principal", label: "Principal" },
] as const;
type Level = (typeof LEVELS)[number]["id"];

function SettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const fetchProfile = useServerFn(getProfile);
  const save = useServerFn(upsertProfile);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  const [displayName, setDisplayName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [level, setLevel] = useState<Level | "">("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setTargetRole(profile.target_role ?? "");
    setLevel(((profile.experience_level as Level) ?? "") || "");
    setSkills(profile.skills ?? []);
  }, [profile]);

  function addSkill() {
    const v = skillInput.trim();
    if (!v || skills.includes(v)) {
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
          display_name: displayName.trim() || null,
          target_role: targetRole.trim() || null,
          experience_level: (level || null) as Level | null,
          skills,
        },
      });
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-10 space-y-6 fade-in">
      <PageHeader
        icon={<SettingsIcon className="size-5" />}
        title="Settings"
        subtitle="Tune your profile, appearance, and account."
      />

      <section className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div>
          <h2 className="font-display text-base font-semibold">Profile</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Used to personalize interview questions.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-10 rounded-md bg-muted shimmer" />
            <div className="h-10 rounded-md bg-muted shimmer" />
            <div className="h-10 rounded-md bg-muted shimmer" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Display name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Target role</Label>
              <Input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Backend Engineer"
              />
            </div>

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

            <div className="space-y-1.5">
              <Label className="text-xs">Skills</Label>
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

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-brand text-brand-foreground hover:opacity-90"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" /> Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="font-display text-base font-semibold">Appearance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Switch between light, dark, or your system preference.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 max-w-sm">
          <ThemeOption current={theme} value="light" icon={Sun} label="Light" onSelect={setTheme} />
          <ThemeOption current={theme} value="dark" icon={Moon} label="Dark" onSelect={setTheme} />
          <ThemeOption current={theme} value="system" icon={Monitor} label="System" onSelect={setTheme} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-base font-semibold">Account</h2>
            <p className="text-xs text-muted-foreground mt-0.5 break-all">
              Signed in as {user?.email}
            </p>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="size-4 mr-1.5" /> Sign out
          </Button>
        </div>
      </section>
    </div>
  );
}

function ThemeOption({
  current,
  value,
  icon: Icon,
  label,
  onSelect,
}: {
  current: Theme;
  value: Theme;
  icon: typeof Sun;
  label: string;
  onSelect: (t: Theme) => void;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 text-sm transition ${
        active ? "border-brand bg-brand/10 text-brand" : "border-border hover:border-brand/30"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
