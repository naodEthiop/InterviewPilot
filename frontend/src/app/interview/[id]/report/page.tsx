import { Suspense } from "react";
import { ReportClient } from "./ReportClient";

export default function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-4 py-20 text-center text-zinc-500">
          Loading report…
        </main>
      }
    >
      <ReportPageInner params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ReportPageInner({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const { id } = await params;
  const { auto } = await searchParams;
  return <ReportClient interviewId={id} autoEnd={auto === "1"} />;
}
