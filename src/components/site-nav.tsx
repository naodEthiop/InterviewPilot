import { Link } from "@tanstack/react-router";
import { useAuth, signOut } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function SiteNav() {
  const { isAuthenticated, loading } = useAuth();
  return (
    <nav className="flex items-center justify-between px-6 md:px-8 py-5 max-w-7xl mx-auto">
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className="size-8 bg-brand rounded-lg flex items-center justify-center group-hover:rotate-6 transition-transform">
          <div className="size-3.5 bg-white rounded-sm" />
        </div>
        <span className="font-display text-xl font-bold text-foreground tracking-tight">VOCALIST</span>
      </Link>
      <div className="flex items-center gap-2 md:gap-6 text-sm font-medium">
        <Link to="/" hash="modes" className="hidden md:inline text-muted-foreground hover:text-foreground transition-colors">Modes</Link>
        <Link to="/" hash="how" className="hidden md:inline text-muted-foreground hover:text-foreground transition-colors">How it works</Link>
        {loading ? null : isAuthenticated ? (
          <>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => signOut()}>Sign out</Button>
          </>
        ) : (
          <>
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth">
              <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 rounded-full">Get started</Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
