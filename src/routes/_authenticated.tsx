import {
  createFileRoute,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { CoachPanelProvider } from "@/components/coach-panel-provider";
import { CoachPanel } from "@/components/coach-panel";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

function isFocusRoute(pathname: string): boolean {
  return pathname.startsWith("/interview/") || pathname.startsWith("/report/");
}

function AuthedLayout() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const focusMode = useMemo(() => isFocusRoute(location.pathname), [location.pathname]);
  const [open, setOpen] = useState<boolean>(() => !isFocusRoute(location.pathname));

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: "/auth" });
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    setOpen(!focusMode);
  }, [focusMode]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-brand" />
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Loading…
          </p>
        </div>
      </div>
    );
  }

  return (
    <CoachPanelProvider>
      <SidebarProvider open={open} onOpenChange={setOpen}>
        <AppSidebar />
        <SidebarInset className="bg-background">
          <AppTopbar />
          <main className="flex-1 min-w-0">
            <div key={location.pathname} className="slide-up">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
        <CoachPanel />
      </SidebarProvider>
    </CoachPanelProvider>
  );
}
