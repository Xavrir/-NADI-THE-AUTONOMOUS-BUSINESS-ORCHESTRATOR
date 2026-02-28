import { TopBar } from "@/components/shell/top-bar";
import { Sidebar } from "@/components/shell/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--background)]">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <main className="min-w-0 overflow-hidden p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
