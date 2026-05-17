"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";

const ROLES = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Data Scientist",
  "Product Manager",
  "DevOps Engineer",
];

export default function NewInterviewPage() {
  const router = useRouter();
  const [role, setRole] = useState(ROLES[0]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      router.push("/login");
      return;
    }

    const res = await api.startInterview(session.session.access_token, {
      role,
      title: title || undefined,
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error);
      return;
    }

    router.push(`/interview/${res.data.interview.id}`);
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold">Start interview</h1>
        <p className="mb-8 text-zinc-400">
          Captain will conduct an adaptive technical interview for your role.
        </p>

        <Card>
          <form onSubmit={handleStart} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Session title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Google prep round 1"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button type="submit" className="w-full" loading={loading}>
              Start with Captain
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-xs text-zinc-600">
          Powered by Cursor SDK: Captain, Evaluator, and Report agents
        </p>
      </main>
    </>
  );
}
