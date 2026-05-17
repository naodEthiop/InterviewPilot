import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function RowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4", className)}>
      <Skeleton className="size-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-7 w-16 rounded-md" />
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card/60 p-5 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-12 rounded-md" />
      </div>
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function ListSkeleton({
  count = 3,
  variant = "row",
}: {
  count?: number;
  variant?: "row" | "card";
}) {
  const Item = variant === "card" ? CardSkeleton : RowSkeleton;
  return (
    <div className={cn("space-y-3", variant === "card" && "grid sm:grid-cols-2 lg:grid-cols-3 gap-3 space-y-0")}>
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-2 w-24" />
    </div>
  );
}
