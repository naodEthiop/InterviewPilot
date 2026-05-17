import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { startInterview, interviewerTurn, generateReport, getInterviewBundle } from "@/lib/interviews.functions";
import { speakText } from "@/lib/voice.functions";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, MicOff, Square } from "lucide-react";
import { toast } from "sonner";
import interviewerAvatar from "@/assets/interviewer-avatar.jpg";

export const Route = createFileRoute("/_authenticated/interview/$id")({
  component: Session,
  head: () => ({ meta: [{ title: "Interview · Vocalist" }] }),
});

type Msg = { role: "interviewer" | "candidate"; content: string };

function Session() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const start = useServerFn(startInterview);
  const turn = useServerFn(interviewerTurn);
  const report = useServerFn(generateReport);
  const bundle = useServerFn(getInterviewBundle);
  const speak = useServerFn(speakText);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [interview, setInterview] = useState<any>(null);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [partial, setPartial] = useState("");
  const [done, setDone] = useState(false);

  const recogRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load and start
  useEffect(() => {
    let mounted = true;
    (async () => {
      const b = await bundle({ data: { interviewId: id } });
      if (!mounted || !b.interview) return;
      setInterview(b.interview);
      setMessages(b.messages.map((m: any) => ({ role: m.role, content: m.content })));
      if (b.interview.status === "completed") {
        setDone(true);
        return;
      }
      if (b.messages.length === 0) {
        const s = await start({ data: { interviewId: id } });
        setMessages([{ role: "interviewer", content: s.opening }]);
        await playTts(s.opening, b.interview.interviewer_persona);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  async function playTts(text: string, persona?: string) {
    setAiSpeaking(true);
    try {
      const res = await speak({ data: { text, persona: persona ?? interview?.interviewer_persona } });
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

  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition not supported in this browser. Use Chrome or Edge.");
      return;
    }
    const recog = new SR();
    recog.lang = "en-US";
    recog.continuous = true;
    recog.interimResults = true;
    let finalText = "";
    recog.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      setPartial(finalText + interim);
    };
    recog.onerror = (e: any) => {
      if (e.error !== "no-speech") toast.error(`Mic: ${e.error}`);
    };
    recog.onend = () => setListening(false);
    recog.start();
    recogRef.current = recog;
    setListening(true);
    setPartial("");
  }

  async function stopAndSend() {
    if (!recogRef.current) return;
    recogRef.current.stop();
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

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-8 py-8">
      {interview && (
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
              {interview.mode} · {interview.interviewer_persona} · {interview.difficulty}
            </p>
            <h1 className="font-display text-2xl font-bold">{interview.role}</h1>
          </div>
          {done ? (
            <Button onClick={finishInterview} disabled={finishing} className="bg-brand text-brand-foreground hover:opacity-90 rounded-xl">
              {finishing ? <><Loader2 className="size-4 animate-spin mr-2" /> Generating report…</> : "View report →"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setDone(true)} size="sm">End interview</Button>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 md:p-10 flex flex-col items-center">
          <div className={`size-32 rounded-full overflow-hidden ring-2 ${aiSpeaking ? "ring-brand orb-breath" : "ring-border"} mb-5 transition-all`}>
            <img src={interviewerAvatar} alt="AI interviewer" className="size-full object-cover" />
          </div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
            {aiSpeaking ? "Speaking" : thinking ? "Thinking" : listening ? "Listening to you" : "Ready"}
          </p>
          <div className="flex items-end gap-1 h-10 mb-8">
            {[5, 9, 12, 7, 11, 5, 9, 12].map((h, i) => (
              <div key={i}
                className={`w-1 rounded-full bg-brand ${aiSpeaking || listening ? "voice-bar" : "opacity-30"}`}
                style={{ height: `${h * 2.5}px`, animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>

          <div className="w-full max-w-md min-h-[80px] bg-secondary/40 rounded-2xl p-5 border border-border text-center mb-6">
            <p className="text-sm leading-relaxed">
              {messages.filter((m) => m.role === "interviewer").slice(-1)[0]?.content ?? "Connecting…"}
            </p>
          </div>

          {!done && (
            <div className="w-full max-w-md">
              {listening && (
                <div className="mb-3 p-3 bg-input border border-border rounded-lg text-sm min-h-[44px]">
                  {partial || <span className="text-muted-foreground italic">Listening…</span>}
                </div>
              )}
              <div className="flex gap-2 justify-center">
                {!listening ? (
                  <Button onClick={startListening} disabled={aiSpeaking || thinking} size="lg" className="bg-brand text-brand-foreground hover:opacity-90 rounded-xl glow-brand">
                    <Mic className="size-4 mr-2" /> Speak
                  </Button>
                ) : (
                  <Button onClick={stopAndSend} size="lg" className="bg-destructive text-destructive-foreground hover:opacity-90 rounded-xl">
                    <Square className="size-4 mr-2" /> Done speaking
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Transcript</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {messages.length === 0 && <p className="text-xs text-muted-foreground">Will appear here…</p>}
            {messages.map((m, i) => (
              <div key={i} className={`text-sm ${m.role === "interviewer" ? "" : "pl-4 border-l-2 border-brand/40"}`}>
                <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
                  {m.role === "interviewer" ? "Interviewer" : "You"}
                </div>
                <p className="leading-relaxed">{m.content}</p>
              </div>
            ))}
            {thinking && <p className="text-xs text-muted-foreground italic">Interviewer is thinking…</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
