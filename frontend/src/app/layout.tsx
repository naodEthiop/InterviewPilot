import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InterviewPilot — AI Interview Practice",
  description: "Practice interviews with Captain, powered by Cursor SDK agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="gradient-bg antialiased">{children}</body>
    </html>
  );
}
