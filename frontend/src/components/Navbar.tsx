"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "./ui/Button";

export function Navbar() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-semibold text-indigo-400">InterviewPilot</span>
          <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">
            Captain AI
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-400">
          <Link href="/dashboard" className="hover:text-zinc-100">
            Dashboard
          </Link>
          <Link href="/interview/new" className="hover:text-zinc-100">
            New Interview
          </Link>
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </nav>
      </div>
    </header>
  );
}
