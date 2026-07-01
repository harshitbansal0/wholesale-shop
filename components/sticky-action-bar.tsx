interface StickyActionBarProps {
  children: React.ReactNode;
  summary?: React.ReactNode;
}

export function StickyActionBar({ children, summary }: StickyActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 lg:left-64 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-30 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
        {summary ? (
          <div className="text-sm text-muted-foreground">{summary}</div>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-3 ml-auto">{children}</div>
      </div>
    </div>
  );
}
