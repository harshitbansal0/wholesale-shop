import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface MoneyDisplayProps {
  amount: number;
  variant?: "neutral" | "paid" | "due";
  showIcon?: boolean;
  className?: string;
}

export function MoneyDisplay({
  amount,
  variant = "neutral",
  showIcon = false,
  className,
}: MoneyDisplayProps) {
  return (
    <span
      className={cn(
        "tabular-nums inline-flex items-center gap-1",
        variant === "paid" && "text-emerald-600 dark:text-emerald-400",
        variant === "due" && amount > 0 && "text-red-600 dark:text-red-400",
        className
      )}
    >
      {showIcon && variant === "paid" && <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />}
      {showIcon && variant === "due" && amount > 0 && <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />}
      {variant === "due" && amount <= 0 ? (
        <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
          {showIcon && <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />}
          Paid
        </span>
      ) : (
        formatCurrency(amount)
      )}
    </span>
  );
}
