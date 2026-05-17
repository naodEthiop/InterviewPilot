import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const items: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label="Toggle theme"
        >
          <Sun className={`size-4 transition-all ${resolvedTheme === "dark" ? "scale-0 -rotate-90" : "scale-100 rotate-0"}`} />
          <Moon className={`absolute size-4 transition-all ${resolvedTheme === "dark" ? "scale-100 rotate-0" : "scale-0 rotate-90"}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {items.map((it) => {
          const Icon = it.icon;
          const active = theme === it.id;
          return (
            <DropdownMenuItem
              key={it.id}
              onClick={() => setTheme(it.id)}
              className={active ? "bg-accent/40" : ""}
            >
              <Icon className="size-4" />
              <span className="ml-2">{it.label}</span>
              {active && <span className="ml-auto text-xs text-muted-foreground">on</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
