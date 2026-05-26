"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function SearchBox() {
  const [question, setQuestion] = useState("");
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = question.trim();

    if (!value) {
      return;
    }

    const params = new URLSearchParams({
      q: value,
    });

    router.push(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl gap-3">
      <input
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="请输入校园问题"
        className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
      />

      <button
        type="submit"
        disabled={!question.trim()}
        className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        开始搜索
      </button>
    </form>
  );
}
