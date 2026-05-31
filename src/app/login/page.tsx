"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
      const nextPath =
        typeof window === "undefined"
          ? "/chat"
          : new URLSearchParams(window.location.search).get("next") || "/chat";
      router.replace(nextPath);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthBackground>
      <AuthCard title="Enty Rag" subtitle="智能问答系统">
        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthInput
            label="邮箱"
            type="email"
            value={email}
            placeholder="请输入邮箱"
            autoComplete="email"
            onChange={setEmail}
          />
          <AuthInput
            label="密码"
            type="password"
            value={password}
            placeholder="请输入密码"
            autoComplete="current-password"
            onChange={setPassword}
          />

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSubmitting ? "登录中..." : "登录"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          没有账号？
          <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
            马上去注册
          </Link>
        </p>
      </AuthCard>
    </AuthBackground>
  );
}
