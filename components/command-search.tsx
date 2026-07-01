"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Users, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface SearchResult {
  customers: { _id: string; name: string; phone: string; totalDue: number }[];
  bills: { _id: string; billNumber: string; customerName: string; date: string; grandTotal: number; dueAmount: number }[];
}

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ customers: [], bills: [] });
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults({ customers: [], bills: [] });
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
      setActiveIndex(0);
    } catch {
      setResults({ customers: [], bills: [] });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  const allItems = [
    ...results.customers.map((c) => ({ type: "customer" as const, id: c._id, ...c })),
    ...results.bills.map((b) => ({ type: "bill" as const, id: b._id, ...b })),
  ];

  function navigate(index: number) {
    const item = allItems[index];
    if (!item) return;
    if (item.type === "customer") router.push(`/customers/${item.id}`);
    else router.push(`/bills/${item.id}`);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allItems.length > 0) {
      e.preventDefault();
      navigate(activeIndex);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
      <DialogContent className="p-0 gap-0 max-w-lg">
        <div className="flex items-center border-b px-3">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search customers, bills..."
            className="border-0 focus-visible:ring-0 focus-visible:border-transparent h-12 text-base"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {allItems.length > 0 && (
          <div className="max-h-[300px] overflow-y-auto p-2">
            {results.customers.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Users className="size-3" />
                  Customers
                </div>
                {results.customers.map((c, i) => (
                  <button
                    key={c._id}
                    onClick={() => navigate(i)}
                    className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                      activeIndex === i ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground text-xs">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {results.bills.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <FileText className="size-3" />
                  Bills
                </div>
                {results.bills.map((b, rawI) => {
                  const i = results.customers.length + rawI;
                  return (
                    <button
                      key={b._id}
                      onClick={() => navigate(i)}
                      className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                        activeIndex === i ? "bg-muted" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{b.billNumber}</span>
                        <span className="text-muted-foreground text-xs">{b.customerName}</span>
                      </div>
                      <span className="text-xs tabular-nums">{formatCurrency(b.grandTotal)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {query.length >= 2 && allItems.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {query.length < 2 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Start typing to search...
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
