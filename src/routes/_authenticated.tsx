import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useAuth, signOut } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

function AuthedLayout() {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate({ to: "/auth" });
  }, [loading, isAuthenticated, navigate]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border bg-card/30 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="size-7 bg-brand rounded-md grid place-items-center"><div className="size-3 bg-white rounded-sm" /></div>
            <span className="font-display text-base font-bold tracking-tight">VOCALIST</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
            <Link to="/setup" className="text-sm text-muted-foreground hover:text-foreground">New interview</Link>
            <span className="text-xs text-muted-foreground hidden md:inline border-l border-border pl-3">{user?.email}</span>
            <Button size="sm" variant="ghost" onClick={() => signOut()}>Sign out</Button>
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
