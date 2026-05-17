import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12",
        className,
      )}
    >
      {icon ? (
        <div className="size-14 rounded-2xl bg-brand/10 text-brand grid place-items-center mb-4">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-md">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
