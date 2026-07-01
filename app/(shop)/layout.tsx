import { Sidebar } from "@/components/sidebar";
import { CommandSearch } from "@/components/command-search";
import { ToastProvider } from "@/components/toast-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
      >
        Skip to content
      </a>
      <Sidebar />
      <main id="main-content" className="lg:pl-64" tabIndex={-1}>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
      <CommandSearch />
      <ToastProvider />
    </div>
  );
}
