"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, fetchMe, refreshAccessToken } = useAuthStore();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) {
      return;
    }

    checkedRef.current = true;

    async function checkAuth() {
      const currentUser = await fetchMe();
      if (currentUser) {
        return;
      }

      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    }

    void checkAuth();
  }, [fetchMe, pathname, refreshAccessToken, router]);

  if (isLoading && !user) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        正在检查登录状态...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}
