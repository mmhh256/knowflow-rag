"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { useAuthStore } from "@/store/auth-store";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ email, name, password, confirmPassword });
      router.replace("/chat");
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "注册失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthBackground>
      <AuthCard title="Enty Rag" subtitle="创建新账号">
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
            label="用户名"
            value={name}
            placeholder="请输入用户名，可选"
            autoComplete="name"
            onChange={setName}
          />
          <AuthInput
            label="密码"
            type="password"
            value={password}
            placeholder="至少 6 位密码"
            autoComplete="new-password"
            onChange={setPassword}
          />
          <AuthInput
            label="确认密码"
            type="password"
            value={confirmPassword}
            placeholder="请再次输入密码"
            autoComplete="new-password"
            onChange={setConfirmPassword}
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
            {isSubmitting ? "注册中..." : "注册"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          已有账号？
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            去登录
          </Link>
        </p>
      </AuthCard>
    </AuthBackground>
  );
}
