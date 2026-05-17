import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import interviewerAvatar from "@/assets/interviewer-avatar.jpg";
import { Mic, FileText, BarChart3, Sparkles, ArrowRight, Brain, Users, Code2, Network } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Vocalist — Realistic AI interview practice" },
      { name: "description", content: "Upload your resume, run voice interviews with a multi-agent AI panel, get a coaching roadmap." },
    ],
  }),
});

const modes = [
  { icon: Users, name: "HR Interview", desc: "Personality, teamwork, leadership, conflict, communication.", tag: "01_HR" },
  { icon: Code2, name: "Technical", desc: "Backend, frontend, AI/ML, mobile, DevOps, security.", tag: "02_TECH" },
  { icon: Brain, name: "Behavioral", desc: "STAR-method storytelling under pressure.", tag: "03_BEH" },
  { icon: Network, name: "System Design", desc: "Scalability, caching, databases, APIs, microservices.", tag: "04_SYS" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <SiteNav />

      {/* HERO */}
      <section className="relative max-w-7xl mx-auto px-6 md:px-8 pt-16 pb-28 text-center">
        <div className="absolute inset-x-0 top-0 h-[480px] grid-bg -z-10" />
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-bold tracking-wider uppercase mb-8">
          <Sparkles className="size-3" />
          Multi-agent AI panel · ElevenLabs voice
        </div>
        <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] mb-7 max-w-4xl mx-auto text-balance">
          The most realistic way to <span className="text-brand">practice interviews.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Upload your resume, pick a mode, and run a real-voice interview. Our multi-agent AI panel adapts every follow-up, then delivers a brutally honest scorecard and a roadmap to hire.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="px-7 py-6 text-base rounded-xl bg-brand text-brand-foreground hover:opacity-90 glow-brand">
              Upload resume to start <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="lg" variant="outline" className="px-7 py-6 text-base rounded-xl">
              View sample dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="max-w-6xl mx-auto px-6 md:px-8 pb-28">
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
          <div className="border-b border-border p-5 flex items-center justify-between bg-card/50">
            <div className="flex items-center gap-3">
              <div className="size-2.5 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium text-muted-foreground">Session · Senior Systems Engineer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 bg-secondary rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-brand" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold font-mono">42:00 left</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-12">
            <div className="lg:col-span-8 p-8 md:p-10 border-r border-border bg-background/40">
              <div className="flex flex-col items-center text-center py-8">
                <div className="size-28 rounded-full overflow-hidden ring-2 ring-brand/30 mb-5 orb-breath">
                  <img src={interviewerAvatar} alt="AI interviewer" width={768} height={768} className="size-full object-cover" />
                </div>
                <h3 className="text-xl font-display font-bold mb-1">Sarah · Technical Lead</h3>
                <p className="text-muted-foreground text-sm mb-10">Topic: Scalability & sharding</p>

                <div className="flex items-end gap-1 h-12 mb-10">
                  {[4, 8, 12, 6, 10, 4, 8, 12, 6].map((h, i) => (
                    <div key={i} className="w-1 voice-bar rounded-full bg-brand" style={{ height: `${h * 3}px`, animationDelay: `${i * 0.08}s` }} />
                  ))}
                </div>

                <div className="w-full max-w-md bg-secondary/50 rounded-2xl p-5 border border-border">
                  <p className="italic leading-relaxed text-center text-sm">
                    "Interesting take on consistency. How would your design handle a partition between primary and replica nodes?"
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 p-7 space-y-8">
              <div>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 font-mono">Active panel</h4>
                <div className="space-y-2">
                  {[
                    { name: "Evaluator", status: "Scoring", active: true },
                    { name: "Coach", status: "Standby", active: false },
                    { name: "Report", status: "Standby", active: false },
                  ].map((a) => (
                    <div key={a.name} className="flex items-center justify-between p-3 bg-secondary/40 border border-border rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <div className={`size-2 rounded-full ${a.active ? "bg-accent animate-pulse" : "bg-muted-foreground/40"}`} />
                        <span className="text-sm">{a.name}</span>
                      </div>
                      <span className={`text-[10px] font-mono ${a.active ? "text-accent" : "text-muted-foreground"}`}>{a.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 font-mono">Interim score</h4>
                <div className="space-y-3">
                  {[{ l: "Technical", v: 88, c: "bg-accent" }, { l: "Communication", v: 72, c: "bg-brand" }].map((s) => (
                    <div key={s.l}>
                      <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">{s.l}</span><span>{s.v}%</span></div>
                      <div className="h-1 w-full bg-secondary rounded-full overflow-hidden"><div className={`h-full ${s.c}`} style={{ width: `${s.v}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-brand/5 border border-brand/15 rounded-lg">
                <p className="text-xs text-brand/90 leading-relaxed">
                  <span className="font-bold uppercase">Live tip · </span>You're saying "um" frequently. Take a breath before complex data flows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODES */}
      <section id="modes" className="max-w-7xl mx-auto px-6 md:px-8 pb-28">
        <div className="mb-10">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Choose your battlefield</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold">Five interview modes, one platform.</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {modes.map((m) => (
            <div key={m.name} className="group p-5 bg-card border border-border rounded-xl hover:border-brand/40 transition-colors">
              <div className="flex items-center justify-between mb-6">
                <m.icon className="size-5 text-brand" />
                <span className="text-[10px] font-mono text-muted-foreground">{m.tag}</span>
              </div>
              <h3 className="text-sm font-semibold mb-1.5">{m.name}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="max-w-6xl mx-auto px-6 md:px-8 pb-32">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">How it works</p>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-10">Four steps from upload to roadmap.</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { icon: FileText, n: "01", t: "Upload resume", d: "AI extracts skills and likely gaps." },
            { icon: Sparkles, n: "02", t: "Pick mode", d: "Role, persona, difficulty." },
            { icon: Mic, n: "03", t: "Voice interview", d: "Speak naturally. Adaptive follow-ups." },
            { icon: BarChart3, n: "04", t: "Multi-agent report", d: "Scores, ideal answers, roadmap." },
          ].map((s) => (
            <div key={s.n} className="p-6 bg-card border border-border rounded-xl">
              <span className="font-mono text-[10px] text-muted-foreground">{s.n}</span>
              <s.icon className="size-6 text-brand mt-3 mb-4" />
              <h3 className="font-semibold mb-1.5">{s.t}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/auth">
            <Button size="lg" className="rounded-xl bg-brand text-brand-foreground hover:opacity-90 glow-brand">
              Start your first interview <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
