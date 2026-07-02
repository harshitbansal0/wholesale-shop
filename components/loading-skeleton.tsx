import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} cols={cols} />
      ))}
    </>
  );
}

const chartBarHeights = [45, 65, 35, 70, 50, 80, 40, 55, 72, 60];

export function SkeletonChart() {
  return (
    <div className="flex items-end gap-2 h-full px-4 pb-6">
      {chartBarHeights.map((h, i) => (
        <Skeleton
          key={i}
          className="flex-1"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
