import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, eyebrow, icon, actions, className }: Props) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon ? (
          <div className="size-10 shrink-0 rounded-xl bg-brand/10 text-brand grid place-items-center mt-0.5">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-1">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}
