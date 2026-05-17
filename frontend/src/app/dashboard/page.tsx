"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { api, type Interview } from "@/lib/api";

type HistoryItem = Interview & {
  report?: { overall_score: number; summary: string } | null;
};

export default function DashboardPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        window.location.href = "/login";
        return;
      }

      const res = await api.getHistory(session.session.access_token);
      if (!res.success) {
        setError(res.error);
        setLoading(false);
        return;
      }

      setHistory(res.data.interviews);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-zinc-400">Your interview practice history</p>
          </div>
          <Link href="/interview/new">
            <Button>Start new interview</Button>
          </Link>
        </div>

        {loading && <p className="text-zinc-500">Loading history…</p>}
        {error && <p className="text-red-400">{error}</p>}

        {!loading && !error && history.length === 0 && (
          <Card>
            <p className="text-zinc-400">No interviews yet.</p>
            <Link href="/interview/new" className="mt-4 inline-block">
              <Button>Start your first interview with Captain</Button>
            </Link>
          </Card>
        )}

        <ul className="space-y-4">
          {history.map((item) => (
            <li key={item.id}>
              <Card className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-medium">{item.title}</h2>
                  <p className="text-sm text-zinc-500">
                    {item.role} · {item.status} · {item.question_count} questions
                  </p>
                  {item.report && (
                    <p className="mt-1 text-sm text-indigo-300">
                      Score: {item.report.overall_score}/10
                    </p>
                  )}
                </div>
                <Link
                  href={
                    item.status === "completed"
                      ? `/interview/${item.id}/report`
                      : `/interview/${item.id}`
                  }
                >
                  <Button variant="secondary">
                    {item.status === "completed" ? "View report" : "Continue"}
                  </Button>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
