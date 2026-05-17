export function SiteFooter() {
  return (
    <footer className="max-w-7xl mx-auto px-8 py-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-6">
      <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Vocalist AI · Train hard, interview easy.</p>
      <div className="flex gap-6 text-sm text-muted-foreground">
        <a href="#" className="hover:text-foreground">Privacy</a>
        <a href="#" className="hover:text-foreground">Terms</a>
        <a href="#" className="hover:text-foreground">Security</a>
      </div>
    </footer>
  );
}
