import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

type StatusType = "paid" | "partial" | "unpaid";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const config: Record<StatusType, { label: string; icon: typeof CheckCircle2; classes: string }> = {
  paid: {
    label: "Paid",
    icon: CheckCircle2,
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  },
  partial: {
    label: "Partial",
    icon: Clock,
    classes: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  },
  unpaid: {
    label: "Unpaid",
    icon: AlertCircle,
    classes: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  },
};

export function getPaymentStatus(paid: number, total: number): StatusType {
  if (paid >= total) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, icon: Icon, classes } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        classes,
        className
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}
