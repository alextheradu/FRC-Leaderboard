import type { Metadata } from "next";
import { Providers } from "@/providers";
import "./globals.css";

if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  import('@/lib/scheduler').then(m => m.startScheduler())
}

export const metadata: Metadata = {
  title: "FRC Leaderboard — Top Alliance Scores",
  description: "Live FRC match score leaderboard. Track the highest alliance scores across all 2026 FIRST Robotics Competition events.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
