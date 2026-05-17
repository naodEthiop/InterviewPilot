import { useRef, useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listCoachMessages,
  sendCoachMessage,
  clearCoachMessages,
} from "@/lib/coach.functions";
import { useCoachPanel } from "@/components/coach-panel-provider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, SendHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CoachPanel() {
  const { open, setOpen } = useCoachPanel();
  const qc = useQueryClient();
  const fetchList = useServerFn(listCoachMessages);
  const send = useServerFn(sendCoachMessage);
  const clear = useServerFn(clearCoachMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["coach-messages"],
    queryFn: () => fetchList(),
    enabled: open,
  });

  const sendMut = useMutation({
    mutationFn: (content: string) => send({ data: { content } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-messages"] });
      setInput("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Send failed"),
  });

  const clearMut = useMutation({
    mutationFn: () => clear(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-messages"] });
      toast.success("Conversation cleared.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Clear failed"),
  });

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open, sendMut.isPending]);

  function handleSend() {
    const t = input.trim();
    if (!t || sendMut.isPending) return;
    sendMut.mutate(t);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex h-full w-full flex-col sm:max-w-md p-0 gap-0">
        <SheetHeader className="p-4 border-b border-border text-left space-y-1">
          <SheetTitle className="font-display">Interview coach</SheetTitle>
          <SheetDescription className="text-xs">
            Ask for feedback and study tips grounded in your past reports.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 px-4">
          <div className="py-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Say hi — I will use your profile and recent interview reports when relevant.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-brand text-brand-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {sendMut.isPending ? (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-secondary px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="size-3 animate-spin" /> Thinking…
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border space-y-2">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={sendMut.isPending}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={sendMut.isPending || !input.trim()}
              className="shrink-0 bg-brand text-brand-foreground hover:opacity-90"
            >
              {sendMut.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SendHorizontal className="size-4" />
              )}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground text-xs"
            onClick={() => clearMut.mutate()}
            disabled={clearMut.isPending || messages.length === 0}
          >
            <Trash2 className="size-3 mr-1" /> Clear conversation
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
