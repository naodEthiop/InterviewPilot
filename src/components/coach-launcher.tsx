import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { useCoachPanel } from "@/components/coach-panel-provider";
import { useLocation } from "@tanstack/react-router";

export function CoachLauncher() {
  const { setOpen, open } = useCoachPanel();
  const location = useLocation();
  if (location.pathname.startsWith("/interview/")) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setOpen(!open)}
      aria-label={open ? "Close AI coach" : "Open AI coach"}
      className="shrink-0"
    >
      <Bot className="size-4" />
    </Button>
  );
}
