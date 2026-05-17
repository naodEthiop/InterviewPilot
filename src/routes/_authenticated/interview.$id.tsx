import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  startInterview,
  interviewerTurn,
  generateReport,
  getInterviewBundle,
  endInterview,
  flagInterviewIntegrity,
  type InterviewQuestionsBlob,
} from "@/lib/interviews.functions";
import { speakText } from "@/lib/voice.functions";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Square, Sparkles, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import interviewerAvatar from "@/assets/interviewer-avatar.jpg";
import { useInterviewTimer } from "@/hooks/use-interview-timer";
import { useRealModeGuard, type IntegrityKind } from "@/hooks/use-real-mode-guard";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/interview/$id")({
  component: Session,
  head: () => ({ meta: [{ title: "Interview · Vocalist" }] }),
});

type Msg = { role: "interviewer" | "candidate"; content: string };

function asQ(q: unknown): InterviewQuestionsBlob {
  return q && typeof q === "object" && !Array.isArray(q) ? (q as InterviewQuestionsBlob) : {};
}

function Session() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const start = useServerFn(startInterview);
  const turn = useServerFn(interviewerTurn);
  const report = useServerFn(generateReport);
  const bundle = useServerFn(getInterviewBundle);
  const speak = useServerFn(speakText);
  const endInterviewFn = useServerFn(endInterview);
  const flagIntegrity = useServerFn(flagInterviewIntegrity);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [interview, setInterview] = useState<{
    role: string | null;
    mode: string;
    interviewer_persona: string | null;
    difficulty: string | null;
    status: string | null;
    questions: unknown;
    started_at: string | null;
  } | null>(null);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [partial, setPartial] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [realGatePassed, setRealGatePassed] = useState(false);
  const [strikeWarn, setStrikeWarn] = useState(false);

  const recogRef = useRef<unknown>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const sessionStartedRef = useRef(false);
  const strikesRef = useRef(0);
  const endingRef = useRef(false);

  const qBlob = interview ? asQ(interview.questions) : {};
  const runMode = qBlob.run_mode ?? "practice";
  const limitSec = qBlob.time_limit_seconds ?? 1800;
  const mobileRealBlock = runMode === "real" && isMobile;

  const guardEnabled = runMode === "real" && realGatePassed && !done && !loading;

  const autoEndRef = useRef<(reason: "time_up" | "forfeit") => void>(() => {});

  const autoEnd = useCallback(
    async (reason: "time_up" | "forfeit") => {
      if (endingRef.current) return;
      endingRef.current = true;
      setFinishing(true);
      if (reason === "time_up") toast.error("Time's up.");
      try {
        await endInterviewFn({ data: { interviewId: id, reason } });
        await report({ data: { interviewId: id } });
        navigate({ to: "/report/$id", params: { id } });
      } catch (err) {
        endingRef.current = false;
        setFinishing(false);
        toast.error(err instanceof Error ? err.message : "Could not finish");
      }
    },
    [endInterviewFn, report, navigate, id],
  );
  autoEndRef.current = autoEnd;

  const onViolation = useCallback(
    (kind: IntegrityKind) => {
      void flagIntegrity({ data: { interviewId: id, kind } }).catch(() => {});
      strikesRef.current += 1;
      if (strikesRef.current === 1) {
        setStrikeWarn(true);
        toast.warning("First and final warning — one more violation will end this interview.");
      } else if (strikesRef.current >= 2) {
        toast.error("Interview forfeited.");
        void autoEndRef.current("forfeit");
      }
    },
    [flagIntegrity, id],
  );

  const { requestFullscreen } = useRealModeGuard({
    enabled: guardEnabled,
    fullscreenArmed: realGatePassed,
    onViolation,
  });

  const timerEnabled =
    !!interview?.started_at &&
    interview.status === "active" &&
    !done &&
    !loading &&
    !mobileRealBlock &&
    (runMode === "practice" || realGatePassed);

  const { remainingSec, mmss, warning } = useInterviewTimer({
    startedAt: interview?.started_at,
    limitSec,
    enabled: timerEnabled,
    onExpire: () => autoEndRef.current("time_up"),
  });

  async function playTts(
    text: string,
    opts?: { persona?: string; voiceGender?: "male" | "female" },
  ) {
    setAiSpeaking(true);
    try {
      const persona = opts?.persona ?? interview?.interviewer_persona ?? undefined;
      const q = interview?.questions as
        | { voice_gender?: "male" | "female" }
        | null
        | undefined;
      const voiceGender = opts?.voiceGender ?? q?.voice_gender;
      const res = await speak({ data: { text, persona, voiceGender } });
      const audio = new Audio(`data:${res.mime};base64,${res.audio}`);
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    } catch (e) {
      console.error(e);
    } finally {
      setAiSpeaking(false);
    }
  }

  useEffect(() => {
    document.body.classList.add("select-none");
    return () => document.body.classList.remove("select-none");
  }, []);

  useEffect(() => {
    let mounted = true;
    sessionStartedRef.current = false;
    setRealGatePassed(false);
    setStrikeWarn(false);
    strikesRef.current = 0;
    endingRef.current = false;
    (async () => {
      try {
        const b = await bundle({ data: { interviewId: id } });
        if (!mounted || !b.interview) return;
        setInterview(b.interview);
        setMessages(
          b.messages.map((m) => ({
            role: m.role as "interviewer" | "candidate",
            content: m.content,
          })),
        );
        if (b.messages.length > 0) sessionStartedRef.current = true;
        if (b.interview.status === "completed") {
          setDone(true);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, bundle]);

  useEffect(() => {
    if (!interview || interview.status !== "active" || loading) return;
    if (mobileRealBlock) return;
    if (runMode === "real" && !realGatePassed) return;
    if (sessionStartedRef.current) return;
    if (messages.length > 0) {
      sessionStartedRef.current = true;
      return;
    }

    let cancelled = false;
    sessionStartedRef.current = true;
    (async () => {
      try {
        const s = await start({ data: { interviewId: id } });
        if (cancelled) return;
        setMessages([{ role: "interviewer", content: s.opening }]);
        const vg = asQ(interview.questions).voice_gender;
        await playTts(s.opening, {
          persona: interview.interviewer_persona ?? undefined,
          voiceGender: vg as "male" | "female" | undefined,
        });
      } catch (e) {
        sessionStartedRef.current = false;
        toast.error(e instanceof Error ? e.message : "Could not start session");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview, loading, realGatePassed, runMode, mobileRealBlock, messages.length, id]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, thinking]);

  const blockedByGate =
    loading ||
    mobileRealBlock ||
    (runMode === "real" && !realGatePassed && interview?.status === "active");

  function startListening() {
    if (blockedByGate) return;
    const SR =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition not supported in this browser. Use Chrome or Edge.");
      return;
    }
    const Ctor = SR as new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onresult: (e: unknown) => void;
      onerror: (e: unknown) => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    };
    const recog = new Ctor();
    recog.lang = "en-US";
    recog.continuous = true;
    recog.interimResults = true;
    let finalText = "";
    recog.onresult = (e: unknown) => {
      const ev = e as {
        resultIndex: number;
        results: { isFinal: boolean; [0]: { transcript: string } }[];
      };
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      setPartial(finalText + interim);
    };
    recog.onerror = (e: unknown) => {
      const ev = e as { error: string };
      if (ev.error !== "no-speech") toast.error(`Mic: ${ev.error}`);
    };
    recog.onend = () => setListening(false);
    recog.start();
    recogRef.current = recog;
    setListening(true);
    setPartial("");
  }

  async function stopAndSend() {
    const recog = recogRef.current as { stop: () => void } | null;
    if (!recog) return;
    recog.stop();
    const text = partial.trim();
    setPartial("");
    if (!text) return;
    setMessages((m) => [...m, { role: "candidate", content: text }]);
    setThinking(true);
    try {
      const res = await turn({ data: { interviewId: id, candidateMessage: text } });
      setMessages((m) => [...m, { role: "interviewer", content: res.reply }]);
      setThinking(false);
      await playTts(res.reply);
      if (res.done) {
        setDone(true);
        toast.success("Interview complete. Generating report…");
        setFinishing(true);
        try {
          await report({ data: { interviewId: id } });
          navigate({ to: "/report/$id", params: { id } });
        } catch (err) {
          setFinishing(false);
          toast.error(err instanceof Error ? err.message : "Report failed");
        }
      }
    } catch (e) {
      setThinking(false);
      toast.error(e instanceof Error ? e.message : "Turn failed");
    }
  }

  async function finishInterview() {
    setFinishing(true);
    try {
      await report({ data: { interviewId: id } });
      navigate({ to: "/report/$id", params: { id } });
    } catch (e) {
      setFinishing(false);
      toast.error(e instanceof Error ? e.message : "Report failed");
    }
  }

  async function handlePracticeEnd() {
    setDone(true);
    try {
      await endInterviewFn({ data: { interviewId: id, reason: "completed" } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not end session");
    }
  }

  async function enterRealMode() {
    const ok = await requestFullscreen();
    if (!ok) {
      toast.error("Fullscreen is required for Real mode. Try another browser or use Practice.");
      return;
    }
    setRealGatePassed(true);
  }

  const lastInterviewerLine = messages.filter((m) => m.role === "interviewer").slice(-1)[0]?.content;
  const status = aiSpeaking
    ? "Speaking"
    : thinking
      ? "Thinking"
      : listening
        ? "Listening"
        : loading
          ? "Connecting"
          : done
            ? "Wrapping up"
            : "Ready";

  if (mobileRealBlock && interview) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center fade-in">
        <ShieldAlert className="size-12 text-warning mx-auto mb-4" />
        <h1 className="font-display text-xl font-bold mb-2">Real mode is desktop-only</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Switch to a larger screen or start a new interview in Practice mode.
        </p>
        <Button asChild variant="outline">
          <Link to="/setup">Back to setup</Link>
        </Button>
      </div>
    );
  }

  const showRealGate =
    interview?.status === "active" &&
    runMode === "real" &&
    !realGatePassed &&
    !loading &&
    !mobileRealBlock;

  const fsSupported = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 space-y-6 fade-in">
      {strikeWarn && runMode === "real" ? (
        <div className="sticky top-0 z-20 rounded-xl border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-warning">
          First and final warning — one more violation will end this interview.
        </div>
      ) : null}

      {showRealGate ? (
        <div className="rounded-2xl border border-brand/30 bg-card p-8 text-center max-w-xl mx-auto">
          <h2 className="font-display text-lg font-bold mb-2">Real mode</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            You must stay in fullscreen. Tab switches, leaving fullscreen, and developer shortcuts
            count as violations. Two violations will forfeit the interview.
          </p>
          {!fsSupported ? (
            <p className="text-sm text-destructive mb-4">
              Real mode requires a modern desktop browser with fullscreen support.
            </p>
          ) : null}
          <Button onClick={enterRealMode} className="bg-brand text-brand-foreground hover:opacity-90">
            Enter Real mode
          </Button>
        </div>
      ) : null}

      {interview ? (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.18em] mb-1 capitalize">
              {interview.mode} · {interview.interviewer_persona} · {interview.difficulty}
              {runMode === "real" ? " · real" : ""}
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-bold truncate">
              {interview.role}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {timerEnabled && remainingSec > 0 ? (
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-sm tabular-nums",
                  remainingSec <= 10
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : warning
                      ? "border-warning/50 bg-warning/10 text-warning"
                      : "border-brand/30 bg-brand/10 text-brand",
                )}
              >
                <Clock className="size-4 shrink-0" />
                {mmss}
              </div>
            ) : null}
            {done ? (
              <Button
                onClick={finishInterview}
                disabled={finishing}
                className="bg-brand text-brand-foreground hover:opacity-90 rounded-xl"
              >
                {finishing ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" /> Generating report…
                  </>
                ) : (
                  "View report →"
                )}
              </Button>
            ) : runMode === "real" ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void autoEnd("forfeit")}
                disabled={finishing}
              >
                Exit Real mode
              </Button>
            ) : (
              <Button variant="outline" onClick={handlePracticeEnd} size="sm" disabled={finishing}>
                End interview
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-6 md:p-10 flex flex-col items-center">
          <div className="relative mb-5">
            <div
              className={`absolute inset-0 rounded-full transition ${
                aiSpeaking ? "bg-brand/30 blur-2xl orb-breath" : ""
              }`}
            />
            <div
              className={`relative size-32 rounded-full overflow-hidden ring-2 transition-all ${
                aiSpeaking ? "ring-brand orb-breath" : listening ? "ring-accent" : "ring-border"
              }`}
            >
              <img
                src={interviewerAvatar}
                alt="AI interviewer"
                className="size-full object-cover"
              />
            </div>
          </div>

          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.18em] mb-2">
            {status}
          </p>

          <div className="flex items-end gap-1 h-10 mb-8">
            {[5, 9, 12, 7, 11, 5, 9, 12].map((h, i) => (
              <div
                key={i}
                className={`w-1 rounded-full bg-brand ${
                  aiSpeaking || listening ? "voice-bar" : "opacity-30"
                }`}
                style={{ height: `${h * 2.5}px`, animationDelay: `${i * 0.08}s` }}
              />
            ))}
          </div>

          <div className="w-full max-w-xl min-h-[88px] rounded-2xl bg-secondary/40 border border-border p-5 text-center mb-6">
            <p className="text-sm leading-relaxed">
              {lastInterviewerLine ??
                (loading ? "Connecting to interviewer…" : "Ready when you are.")}
            </p>
          </div>

          {!done && !showRealGate && (
            <div className="w-full max-w-xl">
              {listening && (
                <div className="mb-3 p-3 bg-input border border-border rounded-xl text-sm min-h-[44px]">
                  {partial || (
                    <span className="text-muted-foreground italic">Listening…</span>
                  )}
                </div>
              )}
              <div className="flex gap-2 justify-center">
                {!listening ? (
                  <Button
                    onClick={startListening}
                    disabled={aiSpeaking || thinking || loading || blockedByGate}
                    size="lg"
                    className="bg-brand text-brand-foreground hover:opacity-90 rounded-xl glow-brand"
                  >
                    <Mic className="size-4 mr-2" /> Speak
                  </Button>
                ) : (
                  <Button
                    onClick={stopAndSend}
                    size="lg"
                    className="bg-destructive text-destructive-foreground hover:opacity-90 rounded-xl"
                  >
                    <Square className="size-4 mr-2" /> Done speaking
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-border bg-card p-5 flex flex-col min-h-[400px] lg:max-h-[680px]">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-border sticky top-0 bg-card">
            <h3 className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.18em]">
              Transcript
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground">
              {messages.length} {messages.length === 1 ? "turn" : "turns"}
            </span>
          </div>
          <div ref={transcriptRef} className="space-y-3 overflow-y-auto pr-1 flex-1">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground">Will appear here…</p>
            ) : null}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm ${
                  m.role === "interviewer" ? "" : "pl-4 border-l-2 border-brand/40"
                } fade-in`}
              >
                <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
                  {m.role === "interviewer" ? "Interviewer" : "You"}
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {thinking ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                <Sparkles className="size-3 text-brand animate-pulse" />
                Interviewer is thinking…
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
