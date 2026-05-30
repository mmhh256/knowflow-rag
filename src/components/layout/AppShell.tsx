import { AppSidebar } from "@/components/layout/AppSidebar";

type AppShellProps = {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
};

// AppShell 统一放置左侧导航和右侧页面内容，避免每个页面重复写布局。
export function AppShell({ children, sidebarContent }: AppShellProps) {
  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-950">
      <div className="flex h-full min-h-0">
        <AppSidebar>{sidebarContent}</AppSidebar>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
