import { Link, useLocation } from "@tanstack/react-router";
import { Mic } from "lucide-react";
import {
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CoachLauncher } from "@/components/coach-launcher";

const TITLES: Record<string, string> = {
  "/dashboard": "Home",
  "/setup": "New Interview",
  "/history": "History",
  "/reports": "Reports",
  "/resumes": "Resumes",
  "/learn": "Learn",
  "/settings": "Settings",
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/interview/")) return "Interview";
  if (pathname.startsWith("/report/")) return "Report";
  return "Vocalist";
}

export function AppTopbar() {
  const location = useLocation();
  const title = titleFor(location.pathname);
  const hideInterviewChrome = location.pathname.startsWith("/interview/");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-base font-semibold tracking-tight truncate">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {!hideInterviewChrome ? (
          <Link to="/setup" className="hidden sm:inline-flex">
            <Button size="sm" className="bg-brand text-brand-foreground hover:opacity-90 rounded-lg gap-1.5">
              <Mic className="size-4" />
              New Interview
            </Button>
          </Link>
        ) : null}
        {!hideInterviewChrome ? <CoachLauncher /> : null}
        <ThemeToggle />
      </div>
    </header>
  );
}
