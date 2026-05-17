import { Link } from "@tanstack/react-router";
import { useAuth, signOut } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sparkles } from "lucide-react";

export function SiteNav() {
  const { isAuthenticated, loading } = useAuth();
  return (
    <nav className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-5 max-w-7xl mx-auto">
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className="size-8 rounded-lg bg-gradient-brand grid place-items-center shadow-sm shadow-brand/30 group-hover:rotate-6 transition-transform">
          <Sparkles className="size-4 text-white" />
        </div>
        <span className="font-display text-xl font-bold tracking-tight">VOCALIST</span>
      </Link>
      <div className="flex items-center gap-1.5 md:gap-3 text-sm font-medium">
        <Link
          to="/"
          hash="modes"
          className="hidden md:inline px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          Modes
        </Link>
        <Link
          to="/"
          hash="how"
          className="hidden md:inline px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          How it works
        </Link>
        <ThemeToggle />
        {loading ? null : isAuthenticated ? (
          <>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => signOut()}>
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button
                size="sm"
                className="bg-brand text-brand-foreground hover:opacity-90 rounded-full"
              >
                Get started
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
