import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corner Case Analyzer | AI Safety Inspector",
  description: "Autonomous driving model stress test & vulnerability dashboard",
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="nav-link">
      {children}
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <div className="mesh-bg" />
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg-primary)]/80 border-b border-[var(--border-subtle)] px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                CC
              </div>
              <div>
                <span className="font-bold text-base">Corner Case Analyzer</span>
                <span className="text-xs text-[var(--text-muted)] ml-2">AI Safety Inspector</span>
              </div>
            </div>
            <div className="flex gap-1">
              <NavLink href="/">Overview</NavLink>
              <NavLink href="/compare">Compare</NavLink>
              <NavLink href="/gallery">Gallery</NavLink>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
