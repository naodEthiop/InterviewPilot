"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { api, type Report } from "@/lib/api";

export function ReportClient({
  interviewId,
  autoEnd,
}: {
  interviewId: string;
  autoEnd: boolean;
}) {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      router.push("/login");
      return;
    }

    const token = session.session.access_token;
    const res = await api.getInterview(token, interviewId);

    if (!res.success) {
      setError(res.error);
      setLoading(false);
      return;
    }

    if (!res.data.report && autoEnd) {
      setGenerating(true);
      const endRes = await api.endInterview(token, { interviewId });
      setGenerating(false);

      if (!endRes.success) {
        setError(endRes.error);
        setLoading(false);
        return;
      }

      setReport(endRes.data.report);
      setLoading(false);
      return;
    }

    if (res.data.report) {
      setReport(res.data.report);
    }

    setLoading(false);
  }, [interviewId, autoEnd, router]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  async function generateReport() {
    setGenerating(true);
    setError(null);

    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const res = await api.endInterview(session.session.access_token, {
      interviewId,
    });

    setGenerating(false);

    if (!res.success) {
      setError(res.error);
      return;
    }

    setReport(res.data.report);
  }

  if (loading || generating) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <p className="text-indigo-400">Report Agent generating your feedback…</p>
          <p className="mt-2 text-sm text-zinc-500">Powered by Cursor SDK</p>
        </main>
      </>
    );
  }

  if (!report) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-lg px-4 py-10">
          <Card>
            <p className="text-zinc-400">No report yet for this interview.</p>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <Button className="mt-4" onClick={generateReport} loading={generating}>
              Generate report
            </Button>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <p className="text-sm text-indigo-400">Report Agent · Final feedback</p>
          <h1 className="text-2xl font-bold">Interview Report</h1>
          <p className="mt-2 text-3xl font-semibold text-indigo-300">
            {report.overall_score}/10
          </p>
        </div>

        <Card className="mb-6">
          <h2 className="mb-2 font-medium">Summary</h2>
          <p className="leading-relaxed text-zinc-300">{report.summary}</p>
        </Card>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <h2 className="mb-2 text-sm font-medium text-green-400">Strengths</h2>
            <ul className="list-inside list-disc text-sm text-zinc-300">
              {report.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="mb-2 text-sm font-medium text-amber-400">Areas to improve</h2>
            <ul className="list-inside list-disc text-sm text-zinc-300">
              {report.weaknesses.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="mb-8">
          <h2 className="mb-2 font-medium">Recommendations</h2>
          <ul className="space-y-2 text-sm text-zinc-300">
            {report.recommendations.map((r, i) => (
              <li key={r}>
                {i + 1}. {r}
              </li>
            ))}
          </ul>
        </Card>

        <Link href="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </main>
    </>
  );
}
