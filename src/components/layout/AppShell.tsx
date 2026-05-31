import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppSidebar } from "@/components/layout/AppSidebar";

type AppShellProps = {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  requireAuth?: boolean;
};

// AppShell 统一设置左侧导航和右侧页面内容。
// P11 以后核心业务页面需要登录保护，首页可以通过 requireAuth={false} 继续公开展示。
export function AppShell({
  children,
  sidebarContent,
  requireAuth = true,
}: AppShellProps) {
  const content = (
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

  return requireAuth ? <AuthGuard>{content}</AuthGuard> : content;
}
